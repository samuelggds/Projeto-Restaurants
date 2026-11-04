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
    const scoped = await apiRequest(app.baseUrl, '/nfc-customer-view/card-context',
      undefined, { method: 'POST', json: { token: rawToken, restaurantSlug: fixture.restaurants.a.slug } });
    assert.equal(scoped.response.status, 200);
    const wrongSlug = await apiRequest(app.baseUrl, '/nfc-customer-view/card-context',
      undefined, { method: 'POST', json: { token: rawToken, restaurantSlug: fixture.restaurants.b.slug } });
    assert.equal(wrongSlug.response.status, 404);
    assert.equal(Object.hasOwn(wrongSlug.data, 'restaurantSlug'), false);
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
      status: 'READY', displayCode: 'NFC-TEST-CONTEXT', cardId: approved.data.card.cardId,
      customerId: null, customerName: null, comandaId: null,
      canOpenComanda: false, hasUnsettledComanda: false,
    } });
    assert.match(approved.data.card.cardId, /^[0-9a-f-]{36}$/i);
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
    // Encoded-but-not-yet-confirmed cards are owned by the same tenant, and
    // may only be prepared by an authenticated employee explicitly confirming
    // physical writing. Never accept a foreign tenant or anonymous request.
    const pendingToken = randomBytes(32).toString('base64url');
    await prisma.nfcCard.create({
      data: {
        restaurantId: fixture.restaurants.a.id,
        tokenHash: createHash('sha256').update(pendingToken).digest('hex'),
        displayCode: 'NFC-TEST-PENDING',
        status: 'PENDING_WRITE',
        issuedByUserId: fixture.users.adminA.id,
      },
    });
    const pendingPublic = await apiRequest(app.baseUrl, '/nfc-customer-view/card-context',
      undefined, { method: 'POST', json: { token: pendingToken, restaurantSlug: fixture.restaurants.a.slug } });
    assert.equal(pendingPublic.response.status, 200);
    const pendingStaff = await apiRequest(app.baseUrl, endpoint, fixture.tokens.adminA, {
      method: 'POST', json: { token: pendingToken },
    });
    assert.equal(pendingStaff.response.status, 200, JSON.stringify(pendingStaff.data));
    assert.deepEqual(pendingStaff.data.card, {
      status: 'PENDING_WRITE', displayCode: 'NFC-TEST-PENDING',
      cardId: pendingStaff.data.card.cardId, customerId: null, customerName: null,
      comandaId: null, canOpenComanda: false, hasUnsettledComanda: false,
    });
    assert.match(pendingStaff.data.card.cardId, /^[0-9a-f-]{36}$/i);
    const foreignPending = await apiRequest(app.baseUrl, endpoint, fixture.tokens.adminB, {
      method: 'POST', json: { token: pendingToken },
    });
    assert.equal(foreignPending.response.status, 404);

    const confirmEndpoint = '/nfc-registration/cards/confirm-encoded-write';
    const noConsent = await apiRequest(app.baseUrl, confirmEndpoint, fixture.tokens.adminA, {
      method: 'POST', json: { token: pendingToken },
    });
    assert.equal(noConsent.response.status, 422);
    const foreignConfirm = await apiRequest(app.baseUrl, confirmEndpoint, fixture.tokens.adminB, {
      method: 'POST', json: { token: pendingToken, confirmPhysicalWrite: true },
    });
    assert.equal(foreignConfirm.response.status, 404);
    const anonymousConfirm = await apiRequest(app.baseUrl, confirmEndpoint, undefined, {
      method: 'POST', json: { token: pendingToken, confirmPhysicalWrite: true },
    });
    assert.equal(anonymousConfirm.response.status, 401);
    const customerConfirm = await apiRequest(app.baseUrl, confirmEndpoint, fixture.tokens.customerA, {
      method: 'POST', json: { token: pendingToken, confirmPhysicalWrite: true },
    });
    assert.equal(customerConfirm.response.status, 403);
    const prepared = await apiRequest(app.baseUrl, confirmEndpoint, fixture.tokens.adminA, {
      method: 'POST', json: { token: pendingToken, confirmPhysicalWrite: true },
    });
    assert.equal(prepared.response.status, 200, JSON.stringify(prepared.data));
    assert.deepEqual(prepared.data.card, {
      status: 'READY', displayCode: 'NFC-TEST-PENDING', comandaId: null,
    });
    const repeated = await apiRequest(app.baseUrl, confirmEndpoint, fixture.tokens.adminA, {
      method: 'POST', json: { token: pendingToken, confirmPhysicalWrite: true },
    });
    assert.equal(repeated.response.status, 409);
    const readyStaff = await apiRequest(app.baseUrl, endpoint, fixture.tokens.adminA, {
      method: 'POST', json: { token: pendingToken },
    });
    assert.equal(readyStaff.response.status, 200);
    assert.equal(readyStaff.data.card.status, 'READY');
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


