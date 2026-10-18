import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { UserRole } from '@prisma/client';
import authTokenService from '../../modules/auth/services/AuthTokenService.js';
import aiCreditService from '../../modules/aiSupport/services/AiCreditService.js';
import { withTenantDbContext } from '../../database/tenantDbContext.js';
import { managedImageProvider } from '../../modules/managedService/services/ManagedImageProvider.js';
import { managedImageEnhancementStore } from '../../modules/managedService/services/ManagedImageEnhancementStore.js';
import { apiRequest, prisma, resetTenantE2EDatabase, seedTenantE2EFixture, startTenantTestApplication } from './tenantE2EHarness.js';

const image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j8mQAAAAASUVORK5CYII=';
const payload = () => ({ imageDataUrl: image, purpose: 'PRODUCT', operationId: randomUUID() });

async function walletSnapshot(restaurantId: number) {
  return withTenantDbContext(restaurantId, async (db) => ({
    wallets: await db.$queryRaw`SELECT * FROM "AiCreditWallet" ORDER BY "adminUserId"`,
    ledger: await db.$queryRaw`SELECT * FROM "AiCreditLedgerEntry" ORDER BY "id"`,
    reservations: await db.$queryRaw`SELECT * FROM "AiCreditReservation" ORDER BY "id"`,
  }));
}

// Isolate rate-counter fixtures between scenarios, without changing runtime limits.
async function clearTestRateCounters() {
  await prisma.$executeRaw`DELETE FROM "RuntimeRateLimit" WHERE "key" LIKE 'managedimage:%'`;
}

