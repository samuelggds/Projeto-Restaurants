import { expect, test, type Page, type Route } from '@playwright/test';
import { mockAuthRefresh } from './helpers/mockAuthRefresh';

const TABLE_TOKEN = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';
const WAITER_ACCESS_TOKEN = 'e2e-waiter-token';
const RESTAURANT_ID = 41;
const TABLE_ID = 11;
const SESSION_ID = 501;

type CallStatus = 'WAITING' | 'IN_PROGRESS' | 'RESOLVED';

type WaiterCall = {
  id: number;
  restaurantId: number;
  tableId: number;
  type: 'WAITER' | 'BILL';
  status: CallStatus;
  requestedAt: string;
  resolvedAt?: string | null;
  table: { id: number; number: number };
  assignedTo?: { id: number; name: string } | null;
};

type WaiterE2EState = {
  tableOpen: boolean;
  includeReadyOrder: boolean;
  outstandingOrder: boolean;
  orderPayload: Record<string, unknown> | null;
  openRequests: number;
  closeRequests: number;
  joinRequests: number;
  deliveredOrders: number[];
  callUpdates: Array<{ id: number; status: CallStatus }>;
  calls: WaiterCall[];
};

const waiterUser = {
  id: 91,
  name: 'Ana Garçonete',
  email: 'ana@restaurante.test',
  role: 'FUNCIONARIO',
  subRole: 'GARCOM',
  restaurantId: RESTAURANT_ID,
};

const product = {
  id: 101,
  name: 'Prato da casa',
  description: 'Monte o prato para a sua mesa.',
  price: 32,
  active: true,
  stock: null,
  image: 'https://example.test/prato.jpg',
  category: { id: 5, name: 'Principais' },
  optionGroups: [
    {
      id: 10,
      name: 'Escolha o acompanhamento',
      description: 'Selecione uma opção para continuar.',
      required: true,
      selectionType: 'SINGLE',
      minSelections: 1,
      maxSelections: 1,
      options: [
        {
          id: 1001,
          ingredientId: 1,
          active: true,
          ingredient: { id: 1, name: 'Arroz da casa', price: 0, active: true },
        },
      ],
    },
  ],
};

function isoMinutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

function initialState(): WaiterE2EState {
  return {
    tableOpen: false,
    includeReadyOrder: true,
    outstandingOrder: false,
    orderPayload: null,
    openRequests: 0,
    closeRequests: 0,
    joinRequests: 0,
    deliveredOrders: [],
    callUpdates: [],
    calls: [
      {
        id: 801,
        restaurantId: RESTAURANT_ID,
        tableId: TABLE_ID,
        type: 'WAITER',
        status: 'WAITING',
        requestedAt: isoMinutesAgo(8),
        table: { id: TABLE_ID, number: 7 },
      },
      {
        id: 802,
        restaurantId: RESTAURANT_ID,
        tableId: 12,
        type: 'BILL',
        status: 'IN_PROGRESS',
        requestedAt: isoMinutesAgo(4),
        table: { id: 12, number: 12 },
        assignedTo: { id: 92, name: 'Carlos' },
      },
      {
        id: 803,
        restaurantId: RESTAURANT_ID,
        tableId: 13,
        type: 'WAITER',
        status: 'RESOLVED',
        requestedAt: isoMinutesAgo(15),
        resolvedAt: new Date().toISOString(),
        table: { id: 13, number: 3 },
        assignedTo: { id: 91, name: waiterUser.name },
      },
    ],
  };
}

