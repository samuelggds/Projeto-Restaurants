import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import nodemailer from 'nodemailer';
import { apiRequest, prisma, resetTenantE2EDatabase, runtimePrisma, startTenantTestApplication } from './tenantE2EHarness.js';

after(async () => {
  await prisma.$disconnect();
  await runtimePrisma.$disconnect();
});

test('ativação pública cria uma única loja, exige e-mail, preserva a escolha do ramo e permite login pelo portal', async (t) => {
  await resetTenantE2EDatabase();
  await prisma.platformSettings.create({
    data: { id: 1, allowRestaurantSignup: true, requireManualApproval: false },
  });
  await prisma.platformPlan.create({
    data: { code: 'BASICO', name: 'Entrada', description: 'Plano público', features: [], monthlyFee: 79.9, trialDays: 7 },
  });
  process.env.SMTP_HOST = 'test.invalid';
  process.env.SMTP_USER = 'teste@example.test';
  process.env.SMTP_PASS = 'only-for-tests';
  process.env.SMTP_AUTH_TYPE = 'basic';
  process.env.MFA_REQUIRED_ROLES = 'ADMIN';
  let code = '';
  t.mock.method(nodemailer, 'createTransport', () => ({
    sendMail: async (mail: { text: string }) => {
      code = mail.text.match(/\b\d{6}\b/u)?.[0] || '';
      return { accepted: [email], rejected: [], messageId: 'offline' };
    },
  }));
  const app = await startTenantTestApplication();
  t.after(() => app.close());
  const post = (path: string, json: Record<string, unknown>) =>
    apiRequest(app.baseUrl, path, undefined, { method: 'POST', json });
  const email = 'chef@example.test';
  const issued = await post('/restaurant-trials/challenge', { email });
  assert.equal(issued.response.status, 200);
  assert.match(code, /^\d{6}$/u);
  assert.equal(await prisma.restaurant.count(), 0);
  const payload = {
    email, challenge: issued.data.challenge, code, restaurantName: 'Padaria do Teste',
    ownerName: 'Chef Teste', password: 'PaoComGeleia20!', whatsapp: '11999999999', category: 'PADARIA',
    plan: 'BASICO', quotedMonthlyFee: 79.9, quotedTrialDays: 7,
  };
  const attempts = await Promise.all([post('/restaurant-trials/activate', payload), post('/restaurant-trials/activate', payload)]);
  assert.deepEqual(attempts.map((a) => a.response.status).sort(), [200, 201], JSON.stringify(attempts.map((a) => a.data.error)));
  assert.deepEqual(attempts[0].data, attempts[1].data);
  const { adminPath, menuPath } = attempts[0].data;
  const slug = menuPath.slice(1);
  const key = adminPath.split('/').at(-1);
  const restaurant = await prisma.restaurant.findUniqueOrThrow({
    where: { email }, include: { settings: true, subscription: true, products: true, users: true },
  });
  assert.equal(restaurant.users.length, 1);
  assert.equal(restaurant.users[0].role, 'ADMIN');
  assert.ok(restaurant.users[0].emailVerifiedAt);
  assert.equal(restaurant.settings?.isOpenForOrders, false);
  assert.equal(restaurant.subscription?.status, 'TESTE');
  assert.equal(await prisma.invoice.count(), 0);
  assert.equal(await prisma.order.count(), 0);
  assert.ok(restaurant.products.length > 1 && restaurant.products.every((p) => p.image && p.restaurantId === restaurant.id));
  const exchanged = await post(`/admin-portal/${slug}/exchange`, { key });
  assert.equal(exchanged.response.status, 200);
  assert.equal(exchanged.data.restaurantId, restaurant.id);
  const login = await post('/auth/login', { email, password: payload.password, restaurantSlug: slug });
  assert.equal(login.response.status, 200);
  assert.equal(login.data.mfaRequired, true);
  assert.ok(!login.data.token);
  const verified = await post('/auth/login/verify-2fa', { mfaToken: login.data.mfaToken, code });
  assert.equal(verified.response.status, 200);
  assert.equal(verified.data.user.restaurantId, restaurant.id);
  assert.match(verified.response.headers.get('set-cookie') ?? '', /HttpOnly/iu);
  const settings = await apiRequest(app.baseUrl, '/settings', verified.data.token);
  assert.equal(settings.response.status, 200);
});
