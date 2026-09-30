import { expect, test, type Page } from '@playwright/test';
import { mockAuthRefresh } from './helpers/mockAuthRefresh';
import { orderFixtureResponse } from './helpers/orderFixtures';

async function openSupportCenter(page: Page) {
  await page.route(/:3000\/|\/api\//, async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const data: Record<string, unknown> = {
      '/auth/me': { user: { id: 9, name: 'Admin teste', role: 'ADMIN', restaurantId: 9 } },
      '/products': { products: [] },
      '/ingredients': { ingredients: [] },
      '/categories': { categories: [] },
      '/coupons': { coupons: [] },
      '/settings': { id: 1, restaurant: { id: 9, name: 'Restaurante teste' } },
      '/billing/invoices': { invoices: [] },
      '/banners': [],
      '/employees': [],
      '/ai-support/messages': { messages: [] },
    };
    await route.fulfill({ json: orderFixtureResponse(request.url(), []) ?? data[path] ?? {} });
  });

  await mockAuthRefresh(page, 9, 'help-scroll-test-token');
  await page.goto('/admin');

  await expect(page.getByRole('heading', { name: 'Visão geral', exact: true }).first()).toBeVisible();

  const mobileMenu = page.getByRole('button', { name: 'Abrir menu administrativo', exact: true });
  if (await mobileMenu.isVisible()) await mobileMenu.click();

  await page
    .getByRole('button', { name: /^Central de ajuda(?: Suporte e orientações)?$/ })
    .click();
  await expect(page.getByRole('heading', { name: 'Suporte do restaurante', exact: true })).toBeVisible();

  return page;
}

test.describe('central de ajuda administrativa', () => {
  test.use({ viewport: { width: 1440, height: 700 }, reducedMotion: 'reduce' });

  test('projeto real: mantém os dois canais de suporte acessíveis', async ({ page }) => {
    const panel = await openSupportCenter(page);

    await expect(panel.getByRole('heading', { name: 'Suporte da equipe', exact: true })).toBeVisible();
    await expect(
      panel.getByRole('heading', { name: 'Suporte da plataforma', exact: true }),
    ).toBeVisible();

    const message = panel.getByRole('textbox', { name: 'Mensagem para o Super Admin' });
    await message.scrollIntoViewIfNeeded();
    await expect(message).toBeVisible();
    await message.fill('Preciso de suporte técnico no painel administrativo.');
    await expect(panel.getByRole('button', { name: 'Enviar ao Super Admin' })).toBeEnabled();
  });
});

for (const width of [390, 1280]) {
  test(`prévia da ajuda: rolagem interna em ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 420 });
    await page.route(/:3000\/|\/api\//, (route) => route.abort());
    await page.goto('/help-preview.html?area=courier-overview');
    await expect(page.getByRole('heading').first()).toBeVisible();
    await expect(page.locator('#root')).toHaveAttribute('data-help-preview-readonly', 'true');

    const before = await page.evaluate(() => document.documentElement.scrollTop || document.body.scrollTop);
    await page.mouse.wheel(0, 600);
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollTop || document.body.scrollTop))
      .toBeGreaterThan(before);
  });
}

test.describe('central de ajuda administrativa no celular', () => {
  test.use({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });

  test('projeto real: formulário de suporte continua utilizável', async ({ page }) => {
    const panel = await openSupportCenter(page);
    const message = panel.getByRole('textbox', { name: 'Mensagem para o Super Admin' });

    await message.scrollIntoViewIfNeeded();
    await expect(message).toBeVisible();
    await message.fill('Preciso de ajuda com uma configuração do restaurante.');
    await expect(panel.getByRole('button', { name: 'Enviar ao Super Admin' })).toBeEnabled();
  });
});
