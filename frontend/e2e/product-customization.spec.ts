import { expect, test, type Page } from '@playwright/test';

const product = {
  id: 101,
  name: 'Produto artesanal',
  description: 'Monte exatamente como preferir.',
  price: 30,
  active: true,
  stock: null,
  category: { name: 'Principais' },
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
        body: JSON.stringify({ products: [product] }),
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

  await page.getByRole('button', { name: 'Adicionar à sacola' }).click();
  await expect(page.getByText(/Escolha 1 opção/).last()).toBeVisible();
  await page.getByText('Base grossa').click();
  await page.getByText('Queijo especial').click();
  await page.getByPlaceholder(/cortar ao meio/).fill('Embalagem separada');
  await expect(page.getByText('R$ 38,00').last()).toBeVisible();
  await page.getByRole('button', { name: 'Adicionar à sacola' }).click();

  await expect(page.getByRole('heading', { name: 'Minha sacola' })).toBeVisible();
  await expect(page.getByText('Base grossa')).toBeVisible();
  await expect(page.getByText('Queijo especial')).toBeVisible();
  await expect(page.getByText('Embalagem separada')).toBeVisible();
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
