// @ts-nocheck
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import prisma from '../config/prisma.js';
import { billingMiddleware } from './billingMiddleware.js';

const originalMethods = {
  invoiceFindMany: prisma.invoice.findMany,
  invoiceUpdateMany: prisma.invoice.updateMany,
  subscriptionFindUnique: prisma.subscription.findUnique,
  subscriptionUpdate: prisma.subscription.update,
  restaurantUpdate: prisma.restaurant.update,
};

function createAppWithProtectedRoute(restaurantId = 1) {
  const app = express();

  app.get(
    '/protected',
    (req, _res, next) => {
      req.user = { restaurantId };
      next();
    },
    billingMiddleware,
    (_req, res) => {
      res.status(200).json({ ok: true });
    },
  );

  return app;
}

async function requestProtectedRoute() {
  const app = createAppWithProtectedRoute(1);
  const server = app.listen(0);

  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : null;

  try {
    const response = await fetch(`http://127.0.0.1:${port}/protected`);
    const body = await response.json();
    return { response, body };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

afterEach(() => {
  prisma.invoice.findMany = originalMethods.invoiceFindMany;
  prisma.invoice.updateMany = originalMethods.invoiceUpdateMany;
  prisma.subscription.findUnique = originalMethods.subscriptionFindUnique;
  prisma.subscription.update = originalMethods.subscriptionUpdate;
  prisma.restaurant.update = originalMethods.restaurantUpdate;
});

test('deve permitir acesso na rota protegida sem invoices em aberto', async () => {
  prisma.invoice.findMany = async () => [];

  let updateManyCalled = false;
  prisma.invoice.updateMany = async () => {
    updateManyCalled = true;
    return { count: 0 };
  };

  const { response, body } = await requestProtectedRoute();

  assert.equal(response.status, 200);
  assert.deepEqual(body, { ok: true });
  assert.equal(updateManyCalled, false);
});

test('deve bloquear acesso na rota protegida quando houver invoice atrasada', async () => {
  prisma.invoice.findMany = async () => [
    {
      id: 10,
      status: 'ATRASADO',
      dueDate: new Date('2026-06-01T12:00:00.000Z'),
      paymentLink: 'https://pay.test/invoice-10',
    },
  ];

  prisma.invoice.updateMany = async () => ({ count: 0 });
  prisma.subscription.findUnique = async () => ({ id: 99 });

  let subscriptionUpdated = false;
  prisma.subscription.update = async () => {
    subscriptionUpdated = true;
    return { id: 99, status: 'EXPIRADA' };
  };

  let restaurantUpdated = false;
  prisma.restaurant.update = async () => {
    restaurantUpdated = true;
    return { id: 1, active: false };
  };

  const { response, body } = await requestProtectedRoute();

  assert.equal(response.status, 403);
  assert.equal(body.code, 'BILLING_BLOCKED');
  assert.equal(body.blocked, true);
  assert.equal(body.error, 'Restaurante bloqueado por inadimplência');
  assert.equal(body.invoiceId, 10);
  assert.equal(body.paymentLink, 'https://pay.test/invoice-10');
  assert.equal(subscriptionUpdated, true);
  assert.equal(restaurantUpdated, true);
});

test('deve promover pendentes vencidas para ATRASADO e bloquear', async () => {
  prisma.invoice.findMany = async () => [
    {
      id: 20,
      status: 'PENDENTE',
      dueDate: new Date('2026-05-01T12:00:00.000Z'),
      paymentLink: 'https://pay.test/invoice-20',
    },
    {
      id: 21,
      status: 'PENDENTE',
      dueDate: new Date('2099-12-01T12:00:00.000Z'),
      paymentLink: 'https://pay.test/invoice-21',
    },
  ];

  let promotedIds = [];
  prisma.invoice.updateMany = async ({ where }) => {
    promotedIds = where.id.in;
    return { count: promotedIds.length };
  };

  prisma.subscription.findUnique = async () => ({ id: 99 });
  prisma.subscription.update = async () => ({ id: 99, status: 'EXPIRADA' });
  prisma.restaurant.update = async () => ({ id: 1, active: false });

  const { response, body } = await requestProtectedRoute();

  assert.equal(response.status, 403);
  assert.equal(body.code, 'BILLING_BLOCKED');
  assert.equal(body.blocked, true);
  assert.equal(body.error, 'Restaurante bloqueado por inadimplência');
  assert.equal(body.invoiceId, 20);
  assert.equal(body.paymentLink, 'https://pay.test/invoice-20');
  assert.deepEqual(promotedIds, [20]);
});
