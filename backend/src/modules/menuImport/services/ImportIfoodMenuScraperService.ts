import axios from "axios";
import * as cheerio from "cheerio";
import { z } from "zod";
import prisma from "../../../config/prisma.js";
import categoryRepository from "../../categories/repositories/CategoryRepository.js";
import productRepository from "../../products/repositories/ProductRepository.js";

type ScrapeIfoodMenuInput = {
  url: string;
  restaurantId: number | string;
};

type ParsedMenuItem = {
  categoryName: string;
  productName: string;
  description?: string | null;
  price: number;
};

type ParsedMenu = {
  restaurantName?: string | null;
  items: ParsedMenuItem[];
};

const scrapeInputSchema = z.object({
  url: z.string().trim().url("Informe uma URL válida do iFood."),
  restaurantId: z.union([z.number(), z.string()]),
});

function normalizeText(value: string | null | undefined) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeComparableName(value: string | null | undefined) {
  return normalizeText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function buildUserAgent() {
  return [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    "AppleWebKit/537.36 (KHTML, like Gecko)",
    "Chrome/126.0.0.0 Safari/537.36",
  ].join(" ");
}

function parsePrice(raw: string | number | null | undefined) {
  if (typeof raw === "number") {
    return Number.isFinite(raw) ? raw : null;
  }

  const text = normalizeText(raw);
  if (!text) {
    return null;
  }

  const normalized = text
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(/,(?=\d{1,2}$)/g, ".")
    .replace(/,/g, "");

  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

function extractStructuredData($: cheerio.CheerioAPI) {
  const collected: unknown[] = [];

  $("script[type='application/ld+json']").each((_, element) => {
    const raw = normalizeText($(element).text());
    if (!raw) {
      return;
    }

    try {
      collected.push(JSON.parse(raw));
    } catch {
      // Ignore malformed JSON-LD blocks.
    }
  });

  return collected;
}

function collectTextCandidates($: cheerio.CheerioAPI, selectors: string[]) {
  const values = new Set<string>();

  for (const selector of selectors) {
    $(selector).each((_, element) => {
      const text = normalizeText($(element).text());
      if (text) {
        values.add(text);
      }
    });
  }

  return Array.from(values);
}

function looksLikePrice(value: string) {
  return /\d+[,.]\d{1,2}|\bR\$\b/i.test(String(value || ""));
}

function extractRestaurantName($: cheerio.CheerioAPI) {
  const candidates = [
    $("h1").first().text(),
    $("meta[property='og:title']").attr("content"),
    $("title").text(),
  ]
    .map((item) => normalizeText(item))
    .filter(Boolean);

  return candidates[0] || null;
}

function extractMenuFromCheerio($: cheerio.CheerioAPI): ParsedMenu {
  const items: ParsedMenuItem[] = [];
  const restaurantName = extractRestaurantName($);
  const structuredData = extractStructuredData($);

  const categoryHints = collectTextCandidates($, [
    "h2",
    "h3",
    "[data-testid*='category']",
    "[class*='category']",
  ]);

  const productHints = collectTextCandidates($, [
    "h4",
    "h5",
    "[data-testid*='product']",
    "[class*='product']",
    "button",
    "article",
    "li",
  ]);

  const priceHints = collectTextCandidates($, [
    "[class*='price']",
    "[data-testid*='price']",
    "span",
    "div",
  ]).filter(looksLikePrice);

  const itemNodes = $("article, [data-testid*='product'], [class*='product']");

  itemNodes.each((_, node) => {
    const root = $(node);
    const productName = normalizeText(
      root
        .find("h3, h4, h5, [class*='name'], [data-testid*='name']")
        .first()
        .text() || root.text(),
    );
    const description = normalizeText(
      root
        .find("p, [class*='description'], [data-testid*='description']")
        .first()
        .text(),
    );
    const priceText = normalizeText(
      root
        .find("[class*='price'], [data-testid*='price'], span")
        .filter((_, el) => looksLikePrice($(el).text()))
        .first()
        .text(),
    );
    const price = parsePrice(priceText);

    if (!productName || !price) {
      return;
    }

    const categoryName = normalizeText(
      root
        .closest("section, [class*='category'], [data-testid*='category']")
        .find("h2, h3, [class*='category']")
        .first()
        .text(),
    );

    items.push({
      categoryName: categoryName || "Cardápio iFood",
      productName,
      description: description || null,
      price,
    });
  });

  if (!items.length && structuredData.length) {
    for (const entry of structuredData) {
      if (!entry || typeof entry !== "object") {
        continue;
      }

      const typedEntry = entry as Record<string, unknown>;
      const graph = Array.isArray(typedEntry.graph)
        ? (typedEntry.graph as unknown[])
        : Array.isArray(typedEntry["@graph"])
          ? (typedEntry["@graph"] as unknown[])
          : [];

      for (const graphItem of graph) {
        if (!graphItem || typeof graphItem !== "object") {
          continue;
        }

        const name = normalizeText(
          (graphItem as { name?: unknown }).name as string,
        );
        const description = normalizeText(
          (graphItem as { description?: unknown }).description as string,
        );
        const priceValue = parsePrice(
          (graphItem as { price?: unknown }).price as string | number | null,
        );

        if (name && priceValue) {
          items.push({
            categoryName: "Cardápio iFood",
            productName: name,
            description: description || null,
            price: priceValue,
          });
        }
      }
    }
  }

  if (!items.length) {
    const fallbackCategory = categoryHints[0] || "Cardápio iFood";
    const candidateNames = productHints.filter(
      (candidate) => !looksLikePrice(candidate),
    );

    for (let index = 0; index < candidateNames.length; index += 1) {
      const productName = candidateNames[index];
      const pairedPrice = priceHints[index] || priceHints[0] || null;
      const price = parsePrice(pairedPrice);

      if (!productName || !price) {
        continue;
      }

      items.push({
        categoryName: fallbackCategory,
        productName,
        description: null,
        price,
      });
    }
  }

  const dedupedItems = Array.from(
    new Map(
      items.map((item) => [
        `${normalizeComparableName(item.categoryName)}::${normalizeComparableName(item.productName)}`,
        item,
      ]),
    ).values(),
  );

  return {
    restaurantName,
    items: dedupedItems,
  };
}

class ImportIfoodMenuScraperService {
  async execute(input: ScrapeIfoodMenuInput) {
    const parsedInput = scrapeInputSchema.parse(input);
    const restaurantId = Number(parsedInput.restaurantId);

    if (!Number.isInteger(restaurantId) || restaurantId <= 0) {
      throw new Error("restauranteId inválido.");
    }

    const response = await axios.get(parsedInput.url, {
      headers: {
        "User-Agent": buildUserAgent(),
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
        Referer: "https://www.ifood.com.br/",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
      timeout: 15000,
      maxRedirects: 5,
    });

    const html = String(response.data || "");
    if (!html.trim()) {
      throw new Error("Não foi possível carregar o HTML da página informada.");
    }

    const $ = cheerio.load(html);
    const parsedMenu = extractMenuFromCheerio($);

    if (!parsedMenu.items.length) {
      throw new Error(
        "Não foi possível identificar categorias e produtos na página pública do iFood.",
      );
    }

    const summary = await prisma.$transaction(async (db) => {
      const createdCategories: Array<{ id: number; name: string }> = [];
      const createdProducts: Array<{ id: number; name: string }> = [];

      for (const item of parsedMenu.items) {
        const categoryName = normalizeText(item.categoryName);
        const productName = normalizeText(item.productName);

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
            description: item.description || undefined,
            image: null,
            price: item.price,
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

      return {
        restaurantName: parsedMenu.restaurantName || null,
        sourceUrl: parsedInput.url,
        categoriesCreated: createdCategories.length,
        productsCreated: createdProducts.length,
        createdCategories,
        createdProducts,
      };
    });

    return summary;
  }
}

export default new ImportIfoodMenuScraperService();
