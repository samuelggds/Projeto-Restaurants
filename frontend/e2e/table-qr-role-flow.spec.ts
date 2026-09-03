import { expect, test, type Page, type Route, type TestInfo } from '@playwright/test';
import { mockAuthRefresh } from './helpers/mockAuthRefresh';

const RESTAURANT_ID = 1;
const TABLE_ID = 101;
const TABLE_NUMBER = 1;
const TABLE_TOKEN = '11112222333344445555666677778888';
const TABLE_SESSION_ID = 701;
const TABLE_SESSION_PUBLIC_ID = '323e4567-e89b-42d3-a456-426614174701';
const TABLE_PARTICIPANT_PUBLIC_ID = '323e4567-e89b-42d3-a456-426614174702';
const TABLE_PAYMENT_PUBLIC_ID = '323e4567-e89b-42d3-a456-426614174703';
const CARD_ORDER_PUBLIC_ID = '323e4567-e89b-42d3-a456-426614174704';

const ACCESS_TOKENS = {
  admin: 'e2e-admin-token',
  waiter: 'e2e-waiter-token',
  kitchen: 'e2e-kitchen-token',
} as const;

type Persona = 'admin' | 'waiter' | 'customer' | 'kitchen';

type FlowState = {
  tableCreated: boolean;
  tableOpen: boolean;
  createTablePayload: Record<string, unknown> | null;
  orderPayload: Record<string, unknown> | null;
  orderStatus: 'PENDENTE' | 'PREPARANDO' | 'PRONTO' | 'ENTREGUE';
  adminTableReads: number;
  waiterTableReads: number;
  tablePaymentPayload?: Record<string, unknown> | null;
  tablePaymentStatus?: 'PROCESSING' | 'PAID' | null;
  tablePaymentIdempotencyKey?: string | null;
  cardPaymentStatus?: 'PENDING' | 'PAID';
  cardPaymentStatusReads?: number;
};

const users = {
  admin: {
    id: 11,
    name: 'Admin Restaurante',
    email: 'admin@restaurante.test',
    role: 'ADMIN',
    restaurantId: RESTAURANT_ID,
    restaurantSlug: 'restaurante-teste',
  },
  waiter: {
    id: 12,
    name: 'Ana Garçonete',
    email: 'ana@restaurante.test',
    role: 'FUNCIONARIO',
    subRole: 'GARCOM',
    restaurantId: RESTAURANT_ID,
  },
  kitchen: {
    id: 13,
    name: 'Cozinha Restaurante',
    email: 'cozinha@restaurante.test',
    role: 'FUNCIONARIO',
    subRole: 'COZINHA',
    restaurantId: RESTAURANT_ID,
  },
} as const;

const product = {
  id: 301,
  name: 'Prato da mesa',
  description: 'Escolha o acompanhamento do seu prato.',
  price: 28,
  active: true,
  stock: null,
  image: '',
  category: { id: 10, name: 'Principais' },
  optionGroups: [
    {
      id: 51,
      name: 'Acompanhamento',
      description: 'Selecione uma opção para continuar.',
      required: true,
      selectionType: 'SINGLE',
      minSelections: 1,
      maxSelections: 1,
      options: [
        {
          id: 511,
          ingredientId: 61,
          active: true,
          ingredient: { id: 61, name: 'Arroz', price: 0, active: true },
        },
      ],
    },
  ],
};

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

function bearerPersona(route: Route): Persona | null {
  const authorization = route.request().headers().authorization || '';
  if (authorization.includes(ACCESS_TOKENS.admin)) return 'admin';
  if (authorization.includes(ACCESS_TOKENS.waiter)) return 'waiter';
  if (authorization.includes(ACCESS_TOKENS.kitchen)) return 'kitchen';
  return null;
}

async function mockPersonaAuthRefresh(page: Page, persona: Persona) {
  if (persona === 'customer') {
    await page.route(/^http:\/\/(127\.0\.0\.1|localhost):3000\/.*$/, async (route) => {
      const request = route.request();
      const pathname = new URL(request.url()).pathname;

      if (pathname === '/auth/refresh' && request.method() === 'POST') {
        return json(route, { error: 'Não autenticado.' }, 401);
      }

      await route.fallback();
    });
    return;
  }

  await mockAuthRefresh(page, users[persona].id, ACCESS_TOKENS[persona]);
}

