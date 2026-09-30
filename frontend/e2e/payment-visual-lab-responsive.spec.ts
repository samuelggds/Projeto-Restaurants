import { expect, test, type Page } from '@playwright/test';

const MOBILE_WIDTHS = [320, 360, 440] as const;
const SCENARIOS = [
  ['PIX aguardando', 'pix-waiting'],
  ['PIX aprovado', 'pix-paid'],
  ['PIX recusado', 'pix-failed'],
  ['Cartão aguardando', 'card-waiting'],
  ['Cartão aprovado', 'card-paid'],
  ['Cartão recusado', 'card-failed'],
] as const;

async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    html: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));

  expect(Math.max(dimensions.html, dimensions.body)).toBeLessThanOrEqual(dimensions.viewport + 1);
}

for (const width of MOBILE_WIDTHS) {
  test(`laboratório de pagamentos permanece responsivo em ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/__dev/pagamentos');

    await expect(page.locator('[data-visual-scenario="checkout"]')).toBeVisible();
    await expectNoHorizontalOverflow(page);

    for (const [label, scenario] of SCENARIOS) {
      await page.getByRole('button', { name: label, exact: true }).click();
      await expect(page.locator(`[data-visual-scenario="${scenario}"]`)).toBeVisible();
      await expectNoHorizontalOverflow(page);
    }
  });
}

test('PIX fictício comprido não empurra o botão copiar para fora no mobile', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto('/__dev/pagamentos');
  await page.getByRole('button', { name: 'PIX aguardando', exact: true }).click();

  const copyButton = page.getByRole('button', { name: 'Copiar código Pix' });
  await expect(copyButton).toBeVisible();
  await expect(copyButton).toBeInViewport();
  await expectNoHorizontalOverflow(page);
});
