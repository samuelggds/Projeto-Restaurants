// @ts-nocheck
import test from 'node:test';
import assert from 'node:assert/strict';
import { PlanType } from '@prisma/client';
import { InvoiceService } from './InvoiceService.js';

test('gera a fatura com a mensalidade atual persistida no catálogo', async () => {
  let createdInvoice;
  const repository = {
    findSubscriptionByRestaurantId: async () => ({
      id: 9,
      restaurantId: 44,
      plan: PlanType.PREMIUM,
      status: 'ATIVA',
      trialEndsAt: null,
      scheduledPlan: null,
      scheduledPlanEffectiveMonth: null,
      scheduledPlanEffectiveYear: null,
    }),
    updateSubscription: async () => {
      throw new Error('não deveria alterar a assinatura');
    },
    createMonthlyInvoiceIfAbsent: async (data) => {
      createdInvoice = data;
      return { id: 77, ...data };
    },
  };
  const planCatalog = {
    getByCode: async (plan, options) => {
      assert.equal(plan, PlanType.PREMIUM);
      assert.equal(options.activeOnly, false);
      return {
        plan,
        name: 'Premium',
        description: 'Configurado',
        monthlyFee: 387.65,
        trialDays: 12,
        features: ['Delivery'],
        featured: true,
        active: true,
      };
    },
  };
  const service = new InvoiceService(repository, planCatalog);

  await service.execute({
    restaurantId: 44,
    month: 8,
    year: 2026,
    startDate: new Date('2026-08-01T00:00:00.000Z'),
    endDate: new Date('2026-08-31T23:59:59.999Z'),
  });

  assert.equal(createdInvoice.monthlyFee, 387.65);
  assert.equal(createdInvoice.total, 387.65);
});
