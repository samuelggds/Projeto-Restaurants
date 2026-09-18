import OpenAI from 'openai';
import { z } from 'zod';
import prisma from '../../../config/prisma.js';
import { setTenantDbContext, withTenantDbContext } from '../../../database/tenantDbContext.js';
import { calculateImageUsageCostUsd } from '../../aiSupport/services/openAiUsageCost.js';

const optionSchema = z.object({
  componentProductId: z.number().int().positive(),
  additionalPrice: z.number().finite().min(0).max(100000).default(0),
  minQuantity: z.number().int().min(0).max(20).default(0),
  maxQuantity: z.number().int().min(1).max(20).default(1),
  defaultQuantity: z.number().int().min(0).max(20).default(0),
  locked: z.boolean().default(false),
  active: z.boolean().default(true),
});

const groupSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    description: z.string().trim().max(240).optional().nullable(),
    minSelections: z.number().int().min(0).max(20).default(1),
    maxSelections: z.number().int().min(1).max(20).default(1),
    active: z.boolean().default(true),
    options: z.array(optionSchema).min(1).max(30),
  })
  .superRefine((group, ctx) => {
    if (group.maxSelections < group.minSelections) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['maxSelections'], message: 'O máximo deve ser maior ou igual ao mínimo.' });
    }
    const repeated = new Set<number>();
    group.options.forEach((option, index) => {
      if (repeated.has(option.componentProductId)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['options', index, 'componentProductId'], message: 'O mesmo produto não pode aparecer duas vezes no mesmo grupo.' });
      }
      repeated.add(option.componentProductId);
      if (option.maxQuantity < option.minQuantity || option.defaultQuantity < option.minQuantity || option.defaultQuantity > option.maxQuantity) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['options', index], message: 'Revise as quantidades mínima, padrão e máxima desta opção.' });
      }
      if (option.locked && option.defaultQuantity < 1) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['options', index, 'defaultQuantity'], message: 'Item fixo precisa ter quantidade padrão maior que zero.' });
      }
    });
  });

export const comboInputSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(600).default(''),
  image: z.string().trim().max(8_000_000).default(''),
  price: z.number().finite().positive().max(1_000_000),
  active: z.boolean().default(true),
  featured: z.boolean().default(true),
  groups: z.array(groupSchema).min(1).max(12),
});

function restaurantId(value: unknown) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error('Restaurante inválido.');
  return id;
}

function comboId(value: unknown) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error('Combo inválido.');
  return id;
}

const comboInclude = {
  category: true,
  comboGroups: {
    orderBy: [{ position: 'asc' as const }, { id: 'asc' as const }],
    include: {
      options: {
        orderBy: [{ position: 'asc' as const }, { id: 'asc' as const }],
        include: {
          componentProduct: {
            select: {
              id: true,
              name: true,
              description: true,
              image: true,
              price: true,
              stock: true,
              active: true,
              kind: true,
            },
          },
        },
      },
    },
  },
} as const;

async function ensureComboCategory(db: Parameters<typeof setTenantDbContext>[0], tenantId: number) {
  const existing = await db.category.findFirst({
    where: { restaurantId: tenantId, name: { equals: 'Combos', mode: 'insensitive' } },
  });
  if (existing) {
    if (!existing.active) await db.category.update({ where: { id: existing.id }, data: { active: true } });
    return existing.id;
  }
  const created = await db.category.create({
    data: { restaurantId: tenantId, name: 'Combos', description: 'Combos e ofertas montadas pelo restaurante.', active: true },
  });
  return created.id;
}

function normalizeCombo<T extends Record<string, any>>(product: T) {
  return {
    ...product,
    price: Number(product.price || 0),
    comboGroups: (product.comboGroups || []).map((group: Record<string, any>) => ({
      ...group,
      options: (group.options || []).map((option: Record<string, any>) => ({
        ...option,
        additionalPrice: Number(option.additionalPrice || 0),
        componentProduct: option.componentProduct
          ? { ...option.componentProduct, price: Number(option.componentProduct.price || 0) }
          : null,
      })),
    })),
  };
}

