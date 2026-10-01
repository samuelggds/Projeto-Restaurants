import { expect, test, type Page } from '@playwright/test';

const product = {
  id: 101,
  name: 'Produto artesanal',
  description: 'Monte exatamente como preferir.',
  price: 30,
  active: true,
  stock: null,
  category: { name: 'Principais' },
  saleMode: 'BUILDABLE',
  optionGroups: [
    {
      id: 10,
      name: 'Escolha a base',
      description: 'Selecione uma opção obrigatória.',
      required: true,
      selectionType: 'SINGLE',
      minSelections: 1,
      maxSelections: 1,
      options: [
        {
          id: 1001,
          ingredientId: 1,
          active: true,
          ingredient: {
            id: 1,
            name: 'Base fina',
            price: 0,
            active: true,
            image:
              'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+3zS5WQAAAABJRU5ErkJggg==',
          },
        },
        {
          id: 1002,
          ingredientId: 2,
          active: true,
          ingredient: { id: 2, name: 'Base grossa', price: 3, active: true },
        },
      ],
    },
    {
      id: 20,
      name: 'Adicionais',
      required: false,
      selectionType: 'MULTIPLE',
      minSelections: 0,
      maxSelections: 2,
      options: [
        {
          id: 2001,
          ingredientId: 3,
          active: true,
          ingredient: { id: 3, name: 'Queijo especial', price: 5, active: true },
        },
      ],
    },
  ],
};

for (const width of [1440, 390]) {
  test(`meio a meio calcula o maior sabor na sacola em ${width}px`, async ({ page }, testInfo) => {
    await mockStorefront(page);
    const halfHalf = {
      ...product,
      id: 505,
      name: 'Meio a meio dinâmico',
      price: 0,
      pricingMode: 'HIGHEST_OPTION',
      optionGroups: [1, 2].map((half) => ({
        id: half,
        name: `Metade ${half}`,
        required: true,
        selectionType: 'SINGLE',
        minSelections: 1,
        maxSelections: 1,
        options: [35, 42].map((price, index) => ({
          id: half * 10 + index,
          active: true,
          referenceProductId: 100 + index,
          pricingMode: 'ABSOLUTE',
          absolutePrice: 0,
          referenceProduct: {
            id: 100 + index,
            name: index ? 'Especial' : 'Calabresa',
            price,
            active: true,
            kind: 'STANDARD',
            pricingMode: 'BASE',
          },
        })),
      })),
    };
    await page.route('**/products?*', (route) => route.fulfill({ json: { products: [halfHalf] } }));
    await page.route('**/products', (route) => route.fulfill({ json: { products: [halfHalf] } }));
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/restaurante-teste');
    await enterMenu(page);

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.getByRole('button', { name: 'Ver detalhes de Meio a meio dinâmico' }).click();

    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThanOrEqual(2);

    const dialog = page.getByRole('dialog', { name: 'Montar Meio a meio dinâmico' });
    const footer = dialog.getByTestId('product-configurator-footer');

    const halfList = dialog.locator('.product-half-group .product-option-list').first();
    const layout = await halfList.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        display: style.display,
        flexDirection: style.flexDirection,
        gridTemplateColumns: style.gridTemplateColumns,
        width: element.getBoundingClientRect().width,
        optionWidths: Array.from(element.children).map(
          (child) => (child as HTMLElement).getBoundingClientRect().width,
        ),
      };
    });
    expect(layout.optionWidths.every((optionWidth) => optionWidth >= layout.width - 2)).toBe(true);

    if (width === 390) {
      expect(layout.display).toBe('flex');
      expect(layout.flexDirection).toBe('column');
    } else {
      expect(layout.gridTemplateColumns.trim().split(/\s+/u)).toHaveLength(1);
      const scrolling = await dialog.evaluate((element) => ({
        scrollHeight: element.scrollHeight,
        clientHeight: element.clientHeight,
      }));
      expect(scrolling.scrollHeight).toBeGreaterThan(scrolling.clientHeight);
      await dialog.evaluate((element) => {
        element.scrollTop = element.scrollHeight;
      });
      await expect.poll(() => dialog.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
    }
    await expect(footer).toContainText('Escolha os sabores');
    await expect(footer).not.toContainText('R$ 0,00');
    await dialog
      .locator('label')
      .filter({ has: page.locator('input[value="10"]') })
      .click();
    await dialog
      .locator('label')
      .filter({ has: page.locator('input[value="21"]') })
      .click();
    await expect(footer).toContainText('42,00');
    await page.screenshot({
      path: testInfo.outputPath(`meio-a-meio-cliente-${width}.png`),
      fullPage: true,
    });
    await dialog.getByRole('button', { name: 'Adicionar à sacola' }).click();
    const cart = await openCartAfterAddition(page);
    await expect(cart).toContainText('42,00');
    await expect(cart).not.toContainText('77,00');
  });
}

