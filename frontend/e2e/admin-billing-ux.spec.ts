import { orderFixtureResponse } from './helpers/orderFixtures';
import { expect, test, type Page } from '@playwright/test';

import { mockAuthRefresh } from './helpers/mockAuthRefresh';
import { createInitialDemoState, DEMO_STORAGE_KEY } from '../src/pages/Marketing/demo/demoDomain';

type BillingTestState = {
  requestedPlan: string | null;
  pixRequests: number;
  subscription: Record<string, unknown>;
  recurring: Record<string, unknown>;
  recurringError: boolean;
  configError: boolean;
  cardPayload: Record<string, unknown> | null;
  pixChanges: number;
};

const RESTAURANT_ID = 9;
const API = /^http:\/\/(127\.0\.0\.1|localhost):3000\/.*$/;

function createState(): BillingTestState {
  return {
    requestedPlan: null,
    pixRequests: 0,
    recurring: { billingMethod: 'PIX', autoRenew: false, status: 'INACTIVE' },
    recurringError: false,
    configError: true,
    cardPayload: null,
    pixChanges: 0,
    subscription: {
      id: 3,
      plan: 'PREMIUM',
      status: 'ATIVA',
      planChangeEligibility: {
        allowed: true,
        invoiceId: null,
        reason: 'Você pode escolher o plano do próximo ciclo.',
      },
    },
  };
}

async function mockAdminApi(page: Page, state: BillingTestState) {
  await page.route(API, async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    const method = request.method();

    if (pathname === '/billing/recurring') {
      await route.fulfill({
        status: state.recurringError ? 500 : 200,
        json: state.recurringError
          ? { error: 'Invalid prisma.$queryRaw(): relation PlatformBillingProfile does not exist' }
          : state.recurring,
      });
      return;
    }
    if (pathname === '/billing/recurring/config') {
      await route.fulfill({
        status: state.configError ? 503 : 200,
        json: state.configError
          ? { error: 'Chave pública do Mercado Pago não configurada para a mensalidade.' }
          : { publicKey: 'TEST-public-key', provider: 'MERCADO_PAGO' },
      });
      return;
    }
    if (pathname === '/billing/recurring/card' && method === 'POST') {
      state.cardPayload = request.postDataJSON();
      state.recurring = {
        billingMethod: 'CARD',
        autoRenew: true,
        status: 'AUTHORIZED',
        cardLast4: '4242',
        cardBrand: 'Visa',
        nextBillingAt: '2026-10-23T12:00:00Z',
      };
      await route.fulfill({ json: state.recurring });
      return;
    }
    if (pathname === '/billing/recurring/pix' && method === 'PUT') {
      state.pixChanges += 1;
      state.recurring = {
        ...state.recurring,
        billingMethod: 'PIX',
        autoRenew: false,
        status: 'INACTIVE',
      };
      await route.fulfill({ json: state.recurring });
      return;
    }

    if (pathname === '/auth/me') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: 9, name: 'Admin Teste', role: 'ADMIN', restaurantId: RESTAURANT_ID },
        }),
      });
      return;
    }

    if (pathname === '/billing/plans') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            plan: 'BASICO',
            name: 'Básico',
            monthlyFee: 149.9,
            trialDays: 30,
            features: ['Sistema de delivery', 'Suporte padrão'],
          },
          {
            plan: 'PREMIUM',
            name: 'Premium',
            monthlyFee: 249.9,
            trialDays: 30,
            features: [
              'Sistema de delivery',
              'Cardápio digital com QR Code de mesa',
              'Suporte prioritário',
            ],
          },
        ]),
      });
      return;
    }

    if (pathname === '/subscription' && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(state.subscription),
      });
      return;
    }

    if (pathname === '/subscription/change-plan' && method === 'POST') {
      const payload = request.postDataJSON() as { plan: string };
      state.requestedPlan = payload.plan;
      state.subscription = {
        ...state.subscription,
        scheduledPlan: payload.plan,
        scheduledPlanEffectiveMonth: 10,
        scheduledPlanEffectiveYear: 2026,
        message: 'Troca de plano agendada.',
      };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(state.subscription),
      });
      return;
    }

    if (pathname === '/billing/invoices/91/regenerate-link' && method === 'POST') {
      state.pixRequests += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          pixQrCode: '00020101021226890014br.gov.bcb.pix',
          pixQrCodeBase64:
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z3p8AAAAASUVORK5CYII=',
          pixExpiresAt: '2026-09-23T23:59:59.000Z',
        }),
      });
      return;
    }

    const responses: Record<string, unknown> = {
      '/orders': { orders: [] },
      '/products': { products: [] },
      '/ingredients': { ingredients: [] },
      '/categories': { categories: [] },
      '/coupons': { coupons: [] },
      '/settings': {
        id: 1,
        restaurant: { id: RESTAURANT_ID, name: 'Restaurante Teste' },
      },
      '/billing/invoices': {
        invoices: [
          {
            id: 91,
            month: 9,
            year: 2026,
            monthlyFee: 249.9,
            systemFees: 0,
            total: 249.9,
            status: 'PENDENTE',
            dueDate: '2026-09-23T12:00:00.000Z',
            paidAt: null,
          },
          {
            id: 90,
            month: 8,
            year: 2026,
            monthlyFee: 249.9,
            systemFees: 0,
            total: 249.9,
            status: 'PAGO',
            dueDate: '2026-08-23T12:00:00.000Z',
            paidAt: '2026-08-21T12:00:00.000Z',
          },
        ],
        billing: {
          currentCycle: 2,
          completedMonths: 1,
          currentInvoiceId: 91,
          restaurantCreatedAt: '2026-08-02T12:00:00.000Z',
          adminCreatedAt: '2026-08-02T12:00:00.000Z',
          adminName: 'Admin Teste',
          dueDate: '2026-09-23T12:00:00.000Z',
          graceLimitDate: '2026-09-30T12:00:00.000Z',
          pixAvailableAt: '2026-09-18T12:00:00.000Z',
          pixAvailable: true,
        },
      },
      '/banners': [],
      '/employees': { employees: [] },
      '/ai-support/messages': { messages: [] },
    };

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        orderFixtureResponse(route.request().url(), responses['/orders']) ??
          responses[pathname] ??
          {},
      ),
    });
  });

  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem(
      'user',
      JSON.stringify({ id: 9, name: 'Admin Teste', role: 'ADMIN', restaurantId: 9 }),
    );
  });
  await mockAuthRefresh(page, RESTAURANT_ID, 'e2e-admin-token');
}