function rawOrders(state: WaiterE2EState) {
  const common = {
    restaurantId: RESTAURANT_ID,
    total: 42,
    createdAt: isoMinutesAgo(6),
    items: [
      {
        id: 1,
        quantity: 1,
        product: { id: 101, name: 'Prato da casa' },
      },
    ],
  };

  return [
    ...(state.includeReadyOrder
      ? [
          {
            ...common,
            id: 710,
            type: 'MESA',
            tableId: TABLE_ID,
            tableNumber: 7,
            status: 'PRONTO',
            readyAt: isoMinutesAgo(5),
            observation: 'Levar talheres',
          },
        ]
      : []),
    {
      ...common,
      id: 711,
      type: 'MESA',
      tableId: 12,
      tableNumber: 12,
      status: state.outstandingOrder ? 'PENDENTE' : 'ENTREGUE',
    },
    {
      ...common,
      id: 712,
      type: 'DELIVERY',
      status: 'PRONTO',
    },
    ...(state.orderPayload
      ? [
          {
            ...common,
            id: 901,
            type: 'MESA',
            tableId: TABLE_ID,
            tableNumber: 7,
            status: state.outstandingOrder ? 'PENDENTE' : 'ENTREGUE',
            paid: !state.outstandingOrder,
          },
        ]
      : []),
  ];
}

function rawTables(state: WaiterE2EState) {
  const openSession = state.tableOpen
    ? {
        id: SESSION_ID,
        status: 'OPEN',
        openedAt: isoMinutesAgo(10),
      }
    : null;

  return [
    {
      id: TABLE_ID,
      number: 7,
      active: true,
      operational: {
        status: state.tableOpen ? 'OCCUPIED' : 'FREE',
        openSession,
        guests: state.tableOpen ? 1 : 0,
        total: state.outstandingOrder ? 32 : 0,
      },
      tableSessions: openSession ? [openSession] : [],
    },
    {
      id: 12,
      number: 12,
      active: true,
      operational: {
        status: 'OCCUPIED',
        openSession: { id: 502, status: 'OPEN', openedAt: isoMinutesAgo(30) },
        guests: 2,
        total: 84,
      },
    },
    {
      id: 13,
      number: 3,
      active: true,
      operational: { status: 'FREE', openSession: null, guests: 0, total: 0 },
    },
  ];
}

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

async function mockAnonymousAuthRefresh(page: Page) {
  await page.route(/^http:\/\/(127\.0\.0\.1|localhost):3000\/.*$/, async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;

    if (pathname === '/auth/refresh' && request.method() === 'POST') {
      return json(route, { error: 'Não autenticado.' }, 401);
    }

    await route.fallback();
  });
}

