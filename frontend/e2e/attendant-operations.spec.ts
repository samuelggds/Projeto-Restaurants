import { expectWorkspaceWidth } from './helpers/workspaceLayout';
import { orderFixtureResponse } from './helpers/orderFixtures';
import { expect, test, type Page, type Route } from '@playwright/test';
import { mockAuthRefresh } from './helpers/mockAuthRefresh';
import { captureReadmeScreenshot } from './helpers/readmeScreenshot';

const restaurantId = 47;
const user = {
  id: 94,
  name: 'Marina Atendente',
  email: 'marina@test.com',
  role: 'FUNCIONARIO',
  subRole: 'ATENDENTE',
  restaurantId,
};
const customerCpf = ['529', '982', '247', '25'].join('');
const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();
const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

async function setup(page: Page) {
  const state = {
    generatedAt: new Date().toISOString(),
    orders: [
      {
        id: 'public-102',
        orderId: 102,
        code: '#102',
        type: 'DELIVERY',
        status: 'PENDENTE',
        tableNumber: null,
        customerName: 'Rui',
        createdAt: minutesAgo(38),
        readyAt: null,
        items: [{ quantity: 1, productName: 'Calzone' }],
      },
      {
        id: 'public-103',
        orderId: 103,
        code: '#103',
        type: 'RETIRADA',
        status: 'PRONTO',
        tableNumber: null,
        customerName: 'Bianca',
        createdAt: minutesAgo(11),
        readyAt: minutesAgo(2),
        items: [{ quantity: 1, productName: 'Combo família' }],
      },
    ],
    calls: [
      {
        id: '71',
        tableNumber: 8,
        type: 'BILL',
        status: 'WAITING',
        assignedToId: null as number | null,
        assignedToName: null as string | null,
        requestedAt: minutesAgo(9),
        assignedAt: null as string | null,
        resolvedAt: null as string | null,
      },
    ],
    tables: [
      {
        id: '8',
        tableNumber: 8,
        status: 'CLOSING_REQUESTED',
        openedAt: minutesAgo(90),
        participantCount: 4,
        activeOrderCount: 1,
        activeCallCount: 1,
      },
    ],
  };
  let manualPayload: Record<string, unknown> | null = null;

  await page.route(/^http:\/\/(127\.0\.0\.1|localhost):3000\/.*$/, async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path.startsWith('/socket.io')) return route.abort();
    if (path === '/auth/me') return json(route, { user });
    if (path === `/settings/public/${restaurantId}`) {
      return json(route, {
        primaryColor: '#e16a3d',
        restaurant: { id: restaurantId, name: 'Pizzaria Horizonte', slug: 'pizzaria-horizonte' },
      });
    }
    if (path === '/attendant/workspace') return json(route, state);
    if (path === '/products')
      return json(route, [{ id: 1, name: 'Pizza da casa', price: 49.9, stock: 10 }]);
    if (path === '/orders/103') {
      return json(route, {
        id: 103,
        type: 'RETIRADA',
        status: 'PRONTO',
        paid: true,
        total: 49.9,
        user: { name: 'Bianca', phone: '+5500000000000' },
        items: [{ quantity: 1, product: { name: 'Combo família' } }],
      });
    }
    if (path === '/orders/103/status' && request.method() === 'PUT') {
      state.orders = state.orders.filter((order) => order.orderId !== 103);
      return json(route, { id: 103, status: 'ENTREGUE' });
    }
    if (path === '/attendant/calls/71/status') {
      const status = String((request.postDataJSON() as { status?: string }).status || '');
      const call = state.calls[0];
      if (status === 'IN_PROGRESS') {
        call.status = 'IN_PROGRESS';
        call.assignedToId = user.id;
        call.assignedToName = user.name;
        call.assignedAt = new Date().toISOString();
      }
      if (status === 'RESOLVED') {
        call.status = 'RESOLVED';
        call.resolvedAt = new Date().toISOString();
      }
      return json(route, call);
    }
    if (path === '/attendant/orders' && request.method() === 'POST') {
      manualPayload = request.postDataJSON() as Record<string, unknown>;
      return json(route, { id: 150, status: 'PENDENTE' }, 201);
    }
    if (path === '/orders') return json(route, orderFixtureResponse(request.url(), []));
    if (path === '/auth/logout') return json(route, { ok: true });
    return json(route, {});
  });

  await mockAuthRefresh(page, user.id, 'attendant-e2e-token');
  await page.addInitScript(
    (sessionUser) => localStorage.setItem('user', JSON.stringify(sessionUser)),
    user,
  );
  return { state, getManualPayload: () => manualPayload };
}

