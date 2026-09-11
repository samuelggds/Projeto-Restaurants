import { test, expect } from '@playwright/test';
import { createInitialDemoState, DEMO_STORAGE_KEY } from '../src/pages/Marketing/demo/demoDomain';
import { adminHelpGuides } from '../src/pages/admin/components/adminHelpGuides';
import { getEmployeeHelpGuides } from '../src/features/employee-help/employeeHelpGuides';
import { adminMockSettings } from '../src/pages/admin/data';
import { createDemoIngredients } from '../src/pages/Marketing/demo/demoIngredients';
test.use({ reducedMotion: 'reduce' });

test('catálogo móvel: itens compactos, ações legíveis e prévia de ajuda menor', async ({
  page,
}) => {
  await page.addInitScript(
    ({ state }) => {
      localStorage.setItem('gastronexa:interactive-demo:v2', JSON.stringify(state));
      sessionStorage.setItem('gastronexa:demo:account', 'demo-admin');
    },
    { state: createInitialDemoState() },
  );
  await page.route(/:3000\/|\/api\//, (route) => route.fulfill({ status: 401, json: {} }));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/demonstracao');
  const admin = page.frameLocator('iframe[title="Painel administrativo demonstrativo"]');
  await admin.getByRole('button', { name: 'Cardápio', exact: true }).click();
  const frame = page.frames().find((item) => item.url().includes('demo-admin.html'))!;
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(admin.locator('.product-copy').first()).toBeVisible();
    expect(await frame.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const card = admin.locator('article').filter({ hasText: 'Burger Clássico' });
    expect((await card.boundingBox())!.height).toBeLessThan(125);
    const importButton = await admin
      .getByRole('button', { name: 'Importar cardápio', exact: true })
      .boundingBox();
    const newButton = await admin
      .getByRole('button', { name: 'Novo produto', exact: true })
      .first()
      .boundingBox();
    expect(importButton!.x + importButton!.width).toBeLessThanOrEqual(newButton!.x);
    expect(newButton!.x + newButton!.width).toBeLessThanOrEqual(width);
    expect(importButton!.height).toBeGreaterThanOrEqual(44);
  }
  await page.screenshot({
    path: '../artifacts/demo-functional-completeness/demo-catalog-mobile.png',
    animations: 'disabled',
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await admin.getByRole('button', { name: 'Central de ajuda', exact: true }).click();
  await admin.getByRole('button', { name: /^Cardápio Cardápio · \d+ passos detalhados$/ }).click();
  const figure = admin.getByRole('figure', { name: 'Prévia atual: Cardápio', exact: true });
  await figure.getByRole('button', { name: 'Celular', exact: true }).click();
  const preview = figure.frameLocator('iframe');
  await expect(preview.getByRole('heading', { name: 'Cardápio', exact: true })).toBeVisible();
  await expect(preview.locator('.product-copy').first()).toBeVisible();
  await expect(preview.getByText('Carregando painel...')).toHaveCount(0);
  expect((await figure.locator('.viewport').boundingBox())!.height).toBeLessThanOrEqual(601);
  await figure.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: '../artifacts/demo-functional-completeness/catalog-help-compact.png',
    animations: 'disabled',
  });
});

test('demo: adicionais do catálogo chegam com preço e observação à cozinha', async ({ page }) => {
  const state = createInitialDemoState();
  const data = {
    catalogSeedVersion: 1,
    settings: { ...adminMockSettings, restaurantName: 'GastroNexa Burger' },
    categories: [{ id: 1, name: 'Burgers' }],
    employees: [],
    coupons: [],
    ingredients: createDemoIngredients(),
    products: [
      {
        id: 'burger-teste',
        name: 'Burger teste',
        price: 32.9,
        categoryId: 1,
        image: '/demo/burger-hero.webp',
        active: true,
        configurationVersion: 1,
        saleMode: 'BUILDABLE',
        compositionItems: [],
        optionGroups: [
          {
            id: 81,
            name: 'Adicionais',
            required: false,
            selectionType: 'MULTIPLE',
            minSelections: 0,
            maxSelections: 1,
            options: [{ id: 82, ingredientId: 9101, additionalPrice: 5, active: true }],
          },
        ],
      },
    ],
  };
  await page.route(/:3000\/|\/api\//, (route) => route.fulfill({ status: 401, json: {} }));
  await page.addInitScript(
    ({ state, data }) => {
      localStorage.setItem('gastronexa:interactive-demo:v2', JSON.stringify(state));
      localStorage.setItem('gastronexa:demo:admin:v1', JSON.stringify(data));
      sessionStorage.setItem('gastronexa:demo:account', 'demo-cliente');
    },
    { state, data },
  );
  await page.goto('/demonstracao');
  await page.getByRole('button', { name: 'Ver detalhes de Burger teste', exact: true }).click();
  const configurator = page.getByTestId('product-configurator');
  await configurator.getByText('Bacon', { exact: true }).click();
  await configurator.getByPlaceholder(/Adicione aqui uma observação/).fill('Bem passado');
  await configurator.getByRole('button', { name: 'Adicionar à sacola' }).click();
  const cart = page.getByRole('dialog', { name: 'Sua sacola' });
  await expect(cart.getByText('1x Bacon', { exact: true })).toBeVisible();
  await expect(cart.getByText('R$ 37,90', { exact: true }).last()).toBeVisible();
  await cart.getByRole('button', { name: 'Enviar pedido' }).click();
  await expect(page.getByRole('status').filter({ hasText: /recebido pela cozinha/ })).toBeVisible();
  await page
    .getByRole('dialog', { name: 'Meus pedidos' })
    .getByRole('button', { name: 'Fechar', exact: true })
    .click();
  const controls = page
    .locator('details')
    .filter({ has: page.locator('summary').filter({ hasText: /^Demonstração$/ }) });
  await controls.locator('summary').click();
  await controls.getByLabel('Ver demonstração como').selectOption('COZINHA');
  await controls.locator('summary').click();
  await page
    .getByRole('navigation', { name: 'Navegação da cozinha' })
    .getByRole('button', { name: 'Fila de pedidos', exact: true })
    .click();
  const kitchenOrder = page.locator('article').filter({ hasText: 'Burger teste' });
  await expect(kitchenOrder).toContainText('1x Bacon');
  await expect(kitchenOrder).toContainText('Observação: Bem passado');
  await kitchenOrder.getByRole('button', { name: 'Reimprimir comanda' }).click();
  await expect(kitchenOrder.getByRole('status')).toContainText('Comanda enviada');
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem('gastronexa:demo:admin:v1') ?? '{}').runtime.jobs[0].source,
    ),
  ).toBe('REPRINT');
});