const advancedProduct = {
  id: 202,
  name: 'Pizza em porções',
  description: 'Divida sabores e ajuste a receita.',
  price: 30,
  active: true,
  stock: null,
  saleMode: 'BUILDABLE',
  configurationVersion: 7,
  category: { name: 'Principais' },
  compositionItems: [
    {
      id: 301,
      ingredientId: 4,
      removable: true,
      active: true,
      ingredient: { id: 4, name: 'Cebola', active: true },
    },
  ],
  optionGroups: [
    {
      id: 30,
      name: 'Adicionais',
      required: false,
      selectionType: 'MULTIPLE',
      minSelections: 0,
      maxSelections: 1,
      options: [
        {
          id: 3001,
          ingredientId: 3,
          additionalPrice: 5,
          pricingMode: 'ADDITIVE',
          allowQuantity: true,
          minQuantity: 1,
          maxQuantity: 3,
          defaultQuantity: 1,
          active: true,
          ingredient: { id: 3, name: 'Bacon', price: 5, active: true },
        },
      ],
    },
    {
      id: 40,
      name: 'Sabores',
      required: true,
      selectionType: 'MULTIPLE',
      minSelections: 1,
      maxSelections: 2,
      options: [
        {
          id: 4001,
          ingredientId: 5,
          additionalPrice: 6,
          active: true,
          ingredient: { id: 5, name: 'Calabresa', price: 6, active: true },
        },
        {
          id: 4002,
          ingredientId: 6,
          additionalPrice: 10,
          active: true,
          ingredient: { id: 6, name: 'Especial', price: 10, active: true },
        },
      ],
    },
  ],
  portionConfiguration: {
    enabled: true,
    optionGroupId: 40,
    minPortions: 2,
    maxPortions: 2,
    pricingStrategy: 'HIGHEST',
    allowPortionObservations: true,
  },
};

const halfHalfProduct = {
  id: 606,
  name: 'Pizza Meio a Meio',
  description: 'Escolha até 2 sabores para compor a sua pizza.',
  price: 39.9,
  active: true,
  stock: null,
  saleMode: 'BUILDABLE',
  pricingMode: 'HIGHEST_OPTION',
  configurationVersion: 3,
  category: { name: 'Pizzas' },
  optionGroups: [
    {
      id: 60,
      name: 'Sabores',
      required: true,
      selectionType: 'MULTIPLE',
      minSelections: 1,
      maxSelections: 2,
      options: [
        {
          id: 6001,
          active: true,
          referenceProductId: 701,
          pricingMode: 'ABSOLUTE',
          absolutePrice: 39.9,
          referenceProduct: {
            id: 701,
            name: 'Calabresa',
            image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+3zS5WQAAAABJRU5ErkJggg==',
            price: 39.9,
            active: true,
            kind: 'STANDARD',
            pricingMode: 'BASE',
          },
        },
        {
          id: 6002,
          active: true,
          referenceProductId: 702,
          pricingMode: 'ABSOLUTE',
          absolutePrice: 42,
          referenceProduct: {
            id: 702,
            name: 'Margherita',
            image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+3zS5WQAAAABJRU5ErkJggg==',
            price: 42,
            active: true,
            kind: 'STANDARD',
            pricingMode: 'BASE',
          },
        },
        {
          id: 6003,
          active: true,
          referenceProductId: 703,
          pricingMode: 'ABSOLUTE',
          absolutePrice: 44,
          referenceProduct: {
            id: 703,
            name: 'Frango com Catupiry',
            image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+3zS5WQAAAABJRU5ErkJggg==',
            price: 44,
            active: true,
            kind: 'STANDARD',
            pricingMode: 'BASE',
          },
        },
      ],
    },
  ],
  portionConfiguration: {
    enabled: true,
    optionGroupId: 60,
    minPortions: 2,
    maxPortions: 2,
    pricingStrategy: 'HIGHEST',
    allowPortionObservations: false,
  },
};

