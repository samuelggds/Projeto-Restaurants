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

        const readsDemoData = ['xhr', 'fetch', 'eventsource', 'ping'].includes(request.resourceType());
        if ((readsDemoData || isApi || url.origin !== applicationOrigin || method !== 'GET') && request.frame().parentFrame()) {
          unexpected.push('Vitrine: ' + method + ' ' + url.origin + url.pathname);
          return route.abort('blockedbyclient');
        }
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
                    name: 'Entrada',
                    description: 'Delivery e QR Code',
                    monthlyFee: 79.9,
                    trialDays: 7,
                    features: [
                      'Sistema de delivery',
                      'Cardápio digital com QR Code de mesa',
                      'Cadastro inicial de até 50 produtos, além de categorias, combos, banners e configurações',
                      'Suporte padrão',
                      'Ganhe de graça uma máquina térmica de 58mm após o pagamento da primeira mensalidade',
                      'Entregas com motoboys parceiros - Em breve',
                    ],
                    featured: false,
                  },
                  {
                    code: 'PREMIUM',
                    name: 'Avançado',
                    description: 'Gestão assistida e recursos avançados',
                    monthlyFee: 149.9,
                    trialDays: 15,
                    features: [
                      'Sistema de delivery',
                      'Cardápio digital com QR Code de mesa',
                      'Suporte prioritário',
                      'Gestão assistida contínua sob solicitação',
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

    const heroImage = page.getByRole('img', { name: 'Pizza, hambúrguer, açaí e um prato feito brasileiro.' });
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
    ['Cardápios', '#vitrines'],
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
 await expect(section.getByRole('heading',{name:'Entrada'})).toBeVisible();
 await expect(section.getByRole('heading',{name:'Avançado'})).toBeVisible();
 await expect(section.getByRole('heading',{name:'Gestão Total'})).toHaveCount(0);
 await expect(section).toContainText('79,90');
 await expect(section).toContainText('149,90');
 await expect(section).toContainText('Cardápio digital com QR Code de mesa');
 await expect(section).toContainText('Gestão assistida contínua');
 await section.getByRole('link',{name:/Quero o Avançado/}).click();
 await expect(page.getByRole('form',{name:'Contato comercial'}).getByLabel('Plano de interesse')).toHaveValue('PREMIUM');
});

test('galeria, implantação e benefícios aprovados são exibidos',async ({page})=>{
 await page.goto('/');
 await expect(page.locator('#apresentacao')).toContainText('Quatro painéis');
 await expect(page.locator('#funcionalidades')).toContainText('Menos complicação');
 await expect(page.locator('#como-funciona')).toContainText('deixar tudo pronto');
 await expect(page.locator('#plataforma')).toBeVisible();
 await expect(page.locator('.official-gx').first()).toBeVisible();
});

