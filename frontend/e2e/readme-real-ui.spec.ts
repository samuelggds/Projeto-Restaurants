import { readFile } from 'node:fs/promises';
import { expect, test, type Page, type Route } from '@playwright/test';
import { mockAuthRefresh } from './helpers/mockAuthRefresh';
import { captureReadmeScreenshot } from './helpers/readmeScreenshot';

const RESTAURANT_ID = 42;

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

const pizzaImages = {
  margherita: 'http://127.0.0.1:3000/readme-pizza-margherita.jpg',
  calabresa: 'http://127.0.0.1:3000/readme-pizza-calabresa.jpg',
  portuguesa: 'http://127.0.0.1:3000/readme-pizza-portuguesa.jpg',
} as const;

const pizzaImageFiles = new Map([
  [
    '/readme-pizza-margherita.jpg',
    new URL('./fixtures/readme/pizza-margherita.jpg', import.meta.url),
  ],
  [
    '/readme-pizza-calabresa.jpg',
    new URL('./fixtures/readme/pizza-calabresa.jpg', import.meta.url),
  ],
  [
    '/readme-pizza-portuguesa.jpg',
    new URL('./fixtures/readme/pizza-portuguesa.jpg', import.meta.url),
  ],
]);

async function mockPublicMenu(page: Page) {
  await page.route(/^http:\/\/(127\.0\.0\.1|localhost):3000\/.*$/, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname;

    const pizzaImageFile = pizzaImageFiles.get(pathname);
    if (pizzaImageFile) {
      return route.fulfill({
        status: 200,
        contentType: 'image/jpeg',
        body: await readFile(pizzaImageFile),
      });
    }
    if (pathname === '/auth/refresh') return json(route, { error: 'Não autenticado.' }, 401);
    if (pathname === '/settings/public/slug/north-pizza/revision') {
      return json(route, { restaurantId: RESTAURANT_ID, revision: 'readme-v1' });
    }
    if (pathname === `/settings/public/${RESTAURANT_ID}/revision`) {
      return json(route, { restaurantId: RESTAURANT_ID, revision: 'readme-v1' });
    }
    if (pathname === `/settings/public/${RESTAURANT_ID}`) {
      return json(route, {
        restaurantId: RESTAURANT_ID,
        restaurantName: 'North Pizza',
        primaryColor: '#d35d3c',
        isOpenForOrders: true,
        acceptsDelivery: true,
        acceptsPickup: true,
        acceptsPix: true,
        acceptsCard: true,
        whatsapp: '5585999999999',
        restaurant: {
          id: RESTAURANT_ID,
          name: 'North Pizza',
          slug: 'north-pizza',
          description: 'Sabor artesanal, tecnologia e uma experiência de pedido completa.',
          coverImage: pizzaImages.margherita,
          logo: null,
          banners: [
            {
              id: 701,
              title: 'Pizza artesanal',
              highlight: 'do forno à sua mesa',
              description: 'Ingredientes frescos e preparo cuidadoso em cada pedido.',
              buttonLabel: 'Ver cardápio',
              image: pizzaImages.calabresa,
              active: true,
              position: 0,
            },
          ],
        },
      });
    }
    if (pathname === '/products') {
      return json(route, {
        products: [
          {
            id: 1,
            name: 'Pizza Margherita',
            description: 'Molho artesanal, muçarela, tomate e manjericão.',
            price: 55.9,
            image: pizzaImages.margherita,
            active: true,
            stock: null,
            saleMode: 'COMPLETE',
            categoryId: 10,
            category: { id: 10, name: 'Pizzas' },
            optionGroups: [],
          },
          {
            id: 2,
            name: 'Pizza Calabresa Especial',
            description: 'Calabresa, cebola roxa, muçarela e toque da casa.',
            price: 62.9,
            image: pizzaImages.calabresa,
            active: true,
            stock: null,
            saleMode: 'COMPLETE',
            categoryId: 10,
            category: { id: 10, name: 'Pizzas' },
            optionGroups: [],
          },
          {
            id: 3,
            name: 'Pizza Portuguesa',
            description: 'Presunto, ovos, cebola, azeitona e muçarela.',
            price: 59.9,
            image: pizzaImages.portuguesa,
            active: true,
            stock: null,
            saleMode: 'COMPLETE',
            categoryId: 10,
            category: { id: 10, name: 'Pizzas' },
            optionGroups: [],
          },
        ],
      });
    }
    if (pathname === '/products/ratings') return json(route, { ratings: [] });
    if (pathname === '/coupons/loyalty') return json(route, null);
    if (pathname === '/orders/quote' && request.method() === 'POST') {
      const payload = request.postDataJSON() as {
        items?: Array<{ productId?: number | string; quantity?: number }>;
      };
      const prices: Record<string, number> = { '1': 55.9, '2': 62.9, '3': 59.9 };
      const itemsSubtotal = (payload.items || []).reduce(
        (total, item) => total + (prices[String(item.productId)] || 0) * Number(item.quantity || 0),
        0,
      );
      return json(route, {
        quote: {
          itemsSubtotal,
          productDiscountTotal: 0,
          couponDiscount: 0,
          deliveryFeeAmount: 0,
          total: itemsSubtotal,
          couponCode: null,
        },
      });
    }
    if (pathname === '/banners') {
      return json(route, [
        {
          id: 701,
          title: 'Pizza artesanal',
          highlight: 'do forno à sua mesa',
          description: 'Ingredientes frescos e preparo cuidadoso em cada pedido.',
          buttonLabel: 'Ver cardápio',
          image: pizzaImages.calabresa,
          active: true,
          position: 0,
        },
      ]);
    }
    if (pathname === '/platform/status') return json(route, { available: true });

    return json(route, {});
  });

  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