const completeProduct = {
  id: 303,
  name: 'Refrigerante pronto',
  description: 'Produto simples sem etapas de montagem.',
  price: 8,
  active: true,
  stock: null,
  saleMode: 'COMPLETE',
  configurationVersion: 2,
  category: { name: 'Principais' },
  optionGroups: [],
};

const comboProduct = {
  id: 505,
  name: 'Combo Lanche',
  description: 'Combo com escolha obrigatória.',
  price: 39.9,
  active: true,
  stock: null,
  image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+3zS5WQAAAABJRU5ErkJggg==',
  kind: 'COMBO',
  saleMode: 'BUILDABLE',
  configurationVersion: 1,
  category: { name: 'Combos' },
  optionGroups: [],
  comboGroups: [
    {
      id: 100,
      name: 'Lanche principal',
      description: 'Escolha o item do combo.',
      minSelections: 1,
      maxSelections: 1,
      active: true,
      options: [
        {
          id: 1000,
          componentProductId: 303,
          additionalPrice: 0,
          minQuantity: 1,
          maxQuantity: 1,
          defaultQuantity: 1,
          locked: true,
          active: true,
          componentProduct: {
            id: 303,
            name: 'Refrigerante pronto',
            description: 'Item incluído',
            image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+3zS5WQAAAABJRU5ErkJggg==',
            price: 8,
            stock: null,
            active: true,
          },
        },
      ],
    },
  ],
};

const defaultedProduct = {
  id: 404,
  name: 'Produto com escolhas iniciais',
  description: 'Confirme as escolhas sugeridas.',
  price: 20,
  active: true,
  stock: null,
  saleMode: 'BUILDABLE',
  configurationVersion: 4,
  category: { name: 'Principais' },
  optionGroups: [
    {
      id: 50,
      name: 'Escolhas iniciais',
      required: true,
      selectionType: 'MULTIPLE',
      minSelections: 1,
      maxSelections: 3,
      options: [
        {
          id: 5001,
          ingredientId: 7,
          active: true,
          defaultSelected: true,
          ingredient: { id: 7, name: 'Molho padrão', price: 0, active: true },
        },
        {
          id: 5002,
          ingredientId: 8,
          active: true,
          defaultSelected: true,
          locked: true,
          ingredient: { id: 8, name: 'Embalagem fixa', price: 0, active: true },
        },
        {
          id: 5003,
          ingredientId: 9,
          active: true,
          ingredient: { id: 9, name: 'Talheres', price: 0, active: true },
        },
      ],
    },
  ],
};

async function mockStorefront(page: Page) {
  await page.route('http://127.0.0.1:3000/**', async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === '/settings/public/slug/restaurante-teste') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          restaurantId: 9,
          restaurantName: 'Restaurante Teste',
          primaryColor: '#d64d08',
          isOpenForOrders: true,
          restaurant: { id: 9, name: 'Restaurante Teste' },
        }),
      });
      return;
    }
    if (pathname === '/settings/public/9') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          restaurantId: 9,
          restaurantName: 'Restaurante Teste',
          primaryColor: '#d64d08',
          isOpenForOrders: true,
          restaurant: { id: 9, name: 'Restaurante Teste' },
        }),
      });
      return;
    }
    if (pathname === '/products') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          products: [
            product,
            advancedProduct,
            halfHalfProduct,
            completeProduct,
            defaultedProduct,
            comboProduct,
          ],
        }),
      });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  await page.addInitScript(() => localStorage.clear());
}

async function enterMenu(page: Page) {
  const menuButton = page
    .getByRole('region', { name: 'Promoções do restaurante' })
    .getByRole('button', { name: 'Ver cardápio' });
  if (await menuButton.count()) await menuButton.click();
}

async function openConfigurator(page: Page, path = '/restaurante-teste') {
  await page.goto(path);
  await enterMenu(page);

  await expect(page.getByText('Produto artesanal').first()).toBeVisible();
  await page.getByRole('button', { name: 'Ver detalhes de Produto artesanal' }).click();
  await expect(page.getByRole('dialog', { name: 'Montar Produto artesanal' })).toBeVisible();
}