async function mockWaiterAndTableApi(page: Page, state: WaiterE2EState) {
  await page.route('https://example.test/**', (route) => route.abort());
  await page.route(/^http:\/\/(127\.0\.0\.1|localhost):3000\/.*$/, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname;
    const method = request.method();

    if (pathname === '/auth/me') {
      return json(route, { user: waiterUser });
    }

    if (pathname === `/settings/public/${RESTAURANT_ID}`) {
      return json(route, {
        restaurantId: RESTAURANT_ID,
        restaurantName: 'Restaurante Salão',
        primaryColor: '#cf562f',
        isOpenForOrders: true,
        tableOrderingEnabled: true,
        acceptsPix: true,
        acceptsCard: true,
        restaurant: {
          id: RESTAURANT_ID,
          name: 'Restaurante Salão',
          slug: 'restaurante-teste',
        },
      });
    }

    if (pathname === '/settings/public/slug/restaurante-teste') {
      return json(route, {
        restaurantId: RESTAURANT_ID,
        restaurantName: 'Restaurante Salão',
        primaryColor: '#cf562f',
        isOpenForOrders: true,
        tableOrderingEnabled: true,
        acceptsPix: true,
        acceptsCard: true,
        restaurant: {
          id: RESTAURANT_ID,
          name: 'Restaurante Salão',
          slug: 'restaurante-teste',
        },
      });
    }

    if (pathname === '/orders' && method === 'GET') {
      return json(route, { orders: rawOrders(state) });
    }

    const deliveredOrder = pathname.match(/^\/orders\/(\d+)\/status$/);
    if (deliveredOrder && method === 'PUT') {
      const orderId = Number(deliveredOrder[1]);
      const payload = request.postDataJSON() as { status?: string };
      if (orderId !== 710 || payload.status !== 'ENTREGUE') {
        return json(route, { error: 'Transição de pedido inválida.' }, 400);
      }
      state.includeReadyOrder = false;
      state.deliveredOrders.push(orderId);
      return json(route, { id: orderId, type: 'MESA', status: 'ENTREGUE', paid: true });
    }

    if (pathname === '/tables' && method === 'GET') {
      return json(route, rawTables(state));
    }

    if (pathname === '/waiter-calls' && method === 'GET') {
      return json(route, state.calls);
    }

    const callUpdate = pathname.match(/^\/waiter-calls\/(\d+)\/status$/);
    if (callUpdate && method === 'PATCH') {
      const id = Number(callUpdate[1]);
      const payload = request.postDataJSON() as { status: CallStatus };
      const call = state.calls.find((item) => item.id === id);
      if (!call) return json(route, { error: 'Chamado não encontrado neste restaurante.' }, 400);
      call.status = payload.status;
      if (payload.status === 'IN_PROGRESS') {
        call.assignedTo = { id: waiterUser.id, name: waiterUser.name };
      }
      if (payload.status === 'RESOLVED') call.resolvedAt = new Date().toISOString();
      state.callUpdates.push({ id, status: payload.status });
      return json(route, call);
    }

    if (pathname === '/table-sessions/open' && method === 'POST') {
      const payload = request.postDataJSON() as { tableId: number };
      state.openRequests += 1;
      if (Number(payload.tableId) !== TABLE_ID) {
        return json(route, { error: 'Mesa não encontrada neste restaurante.' }, 400);
      }
      state.tableOpen = true;
      return json(route, {
        sessionId: SESSION_ID,
        session: {
          id: SESSION_ID,
          tableId: TABLE_ID,
          status: 'OPEN',
          openedAt: new Date().toISOString(),
        },
      });
    }

    if (pathname === `/table-sessions/${SESSION_ID}/close` && method === 'PATCH') {
      state.closeRequests += 1;
      if (state.outstandingOrder) {
        return json(
          route,
          {
            error: 'Não é possível fechar a mesa: existem pedidos ou pagamentos pendentes (#901).',
          },
          400,
        );
      }
      state.tableOpen = false;
      return json(route, {
        id: SESSION_ID,
        tableId: TABLE_ID,
        status: 'CLOSED',
        closedAt: new Date().toISOString(),
      });
    }

    if (pathname === '/tables/public/resolve' && method === 'GET') {
      const validReference =
        url.searchParams.get('tableNumber') === '7' &&
        url.searchParams.get('tableId') === String(TABLE_ID) &&
        url.searchParams.get('restaurantId') === String(RESTAURANT_ID) &&
        url.searchParams.get('tableToken') === TABLE_TOKEN &&
        url.searchParams.get('slug') === 'restaurante-teste';
      if (!validReference) {
        return json(
          route,
          { error: 'O QR Code da mesa é inválido.', code: 'INVALID_TABLE_TOKEN' },
          400,
        );
      }
      return json(route, {
        id: TABLE_ID,
        number: 7,
        restaurantId: RESTAURANT_ID,
        restaurantSlug: 'restaurante-teste',
        tableOrderingEnabled: true,
        waiterCallEnabled: true,
        billRequestEnabled: true,
      });
    }

    if (pathname === '/table-sessions/join' && method === 'POST') {
      const payload = request.postDataJSON() as Record<string, unknown>;
      state.joinRequests += 1;
      const validReference =
        Number(payload.tableId) === TABLE_ID &&
        Number(payload.tableNumber) === 7 &&
        Number(payload.restaurantId) === RESTAURANT_ID &&
        payload.tableToken === TABLE_TOKEN &&
        payload.restaurantSlug === 'restaurante-teste';
      if (!validReference) {
        return json(route, { error: 'O QR Code da mesa é inválido.' }, 400);
      }
      if (!state.tableOpen) {
        return json(
          route,
          {
            error:
              'Esta mesa ainda não foi aberta pelo garçom. Aguarde o atendimento e tente novamente.',
          },
          400,
        );
      }
      return json(route, {
        sessionToken: 'session-token-table-7',
        sessionId: SESSION_ID,
        tableId: TABLE_ID,
        tableNumber: 7,
        restaurantId: RESTAURANT_ID,
        tableOrderingEnabled: true,
        waiterCallEnabled: true,
        billRequestEnabled: true,
      });
    }

    if (pathname === '/table-sessions/current' && method === 'GET') {
      if (!state.tableOpen) {
        return json(route, { error: 'Sessão de mesa não encontrada.' }, 404);
      }
      return json(route, {
        id: SESSION_ID,
        sessionId: SESSION_ID,
        tableId: TABLE_ID,
        tableNumber: 7,
        restaurantId: RESTAURANT_ID,
        status: 'OPEN',
      });
    }

    if (pathname === '/products' && method === 'GET') {
      return json(route, { products: [product] });
    }

    if (pathname === '/orders/quote' && method === 'POST') {
      return json(route, {
        quote: {
          itemsSubtotal: 32,
          productDiscountTotal: 0,
          couponDiscount: 0,
          deliveryFeeAmount: 0,
          total: 32,
          couponCode: null,
        },
      });
    }

    if (pathname === '/orders/pix/payment' && method === 'POST') {
      if (!state.tableOpen) {
        return json(route, { error: 'Esta mesa não possui uma sessão aberta.' }, 400);
      }
      state.orderPayload = request.postDataJSON() as Record<string, unknown>;
      state.outstandingOrder = true;
      return json(route, {
        orderId: 901,
        totalAmount: 32,
        paymentId: 'pix-901',
        provider: 'PIX',
        qrCode: '00020101021226890014br.gov.bcb.pix',
        qrCodeBase64: null,
        requiresStatusCheck: false,
      });
    }

    if (pathname === '/orders/table/current' && method === 'GET') {
      return json(route, { order: null });
    }

    if (pathname === '/coupons/loyalty' && method === 'GET') {
      return json(route, null);
    }

    return json(route, {});
  });

  await mockAuthRefresh(page, waiterUser.id, WAITER_ACCESS_TOKEN);

  await page.addInitScript((user) => {
    const persona = localStorage.getItem('waiterE2EPersona') || 'waiter';
    if (persona === 'waiter') {
      localStorage.setItem('user', JSON.stringify(user));
      return;
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }, waiterUser);
}