async function openBilling(page: Page, state: BillingTestState) {
  await mockAdminApi(page, state);
  await page.goto('/admin');
  await page.getByRole('button', { name: 'Cobranças e assinaturas' }).click();
  await expect(page.getByRole('heading', { name: 'Como você prefere pagar?' })).toBeVisible();
}

async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.documentWidth - dimensions.viewportWidth).toBeLessThanOrEqual(1);
}

test('central financeira mantém leitura clara e responsiva em desktop e mobile', async ({
  page,
}) => {
  const state = createState();
  await page.setViewportSize({ width: 1440, height: 960 });
  await openBilling(page, state);

  await expect(page.getByRole('tab', { name: /^Pagamento/ })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.getByRole('button', { name: 'Cadastrar cartão automático' })).toBeEnabled();
  await expect(page.getByRole('button', { name: /Prefere pagar por Pix/ })).toHaveAttribute(
    'aria-expanded',
    'false',
  );
  await expect(page.getByRole('heading', { name: 'Sua assinatura está em dia' })).not.toBeVisible();
  await page.screenshot({ path: '../artifacts/billing-payment-desktop.png', fullPage: true });
  await page.getByRole('tab', { name: /^Planos/ }).click();
  await expect(page.getByText('Gestão da assinatura')).toBeVisible();
  const adminShellStyles = await page.locator('[data-admin-root]').evaluate((element) => {
    const styles = window.getComputedStyle(element);
    return {
      backgroundImage: styles.backgroundImage,
      fontFamily: styles.fontFamily,
    };
  });
  expect(adminShellStyles.backgroundImage).toContain('linear-gradient');
  expect(adminShellStyles.fontFamily).toContain('DM Sans');
  const desktopNavigation = page.getByRole('navigation', {
    name: 'Navegação principal do painel',
  });
  await expect(desktopNavigation).toBeVisible();
  await expect(
    desktopNavigation.getByRole('button', { name: 'Cobranças e assinaturas' }),
  ).toHaveAttribute('aria-current', 'page');
  await expect(
    page.getByRole('navigation', { name: 'Navegação administrativa móvel' }),
  ).not.toBeVisible();
  await expect(page.getByRole('tab', { name: /Planos/ })).toHaveAttribute('aria-selected', 'true');
  await expect(
    page.getByRole('heading', { name: 'Encontre o plano certo para sua operação' }),
  ).toBeVisible();
  await expect(page.locator('section[aria-labelledby="billing-hero-title"]')).toHaveCSS(
    'border-radius',
    '8px',
  );
  await expect(page.locator('article[aria-label^="Plano Básico"]')).toHaveCSS(
    'border-radius',
    '8px',
  );
  await expect(page.getByText('Troca disponível')).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.getByRole('button', { name: 'Recolher menu lateral' }).click();
  await expect(desktopNavigation).not.toBeVisible();
  await page.getByRole('button', { name: 'Expandir menu lateral' }).click();
  await expect(desktopNavigation).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('heading', { name: 'Sua assinatura está em dia' })).toBeVisible();
  const mobileNavigation = page.getByRole('navigation', {
    name: 'Navegação administrativa móvel',
  });
  await expect(mobileNavigation).toBeVisible();
  await expect(mobileNavigation.getByText('Mais', { exact: true })).toBeVisible();
  await mobileNavigation.getByRole('button', { name: 'Abrir menu administrativo' }).click();
  await expect(page.locator('#admin-mobile-menu')).toBeVisible();
  await expect(mobileNavigation).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#admin-mobile-menu')).not.toBeVisible();
  await expect(mobileNavigation).toBeVisible();
  await mobileNavigation.getByRole('button', { name: 'Visão geral' }).click();
  await expect(page.getByRole('heading', { name: 'Visão geral', exact: true })).toBeVisible();
  await expect(page.locator('section[aria-labelledby="overview-summary-title"]')).toHaveCSS(
    'border-radius',
    '8px',
  );
  await mobileNavigation.getByRole('button', { name: 'Abrir menu administrativo' }).click();
  await page.getByRole('button', { name: 'Cobranças e assinaturas' }).click();
  await expect(page.getByRole('heading', { name: 'Como você prefere pagar?' })).toBeVisible();
  await page.screenshot({ path: '../artifacts/billing-payment-mobile.png', fullPage: true });
  await expect(page.getByRole('tab', { name: /Cobranças/ })).toBeVisible();
  await page.getByRole('tab', { name: /Cobranças/ }).click();
  await expect(page.locator('article[aria-labelledby="billing-cycle-title"]')).toHaveCSS(
    'border-radius',
    '8px',
  );
  await expect(page.locator('section[aria-labelledby="billing-history-title"]')).toHaveCSS(
    'border-radius',
    '8px',
  );
  await expectNoHorizontalOverflow(page);
});

