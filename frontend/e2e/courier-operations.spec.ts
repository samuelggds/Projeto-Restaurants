import { expect, test, type BrowserContext, type Page, type Route } from '@playwright/test';
import { mockAuthRefresh } from './helpers/mockAuthRefresh';
import { captureReadmeScreenshot } from './helpers/readmeScreenshot';

const RESTAURANT_ID = 42;
const OTHER_RESTAURANT_ID = 84;
const COURIER_ID = 77;
const COURIER_TOKEN = 'e2e-courier-tenant-42-token';
const CUSTOMER_TOKEN = 'e2e-customer-order-601-token';
const DELIVERY_CODE = '6789';

test.describe.configure({ timeout: 60_000 });

type CourierStatus = 'PRONTO' | 'SAIU_PARA_ENTREGA' | 'ENTREGUE';

type CourierOrder = Record<string, unknown> & {
  id: number;
  restaurantId: number;
  assignedCourierId: number | null;
  status: CourierStatus;
  type: 'DELIVERY' | 'MESA';
};

type LocationFrame = {
  orderId: number;
  latitude: number;
  longitude: number;
  accuracy?: number | null;
};

type InitialLocation = Omit<LocationFrame, 'orderId'> & {
  heading?: number | null;
  speed?: number | null;
  sentAt?: string;
};

type CourierE2EState = {
  orders: CourierOrder[];
  orderRequests: number;
  orderRequestTokens: string[];
  claims: Array<{ id: number; initialLocation: InitialLocation | null }>;
  deliveries: Array<{ id: number; code: string }>;
  trackingRequests: number[];
  locationFrames: LocationFrame[];
  socketAuthTokens: string[];
  rejectedTenantRequests: number;
  unexpectedRequests: string[];
  orderFailuresRemaining: number;
  holdNextOrdersRequest: boolean;
  releaseOrdersRequest?: () => void;
  sendSocketEvent?: (event: string, payload: unknown) => void;
  profileUpdates: Array<Record<string, unknown>>;
  trackingPoints: LocationFrame[];
  settlements: Array<Record<string, unknown>>;
  settlementConfirmations: string[];
  settlementDisputes: Array<{ publicId: string; reason: string }>;
};

const courierUser = {
  id: COURIER_ID,
  name: 'Marcos Entregador',
  email: 'marcos.motoqueiro@restaurante.test',
  phone: '(85) 99999-7777',
  cpf: '12345678901',
  role: 'MOTOQUEIRO',
  restaurantId: RESTAURANT_ID,
};

const customerUser = {
  id: 501,
  name: 'Cliente Correto',
  email: 'cliente.correto@restaurante.test',
  role: 'CLIENTE',
  restaurantId: RESTAURANT_ID,
};

const departure = { latitude: -3.73191, longitude: -38.52667 };
const midpoint = { latitude: -3.7302, longitude: -38.5224 };
const destination = { latitude: -3.72847, longitude: -38.51908 };
const SETTLEMENT_PUBLIC_ID = '11111111-1111-4111-8111-111111111111';

function isoMinutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

