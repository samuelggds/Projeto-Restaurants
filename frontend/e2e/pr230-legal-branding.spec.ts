import { expect, test } from '@playwright/test';

test('Termos usam o header oficial do GastroNexa no desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/termos/index.html');

  const header = page.locator('.terms-topbar');
  await expect(header).toBeVisible();
  await expect(header.locator('.terms-brand img')).toHaveAttribute('src', '/gastronexa-logo.svg');
  await expect(header.locator('.terms-brand-gastro')).toHaveText('Gastro');
  await expect(header.locator('.terms-brand-nexa')).toHaveText('Nexa');
  await expect(header.locator('.terms-desktop-title')).toHaveText('Termos de Serviço');
  await expect(
    page.getByRole('heading', { name: 'Termos de Serviço da GastroNexa' }),
  ).toBeVisible();
});

test('Termos mantêm navegação e tipografia legíveis no mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/termos/index.html');

  await expect(page.locator('.terms-mobile-title')).toHaveText('Termos de Serviço');
  await expect(page.locator('.terms-mobile-title')).toBeVisible();
  await expect(page.locator('.terms-mobile-back')).toBeVisible();
  await expect(page.getByRole('heading', { name: '1 Aceitação dos Termos' })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(391);
});
