import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import test from 'node:test';
import {
  apiRequest, prisma, resetTenantE2EDatabase, seedTenantE2EFixture,
  startTenantTestApplication,
} from './tenantE2EHarness.js';

test('NFC admin reset cancels only empty visits, invalidates link and preserves tenant history', { timeout: 120_000 }, async () => {
  await resetTenantE2EDatabase();
  const fixture = await seedTenantE2EFixture();
  const restaurantId = fixture.restaurants.a.id;
  await prisma.restaurantSettings.update({
    where: { restaurantId }, data: { inPersonServiceMode: 'BOTH' },
  });
  const rawToken = randomBytes(32).toString('base64url');
  const card = await prisma.nfcCard.create({ data: {
    restaurantId, tokenHash: createHash('sha256').update(rawToken).digest('hex'),
    status: 'READY', displayCode: 'NFC-TEST-VIRGIN',
    issuedByUserId: fixture.users.adminA.id,
  } });
  const endpoint = '/nfc-registration/cards/' + card.id + '/reset-virgin';
  const app = await startTenantTestApplication();
  try {
    const unauthorized = await apiRequest(app.baseUrl, endpoint, undefined, {
      method: 'POST', json: { confirmCode: card.displayCode, confirmation: 'DEIXAR VIRGEM' },
    });
    assert.equal(unauthorized.response.status, 401);
    const customer = await apiRequest(app.baseUrl, endpoint, fixture.tokens.customerA, {
      method: 'POST', json: { confirmCode: card.displayCode, confirmation: 'DEIXAR VIRGEM' },
    });
    assert.equal(customer.response.status, 403);
    const foreign = await apiRequest(app.baseUrl, endpoint, fixture.tokens.adminB, {
      method: 'POST', json: { confirmCode: card.displayCode, confirmation: 'DEIXAR VIRGEM' },
    });
    assert.equal(foreign.response.status, 404);
    const wrongCode = await apiRequest(app.baseUrl, endpoint, fixture.tokens.adminA, {
      method: 'POST', json: { confirmCode: 'WRONG-CARD', confirmation: 'DEIXAR VIRGEM' },
    });
    assert.equal(wrongCode.response.status, 422);
    const noConfirmation = await apiRequest(app.baseUrl, endpoint, fixture.tokens.adminA, {
      method: 'POST', json: { confirmCode: card.displayCode },
    });
    assert.equal(noConfirmation.response.status, 422);

    const intake = await apiRequest(app.baseUrl, '/nfc-registration/cards/intake', fixture.tokens.adminA, {
      method: 'POST', json: { token: rawToken, name: 'Cliente Reset E2E',
        cpf: '52998224725', phone: '85999999999' },
    });
    assert.equal(intake.response.status, 201, JSON.stringify(intake.data));
    const created = intake.data.assignment;
    const open = await apiRequest(app.baseUrl, '/nfc-comandas/open', fixture.tokens.adminA, {
      method: 'POST', headers: { 'Idempotency-Key': 'e2eVirginCardOpenReset001' },
      json: { customerId: created.customerId, cardId: card.id, tableNumber: null },
    });
    assert.equal(open.response.status, 201, JSON.stringify(open.data));
    const zeroComandaId = open.data.comanda.id;
    const before = await prisma.nfcComanda.findFirstOrThrow({ where: { id: zeroComandaId, restaurantId } });
    assert.equal(before.totalCents, 0n);
    assert.equal(before.status, 'OPEN');

    // Never cancel a comanda with any consumption, even if marked OPEN.
    await prisma.nfcComanda.update({ where: { id: zeroComandaId }, data: { totalCents: 150n } });
    const refused = await apiRequest(app.baseUrl, endpoint, fixture.tokens.adminA, {
      method: 'POST', json: { confirmCode: card.displayCode, confirmation: 'DEIXAR VIRGEM' },
    });
    assert.equal(refused.response.status, 409);
    assert.equal((await prisma.nfcCard.findFirstOrThrow({ where: { id: card.id } })).status, 'ACTIVE');
    await prisma.nfcComanda.update({ where: { id: zeroComandaId }, data: { totalCents: 0n } });

    const reset = await apiRequest(app.baseUrl, endpoint, fixture.tokens.adminA, {
      method: 'POST', json: { confirmCode: card.displayCode, confirmation: 'DEIXAR VIRGEM' },
    });
    assert.equal(reset.response.status, 200, JSON.stringify(reset.data));
    assert.deepEqual(reset.data.card, {
      id: card.id, displayCode: card.displayCode, status: 'PENDING_WRITE',
      unlinked: true, oldLinkInvalidated: true, emptyVisitsClosed: 1,
    });
    const after = await prisma.nfcComanda.findFirstOrThrow({ where: { id: zeroComandaId, restaurantId } });
    assert.equal(after.status, 'CANCELLED');
    assert.equal(after.totalCents, 0n);
    assert.equal(after.paidCents, 0n);
    assert.equal(after.paidAt, null);
    assert.ok(after.closedAt);
    const neutral = await prisma.nfcCard.findFirstOrThrow({ where: { id: card.id, restaurantId } });
    assert.equal(neutral.customerId, null);
    assert.equal(neutral.status, 'PENDING_WRITE');
    assert.notEqual(neutral.tokenHash, createHash('sha256').update(rawToken).digest('hex'));
    const stalePublic = await apiRequest(app.baseUrl, '/nfc-customer-view/card-context',
      undefined, { method: 'POST', json: { token: rawToken } });
    assert.equal(stalePublic.response.status, 404);
    assert.equal((await prisma.nfcCustomer.count({ where: { restaurantId, id: created.customerId } })), 1);
    assert.equal((await prisma.nfcRegistrationAudit.count({ where: {
      restaurantId, cardId: card.id, action: 'CARD_RESET_VIRGIN',
    } })), 1);

    const reprogramEndpoint = '/nfc-registration/cards/' + card.id + '/reprogram-virgin';
    const newToken = await apiRequest(app.baseUrl, reprogramEndpoint, fixture.tokens.adminA,
      { method: 'POST', json: {} });
    assert.equal(newToken.response.status, 200, JSON.stringify(newToken.data));
    const url = new URL(newToken.data.ndefUrl);
    assert.equal(url.hostname, 'www.gastronexa.com.br');
    assert.ok(url.pathname.includes(fixture.restaurants.a.slug));
    const token = url.pathname.split('/').at(-1);
    assert.ok(token && token !== rawToken);
    const repeatedOldLink = await apiRequest(app.baseUrl, '/nfc-customer-view/card-context',
      undefined, { method: 'POST', json: { token: rawToken } });
    assert.equal(repeatedOldLink.response.status, 404);
    const confirm = await apiRequest(app.baseUrl, '/nfc-registration/cards/confirm-encoded-write',
      fixture.tokens.adminA, { method: 'POST', json: { token, confirmPhysicalWrite: true } });
    assert.equal(confirm.response.status, 200, JSON.stringify(confirm.data));
    const available = await prisma.nfcCard.findFirstOrThrow({ where: { id: card.id } });
    assert.equal(available.status, 'READY');
    assert.equal(available.customerId, null);
    const search = await apiRequest(app.baseUrl, '/nfc-registration/customers/identity-search',
      fixture.tokens.adminA, { method: 'POST', json: { query: '52998224725' } });
    assert.equal(search.response.status, 200);
    assert.equal(search.data.customers[0].id, created.customerId);
    const relink = await apiRequest(app.baseUrl, '/nfc-registration/cards/intake',
      fixture.tokens.adminA, { method: 'POST', json: { token, customerId: created.customerId } });
    assert.equal(relink.response.status, 201, JSON.stringify(relink.data));
    assert.equal(relink.data.assignment.customerId, created.customerId);
  } finally {
    await app.close();
  }
});
