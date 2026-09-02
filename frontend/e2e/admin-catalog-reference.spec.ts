import { expect, test, type Page } from '@playwright/test';

import { mockAuthRefresh } from './helpers/mockAuthRefresh';

const PRODUCT_IMAGE = '/e2e/fixtures/readme/pizza-calabresa.jpg';

const products = [
  ['1', 'Pizza Calabresa', 49.9, 'Pizzas', 'BUILDABLE'],
  ['2', 'Macarrão à Bolonhesa', 32.9, 'Massas', 'COMPLETE'],
  ['3', 'X-Bacon', 28.9, 'Sanduíches', 'BUILDABLE'],
  ['4', 'Coca-Cola 350ml', 7.5, 'Bebidas', 'COMPLETE'],
  ['5', 'Açaí Especial', 24.9, 'Sobremesas', 'COMPLETE'],
].map(([id, name, price, category, saleMode], index) => ({
  id,
  name,
  price,
  saleMode,
  active: true,
  stock: null,
  image: PRODUCT_IMAGE,
  categoryId: index + 1,
  category: { id: index + 1, name: category },
  configurationVersion: 1,
  optionGroups:
    index === 0
      ? [
          {
            id: 100,
            name: 'Massa',
            required: true,
            selectionType: 'SINGLE',
            minSelections: 1,
            maxSelections: 1,
            options: [{ id: 1001, ingredientId: 7, active: true }],
          },
          {
            id: 101,
            name: 'Adicionais',
            required: false,
            selectionType: 'MULTIPLE',
            minSelections: 0,
            maxSelections: 3,
            options: [
              { id: 1002, ingredientId: 1, active: true },
              { id: 1003, ingredientId: 2, active: true },
            ],
          },
        ]
      : [],
}));

const ingredients = [
  {
    id: 1,
    name: 'Bacon',
    category: 'Proteínas',
    price: 5,
    active: true,
    image: PRODUCT_IMAGE,
  },
  { id: 2, name: 'Catupiry', category: 'Laticínios', price: 6, active: true, image: null },
  { id: 3, name: 'Molho especial', category: 'Molhos', price: 3, active: true, image: null },
  { id: 4, name: 'Queijo extra', category: 'Laticínios', price: 4, active: true, image: null },
  { id: 5, name: 'Presunto', category: 'Proteínas', price: 4, active: true, image: null },
  { id: 6, name: 'Requeijão', category: 'Laticínios', price: 4.5, active: true, image: null },
  { id: 7, name: 'Massa fina', category: 'Massas', price: 0, active: true, image: null },
];

async function mockCatalog(page: Page) {
  await page.route(/^http:\/\/(127\.0\.0\.1|localhost):3000\/.*$/, async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;

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

    if (pathname === '/menu-import/ifood' && request.method() === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          restaurantName: 'North Pizza',
          sourceUrl: 'https://www.ifood.com.br/delivery/north-pizza',
          categoriesCreated: 2,
          productsCreated: 2,
          createdCategories: [
            { id: 20, name: 'Pizzas' },
            { id: 21, name: 'Bebidas' },
          ],
          createdProducts: [
            { id: 30, name: 'Pizza Portuguesa' },
            { id: 31, name: 'Suco de laranja' },
          ],
        }),
      });
      return;
    }

    const responses: Record<string, unknown> = {
      '/platform/status': { available: true, maintenanceMode: false, maintenanceMessage: '' },
      '/products': { products },
      '/ingredients': {
        ingredients,
        count: ingredients.length,
        categories: ['Proteínas', 'Laticínios', 'Molhos', 'Massas'],
      },
      '/categories': {
        categories: ['Pizzas', 'Massas', 'Sanduíches', 'Bebidas', 'Sobremesas'].map(
          (name, index) => ({ id: index + 1, name, active: true }),
        ),
      },
      '/orders': { orders: [] },
      '/settings': {
        id: 1,
        primaryColor: '#f0440b',
        restaurant: { id: 9, name: 'North Pizza' },
      },
      '/billing/invoices': { invoices: [] },
      '/promotions/coupons': { coupons: [] },
      '/table-account/settings': {},
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
  await mockAuthRefresh(page, 9, 'catalog-reference-token');
}