async function openCartAfterAddition(page: Page) {
  const checkout = page.getByRole('dialog', { name: 'Finalizar pedido' });
  await expect(checkout).toBeHidden();

  const flyPreview = page.locator('[data-cart-fly-preview]');
  await expect(flyPreview).toBeVisible();

  const cartButton = page.getByRole('button', { name: /Meu Carrinho, [1-9]\d* (?:item|itens)/ });
  await expect(cartButton).toBeVisible();
  await cartButton.click();
  await expect(checkout).toBeVisible();
  return checkout;
}

test('wheel do mouse rola o configurador no desktop', async ({ page }) => {
  await mockStorefront(page);
  await page.setViewportSize({ width: 1440, height: 800 });
  await page.goto('/restaurante-teste');
  await enterMenu(page);

  await page.getByRole('button', { name: 'Ver detalhes de Pizza Meio a Meio' }).click();
  const dialog = page.getByRole('dialog', { name: 'Montar Pizza Meio a Meio' });
  await expect(dialog).toBeVisible();

  const before = await dialog.evaluate((element) => ({
    scrollTop: element.scrollTop,
    scrollHeight: element.scrollHeight,
    clientHeight: element.clientHeight,
    overflowY: getComputedStyle(element).overflowY,
  }));

  expect(before.scrollHeight).toBeGreaterThan(before.clientHeight);
  expect(before.overflowY).toBe('auto');

  const box = await dialog.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move((box?.x || 0) + (box?.width || 0) / 2, (box?.y || 0) + 300);
  await page.mouse.wheel(0, 700);

  await expect
    .poll(() => dialog.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(0);
});

test('produto personalizado segue o novo layout em desktop e mobile', async ({ page }) => {
  await mockStorefront(page);

  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/restaurante-teste');
    await enterMenu(page);

    await page.getByRole('button', { name: 'Ver detalhes de Produto artesanal' }).click();
    const dialog = page.getByRole('dialog', { name: 'Montar Produto artesanal' });

    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'Produto artesanal' })).toBeVisible();
    await expect(dialog.getByText('Escolha a base', { exact: true })).toBeVisible();
    await expect(dialog.getByText('Adicionais', { exact: true })).toBeVisible();
    await expect(dialog.getByText('Alguma observação?', { exact: true })).toBeVisible();
    await expect(
      dialog.getByPlaceholder('Ex: sem cebola, maionese à parte...'),
    ).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Adicionar à sacola' })).toContainText(
      'Continuar',
    );

    if (viewport.width <= 620) {
      await expect(dialog.getByRole('button', { name: 'Voltar ao cardápio' })).toBeVisible();
    }

    const state = await dialog.evaluate((element) => ({
      overflow: element.scrollWidth - element.clientWidth,
      documentOverflow: document.documentElement.scrollWidth - window.innerWidth,
    }));
    expect(state.overflow).toBeLessThanOrEqual(1);
    expect(state.documentOverflow).toBeLessThanOrEqual(1);

    if (viewport.width <= 620) {
      await dialog.getByRole('button', { name: 'Voltar ao cardápio' }).click();
    } else {
      await page.keyboard.press('Escape');
    }
    await expect(dialog).toBeHidden();
  }
});