function orderFixtures(): CourierOrder[] {
  const shared = {
    restaurantId: RESTAURANT_ID,
    type: 'DELIVERY' as const,
    total: 57.5,
    paymentMethod: 'PIX',
    paid: true,
    address: 'Rua das Flores',
    number: '120',
    complement: 'Apto 302 | Ref.: portaria azul',
    district: 'Centro',
    city: 'Fortaleza',
    state: 'CE',
    pointReference: 'Próximo à praça',
    deliveryDistanceMeters: 4200,
    courierEarningPreview: {
      available: true,
      amount: 8,
      model: 'DISTANCE_RANGES',
      source: 'RESTAURANT_DEFAULT',
    },
    user: { id: 501, name: 'Cliente Correto', phone: '(85) 99999-6789' },
    createdAt: isoMinutesAgo(18),
  };

  return [
    {
      ...shared,
      id: 601,
      status: 'PRONTO',
      assignedCourierId: null,
      observation: 'Interfone quebrado; chamar pelo telefone',
      items: [
        {
          id: 6011,
          quantity: 2,
          price: 22.5,
          observation: 'Embalar separadamente',
          product: { id: 101, name: 'Massa artesanal' },
          customizations: [
            {
              groupName: 'Molho',
              options: [{ name: 'Molho branco' }],
            },
          ],
          ingredients: [{ id: 11, name: 'Queijo extra', price: 5 }],
        },
        {
          id: 6012,
          quantity: 1,
          price: 12.5,
          product: { id: 102, name: 'Suco natural' },
        },
      ],
    },
    {
      ...shared,
      id: 602,
      status: 'PRONTO',
      assignedCourierId: null,
      user: { id: 502, name: 'Segundo Cliente', phone: '(85) 90000-1122' },
      address: 'Avenida Beira Mar',
      number: '80',
      createdAt: isoMinutesAgo(8),
      items: [{ id: 6021, quantity: 1, price: 57.5, product: { name: 'Pedido secundário' } }],
    },
    {
      ...shared,
      id: 604,
      status: 'ENTREGUE',
      assignedCourierId: COURIER_ID,
      deliveredAt: isoMinutesAgo(5),
      user: { id: 504, name: 'Cliente Histórico', phone: '(85) 91111-3344' },
      items: [{ id: 6041, quantity: 1, price: 57.5, product: { name: 'Pedido entregue' } }],
    },
    {
      ...shared,
      id: 998,
      status: 'SAIU_PARA_ENTREGA',
      assignedCourierId: 999,
      user: { id: 598, name: 'Cliente de outro motoqueiro', phone: '(85) 95555-4433' },
      items: [
        { id: 9981, quantity: 1, price: 57.5, product: { name: 'PEDIDO DE OUTRO MOTOQUEIRO' } },
      ],
    },
    {
      ...shared,
      id: 999,
      restaurantId: OTHER_RESTAURANT_ID,
      status: 'PRONTO',
      assignedCourierId: null,
      user: { id: 599, name: 'Cliente de outro restaurante', phone: '(85) 96666-5544' },
      items: [
        { id: 9991, quantity: 1, price: 57.5, product: { name: 'PEDIDO VAZADO DE OUTRO TENANT' } },
      ],
    },
    {
      ...shared,
      id: 997,
      type: 'MESA',
      status: 'PRONTO',
      assignedCourierId: null,
      items: [{ id: 9971, quantity: 1, price: 57.5, product: { name: 'PEDIDO DE MESA' } }],
    },
  ];
}

function initialState(overrides: Partial<CourierE2EState> = {}): CourierE2EState {
  return {
    orders: orderFixtures(),
    orderRequests: 0,
    orderRequestTokens: [],
    claims: [],
    deliveries: [],
    trackingRequests: [],
    locationFrames: [],
    socketAuthTokens: [],
    rejectedTenantRequests: 0,
    unexpectedRequests: [],
    orderFailuresRemaining: 0,
    holdNextOrdersRequest: false,
    profileUpdates: [],
    trackingPoints: [],
    settlements: [
      {
        publicId: SETTLEMENT_PUBLIC_ID,
        status: 'AWAITING_COURIER_CONFIRMATION',
        grossCourierEarnings: 65,
        cashCollectedAmount: 20,
        netAmount: 45,
        direction: 'RESTAURANT_PAYS_COURIER',
        paymentMethod: 'PIX',
        createdAt: new Date().toISOString(),
        courier: { id: COURIER_ID, name: courierUser.name, email: courierUser.email },
        items: [{ orderId: 604 }],
      },
    ],
    settlementConfirmations: [],
    settlementDisputes: [],
    ...overrides,
  };
}

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

function authorization(route: Route) {
  return route.request().headers().authorization ?? '';
}

function courierVisibleOrders(state: CourierE2EState) {
  return state.orders.filter(
    (order) =>
      order.restaurantId === RESTAURANT_ID &&
      order.type === 'DELIVERY' &&
      ((order.status === 'PRONTO' && order.assignedCourierId === null) ||
        order.assignedCourierId === COURIER_ID),
  );
}

async function mockSocket(page: Page, state: CourierE2EState) {
  await page.routeWebSocket(/\/socket\.io\//, (socket) => {
    socket.onMessage((rawMessage) => {
      const message = rawMessage.toString();

      if (message === '2') {
        socket.send('3');
        return;
      }

      if (message.startsWith('40')) {
        try {
          const auth = JSON.parse(message.slice(2)) as { token?: string };
          state.socketAuthTokens.push(String(auth.token || ''));
        } catch {
          state.socketAuthTokens.push('payload-inválido');
        }
        socket.send('40{"sid":"e2e-courier-socket"}');
        state.sendSocketEvent = (event, payload) => {
          socket.send(`42${JSON.stringify([event, payload])}`);
        };
        return;
      }

      if (!message.startsWith('42')) return;
      const packet = message.slice(2);
      const arrayStart = packet.indexOf('[');
      if (arrayStart < 0) return;
      const ackId = packet.slice(0, arrayStart);
      const [event, payload] = JSON.parse(packet.slice(arrayStart)) as [string, LocationFrame];
      if (event === 'delivery:location:update') {
        state.locationFrames.push(payload);
      }
      if (ackId) socket.send(`43${ackId}[{"ok":true}]`);
    });

    socket.send(
      `0${JSON.stringify({
        sid: 'e2e-engine-socket',
        upgrades: [],
        pingInterval: 25_000,
        pingTimeout: 20_000,
        maxPayload: 1_000_000,
      })}`,
    );
  });
}

