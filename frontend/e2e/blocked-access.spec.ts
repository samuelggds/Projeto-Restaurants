import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const LOCAL_API = /^http:\/\/(127\.0\.0\.1|localhost):3000\/.*$/;
const PREVIEW_DIR = path.resolve('../output/preview-bloqueios');
// Deliberately not a Pix payment payload: preview images cannot initiate a payment.
const FAKE_PIX =
  'GASTRONEXA | PREVIA FICTICIA | NAO PAGAR | FATURA DE EXEMPLO 91 | DADOS SOMENTE PARA TESTE';

async function scenario(page: Page, role = 'ADMIN', reason = 'BILLING') {
  const state = {
    available: false,
    paid: false,
    generated: false,
    pixCalls: 0,
    paths: [] as string[],
  };
  const user = {
    id: 17,
    name: 'Pessoa de exemplo',
    role,
    restaurantId: 7,
    email: 'exemplo@restaurante.test',
  };
  const pix = {
    pixQrCode: FAKE_PIX,
    pixQrCodeBase64: 'iVBORw0KGgo=',
    pixExpiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
  };
  await page.route(LOCAL_API, async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    state.paths.push(pathname);
    let body: unknown = {};
    if (pathname === '/platform/status') body = { available: true, maintenanceMode: false };
    else if (pathname === '/auth/refresh')
      body = { accessToken: 'blocked-preview-token', userId: user.id };
    else if (pathname === '/auth/me') body = { user };
    else if (pathname === '/restaurants/7/availability')
      body = { restaurantId: 7, available: state.available };
    else if (pathname === '/billing/invoices')
      body = {
        invoices: [
          {
            id: 91,
            month: 8,
            year: 2026,
            monthlyFee: 249.9,
            systemFees: 0,
            total: 249.9,
            status: state.paid ? 'PAGO' : 'ATRASADO',
            dueDate: '2026-08-10T12:00:00Z',
            ...(state.generated ? pix : {}),
          },
        ],
        billing: { plan: 'PREMIUM', isPlanActive: state.available },
      };
    else if (pathname === '/billing/invoices/91/regenerate-link') {
      expect(route.request().method()).toBe('POST');
      state.pixCalls += 1;
      state.generated = true;
      body = pix;
    } else if (pathname === '/subscription')
      body = { plan: 'PREMIUM', status: state.paid ? 'ATIVA' : 'EXPIRADA' };
    else if (pathname === '/billing/plans') body = [{ plan: 'PREMIUM', name: 'Premium' }];
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });
  await page.addInitScript(
    ({ user, reason }) => {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem(
        'system_block_state',
        JSON.stringify({
          blocked: true,
          reason,
          restaurantId: 7,
          message: 'DETALHE FINANCEIRO PRIVADO',
          updatedAt: new Date().toISOString(),
        }),
      );
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: async (text: string) => {
            (window as unknown as { copiedPix: string }).copiedPix = text;
          },
        },
      });
    },
    { user, reason },
  );
  return state;
}

async function noOverflow(page: Page, width: number) {
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(width);
}

for (const audience of [
  {
    role: 'CLIENTE',
    name: 'cliente',
    title: 'Uma pausa no acesso ao restaurante.',
    data: 'customer',
  },
  {
    role: 'GARCOM',
    name: 'funcionario',
    title: 'O painel está indisponível no momento.',
    data: 'staff',
  },
]) {
  test(`bloqueio de ${audience.name} protege dados financeiros e se adapta ao celular`, async ({
    page,
  }) => {
    const state = await scenario(page, audience.role);
    await page.goto('/profile');
    await expect(page.getByTestId('availability-page')).toHaveAttribute(
      'data-audience',
      audience.data,
    );
    await expect(page.getByRole('heading', { name: audience.title })).toBeVisible();
    await expect(page.getByText('DETALHE FINANCEIRO PRIVADO')).toHaveCount(0);
    await mkdir(PREVIEW_DIR, { recursive: true });
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
      await page.evaluate(() => document.fonts.ready);
      await noOverflow(page, width);
      if (width === 390 || width === 1440)
        await page.screenshot({
          path: path.join(
            PREVIEW_DIR,
            `bloqueio-${audience.name}-${width === 390 ? 'mobile' : 'desktop'}.png`,
          ),
          fullPage: true,
          animations: 'disabled',
        });
    }
    expect(state.paths.some((entry) => entry.startsWith('/billing'))).toBe(false);
    await expect(page.getByRole('button', { name: 'Tentar novamente' })).toBeVisible();
  });
}