test('pizza meio a meio exige as duas metades no fluxo real em desktop e mobile', async ({ page }) => {
  await mockStorefront(page);

  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/restaurante-teste');
    await enterMenu(page);

    await page.getByRole('button', { name: 'Ver detalhes de Pizza Meio a Meio' }).click();
    const dialog = page.getByRole('dialog', { name: 'Montar Pizza Meio a Meio' });
    await expect(dialog).toBeVisible();

    const halves = dialog.getByLabel('Escolha das duas metades');
    await expect(halves.getByText('1ª Metade')).toBeVisible();
    await expect(halves.getByText('2ª Metade')).toBeVisible();
    await expect(halves.getByText('Obrigatório', { exact: true })).toHaveCount(2);

    const submit = dialog.getByRole('button', { name: 'Adicionar à sacola' });
    await expect(submit).toBeDisabled();
    await expect(halves).toContainText('Selecione as duas metades obrigatórias');

    await halves.locator('input[name="half-0"][value="6001"]').check({ force: true });
    await expect(halves.getByText('✓ Selecionado', { exact: true })).toHaveCount(1);
    await expect(halves.getByText('Obrigatório', { exact: true })).toHaveCount(1);
    await expect(submit).toBeDisabled();

    await halves.locator('input[name="half-1"][value="6003"]').check({ force: true });
    await expect(halves.getByText('✓ Selecionado', { exact: true })).toHaveCount(2);
    await expect(submit).toBeEnabled();
    await expect(submit).toContainText('R$ 44,00');

    const layoutState = await dialog.evaluate((element) => ({
      horizontalOverflow: element.scrollWidth - element.clientWidth,
      documentOverflow: document.documentElement.scrollWidth - window.innerWidth,
    }));
    expect(layoutState.horizontalOverflow).toBeLessThanOrEqual(1);
    expect(layoutState.documentOverflow).toBeLessThanOrEqual(1);

    await submit.click();
    const cart = await openCartAfterAddition(page);
    await expect(cart.getByText('Pizza Meio a Meio', { exact: true })).toBeVisible();
    await expect(cart).toContainText('Calabresa');
    await expect(cart).toContainText('Frango com Catupiry');
    await expect(cart).toContainText('44,00');

    await page.keyboard.press('Escape');
    await expect(cart).toBeHidden();
  }
});

test('cliente monta o produto antes de adicioná-lo à sacola', async ({ page }) => {
  await mockStorefront(page);
  await openConfigurator(page);
  const dialog = page.getByRole('dialog', { name: 'Montar Produto artesanal' });
  const baseFineOption = dialog.locator('label').filter({ hasText: 'Base fina' });
  const baseThickOption = dialog.locator('label').filter({ hasText: 'Base grossa' });

  await expect(baseFineOption.locator('img')).toHaveCount(1);
  await expect(baseFineOption.locator('img')).toHaveAttribute('src', /^data:image\/png;base64,/u);
  await expect(baseThickOption.locator('img')).toHaveCount(0);

  await dialog.getByRole('button', { name: /Adicionar/ }).click();
  await expect(page.getByText(/Escolha 1 opção/).last()).toBeVisible();
  await page.getByText('Base grossa').click();
  await page.getByText('Queijo especial').click();
  await page.getByTestId('product-configurator-observation').locator('textarea').fill('Embalagem separada');
  await expect(page.getByText('R$ 38,00').last()).toBeVisible();
  const addButton = dialog.getByRole('button', { name: 'Adicionar à sacola' });
  await expect(addButton).toHaveAccessibleDescription('R$ 38,00');
  await addButton.click();

  await openCartAfterAddition(page);
  await expect(page.getByText('Base grossa')).toBeVisible();
  await expect(page.getByText('Queijo especial')).toBeVisible();
  await expect(page.getByText('Embalagem separada')).toBeVisible();
});

test('produto COMPLETE é adicionado sem abrir etapas de montagem', async ({ page }) => {
  await mockStorefront(page);
  await page.goto('/restaurante-teste');
  await enterMenu(page);

  await page.getByRole('button', { name: 'Ver detalhes de Refrigerante pronto' }).click();

  await expect(page.getByRole('dialog', { name: 'Montar Refrigerante pronto' })).toHaveCount(0);
  const cart = await openCartAfterAddition(page);
  await expect(cart.getByText('Refrigerante pronto', { exact: true })).toBeVisible();
});

test('resumo do carrinho não fica fixo e permite limpar todos os itens', async ({ page }) => {
  await mockStorefront(page);
  await page.setViewportSize({ width: 1440, height: 800 });
  await page.goto('/restaurante-teste');
  await enterMenu(page);

  await page.getByRole('button', { name: 'Ver detalhes de Refrigerante pronto' }).click();
  const cart = await openCartAfterAddition(page);

  const summary = cart.locator('aside').filter({ hasText: 'Resumo do Pedido' });
  await expect(summary).toBeVisible();
  await expect
    .poll(() => summary.evaluate((element) => getComputedStyle(element).position))
    .not.toBe('sticky');

  await cart.getByRole('button', { name: 'Limpar todo o carrinho' }).click();

  await expect(cart.getByText('Seu carrinho está vazio.')).toBeVisible();
  await expect(page.getByRole('button', { name: /Meu Carrinho, [1-9]\d* (?:item|itens)/ })).toHaveCount(0);
});

