import { expect, test as base, type Page } from '@playwright/test';
import {
  DEMO_STORAGE_KEY,
  type DemoOrder,
  type DemoOrderChannel,
  type DemoRole,
} from '../src/pages/Marketing/demo/demoDomain';
import { captureReadmeScreenshot } from './helpers/readmeScreenshot';

// No scenario operation may reach a real API, even when a demo callback is missing.
const test = base.extend<{ apiIsolation: void }>({
  apiIsolation: [
    async ({ page, baseURL }, use, testInfo) => {
      const unexpected: string[] = [];
      const applicationOrigin = new URL(baseURL!).origin;
      await page.route('**/*', async (route) => {
        const request = route.request();
        const url = new URL(request.url());
        const method = request.method();
        const api =
          (['localhost', '127.0.0.1'].includes(url.hostname) && url.port === '3000') ||
          (url.origin === applicationOrigin && url.pathname.startsWith('/api/'));
        const pathname = url.pathname.replace(/^\/api(?=\/)/, '');
        if (api) {
          // The global auth provider boots outside the demo and stays anonymous.
          if (pathname === '/auth/refresh' && method === 'POST') {
            return route.fulfill({
              status: 401,
              contentType: 'application/json',
              body: JSON.stringify({ error: 'Sem sessão real na demonstração.' }),
            });
          }
          if (pathname === '/platform/status' && method === 'GET') {
            return route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({ available: true, maintenanceMode: false }),
            });
          }
          if (method === 'OPTIONS') return route.fulfill({ status: 204 });
          unexpected.push(`${method} ${url.origin}${url.pathname}`);
          return route.fulfill({
            status: 418,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'A operação demonstrativa tentou usar uma API real.' }),
          });
        }
        if (
          !['GET', 'HEAD', 'OPTIONS'].includes(method) &&
          ['xhr', 'fetch'].includes(request.resourceType())
        ) {
          unexpected.push(`${method} ${url.origin}${url.pathname}`);
          return route.abort('blockedbyclient');
        }
        return route.continue();
      });
      await use();
      await testInfo.attach('demo-unexpected-api-requests', {
        body: JSON.stringify(unexpected, null, 2),
        contentType: 'application/json',
      });
      expect(
        unexpected,
        'A demonstração deve manter suas operações e dados fora das APIs reais.',
      ).toEqual([]);
    },
    { auto: true },
  ],
});

test.use({ viewport: { width: 1440, height: 1000 } });
test.setTimeout(60000);

async function storedOrder(page: Page, id: number) {
  return page.evaluate(
    ({ key, id }) => {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const state = JSON.parse(raw) as { orders: DemoOrder[] };
      return state.orders.find((order) => order.id === id) ?? null;
    },
    { key: DEMO_STORAGE_KEY, id },
  );
}

async function expectOrderStatus(page: Page, id: number, status: DemoOrder['status']) {
  await expect.poll(async () => (await storedOrder(page, id))?.status).toBe(status);
}

async function switchRole(page: Page, role: DemoRole | 'CLIENTE_QR') {
  const controls = page
    .locator('details')
    .filter({ has: page.locator('summary').filter({ hasText: /^Demonstração$/ }) });
  await expect(controls).toBeVisible();
  const selector = controls.getByLabel('Ver demonstração como');
  if (!(await selector.isVisible())) await controls.locator('summary').click();
  await selector.selectOption(role);
  await expect(selector).toHaveValue(role);
  if (await selector.isVisible()) await controls.locator('summary').click();
}

async function navigate(
  page: Page,
  area: 'cozinha' | 'garçom' | 'motoqueiro' | 'atendente',
  label: string,
) {
  const name = area === 'cozinha' ? 'Navegação da cozinha' : `Navegação do ${area}`;
  const buttonName = area === 'motoqueiro' ? new RegExp(`^${label}(?:\\s+\\d+)?$`) : label;
  await page
    .getByRole('navigation', { name, exact: true })
    .getByRole('button', { name: buttonName, exact: true })
    .click();
}