class ProductComboService {
  async list(restaurantIdInput: unknown) {
    const tenantId = restaurantId(restaurantIdInput);
    return withTenantDbContext(tenantId, async (db) => {
      const combos = await db.product.findMany({
        where: { restaurantId: tenantId, kind: 'COMBO' },
        include: comboInclude,
        orderBy: [{ active: 'desc' }, { createdAt: 'desc' }],
      });
      return combos.map((combo) => normalizeCombo(combo as never));
    });
  }

  async save(idInput: unknown | null, restaurantIdInput: unknown, rawInput: unknown) {
    const tenantId = restaurantId(restaurantIdInput);
    const input = comboInputSchema.parse(rawInput);
    const id = idInput == null ? null : comboId(idInput);

    return withTenantDbContext(tenantId, async (db) => {
      const componentIds = [...new Set(input.groups.flatMap((group) => group.options.map((option) => option.componentProductId)))];
      const components = await db.product.findMany({
        where: { restaurantId: tenantId, id: { in: componentIds } },
        select: { id: true, name: true, kind: true },
      });
      if (components.length !== componentIds.length) {
        throw new Error('Um ou mais produtos escolhidos não pertencem a este restaurante.');
      }
      if (components.some((product) => product.kind === 'COMBO')) {
        throw new Error('Um combo não pode conter outro combo. Escolha produtos normais.');
      }

      const categoryId = await ensureComboCategory(db, tenantId);
      let productId = id;
      if (productId) {
        const current = await db.product.findFirst({ where: { id: productId, restaurantId: tenantId, kind: 'COMBO' } });
        if (!current) throw new Error('Combo não encontrado neste restaurante.');
        await db.product.updateMany({
          where: { id: productId, restaurantId: tenantId },
          data: {
            name: input.name,
            description: input.description || null,
            image: input.image || null,
            price: input.price,
            active: input.active,
            featured: input.featured,
            saleMode: 'COMPLETE',
            categoryId,
            configurationVersion: { increment: 1 },
          },
        });
        await db.productComboGroup.deleteMany({ where: { restaurantId: tenantId, productId } });
      } else {
        const created = await db.product.create({
          data: {
            restaurantId: tenantId,
            categoryId,
            kind: 'COMBO',
            name: input.name,
            description: input.description || null,
            image: input.image || null,
            price: input.price,
            active: input.active,
            featured: input.featured,
            saleMode: 'COMPLETE',
          },
          select: { id: true },
        });
        productId = created.id;
      }

      for (const [groupIndex, group] of input.groups.entries()) {
        const createdGroup = await db.productComboGroup.create({
          data: {
            restaurantId: tenantId,
            productId,
            name: group.name,
            description: group.description || null,
            minSelections: group.minSelections,
            maxSelections: group.maxSelections,
            position: groupIndex,
            active: group.active,
          },
          select: { id: true },
        });
        if (group.options.length) {
          await db.productComboOption.createMany({
            data: group.options.map((option, optionIndex) => ({
              restaurantId: tenantId,
              groupId: createdGroup.id,
              componentProductId: option.componentProductId,
              additionalPrice: option.additionalPrice,
              minQuantity: option.minQuantity,
              maxQuantity: option.maxQuantity,
              defaultQuantity: option.defaultQuantity,
              locked: option.locked,
              active: option.active,
              position: optionIndex,
            })),
          });
        }
      }

      const saved = await db.product.findFirst({
        where: { id: productId, restaurantId: tenantId, kind: 'COMBO' },
        include: comboInclude,
      });
      if (!saved) throw new Error('Não foi possível carregar o combo salvo.');
      return normalizeCombo(saved as never);
    });
  }