test('admin agenda plano e abre o pagamento Pix pela cobrança atual', async ({ page }) => {
  const state = createState();
  await openBilling(page, state);
  await page.getByRole('tab', { name: /^Planos/ }).click();

  const basicPlan = page.locator('article[aria-label^="Plano Básico"]');
  await basicPlan.getByRole('button', { name: 'Escolher para o próximo ciclo' }).click();
  await expect.poll(() => state.requestedPlan).toBe('BASICO');
  await expect(page.getByText('Troca de plano agendada', { exact: true })).toBeVisible();

  await page.getByRole('tab', { name: /Cobranças/ }).click();
  await expect(page.getByRole('heading', { name: 'Mensalidades e pagamentos' })).toBeVisible();
  await expect(page.getByText('Disponível agora')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expectNoHorizontalOverflow(page);
  await page.getByRole('button', { name: 'Gerar QR Code Pix' }).click();

  await expect.poll(() => state.pixRequests).toBe(1);
  const dialog = page.getByRole('dialog', { name: 'Pague sua mensalidade' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('R$ 249,90');
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
});

test('erros técnicos ficam fora da interface e o cadastro permite tentar novamente', async ({
  page,
}) => {
  const state = createState();
  state.recurringError = true;
  await openBilling(page, state);
  await expect(page.getByRole('alert')).toContainText('Não foi possível consultar');
  await expect(page.getByText(/prisma|PlatformBillingProfile/)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Cadastrar cartão automático' })).toBeDisabled();
  state.recurringError = false;
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await page.getByRole('button', { name: 'Cadastrar cartão automático' }).click();
  const dialog = page.getByRole('dialog', { name: 'Cartão para renovação automática' });
  await expect(dialog.getByRole('alert')).toContainText('cadastro de cartão está indisponível');
  await expect(page.getByText('Chave pública do Mercado Pago', { exact: false })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Cadastrar cartão automático' })).toBeFocused();
});

test('cartão depende do consentimento e Pix só desativa renovação após confirmação explícita', async ({
  page,
}) => {
  const state = createState();
  state.configError = false;
  await page.addInitScript(() => {
    Object.defineProperty(window, 'MercadoPago', {
      value: class {
        fields = {
          create: () => ({
            mount: (id: string) => {
              const input = document.createElement('input');
              input.setAttribute('aria-label', id);
              document.getElementById(id)?.append(input);
            },
            unmount: () => undefined,
          }),
          createCardToken: async () => ({
            id: 'provider-token-test',
            last_four_digits: '4242',
            payment_method_id: 'visa',
            expiration_month: 12,
            expiration_year: 2035,
          }),
        };
      },
    });
  });
  await openBilling(page, state);
  await page.getByRole('button', { name: 'Cadastrar cartão automático' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nome do titular').fill('Cliente Teste');
  await dialog.getByLabel('CPF do titular').fill('12345678901');
  const activate = dialog.getByRole('button', { name: 'Ativar renovação automática' });
  await expect(activate).toBeDisabled();
  await dialog.getByRole('checkbox').check();
  await activate.click();
  await expect(page.getByText('Renovação automática ativa', { exact: true })).toBeVisible();
  expect(state.cardPayload).toEqual({
    cardToken: 'provider-token-test',
    brand: 'visa',
    last4: '4242',
    expMonth: 12,
    expYear: 2035,
  });
  await page.getByRole('button', { name: /Prefere pagar por Pix/ }).click();
  expect(state.pixChanges).toBe(0);
  await expect(page.getByText(/Ao confirmar, a renovação automática/)).toBeVisible();
  await page.getByRole('button', { name: 'Desativar renovação e usar Pix' }).click();
  await expect.poll(() => state.pixChanges).toBe(1);
  await expect(page.getByText('Você está usando Pix manual.')).toBeVisible();
});

test('abas permitem navegação pelo teclado sem alterar o pagamento', async ({ page }) => {
  const state = createState();
  await openBilling(page, state);
  await page.getByRole('tab', { name: /^Pagamento/ }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: /^Planos/ })).toBeFocused();
  await page.keyboard.press('End');
  await expect(page.getByRole('tab', { name: /^Cobranças/ })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.keyboard.press('Home');
  await expect(page.getByRole('heading', { name: 'Como você prefere pagar?' })).toBeVisible();
  expect(state.pixChanges).toBe(0);
  expect(state.cardPayload).toBeNull();
});

test('demonstração cadastra cartão fictício e mantém a escolha sem acessar pagamentos reais', async ({
  page,
}) => {
  const forbidden: string[] = [];
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname.includes('mercadopago')) {
      forbidden.push(url.href);
      return route.abort();
    }
    if (url.port === '3000' || url.pathname.startsWith('/api/')) {
      if (url.pathname.endsWith('/auth/refresh')) return route.fulfill({ status: 401, json: {} });
      if (url.pathname.endsWith('/platform/status'))
        return route.fulfill({ json: { available: true } });
      forbidden.push(url.pathname);
      return route.abort();
    }
    return route.continue();
  });
  await page.addInitScript(
    ({ key, state }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state));
      sessionStorage.setItem('gastronexa:demo:account', 'demo-admin');
    },
    { key: DEMO_STORAGE_KEY, state: createInitialDemoState() },
  );
  await page.goto('/demonstracao');
  const admin = page.frameLocator('iframe[title="Painel administrativo demonstrativo"]');
  await admin.getByRole('button', { name: 'Cobranças e assinaturas' }).click();
  await admin.getByRole('button', { name: 'Cadastrar cartão automático' }).click();
  const dialog = admin.getByRole('dialog');
  await expect(dialog.getByText('Cartão fictício •••• 4242')).toBeVisible();
  await expect(dialog.locator('input:not([type="checkbox"])')).toHaveCount(0);
  await expect(dialog.getByRole('button', { name: 'Simular ativação' })).toBeDisabled();
  await dialog.getByRole('checkbox').check();
  await dialog.getByRole('button', { name: 'Simular ativação' }).click();
  await expect(admin.getByText('Renovação automática ativa', { exact: true })).toBeVisible();
  await page.reload();
  await admin.getByRole('button', { name: 'Cobranças e assinaturas' }).click();
  await expect(admin.getByText('Renovação automática ativa', { exact: true })).toBeVisible();
  await admin.getByRole('button', { name: /Prefere pagar por Pix/ }).click();
  await admin.getByRole('button', { name: 'Desativar renovação e usar Pix' }).click();
  await expect(admin.getByText('Você está usando Pix manual.')).toBeVisible();
  await page.setViewportSize({ width: 320, height: 740 });
  const frame = page.frames().find((item) => item.url().includes('demo-admin.html'))!;
  expect(await frame.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(forbidden).toEqual([]);
});

test('acesso GastroNexa adapta a composição vetorial ao desktop e celular', async ({ page }) => {
  await page.clock.install();
  await page.route(API, (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/auth/refresh' || path === '/auth/me')
      return route.fulfill({ status: 401, json: {} });
    if (path === '/platform/status') return route.fulfill({ json: { available: true } });
    return route.fulfill({ json: {} });
  });
  await page.goto('/super_admin/login');
  const artwork = page.getByTestId('gastronexa-access-artwork');
  const composition = artwork.locator('.brand-composition');
  await expect(composition).toBeVisible();
  await expect(artwork.locator('img, image, foreignObject')).toHaveCount(0);
  await expect(composition.locator('path').first()).toHaveAttribute('d', /^M/);
  await expect(composition.locator('.word-nexa')).toHaveText('Nexa');
  const stroke = composition.locator('.brand-stroke');
  await expect(stroke).toHaveCSS('animation-iteration-count', '1');
  await expect(composition.locator('.gx-draw-g')).toHaveCSS('animation-iteration-count', '1');
  const gastroLetters = composition.locator('.word-gastro .brand-letter');
  const nexaLetters = composition.locator('.word-nexa .brand-letter');
  await expect(gastroLetters).toHaveCount(6);
  await expect(nexaLetters).toHaveCount(4);
  await page.clock.runFor(4000);
  await artwork.evaluate((root) =>
    root.getAnimations({ subtree: true }).forEach((animation) => animation.finish()),
  );
  for (const letter of await artwork.locator('.brand-letter').all())
    await expect(letter).toHaveCSS('opacity', '1');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(stroke).toHaveCSS('animation-name', 'none');
  await expect(gastroLetters.first()).toHaveCSS('animation-name', 'none');
  await expect(composition.locator('.gx-draw-g')).toHaveCSS('stroke-dashoffset', '0px');
  for (const viewport of [
    { width: 1920, height: 1080 },
    { width: 1366, height: 768 },
    { width: 1024, height: 768 },
    { width: 768, height: 1024 },
    { width: 320, height: 740 },
    { width: 390, height: 844 },
    { width: 430, height: 932 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await expectNoHorizontalOverflow(page);
    expect(
      await composition.evaluate((svg) => {
        const parent = svg.parentElement!.getBoundingClientRect();
        const mark = svg.getBoundingClientRect();
        return (
          mark.left >= parent.left &&
          mark.right <= parent.right &&
          mark.top >= parent.top &&
          mark.bottom <= parent.bottom - 30
        );
      }),
    ).toBe(true);
    for (const lettering of await composition.locator('text').all()) {
      expect(
        await lettering.evaluate((text: SVGTextElement) => {
          const box = text.getBBox();
          return box.x >= 0 && box.x + box.width <= 680;
        }),
      ).toBe(true);
    }
    if (viewport.width === 1366 || viewport.width === 390) {
      await page.screenshot({
        path: `../artifacts/gastronexa-access-${viewport.width}.png`,
        fullPage: true,
      });
    }
  }
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.evaluate(() => {
    history.pushState({}, '', '/');
    dispatchEvent(new PopStateEvent('popstate'));
  });
  await expect(artwork).toHaveCount(0);
  await page.evaluate(() => {
    history.pushState({}, '', '/super_admin/login');
    dispatchEvent(new PopStateEvent('popstate'));
  });
  await expect(artwork).toHaveAttribute('data-animate', 'false');
  await page.reload();
  await expect(artwork).toHaveAttribute('data-animate', 'true');
});