async function createCustomerOrder(
  page: Page,
  channel: DemoOrderChannel,
  payment: 'Pix' | 'Cartão' | 'Dinheiro',
) {
  await page.goto('/demonstracao');
  await page.getByRole('button', { name: 'Entrar nesta área', exact: true }).first().click();
  await page.getByRole('button', { name: 'Entrar na demonstração', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Adicionar Burger Clássico', exact: true }).first(),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Adicionar Burger Clássico', exact: true })
    .first()
    .click();
  const cart = page.getByRole('dialog', { name: 'Sua sacola', exact: true });
  await expect(cart).toBeVisible();
  await expect(cart).toContainText('Burger Clássico');
  const channelLabel =
    channel === 'DELIVERY' ? 'Entrega' : channel === 'PICKUP' ? 'Retirada' : 'Mesa 08';
  await cart.getByRole('button', { name: channelLabel, exact: true }).click();
  await cart.getByRole('button', { name: payment, exact: true }).click();
  await expect(cart.getByRole('button', { name: channelLabel, exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await captureReadmeScreenshot(page, `demo-${channel.toLowerCase()}-checkout.png`);
  await cart.getByRole('button', { name: 'Enviar pedido', exact: true }).click();
  const orders = page.getByRole('dialog', { name: 'Meus pedidos', exact: true });
  const notice = orders
    .getByRole('status')
    .filter({ hasText: /Pedido #\d+ recebido pela cozinha/ });
  await expect(notice).toBeVisible();
  const match = (await notice.innerText()).match(/Pedido #(\d+)/);
  expect(match).not.toBeNull();
  const id = Number(match![1]);
  await expect.poll(async () => (await storedOrder(page, id))?.channel).toBe(channel);
  await expectOrderStatus(page, id, 'PENDENTE');
  const order = await storedOrder(page, id);
  expect(order).toMatchObject({
    paid: payment !== 'Dinheiro',
    items: [{ productId: 'burger-classic', quantity: 1 }],
    total: 32.9,
  });
  if (channel === 'TABLE') expect(order?.tableNumber).toBe(8);
  await orders.getByRole('button', { name: 'Fechar', exact: true }).click();
  return id;
}

async function prepareInKitchen(page: Page, id: number, channel: DemoOrderChannel) {
  await switchRole(page, 'COZINHA');
  await navigate(page, 'cozinha', 'Fila de pedidos');
  const card = page.locator(`#kitchen-order-${id}`);
  await expect(card).toBeVisible();
  await expect(card).toContainText('Burger Clássico');
  await card.getByRole('button', { name: 'Iniciar preparo', exact: true }).click();
  await expectOrderStatus(page, id, 'PREPARANDO');
  await expect(card).toHaveClass(/status-preparando/);
  await card.getByRole('button', { name: 'Marcar como pronto', exact: true }).click();
  await expectOrderStatus(page, id, 'PRONTO');
  await navigate(page, 'cozinha', 'Prontos');
  const readyCard = page.getByText(String(id), { exact: true }).locator('../..');
  await expect(readyCard).toBeVisible();
  await expect(readyCard).toContainText('Burger Clássico');
  await expect(readyCard.getByRole('button', { name: /entregar|entregue/i })).toHaveCount(0);
  await captureReadmeScreenshot(page, `demo-${channel.toLowerCase()}-kitchen-ready.png`, {
    fullPage: true,
  });
}

function attendantOrder(page: Page, id: number) {
  return page.locator('main article').filter({ has: page.getByText(`#${id}`, { exact: true }) });
}

function courierOrder(page: Page, id: number) {
  return page.locator('article').filter({ has: page.getByText(`Pedido #${id}`, { exact: true }) });
}

async function assertOtherRolesCannotDeliver(page: Page, id: number, channel: DemoOrderChannel) {
  if (channel !== 'TABLE') {
    await switchRole(page, 'GARCOM');
    await navigate(page, 'garçom', 'Para entregar');
    await expect(page.locator(`#waiter-ready-order-${id}`)).toHaveCount(0);
  }
  if (channel !== 'DELIVERY') {
    await switchRole(page, 'MOTOQUEIRO');
    await navigate(page, 'motoqueiro', 'Para retirar');
    await page.getByLabel('Buscar pedido', { exact: true }).fill(String(id));
    await expect(courierOrder(page, id)).toHaveCount(0);
  }
  if (channel !== 'PICKUP') {
    await switchRole(page, 'ATENDENTE');
    await navigate(page, 'atendente', 'Pedidos');
    await attendantOrder(page, id)
      .getByRole('button', { name: 'Ver detalhes', exact: true })
      .click();
    const dialog = page.getByRole('dialog', { name: 'Detalhes do pedido', exact: true });
    await expect(dialog).toContainText(channel === 'TABLE' ? 'Mesa' : 'Delivery');
    await expect(
      dialog.getByRole('button', { name: 'Confirmar retirada entregue', exact: true }),
    ).toHaveCount(0);
    await dialog.getByRole('button', { name: 'Fechar detalhes', exact: true }).click();
  }
  await expectOrderStatus(page, id, 'PRONTO');
}

async function verifyCustomerCompletion(page: Page, id: number, channel: DemoOrderChannel) {
  await switchRole(page, 'CLIENTE');
  await page.getByRole('button', { name: 'Meus pedidos · acompanhar', exact: true }).click();
  const orders = page.getByRole('dialog', { name: 'Meus pedidos', exact: true });
  const row = orders.getByText(`#${id}`, { exact: true }).locator('..');
  await expect(row).toContainText('Entregue');
  await expect(row).toContainText('Pago');
  await expect(row).toContainText('Burger Clássico');
  await captureReadmeScreenshot(page, `demo-${channel.toLowerCase()}-customer-completed.png`);
  await expectOrderStatus(page, id, 'ENTREGUE');
  await expect.poll(async () => (await storedOrder(page, id))?.paid).toBe(true);
}

test('demo: delivery vai do cliente à cozinha e ao motoqueiro, com recebimento e código', async ({
  page,
}) => {
  const id = await createCustomerOrder(page, 'DELIVERY', 'Dinheiro');
  await prepareInKitchen(page, id, 'DELIVERY');
  await assertOtherRolesCannotDeliver(page, id, 'DELIVERY');
  await switchRole(page, 'MOTOQUEIRO');
  await navigate(page, 'motoqueiro', 'Para retirar');
  await page.getByLabel('Buscar pedido', { exact: true }).fill(String(id));
  const card = courierOrder(page, id);
  await card.getByRole('button', { name: 'Retirar e iniciar entrega', exact: true }).click();
  const location = page.getByRole('dialog', { name: 'Compartilhar localização?', exact: true });
  await location.getByRole('button', { name: /Continuar sem localização/ }).click();
  await expectOrderStatus(page, id, 'SAIU_PARA_ENTREGA');
  const delivery = card.getByRole('button', { name: 'Marcar como Entregue', exact: true });
  await card.getByLabel('Código de entrega informado pelo cliente').fill('1234');
  await expect(delivery).toBeDisabled();
  await page.getByRole('button', { name: 'Simular recebimento em dinheiro', exact: true }).click();
  await expect.poll(async () => (await storedOrder(page, id))?.paid).toBe(true);
  await expect(delivery).toBeEnabled();
  await card.getByLabel('Código de entrega informado pelo cliente').fill('0000');
  await delivery.click();
  await expect(card.getByRole('alert')).toContainText('1234');
  await expectOrderStatus(page, id, 'SAIU_PARA_ENTREGA');
  await card.getByLabel('Código de entrega informado pelo cliente').fill('1234');
  await captureReadmeScreenshot(page, 'demo-delivery-courier-confirmation.png', { fullPage: true });
  await delivery.click();
  await expectOrderStatus(page, id, 'ENTREGUE');
  await verifyCustomerCompletion(page, id, 'DELIVERY');
});

test('demo: pedido da mesa passa pela cozinha e é entregue pelo garçom', async ({ page }) => {
  const id = await createCustomerOrder(page, 'TABLE', 'Cartão');
  await prepareInKitchen(page, id, 'TABLE');
  await assertOtherRolesCannotDeliver(page, id, 'TABLE');
  await switchRole(page, 'GARCOM');
  await navigate(page, 'garçom', 'Para entregar');
  const card = page.locator(`#waiter-ready-order-${id}`);
  await expect(card).toContainText('Mesa 08');
  await expect(card).toContainText('Burger Clássico');
  await captureReadmeScreenshot(page, 'demo-table-waiter-ready.png', { fullPage: true });
  await card.getByRole('button', { name: 'Entregue à mesa', exact: true }).click();
  await expectOrderStatus(page, id, 'ENTREGUE');
  await expect(card).toHaveCount(0);
  await verifyCustomerCompletion(page, id, 'TABLE');
});

test('demo: retirada paga passa pela cozinha e é entregue pelo atendente', async ({ page }) => {
  const id = await createCustomerOrder(page, 'PICKUP', 'Pix');
  await prepareInKitchen(page, id, 'PICKUP');
  await assertOtherRolesCannotDeliver(page, id, 'PICKUP');
  await switchRole(page, 'ATENDENTE');
  await navigate(page, 'atendente', 'Pedidos');
  await attendantOrder(page, id).getByRole('button', { name: 'Ver detalhes', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Detalhes do pedido', exact: true });
  await expect(dialog).toContainText('Pagamento confirmado');
  const confirm = dialog.getByRole('button', { name: 'Confirmar retirada entregue', exact: true });
  await expect(confirm).toBeEnabled();
  await captureReadmeScreenshot(page, 'demo-pickup-attendant-confirmation.png');
  await confirm.click();
  await expectOrderStatus(page, id, 'ENTREGUE');
  await expect(dialog).toHaveCount(0);
  await verifyCustomerCompletion(page, id, 'PICKUP');
});

test('demo: cliente e cozinha sincronizam pedidos entre abas mantendo seus perfis', async ({
  page,
  context,
}) => {
  const requests: string[] = [];
  await context.route(/:3000\/|\/api\//, (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/auth/refresh')) return route.fulfill({ status: 401, json: {} });
    if (path.endsWith('/platform/status')) return route.fulfill({ json: { available: true } });
    requests.push(path);
    return route.abort();
  });
  await createCustomerOrder(page, 'DELIVERY', 'Pix');
  const kitchen = await context.newPage();
  await kitchen.addInitScript(() =>
    sessionStorage.setItem('gastronexa:demo:account', 'demo-cozinha'),
  );
  await kitchen.goto('/demonstracao');
  await navigate(kitchen, 'cozinha', 'Fila de pedidos');

  await page
    .getByRole('button', { name: 'Adicionar Burger Clássico', exact: true })
    .first()
    .click();
  await page
    .getByRole('dialog', { name: 'Sua sacola' })
    .getByRole('button', { name: 'Enviar pedido', exact: true })
    .click();
  const id = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).orders[0].id as number,
    DEMO_STORAGE_KEY,
  );
  const card = kitchen.locator(`#kitchen-order-${id}`);
  await expect(card).toBeVisible();
  await card.getByRole('button', { name: 'Iniciar preparo', exact: true }).click();
  const customerRow = page
    .getByRole('dialog', { name: 'Meus pedidos' })
    .getByText(`#${id}`, { exact: true })
    .locator('..');
  await expect(customerRow).toContainText('Em preparo');
  await card.getByRole('button', { name: 'Marcar como pronto', exact: true }).click();
  await expect(customerRow).toContainText('Pronto');
  await page.reload();
  await expect(page.getByRole('banner')).toContainText('GastroNexa Burger');
  await kitchen.reload();
  await expect(
    kitchen.getByRole('navigation', { name: 'Navegação da cozinha', exact: true }),
  ).toBeVisible();
  expect(requests).toEqual([]);
  await kitchen.close();
});

test('demo: entrada QR usa o cardápio da mesa, envia à cozinha e apresenta a conta real', async ({
  page,
}) => {
  await page.goto('/demonstracao');
  await page.getByRole('button', { name: 'Cardápio da mesa (QR Code)', exact: true }).click();
  await page.getByRole('button', { name: 'Entrar na demonstração', exact: true }).click();
  await expect(page.getByRole('banner').getByLabel('Mesa 08', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cadastrar endereço', exact: true })).toHaveCount(
    0,
  );
  await captureReadmeScreenshot(page, 'demo-qr-desktop.png');
  await page
    .getByRole('button', { name: 'Adicionar Burger Clássico', exact: true })
    .first()
    .click();
  const cart = page.getByRole('dialog', { name: 'Sua sacola' });
  await expect(cart.getByRole('button', { name: 'Entrega', exact: true })).toHaveCount(0);
  await cart.getByRole('button', { name: 'Revisar e continuar', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Como deseja continuar?', exact: true })
    .getByRole('button', { name: 'Adicionar à conta', exact: true })
    .click();
  const id = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).orders[0].id as number,
    DEMO_STORAGE_KEY,
  );
  expect(await storedOrder(page, id)).toMatchObject({
    channel: 'TABLE',
    tableNumber: 8,
    paid: false,
    status: 'PENDENTE',
  });
  await prepareInKitchen(page, id, 'TABLE');
  await switchRole(page, 'GARCOM');
  await navigate(page, 'garçom', 'Para entregar');
  await page
    .locator(`#waiter-ready-order-${id}`)
    .getByRole('button', { name: 'Entregue à mesa', exact: true })
    .click();
  await switchRole(page, 'CLIENTE_QR');
  await page.getByRole('button', { name: 'Ver conta', exact: true }).click();
  const account = page.getByRole('dialog', { name: 'Conta da mesa 08', exact: true });
  await account.getByRole('button', { name: 'Ver detalhes da conta', exact: true }).click();
  await expect(account.getByRole('heading', { name: 'Itens lançados', exact: true })).toBeVisible();
  await expect(account).toContainText('Burger Clássico');
  await expect(account).toContainText('92,80');
  await captureReadmeScreenshot(page, 'demo-qr-account.png');
  await account.getByRole('button', { name: 'Fechar conta da mesa', exact: true }).click();
  await page.getByRole('button', { name: 'Pedir a conta', exact: true }).click();
  await expect(account).toBeVisible();
  expect(
    await page.evaluate(
      (key) =>
        JSON.parse(localStorage.getItem(key)!).tables.find(
          (table: { number: number }) => table.number === 8,
        ).closingRequested,
      DEMO_STORAGE_KEY,
    ),
  ).toBe(true);
  await account.getByRole('button', { name: 'Fechar conta da mesa', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await captureReadmeScreenshot(page, 'demo-qr-mobile.png');
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
  ).toBeLessThanOrEqual(1);
  await page.reload();
  await expect(page.getByRole('banner').getByLabel('Mesa 08', { exact: true })).toBeVisible();
  await switchRole(page, 'CLIENTE');
  await expect(page.getByRole('button', { name: 'Cadastrar endereço', exact: true })).toBeVisible();
});
