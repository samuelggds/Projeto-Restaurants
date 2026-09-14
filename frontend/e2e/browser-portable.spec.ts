import { expect, test } from '@playwright/test';

/**
 * Portable browser checks intentionally avoid Chromium-only APIs such as CDP and page.pdf().
 * These assertions run unchanged in Chromium, Firefox and WebKit.
 */
test.describe('critical portable browser behavior', () => {
  test('GastroNexa logo asset loads and preserves the transparency filter contract', async ({
    page,
    request,
  }) => {
    await page.goto('/demonstracao');
    await page.getByRole('button', { name: 'Cardápio da mesa (QR Code)', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Bem-vindo de volta!' })).toBeVisible();

    const logo = page.locator('header img[src="/gastronexa-logo.svg"]');
    await expect(logo).toBeVisible();
    await expect
      .poll(() =>
        logo.evaluate((element) => {
          const image = element as HTMLImageElement;
          return image.complete && image.naturalWidth > 0 && image.naturalHeight > 0;
        }),
      )
      .toBe(true);

    const response = await request.get('/gastronexa-logo.svg');
    expect(response.ok()).toBe(true);
    const svg = await response.text();
    expect(svg).toContain('id="transparent-gx"');
    expect(svg).toContain('filter="url(#transparent-gx)"');
    expect(svg).toContain('<image');
  });

  test('demo controls remain reachable after opening a modal', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/demonstracao');
    const controls = page.getByTestId('demo-controls');
    await expect(controls).toBeVisible();

    await page.getByRole('button', { name: 'Entrar nesta área', exact: true }).first().click();
    const dialog = page.getByRole('dialog').first();
    await expect(dialog).toBeVisible();
    await expect(controls).toBeVisible();
  });

  test('mobile preview remains scrollable and navigation stays usable', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
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
      scroller?.setAttribute('data-portable-scroll-probe', '');
      return Boolean(scroller);
    });
    expect(hasScroller).toBe(true);

    const scroller = page.locator('[data-portable-scroll-probe]');
    const box = await scroller.boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + Math.min(120, box!.height / 2));
    await page.mouse.wheel(0, 500);
    await expect.poll(() => scroller.evaluate((element) => element.scrollTop)).toBeGreaterThan(40);
  });
});
