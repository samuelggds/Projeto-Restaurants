import { paidImageGeneration } from '../../aiSupport/services/budgetedOpenAi.js';
import type { CreditActor } from '../../aiSupport/services/AiCreditService.js';
import OpenAI from 'openai';
import prisma from '../../../config/prisma.js';
import { setTenantDbContext } from '../../../database/tenantDbContext.js';
import productRepository from '../../products/repositories/ProductRepository.js';
import { calculateImageUsageCostUsd } from '../../aiSupport/services/openAiUsageCost.js';

const BRANDED_PRODUCT_TERMS = [
  'coca cola',
  'coca-cola',
  'pepsi',
  'fanta',
  'sprite',
  'guarana antarctica',
  'guaraná antarctica',
  'schweppes',
  'red bull',
  'monster',
  'heineken',
  'budweiser',
  'stella artois',
  'corona',
  'brahma',
  'skol',
  'ambev',
  'itaipava',
  'bohemia',
  'h2oh',
  'del valle',
  'kero coco',
  'nescau',
  'toddy',
  'nutella',
  'oreo',
  'bis',
  'kitkat',
  'kit kat',
  'lacta',
  'nestle',
  'nestlé',
  'kibon',
  'magnum',
  'ben & jerry',
  'ben and jerry',
  'gatorade',
  'powerade',
];

function normalizeComparable(value: unknown) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const NORMALIZED_BRAND_TERMS = BRANDED_PRODUCT_TERMS.map(normalizeComparable);

export function detectBrandedImportedProduct(name: unknown, description?: unknown) {
  const haystack = `${normalizeComparable(name)} ${normalizeComparable(description)}`.trim();
  const matchedBrand = NORMALIZED_BRAND_TERMS.find((brand) =>
    new RegExp(`(^| )${brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}( |$)`, 'u').test(haystack),
  );

  return matchedBrand
    ? { branded: true as const, matchedBrand }
    : { branded: false as const, matchedBrand: null };
}

function productPrompt(input: {
  name: string;
  description?: string | null;
  categoryName?: string | null;
}) {
  const details = [
    `Produto: ${input.name}.`,
    input.categoryName ? `Categoria: ${input.categoryName}.` : '',
    input.description ? `Descrição: ${input.description}.` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return [
    'Crie uma fotografia comercial quadrada, realista e apetitosa para um cardápio digital de restaurante.',
    details,
    'Mostre somente o alimento ou bebida genérica descrita, em apresentação profissional de delivery/restaurante, com iluminação de estúdio suave, fundo limpo e discreto e enquadramento central.',
    'Não adicione texto, preço, selo, logotipo, embalagem com marca, marca d’água, pessoas ou itens que não estejam descritos.',
    'A imagem deve parecer uma fotografia real do produto, não uma ilustração.',
  ].join(' ');
}

class GenerateImportedProductImageService {
  async execute(productIdInput: unknown, restaurantIdInput: unknown, actor: CreditActor) {
    const productId = Number(productIdInput);
    const restaurantId = Number(restaurantIdInput);

    if (!Number.isInteger(productId) || productId <= 0 || !Number.isInteger(restaurantId) || restaurantId <= 0) {
      throw new Error('Produto ou restaurante inválido.');
    }

    const product = await prisma.$transaction(async (db) => {
      await setTenantDbContext(db, restaurantId);
      return productRepository.findById(productId, restaurantId, db);
    });
    if (!product) throw new Error('Produto não encontrado neste restaurante.');

    const brand = detectBrandedImportedProduct(product.name, product.description);
    if (brand.branded) {
      return {
        productId,
        productName: product.name,
        status: 'MANUAL_REQUIRED' as const,
        reason: 'BRANDED_PRODUCT' as const,
      };
    }

    if (product.image) {
      return {
        productId,
        productName: product.name,
        status: 'ALREADY_HAS_IMAGE' as const,
      };
    }

    const apiKey = String(process.env.OPENAI_API_KEY || '').trim();
    if (!apiKey) throw new Error('OPENAI_API_KEY não configurada para geração de imagens.');

    const client = new OpenAI({ apiKey, timeout: 165_000, maxRetries: 0 });
    const result = await paidImageGeneration(client, actor, 'GENERATE_PRODUCT_IMAGE', {
      model: 'gpt-image-2',
      prompt: productPrompt({
        name: product.name,
        description: product.description,
        categoryName: product.category?.name || null,
      }),
      size: '1024x1024',
      quality: 'low',
      n: 1,
    });

    const base64 = result.data?.[0]?.b64_json;
    if (!base64) throw new Error('A IA não retornou uma imagem para o produto.');

    const imageDataUrl = `data:image/png;base64,${base64}`;
    await prisma.$transaction(async (db) => {
      await setTenantDbContext(db, restaurantId);
      await productRepository.update(productId, { image: imageDataUrl }, restaurantId, db);
    });

    const usage = (result as unknown as { usage?: unknown }).usage;
    return {
      productId,
      productName: product.name,
      status: 'GENERATED' as const,
      aiUsage: {
        model: 'gpt-image-2',
        usage: usage ?? null,
        costUsd: calculateImageUsageCostUsd(usage, 0.009),
      },
    };
  }
}

export default new GenerateImportedProductImageService();
