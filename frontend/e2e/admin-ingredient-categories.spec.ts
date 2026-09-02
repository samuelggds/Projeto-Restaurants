import { expect, test, type Page } from '@playwright/test';

import { mockAuthRefresh } from './helpers/mockAuthRefresh';

const INGREDIENT_IMAGE = '/e2e/fixtures/readme/pizza-calabresa.jpg';

async function openIngredientCatalog(page: Page, imageSearchFails = false) {
  const ingredients: Array<{
    id: number;
    name: string;
    category: string;
    price: number;
    active: boolean;
    image: string | null;
  }> = [];
  const createdPayloads: Array<Record<string, unknown>> = [];
  const updatePayloads: Array<Record<string, unknown>> = [];

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
    if (pathname === '/ingredients/image-search') {
      await route.fulfill(
        imageSearchFails
          ? {
              status: 503,
              contentType: 'application/json',
              body: '{"error":"Busca de imagens indisponível"}',
            }
          : {
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({
                query: 'Bacon ingrediente',
                page: 1,
                provider: 'Pexels',
                results: [
                  {
                    id: 'pexels-bacon',
                    thumbnailUrl: INGREDIENT_IMAGE,
                    previewUrl: INGREDIENT_IMAGE,
                    source: 'Pexels',
                    sourceUrl: 'https://www.pexels.com/photo/123',
                    photographer: 'Foto Teste',
                    photographerUrl: 'https://www.pexels.com/@foto-teste',
                    alt: 'Bacon em fatias',
                    selectionToken: 'signed-selection-token',
                  },
                ],
              }),
            },
      );
      return;
    }
    if (pathname === '/ingredients' && request.method() === 'POST') {
      const payload = request.postDataJSON() as Record<string, unknown>;
      createdPayloads.push(payload);
      const ingredient = {
        id: ingredients.length + 1,
        name: String(payload.name),
        category: String(payload.category),
        price: Number(payload.price),
        active: true,
        image: payload.imageSelectionToken ? INGREDIENT_IMAGE : null,
      };
      ingredients.push(ingredient);
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(ingredient),
      });
      return;
    }
    if (/^\/ingredients\/\d+$/u.test(pathname) && request.method() === 'PUT') {
      const payload = request.postDataJSON() as Record<string, unknown>;
      updatePayloads.push(payload);
      const ingredientId = Number(pathname.split('/').at(-1));
      const ingredient = ingredients.find((item) => item.id === ingredientId);
      if (!ingredient) {
        await route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
        return;
      }
      Object.assign(ingredient, payload);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(ingredient),
      });
      return;
    }
    if (pathname === '/ingredients') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ingredients,
          count: ingredients.length,
          categories: ['Adicionais'],
        }),
      });
      return;
    }

    const responses: Record<string, unknown> = {
      '/products': { products: [] },
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

  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem(
      'user',
      JSON.stringify({ id: 9, name: 'Admin Teste', role: 'ADMIN', restaurantId: 9 }),
    );
  });
  await mockAuthRefresh(page, 9, 'e2e-admin-token');
  await page.goto('/admin');
  await page.getByRole('button', { name: 'Cardápio' }).click();
  await page.getByRole('button', { name: /Ingredientes \(0\)/ }).click();

  return { createdPayloads, updatePayloads };
}

