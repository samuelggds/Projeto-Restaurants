import { expect, test, type Page } from '@playwright/test';
import { orderFixtureResponse } from './helpers/orderFixtures';
import { mockAuthRefresh } from './helpers/mockAuthRefresh';

type DetailOrder = {
  id: number; publicId: string; restaurantId: number; customerName: string;
  user: { id: number; name: string; email: string };
  type: string; status: string; total: number; paid: boolean; paymentMethod: string | null;
  payOnDelivery: boolean; payOnDeliveryMethod?: string; createdAt: string; paidAt?: string;
  readyAt?: string; refundStatus: string; table?: { number: number }; itemsSubtotal: number;
  items: Array<{ id: number; product: { name: string }; quantity: number; price: number; observation: string }>;
};

function buildOrders(): DetailOrder[] {
  const createdAt = new Date().toISOString();
  const base = {
    restaurantId: 9, status: 'PRONTO', total: 38.5, itemsSubtotal: 38.5,
    payOnDelivery: false, createdAt, readyAt: createdAt, refundStatus: 'NOT_REQUESTED',
    items: [{ id: 1, product: { name: 'Produto da API' }, quantity: 1, price: 38.5, observation: 'Sem cebola' }],
  };
  return [
    { ...base, id: 901, publicId: 'order-online-901', customerName: 'Cliente online', user: { id: 11, name: 'Cliente online', email: 'online@cliente.test' }, type: 'DELIVERY', paid: true, paymentMethod: 'PIX', paidAt: createdAt },
    { ...base, id: 902, publicId: 'order-counter-902', customerName: 'Cliente balcão', user: { id: 12, name: 'Cliente balcão', email: 'balcao@cliente.test' }, type: 'RETIRADA', paid: false, paymentMethod: null, payOnDeliveryMethod: 'DINHEIRO' },
    { ...base, id: 903, publicId: 'order-table-903', customerName: 'Cliente mesa', user: { id: 13, name: 'Cliente mesa', email: 'mesa@cliente.test' }, type: 'MESA', table: { number: 7 }, paid: false, paymentMethod: null },
    { ...base, id: 904, publicId: 'order-unpaid-904', customerName: 'Cliente Pix pendente', user: { id: 14, name: 'Cliente Pix pendente', email: 'pendente@cliente.test' }, type: 'RETIRADA', paid: false, paymentMethod: 'PIX' },
  ];
}

