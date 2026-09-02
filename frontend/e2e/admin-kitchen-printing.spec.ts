import { expect, test, type Page, type Route } from '@playwright/test';

import type {
  KitchenPrinterSettings,
  KitchenPrintJobSummary,
  KitchenPrintingConfiguration,
} from '../src/Services/kitchenPrintingService';
import { mockAuthRefresh } from './helpers/mockAuthRefresh';

type TestState = {
  configuration: KitchenPrintingConfiguration;
  jobs: KitchenPrintJobSummary[];
  savedSettings: KitchenPrinterSettings | null;
  jobsLimit: number | null;
};

function recentJobs(): KitchenPrintJobSummary[] {
  return Array.from({ length: 12 }, (_, index) => {
    const failed = index === 0;
    return {
      publicId: `job-${index + 1}`,
      orderId: 1842 - index,
      type: 'ORDER',
      source: index % 2 === 0 ? 'AUTOMATIC' : 'MANUAL',
      trigger: index % 2 === 0 ? 'NEW_ORDER' : null,
      status: failed ? 'FAILED' : index % 3 === 0 ? 'PENDING' : 'PRINTED',
      attempts: failed ? 3 : 1,
      availableAt: `2026-09-02T10:${String(40 - index).padStart(2, '0')}:00.000Z`,
      printedAt: failed ? null : '2026-09-02T10:45:00.000Z',
      lastError: failed ? 'Impressora sem papel' : null,
      createdAt: `2026-09-02T10:${String(40 - index).padStart(2, '0')}:00.000Z`,
    } satisfies KitchenPrintJobSummary;
  });
}

function initialState(): TestState {
  return {
    configuration: {
      settings: {
        enabled: true,
        autoPrintEnabled: true,
        autoPrintTrigger: 'NEW_ORDER',
        paperWidth: 'MM80',
        copies: 1,
      },
      agent: {
        publicId: 'printer-agent-31',
        name: 'Computador da cozinha',
        printerName: 'EPSON TM-T20X',
        lastSeenAt: '2026-09-02T10:45:00.000Z',
        appVersion: '1.4.0',
        online: false,
      },
      queue: { PENDING: 2, PROCESSING: 0, PRINTED: 14, FAILED: 1 },
      onlineWindowSeconds: 90,
    },
    jobs: recentJobs(),
    savedSettings: null,
    jobsLimit: null,
  };
}

async function fulfillJson(route: Route, body: unknown) {
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
}

async function mockAdminApi(page: Page, state: TestState) {
  await page.route(/^http:\/\/(127\.0\.0\.1|localhost):3000\/.*$/, async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    const method = request.method();

    if (pathname === '/auth/me') {
      await fulfillJson(route, {
        user: { id: 9, name: 'Admin Teste', role: 'ADMIN', restaurantId: 9 },
      });
      return;
    }

    if (pathname === '/kitchen-printing/settings' && method === 'GET') {
      await fulfillJson(route, state.configuration);
      return;
    }

    if (pathname === '/kitchen-printing/settings' && method === 'PATCH') {
      const settings = request.postDataJSON() as KitchenPrinterSettings;
      state.savedSettings = settings;
      state.configuration = { ...state.configuration, settings };
      await fulfillJson(route, settings);
      return;
    }

    if (pathname === '/kitchen-printing/jobs' && method === 'GET') {
      state.jobsLimit = Number(new URL(request.url()).searchParams.get('limit'));
      await fulfillJson(route, state.jobs);
      return;
    }

    const responses: Record<string, unknown> = {
      '/orders': { orders: [] },
      '/products': { products: [] },
      '/ingredients': { ingredients: [] },
      '/categories': { categories: [] },
      '/settings': { id: 1, restaurant: { id: 9, name: 'Restaurante Teste' } },
      '/coupons': { coupons: [] },
      '/billing/invoices': { invoices: [] },
      '/banners': [],
      '/employees': [],
    };
    await fulfillJson(route, responses[pathname] ?? {});
  });

  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem(
      'user',
      JSON.stringify({ id: 9, name: 'Admin Teste', role: 'ADMIN', restaurantId: 9 }),
    );
  });
  await mockAuthRefresh(page, 9, 'e2e-admin-token');
}