test('imagens assistidas: plataforma paga, autorização e auditoria isoladas por restaurante', async (t) => {
  await resetTenantE2EDatabase();
  const fixture = await seedTenantE2EFixture();
  const previousKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = 'managed-image-test-only';
  t.after(() => { if (previousKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = previousKey; });

  const operator = await prisma.user.create({ data: {
    name: 'Managed Image Operator', email: 'managed-images@tenant-e2e.test', password: 'hash-e2e-only', role: UserRole.SUPER_ADMIN, active: true,
  } });
  const token = authTokenService.createAccessToken({ id: operator.id, role: operator.role, subRole: null, restaurantId: null, authVersion: operator.authVersion });
  const a = fixture.restaurants.a.id;
  const b = fixture.restaurants.b.id;
  const path = (id: number) => `/super-admin/managed-service/restaurants/${id}/images/enhance`;
  await aiCreditService.getBalance({ userId: fixture.users.adminA.id, restaurantId: a });
  await aiCreditService.getBalance({ userId: fixture.users.adminB.id, restaurantId: b });
  const walletA = await walletSnapshot(a);
  const walletB = await walletSnapshot(b);
  const productA = await prisma.product.findUniqueOrThrow({ where: { id: fixture.products.a.id } });

  let failProvider = false;
  const provider = t.mock.method(managedImageProvider, 'edit', async () => {
    if (failProvider) throw new Error('private-provider-content');
    return { imageDataUrl: image, costUsd: 0.1, providerRequestId: 'request_e2e', tokens: { input: 20, output: 30 } };
  });
  const app = await startTenantTestApplication();
  t.after(async () => app.close());

  // Authorize the real workflow using an authenticated tenant ADMIN; no test-only bypass.
  for (const [restaurantId, adminToken] of [
    [fixture.restaurants.a.id, fixture.tokens.adminA],
    [fixture.restaurants.b.id, fixture.tokens.adminB],
  ] as const) {
    const requested = await apiRequest(
      app.baseUrl,
      '/super-admin/managed-service/restaurants/' + restaurantId + '/setup-access',
      token,
      { method: 'POST', json: { reason: 'Autorização E2E explícita para configurar o restaurante.' } },
    );
    assert.equal(requested.response.status, 201, JSON.stringify(requested.data));
    const decision = await apiRequest(
      app.baseUrl,
      '/managed-service/setup-access/' + restaurantId + '/' + requested.data.id,
      adminToken,
      { method: 'PATCH', json: { approve: true, hours: 2 } },
    );
    assert.equal(decision.response.status, 200, JSON.stringify(decision.data));
  }

  await t.test('registro durável aceita o retorno do lock e mantém idempotência por tenant', async () => {
    const attempt = {
      restaurantId: a,
      restaurantName: fixture.restaurants.a.name,
      actor: { userId: operator.id, userRole: operator.role },
      purpose: 'PRODUCT' as const,
      operationId: randomUUID(),
      inputDigest: '0'.repeat(64),
    };
    // Exercise the real Prisma transaction directly so raw-query failures remain visible.
    await managedImageEnhancementStore.begin(attempt);
    await assert.rejects(managedImageEnhancementStore.begin(attempt), { code: 'MANAGED_IMAGE_ALREADY_REQUESTED' });
    await managedImageEnhancementStore.begin({ ...attempt, restaurantId: b, restaurantName: fixture.restaurants.b.name });
    const records = await prisma.auditLog.findMany({
      where: { requestId: attempt.operationId, action: 'MANAGED_IMAGE_AI_REQUESTED' },
      orderBy: { restaurantId: 'asc' },
    });
    assert.deepEqual(records.map((entry) => entry.restaurantId), [a, b]);
    assert.ok(records.every((entry) => entry.userId === operator.id));
    assert.equal(provider.mock.callCount(), 0);
  });

  await t.test('preview não debita ADMIN, não publica e audita somente o restaurante alvo', async () => {
    await clearTestRateCounters();
    const body = payload();
    const response = await apiRequest(app.baseUrl, path(a), token, { method: 'POST', json: body });
    assert.equal(response.response.status, 200, JSON.stringify(response.data));
    assert.equal(response.data.payer, 'PLATFORM');
    assert.equal(response.data.imageDataUrl, image);
    assert.equal('credits' in response.data, false);
    assert.equal(provider.mock.callCount(), 1);
    const audit = await prisma.auditLog.findMany({ where: { requestId: body.operationId }, orderBy: { id: 'asc' } });
    assert.deepEqual(audit.map((entry) => entry.action), ['MANAGED_IMAGE_AI_REQUESTED', 'MANAGED_IMAGE_AI_PROCESSED']);
    assert.ok(audit.every((entry) => entry.restaurantId === a && entry.userId === operator.id));
    assert.match(JSON.stringify(audit), /"payer":"PLATFORM"/u);
    assert.doesNotMatch(JSON.stringify(audit), /data:image|managed-image-test-only/u);
    assert.deepEqual(await walletSnapshot(a), walletA);
    assert.deepEqual(await walletSnapshot(b), walletB);
    assert.deepEqual(await prisma.product.findUniqueOrThrow({ where: { id: productA.id } }), productA);

    const replay = await apiRequest(app.baseUrl, path(a), token, { method: 'POST', json: body });
    assert.equal(replay.response.status, 409, JSON.stringify(replay.data));
    assert.equal(provider.mock.callCount(), 1);
    const secondTenant = await apiRequest(app.baseUrl, path(b), token, { method: 'POST', json: body });
    assert.equal(secondTenant.response.status, 200, JSON.stringify(secondTenant.data));
    assert.equal(provider.mock.callCount(), 2);
    assert.equal(await prisma.auditLog.count({ where: { restaurantId: b, requestId: body.operationId, action: 'MANAGED_IMAGE_AI_REQUESTED' } }), 1);
  });

  await t.test('requisições concorrentes com a mesma operação geram uma única chamada', async () => {
    await clearTestRateCounters();
    const before = provider.mock.callCount();
    const body = payload();
    const responses = await Promise.all([
      apiRequest(app.baseUrl, path(a), token, { method: 'POST', json: body }),
      apiRequest(app.baseUrl, path(a), token, { method: 'POST', json: body }),
    ]);
    assert.deepEqual(responses.map((response) => response.response.status).sort(), [200, 409]);
    assert.equal(provider.mock.callCount(), before + 1);
  });

  await t.test('ADMIN não usa endpoint da plataforma nem escolhe outro tenant', async () => {
    await clearTestRateCounters();
    const before = provider.mock.callCount();
    for (const target of [a, b]) {
      const response = await apiRequest(app.baseUrl, path(target), fixture.tokens.adminA, { method: 'POST', json: payload() });
      assert.ok([401, 403].includes(response.response.status), JSON.stringify(response.data));
    }
    assert.equal(provider.mock.callCount(), before);
  });

  await t.test('nega sobrescrita de pagador/tenant, URL remota e MIME falso antes da OpenAI', async () => {
    await clearTestRateCounters();
    const before = provider.mock.callCount();
    for (const extra of [{ restaurantId: b }, { payer: 'PLATFORM' }, { imageDataUrl: 'https://example.test/secret' }, { imageDataUrl: 'data:image/png;base64,SGVsbG8=' }]) {
      const response = await apiRequest(app.baseUrl, path(a), token, { method: 'POST', json: { ...payload(), ...extra } });
      assert.equal(response.response.status, 400, JSON.stringify(response.data));
    }
    assert.equal(provider.mock.callCount(), before);
  });

  await t.test('restaurante cancelado e SUPER_ADMIN inativo não geram consumo', async () => {
    await clearTestRateCounters();
    const before = provider.mock.callCount();
    await prisma.subscription.update({ where: { restaurantId: a }, data: { status: 'CANCELADA' } });
    const closed = await apiRequest(app.baseUrl, path(a), token, { method: 'POST', json: payload() });
    assert.equal(closed.response.status, 403, JSON.stringify(closed.data));
    await prisma.subscription.update({ where: { restaurantId: a }, data: { status: 'ATIVA' } });
    await prisma.user.update({ where: { id: operator.id }, data: { active: false } });
    const inactive = await apiRequest(app.baseUrl, path(a), token, { method: 'POST', json: payload() });
    assert.ok([401, 403].includes(inactive.response.status), JSON.stringify(inactive.data));
    await prisma.user.update({ where: { id: operator.id }, data: { active: true } });
    assert.equal(provider.mock.callCount(), before);
  });

  await t.test('falha de provedor é sanitizada, sem retry e sem débito de restaurante', async () => {
    await clearTestRateCounters();
    failProvider = true;
    const before = provider.mock.callCount();
    const body = payload();
    const response = await apiRequest(app.baseUrl, path(a), token, { method: 'POST', json: body });
    assert.equal(response.response.status, 500, JSON.stringify(response.data));
    assert.doesNotMatch(JSON.stringify(response.data), /private-provider-content/u);
    assert.equal(provider.mock.callCount(), before + 1);
    const audit = await prisma.auditLog.findMany({ where: { restaurantId: a, requestId: body.operationId } });
    assert.match(JSON.stringify(audit), /UNKNOWN/u);
    assert.doesNotMatch(JSON.stringify(audit), /private-provider-content/u);
    const replay = await apiRequest(app.baseUrl, path(a), token, { method: 'POST', json: body });
    assert.equal(replay.response.status, 409);
    assert.equal(provider.mock.callCount(), before + 1);
    failProvider = false;
  });

  await t.test('limites distribuídos por operador e plataforma impedem consumo excedente', async () => {
    await clearTestRateCounters();
    const before = provider.mock.callCount();
    for (let index = 0; index < 6; index += 1) {
      const response = await apiRequest(app.baseUrl, path(a), token, { method: 'POST', json: payload() });
      assert.equal(response.response.status, index < 5 ? 200 : 429, JSON.stringify(response.data));
    }
    assert.equal(provider.mock.callCount(), before + 5);
    await prisma.$executeRaw`DELETE FROM "RuntimeRateLimit" WHERE "key" LIKE 'managedimage:actor:%'`;
    await prisma.$executeRaw`UPDATE "RuntimeRateLimit" SET "totalHits" = 50 WHERE "key" LIKE 'managedimage:platform:%'`;
    const globalLimit = await apiRequest(app.baseUrl, path(a), token, { method: 'POST', json: payload() });
    assert.equal(globalLimit.response.status, 429, JSON.stringify(globalLimit.data));
    assert.equal(provider.mock.callCount(), before + 5);
  });

  assert.deepEqual(await walletSnapshot(a), walletA);
  assert.deepEqual(await walletSnapshot(b), walletB);
});
