import { orderFixtureResponse } from './helpers/orderFixtures';
import { expect, test, type Page, type Route } from '@playwright/test';

const LOCAL_API = /^http:\/\/(127\.0\.0\.1|localhost):3000\/.*$/;
const RESTAURANT_ID = 1;
const RESTAURANT_SLUG = 'restaurante-teste';
const TABLE_ID = 105;
const TABLE_NUMBER = 5;
const TABLE_TOKEN = 'abc123abc123abc123abc123abc123ab';
const TABLE_SESSION_ID = 705;
const CUSTOMER_TOKEN = 'e2e-context-customer-token';
const CUSTOMER_EMAIL = 'cliente@restaurante.test';

const customer = {
  id: 25,
  name: 'Cliente dos dois contextos',
  email: CUSTOMER_EMAIL,
  phone: '85999999999',
  role: 'CLIENTE',
};

const product = {
  id: 305,
  name: 'Prato contextual',
  description: 'Produto usado para validar os dois contextos.',
  price: 28,
  active: true,
  stock: null,
  image: '',
  category: { id: 15, name: 'Principais' },
  optionGroups: [
    {
      id: 55,
      name: 'Acompanhamento',
      required: true,
      selectionType: 'SINGLE',
      minSelections: 1,
      maxSelections: 1,
      options: [
        {
          id: 515,
          ingredientId: 65,
          active: true,
          ingredient: { id: 65, name: 'Arroz', price: 0, active: true },
        },
      ],
    },
  ],
};

