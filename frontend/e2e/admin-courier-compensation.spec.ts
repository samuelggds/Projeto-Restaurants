import { expect, test, type Page } from '@playwright/test';

import type {
  CompensationPolicy,
  CourierConfiguration,
  CourierSettlement,
  PendingCourierOrder,
} from '../src/Services/courierCompensationService';
import { mockAuthRefresh } from './helpers/mockAuthRefresh';

type SettlementPayload = {
  courierId: number;
  orderIds: number[];
  paymentMethod: string;
  adminNote?: string;
};

type TestState = {
  configuration: CourierConfiguration;
  pending: PendingCourierOrder[];
  settlements: CourierSettlement[];
  defaultPayload: (CompensationPolicy & { timezone: string }) | null;
  overridePayload: { courierId: number; policy: CompensationPolicy } | null;
  settlementPayload: SettlementPayload | null;
};

const fixedPolicy = (amount: number): CompensationPolicy => ({
  model: 'FIXED_PER_DELIVERY',
  fixedAmount: amount,
  baseAmount: 0,
  includedDistanceMeters: 0,
  extraPerKmAmount: 0,
  ranges: [{ maxDistanceMeters: 3000, amount: 0 }],
});

function initialState(): TestState {
  return {
    configuration: {
      timezone: 'America/Sao_Paulo',
      defaultPolicy: fixedPolicy(8),
      couriers: [
        {
          id: 31,
          name: 'Bruno Entregas',
          email: 'bruno@entregas.test',
          active: true,
          override: null,
        },
        {
          id: 32,
          name: 'Carla Rápida',
          email: 'carla@entregas.test',
          active: true,
          override: fixedPolicy(10),
        },
      ],
    },
    pending: [
      {
        id: 1401,
        publicId: 'order-1401',
        assignedCourierId: 31,
        courierEarning: 8.5,
        cashCollectedAmount: 20,
        total: 74,
        deliveredAt: '2026-07-09T18:20:00.000Z',
        district: 'Centro',
        city: 'São Paulo',
        assignedCourier: { id: 31, name: 'Bruno Entregas' },
      },
      {
        id: 1402,
        publicId: 'order-1402',
        assignedCourierId: 31,
        courierEarning: 10,
        cashCollectedAmount: 0,
        total: 58,
        deliveredAt: '2026-07-09T19:05:00.000Z',
        district: 'Bela Vista',
        city: 'São Paulo',
        assignedCourier: { id: 31, name: 'Bruno Entregas' },
      },
      {
        id: 1403,
        publicId: 'order-1403',
        assignedCourierId: 32,
        courierEarning: 12,
        cashCollectedAmount: 0,
        total: 86,
        deliveredAt: '2026-07-09T19:35:00.000Z',
        district: 'Liberdade',
        city: 'São Paulo',
        assignedCourier: { id: 32, name: 'Carla Rápida' },
      },
    ],
    settlements: [
      {
        publicId: 'settlement-existing',
        status: 'AWAITING_COURIER_CONFIRMATION',
        grossCourierEarnings: 12,
        cashCollectedAmount: 0,
        netAmount: 12,
        direction: 'RESTAURANT_PAYS_COURIER',
        createdAt: '2026-07-08T21:00:00.000Z',
        courier: { id: 32, name: 'Carla Rápida', email: 'carla@entregas.test' },
        items: [{ orderId: 1398 }],
      },
    ],
    defaultPayload: null,
    overridePayload: null,
    settlementPayload: null,
  };
}

async function fulfillJson(route: Parameters<Parameters<Page['route']>[1]>[0], body: unknown) {
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
}

