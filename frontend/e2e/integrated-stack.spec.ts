import { expect, test, type Page } from '@playwright/test';

const apiUrl = process.env.CI_INTEGRATED_API_URL || 'http://127.0.0.1:3000';
const restaurantAId = Number(process.env.CI_RESTAURANT_A_ID || 0);
const restaurantBId = Number(process.env.CI_RESTAURANT_B_ID || 0);
const productAId = Number(process.env.CI_PRODUCT_A_ID || 0);
const password = process.env.CI_STAFF_PASSWORD || '';
const attendantAEmail = process.env.CI_ATTENDANT_A_EMAIL || '';
const kitchenAEmail = process.env.CI_KITCHEN_A_EMAIL || '';
const attendantBEmail = process.env.CI_ATTENDANT_B_EMAIL || '';

type OrderResponse = {
  id?: number | string;
  restaurantId?: number | string;
  status?: string;
};

type OrderListResponse = OrderResponse[] | { orders?: OrderResponse[] };

async function apiFromBrowser<T>(
  page: Page,
  path: string,
  init: RequestInit = {},
): Promise<{ status: number; body: T }> {
  return page.evaluate(
    async ({ base, requestPath, requestInit }) => {
      const response = await fetch(`${base}${requestPath}`, requestInit);
      const body = await response.json().catch(() => ({}));
      return { status: response.status, body };
    },
    { base: apiUrl, requestPath: path, requestInit: init },
  );
}

async function login(page: Page, email: string) {
  const result = await apiFromBrowser<{ token?: string; user?: { role?: string } }>(page, '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  expect(result.status).toBe(200);
  expect(result.body.token).toBeTruthy();
  return result.body.token!;
}

test('real browser -> API -> PostgreSQL preserves tenant auth and order state transitions', async ({
  page,
}) => {
  expect(restaurantAId).toBeGreaterThan(0);
  expect(restaurantBId).toBeGreaterThan(0);
  expect(productAId).toBeGreaterThan(0);
  expect(password).not.toBe('');

  await page.goto('/');
  await expect(page.locator('body')).toBeVisible();

  const attendantAToken = await login(page, attendantAEmail);
  const created = await apiFromBrowser<OrderResponse>(page, '/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${attendantAToken}`,
      'Idempotency-Key': 'integrated-stack-create-order-0001',
    },
    body: JSON.stringify({
      restaurantId: restaurantAId,
      type: 'RETIRADA',
      paymentMethod: 'DINHEIRO',
      items: [{ productId: productAId, quantity: 1 }],
    }),
  });
  expect(created.status).toBe(201);
  expect(Number(created.body.restaurantId)).toBe(restaurantAId);
  expect(Number(created.body.id)).toBeGreaterThan(0);

  const orderId = Number(created.body.id);
  const kitchenAToken = await login(page, kitchenAEmail);
  const advanced = await apiFromBrowser<OrderResponse>(page, `/orders/${orderId}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${kitchenAToken}`,
    },
    body: JSON.stringify({ status: 'PREPARANDO' }),
  });
  expect(advanced.status).toBe(200);
  expect(advanced.body.status).toBe('PREPARANDO');

  const attendantBToken = await login(page, attendantBEmail);
  const tenantBOrders = await apiFromBrowser<OrderListResponse>(page, '/orders?queue=ACTIVE&limit=50', {
    headers: { Authorization: `Bearer ${attendantBToken}` },
  });
  expect(tenantBOrders.status).toBe(200);
  const orders = Array.isArray(tenantBOrders.body) ? tenantBOrders.body : tenantBOrders.body.orders || [];
  expect(orders.some((order) => Number(order.id) === orderId)).toBe(false);
  expect(orders.every((order) => Number(order.restaurantId) === restaurantBId)).toBe(true);
});
