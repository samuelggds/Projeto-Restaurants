import { expect, test as base } from '@playwright/test';
import { captureReadmeScreenshot } from './helpers/readmeScreenshot';

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
          if (pathname === '/platform/plans' && method === 'GET') {
            return route.fulfill({
              json: {
                plans: [
                  {
                    code: 'BASICO',
                    name: 'Básico',
                    description: 'Operação de delivery para restaurantes que estão iniciando na plataforma.',
                    monthlyFee: 99.9,
                    trialDays: 7,
                    features: ['Sistema de delivery', 'Suporte padrão'],
                    featured: false,
                  },
                  {
                    code: 'PREMIUM',
                    name: 'Premium',
                    description: 'Experiência completa com delivery e atendimento por QR Code de mesa.',
                    monthlyFee: 199.9,
                    trialDays: 15,
                    features: [
                      'Sistema de delivery',
                      'Cardápio digital com QR Code de mesa',
                      'Suporte prioritário',
                    ],
                    featured: false,
                  },
                  {
                    code: 'GESTAO_TOTAL',
                    name: 'Gestão Total',
                    description:
                      'Tudo do Premium com gestão contínua sob solicitação da equipe GastroNexa.',
                    monthlyFee: 299.9,
                    trialDays: 15,
                    features: [
                      'Tudo do Plano Premium',
                      'Implantação inicial assistida',
                      'Gestão assistida contínua sob solicitação',
                    ],
                    featured: true,
                  },
                ],
              },
            });
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
  test(`landing oficial sem overflow horizontal em ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(page.locator('header').first()).toContainText('GastroNexa');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Seu restaurante vende mais. Sua operação fica mais simples.',
    );

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

test('menu mobile representa a navegação do novo Figma', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const navigation = page.getByRole('navigation', { name: 'Navegação principal' });
  const openMenu = page.getByRole('button', { name: 'Abrir menu', exact: true });

  await expect(navigation).toBeHidden();
  await openMenu.click();
  await expect(navigation).toBeVisible();

  for (const [label, anchor] of [
    ['Soluções', '#solucoes'],
    ['Para redes', '#redes'],
    ['Como funciona', '#como-funciona'],
    ['Recursos', '#recursos'],
    ['Dúvidas', '#duvidas'],
  ]) {
    if (!(await navigation.isVisible())) await openMenu.click();
    const link = navigation.getByRole('link', { name: label, exact: true });
    await expect(link).toHaveAttribute('href', anchor);
    await link.click();
    await expect(page).toHaveURL(new RegExp(`${anchor}$`));
    await expect(navigation).toBeHidden();
  }
});

test('planos preservam catálogo público e levam ao formulário', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');

  const plans = page.locator('#planos');
  await expect(plans.getByRole('heading', { name: 'Premium', exact: true })).toBeVisible();
  await expect(plans.getByRole('heading', { name: 'Básico', exact: true })).toBeVisible();
  await expect(plans.getByRole('heading', { name: 'Gestão Total', exact: true })).toBeVisible();
  await expect(plans).toContainText('299,90');
  await expect(plans).toContainText('199,90');
  await expect(plans).toContainText('99,90');
  await expect(plans).toContainText('15 dias de teste');
  await expect(plans).toContainText('7 dias de teste');

  const planHeadings = plans.locator('article h3');
  await expect(planHeadings).toHaveText(['Básico', 'Premium', 'Gestão Total']);

  const links = plans.getByRole('link', { name: /Quero o/ });
  await expect(links).toHaveCount(3);
  for (const link of await links.all()) await expect(link).toHaveAttribute('href', '#contato');
});

test('FAQ é acessível por teclado e mantém as respostas do novo layout', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');

  const faq = page.locator('#duvidas');
  await expect(faq.getByText('Antes de conversar, vale esclarecer.')).toBeVisible();
  const second = faq.locator('details').nth(1);
  const summary = second.locator('summary');
  await expect(second).not.toHaveAttribute('open', '');
  await summary.focus();
  await page.keyboard.press('Enter');
  await expect(second).toHaveAttribute('open', '');
  await expect(second.locator('p')).toBeVisible();
});

test('galeria usa assets locais do produto e seção multi-tenant está presente', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');

  const product = page.locator('#produto');
  await expect(product.getByText('Pedido personalizado', { exact: true })).toBeVisible();
  for (const image of await product.locator('figure img').all()) {
    await expect(image).toHaveAttribute('src', /^\/marketing-v3\//);
    await expect.poll(() => image.evaluate((node) => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  }

  const networks = page.locator('#redes');
  await expect(networks).toContainText('Uma estrutura para a rede.');
  await expect(networks).toContainText('Cada unidade com cardápio, horários e disponibilidade próprios.');
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
  await form.getByLabel('Seu nome', { exact: true }).fill('Joana Silva');
  await form.getByLabel('Nome do restaurante', { exact: true }).fill('Bistrô Teste');
  await form.getByLabel('E-mail', { exact: false }).fill('joana@example.test');
  await form.getByLabel('Telefone com DDD').fill('(11) 99999-8888');
  await form.getByLabel('Cidade', { exact: true }).fill('São Paulo');
  await form.getByLabel('Estado', { exact: true }).selectOption('SP');
  await form.getByLabel('Tipo de negócio', { exact: true }).selectOption('Restaurante');
  await form.getByLabel('Delivery', { exact: true }).check();
  await form.getByLabel(/Concordo que a GastroNexa/).check();

  const submit = form.getByRole('button', { name: 'Solicitar minha demonstração' });
  await submit.click();
  await expect(form.getByRole('alert')).toContainText('Não foi possível confirmar');
  await expect(form.getByLabel('Nome do restaurante', { exact: true })).toHaveValue('Bistrô Teste');
  await submit.click();
  await expect(page.getByRole('status').filter({ hasText: 'Recebemos seu contato.' })).toBeVisible();

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

test('logo GX preserva transparência real na landing e no favicon', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('header img[src="/gastronexa-logo.svg"]')).toBeVisible();
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', '/gastronexa-logo.svg');
  const pixels = await page.evaluate(async () => {
    const logo = document.querySelector<HTMLImageElement>('header img[src="/gastronexa-logo.svg"]')!;
    await logo.decode();
    const canvas = document.createElement('canvas');
    canvas.width = logo.naturalWidth;
    canvas.height = logo.naturalHeight;
    const context = canvas.getContext('2d')!;
    context.drawImage(logo, 0, 0);
    const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let transparent = 0;
    let opaque = 0;
    let matte = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] === 0) transparent++;
      if (data[i + 3] >= 250) opaque++;
      if (data[i + 3] > 0 && data[i] > 10) matte++;
    }
    return { transparent, opaque, matte, cornerAlpha: data[3] };
  });
  expect(pixels.cornerAlpha).toBe(0);
  expect(pixels.transparent).toBeGreaterThan(20000);
  expect(pixels.opaque).toBeGreaterThan(5000);
  expect(pixels.matte).toBe(0);
});
