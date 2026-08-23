import { expect, test } from '@playwright/test';

test('admin separa ingredientes em categorias dinâmicas e configura cada grupo', async ({ page }) => {
  const ingredients = [
    { id: 1, name: 'Massa fina', category: 'Massas', price: 0, active: true },
    { id: 2, name: 'Massa grossa', category: 'Massas', price: 2, active: true },
    { id: 3, name: 'Bacon', category: 'Adicionais', price: 5, active: true },
    { id: 4, name: 'Molho branco', category: 'Molhos', price: 3, active: true },
  ];
  let product = {
    id: 101,
    name: 'Produto artesanal',
    description: 'Monte exatamente como preferir.',
    price: 30,
    active: true,
    stock: null,
    categoryId: 10,
    category: { id: 10, name: 'Principais' },
    optionGroups: [
      {
        id: 10,
        name: 'Escolha a massa',
        description: 'Selecione uma massa.',
        required: true,
        selectionType: 'SINGLE',
        minSelections: 1,
        maxSelections: 1,
        options: [
          { id: 1001, ingredientId: 1, active: true },
          { id: 1002, ingredientId: 2, active: true },
        ],
      },
      {
        id: 20,
        name: 'Adicionais',
        description: 'Escolha se desejar.',
        required: false,
        selectionType: 'MULTIPLE',
        minSelections: 0,
        maxSelections: 1,
        options: [{ id: 2001, ingredientId: 3, active: true }],
      },
    ],
  };
  let savedPayload: Record<string, unknown> | null = null;

  await page.route(/^http:\/\/(127\.0\.0\.1|localhost):3000\/.*$/, async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;

    if (pathname === '/auth/me') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: { id: 9, name: 'Admin Teste', role: 'ADMIN', restaurantId: 9 } }),
      });
      return;
    }
    if (pathname === '/billing/invoices') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"invoices":[]}' });
      return;
    }
    if (pathname === '/products' && request.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ products: [product] }),
      });
      return;
    }
    if (pathname === '/products/101' && request.method() === 'PUT') {
      savedPayload = request.postDataJSON() as Record<string, unknown>;
      product = {
        ...product,
        ...savedPayload,
        category: { id: 10, name: 'Principais' },
        optionGroups: (savedPayload.optionGroups as typeof product.optionGroups).map(
          (group, groupIndex) => ({
            ...group,
            id: group.id || 100 + groupIndex,
            options: group.options.map((option, optionIndex) => ({
              ...option,
              id: option.id || 5000 + groupIndex * 100 + optionIndex,
            })),
          }),
        ),
      };
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(product) });
      return;
    }
    if (pathname === '/ingredients') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ingredients, count: ingredients.length, categories: ['Adicionais', 'Massas', 'Molhos'] }),
      });
      return;
    }
    if (pathname === '/categories') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"categories":[{"id":10,"name":"Principais","active":true}]}' });
      return;
    }
    if (pathname === '/orders') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"orders":[]}' });
      return;
    }
    if (pathname === '/settings') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"id":1,"restaurant":{"id":9,"name":"Restaurante Teste"}}' });
      return;
    }
    if (pathname === '/banners' || pathname === '/employees') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });

  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('token', 'e2e-admin-token');
    localStorage.setItem(
      'user',
      JSON.stringify({ id: 9, name: 'Admin Teste', role: 'ADMIN', restaurantId: 9 }),
    );
  });
  await page.goto('/admin');

  await page.getByRole('button', { name: 'Cardápio' }).click();
  await page.getByRole('button', { name: /Ingredientes \(4\)/ }).click();
  const categoryHeadings = page.locator('.ingredient-category-heading > b');
  await expect(categoryHeadings).toHaveText(['Adicionais', 'Massas', 'Molhos']);

  await page.getByRole('button', { name: 'Produtos', exact: true }).click();
  await page.getByRole('button', { name: 'Opções de Produto artesanal' }).click();
  await page.getByRole('button', { name: 'Editar produto' }).click();

  const drawer = page.locator('form').filter({
    has: page.getByRole('heading', { name: 'Editar produto' }),
  });
  const dialog = page.getByRole('dialog', { name: 'Editar produto' });
  await expect(dialog).toBeVisible();
  await expect(drawer.getByRole('heading', { name: 'Apresente o produto' })).toBeVisible();
  await expect(
    drawer.getByRole('heading', { name: 'Organize a montagem do cliente' }),
  ).toBeVisible();
  await expect(drawer.getByText('Resumo da experiência do cliente')).toBeVisible();
  const sourceCategories = drawer.getByLabel('Categoria-fonte dos ingredientes');
  await expect(sourceCategories.nth(0)).toHaveValue('Massas');
  await expect(sourceCategories.nth(1)).toHaveValue('Adicionais');

  const groupCards = drawer.locator('article');
  await expect(groupCards.nth(0).getByText('Massa fina', { exact: true })).toBeVisible();
  await expect(groupCards.nth(0).getByText('Bacon', { exact: true })).toHaveCount(0);
  await expect(groupCards.nth(1).getByText('Bacon', { exact: true })).toBeVisible();
  await expect(groupCards.nth(1).getByText('Massa fina', { exact: true })).toHaveCount(0);

  await drawer.getByRole('button', { name: 'Adicionar categoria' }).click();
  await expect(sourceCategories.nth(2)).toHaveValue('');
  await sourceCategories.nth(2).selectOption('Molhos');
  await drawer.getByLabel('Nome do grupo').nth(2).fill('Escolha o molho');
  await groupCards.nth(2).getByLabel('Molho branco').check();
  await groupCards.nth(2).getByRole('checkbox', { name: 'Categoria obrigatória' }).uncheck();
  await drawer.getByRole('button', { name: 'Salvar alterações' }).click();

  await expect(drawer).toBeHidden();
  expect(savedPayload).not.toBeNull();
  if (!savedPayload) throw new Error('Expected saved payload to be defined');
  const savedGroups = savedPayload['optionGroups'] as Array<Record<string, unknown>>;
  expect(savedGroups).toHaveLength(3);
  expect(savedGroups[2]).toMatchObject({
    name: 'Escolha o molho',
    required: false,
    minSelections: 0,
    options: [{ ingredientId: 4, active: true }],
  });
});

