import { orderFixtureResponse } from './helpers/orderFixtures';
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
      return json(
        route,
        orderFixtureResponse(route.request().url(), [
          {
            id: 81,
            type: 'DELIVERY',
            status: 'PRONTO',
            createdAt: '2026-09-02T18:00:00.000Z',
            items: [{ product: { name: 'Pizza Margherita' } }],
          },
        ]),
      );
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
  await expect(loginNudge).toBeHidden();
  await captureReadmeScreenshot(page, 'customer-menu.png', { fullPage: true });
});

test('cardápio público mantém a hierarquia e a navegação móvel contidas em 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await mockPublicMenu(page);
  await page.goto('/north-pizza');

  const hero = page.getByRole('region', { name: 'Promoções do restaurante' });
  const menuButton = hero.getByRole('button', { name: 'Ver cardápio' });
  const bottomNav = page.getByRole('navigation', { name: 'Navegação principal' });
  const cartFab = page.getByRole('button', { name: 'Meu Carrinho, 0 itens' });

  await expect(hero).toBeVisible();
  await expect(menuButton).toBeVisible();
  await expect(bottomNav).toBeVisible();
  await expect(bottomNav.getByRole('button', { name: 'Início' })).toBeVisible();
  await expect(bottomNav.getByRole('button', { name: 'Pedidos' })).toBeVisible();
  await expect(bottomNav.getByRole('button', { name: 'Conta' })).toBeVisible();
  await expect(cartFab).toBeVisible();
  const heroBox = await hero.boundingBox();
  expect(heroBox?.height).toBe(235);
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(321);

  await menuButton.click();
  const featuredCategory = page.getByRole('button', { name: 'Destaques', exact: true }).first();
  await featuredCategory.scrollIntoViewIfNeeded();
  const categoryBox = await featuredCategory.boundingBox();
  expect(categoryBox?.height).toBeLessThanOrEqual(70);
  const lastProductImage = page.getByAltText('Pizza Portuguesa');
  await lastProductImage.scrollIntoViewIfNeeded();
  await expect
    .poll(() => lastProductImage.evaluate((image) => (image as HTMLImageElement).naturalWidth))
    .toBeGreaterThan(0);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page.getByRole('button', { name: 'Voltar para a Home' })).toBeVisible();
  await captureReadmeScreenshot(page, 'customer-menu-mobile.png', { fullPage: true });
});

test('busca móvel usa o input do header, filtra sugestões e devolve o foco ao fechar', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await mockPublicMenu(page);
  await page.goto('/north-pizza');

  const searchTrigger = page.getByRole('button', { name: 'Buscar no cardápio' });
  await searchTrigger.click();
  const searchInput = page.getByRole('searchbox', { name: 'Pesquisar produto pelo nome' });
  await expect(searchInput).toBeVisible();
  await expect(searchInput).toBeFocused();

  await searchInput.fill('pizza');
  const results = page.getByLabel('Produtos encontrados');
  await expect(results).toBeVisible();
  await expect(results.getByRole('button').filter({ hasText: 'Pizza Margherita' })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(321);
  await captureReadmeScreenshot(page, 'customer-search-mobile.png');

  await searchInput.fill('calabresa');
  await expect(
    results.getByRole('button').filter({ hasText: 'Pizza Calabresa Especial' }),
  ).toBeVisible();
  await expect(results.getByRole('button').filter({ hasText: 'Pizza Margherita' })).toHaveCount(0);

  await page.keyboard.press('Escape');
  await expect(searchInput).toBeHidden();
  await expect(searchTrigger).toBeFocused();

  await page.setViewportSize({ width: 1440, height: 900 });
  const desktopSearch = page.getByRole('searchbox', { name: 'Pesquisar produto pelo nome' });
  await expect(desktopSearch).toBeVisible();
  await desktopSearch.fill('pizza');
  await expect(page.getByLabel('Produtos encontrados')).toBeVisible();
  await captureReadmeScreenshot(page, 'customer-search-desktop.png');
});

test('adicionar mantém o cardápio aberto e o checkout reúne os itens em 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await mockPublicMenu(page);
  await page.goto('/north-pizza');

  const cartTrigger = page.getByRole('button', { name: 'Meu Carrinho, 0 itens' });
  await cartTrigger.click();

  const checkout = page.getByRole('dialog', { name: 'Finalizar pedido' });
  await expect(checkout).toBeVisible();
  await expect(checkout).toBeFocused();
  await expect(checkout.getByText('Seu carrinho está vazio.')).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('hidden');

  await page.keyboard.press('Escape');
  await expect(checkout).toBeHidden();
  await expect(cartTrigger).toBeFocused();
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('');

  await page.getByRole('button', { name: 'Adicionar Pizza Margherita' }).click();
  await expect(page.getByRole('button', { name: 'Meu Carrinho, 1 item' })).toBeVisible();

  await page.getByRole('button', { name: 'Adicionar Pizza Calabresa Especial' }).click();

  const filledCartTrigger = page.getByRole('button', { name: 'Meu Carrinho, 2 itens' });
  await expect(filledCartTrigger).toBeVisible();
  await filledCartTrigger.click();

  await expect(checkout).toBeVisible();
  await expect(checkout.getByText('Pizza Margherita', { exact: true })).toBeVisible();
  await expect(checkout.getByText('Pizza Calabresa Especial', { exact: true })).toBeVisible();
  await expect(checkout.getByText('Itens (2)')).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(321);

  await captureReadmeScreenshot(page, 'customer-cart-mobile.png');
});