test('admin escolhe uma foto sugerida, preserva e remove a imagem explicitamente', async ({
  page,
}) => {
  const { createdPayloads, updatePayloads } = await openIngredientCatalog(page);

  await page.getByRole('button', { name: 'Novo ingrediente' }).click();
  const wizard = page.locator('[data-ingredient-wizard]');
  await wizard.getByPlaceholder('Ex.: Bacon').fill('Bacon');
  await wizard.getByRole('button', { name: 'Continuar', exact: true }).click();
  await wizard.getByRole('button', { name: 'Usar esta foto' }).waitFor();
  await wizard.getByRole('button', { name: 'Usar esta foto' }).click();
  await wizard.getByRole('button', { name: 'Continuar', exact: true }).click();
  await wizard.getByPlaceholder('Ex.: Molhos').fill('Adicionais');
  await wizard.getByRole('button', { name: 'Continuar', exact: true }).click();
  await wizard.getByRole('radio', { name: 'Sim' }).click();
  await wizard.getByLabel('Valor adicional padrão').fill('5');
  await wizard.getByRole('button', { name: 'Concluir' }).click();
  await expect(
    wizard.getByRole('heading', { name: 'Ingrediente criado com sucesso!' }),
  ).toBeVisible();
  await wizard.getByRole('button', { name: 'Voltar aos ingredientes' }).click();

  const card = page.locator('.ingredient-list article').first();
  await expect(card.locator('.ingredient-avatar img')).toHaveAttribute('src', INGREDIENT_IMAGE);
  expect(createdPayloads).toEqual([
    expect.objectContaining({
      name: 'Bacon',
      category: 'Adicionais',
      price: 5,
      imageSelectionToken: 'signed-selection-token',
    }),
  ]);

  await card.getByRole('button', { name: 'Opções de Bacon' }).click();
  await page.getByRole('button', { name: 'Desativar' }).click();
  await expect(
    page.getByText('Ingrediente desativado. Ele não aparecerá em novas montagens.'),
  ).toBeVisible();
  expect(updatePayloads[0]).not.toHaveProperty('image');

  await card.getByRole('button', { name: 'Opções de Bacon' }).click();
  await page.getByRole('button', { name: 'Editar ingrediente' }).click();
  await card.getByRole('button', { name: 'Remover foto' }).click();
  await card.getByRole('button', { name: 'Salvar Bacon' }).click();
  await expect(page.getByText('Ingrediente atualizado.')).toBeVisible();
  await expect(card.locator('.ingredient-avatar img')).toHaveCount(0);
  expect(updatePayloads[1]).toEqual(expect.objectContaining({ image: null }));
});

test('falha na busca não bloqueia ingrediente sem foto e preserva o fallback', async ({ page }) => {
  const { createdPayloads } = await openIngredientCatalog(page, true);
  await page.setViewportSize({ width: 320, height: 844 });

  await page.getByRole('button', { name: 'Novo ingrediente' }).click();
  const wizard = page.locator('[data-ingredient-wizard]');
  await wizard.getByPlaceholder('Ex.: Bacon').fill('Catupiry');
  await wizard.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(wizard.getByText('Não conseguimos buscar imagens agora.')).toBeVisible();
  const overflow = await wizard.evaluate((element) => ({
    dialog: element.scrollWidth <= element.clientWidth + 1,
    page: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
  }));
  expect(overflow).toEqual({ dialog: true, page: true });
  await wizard.getByRole('button', { name: 'Continuar sem foto' }).click();
  await wizard.getByPlaceholder('Ex.: Molhos').fill('Adicionais');
  await wizard.getByRole('button', { name: 'Continuar', exact: true }).click();
  await wizard.getByRole('button', { name: 'Concluir' }).click();
  await expect(
    wizard.getByRole('heading', { name: 'Ingrediente criado com sucesso!' }),
  ).toBeVisible();
  await wizard.getByRole('button', { name: 'Voltar aos ingredientes' }).click();

  const card = page.locator('.ingredient-list article').filter({ hasText: 'Catupiry' });
  await expect(card.locator('.ingredient-avatar img')).toHaveCount(0);
  await expect(card.locator('.ingredient-avatar > span')).toHaveText('C');
  expect(createdPayloads).toEqual([expect.objectContaining({ name: 'Catupiry', image: null })]);
});

