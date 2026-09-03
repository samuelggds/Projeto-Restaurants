import { expect, test, type Page } from '@playwright/test';

import { mockAuthRefresh } from './helpers/mockAuthRefresh';

const RESTAURANT_ID = 9;
const API = /^http:\/\/(127\.0\.0\.1|localhost):3000\/.*$/;

const orders = [
  {
    id: 901,
    restaurantId: RESTAURANT_ID,
    userId: 31,
    user: { id: 31, name: 'Ana Cliente', email: 'ana@cliente.test' },
    status: 'ENTREGUE',
    total: 54.9,
    paid: true,
    type: 'DELIVERY',
    createdAt: '2026-09-03T12:00:00.000Z',
  },
  {
    id: 902,
    restaurantId: RESTAURANT_ID,
    userId: 31,
    user: { id: 31, name: 'Ana Cliente', email: 'ana@cliente.test' },
    status: 'ENTREGUE',
    total: 25,
    paid: true,
    type: 'PICKUP',
    createdAt: '2026-09-02T12:00:00.000Z',
  },
  {
    id: 903,
    restaurantId: RESTAURANT_ID,
    userId: 32,
    user: { id: 32, name: 'Bruno Cliente', email: 'bruno@cliente.test' },
    status: 'PRONTO',
    total: 102,
    paid: true,
    type: 'TABLE',
    createdAt: '2026-09-03T13:00:00.000Z',
  },
];

const employees = [
  {
    id: 71,
    name: 'Carla Cozinha',
    email: 'carla@restaurante.test',
    phone: '85999990001',
    role: 'FUNCIONARIO',
    subRole: 'COZINHA',
    active: true,
  },
  {
    id: 72,
    name: 'Diego Entrega',
    email: 'diego@restaurante.test',
    phone: '85999990002',
    role: 'MOTOQUEIRO',
    subRole: null,
    active: false,
  },
];

async function mockAdminApi(page: Page) {
  await page.route(API, async (route) => {
    const pathname = new URL(route.request().url()).pathname;

    if (pathname === '/auth/me') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: 9, name: 'Admin Teste', role: 'ADMIN', restaurantId: RESTAURANT_ID },
        }),
      });
      return;
    }

    const responses: Record<string, unknown> = {
      '/orders': { orders },
      '/products': { products: [] },
      '/ingredients': { ingredients: [] },
      '/categories': { categories: [] },
      '/coupons': { coupons: [] },
      '/settings': {
        id: 1,
        restaurant: { id: RESTAURANT_ID, name: 'Restaurante Teste' },
      },
      '/billing/invoices': { invoices: [] },
      '/banners': [],
      '/employees': employees,
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
    localStorage.setItem(
      'user',
      JSON.stringify({ id: 9, name: 'Admin Teste', role: 'ADMIN', restaurantId: 9 }),
    );
  });
  await mockAuthRefresh(page, RESTAURANT_ID, 'e2e-admin-token');
}

async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.documentWidth - dimensions.viewportWidth).toBeLessThanOrEqual(1);
}

test.beforeEach(async ({ page }) => {
  await mockAdminApi(page);
  await page.goto('/admin');
});

test('clientes apresenta indicadores, busca e cards retangulares em desktop e mobile', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.getByRole('button', { name: 'Clientes', exact: true }).click();

  await expect(
    page.getByRole('heading', { name: 'Conheça quem movimenta seu restaurante' }),
  ).toBeVisible();
  await expect(page.getByText('1 cliente recorrente', { exact: true })).toBeVisible();
  await expect(page.getByText('R$ 181,90', { exact: true })).toBeVisible();
  await expect(page.locator('section[aria-labelledby="customers-hero-title"]')).toHaveCSS(
    'border-radius',
    '8px',
  );
  await expect(
    page.locator('section[aria-label="Indicadores dos clientes"] article').first(),
  ).toHaveCSS('border-radius', '8px');
  await expect(page.locator('section[aria-labelledby="customers-directory-title"]')).toHaveCSS(
    'border-radius',
    '8px',
  );

  const customerList = page.getByLabel('Lista de clientes');
  await expect(customerList.locator('article')).toHaveCount(2);
  await page.getByLabel('Buscar cliente por nome ou e-mail').fill('ana@cliente.test');
  await expect(customerList.locator('article')).toHaveCount(1);
  await expect(customerList).toContainText('Ana Cliente');
  await expect(customerList).toContainText('2');
  await expectNoHorizontalOverflow(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole('navigation', { name: 'Navegação administrativa móvel' }),
  ).toBeVisible();
  await expect(page.getByLabel('Buscar cliente por nome ou e-mail')).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test('funcionários mantém cargo e status legíveis, com filtros e ações acessíveis no mobile', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.getByRole('button', { name: 'Funcionários', exact: true }).click();

  await expect(
    page.getByRole('heading', { name: 'Sua equipe pronta para cada etapa da operação' }),
  ).toBeVisible();
  await expect(page.getByText('1 com acesso ativo', { exact: true })).toBeVisible();
  await expect(page.locator('section[aria-labelledby="employees-hero-title"]')).toHaveCSS(
    'border-radius',
    '8px',
  );
  await expect(page.locator('section[aria-labelledby="employees-directory-title"]')).toHaveCSS(
    'border-radius',
    '8px',
  );

  const employeeList = page.getByLabel('Lista de funcionários');
  await expect(employeeList.locator('article')).toHaveCount(2);
  await page.getByLabel('Filtrar funcionários por status').selectOption('INACTIVE');
  await expect(employeeList.locator('article')).toHaveCount(1);
  await expect(employeeList).toContainText('Diego Entrega');
  await expect(employeeList).toContainText('Motoqueiro');
  await expect(employeeList).toContainText('Acesso inativo');
  await expect(page.getByRole('button', { name: 'Editar Diego Entrega' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reativar Diego Entrega' })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(employeeList).toContainText('Motoqueiro');
  await expect(employeeList).toContainText('Acesso inativo');
  await expect(page.getByRole('button', { name: 'Reativar Diego Entrega' })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
