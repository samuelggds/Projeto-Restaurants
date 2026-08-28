// @ts-nocheck
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';
import {
  authMiddleware,
  canAccessBillingRecoveryRoute,
  canBypassBillingCheck,
} from './authMiddleware.js';

const previousSecret = process.env.JWT_SECRET;
const originalMethods = {
  transaction: prisma.$transaction,
  queryRaw: prisma.$queryRaw,
  invoiceFindMany: prisma.invoice.findMany,
  subscriptionFindUnique: prisma.subscription.findUnique,
  subscriptionUpdateMany: prisma.subscription.updateMany,
  restaurantFindUnique: prisma.restaurant.findUnique,
  restaurantUpdateMany: prisma.restaurant.updateMany,
  userFindUnique: prisma.user.findUnique,
};

afterEach(() => {
  process.env.JWT_SECRET = previousSecret;
  prisma.$transaction = originalMethods.transaction;
  prisma.$queryRaw = originalMethods.queryRaw;
  prisma.invoice.findMany = originalMethods.invoiceFindMany;
  prisma.subscription.findUnique = originalMethods.subscriptionFindUnique;
  prisma.subscription.updateMany = originalMethods.subscriptionUpdateMany;
  prisma.restaurant.findUnique = originalMethods.restaurantFindUnique;
  prisma.restaurant.updateMany = originalMethods.restaurantUpdateMany;
  prisma.user.findUnique = originalMethods.userFindUnique;
});

function createToken(role = 'ADMIN', restaurantId = 1) {
  process.env.JWT_SECRET = 'billing-middleware-test-secret';
  return jwt.sign(
    { id: 1, role, restaurantId, subRole: null, authVersion: 0, type: 'access' },
    process.env.JWT_SECRET,
  );
}

async function request(
  path,
  role = 'ADMIN',
  {
    method = 'GET',
    mustChangePassword = false,
    restaurant = { id: 1, active: true, accessBlockReason: 'NONE' },
  } = {},
) {
  prisma.$transaction = async (operation) => operation(prisma);
  prisma.$queryRaw = async () => [];
  prisma.restaurant.findUnique = async () => restaurant;
  prisma.user.findUnique = async () => ({
    id: 1,
    active: true,
    role,
    subRole: null,
    restaurantId: 1,
    email: 'user@example.test',
    authVersion: 0,
    mustChangePassword,
  });
  const app = express();
  app.all(path, authMiddleware, (_req, res) => res.json({ ok: true }));
  const server = app.listen(0);
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;

  try {
    return await fetch(`http://127.0.0.1:${port}${path}`, {
      method,
      headers: { Authorization: `Bearer ${createToken(role)}` },
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('bloqueia qualquer rota privada do restaurante após a tolerância', async () => {
  prisma.invoice.findMany = async () => [
    {
      id: 41,
      status: 'ATRASADO',
      dueDate: new Date('2026-06-01T12:00:00.000Z'),
      paymentLink: null,
    },
  ];
  prisma.subscription.findUnique = async () => null;
  prisma.subscription.updateMany = async () => ({ count: 0 });
  prisma.restaurant.updateMany = async () => ({ count: 1 });

  const response = await request('/private-operation');
  assert.equal(response.status, 403);
  assert.equal((await response.json()).code, 'BILLING_BLOCKED');
});

test('mantém cobrança acessível para o admin inadimplente pagar', async () => {
  let queriedInvoices = false;
  prisma.invoice.findMany = async () => {
    queriedInvoices = true;
    return [];
  };

  const response = await request('/billing/invoices');
  assert.equal(response.status, 200);
  assert.equal(queriedInvoices, true);
});

test('allowlist financeira é estrita por papel, método e rota', () => {
  const request = (method, path, role = 'ADMIN') => ({
    method,
    baseUrl: '',
    path,
    user: { role },
  });

  assert.equal(canBypassBillingCheck(request('GET', '/subscription')), false);
  assert.equal(canAccessBillingRecoveryRoute(request('GET', '/subscription')), true);
  assert.equal(canAccessBillingRecoveryRoute(request('GET', '/billing/plans')), true);
  assert.equal(
    canAccessBillingRecoveryRoute(request('POST', '/billing/invoices/12/regenerate-link')),
    true,
  );
  assert.equal(canAccessBillingRecoveryRoute(request('POST', '/subscription/change-plan')), false);
  assert.equal(canAccessBillingRecoveryRoute(request('DELETE', '/billing/invoices/12')), false);
  assert.equal(
    canAccessBillingRecoveryRoute(request('GET', '/billing/invoices', 'FUNCIONARIO')),
    false,
  );
});

test('suspensão manual também bloqueia as rotas de recuperação financeira', async () => {
  const response = await request('/billing/invoices', 'ADMIN', {
    restaurant: { id: 1, active: false, accessBlockReason: 'MANUAL' },
  });
  assert.equal(response.status, 403);
  assert.equal((await response.json()).code, 'RESTAURANT_ACCESS_BLOCKED');
});

test('SUPER_ADMIN nunca é bloqueado pela cobrança do restaurante', async () => {
  let queriedInvoices = false;
  prisma.invoice.findMany = async () => {
    queriedInvoices = true;
    return [];
  };

  const response = await request('/private-operation', 'SUPER_ADMIN');
  assert.equal(response.status, 200);
  assert.equal(queriedInvoices, false);
});

test('bloqueia rotas privadas enquanto a troca de senha é obrigatória', async () => {
  let queriedInvoices = false;
  prisma.invoice.findMany = async () => {
    queriedInvoices = true;
    return [];
  };

  const response = await request('/private-operation', 'SUPER_ADMIN', {
    mustChangePassword: true,
  });
  const body = await response.json();

  assert.equal(response.status, 403);
  assert.equal(body.code, 'PASSWORD_CHANGE_REQUIRED');
  assert.equal(body.mustChangePassword, true);
  assert.equal(queriedInvoices, false);
});

test('durante a troca obrigatória permite somente consultar sessão e atualizar senha', async () => {
  let queriedInvoices = false;
  prisma.invoice.findMany = async () => {
    queriedInvoices = true;
    return [];
  };

  const me = await request('/auth/me', 'ADMIN', { mustChangePassword: true });
  const password = await request('/auth/password', 'ADMIN', {
    method: 'PUT',
    mustChangePassword: true,
  });
  const wrongMethod = await request('/auth/password', 'ADMIN', {
    method: 'GET',
    mustChangePassword: true,
  });
  const similarPath = await request('/auth/me/export', 'ADMIN', {
    mustChangePassword: true,
  });

  assert.equal(me.status, 200);
  assert.equal(password.status, 200);
  assert.equal(wrongMethod.status, 403);
  assert.equal(similarPath.status, 403);
  assert.equal(queriedInvoices, false);
});
