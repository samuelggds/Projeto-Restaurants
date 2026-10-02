import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';

import prisma from '../../../config/prisma.js';
import service, { comboInputSchema } from './ProductComboService.js';

const originalTransaction = prisma.$transaction;
afterEach(() => {
  prisma.$transaction = originalTransaction;
});

function option(componentProductId: number) {
  return {
    componentProductId,
    additionalPrice: 0,
    minQuantity: 1,
    maxQuantity: 1,
    defaultQuantity: 1,
    locked: true,
    active: true,
  };
}

function input() {
  return {
    name: 'Combo casal',
    description: 'Dois lanches e uma bebida.',
    image: '',
    price: 49.9,
    active: true,
    featured: true,
    groups: [
      {
        name: 'Produtos do combo',
        description: '',
        minSelections: 2,
        maxSelections: 2,
        active: true,
        options: [
          { ...option(10), minQuantity: 2, maxQuantity: 2, defaultQuantity: 2 },
          option(11),
        ],
      },
    ],
  };
}

test('recusa grupos com o mesmo nome antes de iniciar a persistência', async () => {
  const draft = input();
  draft.groups.push({ ...draft.groups[0], name: '  Produtos do combo  ' });
  prisma.$transaction = (() => {
    assert.fail('dados inválidos não devem abrir uma transação');
  }) as typeof prisma.$transaction;

  await assert.rejects(() => service.save(null, 3, draft), /nome diferente/);
});

test('recusa mínimo de escolhas impossível com opções desativadas', () => {
  const draft = input();
  draft.groups[0].options[1].active = false;
  const parsed = comboInputSchema.safeParse(draft);

  assert.equal(parsed.success, false);
  if (!parsed.success) {
    assert.ok(
      parsed.error.issues.some(
        (issue) =>
          issue.path.join('.') === 'groups.0.minSelections' && /opções ativas/.test(issue.message),
      ),
    );
  }
});

test('recusa mais itens fixos ou padrões que o máximo de escolhas', () => {
  const draft = input();
  draft.groups[0].minSelections = 1;
  draft.groups[0].maxSelections = 1;
  draft.groups[0].options[1].locked = false;

  assert.throws(() => comboInputSchema.parse(draft), /itens fixos ou selecionados por padrão/);
});

test('conta produtos distintos sem confundir a quantidade de unidades', () => {
  const draft = input();
  draft.groups[0].options[0].minQuantity = 20;
  draft.groups[0].options[0].maxQuantity = 20;
  draft.groups[0].options[0].defaultQuantity = 20;

  assert.equal(comboInputSchema.safeParse(draft).success, true);
});

test('preserva grupos desativados e escolhas opcionais sem seleção padrão', () => {
  const draft = input();
  draft.groups[0].active = false;
  draft.groups[0].options[1].active = false;
  draft.groups.push({
    name: 'Acompanhamentos',
    description: '',
    minSelections: 0,
    maxSelections: 1,
    active: true,
    options: [20, 21].map((id) => ({
      ...option(id),
      minQuantity: 0,
      defaultQuantity: 0,
      locked: false,
    })),
  });

  assert.equal(comboInputSchema.safeParse(draft).success, true);
});

function mockDatabase({
  components = [
    { id: 10, name: 'Lanche', kind: 'STANDARD', active: true },
    { id: 11, name: 'Bebida', kind: 'STANDARD', active: true },
  ],
  existing = true,
} = {}) {
  const writes: Array<{ model: string; data?: any; where?: any }> = [];
  const groups: any[] = [];
  const options: any[] = [];
  const context: unknown[] = [];
  let product: any = existing
    ? { id: 90, restaurantId: 3, kind: 'COMBO', configurationVersion: 4 }
    : null;
  let transactions = 0;
  const db = {
    $queryRaw: async (_strings: TemplateStringsArray, tenant: string) => {
      context.push(tenant);
      return [{ set_config: tenant }];
    },
    category: {
      findFirst: async ({ where }: any) => {
        assert.equal(where.restaurantId, 3);
        return { id: 9, active: true };
      },
    },
    product: {
      findMany: async ({ where }: any) => {
        assert.deepEqual(where, { restaurantId: 3, id: { in: [10, 11] } });
        return components;
      },
      findFirst: async ({ where }: any) => {
        assert.deepEqual(where, { id: 90, restaurantId: 3, kind: 'COMBO' });
        return (
          product && {
            ...product,
            comboGroups: groups.map((group) => ({
              ...group,
              options: options
                .filter((entry) => entry.groupId === group.id)
                .map((entry) => ({
                  ...entry,
                  additionalPrice: String(entry.additionalPrice),
                  componentProduct: { id: entry.componentProductId, price: '12.50' },
                })),
            })),
          }
        );
      },
      create: async ({ data }: any) => {
        writes.push({ model: 'product.create', data });
        product = { id: 90, configurationVersion: 1, ...data, price: String(data.price) };
        return { id: 90 };
      },
      updateMany: async ({ where, data }: any) => {
        writes.push({ model: 'product.update', where, data });
        product = { ...product, ...data, configurationVersion: 5, price: String(data.price) };
        return { count: 1 };
      },
    },
    productComboGroup: {
      deleteMany: async ({ where }: any) => {
        writes.push({ model: 'group.delete', where });
        return { count: 1 };
      },
      create: async ({ data }: any) => {
        writes.push({ model: 'group.create', data });
        const group = { id: 100 + groups.length, ...data };
        groups.push(group);
        return { id: group.id };
      },
    },
    productComboOption: {
      createMany: async ({ data }: any) => {
        writes.push({ model: 'options.create', data });
        options.push(...data);
        return { count: data.length };
      },
    },
  };
  prisma.$transaction = (async (callback: (transaction: typeof db) => Promise<unknown>) => {
    transactions += 1;
    return callback(db);
  }) as unknown as typeof prisma.$transaction;
  return { writes, groups, options, context, transactionCount: () => transactions };
}