function tableFor(persona: Persona | null, state: FlowState) {
  if (!state.tableCreated) return null;
  return {
    id: TABLE_ID,
    number: TABLE_NUMBER,
    ...(persona === 'admin' ? { token: TABLE_TOKEN } : {}),
    active: true,
    restaurantId: RESTAURANT_ID,
    operational: {
      status: state.tableOpen ? 'OCCUPIED' : 'FREE',
      openSession: state.tableOpen
        ? {
            id: TABLE_SESSION_ID,
            status: 'OPEN',
            openedAt: new Date().toISOString(),
          }
        : null,
      guests: state.tableOpen ? 1 : 0,
      total: state.orderPayload ? 28 : 0,
    },
  };
}

function createdKitchenOrder(state: FlowState) {
  if (!state.orderPayload) return [];
  return [
    {
      id: 1001,
      restaurantId: RESTAURANT_ID,
      type: 'MESA',
      tableId: TABLE_ID,
      status: state.orderStatus,
      paid: true,
      total: 28,
      createdAt: new Date().toISOString(),
      tableSession: {
        id: TABLE_SESSION_ID,
        table: { id: TABLE_ID, number: TABLE_NUMBER },
      },
      items: [
        {
          id: 10011,
          quantity: 1,
          product: { id: product.id, name: product.name },
          customizations: [
            {
              groupName: 'Acompanhamento',
              options: [{ optionId: 511, name: 'Arroz', price: 0 }],
            },
          ],
        },
      ],
    },
  ];
}

function tablePayment(state: FlowState) {
  const status = state.tablePaymentStatus || 'PROCESSING';
  return {
    publicId: TABLE_PAYMENT_PUBLIC_ID,
    sessionPublicId: TABLE_SESSION_PUBLIC_ID,
    payerParticipantPublicId: TABLE_PARTICIPANT_PUBLIC_ID,
    selectionMode: 'SELECTED_ITEMS',
    method: 'PIX',
    status,
    billItemPublicIds: ['bill-item-1'],
    subtotalCents: 2_800,
    serviceFeeCents: 280,
    totalCents: 3_080,
    provider: 'FAKE_TABLE',
    externalId: 'table-pix-e2e',
    checkoutUrl: null,
    paymentCode: '00020101021226890014br.gov.bcb.pix.e2e',
    expiresAt: '2030-01-01T12:10:00.000Z',
    createdAt: '2030-01-01T12:00:00.000Z',
    updatedAt: '2030-01-01T12:00:00.000Z',
  };
}

function tableAccountSnapshot(state: FlowState) {
  const hasItem = Boolean(state.orderPayload);
  const payment = state.tablePaymentStatus ? tablePayment(state) : null;
  const processing = state.tablePaymentStatus === 'PROCESSING';
  const paid = state.tablePaymentStatus === 'PAID';
  return {
    contractVersion: 1,
    currentParticipantPublicId: TABLE_PARTICIPANT_PUBLIC_ID,
    capabilities: {
      enabled: true,
      allowCash: true,
      allowCardMachine: true,
      allowOnlinePayment: true,
      allowSplit: true,
      serviceFeeMode: 'OPTIONAL',
      serviceFeeBasisPoints: 1_000,
      reservationTimeoutMinutes: 10,
    },
    summary: {
      sessionPublicId: TABLE_SESSION_PUBLIC_ID,
      tableNumber: TABLE_NUMBER,
      status: 'OPEN',
      consumedCents: hasItem ? 2_800 : 0,
      serviceFeeCents: paid ? 280 : 0,
      grossPaidCents: paid ? 3_080 : 0,
      refundedCents: 0,
      netPaidCents: paid ? 3_080 : 0,
      reservedCents: 0,
      processingCents: processing ? 3_080 : 0,
      remainingCents: hasItem && !processing && !paid ? 2_800 : 0,
      overpaidCents: 0,
      participantsCount: 1,
    },
    participants: [
      {
        publicId: TABLE_PARTICIPANT_PUBLIC_ID,
        displayName: 'Cliente da mesa',
        status: 'ACTIVE',
        joinedAt: '2030-01-01T11:30:00.000Z',
        leftAt: null,
      },
    ],
    activePayment: processing ? payment : null,
    items: hasItem
      ? [
          {
            publicId: 'bill-item-1',
            orderPublicId: 'table-order-public-id',
            productName: product.name,
            unitIndex: 0,
            unitPriceCents: 2_800,
            paidCents: paid ? 2_800 : 0,
            reservedCents: 0,
            processingCents: processing ? 2_800 : 0,
            availableCents: processing || paid ? 0 : 2_800,
            financialStatus: paid ? 'PAID' : processing ? 'PROCESSING' : 'UNPAID',
            orderStatus: 'PENDING',
            orderedByParticipantPublicId: TABLE_PARTICIPANT_PUBLIC_ID,
            orderedByDisplayName: 'Cliente da mesa',
          },
        ]
      : [],
    payments: payment
      ? [
          {
            publicId: payment.publicId,
            payerParticipantPublicId: payment.payerParticipantPublicId,
            selectionMode: payment.selectionMode,
            status: payment.status,
            totalCents: payment.totalCents,
            createdAt: payment.createdAt,
          },
        ]
      : [],
  };
}

