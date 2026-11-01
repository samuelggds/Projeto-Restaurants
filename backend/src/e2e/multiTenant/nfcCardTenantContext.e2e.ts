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
    assert.equal(found.data.sessionToken, undefined);
    assert.equal(found.data.restaurantId, undefined);
    assert.equal(found.data.customerId, undefined);
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
