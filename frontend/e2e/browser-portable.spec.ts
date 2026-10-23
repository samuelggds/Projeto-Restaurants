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
    await page.goto('/');
    // The official marketing landing renders GX as an inline SVG. The external
    // asset is used by loading/legal screens, not as the landing header <img>.
    // Wait for the actual page to mount; a loading-screen image is transient.
    await expect(page.locator('header.site-header')).toBeVisible();
    const logo = page.locator('header.site-header .brand-mark svg.official-gx');
    await expect(logo).toBeVisible();
    await expect(logo.locator('path')).toHaveCount(2);
    const dimensions = await logo.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return { width: bounds.width, height: bounds.height };
    });
    expect(dimensions.width).toBeGreaterThan(0);
    expect(dimensions.height).toBeGreaterThan(0);

    const response = await request.get('/gastronexa-logo.svg');
    expect(response.ok()).toBe(true);
    const svg = await response.text();
    expect(svg).toContain('id="transparent-gx"');
    expect(svg).toContain('filter="url(#transparent-gx)"');
    expect(svg).toContain('<image');
  });

  test('mobile preview remains scrollable and navigation stays usable', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/help-preview.html?area=courier-overview');
    await expect(page.getByRole('heading').first()).toBeVisible();
    await expect(page.locator('#root')).toHaveAttribute('data-help-preview-readonly', 'true');

    const before = await page.evaluate(
      () => document.documentElement.scrollTop || document.body.scrollTop,
    );

    await page.mouse.wheel(0, 500);

    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollTop || document.body.scrollTop))
      .toBeGreaterThan(before + 40);
  });
});
