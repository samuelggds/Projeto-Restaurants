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
                    features: [
                      'Sistema de delivery',
                      'Cadastro inicial de até 50 produtos, além de categorias, combos, banners e configurações',
                      'Suporte padrão',
                      'Ganhe de graça uma máquina térmica de 58mm após o pagamento da primeira mensalidade',
                      'Entregas com motoboys parceiros - Em breve',
                    ],
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
    await expect(page.locator('header').first()).toContainText('Gastro');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Seu restaurante',
    );

    const heroImage = page.locator('.desktop-device').first();
    await expect(heroImage).toBeVisible();

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

test('formulário comercial está disponível imediatamente na capa', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  const hero = page.locator('#inicio');
  const form = hero.getByRole('form', { name: 'Contato comercial' });
  await expect(form).toBeVisible();
  await expect(page.getByRole('form', { name: 'Contato comercial' })).toHaveCount(1);
  await expect(hero.getByText('Pedido recebido!')).toBeVisible();
  await expect(page.locator('header .brand-name')).toContainText('Gastro');
});

test('menu mobile representa a navegação comercial atual', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const navigation = page.getByRole('navigation', { name: 'Navegação' });
  const openMenu = page.getByRole('button', { name: 'Abrir menu', exact: true });

  await expect(navigation).toBeHidden();
  await openMenu.click();
  await expect(navigation).toBeVisible();

  for (const [label, anchor] of [
    ['Funcionalidades', '#funcionalidades'],
    ['A plataforma', '#plataforma'],
    ['Como funciona', '#como-funciona'],
    ['Planos', '#planos'],
  ]) {
    if (!(await navigation.isVisible())) await openMenu.click();
    const link = navigation.getByRole('link', { name: label, exact: true });
    await expect(link).toHaveAttribute('href', anchor);
    await link.click();
    await expect(page).toHaveURL(new RegExp(`${anchor}$`));
    await expect(navigation).toBeHidden();
  }
});

test('planos utilizam catálogo público real e selecionam interesse',async ({page})=>{
 await page.goto('/');
 const section=page.locator('#planos');
 await expect(section.getByRole('heading',{name:'Básico'})).toBeVisible();
 await expect(section.getByRole('heading',{name:'Premium'})).toBeVisible();
 await expect(section.getByRole('heading',{name:'Gestão Total'})).toBeVisible();
 await expect(section).toContainText('99,90');
 await expect(section).toContainText('199,90');
 await expect(section).toContainText('299,90');
 await section.getByRole('link',{name:/Quero o Premium/}).click();
 await expect(page.getByRole('form',{name:'Contato comercial'}).getByLabel('Plano de interesse')).toHaveValue('PREMIUM');
});

test('galeria, implantação e benefícios aprovados são exibidos',async ({page})=>{
 await page.goto('/');
 await expect(page.locator('#apresentacao')).toContainText('Tudo conectado');
 await expect(page.locator('#funcionalidades')).toContainText('Menos complicação');
 await expect(page.locator('#como-funciona')).toContainText('deixar tudo pronto');
 await expect(page.locator('#plataforma')).toBeVisible();
 await expect(page.locator('.official-gx').first()).toBeVisible();
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
  await page.getByRole('link', { name: /Quero o Premium/ }).click();
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


test('impressora térmica da oferta apresenta corpo, bobina e saída no desktop e mobile', async ({ page }) => {
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const printer = page.locator('.offer .printer-illustration');
    const body = printer.locator('.printer-body');
    await expect(printer).toBeVisible();
    await expect(body).toBeVisible();
    await expect(printer.locator('.printer-paper')).toBeVisible();
    await expect(printer.locator('.printer-led')).toBeVisible();
    await expect(printer.locator('.printer-58mm')).toContainText('58 mm');
    const bodyWidth = await body.evaluate((element) => element.getBoundingClientRect().width);
    expect(bodyWidth).toBeGreaterThan(150);
    const bg = await body.evaluate((element) => getComputedStyle(element).backgroundImage);
    expect(bg).toContain('gradient');
  }
});
