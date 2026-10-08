import { expect, test } from '@playwright/test';

test('visitante vê apenas seus pedidos e o rodapé usa a identidade real do restaurante', async ({
  page,
}) => {
  const guestProof = ['guest', 'proof', '501'].join('-');
  await page.addInitScript((proof) => {
    localStorage.setItem('guest-order-owned-order-ids', JSON.stringify([501]));
    localStorage.setItem('guest-order-ownership-token:501', proof);
  }, guestProof);
  await page.route('https://cdn.example.test/**', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="orange"/></svg>',
    }),
  );

  await page.route(/^http:\/\/(127\.0\.0\.1|localhost):3000\/.*$/, async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname === '/settings/public/slug/restaurante-teste') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          restaurantId: 9,
          primaryColor: '#d05632',
          restaurant: {
            id: 9,
            name: 'North Pizza',
            slug: 'restaurante-teste',
            logo: 'https://cdn.example.test/north-logo.png',
            description: 'Pizzas artesanais.',
          },
        }),
      });
      return;
    }

    if (url.pathname === '/orders/guest-orders' && route.request().method() === 'POST') {
      expect(route.request().postDataJSON()).toMatchObject({
        proofs: [{ orderId: 501, token: guestProof }],
      });
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          total: 1,
          orders: [
            {
              id: 501,
              status: 'PREPARANDO',
              type: 'DELIVERY',
              total: 49.9,
              createdAt: '2099-09-29T12:00:00.000Z',
              items: [
                {
                  quantity: 1,
                  product: {
                    name: 'Pizza Pepperoni',
                    image: 'https://cdn.example.test/pizza.png',
                  },
                },
              ],
            },
          ],
        }),
      });
      return;
    }

    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });

  await page.goto('/restaurante-teste/pedidos');

  await expect(page.getByRole('heading', { name: 'Seus Pedidos Recentes' })).toBeVisible();
  await expect(page.getByText('Pedido #501')).toBeVisible();
  await expect(page.getByText('1x Pizza Pepperoni')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Acompanhar em tempo real' })).toBeVisible();

  const footer = page.locator('footer').last();
  await expect(footer).toContainText('North Pizza');
  await expect(footer.locator('img[src="https://cdn.example.test/north-logo.png"]')).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('heading', { name: 'Acompanhar Pedido' })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(391);
});
