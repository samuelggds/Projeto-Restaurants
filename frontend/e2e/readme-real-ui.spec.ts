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

const pizzaImage = `data:image/svg+xml,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="900" height="600" viewBox="0 0 900 600">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#1b1210" />
        <stop offset="1" stop-color="#7b321e" />
      </linearGradient>
    </defs>
    <rect width="900" height="600" fill="url(#bg)" />
    <circle cx="450" cy="310" r="215" fill="#e5ad43" />
    <circle cx="450" cy="310" r="185" fill="#c94b2a" />
    <circle cx="390" cy="250" r="34" fill="#7b1f16" />
    <circle cx="520" cy="240" r="30" fill="#7b1f16" />
    <circle cx="505" cy="370" r="35" fill="#7b1f16" />
    <circle cx="350" cy="365" r="28" fill="#7b1f16" />
    <circle cx="445" cy="310" r="22" fill="#2f7d32" />
  </svg>
`)}`;

async function mockPublicMenu(page: Page) {
  await page.route(/^http:\/\/(127\.0\.0\.1|localhost):3000\/.*$/, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname;

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
          coverImage: pizzaImage,
          logo: null,
          banners: [],
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
            image: pizzaImage,
            active: true,
            stock: null,
            categoryId: 10,
            category: { id: 10, name: 'Pizzas' },
            optionGroups: [],
          },
          {
            id: 2,
            name: 'Pizza Calabresa Especial',
            description: 'Calabresa, cebola roxa, muçarela e toque da casa.',
            price: 62.9,
            image: pizzaImage,
            active: true,
            stock: null,
            categoryId: 10,
            category: { id: 10, name: 'Pizzas' },
            optionGroups: [],
          },
          {
            id: 3,
            name: 'Pizza Portuguesa',
            description: 'Presunto, ovos, cebola, azeitona e muçarela.',
            price: 59.9,
            image: pizzaImage,
            active: true,
            stock: null,
            categoryId: 10,
            category: { id: 10, name: 'Pizzas' },
            optionGroups: [],
          },
        ],
      });
    }
    if (pathname === '/products/ratings') return json(route, { ratings: [] });
    if (pathname === '/coupons/loyalty') return json(route, null);
    if (pathname === '/banners') return json(route, []);
    if (pathname === '/platform/status') return json(route, { available: true });

    return json(route, {});
  });

  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
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
  await captureReadmeScreenshot(page, 'customer-menu.png', { fullPage: true });
});

test('captura o tracking real para o README', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await mockTracking(page);
  await page.goto('/orders/601/tracking');

  await expect(page.getByText('Pedido #601')).toBeVisible();
  await expect(page.getByText('Saiu para entrega', { exact: true })).toBeVisible();
  await expect(page.locator('.delivery-map-shell')).toBeVisible();
  await captureReadmeScreenshot(page, 'delivery-tracking.png', { fullPage: true });
});
