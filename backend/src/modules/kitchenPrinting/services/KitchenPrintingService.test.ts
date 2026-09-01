// @ts-nocheck
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  OrderType,
  PaymentMethod,
  PrinterAutoPrintTrigger,
  PrinterPaperWidth,
} from '@prisma/client';

import kitchenPrintingService from './KitchenPrintingService.js';
import { sanitizePrinterError } from './PrinterAgentJobService.js';

function fixtureDb() {
  const jobs = [];
  const settings = {
    restaurantId: 7,
    enabled: false,
    autoPrintEnabled: false,
    autoPrintTrigger: PrinterAutoPrintTrigger.NEW_ORDER,
    paperWidth: PrinterPaperWidth.MM80,
    copies: 1,
  };
  const order = {
    id: 91,
    publicId: '333f4c19-c19a-4026-92ad-bfb6c70a7451',
    restaurantId: 7,
    createdAt: new Date('2026-08-31T20:00:00Z'),
    type: OrderType.DELIVERY,
    paid: false,
    paymentMethod: PaymentMethod.CARTAO,
    payOnDelivery: false,
    payOnDeliveryMethod: null,
    total: 50,
    observation: 'Sem cebola',
    restaurant: { name: 'Restaurante A' },
    table: null,
    user: { name: 'Cliente A' },
    participant: null,
    items: [
      {
        quantity: 1,
        observation: null,
        ingredients: null,
        customizations: [{ groupName: 'Ponto', options: ['Bem passado'] }],
        product: { name: 'Hambúrguer' },
      },
    ],
  };
  const db = {
    $queryRaw: async () => [],
    restaurantPrinterSettings: {
      findFirst: async ({ where }) =>
        where.restaurantId === settings.restaurantId && settings.enabled ? { ...settings } : null,
    },
    order: {
      findFirst: async ({ where, include }) => {
        if (where.id !== order.id || where.restaurantId !== order.restaurantId) return null;
        if (where.paid === true && !order.paid) return null;
        return include ? { ...order } : { ...order };
      },
    },
    user: {
      findFirst: async ({ where }) =>
        where.id === 11 && where.restaurantId === settings.restaurantId ? { id: 11 } : null,
    },
    kitchenPrintJob: {
      createMany: async ({ data }) => {
        const candidate = data[0];
        if (jobs.some((job) => job.deduplicationKey === candidate.deduplicationKey)) {
          return { count: 0 };
        }
        jobs.push({
          id: jobs.length + 1,
          publicId: `10000000-0000-4000-8000-${String(jobs.length + 1).padStart(12, '0')}`,
          status: 'PENDING',
          ...candidate,
        });
        return { count: 1 };
      },
      findFirst: async ({ where }) =>
        jobs.find(
          (job) =>
            job.restaurantId === where.restaurantId &&
            (!where.deduplicationKey || job.deduplicationKey === where.deduplicationKey),
        ) || null,
      create: async ({ data }) => {
        const job = {
          id: jobs.length + 1,
          publicId: `20000000-0000-4000-8000-${String(jobs.length + 1).padStart(12, '0')}`,
          status: 'PENDING',
          ...data,
        };
        jobs.push(job);
        return job;
      },
    },
  };
  return { db, jobs, settings, order };
}

test('restaurante disabled não cria job e NEW_ORDER habilitado deduplica no banco', async () => {
  const state = fixtureDb();
  const disabled = await kitchenPrintingService.enqueueAutomatic({
    restaurantId: 7,
    orderId: 91,
    event: 'OPERATIONAL_NEW_ORDER',
    db: state.db,
  });
  assert.equal(disabled, null);
  assert.equal(state.jobs.length, 0);

  Object.assign(state.settings, { enabled: true, autoPrintEnabled: true });
  await kitchenPrintingService.enqueueAutomatic({
    restaurantId: 7,
    orderId: 91,
    event: 'OPERATIONAL_NEW_ORDER',
    db: state.db,
  });
  await kitchenPrintingService.enqueueAutomatic({
    restaurantId: 7,
    orderId: 91,
    event: 'OPERATIONAL_NEW_ORDER',
    db: state.db,
  });
  assert.equal(state.jobs.length, 1);
  assert.equal(state.jobs[0].deduplicationKey, 'AUTO:KITCHEN:ORDER:91');
});

test('PAYMENT_CONFIRMED não cria antes de paid e mudança de trigger não duplica', async () => {
  const state = fixtureDb();
  Object.assign(state.settings, {
    enabled: true,
    autoPrintEnabled: true,
    autoPrintTrigger: PrinterAutoPrintTrigger.PAYMENT_CONFIRMED,
  });
  const unpaid = await kitchenPrintingService.enqueueAutomatic({
    restaurantId: 7,
    orderId: 91,
    event: 'PAYMENT_CONFIRMED',
    db: state.db,
  });
  assert.equal(unpaid, null);
  state.order.paid = true;
  await kitchenPrintingService.enqueueAutomatic({
    restaurantId: 7,
    orderId: 91,
    event: 'PAYMENT_CONFIRMED',
    db: state.db,
  });
  state.settings.autoPrintTrigger = PrinterAutoPrintTrigger.NEW_ORDER;
  await kitchenPrintingService.enqueueAutomatic({
    restaurantId: 7,
    orderId: 91,
    event: 'PAYMENT_CONFIRMED',
    db: state.db,
  });
  assert.equal(state.jobs.length, 1);
});

test('reimpressão manual cria solicitações próprias e valida ator/tenant', async () => {
  const state = fixtureDb();
  state.settings.enabled = true;
  await kitchenPrintingService.enqueueManualReprint({
    restaurantId: 7,
    orderId: 91,
    requestedByUserId: 11,
    db: state.db,
  });
  await kitchenPrintingService.enqueueManualReprint({
    restaurantId: 7,
    orderId: 91,
    requestedByUserId: 11,
    db: state.db,
  });
  assert.equal(state.jobs.length, 2);
  assert.notEqual(state.jobs[0].deduplicationKey, state.jobs[1].deduplicationKey);
  assert.ok(state.jobs.every((job) => job.source === 'MANUAL'));

  await assert.rejects(
    () =>
      kitchenPrintingService.enqueueManualReprint({
        restaurantId: 7,
        orderId: 91,
        requestedByUserId: 99,
        db: state.db,
      }),
    /não autorizado/iu,
  );
});

test('erro reportado pelo agente remove token e cabeçalhos sensíveis', () => {
  const token =
    'pa_2f7a7df8-a444-4db9-a47a-5b79560352be.abcdefghijklmnopqrstuvwxyzABCDEFGH123456789';
  const sanitized = sanitizePrinterError(`Falha\nAuthorization: Bearer ${token}`);
  assert.equal(sanitized.includes(token), false);
  assert.match(sanitized, /Bearer <redacted>/u);
  assert.doesNotMatch(sanitized, /\n/u);
});
