import { expect, test, type Page, type Route } from '@playwright/test';
import { mockAuthRefresh } from './helpers/mockAuthRefresh';

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
    if (path === '/products') return json(route, [{ id: 1, name: 'Pizza da casa', price: 49.9, stock: 10 }]);
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
    if (path === '/orders') return json(route, []);
    if (path === '/auth/logout') return json(route, { ok: true });
    return json(route, {});
  });

  await mockAuthRefresh(page, user.id, 'attendant-e2e-token');
  await page.addInitScript((sessionUser) => localStorage.setItem('user', JSON.stringify(sessionUser)), user);
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