test('visitante no celular usa a navegação inferior e abre produto pelo teclado', async ({ page }) => {
  const state: ContextState = { authenticated: false, tableOpen: true, loginCalls: 0,
    googleLoginCalls: 0, sessionValidationCalls: 0, orderPayloads: [] };
  await mockContextApi(page, state);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/${RESTAURANT_SLUG}`);

  const navigation = page.getByRole('navigation', { name: 'Navegação principal' });
  await expect(navigation).toBeVisible();
  await expect(navigation.getByRole('button', { name: 'Início' })).toBeVisible();
  await expect(navigation.getByRole('button', { name: 'Pedidos' })).toBeVisible();
  await expect(navigation.getByRole('button', { name: 'Conta' })).toBeVisible();

  const bounds = await navigation.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(844);

  const productButton = page.getByRole('button', { name: `Ver detalhes de ${product.name}`, exact: true });
  await productButton.focus();
  await productButton.press('Enter');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Arroz', { exact: true })).toBeVisible();
  expect(await page.locator('button button, [role="button"] button').count()).toBe(0);
  const documentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(documentWidth).toBeLessThanOrEqual(390);
  expect(state.orderPayloads).toHaveLength(0);
});

type ContextState = {
  authenticated: boolean;
  tableOpen: boolean;
  loginCalls: number;
  googleLoginCalls: number;
  sessionValidationCalls: number;
  orderPayloads: Record<string, unknown>[];
  registerPayloads?: Record<string, unknown>[];
  forgotPasswordPayloads?: Record<string, unknown>[];
  resetPasswordPayloads?: Record<string, unknown>[];
  mfaRequired?: boolean;
  mfaVerificationCalls?: number;
};

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

function hasCustomerToken(route: Route) {
  return (route.request().headers().authorization || '').includes(CUSTOMER_TOKEN);
}

function publicSettings() {
  return {
    restaurantId: RESTAURANT_ID,
    restaurantName: 'Restaurante Teste',
    primaryColor: '#cf562f',
    isOpenForOrders: true,
    acceptsDelivery: true,
    acceptsPickup: true,
    acceptsPix: true,
    acceptsCard: false,
    tableOrderingEnabled: true,
    restaurant: {
      id: RESTAURANT_ID,
      name: 'Restaurante Teste',
      slug: RESTAURANT_SLUG,
    },
  };
}

function emptyTableAccount() {
  return {
    contractVersion: 1,
    currentParticipantPublicId: null,
    capabilities: {
      enabled: true,
      allowCash: true,
      allowCardMachine: true,
      allowOnlinePayment: true,
      allowPix: true,
      allowCard: false,
      allowSplit: false,
      serviceFeeMode: 'DISABLED',
      serviceFeeBasisPoints: 0,
      reservationTimeoutMinutes: 10,
    },
    summary: {
      sessionPublicId: '323e4567-e89b-42d3-a456-426614174705',
      tableNumber: TABLE_NUMBER,
      status: 'OPEN',
      consumedCents: 0,
      serviceFeeCents: 0,
      grossPaidCents: 0,
      refundedCents: 0,
      netPaidCents: 0,
      reservedCents: 0,
      processingCents: 0,
      remainingCents: 0,
      overpaidCents: 0,
      participantsCount: 1,
    },
    participants: [],
    activePayment: null,
    items: [],
    payments: [],
  };
}

async function mockContextApi(page: Page, state: ContextState) {
  await page.route(LOCAL_API, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname;
    const method = request.method();

    if (pathname === '/platform/status') {
      return json(route, { available: true, maintenanceMode: false });
    }

    if (pathname === '/auth/refresh' && method === 'POST') {
      return state.authenticated
        ? json(route, { accessToken: CUSTOMER_TOKEN, userId: customer.id })
        : json(route, { error: 'Não autenticado.' }, 401);
    }

    if (pathname === '/auth/me') {
      return state.authenticated && hasCustomerToken(route)
        ? json(route, { user: customer })
        : json(route, { error: 'Não autenticado.' }, 401);
    }

    if (pathname === '/auth/login' && method === 'POST') {
      const payload = request.postDataJSON() as { email?: string };
      if (payload.email !== CUSTOMER_EMAIL) {
        return json(route, { error: 'Credenciais inválidas.' }, 401);
      }
      state.loginCalls += 1;
      if (state.mfaRequired) {
        return json(route, { mfaRequired: true, mfaToken: 'context-mfa-token' });
      }
      state.authenticated = true;
      return json(route, { token: CUSTOMER_TOKEN, user: customer });
    }

    if (pathname === '/auth/login/verify-2fa' && method === 'POST') {
      const payload = request.postDataJSON() as { mfaToken?: string; code?: string };
      if (payload.mfaToken !== 'context-mfa-token' || payload.code !== '123456') {
        return json(route, { error: 'Código inválido.' }, 401);
      }
      state.authenticated = true;
      state.mfaVerificationCalls = (state.mfaVerificationCalls || 0) + 1;
      return json(route, { token: CUSTOMER_TOKEN, user: customer });
    }

    if (pathname === '/auth/register' && method === 'POST') {
      (state.registerPayloads ||= []).push(request.postDataJSON() as Record<string, unknown>);
      return json(route, { id: customer.id, name: customer.name, email: customer.email }, 201);
    }

    if (pathname === '/auth/forgot-password' && method === 'POST') {
      (state.forgotPasswordPayloads ||= []).push(request.postDataJSON() as Record<string, unknown>);
      return json(route, { message: 'Código enviado.' });
    }

    if (pathname === '/auth/reset-password' && method === 'POST') {
      (state.resetPasswordPayloads ||= []).push(request.postDataJSON() as Record<string, unknown>);
      return json(route, { message: 'Senha redefinida.' });
    }

    if (pathname === '/auth/google' && method === 'POST') {
      const payload = request.postDataJSON() as { idToken?: string };
      if (payload.idToken !== 'mock-google-id-token') {
        return json(route, { error: 'Token Google inválido.' }, 401);
      }
      state.authenticated = true;
      state.googleLoginCalls += 1;
      return json(route, { token: CUSTOMER_TOKEN, user: customer });
    }

    if (pathname === '/auth/google/client-id') {
      return json(route, { clientId: 'mock-google-client-id' });
    }

    if (pathname === `/settings/public/slug/${RESTAURANT_SLUG}/revision`) {
      return json(route, { restaurantId: RESTAURANT_ID, revision: 'context-v1' });
    }

    if (pathname === `/settings/public/${RESTAURANT_ID}/revision`) {
      return json(route, { restaurantId: RESTAURANT_ID, revision: 'context-v1' });
    }

    if (
      pathname === `/settings/public/${RESTAURANT_ID}` ||
      pathname === `/settings/public/slug/${RESTAURANT_SLUG}`
    ) {
      return json(route, publicSettings());
    }

    if (pathname === '/tables/public/resolve') {
      const valid =
        url.searchParams.get('tableNumber') === String(TABLE_NUMBER) &&
        url.searchParams.get('restaurantId') === String(RESTAURANT_ID) &&
        url.searchParams.get('slug') === RESTAURANT_SLUG &&
        url.searchParams.get('tableToken') === TABLE_TOKEN;
      return valid
        ? json(route, {
            id: TABLE_ID,
            number: TABLE_NUMBER,
            restaurantId: RESTAURANT_ID,
            restaurantSlug: RESTAURANT_SLUG,
            tableOrderingEnabled: true,
            waiterCallEnabled: true,
            billRequestEnabled: true,
          })
        : json(route, { error: 'O QR Code da mesa é inválido.' }, 400);
    }

    if (pathname === '/table-sessions/join' && method === 'POST') {
      const payload = request.postDataJSON() as Record<string, unknown>;
      const valid =
        Number(payload.tableId) === TABLE_ID &&
        Number(payload.tableNumber) === TABLE_NUMBER &&
        Number(payload.restaurantId) === RESTAURANT_ID &&
        payload.restaurantSlug === RESTAURANT_SLUG &&
        payload.tableToken === TABLE_TOKEN;
      if (!valid) return json(route, { error: 'O QR Code da mesa é inválido.' }, 400);
      if (!state.tableOpen) {
        return json(
          route,
          { error: 'Esta mesa ainda não foi aberta pelo garçom. Aguarde e tente novamente.' },
          400,
        );
      }
      return json(route, {
        sessionToken: 'session-token-mesa-5',
        sessionId: TABLE_SESSION_ID,
        sessionPublicId: '323e4567-e89b-42d3-a456-426614174705',
        tableId: TABLE_ID,
        tableNumber: TABLE_NUMBER,
        restaurantId: RESTAURANT_ID,
        sessionStatus: 'OPEN',
        tableOrderingEnabled: true,
        waiterCallEnabled: true,
        billRequestEnabled: true,
      });
    }

    if (pathname === '/table-sessions/current') {
      state.sessionValidationCalls += 1;
      return state.tableOpen
        ? json(route, {
            id: TABLE_SESSION_ID,
            sessionId: TABLE_SESSION_ID,
            sessionPublicId: '323e4567-e89b-42d3-a456-426614174705',
            tableId: TABLE_ID,
            tableNumber: TABLE_NUMBER,
            restaurantId: RESTAURANT_ID,
            sessionStatus: 'OPEN',
          })
        : json(route, { error: 'Sessão de mesa não encontrada.' }, 404);
    }

    if (pathname === '/products') return json(route, { products: [product] });

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

    if (pathname === '/orders' && method === 'POST') {
      const payload = request.postDataJSON() as Record<string, unknown>;
      state.orderPayloads.push(payload);
      return json(route, {
        id: 900 + state.orderPayloads.length,
        publicId: `context-order-${state.orderPayloads.length}`,
        type: payload.type,
        status: 'PENDENTE',
        paid: false,
        settlementMode: payload.settlementMode,
      }, 201);
    }

    if (pathname === '/orders/pix/payment' && method === 'POST') {
      const payload = request.postDataJSON() as Record<string, unknown>;
      state.orderPayloads.push(payload);
      return json(route, {
        orderId: 900 + state.orderPayloads.length,
        totalAmount: 28,
        paymentId: `pix-context-${state.orderPayloads.length}`,
        provider: 'PIX',
        qrCode: '00020101021226890014br.gov.bcb.pix.context',
        qrCodeBase64: null,
        requiresStatusCheck: false,
      });
    }

    if (pathname === '/orders/my-orders') return json(route, orderFixtureResponse(route.request().url(), []));
    if (pathname === '/orders/table/current') return json(route, { order: null });
    if (pathname === '/table-accounts/sessions/323e4567-e89b-42d3-a456-426614174705') {
      return json(route, emptyTableAccount());
    }
    if (pathname === '/customer-addresses') return json(route, { addresses: [] });
    if (pathname === '/favorites') return json(route, { favorites: [] });
    if (pathname === '/coupons/loyalty') return json(route, { rewards: [] });
    if (pathname === '/waiter-calls') return json(route, []);

    return json(route, {});
  });

  await page.addInitScript(() => {
    if (sessionStorage.getItem('context-login-e2e-ready')) return;
    localStorage.clear();
    sessionStorage.setItem('context-login-e2e-ready', 'true');
  });
}

function currentPath(page: Page) {
  const url = new URL(page.url());
  return `${url.pathname}${url.search}${url.hash}`;
}

async function expectLoginPreserves(page: Page, returnPath: string) {
  await page.getByRole('button', { name: 'Minha conta' }).click();
  await expect(page).toHaveURL(/\/login\?next=/u);
  expect(new URL(page.url()).searchParams.get('next')).toBe(returnPath);
}

async function loginWithPassword(page: Page) {
  await page.getByLabel('E-mail').fill(CUSTOMER_EMAIL);
  await page.locator('#password').fill('Senha@123');
  await page
    .locator('form')
    .getByRole('button', { name: /Entrar/u })
    .click();
}

async function registerCustomer(page: Page) {
  await page.getByLabel('Nome Completo').fill(customer.name);
  await page.getByLabel('E-mail').fill(CUSTOMER_EMAIL);
  await page.getByLabel('Telefone').fill(customer.phone);
  await page.getByLabel('Senha', { exact: true }).fill('Senha@123');
  await page.getByLabel('Confirmar Senha', { exact: true }).fill('Senha@123');
  await page.getByRole('button', { name: /Criar conta|Finalizar Cadastro/u }).click();
  await expect(page.getByText('Confira seu e-mail', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Ir para o login' }).click();
}

async function recoverCustomerPassword(page: Page) {
  await expect(page.getByRole('heading', { name: 'Esqueceu sua senha?' })).toBeVisible();
  const recoveryEmail = page.locator('#identifier');
  await expect(recoveryEmail).toBeVisible();
  await recoveryEmail.fill(CUSTOMER_EMAIL);
  await expect(recoveryEmail).toHaveValue(CUSTOMER_EMAIL);
  await page.getByRole('button', { name: 'Enviar código' }).click();
  await page.locator('#reset-code').fill('123456');
  await page.getByLabel('Nova senha', { exact: true }).fill('Senha@123');
  await page.getByLabel('Confirmar nova senha', { exact: true }).fill('Senha@123');
  await page.getByRole('button', { name: /Redefinir/u }).click();
}

async function addConfiguredProduct(page: Page) {
  const desktopMenuButton = page.getByRole('button', { name: 'Cardápio', exact: true });
  if (await desktopMenuButton.isVisible()) {
    await desktopMenuButton.click();
  } else {
    await page.getByRole('button', { name: /Ver Cardápio(?: Completo)?/i }).click();
  }
  await expect(page.getByText(product.name).first()).toBeVisible();
  await page.getByRole('button', { name: `Ver detalhes de ${product.name}` }).click();
  const dialog = page.getByRole('dialog', { name: `Montar ${product.name}` });
  await dialog.getByText('Arroz', { exact: true }).click();
  await dialog.getByRole('button', { name: 'Adicionar à sacola' }).click();
  await page.getByRole('button', { name: 'Meu pedido' }).click();
  await expect(page.getByRole('heading', { name: 'Minha sacola' })).toBeVisible();
}

async function submitTableOrder(page: Page) {
  await page.getByRole('button', { name: 'Enviar pedido para a cozinha' }).click();
}

test('QR da mesa permanece guest e envia pedido MESA sem login', async ({ page }) => {
  const state: ContextState = {
    authenticated: false,
    tableOpen: true,
    loginCalls: 0,
    googleLoginCalls: 0,
    sessionValidationCalls: 0,
    orderPayloads: [],
  };
  await mockContextApi(page, state);
  const tablePath =
    `/${RESTAURANT_SLUG}/mesa/${TABLE_NUMBER}` +
    `?rid=${RESTAURANT_ID}&tk=${TABLE_TOKEN}#bebidas`;

  await page.goto(tablePath);
  await expect(page.getByLabel(`Mesa ${TABLE_NUMBER}`, { exact: true })).toContainText('05');
  await expect(page.getByRole('button', { name: 'Minha conta', exact: true })).toHaveCount(0);
  await expect(page).not.toHaveURL(/\/login/u);

  await addConfiguredProduct(page);
  await submitTableOrder(page);

  await expect.poll(() => state.orderPayloads.length).toBe(1);
  expect(state.orderPayloads[0]).toMatchObject({
    restaurantId: RESTAURANT_ID,
    type: 'MESA',
    tableId: TABLE_ID,
    settlementMode: 'TABLE_ACCOUNT',
  });
  expect(state.orderPayloads[0]).not.toHaveProperty('paymentMethod');
  expect(state.loginCalls).toBe(0);
  expect(state.googleLoginCalls).toBe(0);
});

