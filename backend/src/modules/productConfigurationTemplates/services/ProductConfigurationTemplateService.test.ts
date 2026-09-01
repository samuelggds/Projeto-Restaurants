// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';

import prisma from '../../../config/prisma.js';
import service from './ProductConfigurationTemplateService.js';

const originalTransaction = prisma.$transaction;

afterEach(() => {
  prisma.$transaction = originalTransaction;
});

function setupTransaction({ templates = [], ingredients = [{ id: 20, price: 4 }] } = {}) {
  const audits = [];
  const created = [];
  const tx = {
    $queryRaw: async () => [{ set_config: '3' }],
    ingredient: {
      findMany: async ({ where }) =>
        ingredients.filter(
          (ingredient) => where.restaurantId === 3 && where.id.in.includes(Number(ingredient.id)),
        ),
    },
    productConfigurationTemplate: {
      findFirst: async ({ where }) =>
        templates.find((template) => {
          if (template.restaurantId !== where.restaurantId) return false;
          if (where.id && typeof where.id === 'number' && template.id !== where.id) return false;
          if (where.id?.not && template.id === where.id.not) return false;
          if (where.active !== undefined && template.active !== where.active) return false;
          if (where.name?.equals) {
            return template.name.toLowerCase() === where.name.equals.toLowerCase();
          }
          return true;
        }) || null,
      create: async ({ data }) => {
        const template = { id: 90, active: true, ...data };
        created.push(template);
        return template;
      },
      update: async ({ data }) => ({ ...templates[0], ...data }),
    },
    auditLog: {
      create: async ({ data }) => {
        audits.push(data);
        return data;
      },
    },
  };
  prisma.$transaction = async (callback) => callback(tx);
  return { audits, created };
}

const configuration = {
  optionGroups: [
    {
      name: 'Tamanho',
      required: true,
      selectionType: 'SINGLE',
      minSelections: 1,
      maxSelections: 1,
      options: [{ ingredientId: 20, pricingMode: 'ADDITIVE' }],
    },
  ],
  compositionItems: [],
};

test('cria modelo privado normalizado e registra o ator da auditoria', async () => {
  const saved = setupTransaction();

  const template = await service.create({ name: 'Pizza padrão', configuration }, 3, {
    userId: 8,
    userName: 'admin@restaurante.test',
    userRole: 'ADMIN',
  });

  assert.equal(template.restaurantId, 3);
  assert.equal(saved.created[0].configuration.optionGroups[0].options[0].additionalPrice, 4);
  assert.equal(saved.audits[0].action, 'PRODUCT_TEMPLATE_CREATED');
  assert.equal(saved.audits[0].userId, 8);
});

test('recusa nome já reservado no restaurante, mesmo em modelo desativado', async () => {
  setupTransaction({
    templates: [{ id: 1, restaurantId: 3, name: 'Pizza padrão', active: false }],
  });

  await assert.rejects(
    () => service.create({ name: 'PIZZA PADRÃO', configuration }, 3),
    /já existe um modelo com este nome/i,
  );
});

test('recusa renomear um modelo para o nome de outro modelo do tenant', async () => {
  setupTransaction({
    templates: [
      { id: 1, restaurantId: 3, name: 'Pizza padrão', active: true, configuration },
      { id: 2, restaurantId: 3, name: 'Outro modelo', active: true, configuration },
    ],
  });

  await assert.rejects(
    () => service.update(1, { name: 'Outro modelo' }, 3),
    /já existe um modelo com este nome/i,
  );
});

test('recusa ingrediente que não pertence ao restaurante', async () => {
  setupTransaction({ ingredients: [] });

  await assert.rejects(
    () => service.create({ name: 'Modelo inválido', configuration }, 3),
    /ingredientes não pertencem a este restaurante/i,
  );
});

test('recusa porções ligadas a uma etapa ausente', async () => {
  setupTransaction();

  await assert.rejects(
    () =>
      service.create(
        {
          name: 'Modelo inválido',
          configuration: {
            ...configuration,
            portionConfiguration: {
              enabled: true,
              optionGroupName: 'Sabores',
              minPortions: 1,
              maxPortions: 2,
              pricingStrategy: 'HIGHEST',
              allowPortionObservations: true,
            },
          },
        },
        3,
      ),
    /etapa usada nas porções precisa fazer parte do modelo/i,
  );
});
