import assert from 'node:assert/strict';
import test from 'node:test';
import { once } from 'node:events';
import { type AddressInfo } from 'node:net';
import express from 'express';
import nodemailer from 'nodemailer';
import prisma from '../../../config/prisma.js';
import adminPortalService from '../../adminPortal/services/AdminPortalAccessService.js';
import createRestaurantService, { TrialPlanChangedError } from '../services/CreateRestaurantService.js';
import router from './PublicRestaurantTrialRoutes.js';

test('ativação por HTTP confirma o titular, respeita o plano e recupera a mesma loja após repetição', async (t) => {
  const env = {
    JWT_SECRET: 'restaurant-trial-integration-test',
    SMTP_HOST: 'smtp.invalid', SMTP_USER: 'trial@example.test', SMTP_PASS: 'only-for-tests',
    SMTP_AUTH_TYPE: 'basic',
  };
  for (const [key, value] of Object.entries(env)) {
    const original = process.env[key];
    process.env[key] = value;
    t.after(() => { if (original === undefined) delete process.env[key]; else process.env[key] = original; });
  }

  let code = '';
  let enabled = false;
  let stored: { id: number; slug: string; subscription: { trialEndsAt: Date } } | null = null;
  let portalKey = '';
  let creations = 0;
  const due = new Date('2026-12-15T12:00:00Z');
  t.mock.method(nodemailer, 'createTransport', () => ({
    sendMail: async (mail: { to: string; text: string }) => {
      assert.equal(mail.to, 'dono@example.test');
      code = mail.text.match(/\b\d{6}\b/u)?.[0] || '';
    },
  }));
  const originalFindUnique = prisma.restaurant.findUnique;
  const originalPolicy = prisma.platformSettings.findUnique;
  Reflect.set(prisma.platformSettings, 'findUnique', async () => ({ allowRestaurantSignup: enabled, requireManualApproval: false }));
  t.after(() => { Reflect.set(prisma.platformSettings, 'findUnique', originalPolicy); });
  // Prisma exposes delegate methods through a proxy without an own method descriptor.
  Reflect.set(prisma.restaurant, 'findUnique', async () => stored);
  t.after(() => { Reflect.set(prisma.restaurant, 'findUnique', originalFindUnique); });
  t.mock.method(adminPortalService, 'matchesCurrentKey', async (_restaurantId: number, key: string) => key === portalKey);
  t.mock.method(createRestaurantService, 'createVerifiedOwnerTrial', async (
    payload: Parameters<typeof createRestaurantService.createVerifiedOwnerTrial>[0],
    trial: Parameters<typeof createRestaurantService.createVerifiedOwnerTrial>[1],
  ) => {
    assert.equal(payload.restaurant.category, 'PADARIA');
    assert.equal(payload.admin.email, 'dono@example.test');
    assert.equal(payload.restaurant.whatsapp, '11999999999');
    if (trial.quotedMonthlyFee !== 79.9) throw new TrialPlanChangedError();
    creations++;
    portalKey = trial.portalKey;
    stored = { id: 5, slug: payload.restaurant.slug, subscription: { trialEndsAt: due } };
    return { restaurant: { slug: payload.restaurant.slug }, trialEndsAt: due };
  });

  const app = express();
  app.use(express.json());
  app.use('/restaurant-trials', router);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise<void>((resolve) => server.close(() => resolve())));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/restaurant-trials`;
  const post = (path: string, body: Record<string, unknown>) => fetch(base + path, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  const email = 'Dono@example.test';
  assert.equal((await (await fetch(base + '/availability')).json()).available, false);
  assert.equal((await post('/challenge', { email: 'closed@example.test' })).status, 403);
  assert.equal(code, '');
  enabled = true;
  assert.equal((await (await fetch(base + '/availability')).json()).available, true);
  const issued = await post('/challenge', { email });
  const { challenge, expiresInMinutes } = await issued.json();
  assert.equal(issued.status, 200);
  assert.equal(issued.headers.get('cache-control'), 'no-store');
  assert.equal(expiresInMinutes, 15);
  assert.match(code, /^\d{6}$/u);
  assert.equal(creations, 0);

  const data = { email, code, challenge, plan: 'BASICO', category: 'PADARIA', quotedMonthlyFee: 79.9, quotedTrialDays: 7,
    ownerName: 'Dona da padaria', restaurantName: 'Pão Mineiro', password: 'UmaNuvem1!', whatsapp: '+55 (11) 99999-9999' };
  assert.equal((await post('/activate', { ...data, email: 'outro@example.test' })).status, 400);
  const wrongCode = String((Number(code) + 1) % 1_000_000).padStart(6, '0');
  assert.equal((await post('/activate', { ...data, code: wrongCode })).status, 400);
  assert.equal((await post('/activate', { ...data, plan: 'GESTAO_TOTAL' })).status, 400);
  assert.equal((await post('/activate', { ...data, role: 'SUPER_ADMIN' })).status, 400);
  const changed = await post('/activate', { ...data, quotedMonthlyFee: 1 });
  assert.equal(changed.status, 409);
  assert.equal((await changed.json()).code, 'TRIAL_PLAN_CHANGED');
  assert.equal(creations, 0);

  const activated = await post('/activate', data);
  assert.equal(activated.status, 201);
  const result = await activated.json();
  assert.match(result.adminPath, /^\/pao-mineiro-[a-f\d]{8}\/admin\/[\w-]{43}$/u);
  assert.equal(result.trialEndsAt, due.toISOString());
  assert.equal(result.adminPath, result.menuPath + '/admin/' + portalKey);
  assert.equal(Object.hasOwn(result, 'password'), false);
  const replay = await post('/activate', data);
  assert.equal(replay.status, 200);
  assert.deepEqual(await replay.json(), result);
  assert.equal(creations, 1);

  const second = await (await post('/challenge', { email })).json();
  assert.equal((await post('/activate', { ...data, challenge: second.challenge, code })).status, 409);
  assert.equal(creations, 1);
  await post('/challenge', { email });
  assert.equal((await post('/challenge', { email })).status, 429);
});
