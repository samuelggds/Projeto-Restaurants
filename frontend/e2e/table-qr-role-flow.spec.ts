import { expect, test, type Page, type Route } from '@playwright/test';

const RESTAURANT_ID = 1;
const TABLE_ID = 101;
const TABLE_NUMBER = 1;
const TABLE_TOKEN = '11112222333344445555666677778888';
const TABLE_SESSION_ID = 701;

type Persona = 'admin' | 'waiter' | 'customer' | 'kitchen';

type FlowState = {
  tableCreated: boolean;
  tableOpen: boolean;
  createTablePayload: Record<string, unknown> | null;
  orderPayload: Record<string, unknown> | null;
  orderStatus: 'PENDENTE' | 'PREPARANDO' | 'PRONTO' | 'ENTREGUE';
  adminTableReads: number;
  waiterTableReads: number;
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
  if (authorization.includes('e2e-admin-token')) return 'admin';
  if (authorization.includes('e2e-waiter-token')) return 'waiter';
  if (authorization.includes('e2e-kitchen-token')) return 'kitchen';
  return null;
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
            tableId: TABLE_ID,
            tableNumber: TABLE_NUMBER,
            restaurantId: RESTAURANT_ID,
            status: 'OPEN',
          })
        : json(route, { error: 'Sessão de mesa não encontrada.' }, 404);
    }

    if (pathname === '/orders' && method === 'GET') {
      return json(route, { orders: createdKitchenOrder(state) });
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

  await page.addInitScript((sessionUsers) => {
    const persona = (localStorage.getItem('tableQrE2EPersona') || 'admin') as Persona;
    localStorage.removeItem('tableSession');
    localStorage.removeItem('tableSessionToken');
    if (persona === 'customer') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return;
    }
    const tokenByPersona: Record<Exclude<Persona, 'customer'>, string> = {
      admin: 'e2e-admin-token',
      waiter: 'e2e-waiter-token',
      kitchen: 'e2e-kitchen-token',
    };
    localStorage.setItem('token', tokenByPersona[persona]);
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
  await expect(page.getByRole('heading', { name: 'Minha sacola' })).toBeVisible();
  await page.getByRole('button', { name: /Revisar e continuar/ }).click();
  const continuationDialog = page.getByRole('dialog', { name: 'Como deseja continuar?' });
  await continuationDialog.getByRole('button', { name: 'Pix' }).click();
  await continuationDialog.getByRole('button', { name: /Pagar agora/ }).click();
  await expect.poll(() => state.orderPayload).not.toBeNull();
  expect(state.orderPayload).toMatchObject({
    restaurantId: RESTAURANT_ID,
    type: 'MESA',
    tableId: TABLE_ID,
    paymentMethod: 'PIX',
  });

  await page.getByRole('button', { name: 'Voltar para o cardápio' }).click();
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await page.getByRole('button', { name: /Abrir cupons, status do pedido/i }).click();
  await page.getByRole('button', { name: /Status do pedido da mesa/i }).click();
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
  await page.locator('nav').getByText('Fila de pedidos', { exact: true }).click();
  const kitchenOrder = page.locator('[data-order-id="#1001"]');
  await expect(kitchenOrder).toBeVisible();
  await expect(kitchenOrder.getByText('Mesa 1', { exact: true })).toBeVisible();
  await expect(kitchenOrder.getByText(product.name)).toBeVisible();
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