test('barra inferior da home do delivery fica fixa somente no mobile', async ({ page }) => {
  await mockStorefront(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/restaurante-teste');
  await enterMenu(page);

  const mobileNav = page.getByRole('navigation', { name: 'Navegação principal' });
  await expect(mobileNav).toBeVisible();
  await expect.poll(() => mobileNav.evaluate((element) => getComputedStyle(element).position)).toBe('fixed');

  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(mobileNav).toBeHidden();
});

test('combo confirmado sempre dispara fly to cart', async ({ page }) => {
  await mockStorefront(page);
  await page.goto('/restaurante-teste');
  await enterMenu(page);

  await page.getByRole('button', { name: 'Ver detalhes de Combo Lanche' }).click();
  const dialog = page.getByRole('dialog', { name: 'Montar Combo Lanche' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Lanche principal', { exact: true })).toBeVisible();

  await dialog.getByRole('button', { name: 'Adicionar combo à sacola' }).click();
  await expect(page.locator('[data-cart-fly-preview]')).toBeVisible();

  const cart = await openCartAfterAddition(page);
  await expect(cart.getByText('Combo Lanche', { exact: true })).toBeVisible();
});

test('aplica defaultSelected e impede remover opção locked', async ({ page }) => {
  await mockStorefront(page);
  await page.goto('/restaurante-teste');
  await enterMenu(page);
  await page.getByRole('button', { name: 'Ver detalhes de Produto com escolhas iniciais' }).click();

  const dialog = page.getByRole('dialog', { name: 'Montar Produto com escolhas iniciais' });
  const defaultOption = dialog.getByRole('checkbox', { name: /Molho padrão/ });
  const lockedOption = dialog.getByRole('checkbox', { name: /Embalagem fixa/ });
  await expect(defaultOption).toBeChecked();
  await expect(lockedOption).toBeChecked();
  await expect(lockedOption).toBeDisabled();

  await dialog.getByText('Molho padrão', { exact: true }).click();
  await expect(defaultOption).not.toBeChecked();
  await expect(lockedOption).toBeChecked();
  await dialog.getByRole('button', { name: 'Adicionar à sacola' }).click();

  await openCartAfterAddition(page);
  await expect(page.getByText('Embalagem fixa')).toBeVisible();
});

test('trocar de produto limpa seleção, quantidade e observação anteriores', async ({ page }) => {
  await mockStorefront(page);
  await openConfigurator(page);
  let dialog = page.getByRole('dialog', { name: 'Montar Produto artesanal' });
  await dialog.getByText('Base grossa').click();
  await dialog.getByTestId('product-configurator-observation').locator('textarea').fill('Não reutilizar');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();

  await page.getByRole('button', { name: 'Ver detalhes de Pizza em porções' }).click();
  dialog = page.getByRole('dialog', { name: 'Montar Pizza em porções' });
  await expect(dialog.getByRole('checkbox', { name: /Bacon/ })).not.toBeChecked();
  await expect(dialog.getByTestId('product-configurator-observation').locator('textarea')).toHaveValue('');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();

  await page.getByRole('button', { name: 'Ver detalhes de Produto artesanal' }).click();
  dialog = page.getByRole('dialog', { name: 'Montar Produto artesanal' });
  await expect(dialog.getByRole('radio', { name: /Base grossa/ })).not.toBeChecked();
  await expect(dialog.getByTestId('product-configurator-observation').locator('textarea')).toHaveValue('');
});

test('configurador mantém observação e CTA no fluxo em telas menores', async ({ page }) => {
  await mockStorefront(page);
  await page.setViewportSize({ width: 320, height: 568 });
  await openConfigurator(page);

  const dialog = page.getByTestId('product-configurator');
  const observation = page.getByTestId('product-configurator-observation');
  const footer = page.getByTestId('product-configurator-footer');
  await expect
    .poll(() => dialog.evaluate((element) => getComputedStyle(element).transform))
    .toBe('none');
  const viewports = [
    { label: '320x568', width: 320, height: 568 },
    { label: '360x640', width: 360, height: 640 },
    { label: '390x844', width: 390, height: 844 },
    { label: '440x956', width: 440, height: 956 },
    { label: '768x1024', width: 768, height: 1024 },
    { label: '768x420 landscape', width: 768, height: 420 },
  ];

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await dialog.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });

    await expect(observation, `${viewport.label}: observação alcançável`).toBeVisible();
    await expect(footer, `${viewport.label}: CTA alcançável`).toBeVisible();

    const [dialogBox, observationBox, footerBox] = await Promise.all([
      dialog.boundingBox(),
      observation.boundingBox(),
      footer.boundingBox(),
    ]);
    expect(dialogBox, `${viewport.label}: limites do configurador`).not.toBeNull();
    expect(observationBox, `${viewport.label}: limites da observação`).not.toBeNull();
    expect(footerBox, `${viewport.label}: limites do CTA`).not.toBeNull();

    if (!dialogBox || !observationBox || !footerBox) continue;

    expect(
      footerBox.y,
      `${viewport.label}: CTA deve vir depois da observação sem cobri-la`,
    ).toBeGreaterThanOrEqual(observationBox.y + observationBox.height - 1);
    expect(footerBox.x, `${viewport.label}: CTA dentro da margem esquerda`).toBeGreaterThanOrEqual(
      dialogBox.x - 1,
    );
    expect(
      footerBox.x + footerBox.width,
      `${viewport.label}: CTA dentro da margem direita`,
    ).toBeLessThanOrEqual(dialogBox.x + dialogBox.width + 1);
    expect(
      footerBox.y + footerBox.height,
      `${viewport.label}: CTA completamente visível`,
    ).toBeLessThanOrEqual(viewport.height + 1);

    const responsiveState = await dialog.evaluate((element) => {
      const configuredFooter = element.querySelector('[data-testid="product-configurator-footer"]');
      return {
        horizontalOverflow: element.scrollWidth - element.clientWidth,
        documentOverflow: document.documentElement.scrollWidth - window.innerWidth,
        footerPosition: configuredFooter ? getComputedStyle(configuredFooter).position : '',
      };
    });
    expect(
      responsiveState.horizontalOverflow,
      `${viewport.label}: sem rolagem horizontal no configurador`,
    ).toBeLessThanOrEqual(1);
    expect(
      responsiveState.documentOverflow,
      `${viewport.label}: sem rolagem horizontal na página`,
    ).toBeLessThanOrEqual(1);
    expect(responsiveState.footerPosition, `${viewport.label}: CTA no fluxo`).toBe('static');
  }
});