async function captureResponsiveAccount(page: Page, testInfo: TestInfo, width: number) {
  await page.setViewportSize({ width, height: 844 });
  const accountDialog = page.getByRole('dialog', { name: `Conta da mesa ${TABLE_NUMBER}` });
  await expect(accountDialog).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
  const helpBox = await accountDialog
    .getByText('Seleciona automaticamente os itens vinculados a este aparelho.')
    .boundingBox();
  const continueBox = await accountDialog
    .getByRole('button', { name: 'Continuar', exact: true })
    .boundingBox();
  expect(helpBox).not.toBeNull();
  expect(continueBox).not.toBeNull();
  expect((helpBox?.y || 0) + (helpBox?.height || 0)).toBeLessThanOrEqual(continueBox?.y || 0);
  await page.screenshot({
    path: testInfo.outputPath(`table-account-${width}px.png`),
  });
}

async function mockRoleFlowApi(page: Page, state: FlowState) {
  await page.route(/^http:\/\/(127\.0\.0\.1|localhost):3000\/.*$/, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname;
    const method = request.method();
    const persona = bearerPersona(route);

    if (pathname === '/auth/me') {
      const authenticatedUser = persona && persona !== 'customer' ? users[persona] : null;
      return authenticatedUser
        ? json(route, { user: authenticatedUser })
        : json(route, { error: 'Não autenticado.' }, 401);
    }

    if (pathname === '/tables' && method === 'GET') {
      if (persona === 'admin') state.adminTableReads += 1;
      if (persona === 'waiter') state.waiterTableReads += 1;
      const table = tableFor(persona, state);
      return json(route, table ? [table] : []);
    }

    if (pathname === '/tables' && method === 'POST') {
      if (persona !== 'admin') {
        return json(route, { error: 'Apenas administradores podem cadastrar mesas.' }, 403);
      }
      state.createTablePayload = request.postDataJSON() as Record<string, unknown>;
      if (Number(state.createTablePayload.number) !== TABLE_NUMBER) {
        return json(route, { error: 'Número da mesa inválido.' }, 400);
      }
      state.tableCreated = true;
      return json(route, tableFor('admin', state), 201);
    }

    if (pathname === '/table-sessions/open' && method === 'POST') {
      if (persona !== 'waiter' && persona !== 'admin') {
        return json(route, { error: 'Sem permissão para abrir a mesa.' }, 403);
      }
      const payload = request.postDataJSON() as { tableId?: number };
      if (Number(payload.tableId) !== TABLE_ID || !state.tableCreated) {
        return json(route, { error: 'Mesa não encontrada neste restaurante.' }, 400);
      }
      state.tableOpen = true;
      return json(route, {
        sessionId: TABLE_SESSION_ID,
        session: {
          id: TABLE_SESSION_ID,
          tableId: TABLE_ID,
          status: 'OPEN',
          openedAt: new Date().toISOString(),
        },
      });
    }

    if (pathname === `/table-sessions/${TABLE_SESSION_ID}/close` && method === 'PATCH') {
      state.tableOpen = false;
      return json(route, {
        id: TABLE_SESSION_ID,
        tableId: TABLE_ID,
        status: 'CLOSED',
        closedAt: new Date().toISOString(),
      });
    }

    if (pathname === '/tables/public/resolve' && method === 'GET') {
      const valid =
        state.tableCreated &&
        url.searchParams.get('tableNumber') === String(TABLE_NUMBER) &&
        url.searchParams.get('tableId') === String(TABLE_ID) &&
        url.searchParams.get('restaurantId') === String(RESTAURANT_ID) &&
        url.searchParams.get('tableToken') === TABLE_TOKEN &&
        !url.searchParams.get('slug');
      return valid
        ? json(route, {
            id: TABLE_ID,
            number: TABLE_NUMBER,
            restaurantId: RESTAURANT_ID,
            restaurantSlug: 'restaurante-teste',
            tableOrderingEnabled: true,
            waiterCallEnabled: true,
            billRequestEnabled: true,
          })
        : json(route, { error: 'O QR Code da mesa é inválido.' }, 400);
    }

    if (pathname === '/table-sessions/join' && method === 'POST') {
      const payload = request.postDataJSON() as Record<string, unknown>;
      const valid =
        state.tableCreated &&
        Number(payload.tableId) === TABLE_ID &&
        Number(payload.tableNumber) === TABLE_NUMBER &&
        Number(payload.restaurantId) === RESTAURANT_ID &&
        payload.tableToken === TABLE_TOKEN &&
        payload.restaurantSlug === 'restaurante-teste';
      if (!valid) return json(route, { error: 'O QR Code da mesa é inválido.' }, 400);
      if (!state.tableOpen) {
        return json(
          route,
          { error: 'Esta mesa ainda não foi aberta pelo garçom. Aguarde e tente novamente.' },
          400,
        );
      }
      return json(route, {
        sessionToken: 'session-token-mesa-1',
        sessionId: TABLE_SESSION_ID,
        sessionPublicId: TABLE_SESSION_PUBLIC_ID,
        tableId: TABLE_ID,
        tableNumber: TABLE_NUMBER,
        restaurantId: RESTAURANT_ID,
        tableOrderingEnabled: true,
        waiterCallEnabled: true,
        billRequestEnabled: true,
      });
    }

    if (pathname === '/table-sessions/current' && method === 'GET') {
      return state.tableOpen
        ? json(route, {
            id: TABLE_SESSION_ID,
            sessionId: TABLE_SESSION_ID,
            sessionPublicId: TABLE_SESSION_PUBLIC_ID,
            tableId: TABLE_ID,
            tableNumber: TABLE_NUMBER,
            restaurantId: RESTAURANT_ID,
            status: 'OPEN',
          })
        : json(route, { error: 'Sessão de mesa não encontrada.' }, 404);
    }

    if (pathname === '/orders' && method === 'POST') {
      state.orderPayload = request.postDataJSON() as Record<string, unknown>;
      return json(
        route,
        {
          id: 1001,
          publicId: 'table-order-public-id',
          type: 'MESA',
          status: 'PENDENTE',
          paid: false,
          total: 28,
        },
        201,
      );
    }

    if (pathname === '/orders' && method === 'GET') {
      return json(route, { orders: createdKitchenOrder(state) });
    }

    if (pathname === `/table-accounts/sessions/${TABLE_SESSION_PUBLIC_ID}` && method === 'GET') {
      return json(route, tableAccountSnapshot(state));
    }

    if (
      pathname === `/table-accounts/sessions/${TABLE_SESSION_PUBLIC_ID}/payments` &&
      method === 'POST'
    ) {
      state.tablePaymentPayload = request.postDataJSON() as Record<string, unknown>;
      state.tablePaymentIdempotencyKey = request.headers()['idempotency-key'] || null;
      state.tablePaymentStatus = 'PROCESSING';
      return json(route, { payment: tablePayment(state), idempotentReplay: false }, 201);
    }

    if (
      pathname ===
        `/table-accounts/sessions/${TABLE_SESSION_PUBLIC_ID}/payments/${TABLE_PAYMENT_PUBLIC_ID}/reconcile` &&
      method === 'POST'
    ) {
      state.tablePaymentStatus = 'PAID';
      return json(route, { payment: tablePayment(state) });
    }

    if (pathname === '/orders/quote' && method === 'POST') {
      return json(route, {
        quote: {
          itemsSubtotal: 28,
          productDiscountTotal: 0,
          couponDiscount: 0,
          deliveryFeeAmount: 0,
          total: 28,
          couponCode: null,
        },
      });
    }

    if (pathname === '/orders/pix/payment' && method === 'POST') {
      if (!state.tableOpen) {
        return json(route, { error: 'Esta mesa não possui uma sessão aberta.' }, 400);
      }
      state.orderPayload = request.postDataJSON() as Record<string, unknown>;
      return json(route, {
        orderId: 1001,
        totalAmount: 28,
        paymentId: 'pix-mesa-1',
        provider: 'PIX',
        qrCode: '00020101021226890014br.gov.bcb.pix',
        qrCodeBase64: null,
        requiresStatusCheck: false,
      });
    }

    if (pathname === '/orders/card/checkout/status' && method === 'POST') {
      const payload = request.postDataJSON() as Record<string, unknown>;
      if (
        payload.orderPublicId !== CARD_ORDER_PUBLIC_ID ||
        Number(payload.restaurantId) !== RESTAURANT_ID ||
        payload.type !== 'MESA'
      ) {
        return json(route, { error: 'Pagamento com cartão não encontrado.' }, 404);
      }
      state.cardPaymentStatusReads = Number(state.cardPaymentStatusReads || 0) + 1;
      const status = state.cardPaymentStatus || 'PENDING';
      return json(route, {
        orderPublicId: CARD_ORDER_PUBLIC_ID,
        status,
        paid: status === 'PAID',
      });
    }

    if (pathname === '/products' && method === 'GET') {
      return json(route, { products: [product] });
    }

    if (
      pathname === `/settings/public/${RESTAURANT_ID}` ||
      pathname === '/settings/public/slug/restaurante-teste'
    ) {
      return json(route, {
        restaurantId: RESTAURANT_ID,
        restaurantName: 'Restaurante Teste',
        primaryColor: '#cf562f',
        isOpenForOrders: true,
        tableOrderingEnabled: true,
        acceptsPix: true,
        acceptsCard: true,
        restaurant: {
          id: RESTAURANT_ID,
          name: 'Restaurante Teste',
          slug: 'restaurante-teste',
        },
      });
    }

    if (pathname === '/settings') {
      return json(route, {
        id: 1,
        restaurantId: RESTAURANT_ID,
        tableOrderingEnabled: true,
        waiterCallEnabled: true,
        billRequestEnabled: true,
        restaurant: {
          id: RESTAURANT_ID,
          name: 'Restaurante Teste',
          slug: 'restaurante-teste',
        },
      });
    }

    if (pathname === '/orders/table/current' && method === 'GET') {
      return json(route, {
        order: state.orderPayload
          ? {
              publicId: 'table-order-public-id',
              type: 'MESA',
              status: state.orderStatus,
              createdAt: new Date().toISOString(),
              items: [
                {
                  quantity: 1,
                  observation: 'Bem passado',
                  customizations: [{ groupName: 'Acompanhamentos', options: [{ name: 'Arroz' }] }],
                  product: { id: product.id, name: product.name },
                },
                {
                  quantity: 1,
                  product: { id: 99, name: 'Suco da casa' },
                },
              ],
            }
          : null,
      });
    }

    if (pathname === '/coupons/loyalty' && method === 'GET') return json(route, null);
    if (pathname === '/waiter-calls' && method === 'GET') return json(route, []);

    const emptyResponses: Record<string, unknown> = {
      '/ingredients': { ingredients: [] },
      '/categories': { categories: [{ id: 10, name: 'Principais', active: true }] },
      '/coupons': { coupons: [] },
      '/banners': [],
      '/employees': [],
      '/billing/invoices': { invoices: [] },
    };
    return json(route, emptyResponses[pathname] ?? {});
  });

  await mockPersonaAuthRefresh(page, 'admin');

  await page.addInitScript((sessionUsers) => {
    const persona = (localStorage.getItem('tableQrE2EPersona') || 'admin') as Persona;
    localStorage.removeItem('tableSession');
    localStorage.removeItem('tableSessionToken');
    if (persona === 'customer') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return;
    }
    localStorage.setItem('user', JSON.stringify(sessionUsers[persona]));
  }, users);
}