test('Home preserva origem completa durante Cadastro e Login', async ({ page }) => {
  const state: ContextState = {
    authenticated: false,
    tableOpen: true,
    loginCalls: 0,
    googleLoginCalls: 0,
    sessionValidationCalls: 0,
    orderPayloads: [],
    registerPayloads: [],
  };
  await mockContextApi(page, state);
  const homePath = `/${RESTAURANT_SLUG}?canal=retirada#menu`;

  await page.goto(homePath);
  await expectLoginPreserves(page, homePath);
  await page.getByRole('link', { name: 'Cadastre-se aqui' }).click();
  expect(new URL(page.url()).searchParams.get('next')).toBe(homePath);
  await registerCustomer(page);

  await expect(page).toHaveURL(/\/login\?next=/u);
  expect(new URL(page.url()).searchParams.get('next')).toBe(homePath);
  expect(state.registerPayloads).toHaveLength(1);
  expect(state.registerPayloads?.[0]).not.toHaveProperty('role');

  await loginWithPassword(page);
  await expect.poll(() => currentPath(page)).toBe(homePath);
});

test('Home preserva origem completa durante Recuperação e Login', async ({ page }) => {
  const state: ContextState = {
    authenticated: false,
    tableOpen: true,
    loginCalls: 0,
    googleLoginCalls: 0,
    sessionValidationCalls: 0,
    orderPayloads: [],
    forgotPasswordPayloads: [],
    resetPasswordPayloads: [],
  };
  await mockContextApi(page, state);
  const homePath = `/${RESTAURANT_SLUG}?canal=delivery#promocoes`;

  await page.goto(homePath);
  await expectLoginPreserves(page, homePath);
  await page.getByRole('button', { name: 'Esqueceu a senha?' }).click();
  expect(new URL(page.url()).searchParams.get('next')).toBe(homePath);
  await recoverCustomerPassword(page);

  await expect(page).toHaveURL(/\/login\?next=/u);
  expect(new URL(page.url()).searchParams.get('next')).toBe(homePath);
  expect(state.forgotPasswordPayloads).toEqual([{ email: CUSTOMER_EMAIL }]);
  expect(state.resetPasswordPayloads).toHaveLength(1);

  await loginWithPassword(page);
  await expect.poll(() => currentPath(page)).toBe(homePath);
});

