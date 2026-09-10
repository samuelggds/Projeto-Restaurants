import { expectWorkspaceWidth } from './helpers/workspaceLayout';
import { expect, test } from '@playwright/test';
import { createInitialDemoState, DEMO_STORAGE_KEY } from '../src/pages/Marketing/demo/demoDomain';
import { captureReadmeScreenshot } from './helpers/readmeScreenshot';

test('demo: administrador real abre todas as configurações sem API nem sessão real', async ({
  page,
}) => {
  test.setTimeout(90000);
  const requests: string[] = [];
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.port === '3000' || url.pathname.startsWith('/api/')) {
      if (url.pathname.endsWith('/auth/refresh')) return route.fulfill({ status: 401, json: {} });
      if (url.pathname.endsWith('/platform/status'))
        return route.fulfill({ json: { available: true } });
      requests.push(route.request().method() + ' ' + url.pathname);
      return route.abort();
    }
    return route.continue();
  });
  await page.addInitScript(
    ({ key, state }) => {
      localStorage.setItem(key, JSON.stringify(state));
      sessionStorage.setItem('gastronexa:demo:account', 'demo-admin');
      // A demo must never change or copy these production storage entries.
      localStorage.setItem(
        'user',
        JSON.stringify({ id: 888, name: 'Preservar', restaurantId: 888 }),
      );
      localStorage.setItem('private-test-key', 'preservar');
    },
    { key: DEMO_STORAGE_KEY, state: createInitialDemoState() },
  );
  await page.goto('/demonstracao');
  const admin = page.frameLocator('iframe[title="Painel administrativo demonstrativo"]');
  await expect(admin.getByRole('heading', { name: /Visão geral/ }).first()).toBeVisible();
  await captureReadmeScreenshot(page, 'demo-admin-overview.png');
  await admin.getByRole('button', { name: 'Configurações', exact: true }).first().click();
  for (const [key, label] of [
    ['business', 'Dados do negócio'],
    ['address', 'Endereço'],
    ['hours', 'Horários'],
    ['orders', 'Pedidos'],
    ['promotions', 'Descontos e fidelidade'],
    ['delivery', 'Delivery e retirada'],
    ['table', 'Cardápio de mesa'],
    ['table-account', 'Conta e pagamento da mesa'],
    ['whatsapp', 'WhatsApp'],
    ['printing', 'Impressora da cozinha'],
    ['employee-payments', 'Pagamento dos funcionários'],
    ['courier-payments', 'Pagamento dos motoqueiros'],
    ['payments', 'Pagamentos'],
    ['social', 'Redes sociais'],
    ['appearance', 'Aparência e SEO'],
    ['security', 'Equipe e segurança'],
  ]) {
    await admin
      .getByRole('button', { name: `${label} ›`, exact: true })
      .last()
      .click();
    await expect(admin.locator(`[data-settings-section="${key}"]`)).toBeVisible();
    await expect(admin.locator(`[data-settings-section="${key}"]`)).not.toContainText(
      'Não foi possível carregar',
    );
  }
  await admin.getByRole('button', { name: 'Marca e identidade ›', exact: true }).click();
  await captureReadmeScreenshot(page, 'demo-admin-settings.png');
  await admin
    .getByLabel('Nome do restaurante', { exact: true })
    .fill('Restaurante da apresentação');
  await admin.getByRole('button', { name: 'Dados do negócio ›', exact: true }).click();
  await admin.getByRole('button', { name: 'Salvar alterações', exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem('gastronexa:demo:admin:v1') ?? '{}').settings
            ?.restaurantName,
      ),
    )
    .toBe('Restaurante da apresentação');
  expect(requests).toEqual([]);
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => localStorage.getItem('private-test-key'))).toBe('preservar');
  const frame = page.frames().find((item) => item.url().includes('demo-admin.html'))!;
  expect(await frame.evaluate(() => localStorage.getItem('user'))).toBeNull();
  await expect(frame.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveAttribute(
    'content',
    /connect-src 'none'/,
  );
  await admin.getByRole('button', { name: 'Ver loja', exact: true }).click();
  await expect(page.getByRole('banner')).toContainText('Restaurante da apresentação');
});

