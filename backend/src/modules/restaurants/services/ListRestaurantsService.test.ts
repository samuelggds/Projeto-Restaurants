// @ts-nocheck
import test from 'node:test';
import assert from 'node:assert/strict';
import { PlanType } from '@prisma/client';
import { ListRestaurantsService } from './ListRestaurantsService.js';

test('lista restaurante com o preço atual do catálogo persistido', async () => {
  const repository = {
    listAll: async () => [
      {
        id: 12,
        name: 'Pizza Norte',
        slug: 'pizza-norte',
        email: 'contato@pizza.test',
        city: 'Fortaleza',
        state: 'CE',
        cnpj: null,
        active: true,
        createdAt: new Date('2026-08-01T00:00:00.000Z'),
        users: [{ id: 3, name: 'Admin', email: 'admin@pizza.test' }],
        subscription: {
          id: 7,
          plan: PlanType.BASICO,
          status: 'ATIVA',
          currentPeriodEnd: new Date('2026-09-01T00:00:00.000Z'),
        },
      },
    ],
  };
  const database = {
    order: {
      groupBy: async () => [{ restaurantId: 12, _sum: { total: '902.45' } }],
    },
  };
  const planCatalog = {
    list: async (options) => {
      assert.equal(options.activeOnly, false);
      return [
        {
          plan: PlanType.BASICO,
          monthlyFee: 211.75,
        },
      ];
    },
  };

  const result = await new ListRestaurantsService(repository, database, planCatalog).execute();

  assert.equal(result[0].price, 211.75);
  assert.equal(result[0].revenue, 902.45);
  assert.equal(result[0].status, 'Ativo');
});
