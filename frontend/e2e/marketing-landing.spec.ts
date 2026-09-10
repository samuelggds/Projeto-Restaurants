import { expect, test as base } from '@playwright/test';
import { captureReadmeScreenshot } from './helpers/readmeScreenshot';

// Public-page checks remain isolated from the real restaurant API.
const test = base.extend<{ apiIsolation: void }>({
  apiIsolation: [
    async ({ page, baseURL }, use) => {
      const unexpected: string[] = [];
      const applicationOrigin = new URL(baseURL!).origin;
      await page.route('**/*', async (route) => {
        const request = route.request();
        const url = new URL(request.url());
        const method = request.method();
        const isApi =
          (['localhost', '127.0.0.1'].includes(url.hostname) && url.port === '3000') ||
          (url.origin === applicationOrigin && url.pathname.startsWith('/api/'));
        const pathname = url.pathname.replace(/^\/api(?=\/)/, '');

        if (isApi) {
          if (pathname === '/platform/status' && method === 'GET') {
            return route.fulfill({ json: { available: true, maintenanceMode: false } });
          }
          if (pathname === '/auth/refresh' && method === 'POST') {
            return route.fulfill({ status: 401, json: { error: 'Não autenticado.' } });
          }
          if (method === 'OPTIONS') return route.fulfill({ status: 204 });
          unexpected.push(`${method} ${url.pathname}`);
          return route.fulfill({ status: 418, json: { error: 'API real bloqueada no teste.' } });
        }
        if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
          unexpected.push(`${method} ${url.origin}${url.pathname}`);
          return route.abort('blockedbyclient');
        }
        return route.continue();
      });
      await use();
      expect(unexpected, 'A landing page não deve acessar operações reais.').toEqual([]);
    },
    { auto: true },
  ],
});

