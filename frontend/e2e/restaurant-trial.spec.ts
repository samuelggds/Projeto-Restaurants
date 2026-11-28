import { expect, test } from '@playwright/test';
import path from 'node:path';

test('dono escolhe outra cozinha, confere uma foto e abre o restaurante no site oficial', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const tenant = 42;
  const email = 'proprietaria@example.test';
  const products = [
    {
      id: 1,
      name: 'Smash duplo',
      description: 'Dois discos na chapa',
      image: '/marketing-vitrines/cardapios/smash-duplo.webp',
      active: true,
      price: 32.9,
      configurationVersion: 1,
    },
  ];
  const source = {
    publicId: 'foto-item',
    position: 0,
    category: 'Lanches',
    name: 'Sanduíche da casa',
    description: 'Pão com carne na chapa.',
    price: 0,
    image: products[0].image,
    confidence: 0.88,
    uncertainFields: ['price'],
    active: true,
    duplicateProductId: null,
    action: 'CREATE',
    selected: true,
    publishedProductId: null,
    updatedAt: '',
  };
  const draft = {
    publicId: 'foto-rascunho',
    sourceType: 'IMAGE',
    status: 'REVIEW',
    items: [source],
  };
  let activated = false,
    published = false,
    opened = false;
  const bodyFor = (url: string) => new URL(url).pathname.replace(/^\/api(?=\/)/, '');
  await page.route('**/*', async (route) => {
    const request = route.request();
    if (!['xhr', 'fetch'].includes(request.resourceType())) return route.continue();
    const endpoint = bodyFor(request.url());
    const json = (body: unknown, status = 200) => route.fulfill({ json: body, status });
    if (endpoint === '/auth/refresh') return json({}, 401);
    if (endpoint === '/restaurant-trials/availability')
      return json({ available: true, manualApproval: false });
    if (endpoint === '/platform/plans')
      return json({ plans: [{ code: 'BASICO', name: 'Entrada', monthlyFee: 79.9, trialDays: 7 }] });
    if (endpoint === '/restaurant-trials/challenge')
      return json({ challenge: 'test-challenge', expiresInMinutes: 15 });
    if (endpoint === '/restaurant-trials/activate') {
      expect(request.postDataJSON()).toMatchObject({
        email,
        category: 'HAMBURGUERIA',
        code: '123456',
        quotedMonthlyFee: 79.9,
      });
      activated = true;
      return json(
        {
          adminPath: '/nova-loja/admin/test-key',
          menuPath: '/nova-loja',
          trialEndsAt: '2030-05-10T12:00:00Z',
        },
        201,
      );
    }
    if (endpoint.endsWith('/exchange')) return json({ grant: 'test-grant' });
    if (endpoint.endsWith('/verify'))
      return json({
        valid: true,
        restaurantId: tenant,
        slug: 'nova-loja',
        expiresAt: '2030-05-10T12:00:00Z',
      });
    if (endpoint === '/auth/login')
      return json({
        user: { id: 7, name: 'Maria', email, role: 'ADMIN', restaurantId: tenant },
        token: 'test-owner-token',
      });
    if (endpoint === '/products/manage') return json(products);
    if (endpoint === '/settings')
      return json({ id: 2, restaurantId: tenant, isOpenForOrders: false });
    if (endpoint === '/menu-import/image/preview') {
      expect(activated).toBe(true);
      expect(request.postDataJSON()).toMatchObject({
        photoMode: 'product',
        imageUrl: expect.stringMatching(/^data:image\//),
      });
      return json(draft, 201);
    }
    if (endpoint.endsWith('/items/foto-item')) {
      expect(request.postDataJSON()).toMatchObject({ name: 'Smash da Maria', price: 29.9 });
      return json(draft);
    }
    if (endpoint.endsWith('/foto-rascunho/publish')) {
      published = true;
      products.push({ ...products[0], id: 2, name: 'Smash da Maria', price: 29.9 });
      return json({ status: 'PUBLISHED', results: [] });
    }
    if (endpoint === '/settings/2' && request.method() === 'PUT') {
      expect(published).toBe(true);
      expect(request.postDataJSON()).toMatchObject({
        isOpenForOrders: true,
        restaurantCity: 'Fortaleza',
        acceptsPickup: true,
      });
      opened = true;
      return json({ id: 2, isOpenForOrders: true });
    }
    return json({}, 404);
  });
  await page.goto('/ativar/restaurante?modelo=pizzaria');
  await expect(page.getByLabel('Tipo de restaurante')).toHaveValue('');
  await page.getByLabel('Nome do restaurante').fill('Nova Loja');
  await page.getByLabel('Tipo de restaurante').selectOption('HAMBURGUERIA');
  await page.getByLabel('Nome do proprietário').fill('Maria Souza');
  await page.getByLabel('E-mail de acesso').fill(email);
  await page.getByLabel('WhatsApp com DDD').fill('85999990000');
  await page.getByRole('button', { name: 'Receber código por e-mail' }).click();
  await page.getByLabel('Código do e-mail').fill('123456');
  await page.getByLabel('Crie sua senha').fill('Teste-Somente123!');
  await page.getByLabel(/Concordo com o plano/).check();
  await page.getByRole('button', { name: 'Ativar meu restaurante' }).click();
  await expect(page.getByRole('heading', { name: 'Prepare sua loja para vender' })).toBeVisible();
  await expect(page.getByText('Smash duplo', { exact: true })).toBeVisible();
  await page.getByLabel('O que aparece na foto?').selectOption('product');
  await page
    .getByLabel('Escolher da galeria')
    .setInputFiles(path.resolve('public/marketing-vitrines/cardapios/burger.webp'));
  await page.getByRole('button', { name: 'Analisar foto com IA' }).click();
  await expect(page.getByRole('button', { name: 'Abrir minha loja para pedidos' })).toBeDisabled();
  await page.getByLabel('Nome do produto', { exact: true }).fill('Smash da Maria');
  await page.getByLabel('Preço em reais', { exact: true }).fill('29.90');
  await page.getByRole('button', { name: 'Salvar itens revisados' }).click();
  await expect(page.getByText('Smash da Maria', { exact: true })).toBeVisible();
  for (const [label, value] of [
    ['Rua', 'Rua das Flores'],
    ['Número', '12'],
    ['Bairro', 'Centro'],
    ['CEP', '60000000'],
    ['Cidade', 'Fortaleza'],
    ['UF', 'CE'],
  ]) {
    await page.getByLabel(label, { exact: true }).fill(value);
  }
  await page.getByLabel(/Conferi os produtos/).check();
  await page.getByRole('button', { name: 'Abrir minha loja para pedidos' }).click();
  await expect(page.getByRole('link', { name: 'Ver meu cardápio público' })).toHaveAttribute(
    'href',
    '/nova-loja',
  );
  expect(opened).toBe(true);
});
