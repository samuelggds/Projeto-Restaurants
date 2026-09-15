import { expect, test, type FrameLocator, type Page } from '@playwright/test';
import { createInitialDemoState } from '../src/pages/Marketing/demo/demoDomain';
import { mockAuthRefresh } from './helpers/mockAuthRefresh';
import { orderFixtureResponse } from './helpers/orderFixtures';

async function openSupportCenter(page: Page, demo: boolean) {
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

  if (demo) {
    await page.addInitScript((state) => {
      localStorage.setItem('gastronexa:interactive-demo:v2', JSON.stringify(state));
      sessionStorage.setItem('gastronexa:demo:account', 'demo-admin');
    }, createInitialDemoState());
  } else {
    await mockAuthRefresh(page, 9, 'help-scroll-test-token');
  }

  await page.goto(demo ? '/demonstracao' : '/admin');
  const panel: Page | FrameLocator = demo
    ? page.frameLocator('iframe[title="Painel administrativo demonstrativo"]')
    : page;

  await expect(
    panel.getByRole('heading', { name: 'Visão geral', exact: true }).first(),
  ).toBeVisible();

  const mobileMenu = panel.getByRole('button', { name: 'Abrir menu administrativo', exact: true });
  if (await mobileMenu.isVisible()) await mobileMenu.click();

  await panel
    .getByRole('button', { name: /^Central de ajuda(?: Suporte e orientações)?$/ })
    .click();
  await expect(panel.getByRole('heading', { name: 'Suporte do restaurante', exact: true })).toBeVisible();

  return panel;
}

test.describe('central de ajuda administrativa', () => {
  test.use({ viewport: { width: 1440, height: 700 }, reducedMotion: 'reduce' });

  for (const demo of [false, true]) {
    test(`${demo ? 'demonstração' : 'projeto real'}: mantém os dois canais de suporte acessíveis`, async ({
      page,
    }) => {
      const panel = await openSupportCenter(page, demo);

      await expect(panel.getByRole('heading', { name: 'Suporte da equipe', exact: true })).toBeVisible();
      await expect(
        panel.getByRole('heading', { name: 'Suporte da plataforma', exact: true }),
      ).toBeVisible();

      const message = panel.getByRole('textbox', { name: 'Mensagem para o Super Admin' });
      await message.scrollIntoViewIfNeeded();
      await expect(message).toBeVisible();
      await message.fill('Preciso de suporte técnico no painel administrativo.');
      await expect(panel.getByRole('button', { name: 'Enviar ao Super Admin' })).toBeEnabled();

      await expect(panel.getByRole('figure')).toHaveCount(0);
    });
  }
});

for (const width of [390, 1280]) {
  test(`prévia do motoqueiro: rolagem interna em ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 420 });
    await page.route(/:3000\/|\/api\//, (route) => route.abort());
    await page.goto('/help-preview.html?area=courier-overview');
    await expect(page.getByRole('heading').first()).toBeVisible();
    await expect(page.locator('#root')).toHaveAttribute('data-help-preview-readonly', 'true');
    const hasScroller = await page.evaluate(() => {
      const scroller = Array.from(document.querySelectorAll<HTMLElement>('#root *'))
        .filter(
          (element) =>
            /auto|scroll/.test(getComputedStyle(element).overflowY) &&
            element.scrollHeight > element.clientHeight + 80 &&
            element.clientWidth > 250 &&
            element.clientHeight > 150,
        )
        .sort((a, b) => b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight)[0];
      scroller?.setAttribute('data-scroll-probe', '');
      return Boolean(scroller);
    });
    expect(hasScroller).toBe(true);
    const scroller = page.locator('[data-scroll-probe]');
    const box = (await scroller.boundingBox())!;
    await page.mouse.move(
      Math.min(box.x + box.width / 2, width - 20),
      Math.min(box.y + box.height / 2, 350),
    );
    await page.mouse.wheel(0, 500);
    await expect.poll(() => scroller.evaluate((element) => element.scrollTop)).toBeGreaterThan(50);
  });
}

test.describe('central de ajuda administrativa no celular', () => {
  test.use({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });

  for (const demo of [false, true]) {
    test(`${demo ? 'demonstração' : 'projeto real'}: formulário de suporte continua utilizável`, async ({
      page,
    }) => {
      const panel = await openSupportCenter(page, demo);
      const message = panel.getByRole('textbox', { name: 'Mensagem para o Super Admin' });

      await message.scrollIntoViewIfNeeded();
      await expect(message).toBeVisible();
      await message.fill('Preciso de ajuda com uma configuração do restaurante.');
      await expect(panel.getByRole('button', { name: 'Enviar ao Super Admin' })).toBeEnabled();
    });
  }
});