async function mockCourierApi(page: Page, state: CourierE2EState) {
  await mockSocket(page, state);
  await page.route('https://example.test/**', (route) => route.abort());
  await page.route(/^https:\/\/[^/]*tile\.openstreetmap\.org\/.*$/, (route) => route.abort());
  await page.route(/^http:\/\/(127\.0\.0\.1|localhost):3000\/.*$/, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname;
    const method = request.method();
    const token = authorization(route);

    if (pathname.startsWith('/socket.io/')) return route.abort();
    if (pathname === '/platform/status' && method === 'GET') {
      return json(route, { available: true, message: 'Plataforma disponível.' });
    }

    if (token !== `Bearer ${COURIER_TOKEN}`) {
      state.rejectedTenantRequests += 1;
      return json(route, { error: 'Token não pertence ao motoqueiro esperado.' }, 401);
    }

    if (pathname === '/auth/me' && method === 'GET') {
      return json(route, { user: courierUser });
    }

    if (pathname === '/auth/profile' && method === 'PUT') {
      const payload = request.postDataJSON() as Record<string, unknown>;
      state.profileUpdates.push(payload);
      return json(route, { ...courierUser, ...payload });
    }

    if (pathname === `/settings/public/${RESTAURANT_ID}` && method === 'GET') {
      return json(route, {
        restaurantId: RESTAURANT_ID,
        restaurantName: 'Restaurante Rota 42',
        primaryColor: '#cf562f',
        restaurant: {
          id: RESTAURANT_ID,
          name: 'Restaurante Rota 42',
          slug: 'restaurante-rota-42',
        },
      });
    }

    if (pathname.startsWith('/settings/public/') && method === 'GET') {
      state.rejectedTenantRequests += 1;
      return json(route, { error: 'Restaurante fora do tenant autenticado.' }, 403);
    }

    if (pathname === '/ai-support/my-issue-updates' && method === 'GET') {
      return json(route, { updates: [] });
    }

    if (pathname === '/orders' && method === 'GET') {
      state.orderRequests += 1;
      state.orderRequestTokens.push(token);

      if (state.holdNextOrdersRequest) {
        state.holdNextOrdersRequest = false;
        await new Promise<void>((resolve) => {
          state.releaseOrdersRequest = resolve;
        });
        state.releaseOrdersRequest = undefined;
      }

      if (state.orderFailuresRemaining > 0) {
        state.orderFailuresRemaining -= 1;
        return json(route, { error: 'Falha simulada ao carregar entregas.' }, 503);
      }

      return json(route, { orders: courierVisibleOrders(state) });
    }

    if (pathname === '/orders/courier/finance' && method === 'GET') {
      return json(route, {
        today: { amount: 12.5, deliveries: 1 },
        week: { amount: 45, deliveries: 4 },
        month: { amount: 110, deliveries: 10 },
        pending: { amount: 25, deliveries: 2 },
        deliveries: [],
      });
    }

    if (pathname === '/courier-compensation/courier/settlements' && method === 'GET') {
      return json(route, state.settlements);
    }

    const confirmSettlement = pathname.match(
      /^\/courier-compensation\/courier\/settlements\/([^/]+)\/confirm$/,
    );
    if (confirmSettlement && method === 'POST') {
      const publicId = confirmSettlement[1];
      const settlement = state.settlements.find((entry) => entry.publicId === publicId);
      if (!settlement) return json(route, { error: 'Acerto não encontrado.' }, 404);
      settlement.status = 'CONFIRMED';
      state.settlementConfirmations.push(publicId);
      return json(route, settlement);
    }

    const disputeSettlement = pathname.match(
      /^\/courier-compensation\/courier\/settlements\/([^/]+)\/dispute$/,
    );
    if (disputeSettlement && method === 'POST') {
      const publicId = disputeSettlement[1];
      const payload = request.postDataJSON() as { reason: string };
      const settlement = state.settlements.find((entry) => entry.publicId === publicId);
      if (!settlement) return json(route, { error: 'Acerto não encontrado.' }, 404);
      settlement.status = 'DISPUTED';
      state.settlementDisputes.push({ publicId, reason: payload.reason });
      return json(route, settlement);
    }

    const claim = pathname.match(/^\/orders\/(\d+)\/claim-delivery$/);
    if (claim && method === 'PATCH') {
      const id = Number(claim[1]);
      const rawPayload = request.postData();
      const payload = rawPayload
        ? (request.postDataJSON() as { initialLocation?: InitialLocation })
        : {};
      const order = state.orders.find(
        (candidate) => candidate.id === id && candidate.restaurantId === RESTAURANT_ID,
      );
      if (!order || order.type !== 'DELIVERY') {
        state.rejectedTenantRequests += 1;
        return json(route, { error: 'Pedido não pertence ao restaurante autenticado.' }, 404);
      }
      if (order.status !== 'PRONTO' || order.assignedCourierId !== null) {
        return json(route, { error: 'O pedido não está disponível para retirada.' }, 409);
      }
      order.status = 'SAIU_PARA_ENTREGA';
      order.assignedCourierId = COURIER_ID;
      order.deliveryStartedAt = new Date().toISOString();
      const initialLocation = payload.initialLocation || null;
      state.claims.push({ id, initialLocation });
      if (initialLocation) {
        state.trackingPoints.push({ orderId: id, ...initialLocation });
      }
      return json(route, order);
    }

    const statusUpdate = pathname.match(/^\/orders\/(\d+)\/status$/);
    if (statusUpdate && method === 'PUT') {
      const id = Number(statusUpdate[1]);
      const payload = request.postDataJSON() as {
        status?: CourierStatus;
        deliveryConfirmationCode?: string;
      };
      const order = state.orders.find(
        (candidate) =>
          candidate.id === id &&
          candidate.restaurantId === RESTAURANT_ID &&
          candidate.assignedCourierId === COURIER_ID,
      );
      if (!order) {
        state.rejectedTenantRequests += 1;
        return json(route, { error: 'Entrega não atribuída a este motoqueiro.' }, 404);
      }
      if (
        order.status !== 'SAIU_PARA_ENTREGA' ||
        payload.status !== 'ENTREGUE' ||
        payload.deliveryConfirmationCode !== DELIVERY_CODE
      ) {
        return json(route, { error: 'Código de confirmação ou transição inválida.' }, 400);
      }
      order.status = 'ENTREGUE';
      order.deliveredAt = new Date().toISOString();
      state.deliveries.push({ id, code: payload.deliveryConfirmationCode });
      return json(route, order);
    }

    const tracking = pathname.match(/^\/orders\/(\d+)\/tracking$/);
    if (tracking && method === 'GET') {
      const id = Number(tracking[1]);
      const order = state.orders.find(
        (candidate) =>
          candidate.id === id &&
          candidate.restaurantId === RESTAURANT_ID &&
          candidate.assignedCourierId === COURIER_ID,
      );
      if (!order) {
        state.rejectedTenantRequests += 1;
        return json(route, { error: 'Você não pode acompanhar esta entrega.' }, 403);
      }
      state.trackingRequests.push(id);
      return json(route, {
        order: {
          ...order,
          routeEstimate: {
            distanceMeters: 3100,
            durationSeconds: 720,
            destination,
            routeCoordinates: [departure, midpoint, destination],
          },
          estimatedArrival: new Date(Date.now() + 720_000).toISOString(),
        },
        locations: state.trackingPoints
          .filter((point) => point.orderId === id)
          .map(({ orderId: _orderId, ...point }) => point),
        latestLocation:
          [...state.trackingPoints].reverse().find((point) => point.orderId === id) || null,
      });
    }

    state.unexpectedRequests.push(`${method} ${pathname}`);
    return json(route, { error: 'Endpoint não mockado no cenário do motoqueiro.' }, 404);
  });

  await mockAuthRefresh(page, courierUser.id, COURIER_TOKEN);

  await page.addInitScript((user) => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('user', JSON.stringify(user));
  }, courierUser);
}