test('NFC enrollment identifies linked customer and recovers the same card visit without cross-tenant leaks', { timeout: 120_000 }, async () => {
  await resetTenantE2EDatabase();
  const fixture = await seedTenantE2EFixture();
  await prisma.restaurantSettings.update({
    where: { restaurantId: fixture.restaurants.a.id },
    data: { inPersonServiceMode: 'BOTH' },
  });
  const rawToken = randomBytes(32).toString('base64url');
  await prisma.nfcCard.create({ data: {
    restaurantId: fixture.restaurants.a.id,
    tokenHash: createHash('sha256').update(rawToken).digest('hex'),
    displayCode: 'NFC-TEST-ENROLLMENT',
    status: 'READY', issuedByUserId: fixture.users.adminA.id,
  } });
  const app = await startTenantTestApplication();
  try {
    const intake = await apiRequest(app.baseUrl, '/nfc-registration/cards/intake', fixture.tokens.adminA, {
      method: 'POST',
      json: { token: rawToken, name: 'Cliente NFC E2E', cpf: '52998224725', phone: '85999999999' },
    });
    assert.equal(intake.response.status, 201, JSON.stringify(intake.data));
    const assignment = intake.data.assignment;
    assert.equal(assignment.displayCode, 'NFC-TEST-ENROLLMENT');

    const contextEndpoint = '/nfc-registration/cards/attendance-context';
    const linked = await apiRequest(app.baseUrl, contextEndpoint, fixture.tokens.adminA, {
      method: 'POST', json: { token: rawToken },
    });
    assert.equal(linked.response.status, 200, JSON.stringify(linked.data));
    assert.equal(linked.data.card.status, 'ACTIVE');
    assert.equal(linked.data.card.customerName, 'Cliente NFC E2E');
    assert.equal(linked.data.card.customerId, assignment.customerId);
    assert.equal(linked.data.card.cardId, assignment.cardId);
    assert.equal(linked.data.card.comandaId, null);
    assert.equal(linked.data.card.canOpenComanda, true);

    const staff = await apiRequest(app.baseUrl, '/nfc-registration/cards/staff-comanda', fixture.tokens.adminA, {
      method: 'POST', json: { token: rawToken },
    });
    assert.equal(staff.response.status, 200, JSON.stringify(staff.data));
    assert.equal(staff.data.customer?.name, 'Cliente NFC E2E');
    assert.equal(staff.data.comanda, null);

    const search = await apiRequest(app.baseUrl, '/nfc-registration/customers/identity-search', fixture.tokens.adminA, {
      method: 'POST', json: { query: '52998224725' },
    });
    assert.equal(search.response.status, 200);
    assert.equal(search.data.customers.length, 1);
    assert.equal(search.data.customers[0].id, assignment.customerId);
    assert.equal(Object.hasOwn(search.data.customers[0], 'cpf'), false);
    const phoneSearch = await apiRequest(app.baseUrl, '/nfc-registration/customers/identity-search', fixture.tokens.adminA, {
      method: 'POST', json: { query: '85999999999' },
    });
    assert.equal(phoneSearch.response.status, 200);
    assert.equal(phoneSearch.data.customers.length, 1);

    const tenantSearch = await apiRequest(app.baseUrl, '/nfc-registration/customers/identity-search', fixture.tokens.adminB, {
      method: 'POST', json: { query: '52998224725' },
    });
    assert.equal(tenantSearch.response.status, 200);
    assert.deepEqual(tenantSearch.data.customers, []);
    const foreignLinked = await apiRequest(app.baseUrl, contextEndpoint, fixture.tokens.adminB, {
      method: 'POST', json: { token: rawToken },
    });
    assert.equal(foreignLinked.response.status, 404);

    const opened = await apiRequest(app.baseUrl, '/nfc-comandas/open', fixture.tokens.adminA, {
      method: 'POST', headers: { 'Idempotency-Key': 'nfcRecoveryContextTest001' },
      json: { customerId: assignment.customerId, cardId: assignment.cardId, tableNumber: null },
    });
    assert.equal(opened.response.status, 201, JSON.stringify(opened.data));
    assert.equal(opened.data.comanda.customerId, assignment.customerId);
    const refreshed = await apiRequest(app.baseUrl, contextEndpoint, fixture.tokens.adminA, {
      method: 'POST', json: { token: rawToken },
    });
    assert.equal(refreshed.response.status, 200);
    assert.equal(refreshed.data.card.comandaId, opened.data.comanda.id);
    assert.equal(refreshed.data.card.canOpenComanda, false);
  } finally { await app.close(); }
});
