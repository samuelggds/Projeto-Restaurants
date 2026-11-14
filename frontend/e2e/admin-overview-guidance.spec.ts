import { expect, test, type Page } from '@playwright/test';
import { adminMockSettings } from '../src/pages/admin/data';
import { mockAuthRefresh } from './helpers/mockAuthRefresh';
import { orderFixtureResponse } from './helpers/orderFixtures';
import { captureReadmeScreenshot } from './helpers/readmeScreenshot';

// Preview fixtures stay in tests; the application continues to use the authenticated API.
async function mockRestaurant(page: Page) {
  const writes: string[] = [];
  const orders = [
    {
      id: 1048,
      customerName: 'Marina Costa',
      status: 'PREPARANDO',
      total: 89.9,
      paid: true,
      type: 'DELIVERY',
      paymentMethod: 'PIX',
    },
    {
      id: 1047,
      customerName: 'Lucas Oliveira',
      status: 'CONFIRMADO',
      total: 64.9,
      paid: true,
      type: 'RETIRADA',
      paymentMethod: 'CREDIT_CARD',
    },
    {
      id: 1046,
      customerName: 'Ana Ribeiro',
      status: 'ENTREGUE',
      total: 119.8,
      paid: true,
      type: 'DELIVERY',
      paymentMethod: 'PIX',
    },
  ].map((order) => ({ ...order, createdAt: new Date().toISOString() }));
  const products = [
    {
      id: 1,
      name: 'Pizza Margherita',
      price: 49.9,
      category: { id: 1, name: 'Pizzas tradicionais' },
      image: '/demo/pizza.webp',
      active: true,
    },
    {
      id: 2,
      name: 'Pizza Calabresa',
      price: 54.9,
      category: { id: 1, name: 'Pizzas tradicionais' },
      image: '/demo/pizza.webp',
      active: true,
    },
    {
      id: 3,
      name: 'Refrigerante 350 ml',
      price: 7.9,
      category: { id: 2, name: 'Bebidas' },
      image: '/demo/soda.webp',
      active: true,
    },
    {
      id: 4,
      name: 'Pizza quatro queijos',
      price: 59.9,
      category: { id: 1, name: 'Pizzas tradicionais' },
      active: false,
    },
  ];
  await page.route(/:3000\/|\/api\//, async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname
      .replace(/^\/api/, '')
      .replace(/^\/products\/manage$/, '/products');
    if (!['GET', 'OPTIONS'].includes(request.method())) writes.push(`${request.method()} ${path}`);
    const data: Record<string, unknown> = {
      '/auth/me': { user: { id: 9, name: 'Administrador', role: 'ADMIN', restaurantId: 9 } },
      '/settings': {
        id: 1,
        primaryColor: '#f97316',
        isOpenForOrders: true,
        restaurant: {
          id: 9,
          name: 'Restaurante Exemplo',
          slug: 'restaurante-exemplo',
          address: 'Rua das Palmeiras',
          addressNumber: '123',
          city: 'Cidade Exemplo',
          state: 'SP',
        },
      },
      '/products': { products },
      '/categories': {
        categories: [
          { id: 1, name: 'Pizzas tradicionais' },
          { id: 2, name: 'Bebidas' },
        ],
      },
      '/ingredients': { ingredients: [] },
      '/coupons': { coupons: [] },
      '/banners': [],
      '/employees': [],
      '/billing/invoices': { invoices: [] },
      '/settings/payment-connections': { connections: [] },
      '/table-accounts/settings': adminMockSettings.tableAccount,
      '/table-accounts/admin/sessions': { sessions: [] },
      '/orders/reports/overview': {
        todayOrders: 24,
        sales: 1648.7,
        averageTicket: 68.7,
        preparingOrders: 3,
        customers: 186,
        timezone: 'America/Sao_Paulo',
        registeredSalesTotal: 1789.5,
        confirmedPaymentsToday: 22,
        cancelledOrdersCreatedToday: 1,
        refundedOrdersToday: 0,
      },
    };
    await route.fulfill({ json: data[path] ?? orderFixtureResponse(request.url(), orders) ?? {} });
  });
  await mockAuthRefresh(page, 9, 'admin-overview-preview-token');
  return writes;
}

test.use({ viewport: { width: 1440, height: 1200 }, reducedMotion: 'reduce' });

test('overview preserves API metrics, guides settings navigation, and adapts to mobile', async ({
  page,
}) => {
  test.setTimeout(60_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const writes = await mockRestaurant(page);
  await page.goto('/admin');
  const guide = page.getByRole('region', { name: 'Seu restaurante, passo a passo', exact: true });
  await expect(guide).toBeVisible();
  const metrics = page.getByRole('region', { name: 'Indicadores de hoje' });
  await expect(metrics).toContainText('1.648,70');
  await expect(metrics).toContainText('186');
  await expect(page.locator('.data-row.order-row')).toHaveCount(3);
  await expect(page.locator('.data-row.product-row')).toHaveCount(3);
  await page.evaluate(() => document.fonts.ready);
  await captureReadmeScreenshot(page, 'gastronexa-admin-desktop.png');
  await captureReadmeScreenshot(page, 'gastronexa-admin-completo.png', { fullPage: true });

  // The initial section is already "brand": the guide must still open settings.
  await guide.getByRole('button', { name: /^Marca e identidade/ }).click();
  await expect(
    page.getByRole('textbox', { name: 'Nome do restaurante', exact: true }),
  ).toBeVisible();
  await expect(page.locator('[data-admin-root]')).toHaveAttribute('data-admin-area', 'settings');
  await page.getByRole('button', { name: 'Visão geral', exact: true }).click();
  await guide.getByRole('button', { name: 'Atendimento', exact: true }).click();
  await expect(guide.getByRole('button', { name: 'Atendimento', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await guide.getByRole('button', { name: /^Horários/ }).click();
  await expect(page.locator('[data-settings-section="hours"]')).toBeVisible();
  await page.getByRole('button', { name: 'Visão geral', exact: true }).click();
  await guide.getByRole('button', { name: 'Pagamentos', exact: true }).click();
  await guide.getByRole('button', { name: /^Pagamentos Escolha/ }).click();
  await expect(page.locator('[data-settings-section="payments"]')).toBeVisible();
  await page.getByRole('button', { name: 'Visão geral', exact: true }).click();
  await guide.getByRole('button', { name: 'Recolher guia', exact: true }).click();
  await expect(
    guide.getByRole('group', { name: 'Etapas de configuração do restaurante' }),
  ).toBeHidden();
  await guide.getByRole('button', { name: 'Abrir guia', exact: true }).click();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => scrollTo(0, 0));
  await captureReadmeScreenshot(page, 'gastronexa-admin-celular.png');
  await guide.scrollIntoViewIfNeeded();
  await captureReadmeScreenshot(page, 'gastronexa-admin-guia-celular.png');
  for (const width of [390, 320, 768]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await guide.getByRole('button', { name: 'Atendimento', exact: true }).click();
  await guide.getByRole('button', { name: /^Horários/ }).click();
  await expect(page.locator('[data-settings-section="hours"]')).toBeVisible();
  expect(writes).toEqual([]);
  expect(errors).toEqual([]);
});