test('demo: ingredientes de exemplo e cadastro completo sobrevivem à troca de tela e recarga', async ({
  page,
}) => {
  const requests: string[] = [];
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route(/:3000\/|\/api\//, (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/auth/refresh')) return route.fulfill({ status: 401, json: {} });
    if (path.endsWith('/platform/status')) return route.fulfill({ json: { available: true } });
    requests.push(path);
    return route.abort();
  });
  await page.addInitScript(
    ({ state, key }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state));
      sessionStorage.setItem('gastronexa:demo:account', 'demo-admin');
    },
    { state: createInitialDemoState(), key: DEMO_STORAGE_KEY },
  );
  await page.goto('/demonstracao');
  const admin = page.frameLocator('iframe[title="Painel administrativo demonstrativo"]');
  const openIngredients = async () => {
    await admin.getByRole('button', { name: 'Cardápio', exact: true }).click();
    await admin.getByRole('button', { name: /^Ingredientes \(/ }).click();
  };
  await openIngredients();
  await expect(admin.getByText('Bacon', { exact: true }).first()).toBeVisible();
  await admin.getByRole('button', { name: 'Novo ingrediente', exact: true }).click();
  const wizard = admin.getByRole('dialog', { name: 'Qual é o nome do ingrediente?' });
  await admin.getByLabel('Nome do ingrediente', { exact: true }).fill('Queijo de demonstração');
  await wizard.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(admin.getByRole('heading', { name: 'Escolha uma foto' })).toBeVisible();
  await expect(admin.locator('.recommended-image img')).toHaveAttribute(
    'src',
    '/demo/ingredients/cheese.webp',
  );
  await admin.getByRole('button', { name: 'Usar esta foto' }).click();
  await admin.getByRole('button', { name: 'Continuar', exact: true }).click();
  await admin.getByLabel('Categoria do ingrediente').selectOption('Queijos');
  await admin.getByRole('button', { name: 'Continuar', exact: true }).click();
  await admin.getByRole('radio', { name: 'Sim', exact: true }).click();
  await admin.getByLabel('Valor adicional padrão').fill('3.50');
  await admin.getByRole('button', { name: 'Concluir', exact: true }).click();
  await expect(
    admin.getByRole('heading', { name: 'Ingrediente criado com sucesso!' }),
  ).toBeVisible();
  await admin.getByRole('button', { name: 'Voltar aos ingredientes' }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem('gastronexa:demo:admin:v1') ?? '{}').ingredients?.find(
            (item: { name: string }) => item.name === 'Queijo de demonstração',
          )?.price,
      ),
    )
    .toBe(3.5);
  await page.reload();
  await openIngredients();
  await expect(admin.getByText('Queijo de demonstração', { exact: true }).first()).toBeVisible();
  await expect
    .poll(() =>
      admin
        .locator('img[src*="/demo/ingredients/"]')
        .evaluateAll(
          (images) =>
            images.length > 0 &&
            images.every((image) => (image as HTMLImageElement).naturalWidth > 0),
        ),
    )
    .toBe(true);
  const adminDocument = page.frames().find((item) => item.url().includes('demo-admin.html'))!;
  await expect
    .poll(() =>
      adminDocument.evaluate(
        () =>
          document
            .getAnimations()
            .filter((animation) => animation.playState === 'running' || animation.pending).length,
      ),
    )
    .toBe(0);
  expect(
    await admin.locator('.ingredient-list article').evaluateAll((cards) =>
      cards.every((card) => {
        const name = card.querySelector('.ingredient-copy b')?.getBoundingClientRect();
        const price = card.querySelector('.ingredient-state')?.getBoundingClientRect();
        return name && price && name.right <= price.left;
      }),
    ),
  ).toBe(true);
  await page.screenshot({
    path: '../artifacts/demo-functional-completeness/ingredients.png',
    animations: 'disabled',
  });
  await admin.getByRole('button', { name: 'Central de ajuda', exact: true }).click();
  const preview = admin.frameLocator('iframe[title="Exemplo ilustrativo de Visão geral"]');
  await expect(
    preview.getByRole('heading', { name: 'Visão geral', exact: true }).first(),
  ).toBeVisible();
  await expect(
    preview.getByRole('heading', { name: 'Sua operação, em um só olhar' }),
  ).toBeVisible();
  await page.screenshot({
    path: '../artifacts/demo-functional-completeness/admin-help.png',
    animations: 'disabled',
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await admin.getByRole('button', { name: 'Celular', exact: true }).click();
  await expect(
    preview.getByRole('heading', { name: 'Visão geral', exact: true }).first(),
  ).toBeVisible();
  await expect(
    preview.getByRole('heading', { name: 'Sua operação, em um só olhar' }),
  ).toBeVisible();
  const frame = page.frames().find((item) => item.url().includes('demo-admin.html'))!;
  expect(await frame.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: '../artifacts/demo-functional-completeness/admin-help-mobile.png',
    animations: 'disabled',
  });
  expect(requests).toEqual([]);
  expect(errors).toEqual([]);
});

test('manual: prévias usam as áreas atuais e não acessam APIs reais', async ({ page }) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  const requests: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route(/:3000\/|\/api\//, (route) => {
    requests.push(route.request().url());
    return route.abort();
  });
  const areas = [
    ...adminHelpGuides.map((guide) => guide.preview),
    ...(['kitchen', 'waiter', 'courier'] as const).flatMap((role) =>
      getEmployeeHelpGuides(role).map((guide) => guide.preview),
    ),
  ];
  for (const area of areas) {
    await page.goto(`/help-preview.html?area=${area}`);
    await expect(page.getByRole('heading').first(), area).toBeVisible();
    await expect(page.locator('body'), area).not.toContainText(/Carregando/i);
    await expect(page.locator('body')).not.toContainText('Não foi possível carregar');
    await expect(page.locator('#root')).toHaveAttribute('data-help-preview-readonly', 'true');
    expect(await page.evaluate(() => localStorage.getItem('user'))).toBeNull();
  }
  expect(requests).toEqual([]);
  expect(errors).toEqual([]);
});