test('bloqueio manual do admin não oferece pagamento como desbloqueio', async ({ page }) => {
  const state = await scenario(page, 'ADMIN', 'MANUAL');
  await page.goto('/admin');
  await expect(page.getByTestId('availability-page')).toHaveAttribute('data-audience', 'admin');
  await expect(
    page.getByRole('heading', { name: 'O acesso ao restaurante está indisponível.' }),
  ).toBeVisible();
  await expect(page.getByText('Pague com Pix')).toHaveCount(0);
  expect(state.paths.some((entry) => entry.startsWith('/billing'))).toBe(false);
});

test('admin gera o Pix por escolha, copia o código e aguarda liberação confirmada', async ({
  page,
}) => {
  const state = await scenario(page);
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Regularize sua assinatura' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Gerar Pix da fatura' })).toBeVisible();
  expect(state.pixCalls).toBe(0);
  await page.getByRole('button', { name: 'Gerar Pix da fatura' }).click();
  await expect(
    page.getByRole('img', { name: 'QR Code Pix da fatura' }).locator('svg'),
  ).toBeVisible();
  expect(state.pixCalls).toBe(1);
  await page.getByRole('button', { name: 'Copiar código Pix' }).click();
  await expect(page.getByRole('button', { name: 'Código copiado' })).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { copiedPix: string }).copiedPix)).toBe(
    FAKE_PIX,
  );
  await page.reload();
  await expect(page.getByRole('button', { name: 'Copiar código Pix' })).toBeVisible();
  expect(state.pixCalls).toBe(1);
  await mkdir(PREVIEW_DIR, { recursive: true });
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
    await page.evaluate(() => document.fonts.ready);
    await noOverflow(page, width);
    if (width === 390 || width === 1440)
      await page.screenshot({
        path: path.join(PREVIEW_DIR, `bloqueio-admin-${width === 390 ? 'mobile' : 'desktop'}.png`),
        fullPage: true,
        animations: 'disabled',
      });
  }
  expect(state.paths).not.toContain('/orders');
  expect(state.paths).not.toContain('/products');
  state.paid = true;
  await page.getByRole('button', { name: 'Verificar pagamento', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Conferindo a regularização' })).toBeVisible();
  await expect(
    page.getByText('A cobrança foi atualizada. Estamos aguardando a liberação do restaurante.'),
  ).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('system_block_state'))).not.toBeNull();
  state.available = true;
  await page.getByRole('button', { name: 'Verificar pagamento', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Regularize sua assinatura' })).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('system_block_state'))).toBeNull();
});

test('Pix continua utilizável sem detalhes do plano e com cópia manual', async ({ page }) => {
  await scenario(page);
  await page.route('**/billing/plans', (route) =>
    route.fulfill({ status: 500, contentType: 'application/json', body: '{}' }),
  );
  await page.route('**/subscription', (route) =>
    route.fulfill({ status: 500, contentType: 'application/json', body: '{}' }),
  );
  await page.goto('/admin');
  await page.getByRole('button', { name: 'Gerar Pix da fatura' }).click();
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async () => {
          throw new Error('denied');
        },
      },
    });
  });
  await page.getByRole('button', { name: 'Copiar código Pix' }).click();
  await expect(page.getByLabel('Código Pix copia e cola')).toBeVisible();
  await expect(page.getByLabel('Código Pix copia e cola')).toHaveValue(FAKE_PIX);
  await expect(page.getByText('Selecione e copie o código abaixo manualmente.')).toBeVisible();
});
