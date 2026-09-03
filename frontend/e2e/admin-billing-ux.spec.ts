import { expect, test, type Page } from '@playwright/test';

import { mockAuthRefresh } from './helpers/mockAuthRefresh';

type BillingTestState = {
  requestedPlan: string | null;
  pixRequests: number;
  subscription: Record<string, unknown>;
};

const RESTAURANT_ID = 9;
const API = /^http:\/\/(127\.0\.0\.1|localhost):3000\/.*$/;

function createState(): BillingTestState {
  return {
    requestedPlan: null,
    pixRequests: 0,
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
      body: JSON.stringify(responses[pathname] ?? {}),
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
  await expect(page.getByRole('heading', { name: 'Sua assinatura está em dia' })).toBeVisible();
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

  await expect(page.getByText('Gestão da assinatura')).toBeVisible();
  await expect(page.getByRole('tab', { name: /Planos/ })).toHaveAttribute('aria-selected', 'true');
  await expect(
    page.getByRole('heading', { name: 'Encontre o plano certo para sua operação' }),
  ).toBeVisible();
  await expect(page.getByText('Troca disponível')).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('heading', { name: 'Sua assinatura está em dia' })).toBeVisible();
  await expect(page.getByRole('tab', { name: /Cobranças/ })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test('admin agenda plano e abre o pagamento Pix pela cobrança atual', async ({ page }) => {
  const state = createState();
  await openBilling(page, state);

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