async function openPrintingSettings(page: Page, mobile = false) {
  await page.goto('/admin');
  if (mobile) await page.getByRole('button', { name: 'Abrir menu administrativo' }).click();
  await page.getByRole('button', { name: 'Configurações' }).click();
  await page.getByRole('button', { name: 'Impressora da cozinha', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Comandas impressas sem complicação' }),
  ).toBeVisible();
}

test('admin visualiza as comandas de delivery, mesa e retirada', async ({ page }, testInfo) => {
  const state = initialState();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await mockAdminApi(page, state);
  await openPrintingSettings(page);

  const preview = page.locator('.command-preview-panel');
  await expect(preview.getByText('DELIVERY', { exact: true })).toBeVisible();
  await expect(preview.getByText('Rua das Flores, 120 • Centro')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('printing-delivery.png'), fullPage: true });

  await preview.getByRole('tab', { name: 'Mesa', exact: true }).click();
  await expect(preview.getByText('MESA 12', { exact: true })).toBeVisible();
  await expect(preview.getByText('Garçom Rafael', { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('printing-table.png'), fullPage: true });

  await preview.getByRole('tab', { name: 'Retirada', exact: true }).click();
  await expect(preview.getByText('RETIRADA', { exact: true })).toBeVisible();
  await expect(preview.getByText('Retirada no balcão', { exact: true })).toBeVisible();

  await page.getByRole('radio', { name: /58 mm/ }).click();
  await page.getByRole('spinbutton', { name: 'Número de cópias' }).fill('2');
  await expect(preview.getByText('58 mm', { exact: true })).toBeVisible();
  await expect(preview.getByText('2 vias', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Salvar configuração' }).click();
  await expect.poll(() => state.savedSettings).toMatchObject({ paperWidth: 'MM58', copies: 2 });
  await page.screenshot({ path: testInfo.outputPath('printing-pickup.png'), fullPage: true });
});

test('histórico pesquisa por pedido e navega em blocos de cinco', async ({ page }, testInfo) => {
  const state = initialState();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await mockAdminApi(page, state);
  await openPrintingSettings(page);

  const history = page.locator('.history');
  await expect.poll(() => state.jobsLimit).toBe(50);
  await expect(history.getByText('Pedido #1842', { exact: true })).toBeVisible();
  await expect(history.getByText('Pedido #1837', { exact: true })).toHaveCount(0);

  await history.getByRole('button', { name: 'Mostrar próximas 5 impressões' }).click();
  await expect(history.getByText('Pedido #1837', { exact: true })).toBeVisible();
  await expect(history.getByText('Pedido #1842', { exact: true })).toHaveCount(0);

  await history.getByRole('button', { name: 'Voltar 5 impressões' }).click();
  await expect(history.getByText('Pedido #1842', { exact: true })).toBeVisible();

  await history.getByLabel('Pesquisar histórico pelo número do pedido').fill('1832');
  await expect(history.getByText('Pedido #1832', { exact: true })).toBeVisible();
  await expect(history.getByText('1 de 12 registro(s)', { exact: true })).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('printing-history-search.png'),
    fullPage: true,
  });

  await history.getByRole('button', { name: 'Limpar pesquisa do histórico' }).click();
  await expect(history.getByText('Pedido #1842', { exact: true })).toBeVisible();
});

test('painéis e prévia da impressora ficam contidos no celular', async ({ page }, testInfo) => {
  const state = initialState();
  await page.setViewportSize({ width: 390, height: 844 });
  await mockAdminApi(page, state);
  await openPrintingSettings(page, true);

  const flow = page.locator('.setup-flow');
  const panels = await flow.evaluate((element) => {
    const rules = element.querySelector('.print-rules-step')?.getBoundingClientRect();
    const connection = element.querySelector('.connection-step')?.getBoundingClientRect();
    return { rulesBottom: rules?.bottom || 0, connectionTop: connection?.top || 0 };
  });
  expect(panels.connectionTop).toBeGreaterThanOrEqual(panels.rulesBottom);

  const preview = page.locator('.command-preview-panel');
  await preview.getByRole('tab', { name: 'Mesa', exact: true }).click();
  await expect(preview.getByText('MESA 12', { exact: true })).toBeVisible();
  const layout = await page.locator('main').evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth + 1);
  await page.screenshot({ path: testInfo.outputPath('printing-mobile.png'), fullPage: true });
});
