import { expect, test, type FrameLocator, type Page } from '@playwright/test';
import { createInitialDemoState } from '../src/pages/Marketing/demo/demoDomain';
import { adminMockSettings } from '../src/pages/admin/data';
import { mockAuthRefresh } from './helpers/mockAuthRefresh';
import { orderFixtureResponse } from './helpers/orderFixtures';

test.use({
  viewport: { width: 1440, height: 1000 },
  isMobile: true,
  hasTouch: true,
  reducedMotion: 'reduce',
});

for (const demo of [false, true]) {
  test(`${demo ? 'demo' : 'real'}: editar cópias e limite da mesa no celular`, async ({ page }) => {
    const errors: string[] = [];
    const printerSaves: unknown[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    let printer = {
      enabled: true,
      autoPrintEnabled: false,
      autoPrintTrigger: 'NEW_ORDER',
      paperWidth: 'MM80',
      copies: 1,
    };
    await page.route(/:3000\/|\/api\//, async (route) => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      if (path === '/kitchen-printing/settings') {
        if (request.method() === 'PATCH') {
          printer = request.postDataJSON();
          printerSaves.push(printer);
          return route.fulfill({ json: printer });
        }
        return route.fulfill({
          json: { settings: printer, agent: null, queue: {}, onlineWindowSeconds: 90 },
        });
      }
      const data: Record<string, unknown> = {
        '/auth/me': {
          user: { id: 9, name: 'Administrador teste', role: 'ADMIN', restaurantId: 9 },
        },
        '/products': { products: [] },
        '/ingredients': { ingredients: [] },
        '/categories': { categories: [] },
        '/coupons': { coupons: [] },
        '/settings': { id: 1, restaurant: { id: 9, name: 'Restaurante teste' } },
        '/billing/invoices': { invoices: [] },
        '/banners': [],
        '/employees': [],
        '/table-accounts/settings': {
          ...adminMockSettings.tableAccount,
          enabled: true,
          allowOnlinePayment: true,
        },
        '/table-accounts/admin/sessions': { sessions: [] },
        '/kitchen-printing/jobs': [],
      };
      await route.fulfill({ json: orderFixtureResponse(request.url(), []) ?? data[path] ?? {} });
    });
    if (demo) {
      await page.addInitScript((state) => {
        localStorage.setItem('gastronexa:interactive-demo:v2', JSON.stringify(state));
        sessionStorage.setItem('gastronexa:demo:account', 'demo-admin');
      }, createInitialDemoState());
    } else await mockAuthRefresh(page, 9, 'settings-input-test-token');
    await page.goto(demo ? '/demonstracao' : '/admin');
    const admin: Page | FrameLocator = demo
      ? page.frameLocator('iframe[title="Painel administrativo demonstrativo"]')
      : page;
    await admin.getByRole('button', { name: 'Configurações', exact: true }).first().click();
    await admin.getByRole('button', { name: 'Impressora da cozinha ›', exact: true }).click();
    await expect(admin.locator('[data-settings-section="printing"]')).toBeVisible();
    await admin.getByRole('checkbox', { name: 'Usar impressora da cozinha' }).check();
    await page.setViewportSize({ width: 390, height: 844 });
    const copies = admin.getByRole('textbox', { name: 'Número de cópias', exact: true });
    for (const value of ['2', '3', '4', '5', '1', '4']) {
      await copies.tap();
      await page.keyboard.press('Backspace');
      await expect(copies).toHaveValue('');
      await expect(
        admin.getByRole('button', { name: 'Salvar configuração', exact: true }),
      ).toBeDisabled();
      await page.keyboard.press(value);
      await expect(copies).toHaveValue(value);
    }
    await admin.getByRole('button', { name: 'Salvar configuração', exact: true }).click();
    await expect(
      admin.getByText('Configuração de impressão salva com segurança.', { exact: true }),
    ).toBeVisible();
    if (!demo) expect(printerSaves).toEqual([expect.objectContaining({ copies: 4 })]);
    await copies.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: `../artifacts/demo-functional-completeness/printing-copies-${demo ? 'demo' : 'real'}-mobile.png`,
    });

    await page.setViewportSize({ width: 1440, height: 1000 });
    await admin.getByRole('button', { name: 'Conta e pagamento da mesa ›', exact: true }).click();
    const section = admin.getByRole('region', {
      name: 'Quando o cliente precisa pagar na hora',
      exact: true,
    });
    await expect(section).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    const limit = section.getByRole('textbox', {
      name: 'Limite para pagamento antecipado',
      exact: true,
    });
    await limit.fill('');
    await limit.pressSequentially('100,25');
    await expect(limit).toHaveValue('100,25');
    await limit.press('Tab');
    await expect(section.getByText(/Exemplo com seu limite de R\$/)).toContainText('100,25');
    await section.getByRole('button', { name: 'Adicionar horário', exact: true }).click();
    await section.getByLabel('Início do período 1', { exact: true }).fill('22:00');
    await section.getByLabel('Fim do período 1', { exact: true }).fill('02:00');
    await expect(section.getByText(/Termina no dia seguinte/)).toBeVisible();
    const documentFrame = demo
      ? page.frames().find((frame) => frame.url().includes('demo-admin.html'))!
      : page.mainFrame();
    expect(
      await documentFrame.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBe(true);
    await section.screenshot({
      path: `../artifacts/demo-functional-completeness/table-prepayment-${demo ? 'demo' : 'real'}-mobile.png`,
    });
    await page.setViewportSize({ width: 1440, height: 1100 });
    await section.screenshot({
      path: `../artifacts/demo-functional-completeness/table-prepayment-${demo ? 'demo' : 'real'}-desktop.png`,
    });
    expect(errors).toEqual([]);
  });
}
