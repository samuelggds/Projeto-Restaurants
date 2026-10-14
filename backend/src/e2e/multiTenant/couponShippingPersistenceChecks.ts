import assert from 'node:assert/strict';
import { apiRequest, prisma, seedTenantE2EFixture } from './tenantE2EHarness.js';

/** Exercise coupon persistence, tenant boundaries, and DB constraints in the real HTTP E2E suite. */
export async function runShippingCouponPersistenceCase(
  baseUrl: string,
  fixture: Awaited<ReturnType<typeof seedTenantE2EFixture>>,
) {
  const payload = {
    code: 'FRETEZERO_E2E',
    title: 'Frete grátis para entrega',
    kind: 'PROMOTIONAL',
    audience: 'ALL',
    discountType: 'FREE_SHIPPING',
    discount: 0,
    minimumSubtotal: 50,
    maxDiscount: null,
    usageLimit: 5,
    perCustomerLimit: 1,
    allowDelivery: true,
    allowPickup: false,
    allowTable: false,
    active: true,
  };
  const created = await apiRequest(baseUrl, '/coupons', fixture.tokens.adminA, {
    method: 'POST',
    json: payload,
  });
  assert.equal(created.response.status, 201, JSON.stringify(created.data));
  assert.equal(created.data.discountType, 'FREE_SHIPPING');
  assert.equal(created.data.discount, 0);
  assert.equal(created.data.restaurantId, fixture.restaurants.a.id);

  const persisted = await prisma.coupon.findFirstOrThrow({
    where: { restaurantId: fixture.restaurants.a.id, code: payload.code },
  });
  assert.equal(Number(persisted.discount), 0);
  assert.equal(persisted.kind, 'PROMOTIONAL');
  assert.equal(persisted.discountType, 'FREE_SHIPPING');

  const [own, foreign] = await Promise.all([
    apiRequest(baseUrl, '/coupons', fixture.tokens.adminA),
    apiRequest(baseUrl, '/coupons', fixture.tokens.adminB),
  ]);
  assert.equal(own.response.status, 200, JSON.stringify(own.data));
  assert.equal(foreign.response.status, 200, JSON.stringify(foreign.data));
  assert.ok(own.data.some((coupon: { id: number }) => coupon.id === persisted.id));
  assert.ok(!foreign.data.some((coupon: { id: number }) => coupon.id === persisted.id));

  const invalidFixed = await apiRequest(baseUrl, '/coupons', fixture.tokens.adminA, {
    method: 'POST',
    json: { ...payload, code: 'INVALID_FIXED_ZERO_E2E', discountType: 'FIXED' },
  });
  assert.equal(invalidFixed.response.status, 422, JSON.stringify(invalidFixed.data));

  // A restrição deve continuar efetiva no próprio banco, mesmo sem o validador da API.
  await assert.rejects(() => prisma.coupon.create({
    data: {
      restaurantId: fixture.restaurants.a.id,
      code: 'BAD_FIXED_ZERO_E2E',
      kind: 'PROMOTIONAL',
      discountType: 'FIXED',
      discount: 0,
    },
  }));
  await assert.rejects(() => prisma.coupon.create({
    data: {
      restaurantId: fixture.restaurants.a.id,
      code: 'BAD_FREE_SHIPPING_E2E',
      kind: 'PROMOTIONAL',
      discountType: 'FREE_SHIPPING',
      discount: 0,
      allowDelivery: true,
      allowPickup: true,
      allowTable: false,
    },
  }));
}
