import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { mockAdminVisuals } from './helpers/adminVisualFixtures';

test('payment descriptions stay readable with both sidebars and on phones', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const writes = await mockAdminVisuals(page);
  await page.goto('/admin');
  await page
    .getByRole('navigation', { name: 'Navegação principal do painel' })
    .getByRole('button', { name: 'Configurações', exact: true })
    .click();
  await page
    .locator('aside')
    .filter({ has: page.getByRole('textbox', { name: 'Buscar configuração' }) })
    .getByRole('button', { name: 'Pagamentos', exact: true })
    .click();
  const title = page.getByRole('heading', { name: 'Pix pelo app do banco', exact: true });
  await expect(title).toBeVisible();
  const cards = title.locator('xpath=ancestor::section[1]/..');
  await expect(cards.locator(':scope > section')).toHaveCount(3);
  await expect(page.getByRole('complementary', { name: 'Menu administrativo' })).toHaveCSS(
    'background-color',
    'rgb(28, 28, 28)',
  );

  for (const width of [1920, 1440, 1280, 1100, 900, 820, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    const metrics = await title.evaluate((element) => {
      const copy = element.parentElement!;
      const text = copy.querySelector('p')!;
      return {
        titleLines:
          element.getBoundingClientRect().height / parseFloat(getComputedStyle(element).lineHeight),
        copyWidth: text.getBoundingClientRect().width,
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
      };
    });
    expect(metrics.titleLines, `Title lines at ${width}px`).toBeLessThanOrEqual(2.1);
    expect(metrics.copyWidth, `Text column at ${width}px`).toBeGreaterThanOrEqual(180);
    expect(metrics.overflow, `Page overflow at ${width}px`).toBe(false);
    if (process.env.README_SCREENSHOT_OUTPUT_DIR && [1440, 390].includes(width)) {
      const output = process.env.README_SCREENSHOT_OUTPUT_DIR;
      await mkdir(output, { recursive: true });
      await cards.screenshot({
        path: path.join(output, `pagamentos-ajustados-${width}.png`),
        animations: 'disabled',
      });
    }
  }
  const openFinance = page.getByRole('switch', {
    name: 'Aceitar Pix pelo app do banco via Open Finance',
  });
  await openFinance.check();
  await expect(page.getByRole('textbox', { name: /Chave Pix de recebimento/ })).toBeVisible();
  await openFinance.uncheck();
  expect(writes).toEqual([]);
});