test('cada vitrine abre o cardápio correto e a equipe troca de painel', async ({ page }) => {
  test.slow();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  for (const [name, product] of [
    ['Forno Alto', 'Margherita da casa'],
    ['Braseiro Burger', 'Brasa Bacon'],
    ['Açaí da Mata', 'Açaí com frutas'],
    ['Sálvia Trattoria', 'Tagliatelle ao ragù'],
  ]) {
    const opener = page.getByRole('button', {
      name: new RegExp('Experimentar cardápio de ' + name),
    });
    await opener.click();
    const dialog = page.getByRole('dialog', { name });
    const menu = dialog.frameLocator('iframe[src="/vitrine-demo.html"]');
    await expect(menu.getByRole('heading', { name, level: 1, exact: true })).toBeVisible();
    await expect(menu.getByRole('img', { name: 'Capa do restaurante ' + name })).toBeVisible();
    await menu.getByRole('button', { name: 'Ver cardápio', exact: true }).click();
    await menu
      .getByRole('button', { name: 'Ver detalhes de ' + product })
      .first()
      .click();
    const detail = menu.getByRole('dialog', { name: 'Detalhes de ' + product });
    await expect(detail.getByRole('heading', { name: product })).toBeVisible();
    await expect(detail.getByRole('button', { name: /Adicionar ao carrinho/ })).toBeVisible();
    await dialog.getByRole('button', { name: 'Fechar vitrine' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(opener).toBeFocused();
  }
  const team = page.locator('#apresentacao');
  for (const name of ['Atendente', 'Garçom', 'Motoboy', 'Administrador']) {
    const button = team.getByRole('button', { name, exact: true });
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(team.locator('figure img')).toBeVisible();
  }
});

test('vitrine conclui um pedido fictício com cupom, endereço, Pix e percurso de entrega', async ({
  page,
}) => {
  test.slow();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.setFixedTime(new Date('2026-01-10T12:00:00Z'));
  await page.goto('/');
  await page.getByRole('button', { name: /Experimentar cardápio de Braseiro Burger/ }).click();
  const store = page.getByRole('dialog', { name: 'Braseiro Burger' }).frameLocator('iframe');
  await store.getByRole('button', { name: 'Ver detalhes de Brasa Bacon' }).first().click();
  const detail = store.getByRole('dialog', { name: 'Detalhes de Brasa Bacon' });
  await detail.getByRole('button', { name: 'Aumentar quantidade' }).click();
  await detail.getByPlaceholder(/retirar um ingrediente/).fill('Molho separado');
  await detail.getByRole('button', { name: /Adicionar ao carrinho/ }).click();
  const flight = store.locator('[data-cart-fly-preview]');
  await expect(flight.locator('img')).toHaveAttribute('src', /burger.webp$/);
  await expect(flight).toHaveCount(0);
  await expect(store.getByRole('button', { name: 'Meu Carrinho, 2 itens' })).toBeVisible();
  await store.getByRole('button', { name: 'Abrir cupons', exact: true }).click();
  const coupons = store.getByRole('region', { name: 'Tela de cupons' });
  await coupons.getByRole('button', { name: 'Usar cupom VITRINE10' }).click();
  await coupons.getByRole('button', { name: 'Ver meu pedido' }).click();
  await expect(store.getByRole('heading', { name: 'Meu pedido' })).toBeVisible();
  await expect(store.locator('body')).toContainText('Molho separado');
  for (const price of ['59,80', '5,98', '58,82'])
    await expect(store.locator('body')).toContainText(price);
  await store.getByRole('button', { name: 'Continuar', exact: true }).click();
  await store.getByRole('textbox', { name: 'Rua', exact: true }).fill('Rua da Vitrine');
  await store.getByRole('textbox', { name: 'Número', exact: true }).fill('42');
  await store.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(store.getByRole('button', { name: /Pix QR Code/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await store.getByRole('button', { name: 'Continuar', exact: true }).click();
  await store.getByRole('button', { name: 'Simular confirmação do Pix' }).click();
  await expect(store.getByText('Pagamento PIX Confirmado!', { exact: true })).toBeVisible();
  await store.getByRole('button', { name: 'Acompanhar Pedido' }).click();
  const tracking = store.getByRole('region', { name: 'Acompanhamento de entrega' });
  const currentStage = tracking
    .getByRole('list', { name: 'Etapas da entrega' })
    .locator('[aria-current="step"]');
  await expect(currentStage).toContainText('Preparando');
  await tracking.getByRole('button', { name: 'Iniciar entrega' }).click();
  await expect(currentStage).toContainText('A caminho');
  await expect(tracking.getByRole('img', { name: /Mapa ilustrativo/ })).toBeVisible();
  await tracking.getByRole('button', { name: 'Pausar rota' }).click();
  await tracking.getByRole('button', { name: 'Retomar rota' }).click();
  await tracking.getByRole('button', { name: 'Concluir entrega' }).click();
  await expect(currentStage).toContainText('Entregue');
  await tracking.getByRole('button', { name: 'Voltar aos pedidos' }).click();
  const history = store.getByRole('region', { name: 'Pedidos da vitrine' });
  await expect(history).toContainText('Brasa Bacon');
  await expect(history).toContainText('58,82');
});

test('cada restaurante conserva a própria sacola ao alternar entre vitrines', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const openPizza = page.getByRole('button', { name: /Experimentar cardápio de Forno Alto/ });
  await openPizza.click();
  const dialog = page.getByRole('dialog', { name: 'Forno Alto' });
  const pizza = dialog.frameLocator('iframe');
  await pizza.getByRole('button', { name: 'Adicionar Margherita da casa' }).first().click();
  await expect(pizza.getByRole('button', { name: 'Meu Carrinho, 1 item' })).toBeVisible();
  await expect(pizza.locator('[data-cart-fly-preview]')).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Fechar vitrine' }).click();
  await page.getByRole('button', { name: /Experimentar cardápio de Açaí da Mata/ }).click();
  const other = page.getByRole('dialog', { name: 'Açaí da Mata' });
  const acai = other.frameLocator('iframe');
  await acai.getByRole('button', { name: 'Entrar na minha conta' }).click();
  await expect(acai.getByRole('button', { name: 'Entrar como cliente' })).toBeVisible();
  await acai.getByRole('button', { name: 'Voltar ao cardápio' }).click();
  await acai.getByRole('button', { name: 'Meu Carrinho, 0 itens' }).click();
  await expect(acai.getByText('Seu carrinho está vazio.', { exact: true }).first()).toBeVisible();
  await other.getByRole('button', { name: 'Fechar vitrine' }).click();
  await openPizza.click();
  await pizza.getByRole('button', { name: 'Meu Carrinho, 1 item' }).click();
  await pizza.getByRole('button', { name: /Diminuir Margherita da casa/ }).click();
  await expect(pizza.getByText('Seu carrinho está vazio.', { exact: true }).first()).toBeVisible();
});

test('a vitrine conserva o tema ao navegar sem alterar as demais lojas', async ({ page }) => {
  test.slow();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const openAcai = page.getByRole('button', { name: /Experimentar cardápio de Açaí da Mata/ });
  await openAcai.click();
  const dialog = page.getByRole('dialog', { name: 'Açaí da Mata' });
  const store = dialog.frameLocator('iframe');
  await store.getByRole('button', { name: 'Ativar tema escuro' }).click();
  await expect(store.locator('html')).toHaveAttribute('data-storefront-theme', 'dark');
  await store.getByRole('button', { name: 'Ver detalhes de Açaí com frutas' }).first().click();
  const ready = store.getByRole('dialog', { name: 'Detalhes de Açaí com frutas' });
  await expect(ready).toHaveCSS('background-color', 'rgb(22, 27, 35)');
  await expect(ready.getByRole('heading', { name: 'Açaí com frutas' })).toHaveCSS('color', 'rgb(244, 245, 248)');
  await expect(ready.getByRole('img', { name: 'Açaí com frutas' })).not.toHaveCSS('filter', /invert/);
  await ready.getByRole('button', { name: 'Cardápio', exact: true }).click();
  await store.getByRole('button', { name: 'Adicionar Tigela da Mata 600 ml' }).click();
  const customize = store.getByRole('dialog', { name: 'Montar Tigela da Mata 600 ml' });
  await expect(customize.locator('.product-form')).toHaveCSS('background-color', 'rgb(32, 40, 51)');
  await expect(customize.locator('.product-details h1')).toHaveCSS('color', 'rgb(244, 245, 248)');
  await expect(customize.getByRole('img', { name: 'Tigela da Mata 600 ml' })).not.toHaveCSS('filter', /invert/);
  await customize.getByRole('button', { name: 'Voltar ao cardápio' }).click();
  await store.getByRole('button', { name: 'Meu Carrinho, 0 itens' }).click();
  await expect(store.getByRole('heading', { name: 'Meu pedido' })).toBeVisible();
  await expect(store.locator('html')).toHaveAttribute('data-storefront-theme', 'dark');
  const theme = dialog.getByRole('button', { name: 'Alternar tema claro e escuro da vitrine' });
  await theme.click();
  await expect(store.locator('html')).toHaveAttribute('data-storefront-theme', 'light');
  await expect(store.getByRole('heading', { name: 'Meu pedido' })).toBeVisible();
  await theme.click();
  await expect(store.locator('html')).toHaveAttribute('data-storefront-theme', 'dark');
  await store.getByRole('button', { name: 'Voltar', exact: true }).click();
  await expect(store.getByRole('button', { name: 'Ativar tema claro' })).toHaveAttribute('aria-pressed', 'true');
  await dialog.getByRole('button', { name: 'Fechar vitrine' }).click();
  await page.getByRole('button', { name: /Experimentar cardápio de Sálvia Trattoria/ }).click();
  const salvia = page.getByRole('dialog', { name: 'Sálvia Trattoria' });
  await expect(salvia.frameLocator('iframe').locator('html')).toHaveAttribute('data-storefront-theme', 'light');
  await salvia.getByRole('button', { name: 'Fechar vitrine' }).click();
  await openAcai.click();
  await store.getByRole('button', { name: 'Ativar tema claro' }).click();
  await expect(store.locator('html')).toHaveAttribute('data-storefront-theme', 'light');
});

test('personalização gratuita conserva a escolha e a observação na sacola', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: /Experimentar cardápio de Braseiro Burger/ }).click();
  const store = page.getByRole('dialog', { name: 'Braseiro Burger' }).frameLocator('iframe');
  await store.getByRole('button', { name: 'Adicionar Clássico da chapa' }).click();
  const configurator = store.getByRole('dialog', { name: 'Montar Clássico da chapa' });
  await configurator.getByText('Maionese verde', { exact: true }).click();
  await configurator.getByPlaceholder(/sem cebola/).fill('Embrulhar separado');
  await configurator.getByRole('button', { name: 'Adicionar à sacola' }).click();
  await store.getByRole('button', { name: 'Meu Carrinho, 1 item' }).click();
  await expect(store.getByText('Obs.: Molho: Maionese verde · Embrulhar separado', { exact: true })).toBeVisible();
  await expect(store.locator('body')).toContainText('25,90');
  await expect(store.locator('body')).toContainText('30,90');
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
  await page.getByRole('link', { name: /Quero o Avançado/ }).click();
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

test('rodapé aponta para domínio oficial e páginas jurídicas existentes', async ({ page }) => {
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const footer = page.locator('footer.footer');
    await expect(footer.getByRole('link', { name: 'www.gastronexa.com.br' })).toHaveAttribute('href', 'https://www.gastronexa.com.br/');
    await expect(footer.getByRole('link', { name: 'Termos de Uso' })).toHaveAttribute('href', '/termos/');
    await expect(footer.getByRole('link', { name: 'Política de Privacidade' })).toHaveAttribute('href', '/privacidade/');
    for (const route of ['/termos/', '/privacidade/']) {
      const response = await page.request.get(route);
      expect(response.ok(), `Página jurídica indisponível: ${route}`).toBe(true);
    }
  }
});
