import { expect, test, type Page } from '@playwright/test';
import { mockAuthRefresh } from './helpers/mockAuthRefresh';
import { orderFixtureResponse } from './helpers/orderFixtures';
import type { PaymentConnectionOverview } from '../src/Services/paymentConnectionService';

async function setup(page: Page) {
  const events: string[] = [];
  let settings: Record<string, unknown> = {
    id: 1,
    restaurantId: 9,
    restaurant: { id: 9, name: 'Restaurante Exemplo' },
    acceptsPix: true,
    acceptsCard: true,
    pixProvider: 'ASAAS',
    cardGateway: 'ASAAS',
    pixKey: '',
    averageDeliveryTime: 45,
  };
  const overview: PaymentConnectionOverview = {
    connections: ['MERCADO_PAGO', 'PAGBANK', 'ASAAS'].map((provider) => ({
      provider: provider as 'MERCADO_PAGO' | 'PAGBANK' | 'ASAAS',
      connected: false,
      canConnect: true,
      readyForPix: false,
      readyForCard: false,
      status: 'NOT_CONNECTED',
      message: 'Conecte a conta do restaurante.',
    })),
  };
  await page.route(/^http:\/\/(127\.0\.0\.1|localhost):3000\//, async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === '/settings/1' && request.method() === 'PUT') {
      settings = { ...settings, ...request.postDataJSON() };
      events.push('save');
      return route.fulfill({ json: settings });
    }
    const oauth = path.match(/^\/settings\/(mercado-pago|pagbank)\/oauth\/start$/);
    if (oauth) {
      events.push(oauth[1]);
      return route.fulfill({
        json: { authorizationUrl: `https://provider.example/${oauth[1]}/authorize` },
      });
    }
    if (path === '/settings/asaas/onboard') {
      events.push('asaas');
      expect(request.postDataJSON()).toMatchObject({
        cnpj: '11222333000181',
        pixKey: '',
        incomeValue: 25000,
      });
      settings.asaasAccessTokenConfigured = true;
      overview.connections[2] = {
        ...overview.connections[2],
        connected: true,
        status: 'PENDING_APPROVAL',
        message: 'Conclua os documentos solicitados pelo Asaas.',
        onboardingUrl: 'https://www.asaas.com/onboarding/exemplo',
      };
      return route.fulfill({
        json: { credentialsConfigured: true, readyForPayments: false, approvalStatus: 'PENDING' },
      });
    }
    const responses: Record<string, unknown> = {
      '/auth/me': { user: { id: 9, name: 'Admin Teste', role: 'ADMIN', restaurantId: 9 } },
      '/settings': settings,
      '/settings/payment-connections': overview,
      '/products': { products: [] },
      '/categories': { categories: [] },
      '/ingredients': { ingredients: [] },
      '/coupons': { coupons: [] },
      '/orders': { orders: [] },
      '/employees': [],
      '/banners': [],
      '/billing/invoices': { invoices: [] },
      '/table-accounts/settings': { enabled: false },
    };
    return route.fulfill({
      json: orderFixtureResponse(request.url(), responses['/orders']) ?? responses[path] ?? {},
    });
  });
  await page.route('https://provider.example/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<h1>Autorização de teste</h1>' }),
  );
  await mockAuthRefresh(page, 9, 'payment-admin-e2e');
  await page.goto('/admin?settings=payments');
  await expect(
    page.getByRole('heading', { name: 'Configure seus pagamentos com segurança' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Verificar conexões' })).toBeEnabled();
  return { events, settings: () => settings, overview };
}

for (const [provider, label, apiName, width] of [
  ['MERCADO_PAGO', 'Mercado Pago', 'mercado-pago', 1440],
  ['PAGBANK', 'PagBank', 'pagbank', 390],
] as const) {
  test(`${label}: salva escolhas antes da autorização e mantém Pix e cartão após o retorno`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const state = await setup(page);
    await page.getByLabel('Empresa que receberá o Pix', { exact: false }).selectOption(provider);
    await page.getByRole('button', { name: `Conectar ${label}`, exact: true }).click();
    await expect(page).toHaveURL(`https://provider.example/${apiName}/authorize`);
    expect(state.events).toEqual(['save', apiName]);
    expect(state.settings()).toMatchObject({
      pixProvider: provider,
      cardGateway: 'ASAAS',
      pixKey: '',
    });
    const connection = state.overview.connections.find((item) => item.provider === provider)!;
    Object.assign(connection, {
      connected: true,
      readyForPix: true,
      readyForCard: true,
      status: 'CONNECTED',
      message: 'Conta vinculada para receber pagamentos.',
    });
    await page.goto(`/admin?${provider === 'MERCADO_PAGO' ? 'mp_oauth' : 'pagbank_oauth'}=success`);
    await expect(page.getByLabel('Empresa que receberá o Pix', { exact: false })).toHaveValue(
      provider,
    );
    await expect(page.getByLabel('Empresa que processará o cartão', { exact: false })).toHaveValue(
      'ASAAS',
    );
    await expect(
      page.getByRole('button', { name: `Reconectar ${label}`, exact: true }),
    ).toBeEnabled();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    expect(overflow).toBe(false);
    await page.screenshot({
      path: `../artifacts/payment-connections-${apiName}-${width}.png`,
      fullPage: true,
    });
  });
}

test('Asaas: cria com dados do responsável e mostra ativação pendente no retorno', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const state = await setup(page);
  await page.getByPlaceholder('Somente números', { exact: true }).fill('11222333000181');
  await page.getByPlaceholder('Ex.: 25000', { exact: true }).fill('25000');
  await page.getByRole('button', { name: 'Criar e vincular conta Asaas', exact: true }).click();
  await expect(page.getByText('Cadastro em análise', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Concluir cadastro no Asaas' })).toHaveAttribute(
    'href',
    'https://www.asaas.com/onboarding/exemplo',
  );
  await expect(page.getByText('Configuração completa', { exact: true })).toHaveCount(0);
  expect(state.events).toEqual(['asaas']);
  await page.screenshot({
    path: '../artifacts/payment-connections-asaas-desktop.png',
    fullPage: true,
  });
});
