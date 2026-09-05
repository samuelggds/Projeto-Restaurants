import { expect, test, type Page, type Route } from '@playwright/test';
import { mockAuthRefresh } from './helpers/mockAuthRefresh';

const RESTAURANT_ID = 47;
const RESTAURANT_SLUG = 'pizzaria-horizonte';
const ATTENDANT_TOKEN = 'e2e-attendant-token';

const attendantUser = {
  id: 94,
  name: 'Marina Atendente',
  email: 'marina@restaurante.test',
  role: 'FUNCIONARIO',
  subRole: 'ATENDENTE',
  restaurantId: RESTAURANT_ID,
};

function minutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

function workspaceSnapshot() {
  return {
    generatedAt: new Date().toISOString(),
    orders: [
      {
        id: 'order-public-101',
        code: '#101',
        type: 'MESA',
        status: 'PRONTO',
        tableNumber: 8,
        customerName: 'Carla',
        createdAt: minutesAgo(18),
        readyAt: minutesAgo(7),
        items: [
          { quantity: 2, productName: 'Pizza da casa' },
          { quantity: 1, productName: 'Suco de laranja' },
        ],
      },
      {
        id: 'order-public-102',
        code: '#102',
        type: 'DELIVERY',
        status: 'PENDENTE',
        tableNumber: null,
        customerName: 'Rui',
        createdAt: minutesAgo(3),
        readyAt: null,
        items: [{ quantity: 1, productName: 'Calzone especial' }],
      },
      {
        id: 'order-public-103',
        code: '#103',
        type: 'RETIRADA',
        status: 'PREPARANDO',
        tableNumber: null,
        customerName: 'Bianca',
        createdAt: minutesAgo(11),
        readyAt: null,
        items: [{ quantity: 1, productName: 'Combo família' }],
      },
    ],
    calls: [
      {
        id: 'call-71',
        tableNumber: 8,
        type: 'BILL',
        status: 'WAITING',
        assignedToName: null,
        requestedAt: minutesAgo(9),
        assignedAt: null,
        resolvedAt: null,
      },
      {
        id: 'call-72',
        tableNumber: 12,
        type: 'WAITER',
        status: 'IN_PROGRESS',
        assignedToName: 'Carlos Garçom',
        requestedAt: minutesAgo(4),
        assignedAt: minutesAgo(3),
        resolvedAt: null,
      },
      {
        id: 'call-73',
        tableNumber: 3,
        type: 'WAITER',
        status: 'RESOLVED',
        assignedToName: 'João Garçom',
        requestedAt: minutesAgo(40),
        assignedAt: minutesAgo(39),
        resolvedAt: minutesAgo(34),
      },
    ],
    tables: [
      {
        id: '8',
        tableNumber: 8,
        status: 'CLOSING_REQUESTED',
        openedAt: minutesAgo(92),
        participantCount: 4,
        activeOrderCount: 1,
        activeCallCount: 1,
      },
      {
        id: '12',
        tableNumber: 12,
        status: 'OPEN',
        openedAt: minutesAgo(48),
        participantCount: 2,
        activeOrderCount: 0,
        activeCallCount: 1,
      },
      {
        id: '15',
        tableNumber: 15,
        status: 'OPEN',
        openedAt: minutesAgo(21),
        participantCount: 3,
        activeOrderCount: 2,
        activeCallCount: 0,
      },
    ],
  };
}

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

async function mockAttendantApi(page: Page, user = attendantUser) {
  await page.route(/^http:\/\/(127\.0\.0\.1|localhost):3000\/.*$/, async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;

    if (pathname.startsWith('/socket.io')) return route.abort();
    if (pathname === '/auth/me') return json(route, { user });
    if (pathname === `/settings/public/${RESTAURANT_ID}`) {
      return json(route, {
        primaryColor: '#e16a3d',
        restaurant: {
          id: RESTAURANT_ID,
          name: 'Pizzaria Horizonte',
          slug: RESTAURANT_SLUG,
        },
      });
    }
    if (pathname === '/attendant/workspace') return json(route, workspaceSnapshot());
    if (pathname === '/auth/logout') return json(route, { ok: true });

    return json(route, {});
  });

  await mockAuthRefresh(page, user.id, ATTENDANT_TOKEN);
  await page.addInitScript((sessionUser) => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('user', JSON.stringify(sessionUser));
  }, user);
}

function desktopNavigation(page: Page) {
  return page.getByRole('navigation', { name: 'Navegação do atendente' });
}