test('abre pedido e conclui retirada paga', async ({ page }) => {
  await setup(page);
  await page.goto('/attendant');
  await expect(page.getByRole('heading', { name: 'Central de atendimento' })).toBeVisible();
  await page.getByRole('button', { name: 'Pedidos', exact: true }).click();
  await page.getByLabel('Buscar pedidos').fill('Bianca');
  await page.getByRole('button', { name: /Ver detalhes/ }).click();
  await expect(page.getByText('Pagamento confirmado')).toBeVisible();
  await page.getByRole('button', { name: 'Confirmar retirada entregue' }).click();
  await expect(page.getByRole('dialog', { name: 'Detalhes do pedido' })).toHaveCount(0);
});

test('assume e resolve chamado', async ({ page }) => {
  const { state } = await setup(page);
  await page.goto('/attendant');
  await page.getByRole('button', { name: 'Chamados', exact: true }).click();
  await page.getByRole('button', { name: 'Assumir chamado' }).click();
  expect(state.calls[0].assignedToId).toBe(user.id);
  await page.getByRole('button', { name: /Atualizar/ }).click();
  await expect(page.getByRole('button', { name: 'Marcar como resolvido' })).toBeVisible();
  await page.getByRole('button', { name: 'Marcar como resolvido' }).click();
  expect(state.calls[0].status).toBe('RESOLVED');
});

test('registra pedido manual de retirada sem vincular o pedido ao atendente', async ({ page }) => {
  const api = await setup(page);
  await page.goto('/attendant');
  await page.getByRole('button', { name: 'Novo pedido' }).click();
  await page.getByPlaceholder('Ex.: Samuel Gomes').fill('Samuel Gomes');
  await page.getByPlaceholder('(85) 99999-9999').fill('(00) 00000-0000');
  await page.getByPlaceholder('000.000.000-00').fill(customerCpf);
  await page.getByRole('button', { name: 'Adicionar Pizza da casa' }).click();
  await page.getByRole('button', { name: /Confirmar pedido/ }).click();
  expect(api.getManualPayload()?.customerName).toBe('Samuel Gomes');
  expect(api.getManualPayload()?.customerCpf).toBe(customerCpf);
  expect(api.getManualPayload()?.type).toBe('RETIRADA');
});

test('falha inicial não anuncia fila vazia e atualização recupera a operação', async ({ page }) => {
  const { state } = await setup(page);
  let unavailable = true;
  await page.route('**/attendant/workspace', (route) =>
    unavailable ? json(route, { error: 'Falha temporária' }, 503) : json(route, state),
  );
  await page.goto('/attendant');
  await expect(page.getByRole('alert')).toContainText('primeiros dados');
  await expect(page.getByText('Aguardando dados da operação')).toBeVisible();
  await expect(page.getByText('Fila tranquila')).toHaveCount(0);
  await expect(page.getByText('Operação atualizada', { exact: true })).toHaveCount(0);
  unavailable = false;
  await page.getByRole('button', { name: 'Atualizar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Abrir pedido #103, Bianca' })).toBeVisible();
  await expect(page.getByText(/Última atualização às/)).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await captureReadmeScreenshot(page, 'attendant-overview.png', { fullPage: true });
});