async function enableSyntheticLocation(context: BrowserContext) {
  await context.grantPermissions(['geolocation'], { origin: 'http://127.0.0.1:4173' });
  await context.setGeolocation({ ...departure, accuracy: 8 });
}

async function openCourierView(page: Page, label: string) {
  await page.locator('nav a').filter({ hasText: label }).first().click();
}

function orderCard(page: Page, id: number) {
  return page
    .getByRole('button', { name: new RegExp(`(?:Ver|Ocultar) detalhes do pedido ${id}`) })
    .locator('..');
}

async function expectTenantSafeRequests(state: CourierE2EState) {
  await expect.poll(() => state.orderRequests).toBeGreaterThan(0);
  expect(state.orderRequestTokens.every((token) => token === `Bearer ${COURIER_TOKEN}`)).toBe(true);
  expect(state.socketAuthTokens).toContain(COURIER_TOKEN);
  expect(state.rejectedTenantRequests).toBe(0);
  expect(state.unexpectedRequests).toEqual([]);
}

async function mockCustomerTrackingApi(page: Page, state: CourierE2EState) {
  let trackingStatus: CourierStatus = 'SAIU_PARA_ENTREGA';
  await mockSocket(page, state);
  await page.route(/^https:\/\/[^/]*tile\.openstreetmap\.org\/.*$/, (route) => route.abort());
  await page.route(/^http:\/\/(127\.0\.0\.1|localhost):3000\/.*$/, async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    const method = request.method();
    const token = authorization(route);

    if (pathname.startsWith('/socket.io/')) return route.abort();
    if (pathname === '/platform/status' && method === 'GET') {
      return json(route, { available: true, message: 'Plataforma disponível.' });
    }
    if (token !== `Bearer ${CUSTOMER_TOKEN}`) {
      state.rejectedTenantRequests += 1;
      return json(route, { error: 'Sessão do cliente inválida.' }, 401);
    }
    if (pathname === '/auth/me' && method === 'GET') {
      return json(route, { user: customerUser });
    }
    if (pathname === '/orders/601/tracking' && method === 'GET') {
      state.trackingRequests.push(601);
      return json(route, {
        order: {
          id: 601,
          restaurantId: RESTAURANT_ID,
          status: trackingStatus,
          deliveryStartedAt: isoMinutesAgo(8),
          deliveredAt: trackingStatus === 'ENTREGUE' ? new Date().toISOString() : null,
          estimatedArrival:
            trackingStatus === 'ENTREGUE' ? null : new Date(Date.now() + 720_000).toISOString(),
          assignedCourier: {
            id: COURIER_ID,
            name: courierUser.name,
            phone: courierUser.phone,
          },
          routeEstimate:
            trackingStatus === 'ENTREGUE'
              ? null
              : {
                  provider: 'OSRM',
                  distanceMeters: 3100,
                  durationSeconds: 720,
                  destination,
                  routeCoordinates: [departure, midpoint, destination],
                },
        },
        locations: [{ ...departure, recordedAt: isoMinutesAgo(7), speed: 4 }],
        latestLocation: { ...departure, recordedAt: isoMinutesAgo(7) },
      });
    }

    state.unexpectedRequests.push(`${method} ${pathname}`);
    return json(route, { error: 'Endpoint não autorizado para este cliente.' }, 403);
  });

  await mockAuthRefresh(page, customerUser.id, CUSTOMER_TOKEN);

  await page.addInitScript((user) => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('user', JSON.stringify(user));
  }, customerUser);

  return {
    markDelivered() {
      trackingStatus = 'ENTREGUE';
    },
  };
}