async function mockAuthenticatedPublicMenu(page: Page) {
  const customer = {
    id: 501,
    name: 'Cliente Demonstração',
    email: 'cliente@northpizza.test',
    role: 'CLIENTE',
    restaurantId: RESTAURANT_ID,
  };
  const addresses = [
    {
      id: 11,
      label: 'Casa',
      address: 'Rua das Flores',
      number: '10',
      district: 'Centro',
      city: 'Fortaleza',
      state: 'CE',
      zipCode: '60000000',
      isDefault: false,
    },
    {
      id: 12,
      label: 'Casa',
      address: 'Avenida Beira Mar',
      number: '220',
      district: 'Meireles',
      city: 'Fortaleza',
      state: 'CE',
      zipCode: '60165000',
      isDefault: true,
    },
  ];

  await mockPublicMenu(page);
  await page.route(/^http:\/\/(127\.0\.0\.1|localhost):3000\/.*$/, async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === '/auth/me') return json(route, { user: customer });
    if (pathname === '/customer-addresses') return json(route, { addresses });
    if (pathname === '/coupons/loyalty') {
      return json(route, {
        restaurantId: RESTAURANT_ID,
        purchasesCompleted: 2,
        rewards: [
          {
            coupon: {
              id: 7,
              code: 'FIEL25',
              title: 'Cliente fiel',
              description: 'Seu presente por voltar.',
              discountType: 'FIXED',
              discount: 25,
              minimumSubtotal: 0,
              redemptionValidityDays: 30,
            },
            purchasesCompleted: 2,
            purchasesRequired: 5,
            remaining: 3,
            progressPercent: 40,
            canRedeem: false,
            redemptions: [],
          },
        ],
      });
    }
    if (pathname === '/orders/my-orders') {
      return json(route, {
        orders: [
          {
            id: 81,
            type: 'DELIVERY',
            status: 'PRONTO',
            createdAt: '2026-09-02T18:00:00.000Z',
            items: [{ product: { name: 'Pizza Margherita' } }],
          },
        ],
      });
    }
    await route.fallback();
  });
  await mockAuthRefresh(page, customer.id, 'readme-customer-token');
  await page.addInitScript((user) => {
    localStorage.setItem('user', JSON.stringify(user));
  }, customer);
}