function metric(page: Page, label: string) {
  return page.locator('article').filter({ hasText: label }).first();
}

function tableCard(page: Page, tableNumber: string) {
  return page
    .locator('article')
    .filter({ hasText: `Mesa ${tableNumber}` })
    .first();
}

async function restoreWaiterSession(page: Page) {
  await page.evaluate((user) => {
    localStorage.setItem('waiterE2EPersona', 'waiter');
    localStorage.removeItem('tableSession');
    localStorage.removeItem('tableSessionToken');
    localStorage.setItem('user', JSON.stringify(user));
  }, waiterUser);
  await mockAuthRefresh(page, waiterUser.id, WAITER_ACCESS_TOKEN);
}

async function clearEmployeeSession(page: Page) {
  await page.evaluate(() => {
    localStorage.setItem('waiterE2EPersona', 'customer');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('tableSession');
    localStorage.removeItem('tableSessionToken');
  });
  await mockAnonymousAuthRefresh(page);
}

test('garçom consulta visão geral, filtra entregas e atende chamados persistidos', async ({
  page,
}) => {
  const state = initialState();
  state.tableOpen = true;
  await mockWaiterAndTableApi(page, state);
  await page.goto('/waiter');

  await expect(page.getByRole('heading', { name: 'Visão geral' })).toBeVisible();
  const overviewTab = page
    .getByRole('navigation', { name: 'Navegação do garçom' })
    .getByRole('button', { name: 'Visão geral' });
  const navigationStyle = await overviewTab.evaluate((element) => {
    const style = window.getComputedStyle(element);
    const bounds = element.getBoundingClientRect();
    return {
      width: bounds.width,
      height: bounds.height,
      display: style.display,
      borderRadius: style.borderRadius,
      backgroundColor: style.backgroundColor,
    };
  });
  expect(navigationStyle.width).toBeGreaterThan(190);
  expect(navigationStyle.height).toBe(52);
  expect(navigationStyle.display).toBe('flex');
  expect(navigationStyle.borderRadius).toBe('10px');
  expect(navigationStyle.backgroundColor).not.toBe('rgb(239, 239, 239)');
  await expect(metric(page, 'Prontos para entregar').getByText('1', { exact: true })).toBeVisible();
  await expect(metric(page, 'Chamados aguardando').getByText('1', { exact: true })).toBeVisible();
  await expect(metric(page, 'Mesas ocupadas').getByText('2', { exact: true })).toBeVisible();
  await expect(page.getByText('Levar talheres')).toBeVisible();
  const readyOrder = page.getByRole('button', { name: 'Abrir pedido #710 em Para entregar' });
  await expect(readyOrder).toBeVisible();
  await readyOrder.click();
  await expect(page.getByRole('heading', { name: 'Pedidos para entregar' })).toBeVisible();
  await expect(page.locator('#waiter-ready-order-710')).toHaveClass(/highlighted/);

  await page.getByLabel('Buscar pedidos prontos').fill('Mesa 7');
  await expect(page.locator('article').filter({ hasText: 'Pedido #710' }).first()).toBeVisible();
  await expect(page.locator('article').filter({ hasText: 'Pedido #712' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Entregue à mesa' }).click();
  await expect.poll(() => state.deliveredOrders).toEqual([710]);
  await expect(page.locator('article').filter({ hasText: 'Pedido #710' })).toHaveCount(0);
  await page.getByLabel('Buscar pedidos prontos').fill('Mesa inexistente');
  await expect(page.getByText('Nenhum pedido pronto para os filtros selecionados.')).toBeVisible();

  await page.locator('nav').getByText('Chamados', { exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Chamados', exact: true })).toBeVisible();
  await page.getByLabel('Buscar chamados').fill('Mesa 7');
  const waitingCall = tableCard(page, '07');
  await expect(waitingCall.getByText('Chamou o garçom')).toBeVisible();
  await waitingCall.getByRole('button', { name: 'Atender' }).click();
  await expect.poll(() => state.callUpdates).toContainEqual({ id: 801, status: 'IN_PROGRESS' });
  await expect(waitingCall.getByRole('button', { name: 'Concluir' })).toBeVisible();
  await waitingCall.getByRole('button', { name: 'Concluir' }).click();
  await expect.poll(() => state.callUpdates).toContainEqual({ id: 801, status: 'RESOLVED' });

  await page.getByLabel('Filtrar chamados por status').selectOption('RESOLVED');
  await expect(page.getByRole('heading', { name: 'Concluídos' })).toBeVisible();
  await expect(tableCard(page, '07').getByText('Chamou o garçom')).toBeVisible();
  await expect(metric(page, 'Atendidos hoje').getByText('2', { exact: true })).toBeVisible();
});

test('QR sem PIN só libera pedidos com mesa aberta e fechamento respeita pendências', async ({
  page,
}) => {
  const state = initialState();
  state.includeReadyOrder = false;
  await mockWaiterAndTableApi(page, state);
  await page.goto('/waiter');
  await page.locator('nav').getByText('Mesas e QR Codes', { exact: true }).click();

  const card = tableCard(page, '07');
  await expect(card.getByText('LIVRE', { exact: true })).toBeVisible();
  await expect(card.getByRole('button', { name: 'Abrir mesa' })).toBeVisible();
  await expect(page.getByRole('button', { name: /visualizar qr code|imprimir qr/i })).toHaveCount(
    0,
  );

  await clearEmployeeSession(page);
  await page.goto(`/restaurante-teste/mesa/7?tid=${TABLE_ID}&rid=42&tk=${TABLE_TOKEN}`);
  await expect(page.getByRole('alert')).toContainText('O QR Code da mesa é inválido.');
  expect(state.joinRequests).toBe(0);

  await restoreWaiterSession(page);
  await page.goto('/waiter');
  await page.locator('nav').getByText('Mesas e QR Codes', { exact: true }).click();
  await tableCard(page, '07').getByRole('button', { name: 'Abrir mesa' }).click();
  await expect.poll(() => state.openRequests).toBe(1);
  await expect(tableCard(page, '07').getByRole('button', { name: 'Fechar mesa' })).toBeVisible();

  await clearEmployeeSession(page);
  await page.goto(
    `/restaurante-teste/mesa/7?tid=${TABLE_ID}&rid=${RESTAURANT_ID}&tk=${TABLE_TOKEN}`,
  );
  await expect(page.getByText('Prato da casa').first()).toBeVisible();
  await expect.poll(() => state.joinRequests).toBeGreaterThan(0);

  await page.getByRole('button', { name: 'Ver detalhes de Prato da casa' }).click();
  await page.getByText('Arroz da casa').click();
  await page.getByRole('button', { name: 'Adicionar à sacola' }).click();
  await expect(page.getByRole('heading', { name: 'Minha sacola' })).toBeVisible();
  await page.getByRole('button', { name: 'Revisar e continuar' }).click();
  const continuationDialog = page.getByRole('dialog', { name: 'Como deseja continuar?' });
  await expect(continuationDialog).toBeVisible();
  await continuationDialog.getByRole('button', { name: 'Pix' }).click();
  await continuationDialog.getByRole('button', { name: /Pagar agora/ }).click();
  await expect.poll(() => state.orderPayload).not.toBeNull();
  expect(state.orderPayload).toMatchObject({
    restaurantId: RESTAURANT_ID,
    type: 'MESA',
    tableId: TABLE_ID,
    paymentMethod: 'PIX',
  });
  await expect(page.getByText(/Pix/i).first()).toBeVisible();

  await restoreWaiterSession(page);
  await page.goto('/waiter');
  await page.locator('nav').getByText('Mesas e QR Codes', { exact: true }).click();
  const occupiedCard = tableCard(page, '07');
  await occupiedCard.getByRole('button', { name: 'Fechar mesa' }).click();
  await expect(occupiedCard.getByRole('alert')).toContainText(
    'existem pedidos ou pagamentos pendentes',
  );
  expect(state.tableOpen).toBe(true);

  state.outstandingOrder = false;
  await occupiedCard.getByRole('button', { name: 'Fechar mesa' }).click();
  await expect.poll(() => state.tableOpen).toBe(false);
  await expect(occupiedCard.getByRole('button', { name: 'Abrir mesa' })).toBeVisible();

  await clearEmployeeSession(page);
  await page.goto(
    `/restaurante-teste/mesa/7?tid=${TABLE_ID}&rid=${RESTAURANT_ID}&tk=${TABLE_TOKEN}`,
  );
  await expect(page.getByText(/ainda não foi aberta pelo garçom/i)).toBeVisible();
  await expect(page.getByText('Prato da casa')).toHaveCount(0);
});

test('todas as abas do garçom permanecem acessíveis e sem overflow em celular', async ({
  page,
}) => {
  const state = initialState();
  state.tableOpen = true;
  await page.setViewportSize({ width: 390, height: 844 });
  await mockWaiterAndTableApi(page, state);
  await page.goto('/waiter');

  const destinations = [
    ['Para entregar', 'Pedidos para entregar'],
    ['Mesas e QR Codes', 'Mesas e QR Codes'],
    ['Chamados', 'Chamados'],
    ['Visão geral', 'Visão geral'],
  ] as const;

  for (const [tab, title] of destinations) {
    await page.getByRole('button', { name: 'Abrir menu' }).click();
    await page.locator('nav').getByText(tab, { exact: true }).click();
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
    const layout = await page.evaluate(() => ({
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
    }));
    expect(
      layout.documentWidth - layout.viewportWidth,
      `${tab}: overflow horizontal`,
    ).toBeLessThanOrEqual(1);
  }

  await page.getByRole('button', { name: 'Abrir menu' }).click();
  await page.locator('nav').getByText('Mesas e QR Codes', { exact: true }).click();
  const mobileTable = tableCard(page, '07');
  await expect(mobileTable.getByRole('button', { name: 'Fechar mesa' })).toBeVisible();
  await expect(page.getByRole('button', { name: /visualizar qr code|imprimir qr/i })).toHaveCount(
    0,
  );
  const tableBounds = await mobileTable.boundingBox();
  expect(tableBounds).not.toBeNull();
  if (tableBounds) {
    expect(tableBounds.x).toBeGreaterThanOrEqual(0);
    expect(tableBounds.x + tableBounds.width).toBeLessThanOrEqual(390);
  }
});