async function selectPersona(page: Page, persona: Persona) {
  await page.evaluate((nextPersona) => {
    localStorage.setItem('tableQrE2EPersona', nextPersona);
    localStorage.removeItem('tableSession');
    localStorage.removeItem('tableSessionToken');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }, persona);
  await mockPersonaAuthRefresh(page, persona);
}

test('admin controla o QR, garçom apenas opera a mesa e cozinha recebe Mesa 1', async ({
  page,
}) => {
  const state: FlowState = {
    tableCreated: false,
    tableOpen: false,
    createTablePayload: null,
    orderPayload: null,
    orderStatus: 'PENDENTE',
    adminTableReads: 0,
    waiterTableReads: 0,
  };
  await mockRoleFlowApi(page, state);

  await page.goto('/admin');
  await page.getByRole('button', { name: 'Configurações' }).click();
  await page.getByRole('button', { name: 'Cardápio de mesa' }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Cardápio de mesa', exact: true }),
  ).toBeVisible();
  await page.getByLabel('Número da mesa').fill(String(TABLE_NUMBER));
  await page.getByRole('button', { name: 'Criar mesa' }).click();

  await expect.poll(() => state.createTablePayload).toEqual({ number: TABLE_NUMBER });
  const adminTable = page.getByRole('article', { name: 'Mesa 01', exact: true });
  await expect(adminTable).toBeVisible();
  let qrDialog = page.getByRole('dialog', { name: 'QR Code da Mesa 01' });
  await expect(qrDialog).toBeVisible();
  await expect(qrDialog.getByRole('img', { name: 'QR Code da Mesa 01' })).toBeVisible();
  await expect(qrDialog.getByRole('button', { name: /Imprimir QR Code/i })).toBeVisible();
  await qrDialog.getByRole('button', { name: 'Fechar QR Code' }).click();
  await adminTable.getByRole('button', { name: 'Visualizar QR Code da Mesa 01' }).click();
  qrDialog = page.getByRole('dialog', { name: 'QR Code da Mesa 01' });
  await expect(qrDialog).toBeVisible();
  expect(state.adminTableReads).toBeGreaterThan(0);

  await selectPersona(page, 'waiter');
  await page.goto('/waiter');
  await page.locator('nav').getByText('Mesas e QR Codes', { exact: true }).click();
  const waiterTable = page.locator('article').filter({ hasText: 'Mesa 01' }).first();
  await expect(waiterTable).toBeVisible();
  await expect(waiterTable.getByRole('button', { name: 'Abrir mesa' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Visualizar QR Code|Imprimir QR/i })).toHaveCount(
    0,
  );
  await waiterTable.getByRole('button', { name: 'Abrir mesa' }).click();
  await expect.poll(() => state.tableOpen).toBe(true);
  await expect(waiterTable.getByRole('button', { name: 'Fechar mesa' })).toBeVisible();
  expect(state.waiterTableReads).toBeGreaterThan(0);

  await selectPersona(page, 'customer');
  await page.goto(`/mesa/${TABLE_NUMBER}?tid=${TABLE_ID}&rid=${RESTAURANT_ID}&tk=${TABLE_TOKEN}`);
  await expect(page.getByText(product.name).first()).toBeVisible();
  await page.getByRole('button', { name: `Ver detalhes de ${product.name}` }).click();
  await page.getByText('Arroz', { exact: true }).click();
  await page.getByRole('button', { name: 'Adicionar à sacola' }).click();
  await page.getByRole('button', { name: /Sacola com [1-9]\d* itens/ }).click();
  await expect(page.getByRole('heading', { name: 'Minha sacola' })).toBeVisible();
  await page.getByRole('button', { name: /Revisar e continuar/ }).click();
  const continuationDialog = page.getByRole('dialog');
  await expect(
    continuationDialog.getByRole('heading', { name: 'Como deseja continuar?' }),
  ).toBeVisible();
  await continuationDialog.getByRole('button', { name: 'Escolher forma de pagamento' }).click();
  await expect(
    continuationDialog.getByRole('heading', { name: 'Como deseja pagar este pedido?' }),
  ).toBeVisible();
  await expect(
    continuationDialog.getByText('Clicar em pagar não significa pagamento confirmado.'),
  ).toBeVisible();
  await continuationDialog.getByRole('button', { name: 'Pix' }).click();
  await continuationDialog.getByRole('button', { name: 'Continuar para pagar' }).click();
  await expect.poll(() => state.orderPayload).not.toBeNull();
  expect(state.orderPayload).toMatchObject({
    restaurantId: RESTAURANT_ID,
    type: 'MESA',
    tableId: TABLE_ID,
    paymentMethod: 'PIX',
  });

  await expect(page.getByText('Aguardando pagamento', { exact: true })).toBeVisible();
  await expect(page.getByText(/Clicar em pagar não significa pagamento confirmado/i)).toBeVisible();
  await page.getByRole('button', { name: 'Continuar no cardápio' }).click();
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  const tableStatusButton = page.getByRole('button', {
    name: /^Status do pedido da mesa\b/i,
  });
  await expect(tableStatusButton).toBeVisible();
  await tableStatusButton.click();
  const tableOrderDialog = page.getByRole('dialog', { name: 'Pedido da mesa 1' });
  await expect(tableOrderDialog).toBeVisible();
  await expect(tableOrderDialog.getByText('Pedido recebido', { exact: true })).toBeVisible();
  await expect(tableOrderDialog.getByText('Todos os itens deste pedido')).toBeVisible();
  await expect(
    tableOrderDialog.getByRole('article').filter({ hasText: product.name }),
  ).toBeVisible();
  await expect(
    tableOrderDialog.getByRole('article').filter({ hasText: 'Suco da casa' }),
  ).toBeVisible();
  await expect(tableOrderDialog.getByText('Arroz', { exact: true })).toBeVisible();
  await expect(tableOrderDialog.getByText('Obs.: Bem passado', { exact: true })).toBeVisible();

  for (const [status, label] of [
    ['PREPARANDO', 'Em preparo'],
    ['PRONTO', 'Pronto para servir'],
    ['ENTREGUE', 'Servido na mesa'],
  ] as const) {
    state.orderStatus = status;
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(tableOrderDialog.getByText(label, { exact: true }).first()).toBeVisible();
  }
  await expect(
    tableOrderDialog.getByRole('button', { name: /Confirmar recebimento/i }),
  ).toHaveCount(0);
  await expect(
    tableOrderDialog.getByRole('button', { name: /Acompanhar entrega no GPS/i }),
  ).toHaveCount(0);

  state.orderStatus = 'PENDENTE';

  await selectPersona(page, 'kitchen');
  await page.goto('/kitchen');
  await page
    .getByRole('navigation', { name: 'Navegação da cozinha' })
    .getByRole('button', { name: 'Fila de pedidos', exact: true })
    .click();
  const kitchenOrder = page.locator('[data-order-id="#1001"]');
  await expect(kitchenOrder).toBeVisible();
  await expect(kitchenOrder.getByText('Mesa 1', { exact: true })).toBeVisible();
  await expect(kitchenOrder.getByText(product.name)).toBeVisible();
});

