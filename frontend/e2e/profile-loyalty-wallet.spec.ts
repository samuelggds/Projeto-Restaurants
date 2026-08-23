import { expect, test } from '@playwright/test';

test('cliente consulta cupons válidos, histórico e o novo ciclo no perfil', async ({ page }) => {
  let loyaltyRestaurantId = '';
  const quotePayloads: Array<Record<string, unknown>> = [];

  await page.route(/^http:\/\/(127\.0\.0\.1|localhost):3000\/.*$/, async (route) => {
    const url = new URL(route.request().url());
    const { pathname } = url;

    if (pathname === '/auth/me') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 22,
            name: 'Cliente Teste',
            email: 'cliente@teste.com',
            role: 'CLIENTE',
            restaurantId: 9,
          },
        }),
      });
      return;
    }

    if (
      pathname === '/settings/public/9' ||
      pathname === '/settings/public/slug/restaurante-teste'
    ) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          restaurantId: 9,
          restaurantName: 'North Pizza',
          primaryColor: '#d05632',
          restaurant: { id: 9, name: 'North Pizza', slug: 'restaurante-teste' },
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
            {
              id: 101,
              name: 'Prato artesanal',
              description: 'Prepare do seu jeito.',
              price: 40,
              active: true,
              stock: null,
              category: { name: 'Principais' },
              optionGroups: [],
            },
          ],
        }),
      });
      return;
    }

    if (pathname === '/orders/my-orders') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
      return;
    }

    if (pathname === '/customer-addresses') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ addresses: [] }),
      });
      return;
    }

    if (pathname === '/favorites') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ favorites: [] }),
      });
      return;
    }

    if (pathname === '/coupons/loyalty') {
      loyaltyRestaurantId = url.searchParams.get('restaurantId') || '';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          restaurantId: 9,
          purchasesCompleted: 0,
          rewards: [
            {
              coupon: {
                id: 7,
                code: 'CLIENTE10',
                title: '10% de desconto',
                description: 'Recompensa por dez pedidos entregues.',
                discountType: 'PERCENTAGE',
                discount: 10,
                minimumSubtotal: 30,
                redemptionValidityDays: 30,
              },
              purchasesCompleted: 0,
              purchasesRequired: 10,
              remaining: 10,
              progressPercent: 0,
              canRedeem: false,
              redemptions: [
                {
                  id: 73,
                  cycle: 3,
                  status: 'CLAIMED',
                  expiresAt: '2099-09-22T12:00:00.000Z',
                  expired: false,
                },
                {
                  id: 72,
                  cycle: 2,
                  status: 'USED',
                  expiresAt: '2099-08-22T12:00:00.000Z',
                  expired: false,
                },
              ],
            },
          ],
          redemptions: [
            {
              id: 74,
              cycle: 2,
              status: 'CLAIMED',
              expiresAt: '2099-10-22T12:00:00.000Z',
              expired: false,
              coupon: {
                id: 8,
                code: 'ANTIGO5',
                title: 'Campanha anterior',
                description: 'Cupom emitido antes de a campanha ser pausada.',
                discountType: 'PERCENTAGE',
                discount: 5,
                minimumSubtotal: 0,
                loyaltyPurchasesRequired: 10,
                perCustomerLimit: 2,
              },
            },
            {
              id: 71,
              cycle: 1,
              status: 'EXPIRED',
              expiresAt: '2025-08-22T12:00:00.000Z',
              expired: true,
              coupon: {
                id: 8,
                code: 'ANTIGO5',
                title: 'Campanha anterior',
                description: 'Benefício de uma campanha já encerrada.',
                discountType: 'PERCENTAGE',
                discount: 5,
                minimumSubtotal: 0,
              },
            },
          ],
        }),
      });
      return;
    }

    if (pathname === '/orders/quote' && route.request().method() === 'POST') {
      quotePayloads.push(route.request().postDataJSON() as Record<string, unknown>);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          itemsSubtotal: 40,
          productDiscountTotal: 0,
          couponDiscount: 2,
          deliveryFeeAmount: 0,
          total: 38,
          couponCode: 'ANTIGO5',
        }),
      });
      return;
    }

    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });

  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('token', 'e2e-customer-token');
    localStorage.setItem(
      'user',
      JSON.stringify({
        id: 22,
        name: 'Cliente Teste',
        email: 'cliente@teste.com',
        role: 'CLIENTE',
        restaurantId: 9,
      }),
    );
    localStorage.setItem('menuRestaurantId', '9');
    localStorage.setItem('cartRestaurantId', '9');
    localStorage.setItem(
      'cartItems:9',
      JSON.stringify([
        {
          productId: '101',
          name: 'Prato artesanal',
          price: 40,
          quantity: 1,
          image: '',
          selectedOptionIds: [],
          selectedOptions: [],
        },
      ]),
    );
  });

  await page.goto('/profile');
  await page.getByRole('button', { name: 'Meus cupons', exact: true }).first().click();

  const wallet = page.getByRole('region', { name: 'Carteira de cupons' });
  await expect(wallet).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Seus cupons, sempre à mão' })).toBeVisible();
  await expect(wallet.getByText('CLIENTE10')).toBeVisible();
  await expect(wallet.getByText('Disponível', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('0/10')).toBeVisible();
  await expect(page.getByText('Faltam 10 pedidos pagos e entregues.')).toBeVisible();
  expect(loyaltyRestaurantId).toBe('9');

  await wallet.getByRole('button', { name: 'Histórico (2)' }).click();
  await expect(wallet.getByText('Utilizado', { exact: true })).toBeVisible();
  await expect(wallet.getByText('Expirado', { exact: true })).toBeVisible();
  await expect(wallet.getByText('ANTIGO5')).toBeVisible();

  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    const metrics = await wallet.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return {
        left: rect.left,
        right: rect.right,
        viewportWidth: window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
      };
    });
    expect(metrics.left).toBeGreaterThanOrEqual(-1);
    expect(metrics.right).toBeLessThanOrEqual(metrics.viewportWidth + 1);
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.viewportWidth + 1);
  }

  await wallet.getByRole('button', { name: 'Válidos (2)' }).click();
  await wallet
    .getByRole('button', {
      name: 'Usar Campanha anterior, código ANTIGO5, no próximo pedido',
    })
    .click();
  await expect(page).toHaveURL(/\/restaurante-teste$/);
  await expect(page.getByRole('heading', { name: 'Minha sacola' })).toBeVisible();
  await expect(
    page.getByRole('button', { name: /Campanha anterior.*ANTIGO5.*Aplicado/i }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect
    .poll(() => quotePayloads.find((payload) => payload.couponRedemptionId === 74))
    .toMatchObject({ restaurantId: 9, couponRedemptionId: 74 });
});