test('motoqueiro retira, compartilha a rota do próprio pedido e encerra ao entregar', async ({
  context,
  page,
}) => {
  const state = initialState();
  await page.setViewportSize({ width: 1440, height: 960 });
  await enableSyntheticLocation(context);
  await mockCourierApi(page, state);
  await page.goto('/courier');

  await expect(page.getByText('Restaurante Rota 42')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Visão geral' })).toBeVisible();
  await expect(page.getByText('R$ 12,50')).toBeVisible();
  await expect(page.getByText('R$ 25,00')).toBeVisible();
  await expect(page.getByText('AGUARDANDO SUA CONFIRMAÇÃO')).toBeVisible();
  await page.getByRole('button', { name: 'Confirmar' }).click();
  await expect(page.getByRole('dialog')).toContainText('Confirmar recebimento do acerto?');
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar recebimento' }).click();
  await expect.poll(() => state.settlementConfirmations).toEqual([SETTLEMENT_PUBLIC_ID]);
  await expect(page.getByText('PEDIDO VAZADO DE OUTRO TENANT')).toHaveCount(0);
  await expect(page.getByText('PEDIDO DE OUTRO MOTOQUEIRO')).toHaveCount(0);
  await expect(page.getByText('PEDIDO DE MESA')).toHaveCount(0);

  await openCourierView(page, 'Para retirar');
  await page.getByLabel('Buscar pedido').fill('601');
  const readyOrder = orderCard(page, 601);
  await expect(readyOrder).toBeVisible();
  await expect(orderCard(page, 602)).toHaveCount(0);
  await readyOrder.getByRole('button', { name: 'Ver detalhes do pedido 601' }).click();
  await expect(readyOrder.getByText('2x Massa artesanal')).toBeVisible();
  await expect(readyOrder.getByText('1x Suco natural')).toBeVisible();
  await expect(readyOrder.getByText('Interfone quebrado; chamar pelo telefone')).toBeVisible();
  await expect(readyOrder.getByText('Rua das Flores, 120')).toBeVisible();
  await expect(readyOrder.getByText('Próximo à praça')).toBeVisible();
  await expect(readyOrder.getByText(/Ganho: R\$\s*8,00/)).toBeVisible();
  await expect(readyOrder.getByText('Rota calculada: 4.2 km')).toBeVisible();
  await captureReadmeScreenshot(page, 'courier-dashboard.png', { fullPage: true });

  await readyOrder.getByRole('button', { name: 'Retirar e iniciar entrega' }).click();
  await expect.poll(() => state.claims).toHaveLength(1);
  expect(state.claims[0]).toMatchObject({
    id: 601,
    initialLocation: { ...departure, accuracy: 8 },
  });
  expect(Number.isNaN(Date.parse(state.claims[0].initialLocation?.sentAt || ''))).toBe(false);
  expect(state.trackingPoints[0]).toMatchObject({ orderId: 601, ...departure });
  await expect(page.getByRole('heading', { name: 'Entregas em andamento' })).toBeVisible();

  await openCourierView(page, 'Em entrega');
  const routeOrder = orderCard(page, 601);
  await expect(routeOrder.getByText('Em entrega', { exact: true })).toBeVisible();
  const expandRouteOrder = routeOrder.getByRole('button', {
    name: 'Ver detalhes do pedido 601',
  });
  if (await expandRouteOrder.isVisible()) await expandRouteOrder.click();
  await expect(routeOrder.getByPlaceholder('4 últimos dígitos do celular')).toBeVisible();

  await openCourierView(page, 'Minha rota');
  const activateLocation = page.getByRole('button', { name: 'Ativar localização' });
  if (await activateLocation.isVisible()) {
    await activateLocation.click();
  }
  await expect(page.getByText('Localização ativa')).toBeVisible();
  await expect.poll(() => state.locationFrames.length, { timeout: 8_000 }).toBeGreaterThan(0);
  expect(state.locationFrames.every((frame) => frame.orderId === 601)).toBe(true);
  expect(state.locationFrames[0]).toMatchObject({ orderId: 601, ...departure });
  await expect.poll(() => state.trackingRequests).toContain(601);

  await context.setGeolocation({ ...midpoint, accuracy: 7 });
  await expect
    .poll(() => state.locationFrames.some((frame) => frame.latitude === midpoint.latitude), {
      timeout: 7_000,
    })
    .toBe(true);
  await context.setGeolocation({ ...destination, accuracy: 6 });
  await expect
    .poll(() => state.locationFrames.some((frame) => frame.latitude === destination.latitude), {
      timeout: 7_000,
    })
    .toBe(true);
  await expect(page.locator('.delivery-map-shell')).toBeVisible();
  await expect(page.locator('.delivery-courier-marker')).toBeVisible();
  await expect(page.locator('.delivery-destination-marker')).toBeVisible();
  await expect(page.locator('.delivery-planned-route')).toBeVisible();

  await openCourierView(page, 'Em entrega');
  const deliveryOrder = orderCard(page, 601);
  await deliveryOrder.getByPlaceholder('4 últimos dígitos do celular').fill('1234');
  await deliveryOrder.getByRole('button', { name: 'Marcar como Entregue' }).click();
  await expect(deliveryOrder.getByText(/Código de confirmação/)).toBeVisible();
  await deliveryOrder.getByPlaceholder('4 últimos dígitos do celular').fill(DELIVERY_CODE);
  await deliveryOrder.getByRole('button', { name: 'Marcar como Entregue' }).click();
  await expect.poll(() => state.deliveries).toEqual([{ id: 601, code: DELIVERY_CODE }]);
  await expect(deliveryOrder).toHaveCount(0);

  const locationCountAfterDelivery = state.locationFrames.length;
  await context.setGeolocation({ latitude: -3.727, longitude: -38.517, accuracy: 5 });
  await page.waitForTimeout(2_300);
  expect(state.locationFrames).toHaveLength(locationCountAfterDelivery);

  await openCourierView(page, 'Histórico');
  await expect(orderCard(page, 601).getByText('Entregue', { exact: true })).toBeVisible();
  await expect(orderCard(page, 604)).toBeVisible();

  await openCourierView(page, 'Meu perfil');
  await expect(page.getByText('marcos.motoqueiro@restaurante.test')).toBeVisible();
  await page.getByRole('button', { name: 'Editar' }).click();
  await page.getByLabel('Telefone').fill('(85) 98888-0000');
  await page.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect
    .poll(() => state.profileUpdates)
    .toContainEqual({
      name: 'Marcos Entregador',
      email: 'marcos.motoqueiro@restaurante.test',
      phone: '(85) 98888-0000',
    });
  await expect(page.getByText('Perfil atualizado com sucesso!')).toBeVisible();

  await expectTenantSafeRequests(state);
});

test('erro de atualização permite tentar novamente e realtime busca somente o tenant', async ({
  page,
}) => {
  const state = initialState();
  await mockCourierApi(page, state);
  await page.goto('/courier');
  await openCourierView(page, 'Para retirar');

  await expect(orderCard(page, 601)).toBeVisible();
  state.orderFailuresRemaining = 1;
  state.holdNextOrdersRequest = true;
  await page.getByRole('button', { name: 'Atualizar' }).click();
  await expect(page.getByText('Carregando entregas...')).toBeVisible();
  await expect.poll(() => Boolean(state.releaseOrdersRequest)).toBe(true);
  state.releaseOrdersRequest?.();
  await expect(page.getByText(/Não foi possível carregar as entregas/)).toBeVisible();

  const requestsBeforeRetry = state.orderRequests;
  await page.getByRole('button', { name: 'Atualizar' }).click();
  await expect.poll(() => state.orderRequests).toBeGreaterThan(requestsBeforeRetry);
  await expect(orderCard(page, 601)).toBeVisible();

  state.orders.push({
    ...orderFixtures()[0],
    id: 605,
    user: { id: 505, name: 'Cliente Realtime', phone: '(85) 97777-1212' },
    items: [{ id: 6051, quantity: 1, price: 20, product: { name: 'Pedido realtime' } }],
  });
  await expect.poll(() => Boolean(state.sendSocketEvent)).toBe(true);
  state.sendSocketEvent?.('order:status-changed', {
    ...state.orders.find((order) => order.id === 999),
    id: 606,
    restaurantId: OTHER_RESTAURANT_ID,
  });
  await expect(orderCard(page, 606)).toHaveCount(0);
  state.sendSocketEvent?.(
    'order:status-changed',
    state.orders.find((order) => order.id === 605),
  );
  await expect(orderCard(page, 605)).toBeVisible();

  state.orders = state.orders.filter(
    (order) => order.restaurantId !== RESTAURANT_ID || order.type !== 'DELIVERY',
  );
  await page.getByRole('button', { name: 'Atualizar' }).click();
  await expect(page.getByText('Nenhuma entrega nesta área.')).toBeVisible();

  await expectTenantSafeRequests(state);
});

test('explica localização negada e navegador sem suporte sem enviar coordenadas', async ({
  page,
}) => {
  const deniedState = initialState();
  deniedState.orders[0].status = 'SAIU_PARA_ENTREGA';
  deniedState.orders[0].assignedCourierId = COURIER_ID;
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: (_success: PositionCallback, error: PositionErrorCallback | null) => {
          window.setTimeout(() =>
            error?.({
              code: 1,
              message: 'denied',
              PERMISSION_DENIED: 1,
            } as GeolocationPositionError),
          );
        },
        watchPosition: (_success: PositionCallback, error: PositionErrorCallback | null) => {
          window.setTimeout(() =>
            error?.({
              code: 1,
              message: 'denied',
              PERMISSION_DENIED: 1,
            } as GeolocationPositionError),
          );
          return 1;
        },
        clearWatch: () => undefined,
      },
    });
  });
  await mockCourierApi(page, deniedState);
  await page.goto('/courier');
  await openCourierView(page, 'Minha rota');
  await page.getByRole('button', { name: /(?:Ativar|Testar) localização/ }).click();
  await expect(page.getByText(/localização foi bloqueada|permita a localização/i)).toBeVisible();
  expect(deniedState.locationFrames).toEqual([]);

  const unsupportedState = initialState();
  unsupportedState.orders[0].status = 'SAIU_PARA_ENTREGA';
  unsupportedState.orders[0].assignedCourierId = COURIER_ID;
  const context = page.context();
  await page.close();
  const unsupportedPage = await context.newPage();
  await unsupportedPage.addInitScript(() => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: undefined,
    });
  });
  await mockCourierApi(unsupportedPage, unsupportedState);
  await unsupportedPage.goto('/courier');
  await openCourierView(unsupportedPage, 'Minha rota');
  await expect(unsupportedPage.getByText('Ative a localização antes da entrega')).toBeVisible();
  await unsupportedPage.getByRole('button', { name: /(?:Ativar|Testar) localização/ }).click();
  await expect(
    unsupportedPage.getByText('Este aparelho não oferece geolocalização neste navegador.'),
  ).toBeVisible();
  await expect(
    unsupportedPage.getByRole('button', { name: /(?:Ativar|Testar) localização/ }),
  ).toHaveCount(0);
  expect(unsupportedState.locationFrames).toEqual([]);
});

