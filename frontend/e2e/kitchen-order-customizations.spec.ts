import { expect, test, type Page } from '@playwright/test';

const customization = {
  ingredients: [
    { id: 1, name: 'Massa fina', price: 0 },
    { id: 2, name: 'Bacon', price: 7 },
  ],
  customizations: [
    {
      groupName: 'Massa',
      options: [{ optionId: 1, name: 'Massa fina', price: 0 }],
    },
    {
      groupName: 'Adicionais',
      options: [{ optionId: 2, name: 'Bacon', price: 7 }],
    },
  ],
};

const orders = [
  { id: 71, status: 'PENDENTE', observation: 'Enviar molho separado' },
  {
    id: 72,
    status: 'PRONTO',
    observation: 'Conferir antes da retirada',
    readyAt: new Date().toISOString(),
  },
  {
    id: 73,
    status: 'ENTREGUE',
    observation: 'Pedido concluído',
    completedAt: new Date().toISOString(),
  },
].map((order) => ({
  ...order,
  type: 'MESA',
  tableNumber: 4,
  customerName: 'Cliente Teste',
  total: 37,
  createdAt: new Date().toISOString(),
  items: [
    {
      id: order.id * 10,
      quantity: 1,
      observation: 'Assar bem a massa',
      product: { id: 101, name: 'Pizza artesanal' },
      ...customization,
    },
  ],
}));

async function mockKitchen(page: Page) {
  const user = {
    id: 9,
    name: 'Cozinha Teste',
    role: 'FUNCIONARIO',
    subRole: 'COZINHA',
    restaurantId: 9,
  };

  await page.route(/^http:\/\/(127\.0\.0\.1|localhost):3000\/.*$/, async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === '/auth/me') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user }),
      });
      return;
    }
    if (pathname === '/orders') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ orders }),
      });
      return;
    }
    if (pathname === '/settings/public/9') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          restaurantId: 9,
          restaurantName: 'Restaurante Teste',
          primaryColor: '#d64d08',
          restaurant: { id: 9, name: 'Restaurante Teste' },
        }),
      });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });

  await page.addInitScript((sessionUser) => {
    localStorage.clear();
    localStorage.setItem('token', 'e2e-kitchen-token');
    localStorage.setItem('user', JSON.stringify(sessionUser));
  }, user);
}

test('cozinha recebe montagem e observações na fila, prontos e histórico', async ({ page }) => {
  await mockKitchen(page);
  await page.goto('/kitchen');

  await expect(page.getByText('Pizza artesanal').first()).toBeVisible();
  await expect(page.getByText('Massa fina').first()).toBeVisible();
  await expect(page.getByText('Assar bem a massa').first()).toBeVisible();
  await expect(page.getByText('Enviar molho separado').first()).toBeVisible();

  const priorityOrder = page.getByRole('button', {
    name: 'Abrir #71 na fila de pedidos',
  });
  await priorityOrder.focus();
  await page.keyboard.press('Enter');
  const queuedOrder = page.locator('[data-order-id="#71"]');
  await expect(queuedOrder.getByText('Massa', { exact: true })).toBeVisible();
  await expect(queuedOrder.getByText('Adicionais', { exact: true })).toBeVisible();
  await expect(queuedOrder.getByText('Bacon', { exact: true })).toBeVisible();
  await expect(queuedOrder.getByText('Observação deste item')).toBeVisible();
  await expect(queuedOrder.getByText('Observação do pedido')).toBeVisible();

  await page.locator('nav').getByText('Prontos', { exact: true }).click();
  await expect(page.getByText('Conferir antes da retirada')).toBeVisible();

  await page.locator('nav').getByText('Histórico', { exact: true }).click();
  await page.getByText('Ver montagem e observações').click();
  await expect(page.getByText('Pedido concluído')).toBeVisible();
  await expect(page.getByText('Massa fina')).toBeVisible();
});

test('montagem permanece contida no card da fila em tela móvel', async ({ page }) => {
  await mockKitchen(page);
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto('/kitchen');
  await page.getByRole('button', { name: 'Abrir menu' }).click();
  await page.locator('nav').getByText('Fila de pedidos', { exact: true }).click();

  const queuedOrder = page.locator('[data-order-id="#71"]');
  await expect(queuedOrder).toBeVisible();
  await expect(queuedOrder.getByText('Massa fina')).toBeVisible();
  await expect(queuedOrder.getByText('Assar bem a massa')).toBeVisible();

  const dimensions = await queuedOrder.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
    right: element.getBoundingClientRect().right,
    viewportWidth: window.innerWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
  expect(dimensions.right).toBeLessThanOrEqual(dimensions.viewportWidth);
});