  async remove(idInput: unknown, restaurantIdInput: unknown) {
    const tenantId = restaurantId(restaurantIdInput);
    const id = comboId(idInput);
    return withTenantDbContext(tenantId, async (db) => {
      const combo = await db.product.findFirst({ where: { id, restaurantId: tenantId, kind: 'COMBO' }, select: { id: true } });
      if (!combo) throw new Error('Combo não encontrado neste restaurante.');
      const used = await db.orderItem.findFirst({ where: { productId: id, order: { restaurantId: tenantId } }, select: { id: true } });
      if (used) {
        await db.product.updateMany({ where: { id, restaurantId: tenantId }, data: { active: false } });
        return { archived: true };
      }
      await db.product.deleteMany({ where: { id, restaurantId: tenantId, kind: 'COMBO' } });
      return { archived: false };
    });
  }

  async generateImage(idInput: unknown, restaurantIdInput: unknown) {
    const tenantId = restaurantId(restaurantIdInput);
    const id = comboId(idInput);
    const combo = await withTenantDbContext(tenantId, async (db) =>
      db.product.findFirst({ where: { id, restaurantId: tenantId, kind: 'COMBO' }, include: comboInclude }),
    );
    if (!combo) throw new Error('Combo não encontrado neste restaurante.');

    const apiKey = String(process.env.OPENAI_API_KEY || '').trim();
    if (!apiKey) throw new Error('OPENAI_API_KEY não configurada para geração de imagens.');

    const itemSummary = combo.comboGroups
      .flatMap((group) =>
        group.options.map((option) => {
          const quantity = Math.max(option.defaultQuantity, option.minQuantity, option.locked ? 1 : 0);
          return `${quantity || 'opção'}x ${option.componentProduct.name}${Number(option.additionalPrice) > 0 ? ` (+R$ ${Number(option.additionalPrice).toFixed(2)})` : ''}`;
        }),
      )
      .join('; ');

    const prompt = [
      'Crie uma fotografia comercial quadrada, premium, realista e muito apetitosa para um combo de restaurante.',
      `Nome interno do combo: ${combo.name}.`,
      combo.description ? `Descrição: ${combo.description}.` : '',
      `Preço de venda usado apenas como contexto de posicionamento: R$ ${Number(combo.price).toFixed(2)}.`,
      itemSummary ? `Itens que devem inspirar visualmente a composição: ${itemSummary}.` : '',
      'Mostre a refeição completa de forma coerente, com todos os tipos de alimentos e bebidas relevantes visíveis e proporcionais.',
      'Use iluminação de estúdio suave, fundo limpo e composição de delivery premium.',
      'Não escreva nome, preço, palavras, selos ou marca d’água na imagem. Não invente logotipos. Se algum nome indicar uma marca, represente a categoria do produto sem reproduzir a marca visual.',
      'A imagem deve parecer uma fotografia real do combo, não uma ilustração.',
    ].filter(Boolean).join(' ');

    const client = new OpenAI({ apiKey, timeout: 165_000, maxRetries: 0 });
    const result = await client.images.generate({
      model: 'gpt-image-2',
      prompt,
      size: '1024x1024',
      quality: 'low',
      n: 1,
    });
    const base64 = result.data?.[0]?.b64_json;
    if (!base64) throw new Error('A IA não retornou uma imagem para o combo.');
    const image = `data:image/png;base64,${base64}`;

    await withTenantDbContext(tenantId, async (db) => {
      await db.product.updateMany({ where: { id, restaurantId: tenantId, kind: 'COMBO' }, data: { image } });
    });

    const usage = (result as unknown as { usage?: unknown }).usage;
    return {
      id,
      image,
      aiUsage: {
        model: 'gpt-image-2',
        usage: usage ?? null,
        costUsd: calculateImageUsageCostUsd(usage, 0.009),
      },
    };
  }
}

export default new ProductComboService();