test('cliente acompanha somente a própria entrega, rota e destino até a conclusão', async ({
  page,
}) => {
  const state = initialState();
  const tracking = await mockCustomerTrackingApi(page, state);
  await page.goto('/orders/601/tracking');

  await expect(page.getByText('Pedido #601')).toBeVisible();
  await expect(page.getByText('Saiu para entrega', { exact: true })).toBeVisible();
  await expect(page.getByText(courierUser.name)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ligar para o motoqueiro' })).toHaveAttribute(
    'href',
    `tel:${courierUser.phone}`,
  );
  await expect(page.locator('.delivery-map-shell')).toBeVisible();
  await expect(page.locator('.delivery-courier-marker')).toBeVisible();
  await expect(page.locator('.delivery-destination-marker')).toBeVisible();
  await expect(page.locator('.delivery-planned-route')).toBeVisible();
  await expect(page.getByText(/Estimativa de rota: cerca de 12 min/)).toBeVisible();

  await expect.poll(() => Boolean(state.sendSocketEvent)).toBe(true);
  const courierMarker = page.locator('.delivery-courier-marker');
  const initialMarkerStyle = await courierMarker.getAttribute('style');

  state.sendSocketEvent?.('order:delivery-location', {
    orderId: 602,
    restaurantId: RESTAURANT_ID,
    ...destination,
    recordedAt: new Date().toISOString(),
  });
  state.sendSocketEvent?.('order:delivery-location', {
    orderId: 601,
    restaurantId: OTHER_RESTAURANT_ID,
    ...destination,
    recordedAt: new Date().toISOString(),
  });
  await page.waitForTimeout(250);
  expect(await courierMarker.getAttribute('style')).toBe(initialMarkerStyle);

  state.sendSocketEvent?.('order:delivery-location', {
    orderId: 601,
    restaurantId: RESTAURANT_ID,
    ...midpoint,
    recordedAt: new Date().toISOString(),
  });
  await expect.poll(() => courierMarker.getAttribute('style')).not.toBe(initialMarkerStyle);
  await expect(page.getByText('Seu pedido está a caminho')).toBeVisible();

  tracking.markDelivered();
  state.sendSocketEvent?.('order:status-changed', {
    id: 601,
    restaurantId: RESTAURANT_ID,
    status: 'ENTREGUE',
  });
  await expect(page.getByText('Entregue', { exact: true })).toBeVisible();
  await expect(page.getByText('Seu pedido foi entregue')).toBeVisible();
  await expect(page.locator('.delivery-planned-route')).toHaveCount(0);

  const deliveredMarkerStyle = await courierMarker.getAttribute('style');
  state.sendSocketEvent?.('order:delivery-location', {
    orderId: 601,
    restaurantId: RESTAURANT_ID,
    latitude: -3.727,
    longitude: -38.517,
    recordedAt: new Date().toISOString(),
  });
  await page.waitForTimeout(250);
  expect(await courierMarker.getAttribute('style')).toBe(deliveredMarkerStyle);

  expect(state.socketAuthTokens).toContain(CUSTOMER_TOKEN);
  expect(state.rejectedTenantRequests).toBe(0);
  expect(state.unexpectedRequests).toEqual([]);
});