test('editor de produto permanece contido e utilizável no celular', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('token', 'e2e-admin-token');
    localStorage.setItem(
      'user',
      JSON.stringify({ id: 9, name: 'Admin Teste', role: 'ADMIN', restaurantId: 9 }),
    );
  });

  await page.route(/^http:\/\/(127\.0\.0\.1|localhost):3000\/.*$/, async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    const responses: Record<string, unknown> = {
      '/auth/me': { user: { id: 9, name: 'Admin Teste', role: 'ADMIN', restaurantId: 9 } },
      '/products': {
        products: [
          {
            id: 101,
            name: 'Produto artesanal',
            description: 'Monte exatamente como preferir.',
            price: 30,
            active: true,
            stock: null,
            categoryId: 10,
            category: { id: 10, name: 'Principais' },
            optionGroups: [],
          },
        ],
      },
      '/ingredients': {
        ingredients: [
          { id: 1, name: 'Massa fina', category: 'Massas', price: 0, active: true },
        ],
        count: 1,
        categories: ['Massas'],
      },
      '/categories': { categories: [{ id: 10, name: 'Principais', active: true }] },
      '/orders': { orders: [] },
      '/settings': { id: 1, restaurant: { id: 9, name: 'Restaurante Teste' } },
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

  await page.goto('/admin');
  await page.getByRole('button', { name: 'Cardápio' }).click();
  await page.getByRole('button', { name: 'Opções de Produto artesanal' }).click();
  await page.getByRole('button', { name: 'Editar produto' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(350);

  const dialog = page.getByRole('dialog', { name: 'Editar produto' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Salvar alterações' })).toBeVisible();
  await expect(
    dialog.getByRole('navigation', { name: 'Etapas do cadastro do produto' }),
  ).toBeVisible();
  await expect(dialog.getByRole('heading', { name: 'Apresente o produto' })).toHaveCount(1);
  await expect(
    dialog.getByRole('heading', { name: 'Organize a montagem do cliente' }),
  ).toHaveCount(1);
  await expect(dialog.getByRole('heading', { name: 'Disponibilidade e revisão' })).toHaveCount(1);

  const overflowReport = await dialog.evaluate((element) => {
    const dialogRect = element.getBoundingClientRect();
    const offenders = Array.from(element.querySelectorAll<HTMLElement>('*'))
      .map((node) => {
        const rect = node.getBoundingClientRect();
        return {
          className: node.className,
          tagName: node.tagName,
          left: Math.round(rect.left),
          right: Math.round(rect.right),
        };
      })
      .filter(
        ({ left, right }) => left < Math.floor(dialogRect.left) || right > Math.ceil(dialogRect.right),
      )
      .slice(0, 5);

    return {
      fits: element.scrollWidth <= element.clientWidth + 1,
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
      offenders,
    };
  });
  expect(overflowReport).toMatchObject({ fits: true, offenders: [] });
});
