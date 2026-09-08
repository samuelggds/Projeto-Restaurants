import assert from 'node:assert/strict';
import test from 'node:test';
import { apiRequest, prisma, resetTenantE2EDatabase, seedTenantE2EFixture, startTenantTestApplication } from '../backend/src/e2e/multiTenant/tenantE2EHarness.js';
import { calculateOverviewMetrics } from '../frontend/src/pages/admin/domain/adminOverview.js';
import { mapAdminOrder } from '../frontend/src/pages/admin/domain/adminOrderMapper.js';

test('auditoria: primeira página não representa filas e totais completos', { timeout: 120000 }, async () => {
  await resetTenantE2EDatabase();
  const f = await seedTenantE2EFixture();
  const runtime = await startTenantTestApplication();
  try {
    await prisma.order.update({ where: { id: f.orders.a.id }, data: { status: 'PREPARANDO', paid: true } });
    await prisma.order.createMany({ data: Array.from({ length: 60 }, () => ({
      restaurantId: f.restaurants.a.id, userId: f.users.customerA.id,
      total: 10, type: 'RETIRADA', status: 'ENTREGUE', paid: true, paymentMethod: 'DINHEIRO',
    })) });
    const page = await apiRequest(runtime.baseUrl, '/orders', f.tokens.adminA);
    assert.equal(page.response.status, 200);
    assert.equal(page.data.orders.length, 50);
    assert.ok(page.data.total > 50);
    assert.equal(page.data.hasMore, true);
    const local = calculateOverviewMetrics(page.data.orders.map(mapAdminOrder));
    assert.equal(local.preparingOrders, 0);
    assert.ok(page.data.summary.inProgress >= 1);
    const overview = await apiRequest(runtime.baseUrl, '/orders/reports/overview', f.tokens.adminA);
    assert.equal(overview.response.status, 200);
    assert.ok(overview.data.sales > local.sales);
    assert.ok(overview.data.preparingOrders > local.preparingOrders);
    const next = await apiRequest(runtime.baseUrl, `/orders?cursor=${page.data.nextCursor}`, f.tokens.adminA);
    assert.equal(next.response.status, 200);
    assert.ok(next.data.orders.some((order) => order.id === f.orders.a.id));
    const ids = new Set(page.data.orders.map((order) => order.id));
    assert.ok(next.data.orders.every((order) => !ids.has(order.id)));
    const supportB = await apiRequest(runtime.baseUrl, '/orders?issuesOnly=true', f.tokens.adminB);
    assert.equal(supportB.response.status, 200);
    assert.ok(supportB.data.orders.some((order) => order.issueThread?.orderId === f.orders.b.id));
    const invalid = await apiRequest(runtime.baseUrl, '/orders?limit=101', f.tokens.adminA);
    assert.equal(invalid.response.status, 400);
    console.log(JSON.stringify({ evidence: 'pagination-integration-gap',
      returned: page.data.orders.length, total: page.data.total,
      browserCalculatedSales: local.sales, serverCalculatedSales: overview.data.sales,
      browserPreparing: local.preparingOrders, serverPreparing: overview.data.preparingOrders,
      olderActiveOrderOnNextPage: true, rlsThreadVisibleToOwner: true,
      cursorNoDuplicates: true, excessiveLimitRejected: true,
    }));
  } finally {
    await runtime.close();
    await prisma.$disconnect();
  }
});