test('todas as áreas do motoqueiro cabem no celular sem overflow horizontal', async ({
  context,
  page,
}) => {
  const state = initialState();
  state.orders[0].status = 'SAIU_PARA_ENTREGA';
  state.orders[0].assignedCourierId = COURIER_ID;
  await page.setViewportSize({ width: 390, height: 844 });
  await enableSyntheticLocation(context);
  await mockCourierApi(page, state);
  await page.goto('/courier');

  const destinations = [
    ['Para retirar', 'Prontos para retirada'],
    ['Em entrega', 'Entregas em andamento'],
    ['Minha rota', 'Minha rota'],
    ['Histórico', 'Histórico'],
    ['Meu perfil', 'Meu perfil'],
    ['Visão geral', 'Visão geral'],
  ] as const;

  for (const [tab, title] of destinations) {
    await page.locator('header button').first().click();
    await page.locator('nav a').filter({ hasText: tab }).first().click();
    await expect(page.getByRole('heading', { name: title, exact: true }).first()).toBeVisible();
    const layout = await page.evaluate(() => ({
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
    }));
    expect(
      layout.documentWidth - layout.viewportWidth,
      `${tab}: overflow horizontal`,
    ).toBeLessThanOrEqual(1);
  }

  await page.locator('header button').first().click();
  await page.locator('nav a').filter({ hasText: 'Minha rota' }).first().click();
  const activateLocation = page.getByRole('button', {
    name: /(?:Ativar|Testar) localização/,
  });
  if (await activateLocation.isVisible()) {
    await activateLocation.click();
  }
  await expect(page.locator('.delivery-map-shell')).toBeVisible();
  const mapBounds = await page.locator('.delivery-map-shell').boundingBox();
  expect(mapBounds).not.toBeNull();
  if (mapBounds) {
    expect(mapBounds.x).toBeGreaterThanOrEqual(0);
    expect(mapBounds.x + mapBounds.width).toBeLessThanOrEqual(390);
  }
});