test('admin separa ingredientes em categorias dinâmicas e configura cada grupo', async ({
  page,
}) => {
  const ingredients = [
    { id: 1, name: 'Massa fina', category: 'Massas', price: 0, active: true },
    { id: 2, name: 'Massa grossa', category: 'Massas', price: 2, active: true },
    {
      id: 3,
      name: 'Bacon',
      category: 'Adicionais',
      price: 5,
      active: true,
      image: INGREDIENT_IMAGE,
    },
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
        body: JSON.stringify({
          user: { id: 9, name: 'Admin Teste', role: 'ADMIN', restaurantId: 9 },
        }),
      });
      return;
    }
    if (pathname === '/billing/invoices') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '{"invoices":[]}',
      });
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
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(product),
      });
      return;
    }
    if (pathname === '/ingredients') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ingredients,
          count: ingredients.length,
          categories: ['Adicionais', 'Massas', 'Molhos'],
        }),
      });
      return;
    }
    if (pathname === '/categories') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '{"categories":[{"id":10,"name":"Principais","active":true}]}',
      });
      return;
    }
    if (pathname === '/orders') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"orders":[]}' });
      return;
    }
    if (pathname === '/settings') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '{"id":1,"restaurant":{"id":9,"name":"Restaurante Teste"}}',
      });
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
    localStorage.setItem(
      'user',
      JSON.stringify({ id: 9, name: 'Admin Teste', role: 'ADMIN', restaurantId: 9 }),
    );
  });
  await mockAuthRefresh(page, 9, 'e2e-admin-token');
  await page.goto('/admin');

  await page.getByRole('button', { name: 'Cardápio' }).click();
  await page.getByRole('button', { name: /Ingredientes \(4\)/ }).click();
  await expect(page.getByRole('heading', { name: 'Ingredientes', exact: true })).toBeVisible();
  await expect(
    page.getByText('Cadastre e organize ingredientes usados nos produtos.'),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Novo ingrediente' })).toBeVisible();

  const ingredientCategories = page.getByRole('navigation', {
    name: 'Categorias de ingredientes',
  });
  await expect(ingredientCategories.getByRole('button', { name: 'Todos 4' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await ingredientCategories.getByRole('button', { name: 'Massas 2' }).click();

  const ingredientLibrary = page.getByRole('region', { name: 'Ingredientes cadastrados' });
  await expect(ingredientLibrary.getByText('Massa fina')).toBeVisible();
  await expect(ingredientLibrary.getByText('Massa grossa')).toBeVisible();
  await expect(ingredientLibrary.getByText('Bacon')).toHaveCount(0);
  await ingredientLibrary.getByRole('button', { name: 'Opções de Massa fina' }).click();
  await expect(page.getByRole('button', { name: 'Editar ingrediente' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Desativar' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Excluir' })).toBeVisible();

  await page.getByRole('button', { name: 'Produtos', exact: true }).click();
  await page.getByRole('button', { name: 'Opções de Produto artesanal' }).click();
  await page.getByRole('button', { name: 'Editar produto' }).click();

  const dialog = page.getByRole('dialog', { name: 'Editar produto' });
  const drawer = dialog;
  await expect(dialog).toBeVisible();
  await expect(drawer.getByRole('heading', { name: 'O que você quer cadastrar?' })).toBeVisible();
  await expect(drawer.getByRole('heading', { name: 'Qual é o produto?' })).toHaveCount(0);
  await drawer.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(drawer.getByRole('heading', { name: 'Qual é o produto?' })).toBeVisible();
  await drawer.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(drawer.getByRole('heading', { name: 'Quanto custa?' })).toBeVisible();
  await drawer.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(
    drawer.getByRole('heading', { name: 'Como ele aparece no cardápio?' }),
  ).toBeVisible();
  await drawer.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(
    drawer.getByRole('heading', { name: 'Como o cliente poderá personalizar?' }),
  ).toBeVisible();
  await expect(drawer.getByText('Resumo da experiência do cliente')).toBeVisible();
  await expect(drawer.getByText('Nome do novo modelo')).toBeHidden();
  await drawer.getByText('Configurações avançadas e modelos').click();
  await expect(drawer.getByText('Nome do novo modelo')).toBeVisible();

  const groupCards = drawer.getByTestId('product-option-group');
  await expect(groupCards).toHaveCount(2);
  await groupCards.nth(0).getByRole('button', { name: 'Editar', exact: true }).click();
  await expect(groupCards.nth(0).getByRole('combobox')).toHaveValue('Massas');
  await expect(groupCards.nth(0).getByRole('checkbox', { name: /^Massa fina/ })).toBeVisible();
  await expect(groupCards.nth(0).getByRole('checkbox', { name: /^Bacon/ })).toHaveCount(0);
  await expect(groupCards.nth(0).getByText('Preço e comportamento neste produto')).toBeHidden();
  await groupCards.nth(0).getByText('Configurações avançadas das opções').click();
  await expect(groupCards.nth(0).getByText('Preço e comportamento neste produto')).toBeVisible();
  await groupCards.nth(0).getByText('Configurações avançadas da etapa').click();
  await expect(groupCards.nth(0).getByText('Mínimo de escolhas')).toBeVisible();
  await groupCards.nth(1).getByRole('button', { name: 'Editar', exact: true }).click();
  await expect(groupCards.nth(1).getByRole('combobox')).toHaveValue('Adicionais');
  await expect(groupCards.nth(1).getByRole('checkbox', { name: /^Bacon/ })).toBeVisible();
  await expect(groupCards.nth(1).getByRole('checkbox', { name: /^Massa fina/ })).toHaveCount(0);

  await drawer.getByRole('button', { name: 'Adicionar etapa' }).click();
  await expect(groupCards).toHaveCount(3);
  await expect(groupCards.nth(2).getByRole('combobox')).toHaveValue('');
  await groupCards.nth(2).getByRole('combobox').selectOption('Molhos');
  await groupCards
    .nth(2)
    .getByLabel(/Nome da etapa/)
    .fill('Escolha o molho');
  await groupCards.nth(2).getByLabel('Molho branco').check();
  await groupCards
    .nth(2)
    .getByRole('button', { name: /Não, ele pode continuar sem escolher/ })
    .click();
  await expect(drawer.getByText('O produto pode ser dividido?')).toBeHidden();
  await drawer.getByText('Configurações avançadas de divisão em porções').click();
  await expect(drawer.getByText('O produto pode ser dividido?')).toBeVisible();
  await drawer.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(drawer.getByRole('heading', { name: 'Como ele é vendido?' })).toBeVisible();
  await drawer.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(drawer.getByRole('heading', { name: 'Está tudo certo?' })).toBeVisible();
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
            saleMode: 'BUILDABLE',
            configurationVersion: 1,
            categoryId: 10,
            category: { id: 10, name: 'Principais' },
            optionGroups: [
              {
                id: 10,
                name: 'Escolha a massa',
                required: true,
                selectionType: 'SINGLE',
                minSelections: 1,
                maxSelections: 1,
                options: [{ id: 1001, ingredientId: 1, active: true }],
              },
            ],
          },
        ],
      },
      '/ingredients': {
        ingredients: [{ id: 1, name: 'Massa fina', category: 'Massas', price: 0, active: true }],
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

  await mockAuthRefresh(page, 9, 'e2e-admin-token');

  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto('/admin');
  await page.getByRole('button', { name: 'Abrir menu administrativo' }).click();
  await page.getByRole('button', { name: 'Cardápio' }).click();
  await page.getByRole('button', { name: 'Opções de Produto artesanal' }).click();
  await page.getByRole('button', { name: 'Editar produto' }).click();

  const dialog = page.getByRole('dialog', { name: 'Editar produto' });
  await expect(dialog).toBeVisible();
  await dialog.evaluate(async (element) => {
    await Promise.all(
      element
        .getAnimations({ subtree: true })
        .map((animation) => animation.finished.catch(() => undefined)),
    );
  });
  await expect(dialog.getByRole('button', { name: 'Continuar', exact: true })).toBeVisible();
  await expect(
    dialog.getByRole('navigation', { name: 'Progresso do cadastro do produto' }),
  ).toBeVisible();
  const closeButton = dialog.getByRole('button', { name: 'Fechar cadastro' });
  const continueButton = dialog.getByRole('button', { name: 'Continuar', exact: true });
  await continueButton.focus();
  await page.keyboard.press('Tab');
  await expect(closeButton).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(continueButton).toBeFocused();

  const expectNoHorizontalOverflow = async () => {
    const overflowReport = await dialog.evaluate((element) => {
      const dialogRect = element.getBoundingClientRect();
      const offenders = Array.from(element.querySelectorAll<HTMLElement>('*'))
        .filter((node) => node.offsetParent !== null)
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
          ({ left, right }) =>
            left < Math.floor(dialogRect.left) || right > Math.ceil(dialogRect.right),
        )
        .slice(0, 5);

      return {
        fits: element.scrollWidth <= element.clientWidth + 1,
        offenders,
      };
    });
    expect(overflowReport).toMatchObject({ fits: true, offenders: [] });
  };

  for (const width of [320, 375, 768, 1440]) {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
    await expectNoHorizontalOverflow();
  }

  await page.setViewportSize({ width: 320, height: 844 });
  const stepHeadings = [
    'O que você quer cadastrar?',
    'Qual é o produto?',
    'Quanto custa?',
    'Como ele aparece no cardápio?',
    'Como o cliente poderá personalizar?',
    'Como ele é vendido?',
    'Está tudo certo?',
  ];
  for (const [index, heading] of stepHeadings.entries()) {
    await expect(dialog.getByRole('heading', { name: heading })).toBeVisible();
    for (const hiddenHeading of stepHeadings.filter((_, itemIndex) => itemIndex !== index)) {
      await expect(dialog.getByRole('heading', { name: hiddenHeading })).toHaveCount(0);
    }
    await expectNoHorizontalOverflow();
    if (heading === 'Como o cliente poderá personalizar?') {
      const group = dialog.getByTestId('product-option-group');
      await dialog.getByText('Configurações avançadas e modelos').click();
      await group.getByText('Configurações avançadas da etapa').click();
      await group.getByText('Configurações avançadas das opções').click();
      await dialog.getByText('Configurações avançadas de divisão em porções').click();
      await expectNoHorizontalOverflow();
    }
    if (index < stepHeadings.length - 1) {
      await dialog.getByRole('button', { name: 'Continuar', exact: true }).click();
    }
  }
  await expect(dialog.getByRole('button', { name: 'Salvar alterações' })).toBeVisible();
});
