import { expect, test, type Page, type Route } from '@playwright/test';
import { mockAuthRefresh } from './helpers/mockAuthRefresh';
import { captureReadmeScreenshot } from './helpers/readmeScreenshot';

const RESTAURANT_ID = 41;
const OTHER_RESTAURANT_ID = 99;
const KITCHEN_TOKEN = 'e2e-kitchen-tenant-41-token';

type KitchenOrderStatus = 'PENDENTE' | 'PREPARANDO' | 'PRONTO' | 'ENTREGUE' | 'CANCELADO';

type RawOrder = Record<string, unknown> & {
  id: number;
  restaurantId: number;
  status: KitchenOrderStatus;
  type: 'MESA' | 'RETIRADA' | 'DELIVERY';
  createdAt: string;
};

type KitchenE2EState = {
  orders: RawOrder[];
  orderRequests: number;
  orderRequestTokens: string[];
  updates: Array<{ id: number; status: KitchenOrderStatus }>;
  reprints: number[];
  rejectedTenantRequests: number;
  unexpectedRequests: string[];
  orderFailuresRemaining: number;
  holdNextOrdersRequest: boolean;
  releaseOrdersRequest?: () => void;
};

const kitchenUser = {
  id: 91,
  name: 'Ana da Cozinha',
  email: 'ana.cozinha@restaurante.test',
  role: 'FUNCIONARIO',
  subRole: 'COZINHA',
  restaurantId: RESTAURANT_ID,
};

function isoMinutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

function rawOrders(): RawOrder[] {
  const common = {
    restaurantId: RESTAURANT_ID,
    customerName: 'Cliente do restaurante 41',
    total: 42,
    createdAt: isoMinutesAgo(18),
  };

  return [
    {
      ...common,
      id: 71,
      type: 'MESA',
      status: 'PENDENTE',
      tableNumber: 4,
      table: { id: 14, number: 4, restaurantId: RESTAURANT_ID },
      observation: 'Enviar molho separado e identificar a comanda',
      items: [
        {
          id: 710,
          quantity: 2,
          observation: 'Assar bem a massa e cortar em oito pedaços',
          product: { id: 101, name: 'Pizza artesanal completa' },
          ingredients: [
            { id: 1, name: 'Massa fina', price: 0 },
            { id: 2, name: 'Bacon crocante', price: 7 },
          ],
          customizations: [
            {
              groupName: 'Massa',
              options: [{ optionId: 1, name: 'Massa fina', price: 0 }],
            },
            {
              groupName: 'Adicionais',
              options: [
                {
                  optionId: 2,
                  ingredient: { id: 2, name: 'Bacon crocante' },
                  price: 7,
                },
              ],
            },
          ],
        },
        {
          id: 711,
          quantity: 1,
          observation: 'Sem açúcar',
          product: { id: 102, name: 'Suco natural' },
          ingredients: [{ id: 3, name: 'Limão siciliano', price: 0 }],
        },
      ],
    },
    {
      ...common,
      id: 72,
      type: 'MESA',
      status: 'PREPARANDO',
      tableNumber: 12,
      table: { id: 22, number: 12, restaurantId: RESTAURANT_ID },
      preparationStartedAt: isoMinutesAgo(8),
      customerName: 'Bruno Mesa',
      items: [
        {
          id: 720,
          quantity: 1,
          product: { id: 103, name: 'Lasanha da casa' },
        },
      ],
    },
    {
      ...common,
      id: 73,
      type: 'MESA',
      status: 'PRONTO',
      tableNumber: 3,
      table: { id: 13, number: 3, restaurantId: RESTAURANT_ID },
      readyAt: isoMinutesAgo(4),
      customerName: 'Carla Mesa',
      items: [
        {
          id: 730,
          quantity: 1,
          product: { id: 104, name: 'Risoto de cogumelos' },
        },
      ],
    },
    {
      ...common,
      id: 81,
      type: 'RETIRADA',
      status: 'PENDENTE',
      customerName: 'Diego Retirada',
      items: [
        {
          id: 810,
          quantity: 1,
          product: { id: 105, name: 'Calzone para retirada' },
        },
      ],
    },
    {
      ...common,
      id: 82,
      type: 'RETIRADA',
      status: 'PRONTO',
      readyAt: isoMinutesAgo(3),
      customerName: 'Elisa Retirada',
      items: [
        {
          id: 820,
          quantity: 2,
          product: { id: 106, name: 'Esfiha pronta' },
        },
      ],
    },
    {
      ...common,
      id: 91,
      type: 'DELIVERY',
      status: 'PREPARANDO',
      preparationStartedAt: isoMinutesAgo(7),
      customerName: 'Fernanda Delivery',
      items: [
        {
          id: 910,
          quantity: 1,
          product: { id: 107, name: 'Combo delivery' },
        },
      ],
    },
    {
      ...common,
      id: 93,
      type: 'DELIVERY',
      status: 'PRONTO',
      readyAt: isoMinutesAgo(2),
      customerName: 'Gabriel Delivery',
      items: [
        {
          id: 930,
          quantity: 1,
          product: { id: 108, name: 'Pizza delivery pronta' },
        },
      ],
    },
    {
      ...common,
      id: 74,
      type: 'MESA',
      status: 'ENTREGUE',
      tableNumber: 8,
      table: { id: 18, number: 8, restaurantId: RESTAURANT_ID },
      completedAt: isoMinutesAgo(1),
      observation: 'Pedido entregue com molho separado',
      items: [
        {
          id: 740,
          quantity: 1,
          observation: 'Borda bem assada',
          product: { id: 109, name: 'Pizza histórica' },
          customizations: [
            {
              groupName: 'Borda',
              options: [{ name: 'Catupiry' }],
            },
          ],
        },
      ],
    },
    {
      ...common,
      id: 75,
      type: 'MESA',
      status: 'CANCELADO',
      tableNumber: 9,
      table: { id: 19, number: 9, restaurantId: RESTAURANT_ID },
      completedAt: isoMinutesAgo(2),
      observation: 'Cancelamento solicitado pelo cliente',
      items: [
        {
          id: 750,
          quantity: 1,
          product: { id: 110, name: 'Pedido cancelado' },
        },
      ],
    },
    {
      ...common,
      id: 94,
      type: 'DELIVERY',
      status: 'ENTREGUE',
      completedAt: isoMinutesAgo(2),
      customerName: 'Helena Delivery',
      items: [
        {
          id: 940,
          quantity: 1,
          product: { id: 111, name: 'Pedido delivery concluído' },
        },
      ],
    },
    {
      ...common,
      id: 999,
      restaurantId: OTHER_RESTAURANT_ID,
      type: 'MESA',
      status: 'PENDENTE',
      tableNumber: 99,
      customerName: 'Cliente de outro restaurante',
      items: [
        {
          id: 9990,
          quantity: 1,
          product: { id: 999, name: 'PEDIDO VAZADO DE OUTRO TENANT' },
        },
      ],
    },
  ];
}