test('cliente separa escopo e método e só vê pago após reconciliação canônica', async ({
  page,
}, testInfo) => {
  const state: FlowState = {
    tableCreated: true,
    tableOpen: true,
    createTablePayload: null,
    orderPayload: null,
    orderStatus: 'PENDENTE',
    adminTableReads: 0,
    waiterTableReads: 0,
    tablePaymentPayload: null,
    tablePaymentStatus: null,
    tablePaymentIdempotencyKey: null,
  };
  await mockRoleFlowApi(page, state);
  await page.goto('/');
  await selectPersona(page, 'customer');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/mesa/${TABLE_NUMBER}?tid=${TABLE_ID}&rid=${RESTAURANT_ID}&tk=${TABLE_TOKEN}`);

  await page.getByRole('button', { name: `Ver detalhes de ${product.name}` }).click();
  await page.getByText('Arroz', { exact: true }).click();
  await page.getByRole('button', { name: 'Adicionar à sacola' }).click();
  await page.getByRole('button', { name: /Sacola com [1-9]\d* itens/ }).click();
  await page.getByRole('button', { name: /Revisar e continuar/ }).click();

  const continuationDialog = page.getByRole('dialog', { name: 'Como deseja continuar?' });
  await expect(continuationDialog.getByRole('button', { name: 'Pix' })).toHaveCount(0);
  await continuationDialog.getByRole('button', { name: 'Adicionar à conta' }).click();
  await expect.poll(() => state.orderPayload).not.toBeNull();
  expect(state.orderPayload).toMatchObject({
    restaurantId: RESTAURANT_ID,
    type: 'MESA',
    tableId: TABLE_ID,
    settlementMode: 'TABLE_ACCOUNT',
  });
  expect(state.orderPayload).not.toHaveProperty('paymentMethod');

  const tableActions = page.getByRole('region', {
    name: `Mesa e atendimento da mesa ${TABLE_NUMBER}`,
  });
  const tableActionsToggle = tableActions.getByTestId('table-service-actions-toggle');
  await expect(tableActionsToggle).toHaveAttribute('aria-expanded', 'false');
  await tableActionsToggle.click();
  await expect(tableActionsToggle).toHaveAttribute('aria-expanded', 'true');
  await tableActions.getByRole('button', { name: 'Ver conta', exact: true }).click();
  const accountDialog = page.getByRole('dialog', { name: `Conta da mesa ${TABLE_NUMBER}` });
  await expect(accountDialog.getByText('1 de 3')).toBeVisible();
  await expect(accountDialog.getByText('O que você quer pagar?')).toBeVisible();
  await expect(accountDialog.getByText('Pix online')).toHaveCount(0);
  await expect(accountDialog.getByText('Dinheiro', { exact: true })).toHaveCount(0);

  for (const width of [360, 390, 430]) {
    await captureResponsiveAccount(page, testInfo, width);
  }

  await accountDialog.getByRole('button', { name: /Escolher itens/ }).click();
  await accountDialog.getByRole('checkbox', { name: `Selecionar ${product.name}` }).check();
  await accountDialog.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(accountDialog.getByText('2 de 3')).toBeVisible();
  await expect(accountDialog.getByText('Como deseja pagar?')).toBeVisible();
  await expect(accountDialog.getByRole('button', { name: /Pix online/ })).toBeVisible();
  await expect(accountDialog.getByRole('button', { name: /Dinheiro/ })).toBeVisible();
  await expect(accountDialog.getByText(/30,80/).last()).toBeVisible();

  await accountDialog.getByRole('button', { name: /Pix online/ }).click();
  await accountDialog.getByRole('button', { name: 'Gerar pagamento Pix' }).click();
  await expect.poll(() => state.tablePaymentPayload).not.toBeNull();
  expect(state.tablePaymentPayload).toEqual({
    selectionMode: 'SELECTED_ITEMS',
    method: 'PIX',
    billItemPublicIds: ['bill-item-1'],
    includeOptionalServiceFee: true,
  });
  expect(state.tablePaymentIdempotencyKey).toMatch(/^table-payment:/);

  await expect(accountDialog.getByText('3 de 3')).toBeVisible();
  await expect(accountDialog.getByRole('heading', { name: 'Pague com Pix' })).toBeVisible();
  await expect(accountDialog.getByText('Pagamento confirmado')).toHaveCount(0);
  await accountDialog.getByRole('button', { name: 'Verificar pagamento' }).click();
  await expect(accountDialog.getByRole('heading', { name: 'Pagamento confirmado' })).toBeVisible();
  await expect(accountDialog.getByText('O backend confirmou o recebimento')).toBeVisible();
});

test('retorno success do cartão permanece pendente até o backend confirmar', async ({ page }) => {
  const state: FlowState = {
    tableCreated: true,
    tableOpen: true,
    createTablePayload: null,
    orderPayload: null,
    orderStatus: 'PENDENTE',
    adminTableReads: 0,
    waiterTableReads: 0,
    cardPaymentStatus: 'PENDING',
    cardPaymentStatusReads: 0,
  };
  await mockRoleFlowApi(page, state);
  await page.goto('/');
  await selectPersona(page, 'customer');
  await page.goto(
    `/mesa/${TABLE_NUMBER}?tid=${TABLE_ID}&rid=${RESTAURANT_ID}&tk=${TABLE_TOKEN}&cardCheckoutStatus=success&orderPublicId=${CARD_ORDER_PUBLIC_ID}`,
  );

  await expect.poll(() => Number(state.cardPaymentStatusReads || 0)).toBeGreaterThan(0);
  await expect(page.getByRole('heading', { name: 'Pagamento ainda pendente' })).toBeVisible();
  await expect(page.getByText('Pagamento confirmado')).toHaveCount(0);
  await expect(
    page.getByText('Esse retorno não é usado como confirmação financeira.'),
  ).toBeVisible();

  const pendingReads = Number(state.cardPaymentStatusReads || 0);
  state.cardPaymentStatus = 'PAID';
  await page.getByRole('button', { name: 'Verificar pagamento' }).click();
  await expect.poll(() => Number(state.cardPaymentStatusReads || 0)).toBeGreaterThan(pendingReads);
  await expect(page.getByRole('heading', { name: 'Pagamento confirmado' })).toBeVisible();
  await expect(page.getByText('O backend confirmou a aprovação do cartão')).toBeVisible();
});

test('impressão individual ocupa uma única folha A4 com QR Code grande', async ({ page }) => {
  const state: FlowState = {
    tableCreated: true,
    tableOpen: false,
    createTablePayload: null,
    orderPayload: null,
    orderStatus: 'PENDENTE',
    adminTableReads: 0,
    waiterTableReads: 0,
  };
  await page.addInitScript(() => {
    Object.defineProperty(window, 'print', {
      configurable: true,
      value: () => undefined,
    });
  });
  await mockRoleFlowApi(page, state);

  await page.goto('/admin');
  await page.getByRole('button', { name: 'Configurações' }).click();
  await page.getByRole('button', { name: 'Cardápio de mesa' }).click();
  const adminTable = page.getByRole('article', { name: 'Mesa 01', exact: true });
  await adminTable.getByRole('button', { name: 'Visualizar QR Code da Mesa 01' }).click();
  const qrDialog = page.getByRole('dialog', { name: 'QR Code da Mesa 01' });
  await qrDialog.getByRole('button', { name: 'Imprimir QR Code' }).click();

  const printSheet = page.locator('body > [data-admin-table-qr-print]');
  await expect(printSheet.locator('article')).toHaveCount(1);
  await page.emulateMedia({ media: 'print' });
  await page.evaluate(() => document.body.classList.add('admin-table-qr-printing'));

  await expect(printSheet).toBeVisible();
  const qrBounds = await printSheet.locator('.print-qr').boundingBox();
  expect(qrBounds).not.toBeNull();
  expect(qrBounds?.width || 0).toBeGreaterThan(600);
  expect(qrBounds?.height || 0).toBeGreaterThan(600);

  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: false,
  });
  const pageCount = pdf.toString('latin1').match(/\/Type\s*\/Page\b/g)?.length || 0;
  expect(pageCount).toBe(1);
});
