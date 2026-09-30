import { expect, test, type Page } from '@playwright/test';

const MOBILE_WIDTHS = [320, 360, 440] as const;
const SCENARIOS = [
  ['PIX aguardando', 'pix-waiting'],
  ['PIX aprovado', 'pix-paid'],
  ['PIX recusado', 'pix-failed'],
  ['Cartão aguardando', 'card-waiting'],
  ['Cartão aprovado', 'card-paid'],
  ['Cartão recusado', 'card-failed'],
  ['Cartão cancelado', 'card-canceled'],
  ['Cartão expirado', 'card-expired'],
  ['Cartão estornado', 'card-refunded'],
  ['Acompanhar pedido (GPS)', 'tracking'],
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


test('cartão preto compartilhado aparece também no desktop sem o mini-card legado', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/__dev/pagamentos');
  await page.getByRole('button', { name: 'Cartão aguardando', exact: true }).click();

  await expect(page.locator('[data-payment-method="card"] [data-testid="payment-card-visual"]')).toBeVisible();
  await expect(page.locator('[data-payment-method="card"] .card-waves')).toBeVisible();
  await expect(page.locator('[data-payment-method="card"] .contactless-icon')).toBeVisible();
  await expect(page.locator('[data-payment-method="card"] .mini-card')).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
});

test('estado recusado é diferente de cancelado no laboratório', async ({ page }) => {
  await page.setViewportSize({ width: 440, height: 956 });
  await page.goto('/__dev/pagamentos');

  await page.getByRole('button', { name: 'Cartão recusado', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Pagamento recusado' })).toBeVisible();

  await page.getByRole('button', { name: 'Cartão cancelado', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Pagamento cancelado' })).toBeVisible();
});


test('rastreamento fictício mostra o mapa local e move o motoqueiro na rota', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/__dev/pagamentos');
  await page.getByRole('button', { name: 'Acompanhar pedido (GPS)', exact: true }).click();

  const lab = page.locator('[data-testid="delivery-tracking-visual-lab"]');
  await expect(lab).toBeVisible();
  await expect(lab).toHaveAttribute('data-map-source', 'fictitious-google-style');
  await expect(lab).toHaveAttribute('data-animation-duration-ms', '60000');
  await expect(page.getByText('Início', { exact: true })).toBeVisible();
  await expect(page.getByText('Acompanhar pedido', { exact: true })).toBeVisible();
  await expect(page.getByText('Eduardo Silva', { exact: true })).toBeVisible();
  await expect(page.getByText('(00) 00000-0000', { exact: true })).toBeVisible();
  await expect(page.getByText('Olá, Entrar', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Meu Carrinho', { exact: true })).toHaveCount(0);

  const map = page.locator('[data-testid="visual-fictitious-map"]');
  const marker = page.locator('[data-testid="visual-courier-marker"]');
  await expect(map).toBeVisible();
  await expect(marker).toBeVisible();

  const initialProgress = await map.getAttribute('data-courier-progress');
  await page.waitForTimeout(1_200);
  const movedProgress = await map.getAttribute('data-courier-progress');

  expect(movedProgress).not.toBe(initialProgress);
  await expectNoHorizontalOverflow(page);
});