async function mockTracking(page: Page) {
  const customer = {
    id: 501,
    name: 'Cliente Demonstração',
    email: 'cliente@northpizza.test',
    phone: '(85) 99999-1234',
    role: 'CLIENTE',
    restaurantId: RESTAURANT_ID,
  };

  await page.route(/^https:\/\/[^/]*tile\.openstreetmap\.org\/.*$/, (route) => route.abort());
  await page.route(/^http:\/\/(127\.0\.0\.1|localhost):3000\/.*$/, async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;

    if (pathname.startsWith('/socket.io/')) return route.abort();
    if (pathname === '/platform/status') return json(route, { available: true });
    if (pathname === '/auth/me') return json(route, { user: customer });
    if (pathname === '/billing/invoices') return json(route, { invoices: [] });
    if (pathname === '/orders/601/tracking') {
      return json(route, {
        order: {
          id: 601,
          restaurantId: RESTAURANT_ID,
          status: 'SAIU_PARA_ENTREGA',
          deliveryStartedAt: new Date(Date.now() - 8 * 60_000).toISOString(),
          deliveredAt: null,
          estimatedArrival: new Date(Date.now() + 12 * 60_000).toISOString(),
          assignedCourier: {
            id: 77,
            name: 'Marcos Entregador',
            phone: '(85) 98888-0000',
          },
          routeEstimate: {
            provider: 'OSRM',
            distanceMeters: 3100,
            durationSeconds: 720,
            destination: { latitude: -3.7319, longitude: -38.5267 },
            routeCoordinates: [
              { latitude: -3.739, longitude: -38.518 },
              { latitude: -3.735, longitude: -38.522 },
              { latitude: -3.7319, longitude: -38.5267 },
            ],
          },
        },
        locations: [
          {
            latitude: -3.739,
            longitude: -38.518,
            recordedAt: new Date(Date.now() - 2 * 60_000).toISOString(),
            speed: 4,
          },
        ],
        latestLocation: {
          latitude: -3.739,
          longitude: -38.518,
          recordedAt: new Date(Date.now() - 2 * 60_000).toISOString(),
        },
      });
    }

    return json(route, {});
  });

  await mockAuthRefresh(page, customer.id, 'readme-customer-token');
  await page.addInitScript((user) => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('user', JSON.stringify(user));
  }, customer);
}

