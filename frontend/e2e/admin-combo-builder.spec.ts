import { expect, test, type Page, type Route } from '@playwright/test';
import { mockAuthRefresh } from './helpers/mockAuthRefresh';

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

const catalogProducts = [
  {
    id: 11,
    name: 'X-Bacon',
    description: 'Hambúrguer com bacon.',
    price: 28.9,
    active: true,
    stock: null,
    kind: 'STANDARD',
    saleMode: 'COMPLETE',
    categoryId: 1,
    category: { id: 1, name: 'Hambúrgueres' },
    optionGroups: [],
  },
  {
    id: 12,
    name: 'X-Salada',
    description: 'Hambúrguer com salada.',
    price: 26.9,
    active: true,
    stock: null,
    kind: 'STANDARD',
    saleMode: 'COMPLETE',
    categoryId: 1,
    category: { id: 1, name: 'Hambúrgueres' },
    optionGroups: [],
  },
  {
    id: 13,
    name: 'Batata média',
    description: 'Batata frita crocante.',
    price: 14.9,
    active: true,
    stock: null,
    kind: 'STANDARD',
    saleMode: 'COMPLETE',
    categoryId: 2,
    category: { id: 2, name: 'Acompanhamentos' },
    optionGroups: [],
  },
  {
    id: 14,
    name: 'Coca-Cola lata',
    description: '350 ml.',
    price: 7.5,
    active: true,
    stock: null,
    kind: 'STANDARD',
    saleMode: 'COMPLETE',
    categoryId: 3,
    category: { id: 3, name: 'Bebidas' },
    optionGroups: [],
  },
];

async function mockAdminComboCatalog(page: Page) {
  await page.route(/^http:\/\/(127\.0\.0\.1|localhost):3000\/.*$/, async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;

    if (pathname === '/auth/me') {
      return json(route, {
        user: { id: 9, name: 'Admin Teste', role: 'ADMIN', restaurantId: 9 },
      });
    }
    if (pathname === '/platform/status') {
      return json(route, { available: true, maintenanceMode: false, maintenanceMessage: '' });
    }
    if (pathname === '/products') return json(route, { products: catalogProducts });
    if (pathname === '/product-combos' && request.method() === 'GET') {
      return json(route, { combos: [] });
    }
    if (pathname === '/categories') {
      return json(route, {
        categories: [
          { id: 1, name: 'Hambúrgueres', active: true },
          { id: 2, name: 'Acompanhamentos', active: true },
          { id: 3, name: 'Bebidas', active: true },
        ],
      });
    }
    if (pathname === '/ingredients') return json(route, { ingredients: [], count: 0, categories: [] });
    if (pathname === '/settings') {
      return json(route, {
        id: 1,
        primaryColor: '#f0440b',
        restaurant: { id: 9, name: 'North Pizza' },
      });
    }
    if (pathname === '/orders') return json(route, { orders: [] });
    if (pathname === '/billing/invoices') return json(route, { invoices: [] });
    if (pathname === '/promotions/coupons') return json(route, { coupons: [] });
    if (pathname === '/table-account/settings') return json(route, {});
    if (pathname === '/banners') return json(route, []);
    if (pathname === '/employees') return json(route, []);

    return json(route, {});
  });

  await mockAuthRefresh(page, 9, 'admin-combo-token');
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem(
      'user',
      JSON.stringify({ id: 9, name: 'Admin Teste', role: 'ADMIN', restaurantId: 9 }),
    );
  });
}

test('admin monta combo por etapas e envia as escolhas configuradas', async ({ page }) => {
  await mockAdminComboCatalog(page);

  let saved: Record<string, unknown> | undefined;
  await page.route('**/product-combos', async (route) => {
    const request = route.request();
    if (request.method() === 'GET') return json(route, { combos: [] });
    if (request.method() !== 'POST') return route.fallback();

    saved = request.postDataJSON() as Record<string, unknown>;
    return json(
      route,
      {
        combo: {
          id: 90,
          kind: 'COMBO',
          configurationVersion: 1,
          ...(saved || {}),
          comboGroups: [],
        },
      },
      201,
    );
  });

  await page.setViewportSize({ width: 1365, height: 900 });
  await page.goto('/admin');
  await page.getByRole('button', { name: 'Cardápio', exact: true }).click();
  await page.getByRole('button', { name: 'Combos', exact: true }).click();
  await page.getByRole('button', { name: 'Novo combo', exact: true }).click();

  const editor = page.getByRole('dialog');
  await editor.getByLabel('Nome do combo').fill('Combo Duplo');
  await editor.getByLabel('Preço final do combo').fill('59.90');

  await editor.getByLabel('Nome da etapa 1').fill('Hambúrgueres');
  await editor.getByLabel('Quantidade da etapa 1').fill('2');
  await editor.getByLabel('Adicionar produto na etapa 1').selectOption('11');
  await editor.getByRole('button', { name: 'Adicionar produto à etapa 1' }).click();
  await editor.getByLabel('Adicionar produto na etapa 1').selectOption('12');
  await editor.getByRole('button', { name: 'Adicionar produto à etapa 1' }).click();

  await editor.getByRole('button', { name: 'Adicionar etapa' }).click();
  await editor.getByLabel('Nome da etapa 2').fill('Batata');
  await editor.getByLabel('Adicionar produto na etapa 2').selectOption('13');
  await editor.getByRole('button', { name: 'Adicionar produto à etapa 2' }).click();

  await editor.getByRole('button', { name: 'Adicionar etapa' }).click();
  await editor.getByLabel('Nome da etapa 3').fill('Bebida');
  await editor.getByLabel('Adicionar produto na etapa 3').selectOption('14');
  await editor.getByRole('button', { name: 'Adicionar produto à etapa 3' }).click();

  await expect(editor.getByText('Cliente deverá escolher 2 itens entre 2 opções.')).toBeVisible();
  await expect(editor.getByText('Cliente deverá escolher 1 item entre 1 opção.')).toHaveCount(2);

  await editor.getByRole('button', { name: 'Salvar combo' }).click();

  await expect.poll(() => saved).toBeTruthy();
  expect(saved).toMatchObject({
    name: 'Combo Duplo',
    price: 59.9,
    groups: [
      {
        name: 'Hambúrgueres',
        minSelections: 2,
        maxSelections: 2,
        options: [
          { componentProductId: 11, locked: false, defaultQuantity: 0 },
          { componentProductId: 12, locked: false, defaultQuantity: 0 },
        ],
      },
      {
        name: 'Batata',
        minSelections: 1,
        maxSelections: 1,
        options: [{ componentProductId: 13, locked: true, defaultQuantity: 1 }],
      },
      {
        name: 'Bebida',
        minSelections: 1,
        maxSelections: 1,
        options: [{ componentProductId: 14, locked: true, defaultQuantity: 1 }],
      },
    ],
  });
});