test('Cardápio e importação seguem a composição visual de referência no desktop', async ({
  page,
}, testInfo) => {
  await mockCatalog(page);
  await page.setViewportSize({ width: 1365, height: 768 });
  await page.goto('/admin');
  await page.getByRole('button', { name: 'Cardápio' }).click();

  await expect(page.getByRole('heading', { name: 'Cardápio' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Importar cardápio' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Novo produto' })).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Categorias', exact: true })).toBeVisible();

  const productCards = page.locator('article').filter({ has: page.locator('.product-mode') });
  await expect(productCards).toHaveCount(5);
  const firstProductBox = await productCards.first().boundingBox();
  const lastProductBox = await productCards.last().boundingBox();
  expect(firstProductBox).not.toBeNull();
  expect(lastProductBox).not.toBeNull();
  expect(Math.abs(Number(firstProductBox?.y) - Number(lastProductBox?.y))).toBeLessThan(2);
  await page.screenshot({ path: testInfo.outputPath('catalog-products.png'), fullPage: true });

  await page.getByRole('button', { name: 'Ingredientes (7)' }).click();
  await expect(page.getByText('Como funciona?')).toBeVisible();
  await expect(page.locator('.ingredient-list article')).toHaveCount(7);
  const firstIngredientBox = await page.locator('.ingredient-list article').first().boundingBox();
  const secondIngredientBox = await page.locator('.ingredient-list article').nth(1).boundingBox();
  expect(firstIngredientBox).not.toBeNull();
  expect(secondIngredientBox).not.toBeNull();
  expect(Math.abs(Number(firstIngredientBox?.y) - Number(secondIngredientBox?.y))).toBeLessThan(2);
  await page.screenshot({ path: testInfo.outputPath('catalog-ingredients.png'), fullPage: true });

  await page.getByRole('button', { name: 'Novo ingrediente' }).click();
  const ingredientWizard = page.locator('[data-ingredient-wizard]');
  await expect(ingredientWizard.getByText('Ingrediente pronto para ser reutilizado')).toBeVisible();
  await ingredientWizard.evaluate(async (element) => {
    await Promise.all(
      element
        .getAnimations({ subtree: true })
        .map((animation) => animation.finished.catch(() => undefined)),
    );
  });
  const wizardDialog = ingredientWizard.locator('form');
  await expect(wizardDialog).toHaveCSS('background-color', 'rgb(251, 250, 248)');
  await expect(wizardDialog).toHaveCSS('opacity', '1');
  const wizardBox = await wizardDialog.boundingBox();
  expect(Number(wizardBox?.width)).toBeGreaterThan(900);
  await page.screenshot({ path: testInfo.outputPath('ingredient-wizard.png') });
  await ingredientWizard.getByRole('button', { name: 'Fechar cadastro de ingrediente' }).click();

  await page.getByRole('button', { name: 'Produtos', exact: true }).click();
  await productCards.first().getByRole('button', { name: 'Opções de Pizza Calabresa' }).click();
  await page.getByRole('button', { name: 'Editar produto' }).click();
  const productEditor = page.getByRole('dialog', { name: 'Editar produto' });
  for (let step = 0; step < 4; step += 1) {
    await productEditor.getByRole('button', { name: 'Continuar', exact: true }).click();
  }
  await expect(
    productEditor.getByRole('heading', { name: 'Como o cliente poderá personalizar?' }),
  ).toBeVisible();
  await productEditor.evaluate(async (element) => {
    await Promise.all(
      element
        .getAnimations({ subtree: true })
        .map((animation) => animation.finished.catch(() => undefined)),
    );
  });
  await page.screenshot({ path: testInfo.outputPath('product-customization.png') });
  await productEditor.getByRole('button', { name: 'Fechar cadastro' }).click();

  await page.getByRole('button', { name: 'Importar cardápio' }).click();
  await expect(page.getByRole('heading', { name: 'Importar cardápio' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Importação de cardápio' })).toBeVisible();
  await page
    .getByRole('textbox', { name: 'Link público do restaurante no iFood' })
    .fill('https://www.ifood.com.br/delivery/north-pizza');
  await page.getByRole('button', { name: 'Analisar e importar' }).click();
  await expect(page.getByText('Cardápio importado com sucesso')).toBeVisible();
  await expect(page.getByText('Pizza Portuguesa')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('catalog-import.png'), fullPage: true });

  const documentWidth = await page.locator('body').evaluate((body) => ({
    clientWidth: body.clientWidth,
    scrollWidth: body.scrollWidth,
  }));
  expect(documentWidth.scrollWidth).toBeLessThanOrEqual(documentWidth.clientWidth);
});

test('Cardápio, ingredientes e importação permanecem contidos em 320 px', async ({ page }) => {
  await mockCatalog(page);
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto('/admin');
  await page.getByRole('button', { name: 'Abrir menu administrativo' }).click();
  await page.getByRole('button', { name: 'Cardápio' }).click();

  await page.getByRole('button', { name: 'Ingredientes (7)' }).click();
  await expect(page.locator('.ingredient-list article')).toHaveCount(7);
  await expect(page.getByRole('button', { name: 'Novo ingrediente' })).toBeVisible();

  await page.getByRole('button', { name: 'Importar cardápio' }).click();
  await page.getByRole('tab', { name: 'Foto do cardápio' }).click();
  await expect(page.getByText('Arraste ou selecione uma foto')).toBeVisible();

  const documentWidth = await page.locator('body').evaluate((body) => ({
    clientWidth: body.clientWidth,
    scrollWidth: body.scrollWidth,
  }));
  expect(documentWidth.scrollWidth).toBeLessThanOrEqual(documentWidth.clientWidth);
});