test('captura o cardápio público real para o README', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await mockPublicMenu(page);
  await page.goto('/north-pizza');

  await expect(page.getByText('North Pizza', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Pizza Margherita', { exact: true }).first()).toBeVisible();
  const loginNudge = page.getByRole('region', { name: 'Acompanhe seus pedidos' });
  await page.getByRole('button', { name: 'Dispensar convite de login' }).click();
  await expect(loginNudge).toBeHidden();
  await captureReadmeScreenshot(page, 'customer-menu.png', { fullPage: true });
});

test('cardápio público mantém a hierarquia e os atalhos contidos em 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await mockPublicMenu(page);
  await page.goto('/north-pizza');

  const hero = page.getByRole('region', { name: 'Promoções do restaurante' });
  const menuButton = page.getByRole('button', { name: 'Ver cardápio' });
  const loginNudge = page.getByRole('region', { name: 'Acompanhe seus pedidos' });
  const shortcutsButton = page.getByRole('button', {
    name: 'Abrir atalhos de atendimento e fidelidade',
  });

  await expect(hero).toBeVisible();
  await expect(menuButton).toBeVisible();
  await expect(loginNudge).toBeVisible();
  await expect(shortcutsButton).toBeVisible();
  await shortcutsButton.click();
  const loyaltyButton = page.getByRole('button', { name: /Ganhe descontos/i });
  await expect(loyaltyButton).toBeVisible();
  const heroBox = await hero.boundingBox();
  expect(heroBox?.height).toBeLessThanOrEqual(225);
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(321);

  const [menuBox, loginBox, loyaltyBox] = await Promise.all([
    menuButton.boundingBox(),
    loginNudge.boundingBox(),
    loyaltyButton.boundingBox(),
  ]);
  const overlaps = (
    first: { x: number; y: number; width: number; height: number },
    second: { x: number; y: number; width: number; height: number },
  ) =>
    first.x < second.x + second.width &&
    first.x + first.width > second.x &&
    first.y < second.y + second.height &&
    first.y + first.height > second.y;

  expect(menuBox).not.toBeNull();
  expect(loginBox).not.toBeNull();
  expect(loyaltyBox).not.toBeNull();
  expect(overlaps(menuBox!, loginBox!)).toBe(false);
  expect(overlaps(loginBox!, loyaltyBox!)).toBe(false);

  await page.getByRole('button', { name: 'Minimizar atalhos de atendimento e fidelidade' }).click();
  await page.getByRole('button', { name: 'Dispensar convite de login' }).click();
  const allCategories = page.getByRole('button', { name: 'Todos', exact: true });
  await allCategories.scrollIntoViewIfNeeded();
  const categoryBox = await allCategories.boundingBox();
  expect(categoryBox?.height).toBeLessThanOrEqual(70);
  const lastProductImage = page.getByAltText('Pizza Portuguesa');
  await lastProductImage.scrollIntoViewIfNeeded();
  await expect
    .poll(() => lastProductImage.evaluate((image) => (image as HTMLImageElement).naturalWidth))
    .toBeGreaterThan(0);
  await page.evaluate(() => window.scrollTo(0, 0));
  await captureReadmeScreenshot(page, 'customer-menu-mobile.png', { fullPage: true });
});

test('busca móvel abre compacta com sugestões e devolve o foco ao fechar', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await mockPublicMenu(page);
  await page.goto('/north-pizza');

  const searchTrigger = page.getByRole('button', { name: 'Buscar' });
  await searchTrigger.click();
  const searchDialog = page.getByRole('dialog', { name: 'Buscar no cardápio' });
  await expect(searchDialog).toBeVisible();
  await expect(searchDialog.getByText('Sugestões do cardápio')).toBeVisible();
  await expect(searchDialog.getByRole('button', { name: 'Ver Pizza Margherita' })).toBeVisible();

  const dialogBox = await searchDialog.boundingBox();
  expect(dialogBox?.width).toBeLessThanOrEqual(304);
  expect(dialogBox?.height).toBeLessThanOrEqual(700);
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(321);
  await captureReadmeScreenshot(page, 'customer-search-mobile.png');

  await page.getByRole('searchbox', { name: 'Pesquisar produto pelo nome' }).fill('calabresa');
  await expect(
    searchDialog.getByRole('button', { name: 'Ver Pizza Calabresa Especial' }),
  ).toBeVisible();
  await expect(searchDialog.getByRole('button', { name: 'Ver Pizza Margherita' })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(searchDialog).toBeHidden();
  await expect(searchTrigger).toBeFocused();

  await page.setViewportSize({ width: 768, height: 600 });
  await searchTrigger.click();
  await expect(searchDialog).toBeVisible();
  const desktopDialogBox = await searchDialog.boundingBox();
  expect(desktopDialogBox?.width).toBeLessThanOrEqual(640);
  expect(desktopDialogBox?.height).toBeLessThanOrEqual(560);
  await captureReadmeScreenshot(page, 'customer-search-desktop.png');
});