function initialState(overrides: Partial<KitchenE2EState> = {}): KitchenE2EState {
  return {
    orders: rawOrders(),
    orderRequests: 0,
    orderRequestTokens: [],
    updates: [],
    reprints: [],
    rejectedTenantRequests: 0,
    unexpectedRequests: [],
    orderFailuresRemaining: 0,
    holdNextOrdersRequest: false,
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

async function mockKitchenApi(page: Page, state: KitchenE2EState) {
  await page.route('https://example.test/**', (route) => route.abort());
  await page.route(/^http:\/\/(127\.0\.0\.1|localhost):3000\/.*$/, async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    const method = request.method();
    const token = authorization(route);

    if (pathname.startsWith('/socket.io/')) {
      return route.abort();
    }
    if (pathname === '/platform/status' && method === 'GET') {
      return json(route, { available: true, message: 'Plataforma disponível.' });
    }

    if (token !== `Bearer ${KITCHEN_TOKEN}`) {
      state.rejectedTenantRequests += 1;
      return json(route, { error: 'Token não pertence ao restaurante esperado.' }, 401);
    }

    if (pathname === '/auth/me' && method === 'GET') {
      return json(route, { user: kitchenUser });
    }

    if (pathname === `/settings/public/${RESTAURANT_ID}` && method === 'GET') {
      return json(route, {
        restaurantId: RESTAURANT_ID,
        restaurantName: 'Restaurante Tenant 41',
        primaryColor: '#cf562f',
        restaurant: {
          id: RESTAURANT_ID,
          name: 'Restaurante Tenant 41',
          slug: 'restaurante-tenant-41',
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
        return json(route, { error: 'Falha simulada ao carregar a cozinha.' }, 503);
      }

      return json(route, {
        orders: state.orders.filter((order) => order.restaurantId === RESTAURANT_ID),
      });
    }

    const reprintRequest = pathname.match(/^\/kitchen-printing\/orders\/(\d+)\/reprint$/);
    if (reprintRequest && method === 'POST') {
      const id = Number(reprintRequest[1]);
      const order = state.orders.find(
        (candidate) => candidate.id === id && candidate.restaurantId === RESTAURANT_ID,
      );

      if (!order) {
        state.rejectedTenantRequests += 1;
        return json(route, { error: 'Pedido não pertence ao restaurante autenticado.' }, 404);
      }

      state.reprints.push(id);
      return json(route, { status: 'PENDING' }, 201);
    }

    const statusUpdate = pathname.match(/^\/orders\/(\d+)\/status$/);
    if (statusUpdate && method === 'PUT') {
      const id = Number(statusUpdate[1]);
      const payload = request.postDataJSON() as { status?: KitchenOrderStatus };
      const order = state.orders.find(
        (candidate) => candidate.id === id && candidate.restaurantId === RESTAURANT_ID,
      );

      if (!order) {
        state.rejectedTenantRequests += 1;
        return json(route, { error: 'Pedido não pertence ao restaurante autenticado.' }, 404);
      }

      const nextStatus = payload.status;
      const allowed =
        (order.status === 'PENDENTE' && nextStatus === 'PREPARANDO') ||
        (order.status === 'PREPARANDO' && nextStatus === 'PRONTO');

      if (!nextStatus || !allowed) {
        return json(route, { error: 'Transição de status inválida.' }, 400);
      }

      order.status = nextStatus;
      if (nextStatus === 'PREPARANDO') order.preparationStartedAt = new Date().toISOString();
      if (nextStatus === 'PRONTO') order.readyAt = new Date().toISOString();
      state.updates.push({ id, status: nextStatus });
      return json(route, order);
    }

    state.unexpectedRequests.push(`${method} ${pathname}`);
    return json(route, { error: 'Endpoint não mockado no cenário da cozinha.' }, 404);
  });

  await mockAuthRefresh(page, kitchenUser.id, KITCHEN_TOKEN);

  await page.addInitScript((user) => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('user', JSON.stringify(user));
  }, kitchenUser);
}

function orderCard(page: Page, id: number) {
  return page.locator(`[data-order-id="#${id}"]`);
}

async function openKitchenView(page: Page, label: string) {
  await page
    .getByRole('navigation', { name: 'Navegação da cozinha' })
    .getByRole('button', { name: label, exact: true })
    .click();
}

async function expectTenantSafeRequests(state: KitchenE2EState) {
  await expect.poll(() => state.orderRequests).toBeGreaterThan(0);
  expect(state.orderRequestTokens.every((token) => token === `Bearer ${KITCHEN_TOKEN}`)).toBe(true);
  expect(state.rejectedTenantRequests).toBe(0);
  expect(state.unexpectedRequests).toEqual([]);
}

test('pedido completo do tenant chega à fila e avança de pendente até pronto', async ({ page }) => {
  const state = initialState();
  await page.setViewportSize({ width: 1440, height: 960 });
  await mockKitchenApi(page, state);
  await page.goto('/kitchen');

  await expect(page.getByText('Restaurante Tenant 41')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Abrir #71 na fila de pedidos' })).toBeVisible();
  await expect(page.getByText('PEDIDO VAZADO DE OUTRO TENANT')).toHaveCount(0);
  await captureReadmeScreenshot(page, 'kitchen-overview.png', { fullPage: true });

  const priorityOrder = page.getByRole('button', { name: 'Abrir #71 na fila de pedidos' });
  await priorityOrder.focus();
  await page.keyboard.press('Enter');

  const queuedOrder = orderCard(page, 71);
  await expect(queuedOrder).toBeVisible();
  await expect(queuedOrder.getByText('Mesa 4', { exact: false })).toBeVisible();
  await expect(queuedOrder.getByText('2×', { exact: true })).toBeVisible();
  await expect(queuedOrder.getByText('Pizza artesanal completa')).toBeVisible();
  await expect(queuedOrder.getByText('Massa', { exact: true })).toBeVisible();
  await expect(queuedOrder.getByText('Massa fina', { exact: true })).toBeVisible();
  await expect(queuedOrder.getByText('Adicionais', { exact: true })).toBeVisible();
  await expect(queuedOrder.getByText('Bacon crocante', { exact: true })).toBeVisible();
  await expect(queuedOrder.getByText('Itens escolhidos', { exact: true })).toBeVisible();
  await expect(queuedOrder.getByText('Limão siciliano', { exact: true })).toBeVisible();
  await expect(queuedOrder.getByText('Assar bem a massa e cortar em oito pedaços')).toBeVisible();
  await expect(
    queuedOrder.getByText('Enviar molho separado e identificar a comanda'),
  ).toBeVisible();
  await expect(queuedOrder).not.toContainText('R$ 7');
  await captureReadmeScreenshot(page, 'kitchen-dashboard.png', { fullPage: true });

  await queuedOrder.getByRole('button', { name: 'Iniciar preparo' }).click();
  await expect.poll(() => state.updates).toEqual([{ id: 71, status: 'PREPARANDO' }]);
  await expect(queuedOrder.getByText('Preparando', { exact: true })).toBeVisible();
  await expect(queuedOrder.getByRole('button', { name: 'Marcar como pronto' })).toBeVisible();

  await queuedOrder.getByRole('button', { name: 'Marcar como pronto' }).click();
  await expect
    .poll(() => state.updates)
    .toEqual([
      { id: 71, status: 'PREPARANDO' },
      { id: 71, status: 'PRONTO' },
    ]);
  await expect(queuedOrder.getByText('Pronto', { exact: true })).toBeVisible();
  const reprintButton = queuedOrder.getByRole('button', { name: 'Reimprimir comanda' });
  await expect(reprintButton).toBeVisible();
  await reprintButton.click();
  await expect.poll(() => state.reprints).toEqual([71]);

  await openKitchenView(page, 'Prontos');
  const readyOrder = page
    .locator('article')
    .filter({ has: page.getByText('#71', { exact: true }) });
  await expect(readyOrder).toBeVisible();
  await expect(readyOrder.getByText('Mesa 4', { exact: false })).toBeVisible();
  await expect(readyOrder.getByText('Pizza artesanal completa')).toBeVisible();
  await expect(readyOrder.getByText('Pronto', { exact: true })).toBeVisible();

  await expectTenantSafeRequests(state);
});

test('busca, status, canais, prontos e histórico refletem os dados recebidos', async ({ page }) => {
  const state = initialState();
  await mockKitchenApi(page, state);
  await page.goto('/kitchen');
  await openKitchenView(page, 'Fila de pedidos');

  await expect(orderCard(page, 71)).toContainText('Mesa 4');
  await expect(orderCard(page, 72)).toContainText('Mesa 12');
  await expect(orderCard(page, 73)).toContainText('Mesa 3');
  await expect(orderCard(page, 81)).toContainText('Retirada');
  await expect(orderCard(page, 91)).toContainText('Delivery');

  const search = page.getByPlaceholder('Buscar pedido ou mesa');
  await search.fill('Bacon crocante');
  await expect(orderCard(page, 71)).toBeVisible();
  await expect(orderCard(page, 72)).toHaveCount(0);

  await search.clear();
  await page.locator('select').selectOption('PREPARANDO');
  await expect(orderCard(page, 72)).toBeVisible();
  await expect(orderCard(page, 91)).toBeVisible();
  await expect(orderCard(page, 71)).toHaveCount(0);
  await expect(orderCard(page, 73)).toHaveCount(0);

  await page.getByRole('button', { name: 'Retirada', exact: true }).click();
  await expect(orderCard(page, 81)).toContainText('Retirada');
  await expect(orderCard(page, 82)).toContainText('Retirada');
  await expect(orderCard(page, 72)).toHaveCount(0);

  await page.getByRole('button', { name: 'Delivery', exact: true }).click();
  await expect(orderCard(page, 91)).toContainText('Delivery');
  await expect(orderCard(page, 93)).toContainText('Delivery');
  await expect(orderCard(page, 81)).toHaveCount(0);

  await openKitchenView(page, 'Prontos');
  await expect(page.getByText('#73', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Retirada', exact: true }).click();
  await expect(page.getByText('#82', { exact: true })).toBeVisible();
  await expect(page.getByText('#73', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Delivery', exact: true }).click();
  await expect(page.getByText('#93', { exact: true })).toBeVisible();

  await openKitchenView(page, 'Histórico');
  const delivered = page.locator('.history-order').filter({ hasText: '#74' });
  const cancelled = page.locator('.history-order').filter({ hasText: '#75' });
  await expect(delivered.getByText('Entregue', { exact: true })).toBeVisible();
  await expect(cancelled.getByText('Cancelado', { exact: true })).toBeVisible();

  const historySearch = page.getByPlaceholder('Buscar no histórico');
  await historySearch.fill('cancelamento solicitado');
  await expect(cancelled).toBeVisible();
  await expect(delivered).toHaveCount(0);

  await historySearch.clear();
  await delivered.getByText('Ver itens, montagem e observações').click();
  await expect(delivered.getByText('Pizza histórica')).toBeVisible();
  await expect(delivered.getByText('Catupiry')).toBeVisible();
  await expect(delivered.getByText('Pedido entregue com molho separado')).toBeVisible();

  await page.getByRole('button', { name: 'Delivery', exact: true }).click();
  const deliveryHistory = page.locator('.history-order').filter({ hasText: '#94' });
  await expect(deliveryHistory.getByText('#94', { exact: true })).toBeVisible();
  await deliveryHistory.getByText('Ver itens, montagem e observações').click();
  await expect(deliveryHistory.getByText('Pedido delivery concluído')).toBeVisible();
  await page.getByRole('button', { name: 'Retirada', exact: true }).click();
  await expect(page.getByText('Nenhum pedido encontrado neste canal.')).toBeVisible();

  await expectTenantSafeRequests(state);
});

test('exibe carregamento, permite tentar novamente após erro e diferencia retorno vazio', async ({
  page,
}) => {
  const state = initialState({
    orders: rawOrders().filter((order) => order.restaurantId === OTHER_RESTAURANT_ID),
    orderFailuresRemaining: 1,
    holdNextOrdersRequest: true,
  });
  await mockKitchenApi(page, state);
  await page.goto('/kitchen');

  await expect(page.getByRole('status')).toContainText('Carregando pedidos');
  await expect.poll(() => Boolean(state.releaseOrdersRequest)).toBe(true);
  state.releaseOrdersRequest?.();

  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tentar novamente' })).toBeVisible();
  const requestsBeforeRetry = state.orderRequests;
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect.poll(() => state.orderRequests).toBeGreaterThan(requestsBeforeRetry);
  await expect(page.getByRole('alert')).toHaveCount(0);

  await openKitchenView(page, 'Fila de pedidos');
  await expect(page.getByText('Nenhum pedido neste status.')).toHaveCount(3);
  await openKitchenView(page, 'Prontos');
  await expect(page.getByText('Nenhum pedido pronto neste canal.')).toBeVisible();
  await openKitchenView(page, 'Histórico');
  await expect(page.getByText('Nenhum pedido encontrado neste canal.')).toBeVisible();
  await expect(page.getByText('PEDIDO VAZADO DE OUTRO TENANT')).toHaveCount(0);

  await expectTenantSafeRequests(state);
});

test('todas as abas da cozinha permanecem acessíveis e sem overflow em celular', async ({
  page,
}) => {
  const state = initialState();
  await page.setViewportSize({ width: 390, height: 844 });
  await mockKitchenApi(page, state);
  await page.goto('/kitchen');

  const destinations = [
    ['Fila de pedidos', 'Fila da cozinha'],
    ['Prontos', 'Pedidos prontos'],
    ['Histórico', 'Histórico'],
    ['Visão geral', 'Visão geral'],
  ] as const;
  const mobileNavigation = page.getByRole('navigation', {
    name: 'Navegação móvel da cozinha',
  });

  for (const [tab, title] of destinations) {
    await mobileNavigation.getByRole('button', { name: tab, exact: true }).click();
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();

    const layout = await page.evaluate(() => ({
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
    }));
    expect(
      Math.max(layout.documentWidth, layout.bodyWidth) - layout.viewportWidth,
      `${tab}: overflow horizontal`,
    ).toBeLessThanOrEqual(1);
  }

  await mobileNavigation.getByRole('button', { name: 'Fila de pedidos', exact: true }).click();
  const queuedOrder = orderCard(page, 71);
  await expect(queuedOrder.getByText('Bacon crocante')).toBeVisible();
  await expect(queuedOrder.getByText('Assar bem a massa e cortar em oito pedaços')).toBeVisible();
  await captureReadmeScreenshot(page, 'kitchen-mobile.png');

  const cardLayout = await queuedOrder.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
    left: element.getBoundingClientRect().left,
    right: element.getBoundingClientRect().right,
    viewportWidth: window.innerWidth,
  }));
  expect(cardLayout.scrollWidth).toBeLessThanOrEqual(cardLayout.clientWidth);
  expect(cardLayout.left).toBeGreaterThanOrEqual(0);
  expect(cardLayout.right).toBeLessThanOrEqual(cardLayout.viewportWidth);

  await expectTenantSafeRequests(state);
});
