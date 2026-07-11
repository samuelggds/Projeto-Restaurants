import OpenAI from "openai";
import { z } from "zod";
import prisma from "../../../config/prisma.js";
import categoryRepository from "../../categories/repositories/CategoryRepository.js";
import productRepository from "../../products/repositories/ProductRepository.js";

type ImportMenuFromImageInput = {
  imageUrl: string;
  restaurantId: number | string;
};

type ImportedMenuItem = {
  name: string;
  description?: string | null;
  price: number;
  imageUrl?: string | null;
};

type ImportedMenuCategory = {
  name: string;
  items: ImportedMenuItem[];
};

type ImportedMenuResult = {
  restaurantName?: string | null;
  categories: ImportedMenuCategory[];
};

const importedMenuItemSchema = z.object({
  name: z.string().trim().min(1, "Nome do item invalido."),
  description: z.string().trim().nullable().optional(),
  price: z.union([z.number(), z.string()]),
  imageUrl: z.string().trim().url().nullable().optional(),
});

const importedMenuCategorySchema = z.object({
  name: z.string().trim().min(1, "Nome da categoria invalido."),
  items: z.array(importedMenuItemSchema).min(1, "Categoria sem itens."),
});

const importedMenuResponseSchema = z.object({
  restaurantName: z.string().trim().nullable().optional(),
  categories: z.array(importedMenuCategorySchema).min(1, "Cardapio vazio."),
});

const importInputSchema = z.object({
  imageUrl: z.string().trim().url("Informe uma URL valida da imagem."),
  restaurantId: z.union([z.number(), z.string()]),
});

function normalizeText(value: string | null | undefined) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function parsePrice(value: string | number | null | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const text = normalizeText(value);
  if (!text) {
    return null;
  }

  const normalized = text
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(/,(?=\d{1,2}$)/g, ".")
    .replace(/,/g, "");

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function stripCodeFences(value: string) {
  return value
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
}

function buildPrompt() {
  return [
    "Você é um extrator de cardápios a partir de imagem.",
    "Leia a imagem e retorne SOMENTE um JSON válido, sem markdown, sem comentários e sem texto extra.",
    "Estrutura obrigatória:",
    "{",
    '  "restaurantName": string | null,',
    '  "categories": [',
    "    {",
    '      "name": string,',
    '      "items": [',
    "        {",
    '          "name": string,',
    '          "description": string | null,',
    '          "price": number,',
    '          "imageUrl": string | null',
    "        }",
    "      ]",
    "    }",
    "  ]",
    "}",
    "Regras:",
    "- price deve ser number em BRL, sem simbolo de moeda.",
    "- Se a descricao nao existir, use null.",
    "- imageUrl deve ser URL publica valida da foto do item quando existir na imagem/origem; se nao existir, use null.",
    "- Se houver varios grupos na imagem, organize em categorias coerentes.",
    "- Nao invente itens que nao estejam visiveis.",
    "- Se nao conseguir ler a imagem, retorne categories como array vazio.",
  ].join("\n");
}

function isValidHttpUrl(value: string | null | undefined) {
  const text = normalizeText(value);

  if (!text) {
    return false;
  }

  try {
    const parsed = new URL(text);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function createOpenAiClient() {
  const apiKey = String(process.env.OPENAI_API_KEY || "").trim();

  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY nao configurada. Adicione a chave no ambiente antes de usar o importador por imagem.",
    );
  }

  return new OpenAI({ apiKey });
}

function parseImportedMenuContent(rawContent: string): ImportedMenuResult {
  const cleanedContent = stripCodeFences(normalizeText(rawContent));

  let parsed: unknown;

  try {
    parsed = JSON.parse(cleanedContent);
  } catch {
    throw new Error("A OpenAI retornou um JSON invalido.");
  }

  const validated = importedMenuResponseSchema.safeParse(parsed);

  if (!validated.success) {
    throw new Error("A resposta da OpenAI nao seguiu a estrutura esperada.");
  }

  return {
    restaurantName: validated.data.restaurantName || null,
    categories: validated.data.categories.map((category) => ({
      name: normalizeText(category.name),
      items: category.items.map((item) => {
        const price = parsePrice(item.price);

        if (price === null) {
          throw new Error(
            `Preco invalido retornado pela OpenAI no item "${normalizeText(item.name)}".`,
          );
        }

        return {
          name: normalizeText(item.name),
          description: normalizeText(item.description) || null,
          price,
          imageUrl: isValidHttpUrl(item.imageUrl)
            ? normalizeText(item.imageUrl)
            : null,
        };
      }),
    })),
  };
}

class ImportMenuFromImageService {
  async execute(input: ImportMenuFromImageInput) {
    const parsedInput = importInputSchema.parse(input);
    const restaurantId = Number(parsedInput.restaurantId);

    if (!Number.isInteger(restaurantId) || restaurantId <= 0) {
      throw new Error("restauranteId invalido.");
    }

    const openai = createOpenAiClient();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: buildPrompt(),
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extraia o cardapio desta imagem e retorne somente o JSON estruturado.",
            },
            {
              type: "image_url",
              image_url: {
                url: parsedInput.imageUrl,
              },
            },
          ],
        },
      ],
    });

    const rawContent = completion.choices[0]?.message?.content;

    if (!rawContent) {
      throw new Error("A OpenAI nao retornou conteudo para ser processado.");
    }

    const menu = parseImportedMenuContent(rawContent);

    if (!menu.categories.length) {
      throw new Error("Nenhuma categoria foi identificada na imagem enviada.");
    }

    const summary = await prisma.$transaction(async (db) => {
      const createdCategories: Array<{ id: number; name: string }> = [];
      const createdProducts: Array<{ id: number; name: string }> = [];

      for (const categoryInput of menu.categories) {
        const categoryName = normalizeText(categoryInput.name);
        if (!categoryName) {
          continue;
        }

        let category = await categoryRepository.findByName(
          categoryName,
          restaurantId,
          db,
        );

        if (!category) {
          category = await categoryRepository.create(
            {
              name: categoryName,
              description: null,
              image: null,
              active: true,
            },
            restaurantId,
            db,
          );

          createdCategories.push({
            id: Number(category.id),
            name: category.name,
          });
        }

        for (const itemInput of categoryInput.items) {
          const productName = normalizeText(itemInput.name);
          const description = normalizeText(itemInput.description) || null;
          const price = parsePrice(itemInput.price);
          const imageUrl = isValidHttpUrl(itemInput.imageUrl)
            ? normalizeText(itemInput.imageUrl)
            : null;

          if (!productName || price === null) {
            continue;
          }

          const existingProduct = await productRepository.findByName(
            productName,
            restaurantId,
            db,
          );

          if (existingProduct) {
            continue;
          }

          const createdProduct = await productRepository.create(
            {
              name: productName,
              description,
              image: imageUrl,
              price,
              categoryId: Number(category.id),
              featured: false,
              active: true,
              stock: undefined,
              preparationTime: undefined,
            },
            restaurantId,
            db,
          );

          createdProducts.push({
            id: Number(createdProduct.id),
            name: createdProduct.name,
          });
        }
      }

      return {
        restaurantName: menu.restaurantName || null,
        sourceImageUrl: parsedInput.imageUrl,
        categoriesCreated: createdCategories.length,
        productsCreated: createdProducts.length,
        createdCategories,
        createdProducts,
      };
    });

    return summary;
  }
}

export default new ImportMenuFromImageService();