test('adicionar mantém o cardápio aberto e a sacola reúne os itens em 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await mockPublicMenu(page);
  await page.goto('/north-pizza');
  await page.getByRole('button', { name: 'Dispensar convite de login' }).click();

  const cartTrigger = page.getByRole('button', { name: 'Sacola com 0 itens' });
  await cartTrigger.click();
  const cart = page.getByRole('dialog', { name: 'Minha sacola' });
  await expect(cart).toBeVisible();
  await expect(page.getByText('Sacola vazia')).toBeVisible();
  await expect(cart.getByRole('button', { name: 'Ver cardápio' })).toBeVisible();
  await expect(cart.getByRole('button', { name: 'Fechar sacola' })).toBeFocused();
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('hidden');

  const emptyCartBox = await cart.boundingBox();
  expect(emptyCartBox?.width).toBeLessThanOrEqual(320);
  await page.keyboard.press('Escape');
  await expect(cart).toBeHidden();
  await expect(cartTrigger).toBeFocused();
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('');

  await page.getByRole('button', { name: 'Adicionar Pizza Margherita' }).click();
  await expect(cart).toBeHidden();
  const notices = page.getByLabel('Avisos recentes');
  let addNotice = notices.getByRole('status').filter({ hasText: 'Item adicionado' });
  await expect(addNotice).toHaveCount(1);
  await expect(addNotice).toContainText('Pizza Margherita já está na sacola');
  await expect(addNotice.getByRole('button', { name: 'Ver sacola' })).toBeVisible();

  await page.getByRole('button', { name: 'Adicionar Pizza Calabresa Especial' }).click();
  addNotice = notices.getByRole('status').filter({ hasText: 'Item adicionado' });
  await expect(addNotice).toHaveCount(1);
  await expect(addNotice).toContainText('Pizza Calabresa Especial já está na sacola');
  await expect(page.getByRole('button', { name: 'Sacola com 2 itens' })).toBeVisible();
  await expect(cart).toBeHidden();
  await captureReadmeScreenshot(page, 'customer-add-notice-mobile.png');

  await addNotice.getByRole('button', { name: 'Ver sacola' }).click();
  await expect(cart).toBeVisible();
  await expect(cart.getByText('2 itens', { exact: true })).toBeVisible();
  await expect(cart.getByText('Pizza Margherita', { exact: true })).toBeVisible();
  await expect(cart.getByText('Pizza Calabresa Especial', { exact: true })).toBeVisible();
  await expect(cart.getByRole('button', { name: 'Gerar código Pix' })).toBeVisible();
  await expect(cart.getByLabel('Total do pedido: R$ 118,80')).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(321);
  await captureReadmeScreenshot(page, 'customer-cart-mobile.png');
});

test('seletor móvel distingue endereços repetidos sem ocupar a tela', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await mockAuthenticatedPublicMenu(page);
  await page.goto('/north-pizza');

  const locationTrigger = page.getByRole('button', {
    name: 'Endereço de entrega: Avenida Beira Mar, 220',
  });
  await locationTrigger.click();

  const addressDialog = page.getByRole('dialog', { name: 'Onde deseja receber?' });
  const firstAddress = addressDialog.getByRole('button', {
    name: /Casa: Rua das Flores, 10, Centro • Fortaleza/,
  });
  const selectedAddress = addressDialog.getByRole('button', {
    name: /Casa: Avenida Beira Mar, 220, Meireles • Fortaleza\. Selecionado/,
  });
  await expect(addressDialog).toBeVisible();
  await expect(firstAddress).toHaveAttribute('aria-pressed', 'false');
  await expect(selectedAddress).toHaveAttribute('aria-pressed', 'true');
  await expect(selectedAddress.getByText('Selecionado')).toBeVisible();
  await expect(addressDialog.getByRole('button', { name: 'Fechar endereços' })).toBeVisible();

  const dialogBox = await addressDialog.boundingBox();
  expect(dialogBox?.width).toBeLessThanOrEqual(320);
  expect(dialogBox?.height).toBeLessThanOrEqual(300);
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(321);
  await captureReadmeScreenshot(page, 'customer-addresses-mobile.png');

  await page.keyboard.press('Escape');
  await expect(addressDialog).toBeHidden();
  await expect(locationTrigger).toBeFocused();

  await locationTrigger.click();
  await firstAddress.click();
  await expect(
    page.getByRole('button', { name: 'Endereço de entrega: Rua das Flores, 10' }),
  ).toBeVisible();
});

