import { expect, test, type Page } from '@playwright/test';

type MockOrder = {
  id: number;
  restaurantId: number;
  user: { id: number; name: string; email: string };
  status: string;
  total: number;
  paid: boolean;
  type: string;
  paymentMethod: string;
  payOnDelivery: boolean;
  payOnDeliveryMethod?: string | null;
  createdAt: string;
  refundStatus: string;
};

type TestState = {
  orders: MockOrder[];
  refundRequests: number;
};

const RESTAURANT_ID = 9;

function createState(): TestState {
  const createdAt = new Date().toISOString();
  return {
    refundRequests: 0,
    orders: [
      {
        id: 701,
        restaurantId: RESTAURANT_ID,
        user: { id: 81, name: 'Cliente Pix Online', email: 'pix@cliente.test' },
        status: 'PENDENTE',
        total: 72.5,
        paid: true,
        type: 'DELIVERY',
        paymentMethod: 'PIX',
        payOnDelivery: false,
        createdAt,
        refundStatus: 'NOT_REQUESTED',
      },
      {
        id: 702,
        restaurantId: RESTAURANT_ID,
        user: { id: 82, name: 'Cliente Pagamento na Entrega', email: 'entrega@cliente.test' },
        status: 'PENDENTE',
        total: 48,
        paid: true,
        type: 'DELIVERY',
        paymentMethod: 'PIX',
        payOnDelivery: true,
        payOnDeliveryMethod: 'PIX',
        createdAt,
        refundStatus: 'NOT_REQUESTED',
      },
    ],
  };
}

async function mockAdminApi(page: Page, state: TestState) {
  await page.route(/^http:\/\/(127\.0\.0\.1|localhost):3000\/.*$/, async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    const method = request.method();

    if (pathname === '/auth/me') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 9,
            name: 'Admin Teste',
            role: 'ADMIN',
            restaurantId: RESTAURANT_ID,
          },
        }),
      });
      return;
    }

    if (pathname === '/orders' && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ orders: state.orders }),
      });
      return;
    }

    if (pathname === '/orders/701/refund' && method === 'PATCH') {
      state.refundRequests += 1;
      state.orders = state.orders.map((order) =>
        order.id === 701
          ? {
              ...order,
              status: 'CANCELADO',
              refundStatus: 'SUCCEEDED',
            }
          : order,
      );
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          order: state.orders.find((order) => order.id === 701),
          refunded: true,
        }),
      });
      return;
    }

    const responses: Record<string, unknown> = {
      '/products': { products: [] },
      '/ingredients': { ingredients: [] },
      '/categories': { categories: [] },
      '/coupons': { coupons: [] },
      '/settings': { id: 1, restaurant: { id: RESTAURANT_ID, name: 'Restaurante Teste' } },
      '/billing/invoices': { invoices: [] },
      '/banners': [],
      '/employees': { employees: [] },
      '/ai-support/messages': { messages: [] },
    };

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(responses[pathname] ?? {}),
    });
  });

  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('token', 'e2e-admin-token');
    localStorage.setItem(
      'user',
      JSON.stringify({
        id: 9,
        name: 'Admin Teste',
        role: 'ADMIN',
        restaurantId: 9,
      }),
    );
  });
}

test('admin cancela Pix online com estorno único e distingue pagamento na entrega', async ({
  page,
}) => {
  const state = createState();
  await mockAdminApi(page, state);
  await page.goto('/admin');

  await page.getByRole('button', { name: 'Pedidos' }).click();

  const onlinePixOrder = page.locator('article.order-card').filter({ hasText: '#701' });
  await expect(onlinePixOrder).toContainText('Cliente Pix Online');
  await expect(onlinePixOrder).toContainText('Pago online');
  await expect(onlinePixOrder).toContainText(
    'Ao cancelar, o estorno online será solicitado automaticamente',
  );

  const payOnDeliveryOrder = page.locator('article.order-card').filter({ hasText: '#702' });
  await expect(payOnDeliveryOrder).toContainText('Pago na entrega');
  await expect(payOnDeliveryOrder).toContainText(
    'Pagamento na entrega exige devolução manual',
  );
  await expect(payOnDeliveryOrder).not.toContainText('estorno automático ao cancelar');
  await expect(
    payOnDeliveryOrder.getByRole('button', { name: 'Cancelar e estornar o pedido #702' }),
  ).toHaveCount(0);

  await onlinePixOrder
    .getByRole('button', { name: 'Cancelar e estornar o pedido #701' })
    .click();

  const confirmation = page.getByRole('dialog');
  await expect(confirmation).toContainText('Cancelar pedido e solicitar estorno?');
  await expect(confirmation).toContainText(
    'o estorno de R$ 72,50 será solicitado automaticamente no Pix',
  );
  await confirmation
    .getByRole('button', { name: 'Cancelar e estornar', exact: true })
    .click();

  await expect.poll(() => state.refundRequests).toBe(1);
  await expect(page.getByText('Pedido #701 cancelado e estorno solicitado.')).toBeVisible();
  await expect(onlinePixOrder).toContainText('Cancelado');
  await expect(onlinePixOrder).toContainText('Estorno concluído no mesmo meio de pagamento');
  expect(state.refundRequests).toBe(1);
});