async function setup(page: Page) {
  const state = {
    orders: buildOrders(), printRequests: [] as number[], cashRequests: 0,
    tableRequests: 0, chargeRequests: [] as Record<string, unknown>[],
  };
  await page.route(/^http:\/\/(127\.0\.0\.1|localhost):3000\/.*$/, async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    const method = request.method();
    const json = async (body: unknown) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    if (pathname === '/auth/me') return json({ user: { id: 9, name: 'Admin Teste', role: 'ADMIN', restaurantId: 9 } });
    if (method === 'GET') {
      const fixture = orderFixtureResponse(request.url(), state.orders);
      if (fixture !== undefined && fixture !== null) return json(fixture);
    }
    if (pathname === '/table-accounts/admin/sessions') return json({ sessions: [{
      pendingManualPayments: state.orders[2].paid ? [] : [{
        publicId: 'table-cash-903', method: 'CASH', status: 'RESERVED',
        totalCents: 3850, payerDisplayName: 'Cliente mesa', staffReceiptRegistered: true,
        orderPublicIds: ['order-table-903'],
      }],
    }] });
    const reprint = pathname.match(/^\/kitchen-printing\/orders\/(\d+)\/reprint$/);
    if (reprint && method === 'POST') { state.printRequests.push(Number(reprint[1])); return json({ job: { status: 'QUEUED' } }); }
    if (pathname === '/pickup-payments/902/cash' && method === 'POST') {
      state.cashRequests += 1;
      state.orders[1] = { ...state.orders[1], paid: true, paymentMethod: 'DINHEIRO' };
      return json({ order: state.orders[1] });
    }
    if (pathname === '/pickup-payments/902/start' && method === 'POST') {
      state.chargeRequests.push(request.postDataJSON() as Record<string, unknown>);
      return json({ payment: null, order: state.orders[1] });
    }
    if (pathname === '/table-accounts/payments/table-cash-903/confirm-manual' && method === 'POST') {
      state.tableRequests += 1;
      state.orders[2] = { ...state.orders[2], paid: true, paymentMethod: 'DINHEIRO' };
      return json({ payment: { status: 'PAID' }, confirmationStage: 'PAID' });
    }
    const responses: Record<string, unknown> = {
      '/orders': { orders: state.orders }, '/products': { products: [] },
      '/ingredients': { ingredients: [] }, '/categories': { categories: [] }, '/coupons': { coupons: [] },
      '/settings': { id: 1, restaurant: { id: 9, name: 'Restaurante Teste' } },
      '/billing/invoices': { invoices: [] }, '/banners': [], '/employees': { employees: [] },
      '/ai-support/messages': { messages: [] }, '/payment-terminals': { terminals: [], couriers: [] },
    };
    return json(responses[pathname] ?? {});
  });
  await page.addInitScript(() => {
    localStorage.clear(); sessionStorage.clear();
    localStorage.setItem('user', JSON.stringify({ id: 9, name: 'Admin Teste', role: 'ADMIN', restaurantId: 9 }));
  });
  await mockAuthRefresh(page, 9, 'detail-e2e-admin-token');
  await page.goto('/admin');
  await page.getByRole('button', { name: 'Pedidos', exact: true }).click();
  // The real API lists newest first. Select the online fixture explicitly.
  await page.getByRole('button', { name: /Ver detalhes do pedido #901 / }).click();
  await expect(page.getByRole('heading', { name: 'Pedido #901', exact: true })).toBeVisible();
  return state;
}

for (const width of [1440, 390]) {
  test(`detalhes fecham, liberam espaço e reabrem com ações reais em ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 960 });
    const state = await setup(page);
    const queue = page.getByRole('navigation', { name: 'Selecionar pedido para detalhes' });
    const panel = page.getByRole('region', { name: 'Detalhes e ações do pedido selecionado' });
    await expect(panel).toContainText('Pagamento online · Pago');
    await expect(panel.getByRole('group', { name: 'Formas de pagamento no balcão' })).toHaveCount(0);
    const before = await queue.boundingBox();
    await panel.getByRole('button', { name: 'Fechar detalhes do pedido' }).click();
    await expect(page.locator('.orders-split-view')).toHaveAttribute('data-detail-open', 'false');
    await expect(panel).toBeHidden();
    await expect(queue.getByRole('button', { name: /Ver detalhes do pedido #901 / })).toBeFocused();
    if (width > 1020) {
      await expect.poll(async () => (await queue.boundingBox())?.width ?? 0).toBeGreaterThan((before?.width ?? 0) + 100);
    }
    await queue.getByRole('button', { name: /Ver detalhes do pedido #902 / }).click();
    await expect(panel).toBeVisible();
    await expect(panel.getByRole('heading', { name: 'Pedido #902' })).toBeVisible();
    await expect(panel.getByRole('button', { name: 'Pix no balcão', exact: true })).toBeVisible();
    await expect(panel.getByRole('button', { name: 'Cartão na maquininha', exact: true })).toBeVisible();
    await expect(panel.getByRole('button', { name: 'Dinheiro', exact: true })).toBeVisible();
    expect(state.cashRequests).toBe(0);
    const screenshot = testInfo.outputPath(`admin-order-counter-${width}.png`);
    await panel.screenshot({ path: screenshot });
    await testInfo.attach(`Pedido no balcao ${width}px`, { path: screenshot, contentType: 'image/png' });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
  });
}

test('dinheiro da mesa exige confirmação própria e não cobra novamente um pedido pago', async ({ page }) => {
  const state = await setup(page);
  await page.getByRole('button', { name: /Ver detalhes do pedido #903 / }).click();
  const panel = page.getByRole('region', { name: 'Detalhes e ações do pedido selecionado' });
  await expect(panel).toContainText('Mesa 7');
  await expect(panel).toContainText('Dinheiro recebido pelo garçom');
  await expect(panel.getByRole('button', { name: 'Cartão na maquininha' })).toHaveCount(0);
  await panel.getByRole('button', { name: 'Confirmar dinheiro recebido do pedido #903' }).click();
  expect(state.tableRequests).toBe(0);
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar dinheiro recebido', exact: true }).click();
  await expect.poll(() => state.tableRequests).toBe(1);
  await expect(panel.locator('.detail-payment-state')).toContainText('Pago');
  await expect(panel.locator('.detail-receipt')).toHaveCount(0);
  expect(state.cashRequests).toBe(0);
  expect(state.chargeRequests).toHaveLength(0);
});

test('Pix online pendente não ganha botões de balcão nem confirmação manual', async ({ page }) => {
  await setup(page);
  await page.getByRole('button', { name: /Ver detalhes do pedido #904 / }).click();
  const panel = page.getByRole('region', { name: 'Detalhes e ações do pedido selecionado' });
  await expect(panel).toContainText('Pagamento pendente');
  await expect(panel).not.toContainText('Pagamento online · Pago');
  await expect(panel.getByRole('group', { name: 'Formas de pagamento no balcão' })).toHaveCount(0);
  await expect(panel.locator('.detail-receipt')).toHaveCount(0);
});

test('imprimir usa a fila do backend e mantém o pedido e seus pagamentos', async ({ page }) => {
  const state = await setup(page);
  const panel = page.getByRole('region', { name: 'Detalhes e ações do pedido selecionado' });
  await panel.getByRole('button', { name: 'Imprimir pedido #901' }).click();
  expect(state.printRequests).toHaveLength(0);
  await page.getByRole('dialog').getByRole('button', { name: 'Enviar para impressão' }).click();
  await expect.poll(() => state.printRequests).toEqual([901]);
  await expect(page.getByText('Comanda do pedido #901 enviada à fila de impressão.', { exact: true })).toBeVisible();
  expect(state.orders[0].status).toBe('PRONTO');
  expect(state.cashRequests + state.tableRequests).toBe(0);
  expect(state.chargeRequests).toHaveLength(0);
});

test('Mais opções mantém a entrega parceira recolhida e respeita movimento reduzido', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await setup(page);
  const panel = page.getByRole('region', { name: 'Detalhes e ações do pedido selecionado' });
  await expect(panel.getByText('Entrega parceira · Lalamove', { exact: true })).toHaveCount(0);
  await panel.getByRole('button', { name: 'Mais opções' }).click();
  await expect(panel.getByRole('button', { name: 'Mais opções' })).toHaveAttribute('aria-expanded', 'true');
  await expect(panel.getByText('Entrega parceira · Lalamove', { exact: true })).toBeVisible();
  await expect(panel.locator('article.order-card')).toHaveCSS('animation-name', 'none');
  await panel.getByRole('button', { name: 'Mais opções' }).click();
  await expect(panel.getByText('Entrega parceira · Lalamove', { exact: true })).toHaveCount(0);
});