test('checkout móvel preserva o endereço salvo selecionado', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await mockAuthenticatedPublicMenu(page);
  await page.goto('/north-pizza');

  await page.getByRole('button', { name: 'Adicionar Pizza Margherita' }).click();
  await page.getByRole('button', { name: 'Meu Carrinho, 1 item' }).click();
  const checkout = page.getByRole('dialog', { name: 'Finalizar pedido' });
  await expect(checkout).toBeVisible();
  await checkout.getByRole('button', { name: 'Continuar' }).click();

  await expect(checkout.getByRole('heading', { name: 'Endereço de entrega' })).toBeVisible();
  await expect(checkout.getByText(/Avenida Beira Mar, 220/)).toBeVisible();
  await expect(checkout.getByText(/Meireles, Fortaleza - CE/)).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(321);

  await captureReadmeScreenshot(page, 'customer-addresses-mobile.png');
});

test('navegação móvel e busca inline permanecem acessíveis sem sobreposição', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await mockAuthenticatedPublicMenu(page);
  await page.goto('/north-pizza');

  const bottomNav = page.getByRole('navigation', { name: 'Navegação principal' });
  await expect(bottomNav).toBeVisible();
  await expect(bottomNav.getByRole('button', { name: 'Início' })).toBeVisible();
  await expect(bottomNav.getByRole('button', { name: 'Pedidos' })).toBeVisible();
  await expect(bottomNav.getByRole('button', { name: 'Conta' })).toBeVisible();

  const searchTrigger = page.getByRole('button', { name: 'Buscar no cardápio' });
  await searchTrigger.click();
  const searchInput = page.getByRole('searchbox', { name: 'Pesquisar produto pelo nome' });
  await expect(searchInput).toBeVisible();
  await searchInput.fill('pizza');
  await expect(page.getByLabel('Produtos encontrados')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(searchInput).toBeHidden();
  await expect(searchTrigger).toBeFocused();

  await captureReadmeScreenshot(page, 'customer-status-hub-mobile.png');
});

for (const width of [320, 390, 1440]) {
  test(`WhatsApp permanece fixo somente na Home oficial em ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await mockAuthenticatedPublicMenu(page);
    await page.goto('/north-pizza');

    const whatsapp = page.getByTestId('floating-whatsapp-contact');
    await expect(whatsapp).toBeVisible();
    await expect(whatsapp).toHaveAttribute('href', /https:\/\/wa\.me\//);
    await expect(whatsapp).toHaveAttribute('target', '_blank');
    expect(await whatsapp.evaluate((element) => getComputedStyle(element).position)).toBe('fixed');

    const original = await whatsapp.boundingBox();
    expect(original).not.toBeNull();
    expect(width - (original!.x + original!.width)).toBeGreaterThanOrEqual(12);
    expect(width - (original!.x + original!.width)).toBeLessThanOrEqual(30);

    if (width <= 700) {
      const cart = page.getByRole('button', { name: 'Meu Carrinho, 0 itens' });
      const nav = page.getByRole('navigation', { name: 'Navegação principal' });
      const [cartBox, navBox] = await Promise.all([cart.boundingBox(), nav.boundingBox()]);
      expect(cartBox).not.toBeNull();
      expect(navBox).not.toBeNull();
      expect(original!.y + original!.height).toBeLessThan(cartBox!.y);
      expect(original!.y + original!.height).toBeLessThan(navBox!.y);
    }

    await captureReadmeScreenshot(page, `customer-hub-closed-${width}.png`);
    await page.getByRole('region', { name: 'Promoções do restaurante' })
      .getByRole('button', { name: 'Ver cardápio' })
      .click();
    await expect(whatsapp).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test('tela baixa mantém carrinho, navegação e WhatsApp sem sobreposição', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 480 });
  await mockPublicMenu(page);
  await page.goto('/north-pizza');

  const whatsapp = page.getByTestId('floating-whatsapp-contact');
  const cart = page.getByRole('button', { name: 'Meu Carrinho, 0 itens' });
  const nav = page.getByRole('navigation', { name: 'Navegação principal' });

  await expect(whatsapp).toBeVisible();
  await expect(cart).toBeVisible();
  await expect(nav).toBeVisible();

  const [whatsappBox, cartBox, navBox] = await Promise.all([
    whatsapp.boundingBox(),
    cart.boundingBox(),
    nav.boundingBox(),
  ]);
  expect(whatsappBox).not.toBeNull();
  expect(cartBox).not.toBeNull();
  expect(navBox).not.toBeNull();
  expect(whatsappBox!.y + whatsappBox!.height).toBeLessThan(cartBox!.y);
  expect(cartBox!.y + cartBox!.height).toBeLessThanOrEqual(navBox!.y);

  await captureReadmeScreenshot(page, 'customer-hub-short-screen.png');
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