test('cadastra combo e suas quantidades em uma transação isolada por restaurante', async () => {
  const state = mockDatabase({ existing: false });
  const saved = await service.save(null, 3, input());

  assert.equal(state.transactionCount(), 1);
  assert.deepEqual(state.context, ['3']);
  assert.equal(saved.price, 49.9);
  assert.equal(state.groups[0].restaurantId, 3);
  assert.equal(state.groups[0].productId, 90);
  assert.equal(state.options[0].defaultQuantity, 2);
  assert.equal(state.options[0].restaurantId, 3);
  assert.equal(saved.comboGroups[0].options[0].componentProduct?.price, 12.5);
  assert.equal(state.writes[0].data.kind, 'COMBO');
});

test('edita combo preservando quantidades e adicionais e incrementando a versão', async () => {
  const state = mockDatabase();
  const draft = input();
  draft.groups[0].options[1].additionalPrice = 3.5;
  const saved = await service.save(90, 3, draft);

  assert.equal(state.transactionCount(), 1);
  assert.deepEqual(state.writes[0].where, { id: 90, restaurantId: 3 });
  assert.deepEqual(state.writes[0].data.configurationVersion, { increment: 1 });
  assert.deepEqual(state.writes[1], {
    model: 'group.delete',
    where: { restaurantId: 3, productId: 90 },
  });
  assert.equal(state.options[0].defaultQuantity, 2);
  assert.equal(saved.comboGroups[0].options[1].additionalPrice, 3.5);
});

test('recusa produto de outro restaurante ou combo aninhado antes das escritas', async () => {
  const missing = mockDatabase({
    components: [{ id: 10, name: 'Lanche', kind: 'STANDARD', active: true }],
  });
  await assert.rejects(() => service.save(null, 3, input()), /não pertencem a este restaurante/);
  assert.deepEqual(missing.writes, []);

  const nested = mockDatabase({
    components: [
      { id: 10, name: 'Lanche', kind: 'STANDARD', active: true },
      { id: 11, name: 'Outro combo', kind: 'COMBO', active: true },
    ],
  });
  await assert.rejects(() => service.save(null, 3, input()), /não pode conter outro combo/);
  assert.deepEqual(nested.writes, []);
});

test('recusa editar combo inexistente no restaurante antes de alterar produtos ou grupos', async () => {
  const state = mockDatabase({ existing: false });
  await assert.rejects(() => service.save(90, 3, input()), /Combo não encontrado/);
  assert.deepEqual(state.writes, []);
});

test('aceita combo sem imagem e persiste no tenant correto', async () => {
  const state = mockDatabase({ existing: false });
  const draft = input();
  draft.image = '';

  const saved = await service.save(null, 3, draft);

  assert.equal(saved.image, null);
  assert.equal(state.writes[0].data.restaurantId, 3);
  assert.equal(state.writes[0].data.image, null);
  assert.equal(state.groups[0].restaurantId, 3);
  assert.ok(state.options.every((entry) => entry.restaurantId === 3));
});

test('recusa imagem maior que o orçamento seguro antes de abrir transação', async () => {
  const draft = input();
  draft.image = `data:image/png;base64,${'A'.repeat(700_100)}`;
  prisma.$transaction = (() => {
    assert.fail('payload inválido não deve abrir transação');
  }) as typeof prisma.$transaction;

  await assert.rejects(
    () => service.save(null, 3, draft),
    /imagem do combo está muito grande/i,
  );
});

test('recusa nomes de etapas duplicados ignorando maiúsculas, minúsculas e espaços', async () => {
  const draft = input();
  draft.groups.push({
    ...draft.groups[0],
    name: '  produtos DO COMBO  ',
  });
  prisma.$transaction = (() => {
    assert.fail('dados inválidos não devem abrir uma transação');
  }) as typeof prisma.$transaction;

  await assert.rejects(() => service.save(null, 3, draft), /nome diferente/i);
});

test('recusa produto inativo em opção ativa e preserva vínculo histórico se a opção estiver inativa', async () => {
  const inactiveComponents = [
    { id: 10, name: 'Lanche', kind: 'STANDARD', active: true },
    { id: 11, name: 'Bebida antiga', kind: 'STANDARD', active: false },
  ];

  const activeDraft = input();
  const rejected = mockDatabase({ components: inactiveComponents });
  await assert.rejects(
    () => service.save(null, 3, activeDraft),
    /Produto inativo não pode ficar disponível como opção ativa/u,
  );
  assert.deepEqual(rejected.writes, []);

  const historicalDraft = input();
  historicalDraft.groups[0].options[1].active = false;
  historicalDraft.groups[0].minSelections = 1;
  historicalDraft.groups[0].maxSelections = 1;
  historicalDraft.groups[0].options[0].minQuantity = 1;
  historicalDraft.groups[0].options[0].maxQuantity = 1;
  historicalDraft.groups[0].options[0].defaultQuantity = 1;

  const preserved = mockDatabase({ components: inactiveComponents });
  const saved = await service.save(null, 3, historicalDraft);
  assert.equal(saved.comboGroups[0].options[1].active, false);
  assert.ok(preserved.writes.length > 0);
});