async function mockAdminApi(page: Page, state: TestState) {
  await page.route(/^http:\/\/(127\.0\.0\.1|localhost):3000\/.*$/, async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    const method = request.method();

    if (pathname === '/auth/me') {
      await fulfillJson(route, {
        user: { id: 9, name: 'Admin Teste', role: 'ADMIN', restaurantId: 9 },
      });
      return;
    }

    if (pathname === '/courier-compensation/admin/configuration' && method === 'GET') {
      await fulfillJson(route, state.configuration);
      return;
    }

    if (pathname === '/courier-compensation/admin/configuration' && method === 'PUT') {
      const payload = request.postDataJSON() as CompensationPolicy & { timezone: string };
      const { timezone, ...policy } = payload;
      state.defaultPayload = payload;
      state.configuration = { ...state.configuration, timezone, defaultPolicy: policy };
      await fulfillJson(route, state.configuration);
      return;
    }

    const courierRuleMatch = pathname.match(
      /^\/courier-compensation\/admin\/couriers\/(\d+)\/rule$/,
    );
    if (courierRuleMatch && method === 'PUT') {
      const courierId = Number(courierRuleMatch[1]);
      const policy = request.postDataJSON() as CompensationPolicy;
      state.overridePayload = { courierId, policy };
      state.configuration = {
        ...state.configuration,
        couriers: state.configuration.couriers.map((courier) =>
          courier.id === courierId ? { ...courier, override: policy } : courier,
        ),
      };
      await fulfillJson(route, policy);
      return;
    }

    if (pathname === '/courier-compensation/admin/pending-orders' && method === 'GET') {
      await fulfillJson(route, state.pending);
      return;
    }

    if (pathname === '/courier-compensation/admin/settlements' && method === 'GET') {
      await fulfillJson(route, state.settlements);
      return;
    }

    if (pathname === '/courier-compensation/admin/settlements' && method === 'POST') {
      const payload = request.postDataJSON() as SettlementPayload;
      const selectedOrders = state.pending.filter((order) => payload.orderIds.includes(order.id));
      const grossCourierEarnings = selectedOrders.reduce(
        (total, order) => total + order.courierEarning,
        0,
      );
      const cashCollectedAmount = selectedOrders.reduce(
        (total, order) => total + order.cashCollectedAmount,
        0,
      );
      const courier = state.configuration.couriers.find((item) => item.id === payload.courierId);
      if (!courier) throw new Error('Courier fixture was not found.');

      const settlement: CourierSettlement = {
        publicId: 'settlement-created',
        status: 'AWAITING_COURIER_CONFIRMATION',
        grossCourierEarnings,
        cashCollectedAmount,
        netAmount: grossCourierEarnings - cashCollectedAmount,
        direction: 'COURIER_RETURNS_CASH',
        createdAt: '2026-07-09T20:00:00.000Z',
        courier,
        items: payload.orderIds.map((orderId) => ({ orderId })),
      };
      state.settlementPayload = payload;
      state.pending = state.pending.filter((order) => !payload.orderIds.includes(order.id));
      state.settlements = [settlement, ...state.settlements];
      await fulfillJson(route, settlement);
      return;
    }

    const responses: Record<string, unknown> = {
      '/orders': { orders: [] },
      '/products': { products: [] },
      '/ingredients': { ingredients: [] },
      '/categories': { categories: [] },
      '/settings': { id: 1, restaurant: { id: 9, name: 'Restaurante Teste' } },
      '/coupons': { coupons: [] },
      '/billing/invoices': { invoices: [] },
      '/banners': [],
      '/employees': [],
    };
    await fulfillJson(route, responses[pathname] ?? {});
  });

  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem(
      'user',
      JSON.stringify({ id: 9, name: 'Admin Teste', role: 'ADMIN', restaurantId: 9 }),
    );
  });
  await mockAuthRefresh(page, 9, 'e2e-admin-token');
}