test('atendente acompanha prioridades e filtra a operação sem executar mutações', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await mockAttendantApi(page);
  await page.goto('/attendant');

  await expect(page.getByRole('heading', { name: 'Visão geral' })).toBeVisible();
  await expect(page.getByText('Pizzaria Horizonte')).toBeVisible();
  await expect(page.locator('article').filter({ hasText: 'Pedidos ativos' })).toContainText('3');
  await expect(page.locator('article').filter({ hasText: 'Chamados abertos' })).toContainText('2');
  await expect(page.getByText('#101 · Mesa 8')).toBeVisible();
  await expect(page.getByText('Fechamento de conta').first()).toBeVisible();
  await expect(page.getByText('Conta solicitada')).toBeVisible();
  await expect(
    page.getByRole('button', { name: /atender|concluir|cobrar|alterar status/iu }),
  ).toHaveCount(0);

  await desktopNavigation(page).getByRole('button', { name: 'Pedidos' }).click();
  await page.getByLabel('Buscar pedidos').fill('delivery');
  await expect(page.getByText('#102')).toBeVisible();
  await expect(page.getByText('#101')).toHaveCount(0);
  await page.getByLabel('Buscar pedidos').fill('');
  await page.getByRole('button', { name: 'Prontos' }).click();
  await expect(page.getByText('#101')).toBeVisible();
  await expect(page.getByText('#102')).toHaveCount(0);

  await desktopNavigation(page)
    .getByRole('button', { name: /Chamados/ })
    .click();
  await expect(page.getByText('Mesa 08')).toBeVisible();
  await page.getByRole('button', { name: 'Resolvidos hoje' }).click();
  await expect(page.getByText('Mesa 03')).toBeVisible();
  await expect(page.getByText(/Responsável: João Garçom/)).toBeVisible();

  await desktopNavigation(page).getByRole('button', { name: 'Visão geral' }).click();
  await page.screenshot({ path: testInfo.outputPath('attendant-desktop.png'), fullPage: true });
});

test('workspace mantém navegação e medidas estáveis no celular', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockAttendantApi(page);
  await page.goto('/attendant');

  const mobileNavigation = page.getByRole('navigation', {
    name: 'Navegação móvel do atendente',
  });
  await expect(mobileNavigation).toBeVisible();

  for (const destination of ['Pedidos', 'Mesas', 'Chamados', 'Visão geral']) {
    await mobileNavigation.getByRole('button', { name: destination }).click();
    await expect(page.getByRole('heading', { name: destination, exact: true })).toBeVisible();
    const dimensions = await page.evaluate(() => ({
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
    }));
    expect(
      dimensions.documentWidth - dimensions.viewportWidth,
      `${destination}: overflow`,
    ).toBeLessThanOrEqual(1);
  }

  const topbar = page.locator('header').first();
  const firstMetric = page.locator('article').filter({ hasText: 'Pedidos ativos' }).first();
  const [topbarBox, metricBox] = await Promise.all([
    topbar.boundingBox(),
    firstMetric.boundingBox(),
  ]);
  expect(topbarBox).not.toBeNull();
  expect(metricBox).not.toBeNull();
  if (topbarBox && metricBox)
    expect(metricBox.y).toBeGreaterThanOrEqual(topbarBox.y + topbarBox.height);

  await page.screenshot({ path: testInfo.outputPath('attendant-mobile.png'), fullPage: true });
});

test('ADMIN não entra na rota exclusiva do atendente', async ({ page }) => {
  const adminUser = {
    id: 12,
    name: 'Administrador',
    email: 'admin@restaurante.test',
    role: 'ADMIN',
    subRole: null,
    restaurantId: RESTAURANT_ID,
  };
  await mockAttendantApi(page, adminUser);
  await page.goto('/attendant');

  await expect(page).toHaveURL(/\/admin(?:\?.*)?$/u);
});

test('logout do atendente retorna ao portal da equipe sem preservar a rota operacional', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await mockAttendantApi(page);
  await page.goto('/attendant');
  await expect(page.getByRole('heading', { name: 'Visão geral' })).toBeVisible();

  await page.getByRole('button', { name: 'Sair da área do atendente' }).first().click();

  await expect(page).toHaveURL(new RegExp(`/${RESTAURANT_SLUG}/team$`, 'u'));
  await expect(page.getByRole('heading', { name: 'Acesso da equipe' })).toBeVisible();
  expect(new URL(page.url()).searchParams.has('next')).toBe(false);
});