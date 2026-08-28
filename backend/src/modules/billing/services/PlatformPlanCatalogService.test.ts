// @ts-nocheck
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { PlanType } from '@prisma/client';
import { PlatformPlanCatalogService } from './PlatformPlanCatalogService.js';

const originalNodeEnv = process.env.NODE_ENV;
const originalFallbackMode = process.env.PLATFORM_PLAN_CATALOG_FALLBACK_MODE;

afterEach(() => {
  if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalNodeEnv;
  if (originalFallbackMode === undefined) {
    delete process.env.PLATFORM_PLAN_CATALOG_FALLBACK_MODE;
  } else {
    process.env.PLATFORM_PLAN_CATALOG_FALLBACK_MODE = originalFallbackMode;
  }
});

test('carrega preço, trial e funcionalidades persistidos no catálogo', async () => {
  const calls = [];
  const service = new PlatformPlanCatalogService();
  const database = {
    platformPlan: {
      findMany: async (args) => {
        calls.push(args);
        return [
          {
            code: PlanType.PREMIUM,
            name: 'Premium Plus',
            description: 'Plano configurado no banco.',
            monthlyFee: '319.90',
            trialDays: 21,
            features: ['Mesas', 'Suporte prioritário'],
            featured: true,
            active: true,
          },
        ];
      },
    },
  };

  const plans = await service.list({ db: database, activeOnly: true });

  assert.deepEqual(calls[0].where, { active: true });
  assert.deepEqual(plans, [
    {
      plan: PlanType.PREMIUM,
      name: 'Premium Plus',
      description: 'Plano configurado no banco.',
      monthlyFee: 319.9,
      trialDays: 21,
      features: ['Mesas', 'Suporte prioritário'],
      featured: true,
      active: true,
    },
  ]);
});

test('não substitui um plano inativo pelo fallback legado', async () => {
  process.env.NODE_ENV = 'test';
  const service = new PlatformPlanCatalogService();
  const database = {
    platformPlan: {
      findUnique: async () => ({
        code: PlanType.BASICO,
        name: 'Básico',
        description: 'Inativo',
        monthlyFee: '199.90',
        trialDays: 10,
        features: ['Delivery'],
        featured: false,
        active: false,
      }),
    },
  };

  await assert.rejects(
    () => service.getByCode(PlanType.BASICO, { db: database, activeOnly: true }),
    /indisponível/u,
  );
});

test('fallback legado só atende tabela ausente em teste ou migração explícita', async () => {
  const service = new PlatformPlanCatalogService();
  const missingTableDatabase = {
    platformPlan: {
      findMany: async () => {
        throw { code: 'P2021' };
      },
    },
  };

  process.env.NODE_ENV = 'production';
  delete process.env.PLATFORM_PLAN_CATALOG_FALLBACK_MODE;
  await assert.rejects(
    () => service.list({ db: missingTableDatabase }),
    (error) => {
      assert.equal(error.code, 'P2021');
      return true;
    },
  );

  process.env.PLATFORM_PLAN_CATALOG_FALLBACK_MODE = 'migration';
  const migrationPlans = await service.list({ db: missingTableDatabase });
  assert.equal(migrationPlans.length, 2);
  assert.equal(migrationPlans[0].features.length > 0, true);
});