test('demo: home usa imagens locais, logo nova e layout responsivo', async ({ page }) => {
  await page.route(/:3000\//, (route) => route.fulfill({ status: 401, json: {} }));
  await page.addInitScript(
    ({ key, state }) => {
      localStorage.setItem(key, JSON.stringify(state));
      sessionStorage.setItem('gastronexa:demo:account', 'demo-cliente');
    },
    { key: DEMO_STORAGE_KEY, state: createInitialDemoState() },
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/demonstracao');
  await expect(page.getByRole('heading', { name: 'Ofertas em destaque' })).toBeVisible();
  await expect(page.getByRole('banner')).toHaveCount(1);
  await expect
    .poll(() =>
      page
        .locator('img')
        .evaluateAll((images) =>
          images
            .filter(
              (image) =>
                (image as HTMLImageElement).complete &&
                (image as HTMLImageElement).naturalWidth === 0,
            )
            .map((image) => image.getAttribute('src')),
        ),
    )
    .toEqual([]);
  await captureReadmeScreenshot(page, 'demo-customer-desktop.png');
  await page.setViewportSize({ width: 390, height: 844 });
  await captureReadmeScreenshot(page, 'demo-customer-mobile.png');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page
    .getByRole('button', { name: /Pesquisar|Buscar/ })
    .first()
    .click();
  await expect(page.getByRole('dialog')).toBeVisible();
});

test('demo: quatro funções abrem no celular com navegação visível e sem APIs reais', async ({
  page,
}) => {
  const unexpected: string[] = [];
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route(/:3000\/|\/api\//, (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/auth/refresh')) return route.fulfill({ status: 401, json: {} });
    if (path.endsWith('/platform/status')) return route.fulfill({ json: { available: true } });
    unexpected.push(path);
    return route.abort();
  });
  await page.addInitScript(
    ({ key, state }) => {
      localStorage.setItem(key, JSON.stringify(state));
      sessionStorage.setItem('gastronexa:demo:account', 'demo-cozinha');
    },
    { key: DEMO_STORAGE_KEY, state: createInitialDemoState() },
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/demonstracao');
  for (const [role, name] of [
    ['COZINHA', 'cozinha'],
    ['GARCOM', 'garçom'],
    ['MOTOQUEIRO', 'motoqueiro'],
    ['ATENDENTE', 'atendente'],
  ]) {
    const dock = page.locator('details').filter({ hasText: 'Restaurante fictício.' });
    await dock.locator('summary').click();
    await dock.getByLabel('Ver demonstração como').selectOption(role);
    await dock.locator('summary').click();
    await expect(
      page.getByRole('navigation', {
        name: `Navegação móvel ${role === 'COZINHA' ? 'da' : 'do'} ${name}`,
        exact: true,
      }),
    ).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
      role,
    ).toBeLessThanOrEqual(1);
    await captureReadmeScreenshot(page, `demo-${role.toLowerCase()}-mobile.png`);
  }
  expect(unexpected).toEqual([]);
  expect(errors).toEqual([]);
});

test('demo: menu de perfis cabe na caixa e painéis expandem ao recolher a navegação', async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.route(/:3000\//, (route) => route.fulfill({ status: 401, json: {} }));
  await page.addInitScript(
    ({ key, state }) => {
      localStorage.setItem(key, JSON.stringify(state));
      sessionStorage.setItem('gastronexa:demo:account', 'demo-cliente');
      sessionStorage.setItem('gastronexa:demo:customer-view', 'QR');
    },
    { key: DEMO_STORAGE_KEY, state: createInitialDemoState() },
  );
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto('/demonstracao');
  const dock = page.locator('details').filter({ hasText: 'Restaurante fictício.' });
  await dock.locator('summary').click();
  await expect(dock.getByLabel('Ver demonstração como')).toHaveValue('CLIENTE_QR');
  for (const width of [1920, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await dock.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        return [...element.querySelectorAll('p, select, button')].every((child) => {
          const rect = child.getBoundingClientRect();
          return (
            rect.left >= bounds.left && rect.right <= bounds.right && bounds.right <= innerWidth
          );
        });
      }),
    ).toBe(true);
  }
  await captureReadmeScreenshot(page, 'demo-controls-mobile.png');
  await page.setViewportSize({ width: 1440, height: 960 });
  await dock.locator('summary').click();
  for (const [role, collapse, expand, left] of [
    ['COZINHA', 'Recolher menu lateral', 'Expandir menu lateral', 232],
    ['GARCOM', 'Recolher menu', 'Expandir menu', 244],
    ['MOTOQUEIRO', 'Recolher navegação', 'Expandir navegação', 252],
    ['ADMIN', 'Recolher menu lateral', 'Expandir menu lateral', 236],
  ] as const) {
    await dock.locator('summary').click();
    await dock.getByLabel('Ver demonstração como').selectOption(role);
    await dock.locator('summary').click();
    const scope =
      role === 'ADMIN'
        ? page.frameLocator('iframe[title="Painel administrativo demonstrativo"]')
        : page;
    const main = scope.getByRole('main').first();
    await expectWorkspaceWidth(main, left);
    await scope.getByRole('button', { name: collapse, exact: true }).click();
    await expectWorkspaceWidth(main, 0);
    await scope.getByRole('button', { name: expand, exact: true }).click();
    await expectWorkspaceWidth(main, left);
  }
});