async function openCourierPayments(page: Page, mobile = false) {
  await page.goto('/admin');
  if (mobile) await page.getByRole('button', { name: 'Abrir menu administrativo' }).click();
  await page.getByRole('button', { name: 'Configurações' }).click();
  await page.getByRole('button', { name: 'Pagamento dos motoqueiros', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Pagamento dos motoqueiros' })).toBeVisible();
}

test('admin configura ganhos e fecha acerto com cálculo conferido', async ({ page }, testInfo) => {
  const state = initialState();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await mockAdminApi(page, state);
  await openCourierPayments(page);

  await expect(page.getByText('2', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('3', { exact: true }).first()).toBeVisible();
  const defaultRule = page.locator('.default-rule-panel');
  await defaultRule.getByRole('radio', { name: /Base \+ quilômetro/ }).click();
  await defaultRule.getByLabel('Valor base').fill('5');
  await defaultRule.getByLabel('Distância incluída').fill('3000');
  await defaultRule.getByLabel('Adicional por km').fill('1.75');
  await page.getByLabel('Fuso horário dos relatórios').fill('America/Fortaleza');
  await page.getByRole('button', { name: 'Salvar regra padrão' }).click();

  await expect
    .poll(() => state.defaultPayload)
    .toMatchObject({
      model: 'BASE_PLUS_DISTANCE',
      baseAmount: 5,
      includedDistanceMeters: 3000,
      extraPerKmAmount: 1.75,
      timezone: 'America/Fortaleza',
    });

  const overrideRule = page.locator('.override-panel');
  await expect(overrideRule.getByText('Usando a regra padrão')).toBeVisible();
  await overrideRule.getByRole('radio', { name: /Valor fixo/ }).click();
  await overrideRule.getByLabel('Valor por entrega').fill('11.50');
  await page.getByRole('button', { name: 'Salvar regra exclusiva' }).click();
  await expect
    .poll(() => state.overridePayload)
    .toMatchObject({
      courierId: 31,
      policy: { model: 'FIXED_PER_DELIVERY', fixedAmount: 11.5 },
    });

  await page.screenshot({ path: testInfo.outputPath('courier-rules-desktop.png'), fullPage: true });
  await page.getByRole('tab', { name: /Acertos e conferência/ }).click();
  await page.getByRole('button', { name: 'Selecionar todas' }).click();

  const checkout = page.locator('aside').filter({ hasText: 'Resumo do acerto' });
  await expect(checkout.getByText('R$ 18,50')).toBeVisible();
  await expect(checkout.getByText('- R$ 20,00')).toBeVisible();
  await expect(checkout.getByText(/-R\$\s*1,50/)).toBeVisible();
  await expect(checkout.getByText('Motoqueiro devolve ao restaurante')).toBeVisible();
  await page.getByLabel('Observação opcional').fill('Dinheiro conferido no caixa');
  await page.screenshot({
    path: testInfo.outputPath('courier-settlement-desktop.png'),
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Declarar acerto' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Declarar acerto' }).click();

  await expect
    .poll(() => state.settlementPayload)
    .toEqual({
      courierId: 31,
      orderIds: [1401, 1402],
      paymentMethod: 'PIX',
      adminNote: 'Dinheiro conferido no caixa',
    });
  await expect(page.getByText('Acerto enviado para confirmação do motoqueiro.')).toBeVisible();
  await expect(page.getByText('Bruno Entregas').last()).toBeVisible();
});

test('pagamento dos motoqueiros permanece contido no celular', async ({ page }, testInfo) => {
  const state = initialState();
  await page.setViewportSize({ width: 390, height: 844 });
  await mockAdminApi(page, state);
  await openCourierPayments(page, true);

  await page.getByRole('tab', { name: /Acertos e conferência/ }).click();
  await page.getByText('Pedido #1401').click();
  await expect(page.getByText('Motoqueiro devolve ao restaurante')).toBeVisible();

  const layout = await page.locator('main').evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const overflowing = [...element.querySelectorAll<HTMLElement>('*')]
      .filter((child) => {
        const childBounds = child.getBoundingClientRect();
        return childBounds.right > bounds.right + 1 && childBounds.left < bounds.right;
      })
      .map((child) => ({
        className: child.className,
        tagName: child.tagName,
        left: child.getBoundingClientRect().left,
        right: child.getBoundingClientRect().right,
      }));
    return { clientWidth: element.clientWidth, scrollWidth: element.scrollWidth, overflowing };
  });
  expect(layout.scrollWidth, JSON.stringify(layout.overflowing)).toBeLessThanOrEqual(
    layout.clientWidth + 1,
  );
  await page.screenshot({
    path: testInfo.outputPath('courier-settlement-mobile.png'),
    fullPage: true,
  });
});
