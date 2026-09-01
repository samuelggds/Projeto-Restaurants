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
          ingredient: { id: 1, name: 'Base fina', price: 0, active: true },
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
          products: [product, advancedProduct, completeProduct, defaultedProduct],
        }),
      });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  await page.addInitScript(() => localStorage.clear());
}

async function openConfigurator(page: Page, path = '/restaurante-teste') {
  await page.goto(path);

  await expect(page.getByText('Produto artesanal').first()).toBeVisible();
  await page.getByRole('button', { name: 'Ver detalhes de Produto artesanal' }).click();
  await expect(page.getByRole('dialog', { name: 'Montar Produto artesanal' })).toBeVisible();
}

test('cliente monta o produto antes de adicioná-lo à sacola', async ({ page }) => {
  await mockStorefront(page);
  await openConfigurator(page);
  const dialog = page.getByRole('dialog', { name: 'Montar Produto artesanal' });

  await dialog.getByRole('button', { name: /Adicionar/ }).click();
  await expect(page.getByText(/Escolha 1 opção/).last()).toBeVisible();
  await page.getByText('Base grossa').click();
  await page.getByText('Queijo especial').click();
  await page.getByPlaceholder(/Adicione aqui uma observação/).fill('Embalagem separada');
  await expect(page.getByText('R$ 38,00').last()).toBeVisible();
  await dialog.getByRole('button', { name: /Adicionar/ }).click();

  await expect(page.getByRole('heading', { name: 'Minha sacola' })).toBeVisible();
  await expect(page.getByText('Base grossa')).toBeVisible();
  await expect(page.getByText('Queijo especial')).toBeVisible();
  await expect(page.getByText('Embalagem separada')).toBeVisible();
});

test('produto COMPLETE é adicionado sem abrir etapas de montagem', async ({ page }) => {
  await mockStorefront(page);
  await page.goto('/restaurante-teste');

  await page.getByRole('button', { name: 'Ver detalhes de Refrigerante pronto' }).click();

  await expect(page.getByRole('dialog', { name: 'Montar Refrigerante pronto' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Minha sacola' })).toBeVisible();
  await expect(
    page.getByRole('complementary').getByText('Refrigerante pronto', { exact: true }),
  ).toBeVisible();
});

test('aplica defaultSelected e impede remover opção locked', async ({ page }) => {
  await mockStorefront(page);
  await page.goto('/restaurante-teste');
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

  await expect(page.getByRole('heading', { name: 'Minha sacola' })).toBeVisible();
  await expect(page.getByText('Embalagem fixa')).toBeVisible();
});

test('trocar de produto limpa seleção, quantidade e observação anteriores', async ({ page }) => {
  await mockStorefront(page);
  await openConfigurator(page);
  let dialog = page.getByRole('dialog', { name: 'Montar Produto artesanal' });
  await dialog.getByText('Base grossa').click();
  await dialog.getByPlaceholder(/Adicione aqui uma observação/).fill('Não reutilizar');
  await dialog.getByRole('button', { name: 'Voltar ao cardápio' }).click();

  await page.getByRole('button', { name: 'Ver detalhes de Pizza em porções' }).click();
  dialog = page.getByRole('dialog', { name: 'Montar Pizza em porções' });
  await expect(dialog.getByRole('checkbox', { name: /Bacon/ })).not.toBeChecked();
  await expect(dialog.getByPlaceholder(/Adicione aqui uma observação/)).toHaveValue('');
  await dialog.getByRole('button', { name: 'Voltar ao cardápio' }).click();

  await page.getByRole('button', { name: 'Ver detalhes de Produto artesanal' }).click();
  dialog = page.getByRole('dialog', { name: 'Montar Produto artesanal' });
  await expect(dialog.getByRole('radio', { name: /Base grossa/ })).not.toBeChecked();
  await expect(dialog.getByPlaceholder(/Adicione aqui uma observação/)).toHaveValue('');
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

  await expect(page.getByRole('heading', { name: 'Minha sacola' })).toBeVisible();
  await expect(page.getByText('2x Bacon')).toBeVisible();
  await expect(page.getByText(/Porção 1:.*Calabresa/)).toBeVisible();
  await expect(page.getByText(/Porção 2:.*Especial.*Bem assada/)).toBeVisible();
  await expect(page.getByText('Retirar: Cebola')).toBeVisible();
});
