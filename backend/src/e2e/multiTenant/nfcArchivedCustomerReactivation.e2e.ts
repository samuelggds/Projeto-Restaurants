import assert from 'node:assert/strict';
import { randomBytes, createHash } from 'node:crypto';
import test from 'node:test';
import {
  apiRequest, prisma, resetTenantE2EDatabase,
  seedTenantE2EFixture, startTenantTestApplication,
} from './tenantE2EHarness.js';

test('archived NFC CPF is not silently duplicated and can be reactivated by own admin only', { timeout: 120_000 }, async () => {
  await resetTenantE2EDatabase();
  const fixture = await seedTenantE2EFixture();
  const restaurantId = fixture.restaurants.a.id;
  await prisma.restaurantSettings.update({
    where: { restaurantId }, data: { inPersonServiceMode: 'BOTH' },
  });
  const cpf = '52998224725';
  const searchEndpoint = '/nfc-registration/customers/identity-search';
  const reactivateEndpoint = '/nfc-registration/customers/reactivate';
  const app = await startTenantTestApplication();
  try {
    const created = await apiRequest(app.baseUrl, '/nfc-registration/customers', fixture.tokens.adminA, {
      method: 'POST', json: { name: 'Cliente Arquivado NFC', cpf, phone: '85999999999' },
    });
    assert.equal(created.response.status, 201, JSON.stringify(created.data));
    const customerId = created.data.customer.id;
    const archived = await apiRequest(app.baseUrl, '/nfc-registration/customers/' + customerId,
      fixture.tokens.adminA, { method: 'DELETE' });
    assert.equal(archived.response.status, 200, JSON.stringify(archived.data));
    assert.equal(archived.data.archived, true);

    const hidden = await apiRequest(app.baseUrl, searchEndpoint, fixture.tokens.adminA, {
      method: 'POST', json: { query: cpf },
    });
    assert.equal(hidden.response.status, 200, JSON.stringify(hidden.data));
    assert.deepEqual(hidden.data.customers, []);
    assert.equal(hidden.data.archivedMatch, true);
    const hiddenLookup = await apiRequest(app.baseUrl, '/nfc-registration/customers/lookup',
      fixture.tokens.adminA, { method: 'POST', json: { cpf } });
    assert.equal(hiddenLookup.response.status, 200);
    assert.equal(hiddenLookup.data.customer, null);
    assert.equal(Object.hasOwn(hidden.data, 'name'), false);
    assert.equal(Object.hasOwn(hidden.data, 'cpf'), false);
    const foreign = await apiRequest(app.baseUrl, searchEndpoint, fixture.tokens.adminB, {
      method: 'POST', json: { query: cpf },
    });
    assert.equal(foreign.response.status, 200);
    assert.deepEqual(foreign.data.customers, []);
    assert.equal(foreign.data.archivedMatch, false);

    const linkedToken = randomBytes(32).toString('base64url');
    const unavailableCard = await prisma.nfcCard.create({ data: {
      restaurantId, status: 'READY', issuedByUserId: fixture.users.adminA.id,
      tokenHash: createHash('sha256').update(linkedToken).digest('hex'), displayCode: 'NFC-ARCHIVED-TEST',
    } });
    const archivedIntake = await apiRequest(app.baseUrl, '/nfc-registration/cards/intake',
      fixture.tokens.adminA, { method: 'POST', json: { token: linkedToken, customerId } });
    assert.equal(archivedIntake.response.status, 404);
    assert.equal((await prisma.nfcCard.findUniqueOrThrow({ where: { id: unavailableCard.id } })).customerId, null);
    const duplicate = await apiRequest(app.baseUrl, '/nfc-registration/customers',
      fixture.tokens.adminA, {
        method: 'POST', json: { name: 'Cadastro Duplicado', cpf, phone: '85988888888' },
      });
    assert.equal(duplicate.response.status, 409);
    const unauthorized = await apiRequest(app.baseUrl, reactivateEndpoint,
      fixture.tokens.adminB, { method: 'POST', json: { cpf, confirmation: 'REATIVAR CADASTRO' } });
    assert.equal(unauthorized.response.status, 404);
    const missingConfirmation = await apiRequest(app.baseUrl, reactivateEndpoint,
      fixture.tokens.adminA, { method: 'POST', json: { cpf } });
    assert.equal(missingConfirmation.response.status, 422);
    const customerRole = await apiRequest(app.baseUrl, reactivateEndpoint,
      fixture.tokens.customerA, { method: 'POST', json: { cpf, confirmation: 'REATIVAR CADASTRO' } });
    assert.equal(customerRole.response.status, 403);

    const restored = await apiRequest(app.baseUrl, reactivateEndpoint, fixture.tokens.adminA, {
      method: 'POST', json: { cpf, confirmation: 'REATIVAR CADASTRO' },
    });
    assert.equal(restored.response.status, 200, JSON.stringify(restored.data));
    assert.equal(restored.data.customerId, customerId);
    const active = await apiRequest(app.baseUrl, searchEndpoint, fixture.tokens.adminA, {
      method: 'POST', json: { query: cpf },
    });
    assert.equal(active.response.status, 200, JSON.stringify(active.data));
    assert.equal(active.data.archivedMatch, false);
    assert.equal(active.data.customers.length, 1);
    assert.equal(active.data.customers[0].id, customerId);
    assert.equal((await prisma.nfcCustomer.count({ where: { restaurantId } })), 1);
    assert.equal((await prisma.nfcRegistrationAudit.count({ where: {
      restaurantId, customerId, action: 'CUSTOMER_REACTIVATED',
    } })), 1);
    const repeated = await apiRequest(app.baseUrl, reactivateEndpoint, fixture.tokens.adminA, {
      method: 'POST', json: { cpf, confirmation: 'REATIVAR CADASTRO' },
    });
    assert.equal(repeated.response.status, 409);

    const token = randomBytes(32).toString('base64url');
    await prisma.nfcCard.create({ data: {
      restaurantId, status: 'READY', issuedByUserId: fixture.users.adminA.id,
      tokenHash: createHash('sha256').update(token).digest('hex'), displayCode: 'NFC-REACTIVATED',
    } });
    const linked = await apiRequest(app.baseUrl, '/nfc-registration/cards/intake', fixture.tokens.adminA, {
      method: 'POST', json: { token, customerId },
    });
    assert.equal(linked.response.status, 201, JSON.stringify(linked.data));
    assert.equal(linked.data.assignment.customerId, customerId);
  } finally {
    await app.close();
  }
});
