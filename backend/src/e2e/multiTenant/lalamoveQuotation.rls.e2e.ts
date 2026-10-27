import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { withTenantDbContext } from '../../database/tenantDbContext.js';
import { LalamoveQuotationService, LalamoveQuoteError } from '../../modules/externalDelivery/services/LalamoveQuotationService.js';
import dispatchPreparation from '../../modules/externalDelivery/services/LalamoveDispatchPreparationService.js';
import dispatchManagement from '../../modules/externalDelivery/services/LalamoveDispatchManagementService.js';
import { LalamoveSandboxBookingService } from '../../modules/externalDelivery/services/LalamoveSandboxBookingService.js';
import { LalamoveSandboxTrackingService } from '../../modules/externalDelivery/services/LalamoveSandboxTrackingService.js';
import { ownCourierAvailableDispatchScope } from '../../modules/externalDelivery/domain/ownCourierDispatchBoundary.js';
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
  // A reserva deve exigir cotação aprovada mesmo se o pedido estiver pronto.
  await prisma.order.update({ where: { id: b }, data: { status: 'PRONTO' } });
  await assert.rejects(() => dispatchPreparation.prepare({
    ...inputB, requestKey: randomUUID(),
  }), isStatus(409));
  await service.approve(inputB, { expectedVersion: other.version, expectedTotal: '12.80' });

  // Corrida real entre admins: apenas uma chave pode reservar o mesmo pedido.
  const racing = await Promise.allSettled([
    dispatchPreparation.prepare({ ...inputB, requestKey: randomUUID() }),
    dispatchPreparation.prepare({ ...inputB, requestKey: randomUUID() }),
  ]);
  assert.equal(racing.filter(item => item.status === 'fulfilled').length, 1);
  assert.equal(racing.filter(item => item.status === 'rejected').length, 1);
  assert.ok(racing.some(item => item.status === 'rejected' &&
    item.reason instanceof LalamoveQuoteError && item.reason.statusCode === 409));
  assert.equal(await prisma.restaurantExternalDeliveryDispatch.count({
    where: { restaurantId: restaurantB },
  }), 1);
  assert.notEqual(first.id, other.id);
  assert.equal(providerCalls, 2);
  const orders = await prisma.order.findMany({ where: { id: { in: [a, b] } } });
  assert.equal(orders.every(order => !order.assignedCourierId && !order.deliveryStartedAt), true);
  assert.equal(await prisma.auditLog.count({ where: {
    restaurantId: restaurantA, action: { in: ['LALAMOVE_QUOTE_CREATED','LALAMOVE_QUOTE_APPROVED'] },
  } }), 2);
  await prisma.order.update({ where: { id: a }, data: { status: 'PRONTO' } });
  const requestKey = randomUUID();
  const prepared = await dispatchPreparation.prepare({ ...inputA, requestKey });
  assert.equal(prepared.status, 'PREPARED');
  assert.equal(prepared.canDispatch, false);
  assert.equal((await dispatchPreparation.prepare({ ...inputA, requestKey })).id, prepared.id);
  assert.equal(await prisma.restaurantExternalDeliveryDispatch.count({ where: { restaurantId: restaurantA } }), 1);
  // A partir de PREPARED, a lista de motoboys próprios exclui o pedido.
  // A cotação por si só não faz esse bloqueio.
  assert.equal(await prisma.order.count({
    where: { id: a, restaurantId: restaurantA, ...ownCourierAvailableDispatchScope },
  }), 0);
  assert.equal(await prisma.order.count({
    where: { id: b, restaurantId: restaurantB, ...ownCourierAvailableDispatchScope },
  }), 0);

  await runtimePrisma.$transaction(async db => {
    await db.$executeRaw`SELECT set_config('app.restaurant_id', '', true)`;
    assert.deepEqual(await db.restaurantExternalDeliveryDispatch.findMany(), []);
  });
  await withTenantDbContext(restaurantB, async db => {
    // Restaurant B already reserved its own dispatch in the concurrency test.
    // RLS must show its own row, but never restaurant A's row.
    const visible = await db.restaurantExternalDeliveryDispatch.findMany();
    assert.equal(visible.length, 1);
    assert.equal(visible[0].restaurantId, restaurantB);
    assert.equal(visible[0].orderId, b);
    assert.equal(visible.some(row => row.id === prepared.id), false);
    assert.equal((await db.restaurantExternalDeliveryDispatch.deleteMany({ where: { id: prepared.id } })).count, 0);
  });
  await withTenantDbContext(restaurantA, async db => {
    const visible = await db.restaurantExternalDeliveryDispatch.findMany();
    assert.equal(visible.length, 1);
    assert.equal(visible[0].id, prepared.id);
    assert.equal(visible[0].restaurantId, restaurantA);
  });
  await assert.rejects(() => dispatchPreparation.prepare({
    ...inputA, requestKey: randomUUID(),
  }), isStatus(409));
  await assert.rejects(() => dispatchPreparation.prepare({
    ...inputA, restaurantId: restaurantB,
    requestKey: randomUUID(),
  }), isStatus(403));
  assert.equal(await prisma.restaurantExternalDeliveryDispatch.count(), 2);
  assert.equal(await prisma.auditLog.count({ where: {
    restaurantId: restaurantA, action: 'LALAMOVE_DISPATCH_PREPARED',
  } }), 1);
  assert.equal((await dispatchManagement.current(inputA))?.status, 'PREPARED');
  await assert.rejects(() => dispatchManagement.current({
    ...inputA, restaurantId: restaurantB,
  }), isStatus(403));
  // DB invariant: active and completed partner bookings require a provider ID.
  await assert.rejects(() => prisma.restaurantExternalDeliveryDispatch.update({
    where: { id: prepared.id }, data: { status: 'ACTIVE' },
  }), /constraint|23514|provider_check/iu);
  await assert.rejects(() => prisma.restaurantExternalDeliveryDispatch.update({
    where: { id: prepared.id }, data: { status: 'DONE' },
  }), /constraint|23514|provider_check/iu);
  // The application also refuses cancellation of a non-PREPARED or uncertain booking.
  await prisma.restaurantExternalDeliveryDispatch.update({
    where: { id: prepared.id }, data: { status: 'UNKNOWN' },
  });
  await assert.rejects(() => dispatchManagement.cancel(inputA), isStatus(409));
  await prisma.restaurantExternalDeliveryDispatch.update({
    where: { id: prepared.id }, data: { status: 'PREPARED' },
  });
  const canceled = await dispatchManagement.cancel(inputA);
  assert.equal(canceled?.status, 'CANCELED');
  assert.equal((await dispatchManagement.cancel(inputA))?.status, 'CANCELED');
  assert.equal(await prisma.order.count({
    where: { id: a, restaurantId: restaurantA, ...ownCourierAvailableDispatchScope },
  }), 1);
  assert.equal((await dispatchPreparation.prepare({ ...inputA, requestKey })).status, 'CANCELED');
  const renewed = await dispatchPreparation.prepare({ ...inputA, requestKey: randomUUID() });
  assert.equal(renewed.id, prepared.id);
  assert.equal(renewed.status, 'PREPARED');
  assert.equal(await prisma.order.count({
    where: { id: a, restaurantId: restaurantA, ...ownCourierAvailableDispatchScope },
  }), 0);
  assert.equal(await prisma.restaurantExternalDeliveryDispatch.count({
    where: { restaurantId: restaurantA },
  }), 1);
  assert.equal(await prisma.auditLog.count({ where: {
    restaurantId: restaurantA, action: 'LALAMOVE_DISPATCH_CANCELED',
  } }), 1);
  // Real PostgreSQL transitions, fake provider: no real HTTP request or charge.
  await prisma.restaurant.updateMany({
    where: { id: { in: [restaurantA, restaurantB] } },
    data: { phone: '85999990000' },
  });
  const oldFlag = process.env.LALAMOVE_SANDBOX_BOOKING_ENABLED;
  process.env.LALAMOVE_SANDBOX_BOOKING_ENABLED = 'true';
  try {
    let providerCalls = 0;
    const fake = new LalamoveSandboxBookingService({
      place: async request => {
        providerCalls++;
        assert.equal(request.credentials.environment, 'sandbox');
        assert.equal(request.requestId.length, 36);
        assert.equal(request.expectedTotal, '12.80');
        assert.equal(request.sender.phone, '+5585999990000');
        return { orderId: '123456789', status: 'ASSIGNING_DRIVER', shareLink: null };
      },
    });
    const rowA = await prisma.restaurantExternalDeliveryDispatch.findUniqueOrThrow({
      where: { restaurantId_orderId: { restaurantId: restaurantA, orderId: a } },
    });
    const resultA = await fake.book({ ...inputA, expectedVersion: rowA.version });
    assert.equal(resultA.status, 'ACTIVE');
    assert.equal((await prisma.restaurantExternalDeliveryDispatch.findUniqueOrThrow({
      where: { id: rowA.id },
    })).providerOrderId, '123456789');
    await assert.rejects(() => fake.book({ ...inputA, expectedVersion: rowA.version }), isStatus(409));
    await assert.rejects(() => dispatchManagement.cancel(inputA), isStatus(409));
    let lookupCalls = 0;
    const tracker = new LalamoveSandboxTrackingService({
      lookup: async ({ providerOrderId, credentials }) => {
        lookupCalls++;
        assert.equal(providerOrderId, '123456789');
        assert.equal(credentials.environment, 'sandbox');
        return { orderId: providerOrderId, status: 'PICKED_UP', shareLink: null };
      },
    });
    const tracked = await tracker.refresh(inputA);
    assert.equal(tracked.status, 'ACTIVE');
    assert.equal(tracked.providerStatus, 'PICKED_UP');
    assert.equal(tracked.canDispatch, false);
    assert.equal(lookupCalls, 1);
    assert.equal((await prisma.restaurantExternalDeliveryDispatch.findUniqueOrThrow({
      where: { id: rowA.id },
    })).providerStatus, 'PICKED_UP');
    await assert.rejects(() => tracker.refresh({ ...inputA, restaurantId: restaurantB }), isStatus(403));
    const mismatched = new LalamoveSandboxTrackingService({
      lookup: async () => ({ orderId: '999', status: 'PICKED_UP', shareLink: null }),
    });
    await assert.rejects(() => mismatched.refresh(inputA), isStatus(409));
    assert.equal((await prisma.restaurantExternalDeliveryDispatch.findUniqueOrThrow({
      where: { id: rowA.id },
    })).providerStatus, 'PICKED_UP');
    assert.equal(providerCalls, 1);
    assert.equal(await prisma.order.count({
      where: { id: a, restaurantId: restaurantA, ...ownCourierAvailableDispatchScope },
    }), 0);

    const fakeTimeout = new LalamoveSandboxBookingService({
      place: async () => {
        providerCalls++;
        throw new Error('simulated ambiguous timeout after POST');
      },
    });
    const rowB = await prisma.restaurantExternalDeliveryDispatch.findUniqueOrThrow({
      where: { restaurantId_orderId: { restaurantId: restaurantB, orderId: b } },
    });
    assert.equal((await fakeTimeout.book({ ...inputB, expectedVersion: rowB.version })).status, 'UNKNOWN');
    await assert.rejects(() => fakeTimeout.book({ ...inputB, expectedVersion: rowB.version }), isStatus(409));
    await assert.rejects(() => dispatchManagement.cancel(inputB), isStatus(409));
    assert.equal(providerCalls, 2);
    assert.equal((await prisma.restaurantExternalDeliveryDispatch.findUniqueOrThrow({
      where: { id: rowB.id },
    })).status, 'UNKNOWN');
    await assert.rejects(() => tracker.refresh(inputB), isStatus(409));
    assert.equal(lookupCalls, 1);
    assert.equal(await prisma.auditLog.count({
      where: { restaurantId: restaurantA, action: 'LALAMOVE_SANDBOX_STATUS_REFRESHED' },
    }), 1);
    assert.equal(await prisma.order.count({
      where: { id: b, restaurantId: restaurantB, ...ownCourierAvailableDispatchScope },
    }), 0);
    await assert.rejects(() => fake.book({
      ...inputA, restaurantId: restaurantB, expectedVersion: rowA.version,
    }), isStatus(403));
  } finally {
    if (oldFlag === undefined) delete process.env.LALAMOVE_SANDBOX_BOOKING_ENABLED;
    else process.env.LALAMOVE_SANDBOX_BOOKING_ENABLED = oldFlag;
  }
  // No external courier is booked, and the original own-courier model remains intact.
  await prisma.order.update({ where: { id: a }, data: { assignedCourierId: fixture.users.courierA.id } });
  await assert.rejects(() => service.approve(inputA, {
    expectedVersion: approved.version, expectedTotal: '12.80',
  }), isStatus(409));
});