test('mesa fechada bloqueia o visitante sem encaminhar para login', async ({ page }) => {
  const state: ContextState = {
    authenticated: false,
    tableOpen: false,
    loginCalls: 0,
    googleLoginCalls: 0,
    sessionValidationCalls: 0,
    orderPayloads: [],
  };
  await mockContextApi(page, state);
  const tablePath =
    `/${RESTAURANT_SLUG}/mesa/${TABLE_NUMBER}` +
    `?rid=${RESTAURANT_ID}&tk=${TABLE_TOKEN}`;

  await page.goto(tablePath);

  await expect(page.getByRole('heading', { name: 'Mesa aguardando abertura' })).toBeVisible();
  await expect(page.getByText(/ainda não foi aberta pelo garçom/u)).toBeVisible();
  await expect(page).not.toHaveURL(/\/login/u);
  await expect(page.getByRole('button', { name: 'Minha conta', exact: true })).toHaveCount(0);
  expect(state.loginCalls).toBe(0);
  expect(state.googleLoginCalls).toBe(0);
});

for (const viewport of [
  { width: 320, height: 568 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
]) {
  test(`rotas legadas de autenticação TABLE não criam overflow em ${viewport.width}px`, async ({
    page,
  }) => {
    const state: ContextState = {
      authenticated: false,
      tableOpen: true,
      loginCalls: 0,
      googleLoginCalls: 0,
      sessionValidationCalls: 0,
      orderPayloads: [],
    };
    await mockContextApi(page, state);
    await page.setViewportSize(viewport);
    const tablePath =
      `/${RESTAURANT_SLUG}/mesa/${TABLE_NUMBER}` + `?rid=${RESTAURANT_ID}&tk=${TABLE_TOKEN}#conta`;

    for (const entryPath of ['register', 'recover-password']) {
      await page.goto(
        `/${RESTAURANT_SLUG}/${entryPath}?next=${encodeURIComponent(tablePath)}`,
      );
      await expect(page.locator('[data-auth-context="TABLE"]')).toBeVisible();
      await expect
        .poll(() =>
          page.evaluate(() => ({
            viewportWidth: window.innerWidth,
            documentWidth: document.documentElement.scrollWidth,
          })),
        )
        .toEqual({ viewportWidth: viewport.width, documentWidth: viewport.width });
    }
  });
}
