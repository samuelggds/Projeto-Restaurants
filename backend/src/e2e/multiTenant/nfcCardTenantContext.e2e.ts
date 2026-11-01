import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import test from 'node:test';
import {
  apiRequest, prisma, resetTenantE2EDatabase,
  seedTenantE2EFixture, startTenantTestApplication,
} from './tenantE2EHarness.js';

test('NFC public card context resolves only the own tenant slug and grants no session', { timeout: 120_000 }, async () => {
  await resetTenantE2EDatabase();
  const fixture = await seedTenantE2EFixture();
  const rawToken = randomBytes(32).toString('base64url');
  const tokenHash = createHash('sha256').update(rawToken).digest('hex');
  await prisma.nfcCard.create({
    data: {
      restaurantId: fixture.restaurants.a.id,
      tokenHash,
      displayCode: 'NFC-TEST-CONTEXT',
      status: 'READY',
      issuedByUserId: fixture.users.adminA.id,
    },
  });
  const app = await startTenantTestApplication();
  try {
    const found = await apiRequest(app.baseUrl, '/nfc-customer-view/card-context',
      undefined, { method: 'POST', json: { token: rawToken } });
    assert.equal(found.response.status, 200, JSON.stringify(found.data));
    assert.deepEqual(found.data, { restaurantSlug: fixture.restaurants.a.slug });
    assert.equal(found.response.headers.get('cache-control'), 'no-store, private');
    assert.equal(Object.hasOwn(found.data, 'sessionToken'), false);
    assert.equal(Object.hasOwn(found.data, 'restaurantId'), false);
    assert.equal(Object.hasOwn(found.data, 'customerId'), false);
    const endpoint = '/nfc-registration/cards/attendance-context';
    const approved = await apiRequest(app.baseUrl, endpoint, fixture.tokens.adminA, {
      method: 'POST', json: { token: rawToken },
    });
    assert.equal(approved.response.status, 200, JSON.stringify(approved.data));
    assert.deepEqual(approved.data, { card: {
      status: 'READY', displayCode: 'NFC-TEST-CONTEXT', comandaId: null,
    } });
    assert.equal(approved.response.headers.get('cache-control'), 'no-store, private');
    const foreign = await apiRequest(app.baseUrl, endpoint, fixture.tokens.adminB, {
      method: 'POST', json: { token: rawToken },
    });
    assert.equal(foreign.response.status, 404);
    const anonymous = await apiRequest(app.baseUrl, endpoint, undefined, {
      method: 'POST', json: { token: rawToken },
    });
    assert.equal(anonymous.response.status, 401);
    const customer = await apiRequest(app.baseUrl, endpoint, fixture.tokens.customerA, {
      method: 'POST', json: { token: rawToken },
    });
    assert.equal(customer.response.status, 403);
    const paymentEndpoint = '/nfc-registration/cards/payment-context';
    const payment = await apiRequest(app.baseUrl, paymentEndpoint, fixture.tokens.adminA, {
      method: 'POST', json: { token: rawToken },
    });
    assert.equal(payment.response.status, 422, JSON.stringify(payment.data));
    assert.equal(Object.hasOwn(payment.data, 'comanda'), false);
    const protectedPayment = await apiRequest(app.baseUrl, paymentEndpoint, fixture.tokens.adminA, {
      method: 'POST', json: { token: rawToken, cpf: '12345678909' },
    });
    assert.equal(protectedPayment.response.status, 404);
    assert.equal(Object.hasOwn(protectedPayment.data, 'comanda'), false);
    assert.equal(payment.response.headers.get('cache-control'), 'no-store, private');
    const otherRestaurantPayment = await apiRequest(app.baseUrl, paymentEndpoint, fixture.tokens.adminB, {
      method: 'POST', json: { token: rawToken, cpf: '12345678909' },
    });
    assert.equal(otherRestaurantPayment.response.status, 404);
    const anonymousPayment = await apiRequest(app.baseUrl, paymentEndpoint, undefined, {
      method: 'POST', json: { token: rawToken },
    });
    assert.equal(anonymousPayment.response.status, 401);
    const customerPayment = await apiRequest(app.baseUrl, paymentEndpoint, fixture.tokens.customerA, {
      method: 'POST', json: { token: rawToken },
    });
    assert.equal(customerPayment.response.status, 403);
    const staffComandaEndpoint = '/nfc-registration/cards/staff-comanda';
    const staffComanda = await apiRequest(app.baseUrl, staffComandaEndpoint, fixture.tokens.adminA, {
      method: 'POST', json: { token: rawToken },
    });
    assert.equal(staffComanda.response.status, 200, JSON.stringify(staffComanda.data));
    assert.deepEqual(staffComanda.data.card, { displayCode: 'NFC-TEST-CONTEXT', status: 'READY' });
    assert.equal(staffComanda.data.customer, null);
    assert.equal(staffComanda.data.comanda, null);
    assert.equal(staffComanda.response.headers.get('cache-control'), 'no-store, private');
    const foreignComanda = await apiRequest(app.baseUrl, staffComandaEndpoint, fixture.tokens.adminB, {
      method: 'POST', json: { token: rawToken },
    });
    assert.equal(foreignComanda.response.status, 404);
    const unauthorizedComanda = await apiRequest(app.baseUrl, staffComandaEndpoint, undefined, {
      method: 'POST', json: { token: rawToken },
    });
    assert.equal(unauthorizedComanda.response.status, 401);
    const customerComanda = await apiRequest(app.baseUrl, staffComandaEndpoint, fixture.tokens.customerA, {
      method: 'POST', json: { token: rawToken },
    });
    assert.equal(customerComanda.response.status, 403);
    const bogus = await apiRequest(app.baseUrl, '/nfc-customer-view/card-context',
      undefined, { method: 'POST', json: { token: randomBytes(32).toString('base64url') } });
    assert.equal(bogus.response.status, 404);
    const malicious = await apiRequest(app.baseUrl, '/nfc-customer-view/card-context',
      undefined, { method: 'POST', json: { token: rawToken, restaurantId: fixture.restaurants.b.id } });
    assert.equal(malicious.response.status, 422);
    const wrongMethod = await apiRequest(app.baseUrl, '/nfc-customer-view/card-context',
      undefined, { method: 'GET' });
    assert.notEqual(wrongMethod.response.status, 200);
  } finally { await app.close(); }
});
