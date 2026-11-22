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

test('cada vitrine abre o cardápio correto e a equipe troca de painel', async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto('/');
  for (const [name, product] of [
    ['Forno Alto', 'Margherita da casa'],
    ['Braseiro Burger', 'Brasa Bacon'],
    ['Açaí da Mata', 'Açaí com frutas'],
    ['Sálvia Trattoria', 'Tagliatelle ao ragù'],
  ]) {
    const opener = page.getByRole('button', {name: new RegExp('Experimentar cardápio de ' + name)});
    await opener.click();
    const dialog = page.getByRole('dialog', {name});
    const menu = dialog.getByRole('region', {name: 'Cardápio de ' + name});
    await menu.getByRole('button', {name: /Especial da casa/}).click();
    await expect(menu.getByRole('heading', {name: product})).toBeVisible();
    await expect(menu.getByRole('button', {name: /Adicionar à sacola/})).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(opener).toBeFocused();
  }
  const team = page.locator('#apresentacao');
  for (const name of ['Atendente','Garçom','Motoboy','Administrador']) {
    const button = team.getByRole('button', {name,exact:true});
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed','true');
    await expect(team.locator('figure img')).toBeVisible();
  }
});

test('vitrine conclui um pedido fictício com cupom, endereço, Pix e percurso de entrega', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.setFixedTime(new Date('2026-01-10T12:00:00Z'));
  await page.goto('/');
  await page.getByRole('button', { name: /Experimentar cardápio de Braseiro Burger/ }).click();
  const store = page.getByRole('dialog', { name: 'Braseiro Burger' });
  const nav = store.getByRole('navigation', { name: 'Navegação da vitrine' });
  await nav.getByRole('button', { name: 'Conta' }).click();
  await expect(store.getByLabel('E-mail de exemplo')).toHaveValue('marina@example.test');
  await store.getByRole('button', { name: 'Entrar com a conta de exemplo' }).click();
  await expect(store.getByRole('heading', { name: 'Minha conta' })).toBeVisible();
  await nav.getByRole('button', { name: 'Início' }).click();
  await store.getByRole('button', { name: /Especial da casa/ }).click();
  await store.getByRole('button', { name: 'Aumentar quantidade' }).click();
  await store.getByRole('button', { name: /Adicionar à sacola/ }).click();
  await nav.getByRole('button', { name: 'Sacola, 2 itens' }).click();
  await store.getByRole('button', { name: 'Escolher cupom' }).click();
  await store.getByRole('button', { name: 'Aplicar cupom' }).click();
  await store.getByRole('button', { name: 'Ver minha sacola' }).click();
  const recap = store.getByRole('region', { name: 'Resumo do pedido' });
  await expect(recap).toContainText('59,80');
  await expect(recap).toContainText('5,98');
  await expect(recap).toContainText('58,82');
  await store.getByRole('button', { name: 'Escolher endereço' }).click();
  await store.getByLabel('Rua ou avenida').fill('Rua da Vitrine');
  await store.getByLabel('Número').fill('42');
  await store.getByRole('button', { name: 'Salvar endereço' }).click();
  await expect(store.getByRole('radio', { name: /Pix/ })).toBeChecked();
  await store.getByRole('button', { name: 'Simular pagamento Pix' }).click();
  const tracking = store.getByRole('region', { name: 'Acompanhamento de entrega' });
  await expect(tracking).toContainText('Rua da Vitrine, 42');
  await expect(tracking.getByRole('img', { name: /Mapa ilustrativo/ })).toBeVisible();
  const currentStage = tracking.getByRole('list', { name: 'Etapas da entrega' }).locator('[aria-current="step"]');
  await expect(currentStage).toHaveText('Em preparo');
  await tracking.getByRole('button', { name: 'Iniciar entrega' }).click();
  await expect(currentStage).toHaveText('A caminho');
  await tracking.getByRole('button', { name: 'Pausar rota' }).click();
  await tracking.getByRole('button', { name: 'Retomar rota' }).click();
  await tracking.getByRole('button', { name: 'Concluir entrega' }).click();
  await expect(currentStage).toHaveText('Entregue');
  await tracking.getByRole('button', { name: 'Voltar aos pedidos' }).click();
  const order = store.getByRole('listitem').filter({ hasText: 'Pedido simulado' });
  await expect(order).toContainText('2 × Brasa Bacon');
  await expect(order).toContainText('58,82');
  await expect(order).toContainText('Entregue');
  await nav.getByRole('button', { name: 'Sacola, 0 itens' }).click();
  await expect(store.getByRole('heading', { name: 'Sua sacola está vazia' })).toBeVisible();
});

test('cada restaurante conserva a própria sacola ao alternar entre vitrines', async ({ page }) => {
  await page.goto('/');
  const openPizza = page.getByRole('button', { name: /Experimentar cardápio de Forno Alto/ });
  await openPizza.click();
  const pizza = page.getByRole('dialog', { name: 'Forno Alto' });
  await pizza.getByRole('button', { name: /Especial da casa/ }).click();
  await pizza.getByRole('button', { name: /Adicionar à sacola/ }).click();
  await pizza.getByRole('button', { name: 'Fechar vitrine' }).click();
  await page.getByRole('button', { name: /Experimentar cardápio de Açaí da Mata/ }).click();
  const acai = page.getByRole('dialog', { name: 'Açaí da Mata' });
  await acai.getByRole('button', { name: 'Sacola, 0 itens', exact: true }).click();
  await expect(acai.getByRole('heading', { name: 'Sua sacola está vazia' })).toBeVisible();
  await page.keyboard.press('Escape');
  await openPizza.click();
  await pizza.getByRole('button', { name: /^Sacola, 1 item/ }).click();
  await pizza.getByRole('button', { name: 'Remover Margherita da casa' }).click();
  await expect(pizza.getByRole('heading', { name: 'Sua sacola está vazia' })).toBeVisible();
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
