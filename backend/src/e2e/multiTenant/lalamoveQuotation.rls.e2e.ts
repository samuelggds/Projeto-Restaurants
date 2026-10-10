import assert from 'node:assert/strict';
import test from 'node:test';
import { withTenantDbContext } from '../../database/tenantDbContext.js';
import { LalamoveQuotationService, LalamoveQuoteError } from '../../modules/externalDelivery/services/LalamoveQuotationService.js';
import {
  assertDisposableTenantDatabase, prisma, runtimePrisma,
  resetTenantE2EDatabase, seedTenantE2EFixture,
} from './tenantE2EHarness.js';

const isStatus = (status: number) =>
  (error: unknown) => error instanceof LalamoveQuoteError && error.statusCode === status;
const box = (latitude: number, longitude: number, address: string) => ({
  coordinates: { lat: String(latitude), lng: String(longitude) }, address,
});

test('Lalamove freight quotation uses isolated PostgreSQL and no real dispatch', { timeout: 90_000 }, async (t) => {
  assertDisposableTenantDatabase();
  t.after(async () => {
    await runtimePrisma.$disconnect();
    await prisma.$disconnect();
  });
  await resetTenantE2EDatabase();
  const fixture = await seedTenantE2EFixture();
  const restaurantA = fixture.restaurants.a.id;
  const restaurantB = fixture.restaurants.b.id;
  const a = fixture.orders.a.id;
  const b = fixture.orders.b.id;
  const originalKey = process.env.CREDENTIAL_ENCRYPTION_KEY;
  process.env.CREDENTIAL_ENCRYPTION_KEY = Buffer.from('gastro-lalamove-e2e-32-byte-key!').toString('base64');
  t.after(() => {
    if (originalKey === undefined) delete process.env.CREDENTIAL_ENCRYPTION_KEY;
    else process.env.CREDENTIAL_ENCRYPTION_KEY = originalKey;
  });
  for (const row of [fixture.restaurants.a, fixture.restaurants.b]) {
    await prisma.restaurant.update({ where: { id: row.id }, data: {
      address: 'Rua das Flores', addressNumber: '15', addressDistrict: 'Centro',
      city: 'Fortaleza', state: 'CE',
    } });
  }
  await prisma.order.updateMany({ where: { id: { in: [a, b] } }, data: {
    paid: true, payOnDelivery: false, address: 'Rua dos Restaurantes',
    number: '100', district: 'Centro', city: 'Fortaleza', state: 'CE',
  } });
  const { encryptCredential, credentialEncryptionContext } =
    await import('../../modules/restaurantSettings/security/credentialEncryption.js');
  for (const rid of [restaurantA, restaurantB]) {
    const crypt = (field: string, value: string) => encryptCredential(value,
      credentialEncryptionContext(rid, 'LALAMOVE:sandbox:' + field));
    await prisma.restaurantExternalDeliveryCredential.create({
      data: {
        restaurantId: rid, provider: 'LALAMOVE', environment: 'sandbox',
        apiKeyEncrypted: crypt('apiKey', 'pk_' + 'test_restaurant' + rid),
        apiSecretEncrypted: crypt('apiSecret', 'sk_' + 'test_restaurant' + rid),
        apiKeyDigest: rid.toString(16).padStart(64, '0'),
        status: 'VERIFIED_SANDBOX', verifiedAt: new Date(), updatedByUserId: fixture.users.adminA.id,
      },
    });
  }
  let providerCalls = 0;
  const service = new LalamoveQuotationService({
    geocode: async address => box(-3.72, -38.5, String(address.address)),
    quote: async (_, city, stops) => {
      providerCalls++;
      assert.equal(city, 'Fortaleza');
      assert.equal(stops.length, 2);
      return {
        quotationId: String(124000000 + providerCalls),
        expiresAt: new Date(Date.now() + 60_000), total: '12.80',
        currency: 'BRL', serviceType: 'LALAGO', thermalBagRequired: true,
        pickupStopId: '111', dropoffStopId: '222',
      };
    },
  });
  const inputA = { restaurantId: restaurantA, actorId: fixture.users.adminA.id, orderId: a };
  const inputB = { restaurantId: restaurantB, actorId: fixture.users.adminB.id, orderId: b };
  const keyA = 'e38666dc' + '-6c4c-4d4a-91be-ccaaaabbbb01';
  const first = await service.request(inputA, { requestKey: keyA });
  assert.equal(first.status, 'AVAILABLE');
  assert.equal(first.total, '12.80');
  assert.equal(first.canDispatch, false);
  assert.equal(first.thermalBagRequired, true);
  assert.equal(providerCalls, 1);
  assert.equal((await service.request(inputA, { requestKey: keyA })).id, first.id);
  assert.equal(providerCalls, 1);
  assert.equal((await withTenantDbContext(restaurantA, db =>
    db.restaurantExternalDeliveryQuote.findMany())).length, 1);
  assert.deepEqual(await runtimePrisma.restaurantExternalDeliveryQuote.findMany(), []);
  await withTenantDbContext(restaurantB, async db => {
    assert.deepEqual(await db.restaurantExternalDeliveryQuote.findMany(), []);
    assert.equal((await db.restaurantExternalDeliveryQuote.deleteMany({ where: {
      id: first.id,
    } })).count, 0);
  });
  await assert.rejects(() => service.current({ ...inputB, orderId: a }), isStatus(409));
  await assert.rejects(() => service.request({
    restaurantId: restaurantB, actorId: fixture.users.adminA.id, orderId: b,
  }, { requestKey: keyA }), isStatus(403));
  await assert.rejects(() => service.approve(inputA, {
    expectedVersion: first.version, expectedTotal: '12.81',
  }), isStatus(409));
  const approved = await service.approve(inputA, {
    expectedVersion: first.version, expectedTotal: '12.80',
  });
  assert.equal(approved.status, 'APPROVED');
  assert.equal(approved.canDispatch, false);
  await assert.rejects(() => service.approve(inputA, {
    expectedVersion: first.version, expectedTotal: '12.80',
  }), isStatus(409));
  const other = await service.request(inputB, { requestKey: 'e38666dc' + '-6c4c-4d4a-91be-ccaaaabbbb02' });
  assert.equal(other.status, 'AVAILABLE');
  assert.notEqual(first.id, other.id);
  assert.equal(providerCalls, 2);
  const orders = await prisma.order.findMany({ where: { id: { in: [a, b] } } });
  assert.equal(orders.every(order => !order.assignedCourierId && !order.deliveryStartedAt), true);
  assert.equal(await prisma.auditLog.count({ where: {
    restaurantId: restaurantA, action: { in: ['LALAMOVE_QUOTE_CREATED','LALAMOVE_QUOTE_APPROVED'] },
  } }), 2);
  await prisma.order.update({ where: { id: a }, data: { assignedCourierId: fixture.users.courierA.id } });
  await assert.rejects(() => service.approve(inputA, {
    expectedVersion: approved.version, expectedTotal: '12.80',
  }), isStatus(409));
});
