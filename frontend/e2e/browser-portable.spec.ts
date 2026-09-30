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
    const logo = page.locator('img[src="/gastronexa-logo.svg"]').first();
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
