import { expect, test, type Page } from '@playwright/test';

import { mockAuthRefresh } from './helpers/mockAuthRefresh';

type BusinessHour = {
  id: string;
  label: string;
  enabled: boolean;
  openingTime: string;
  closingTime: string;
};

type AdminApiState = {
  savedPayload: Record<string, unknown> | null;
};

const dayLabels: Array<[string, string]> = [
  ['monday', 'Segunda-feira'],
  ['tuesday', 'Terça-feira'],
  ['wednesday', 'Quarta-feira'],
  ['thursday', 'Quinta-feira'],
  ['friday', 'Sexta-feira'],
  ['saturday', 'Sábado'],
  ['sunday', 'Domingo'],
];

function weeklySchedule(enabled = true): BusinessHour[] {
  return dayLabels.map(([id, label]) => ({
    id,
    label,
    enabled,
    openingTime: '11:00',
    closingTime: '23:00',
  }));
}

async function mockClosedStorefront(page: Page) {
  const settings = {
    restaurantId: 9,
    restaurantName: 'Restaurante Teste',
    primaryColor: '#d05632',
    isOpenForOrders: true,
    businessHours: weeklySchedule(false),
    restaurant: { id: 9, name: 'Restaurante Teste' },
  };

  await page.route(/^http:\/\/(127\.0\.0\.1|localhost):3000\/.*$/, async (route) => {
    const pathname = new URL(route.request().url()).pathname;

    if (
      pathname === '/settings/public/slug/restaurante-teste' ||
      pathname === '/settings/public/9'
    ) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(settings),
      });
      return;
    }

    if (pathname === '/products') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ products: [] }),
      });
      return;
    }

    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
}

async function mockAdminApi(page: Page, state: AdminApiState) {
  const settings = {
    id: 1,
    restaurantId: 9,
    restaurantName: 'Restaurante Teste',
    primaryColor: '#d05632',
    isOpenForOrders: true,
    averageDeliveryTime: 45,
    businessHours: weeklySchedule(),
    restaurant: { id: 9, name: 'Restaurante Teste' },
  };

  await page.route(/^http:\/\/(127\.0\.0\.1|localhost):3000\/.*$/, async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    const method = request.method();

    if (pathname === '/auth/me') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: 9, name: 'Admin Teste', role: 'ADMIN', restaurantId: 9 },
        }),
      });
      return;
    }

    if (pathname === '/settings' && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(settings),
      });
      return;
    }

    if (pathname === '/settings/1' && method === 'PUT') {
      state.savedPayload = request.postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...settings, ...state.savedPayload }),
      });
      return;
    }

    const responses: Record<string, unknown> = {
      '/orders': { orders: [] },
      '/products': { products: [] },
      '/ingredients': { ingredients: [] },
      '/categories': { categories: [] },
      '/coupons': { coupons: [] },
      '/billing/invoices': { invoices: [] },
      '/banners': [],
      '/employees': [],
    };
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(responses[pathname] ?? {}),
    });
  });

  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem(
      'user',
      JSON.stringify({ id: 9, name: 'Admin Teste', role: 'ADMIN', restaurantId: 9 }),
    );
  });
  await mockAuthRefresh(page, 9, 'e2e-admin-token');
}

test('Home respeita a agenda fechada sem mostrar estado aberto contraditório', async ({ page }) => {
  await mockClosedStorefront(page);
  await page.goto('/restaurante-teste');

  const closedStatus = page.getByRole('status', { name: /^Fechado agora(?:\.|$)/i });
  await expect(closedStatus).toBeVisible();
  await expect(page.getByText('Fechado agora', { exact: true })).toHaveCount(1);
  await expect(page.getByRole('status', { name: /^Aberto/i })).toHaveCount(0);
  await expect(page.getByText('Aberto agora', { exact: true })).toHaveCount(0);
});

test('admin configura os sete dias e alterna entre pausa manual e agenda', async ({ page }) => {
  const state: AdminApiState = { savedPayload: null };
  await mockAdminApi(page, state);
  await page.goto('/admin');

  await page.getByRole('button', { name: 'Configurações' }).click();
  await page.getByRole('button', { name: 'Horários', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Horários e recebimento de pedidos' }),
  ).toBeVisible();

  const mondayOpen = page.getByRole('switch', { name: 'Segunda-feira: aberto' });
  await expect(mondayOpen).toBeChecked();
  await mondayOpen.click();

  const mondayClosed = page.getByRole('switch', { name: 'Segunda-feira: fechado' });
  await expect(mondayClosed).not.toBeChecked();
  await mondayClosed.click();

  await page.getByLabel('Segunda-feira: horário de abertura').fill('18:00');
  await page.getByLabel('Segunda-feira: horário de fechamento').fill('02:00');

  const pauseButton = page.getByRole('button', { name: 'Pausar pedidos' });
  await pauseButton.click();
  await expect(pauseButton).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Pedidos pausados manualmente')).toBeVisible();

  const followScheduleButton = page.getByRole('button', { name: 'Seguir agenda' });
  await followScheduleButton.click();
  await expect(followScheduleButton).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect.poll(() => state.savedPayload).not.toBeNull();

  const savedPayload = state.savedPayload;
  if (!savedPayload) throw new Error('O payload de horários não foi enviado.');

  const businessHours = savedPayload.businessHours as BusinessHour[];
  expect(businessHours).toHaveLength(7);
  expect(businessHours.map((day) => day.id)).toEqual(dayLabels.map(([id]) => id));
  expect(businessHours.find((day) => day.id === 'monday')).toMatchObject({
    enabled: true,
    openingTime: '18:00',
    closingTime: '02:00',
  });
  expect(savedPayload.isOpenForOrders).toBe(true);
});

test('status de funcionamento permanece visível e sem overflow horizontal no celular', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockClosedStorefront(page);
  await page.goto('/restaurante-teste');

  const closedStatus = page.getByRole('status', { name: /^Fechado agora(?:\.|$)/i });
  await expect(closedStatus).toBeVisible();

  const layout = await closedStatus.evaluate((element) => {
    const statusRect = element.getBoundingClientRect();
    const root = document.documentElement;
    return {
      clientWidth: root.clientWidth,
      documentWidth: root.scrollWidth,
      bodyWidth: document.body.scrollWidth,
      statusLeft: statusRect.left,
      statusRight: statusRect.right,
      statusWidth: statusRect.width,
    };
  });

  expect(layout.documentWidth).toBeLessThanOrEqual(layout.clientWidth + 1);
  expect(layout.bodyWidth).toBeLessThanOrEqual(layout.clientWidth + 1);
  expect(layout.statusWidth).toBeGreaterThan(0);
  expect(layout.statusLeft).toBeGreaterThanOrEqual(-1);
  expect(layout.statusRight).toBeLessThanOrEqual(layout.clientWidth + 1);
});