test('central móvel recolhe benefícios e mostra avisos abaixo do cabeçalho', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await mockAuthenticatedPublicMenu(page);
  await page.goto('/north-pizza');

  const statusToggle = page.getByTestId('customer-coupon-status-toggle');
  const floatingLayer = page.getByTestId('floating-actions-layer');
  await expect(statusToggle).toBeVisible();
  await expect(statusToggle).toHaveAttribute('aria-expanded', 'false');
  const collapsedBox = await statusToggle.boundingBox();
  expect(collapsedBox?.width).toBeLessThanOrEqual(48);
  expect(collapsedBox?.height).toBeLessThanOrEqual(48);
  const [floatingZIndex, headerZIndex] = await Promise.all([
    floatingLayer.evaluate((element) => Number(getComputedStyle(element).zIndex)),
    page.getByRole('banner').evaluate((element) => Number(getComputedStyle(element).zIndex)),
  ]);
  expect(floatingZIndex).toBeGreaterThan(headerZIndex);

  await statusToggle.click();
  await expect(statusToggle).toHaveAttribute('aria-expanded', 'true');
  const loyaltyAction = page.getByRole('button', {
    name: /Faltam 3 pedidos\. R\$ 25,00 na próxima recompensa/,
  });
  const orderAction = page.getByRole('button', { name: /Pedido em andamento/i });
  await expect(loyaltyAction).toBeVisible();
  await expect(orderAction).toBeVisible();
  const [loyaltyBox, orderBox] = await Promise.all([
    loyaltyAction.boundingBox(),
    orderAction.boundingBox(),
  ]);
  expect(loyaltyBox?.width).toBeLessThanOrEqual(300);
  expect(orderBox?.width).toBeLessThanOrEqual(300);
  await captureReadmeScreenshot(page, 'customer-status-hub-mobile.png');

  await statusToggle.click();
  const locationTrigger = page.getByRole('button', {
    name: 'Endereço de entrega: Avenida Beira Mar, 220',
  });
  await locationTrigger.click();
  await page
    .getByRole('dialog', { name: 'Onde deseja receber?' })
    .getByRole('button', { name: /Casa: Rua das Flores, 10/ })
    .click();

  const notice = page.getByRole('status').filter({ hasText: 'Endereço selecionado' });
  await expect(notice).toBeVisible();
  await expect(notice.getByText('Tudo certo')).toBeVisible();
  const [headerBox, noticeBox] = await Promise.all([
    page.getByRole('banner').boundingBox(),
    notice.boundingBox(),
  ]);
  expect(headerBox).not.toBeNull();
  expect(noticeBox).not.toBeNull();
  expect(noticeBox!.y).toBeGreaterThanOrEqual(headerBox!.y + headerBox!.height);
  const noticeLayerZIndex = await page
    .getByLabel('Avisos recentes')
    .evaluate((element) => Number(getComputedStyle(element).zIndex));
  expect(floatingZIndex).toBeGreaterThan(noticeLayerZIndex);
  await captureReadmeScreenshot(page, 'customer-notice-mobile.png');
  await notice.getByRole('button', { name: 'Fechar notificação' }).click();
  await expect(notice).toBeHidden();
});

test('captura o tracking real para o README', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await mockTracking(page);
  await page.goto('/orders/601/tracking');

  await expect(
    page.getByLabel('Detalhes da rota').getByText('Pedido #601', { exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Saiu para entrega', { exact: true })).toBeVisible();
  await expect(page.locator('.delivery-map-shell')).toBeVisible();
  await captureReadmeScreenshot(page, 'delivery-tracking.png', { fullPage: true });
});