test('snapshot inválido preserva pedidos já carregados e sinaliza a falha', async ({ page }) => {
  await setup(page);
  await page.goto('/attendant');
  const priorityOrder = page.getByRole('button', { name: 'Abrir pedido #103, Bianca' });
  await expect(priorityOrder).toBeVisible();
  await page.route('**/attendant/workspace', (route) => json(route, {}));
  await page.getByRole('button', { name: 'Atualizar', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('dados disponíveis foram preservados');
  await expect(priorityOrder).toBeVisible();
  await expect(page.getByText('Atualização pendente', { exact: true })).toBeVisible();
});

test('detalhes recuperam falha sem inventar pagamento e devolvem o foco ao fechar', async ({
  page,
}) => {
  await setup(page);
  let unavailable = true;
  await page.route('**/orders/103', (route) =>
    unavailable ? json(route, { error: 'Falha temporária' }, 503) : route.fallback(),
  );
  await page.goto('/attendant');
  const trigger = page.getByRole('button', { name: 'Abrir pedido #103, Bianca' });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Detalhes do pedido' });
  const close = dialog.getByRole('button', { name: 'Fechar detalhes' });
  await expect(dialog.getByRole('alert')).toBeVisible();
  await expect(close).toBeFocused();
  await expect(dialog.getByText('Pagamento pendente', { exact: true })).toHaveCount(0);
  await expect(dialog.getByRole('button', { name: 'Confirmar retirada entregue' })).toHaveCount(0);
  unavailable = false;
  await dialog.getByRole('button', { name: 'Tentar carregar novamente' }).click();
  await expect(dialog.getByText('Pagamento confirmado')).toBeVisible();
  await close.focus();
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('button', { name: 'Confirmar retirada entregue' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
  await captureReadmeScreenshot(page, 'attendant-order-details.png');
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('');
});

test('todas as áreas do atendente cabem em telas de 360 e 430 pixels', async ({ page }) => {
  await setup(page);
  await page.goto('/attendant');
  const navigation = page.getByRole('navigation', { name: 'Navegação móvel do atendente' });
  const more = navigation.getByRole('button', { name: 'Mais opções do atendente' });
  const menu = page.getByRole('dialog', { name: 'Opções do atendente' });
  for (const width of [360, 430]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(navigation).toBeVisible();
    for (const [name, title] of [
      ['Visão geral', 'Central de atendimento'],
      ['Pedidos', 'Pedidos em andamento'],
      ['Novo pedido', 'Registrar novo pedido'],
      ['Atendimento', 'Atendimento ao cliente'],
      ['Entregas', 'Acompanhar deliveries'],
      ['Mesas', 'Mesas em operação'],
      ['Chamados', 'Chamados do salão'],
    ]) {
      const secondary = ['Atendimento', 'Entregas', 'Mesas'].includes(name);
      if (secondary) await more.click();
      const button = (secondary ? menu : navigation).getByRole('button', { name, exact: true });
      await button.click();
      if (secondary) {
        await expect(menu).toHaveCount(0);
        await more.click();
        await expect(menu.getByRole('button', { name, exact: true })).toHaveAttribute(
          'aria-current',
          'page',
        );
        await page.keyboard.press('Escape');
      } else await expect(button).toHaveAttribute('aria-current', 'page');
      await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
        .toBeLessThanOrEqual(width + 1);
    }
    for (const button of await navigation.getByRole('button').all()) {
      const bounds = await button.boundingBox();
      expect(bounds).not.toBeNull();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
      expect(bounds!.height).toBeGreaterThanOrEqual(44);
    }
  }
  await navigation.getByRole('button', { name: 'Visão geral', exact: true }).click();
  await captureReadmeScreenshot(page, 'attendant-overview-mobile.png', { fullPage: true });
  await more.click();
  const close = menu.getByRole('button', { name: 'Fechar opções do atendente' });
  await expect(close).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(menu.getByRole('button', { name: 'Sair da conta' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
  await captureReadmeScreenshot(page, 'attendant-mobile-menu.png');
  await page.keyboard.press('Escape');
  await expect(menu).toHaveCount(0);
  await expect(more).toBeFocused();
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('');
});

test('atendente: todas as áreas conservam a largura no desktop e o menu rola em tela baixa', async ({
  page,
}) => {
  test.setTimeout(60000);
  await setup(page);
  await page.setViewportSize({ width: 1440, height: 480 });
  await page.goto('/attendant');
  const nav = page.getByRole('navigation', { name: 'Navegação do atendente', exact: true });
  const sidebar = nav.locator('xpath=ancestor::aside[1]');
  await sidebar.hover();
  await page.mouse.wheel(0, 3000);
  await expect(sidebar.getByRole('button', { name: 'Sair', exact: true })).toBeInViewport();
  await page.setViewportSize({ width: 1440, height: 960 });
  const main = page.getByRole('main').first();
  const count = await nav.getByRole('button').count();
  for (let index = 0; index < count; index++) {
    await nav.getByRole('button').nth(index).click();
    await expectWorkspaceWidth(main, 280);
    await page.setViewportSize({ width: 1024, height: 768 });
    await expectWorkspaceWidth(main, 280);
    await page.setViewportSize({ width: 390, height: 844 });
    await expectWorkspaceWidth(main, 0);
    await page.setViewportSize({ width: 1440, height: 960 });
  }
});