test('cliente define quantidade, retirada e opções por porção', async ({ page }) => {
  await mockStorefront(page);
  await page.goto('/restaurante-teste');
  await enterMenu(page);
  await page.getByRole('button', { name: 'Ver detalhes de Pizza em porções' }).click();

  const dialog = page.getByRole('dialog', { name: 'Montar Pizza em porções' });
  await dialog.getByRole('checkbox', { name: /Cebola/ }).check();
  await dialog.getByText('Bacon', { exact: true }).click();
  const increaseBacon = dialog.getByRole('button', { name: 'Aumentar quantidade de Bacon' });
  const decreaseBacon = dialog.getByRole('button', { name: 'Diminuir quantidade de Bacon' });
  await expect(decreaseBacon).toBeDisabled();
  await increaseBacon.click();
  await increaseBacon.click();
  await expect(increaseBacon).toBeDisabled();
  await decreaseBacon.click();
  await dialog.getByLabel('Opção').nth(0).selectOption('4001');
  await dialog.getByLabel('Opção').nth(1).selectOption('4002');
  await dialog.getByLabel('Observação da porção').nth(1).fill('Bem assada');

  await expect(dialog.getByText('R$ 50,00').last()).toBeVisible();
  await dialog.getByRole('button', { name: /Adicionar/ }).click();

  await openCartAfterAddition(page);
  await expect(page.getByText('2x Bacon')).toBeVisible();
  await expect(page.getByText(/Porção 1:.*Calabresa/)).toBeVisible();
  await expect(page.getByText(/Porção 2:.*Especial.*Bem assada/)).toBeVisible();
  await expect(page.getByText('Retirar: Cebola')).toBeVisible();
});