for (const viewport of [
  { width: 320, height: 568 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 1000 },
]) {
  test(`landing sem overflow horizontal em ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(page.locator('header').first()).toContainText('GastroNexa');
    const heroImage = page.getByTestId('marketing-hero-image');
    await expect(heroImage).toBeVisible();
    await expect(heroImage).toHaveAttribute('src', /^\/(?!\/)/);
    await expect
      .poll(() =>
        heroImage.evaluate((element) => {
          const image = element as HTMLImageElement;
          return image.complete && image.naturalWidth > 0;
        }),
      )
      .toBe(true);
    await page.evaluate(() => document.fonts.ready);

    const dimensions = await page.evaluate(() => ({
      viewport: window.innerWidth,
      document: document.documentElement.scrollWidth,
      body: document.body.scrollWidth,
    }));
    expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);
    expect(dimensions.body).toBeLessThanOrEqual(dimensions.viewport);

    if (viewport.width === 1440 || viewport.width === 390) {
      await captureReadmeScreenshot(
        page,
        viewport.width === 1440 ? 'marketing-desktop.png' : 'marketing-mobile.png',
        { fullPage: true },
      );
    }
  });
}

test('menu mobile abre, fecha e navega pelas seções e demonstração', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const navigation = page.getByRole('navigation', { name: 'Navegação principal' });
  const openMenu = page.getByRole('button', { name: 'Abrir menu', exact: true });
  const closeMenu = page.getByRole('button', { name: 'Fechar menu', exact: true });

  await expect(navigation).toBeHidden();
  await expect(openMenu).toHaveAttribute('aria-expanded', 'false');
  await openMenu.click();
  await expect(navigation).toBeVisible();
  await expect(closeMenu).toHaveAttribute('aria-expanded', 'true');
  await closeMenu.click();
  await expect(navigation).toBeHidden();
  await openMenu.click();
  await page.keyboard.press('Escape');
  await expect(navigation).toBeHidden();

  for (const [label, anchor] of [
    ['Recursos', '#recursos'],
    ['Como funciona', '#como-funciona'],
    ['Planos', '#planos'],
    ['Contato', '#contato'],
  ]) {
    await openMenu.click();
    const link = navigation.getByRole('link', { name: label, exact: true });
    await expect(link).toHaveAttribute('href', anchor);
    await link.click();
    await expect(page).toHaveURL(new RegExp(`${anchor}$`));
    await expect(navigation).toBeHidden();
    await expect(page.locator(anchor)).toBeInViewport();
  }

  await openMenu.click();
  const demoLink = navigation.getByRole('link', { name: 'Demonstração', exact: true });
  await expect(demoLink).toHaveAttribute('href', '/demonstracao');
  await demoLink.click();
  await expect(page).toHaveURL(/\/demonstracao$/);
});

test('planos preservam preços, teste e destino comercial; FAQ funciona por teclado', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  const plans = page.locator('#planos');
  await expect(plans.getByRole('heading', { name: 'Básico', exact: true })).toBeVisible();
  await expect(plans.getByRole('heading', { name: 'Premium', exact: true })).toBeVisible();
  await expect(plans).toContainText('149,90');
  await expect(plans).toContainText('249,90');
  await expect(plans).toContainText('30 dias de teste');

  const contactLink = page
    .locator('header')
    .first()
    .getByRole('link', { name: /Falar com/ });
  const salesHref = await contactLink.getAttribute('href');
  expect(salesHref).toBeTruthy();
  const planLinks = plans.locator('article').getByRole('link');
  await expect(planLinks).toHaveCount(2);
  for (const link of await planLinks.all()) {
    await expect(link).toHaveAttribute('href', salesHref!);
  }

  const firstAnswer = page.locator('#duvidas details').first();
  const summary = firstAnswer.locator('summary');
  await expect(summary).toBeVisible();
  await expect(firstAnswer).not.toHaveAttribute('open', '');
  await summary.focus();
  await page.keyboard.press('Enter');
  await expect(firstAnswer).toHaveAttribute('open', '');
  await expect(firstAnswer.locator('p')).toBeVisible();
  await summary.click();
  await expect(firstAnswer).not.toHaveAttribute('open', '');
  await expect(firstAnswer.locator('p')).toBeHidden();
});

test('abas mostram a prévia de cada área da operação', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  const workflow = page.locator('#como-funciona');
  const panel = workflow.getByRole('tabpanel');
  await expect(workflow.getByRole('tab', { name: 'Gestão', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(panel).toBeVisible();

  for (const name of ['Cozinha', 'Salão', 'Delivery', 'Gestão']) {
    const previousContent = await panel.innerText();
    const tab = workflow.getByRole('tab', { name, exact: true });
    await tab.click();
    await expect(tab).toHaveAttribute('aria-selected', 'true');
    await expect(workflow.getByRole('tab', { selected: true })).toHaveCount(1);
    await expect(panel).toBeVisible();
    await expect(panel).not.toHaveText(previousContent);
  }
});

test('formulário preserva dados após falha, repete a chave e confirma recebimento', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const requests: { key: string; body: Record<string, unknown> }[] = [];
  await page.route('**/sales-leads', async (route) => {
    const request = route.request();
    expect(request.headers().authorization).toBeUndefined();
    requests.push({ key: request.headers()['idempotency-key'], body: request.postDataJSON() });
    await route.fulfill(
      requests.length === 1
        ? { status: 503, json: { error: 'Indisponível' } }
        : { status: 201, json: { received: true, id: 'fake-lead', emailStatus: 'PENDING' } },
    );
  });
  await page.goto('/');
  await page.getByRole('link', { name: 'Quero o Premium', exact: true }).click();
  const form = page.getByRole('form', { name: 'Contato comercial' });
  await expect(form.getByLabel('Plano de interesse')).toHaveValue('PREMIUM');
  await form.getByLabel('Seu nome', { exact: false }).fill('Joana Silva');
  await form.getByLabel('Nome do restaurante').fill('Bistrô Teste');
  await form.getByLabel('Plano de interesse').selectOption('BASICO');
  await expect(form.getByLabel('Plano de interesse')).toHaveValue('BASICO');
  await page.getByRole('link', { name: 'Quero o Premium', exact: true }).click();
  await expect(form.getByLabel('Plano de interesse')).toHaveValue('PREMIUM');
  await expect(form.getByLabel('Nome do restaurante')).toHaveValue('Bistrô Teste');
  await form.getByLabel('E-mail', { exact: false }).fill('joana@example.test');
  await form.getByLabel('Telefone com DDD').fill('(11) 99999-8888');
  await form.getByLabel('Cidade').fill('São Paulo');
  await form.getByLabel('Estado').selectOption('SP');
  await form.getByLabel('Tipo de negócio').selectOption('Restaurante');
  await form.getByLabel('Delivery', { exact: true }).check();
  await form.getByLabel(/Concordo que a GastroNexa/).check();
  await form.getByRole('button', { name: 'Quero conhecer a GastroNexa' }).click();
  await expect(form.getByRole('alert')).toContainText('Não foi possível confirmar');
  await expect(form.getByLabel('Nome do restaurante')).toHaveValue('Bistrô Teste');
  await form.getByRole('button', { name: 'Quero conhecer a GastroNexa' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Recebemos seu contato.' }),
  ).toBeVisible();
  expect(requests).toHaveLength(2);
  expect(requests[0]).toEqual(requests[1]);
  expect(requests[0].key).toMatch(/^[0-9a-f-]{36}$/);
  expect(requests[0].body).toMatchObject({
    planInterest: 'PREMIUM',
    phone: '11999998888',
    consent: true,
    channels: ['DELIVERY'],
  });
});

for (const width of [320, 390, 900, 1440]) {
  test(`entrada da demonstração acompanha a marca e mantém acessos em ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/demonstracao');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Um restaurante inteiro.');
    await expect(page.getByRole('button', { name: 'Entrar nesta área', exact: true })).toHaveCount(
      3,
    );
    await expect(
      page.getByRole('button', { name: 'Cardápio da mesa (QR Code)', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Reiniciar cenário', exact: true }),
    ).toHaveAccessibleName('Reiniciar cenário');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.evaluate(() => document.fonts.ready);
    if (width === 390 || width === 1440)
      await captureReadmeScreenshot(page, `demo-entry-${width}.png`, { fullPage: true });
    await page.getByRole('button', { name: 'Cardápio da mesa (QR Code)', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Bem-vindo de volta!' })).toBeVisible();
  });
}

test('primeira dobra da nova marca no desktop e celular', async ({ page }) => {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    const failures: string[] = [];
    page.on('pageerror', (error) => failures.push(error.message));
    await page.goto('/');
    await expect(page.getByTestId('marketing-hero-image')).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await captureReadmeScreenshot(page, `marketing-hero-${width}.png`);
    expect(failures).toEqual([]);
  }
});
