import { expect, test, type FrameLocator, type Page } from '@playwright/test';
import { createInitialDemoState } from '../src/pages/Marketing/demo/demoDomain';
import { mockAuthRefresh } from './helpers/mockAuthRefresh';
import { orderFixtureResponse } from './helpers/orderFixtures';

async function openCustomerHelp(page: Page, demo: boolean) {
  const previewRequests: string[] = [];
  await page.route(/:3000\/|\/api\//, async (route) => {
    const request = route.request();
    if (request.frame().url().includes('help-preview.html')) previewRequests.push(request.url());
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
  await panel.getByRole('button', { name: /^Clientes Clientes · \d+ passos detalhados$/ }).click();
  const figure = panel.getByRole('figure', { name: 'Prévia atual: Clientes', exact: true });
  await figure.getByRole('button', { name: 'Celular', exact: true }).click();
  const viewport = figure.locator('.viewport');
  await viewport.scrollIntoViewIfNeeded();
  const preview = page
    .frames()
    .find((frame) => frame.url().includes('help-preview.html?area=admin-customers'))!;
  await expect(preview.getByText('Clientes identificados', { exact: true })).toBeVisible();
  return { panel, figure, viewport, preview, previewRequests };
}

test.describe('rolagem com mouse na central de ajuda', () => {
  test.use({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  for (const demo of [false, true]) {
    test(`${demo ? 'demonstração' : 'projeto real'}: roda do mouse e barra da prévia`, async ({
      page,
    }) => {
      const { figure, viewport, preview, previewRequests } = await openCustomerHelp(page, demo);
      const box = (await viewport.boundingBox())!;
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.wheel(0, 450);
      await expect.poll(() => preview.evaluate(() => scrollY)).toBeGreaterThan(100);
      await page.mouse.wheel(0, -2000);
      await expect.poll(() => preview.evaluate(() => scrollY)).toBe(0);
      await figure.locator('iframe').focus();
      await preview.evaluate(() => {
        document.documentElement.dataset.keyboardScroll = 'pending';
        document.addEventListener(
          'scrollend',
          () => {
            document.documentElement.dataset.keyboardScroll = 'complete';
          },
          { once: true },
        );
      });
      await page.keyboard.press('PageDown');
      await expect.poll(() => preview.evaluate(() => scrollY)).toBeGreaterThan(100);
      // Native PageDown keeps animating after the first scroll event, even with reduced motion.
      // Finish that gesture before testing the wheel in the opposite direction.
      await expect(preview.locator('html')).toHaveAttribute('data-keyboard-scroll', 'complete');
      const currentBox = (await viewport.boundingBox())!;
      await page.mouse.move(
        currentBox.x + currentBox.width / 2,
        currentBox.y + currentBox.height / 2,
      );
      await page.mouse.wheel(0, -2000);
      await expect.poll(() => preview.evaluate(() => scrollY)).toBe(0);
      const scrollbar = await preview.evaluate(() => ({
        width: innerWidth - document.documentElement.clientWidth,
        viewportWidth: innerWidth,
      }));
      // Overlay scrollbars in headless/mobile browsers have no draggable gutter.
      if (scrollbar.width > 0) {
        const barBox = (await viewport.boundingBox())!;
        const x =
          barBox.x + barBox.width - (scrollbar.width * barBox.width) / scrollbar.viewportWidth / 2;
        await page.mouse.move(x, barBox.y + 35);
        await page.mouse.down();
        await page.mouse.move(x, barBox.y + barBox.height - 45, { steps: 10 });
        await page.mouse.up();
        await expect.poll(() => preview.evaluate(() => scrollY)).toBeGreaterThan(100);
      }
      expect(previewRequests).toEqual([]);
      await expect(preview.getByRole('heading', { name: 'Clientes', exact: true })).toBeVisible();
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

test.describe('rolagem por toque na central de ajuda', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    reducedMotion: 'reduce',
  });
  for (const demo of [false, true]) {
    test(`${demo ? 'demonstração' : 'projeto real'}: deslizar a prévia sem acionar os controles`, async ({
      page,
      context,
    }) => {
      const { viewport, preview, previewRequests } = await openCustomerHelp(page, demo);
      // Keep the gesture and the preview navigation above the panel's fixed mobile bar.
      await viewport.evaluate((element) =>
        element.scrollIntoView({ block: 'center', behavior: 'instant' }),
      );
      const box = (await viewport.boundingBox())!;
      const cdp = await context.newCDPSession(page);
      const x = box.x + box.width / 2;
      const startY = Math.min(box.y + box.height - 45, 720);
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x, y: startY }],
      });
      for (let step = 1; step <= 12; step++) {
        await cdp.send('Input.dispatchTouchEvent', {
          type: 'touchMove',
          touchPoints: [{ x, y: startY - step * 20 }],
        });
        // Space native touch moves across frames, as a finger gesture would arrive.
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await expect.poll(() => preview.evaluate(() => scrollY)).toBeGreaterThan(100);
      const menu = await preview
        .getByRole('navigation', { name: 'Navegação administrativa móvel', includeHidden: true })
        .getByRole('button', { name: 'Cardápio', exact: true, includeHidden: true })
        .boundingBox();
      if (!menu) throw new Error('Botão de exemplo não encontrado');
      await page.touchscreen.tap(menu.x + menu.width / 2, menu.y + menu.height / 2);
      await expect(preview.getByRole('heading', { name: 'Clientes', exact: true })).toBeVisible();
      expect(previewRequests).toEqual([]);
      await page.screenshot({
        path: `../artifacts/demo-functional-completeness/help-scroll-${demo ? 'demo' : 'real'}-touch.png`,
      });
      await cdp.detach();
    });
  }
});
