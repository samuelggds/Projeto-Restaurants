import { expect, test, type Page } from '@playwright/test';

type TestState = {
  product: Record<string, unknown>;
  coupons: Array<Record<string, unknown>>;
  discountPayload: Record<string, unknown> | null;
  couponPayload: Record<string, unknown> | null;
  deletedCouponId: string | null;
};

async function mockAdminApi(page: Page, state: TestState) {
  await page.route(/^http:\/\/(127\.0\.0\.1|localhost):3000\/.*$/, async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    const method = request.method();

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
    if (pathname === '/products' && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ products: [state.product] }),
      });
      return;
    }
    if (pathname === '/products/101/discount' && method === 'PUT') {
      state.discountPayload = request.postDataJSON() as Record<string, unknown>;
      const type = String(state.discountPayload.kind);
      const value = Number(state.discountPayload.value);
      const originalBasePrice = 50;
      const discountAmount = type === 'PERCENTAGE' ? originalBasePrice * (value / 100) : value;
      state.product = {
        ...state.product,
        discount: {
          id: 31,
          restaurantId: 9,
          productId: 101,
          kind: type,
          value,
          label: state.discountPayload.label,
          active: state.discountPayload.active,
          startsAt: state.discountPayload.startsAt ?? null,
          endsAt: state.discountPayload.endsAt ?? null,
        },
        pricing: {
          originalBasePrice,
          effectiveBasePrice: originalBasePrice - discountAmount,
          discountAmount,
          discountPercentage: type === 'PERCENTAGE' ? value : 0,
          badgeLabel: state.discountPayload.label,
          active: true,
        },
      };
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      return;
    }
    if (pathname === '/products/101/discount' && method === 'DELETE') {
      state.product = { ...state.product, discount: null, pricing: null };
      await route.fulfill({ status: 204, body: '' });
      return;
    }
    if (pathname === '/coupons' && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ coupons: state.coupons }),
      });
      return;
    }
    if (pathname === '/coupons' && method === 'POST') {
      state.couponPayload = request.postDataJSON() as Record<string, unknown>;
      state.coupons = [{ id: 77, ...state.couponPayload }];
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(state.coupons[0]),
      });
      return;
    }
    if (pathname === '/coupons/77' && method === 'PUT') {
      const payload = request.postDataJSON() as Record<string, unknown>;
      state.coupons = [{ id: 77, ...payload }];
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      return;
    }
    if (pathname === '/coupons/77' && method === 'DELETE') {
      state.deletedCouponId = '77';
      state.coupons = [];
      await route.fulfill({ status: 204, body: '' });
      return;
    }

    const responses: Record<string, unknown> = {
      '/orders': { orders: [] },
      '/ingredients': { ingredients: [] },
      '/categories': { categories: [{ id: 10, name: 'Principais', active: true }] },
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
    localStorage.setItem('token', 'e2e-admin-token');
    localStorage.setItem(
      'user',
      JSON.stringify({ id: 9, name: 'Admin Teste', role: 'ADMIN', restaurantId: 9 }),
    );
  });
}

function initialState(): TestState {
  return {
    product: {
      id: 101,
      name: 'Prato artesanal',
      description: 'Prepare do seu jeito.',
      price: 50,
      active: true,
      stock: null,
      categoryId: 10,
      category: { id: 10, name: 'Principais' },
      discount: null,
      pricing: {
        originalBasePrice: 50,
        effectiveBasePrice: 50,
        discountAmount: 0,
        discountPercentage: 0,
        active: false,
      },
      optionGroups: [],
    },
    coupons: [],
    discountPayload: null,
    couponPayload: null,
    deletedCouponId: null,
  };
}

test('admin cadastra desconto e benefício de fidelidade com confirmação do sistema', async ({
  page,
}) => {
  const state = initialState();
  await mockAdminApi(page, state);
  await page.goto('/admin');

  await page.getByRole('button', { name: 'Configurações' }).click();
  await page.getByRole('button', { name: 'Descontos e fidelidade' }).click();
  await expect(
    page.getByRole('heading', { name: 'Descontos que vendem e fidelizam' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Salvar alterações' })).toHaveCount(0);

  await page.getByLabel('Produto que receberá o desconto').selectOption('101');
  await page.getByLabel('Valor do desconto').fill('20');
  await page.getByPlaceholder('Ex.: Oferta especial ou 20% OFF').fill('20% de desconto');
  await page.getByRole('button', { name: 'Salvar oferta' }).click();

  await expect
    .poll(() => state.discountPayload)
    .toMatchObject({
      kind: 'PERCENTAGE',
      value: 20,
      label: '20% de desconto',
      active: true,
    });
  await expect(page.getByText('Ativo na Home')).toBeVisible();
  await expect(page.getByText(/R\$\s*50,00 → R\$\s*40,00/)).toBeVisible();

  await page.getByRole('tab', { name: 'Cupons de fidelidade' }).click();
  await expect(page.getByText('Pedido é entregue')).toBeVisible();
  await expect(page.getByText('Atinge a meta')).toBeVisible();
  await expect(page.getByText('Resgata o cupom')).toBeVisible();
  await expect(page.getByText('Usa no checkout')).toBeVisible();

  await page.getByPlaceholder('Ex.: CLIENTE-FIEL').fill('cliente fiel');
  await page.getByPlaceholder('Ex.: Recompensa cliente fiel').fill('Recompensa cliente fiel');
  await page
    .getByPlaceholder('Ex.: Complete 5 pedidos pagos e entregues e ganhe 15%.')
    .fill('Complete 5 pedidos pagos e entregues para liberar o benefício.');
  await page
    .getByRole('spinbutton', { name: 'Pedidos pagos e entregues para liberar', exact: true })
    .fill('5');
  await page.getByRole('button', { name: 'Salvar benefício' }).click();

  await expect
    .poll(() => state.couponPayload)
    .toMatchObject({
      code: 'CLIENTE-FIEL',
      title: 'Recompensa cliente fiel',
      discountType: 'PERCENTAGE',
      discount: 10,
      loyaltyPurchasesRequired: 5,
      perCustomerLimit: 1,
      redemptionValidityDays: 30,
      active: true,
    });
  const deleteCouponButton = page.getByRole('button', {
    name: 'Excluir Recompensa cliente fiel',
  });
  await expect(deleteCouponButton).toBeVisible();

  await deleteCouponButton.click();
  await expect(page.getByRole('dialog')).toContainText('Excluir benefício de fidelidade?');
  await page.getByRole('button', { name: 'Excluir benefício' }).click();
  await expect.poll(() => state.deletedCouponId).toBe('77');
});

test('seletor de configurações e campanhas ficam contidos no celular', async ({ page }) => {
  const state = initialState();
  await page.setViewportSize({ width: 390, height: 844 });
  await mockAdminApi(page, state);
  await page.goto('/admin');

  await page.getByRole('button', { name: 'Abrir menu administrativo' }).click();
  await page.getByRole('button', { name: 'Configurações' }).click();
  const settingsNav = page.getByRole('navigation', { name: 'Seções das configurações' });
  await expect(settingsNav).toBeVisible();
  await settingsNav.getByRole('button', { name: 'Descontos e fidelidade' }).click();
  await expect(
    page.getByRole('heading', { name: 'Descontos que vendem e fidelizam' }),
  ).toBeVisible();

  const layout = await page.locator('main').evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth + 1);

  await page.getByRole('tab', { name: 'Cupons de fidelidade' }).click();
  await expect(page.getByText('Pedido é entregue')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Salvar benefício' })).toBeVisible();
});
