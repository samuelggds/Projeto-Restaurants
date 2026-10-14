import assert from 'node:assert/strict';
import { UserRole } from '@prisma/client';
import authTokenService from '../../modules/auth/services/AuthTokenService.js';
import { apiRequest, prisma, seedTenantE2EFixture } from './tenantE2EHarness.js';

export async function runGlobalCustomerCouponCase(
  baseUrl: string,
  fixture: Awaited<ReturnType<typeof seedTenantE2EFixture>>,
) {
  const customer = await prisma.user.create({
    data: {
      name: 'Cliente global de cupons',
      email: 'global-coupon-e2e@tenant-e2e.test',
      password: 'e2e-password-only',
      active: true,
      role: UserRole.CLIENTE,
      restaurantId: null,
    },
  });
  const token = authTokenService.createAccessToken({
    id: customer.id, role: UserRole.CLIENTE, restaurantId: null,
    authVersion: customer.authVersion,
  });
  const campaign = await apiRequest(baseUrl, '/coupons', fixture.tokens.adminA, {
    method: 'POST',
    json: {
      code: 'GLOBAL_AUTHENTICATED_E2E', kind: 'PROMOTIONAL',
      audience: 'AUTHENTICATED', discountType: 'FIXED', discount: 10,
      allowDelivery: true, allowPickup: true, allowTable: true,
    },
  });
  assert.equal(campaign.response.status, 201, JSON.stringify(campaign.data));
  const [own, foreign, guest, roleDenied] = await Promise.all([
    apiRequest(baseUrl, `/coupons/mine?restaurantId=${fixture.restaurants.a.id}`, token),
    apiRequest(baseUrl, `/coupons/mine?restaurantId=${fixture.restaurants.b.id}`, token),
    apiRequest(baseUrl, `/coupons/mine?restaurantId=${fixture.restaurants.a.id}`),
    apiRequest(baseUrl, `/coupons/mine?restaurantId=${fixture.restaurants.a.id}`, fixture.tokens.adminA),
  ]);
  assert.equal(own.response.status, 200, JSON.stringify(own.data));
  assert.ok(own.data.some((coupon: { code: string; status: string }) =>
    coupon.code === 'GLOBAL_AUTHENTICATED_E2E' && coupon.status === 'ACTIVE'));
  assert.equal(foreign.response.status, 200, JSON.stringify(foreign.data));
  assert.ok(!foreign.data.some((coupon: { code: string }) => coupon.code === 'GLOBAL_AUTHENTICATED_E2E'));
  assert.equal(guest.response.status, 401);
  assert.equal(roleDenied.response.status, 403);
  const publicCoupons = await apiRequest(baseUrl,
    `/coupons/public?restaurantId=${fixture.restaurants.a.id}`);
  assert.ok(!publicCoupons.data.some((coupon: { code: string }) => coupon.code === 'GLOBAL_AUTHENTICATED_E2E'));
}
