import { expect, test, type Page } from '@playwright/test';

import type {
  CompensationPolicyInput,
  EmployeeCompensationPerson,
  EmployeeCompensationPolicy,
  EmployeeEarning,
  EmployeeSettlement,
  EmployeeSettlementPayment,
  EmployeeWorkEntry,
} from '../src/Services/employeePaymentsService';
import { mockAuthRefresh } from './helpers/mockAuthRefresh';

type ApiEmployee = {
  id: number;
  name: string;
  email: string;
  role: 'FUNCIONARIO' | 'MOTOQUEIRO';
  subRole: 'COZINHA' | 'GARCOM' | null;
  active: boolean;
  permissions: { manageQrTables: boolean };
};

type TestState = {
  employees: ApiEmployee[];
  policies: EmployeeCompensationPolicy[];
  workEntries: EmployeeWorkEntry[];
  earnings: EmployeeEarning[];
  settlements: EmployeeSettlement[];
  policyPayload: ({ employeeId: number } & CompensationPolicyInput) | null;
  paymentPayload: {
    settlementPublicId: string;
    amountCents: number;
    method: string;
    reference?: string;
    idempotencyKey: string;
  } | null;
  reversePayload: { paymentPublicId: string; reason: string } | null;
};

function testMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function person(employee: ApiEmployee): EmployeeCompensationPerson {
  return {
    id: employee.id,
    name: employee.name,
    email: employee.email,
    subRole:
      employee.subRole === null && employee.role === 'FUNCIONARIO' ? 'ATENDENTE' : employee.subRole,
    active: employee.active,
  };
}

function initialState(): TestState {
  const [periodYear, periodMonth] = testMonth().split('-').map(Number);
  const employees: ApiEmployee[] = [
    {
      id: 21,
      name: 'Ana Cozinha',
      email: 'ana@equipe.test',
      role: 'FUNCIONARIO',
      subRole: 'COZINHA',
      active: true,
      permissions: { manageQrTables: false },
    },
    {
      id: 22,
      name: 'Bruno Atendimento',
      email: 'bruno@equipe.test',
      role: 'FUNCIONARIO',
      subRole: null,
      active: true,
      permissions: { manageQrTables: false },
    },
    {
      id: 23,
      name: 'Carla Garçom',
      email: 'carla@equipe.test',
      role: 'FUNCIONARIO',
      subRole: 'GARCOM',
      active: true,
      permissions: { manageQrTables: true },
    },
    {
      id: 24,
      name: 'Caio Motoqueiro',
      email: 'caio@equipe.test',
      role: 'MOTOQUEIRO',
      subRole: null,
      active: true,
      permissions: { manageQrTables: false },
    },
  ];
  const ana = person(employees[0]);
  const carla = person(employees[2]);
  const occurredAt = `${testMonth()}-15T12:00:00.000Z`;
  const earnings: EmployeeEarning[] = [
    {
      publicId: 'earning-ana-base',
      employeeId: 21,
      type: 'FIXED_MONTHLY',
      direction: 'CREDIT',
      amountCents: 300_000,
      sourceType: 'MONTHLY_BASE',
      sourcePublicId: 'policy-ana-v1',
      policyVersion: 1,
      financialBaseCents: null,
      appliedBasisPoints: null,
      occurredAt,
      settledAt: occurredAt,
      employee: ana,
    },
    {
      publicId: 'earning-ana-bonus',
      employeeId: 21,
      type: 'BONUS',
      direction: 'CREDIT',
      amountCents: 20_000,
      sourceType: 'MANUAL_ADJUSTMENT',
      sourcePublicId: null,
      policyVersion: null,
      financialBaseCents: null,
      appliedBasisPoints: null,
      occurredAt,
      settledAt: occurredAt,
      employee: ana,
    },
    {
      publicId: 'earning-ana-advance',
      employeeId: 21,
      type: 'ADVANCE',
      direction: 'DEBIT',
      amountCents: 20_000,
      sourceType: 'MANUAL_ADJUSTMENT',
      sourcePublicId: null,
      policyVersion: null,
      financialBaseCents: null,
      appliedBasisPoints: null,
      occurredAt,
      settledAt: occurredAt,
      employee: ana,
    },
  ];
  const firstPayment: EmployeeSettlementPayment = {
    publicId: 'payment-ana-first',
    amountCents: 120_000,
    method: 'PIX',
    reference: 'pix-primeira-parcela',
    notes: null,
    status: 'ACTIVE',
    registeredAt: `${testMonth()}-20T12:00:00.000Z`,
    reversedAt: null,
    reverseReason: null,
  };
  const settlement: EmployeeSettlement = {
    publicId: 'settlement-ana',
    employeeId: 21,
    periodYear,
    periodMonth,
    periodStart: `${testMonth()}-01T00:00:00.000Z`,
    periodEnd: `${testMonth()}-28T23:59:59.999Z`,
    status: 'PARTIALLY_PAID',
    grossCreditsCents: 320_000,
    grossDebitsCents: 20_000,
    totalDueCents: 300_000,
    confirmedAt: `${testMonth()}-19T12:00:00.000Z`,
    paidAt: null,
    canceledAt: null,
    cancelReason: null,
    version: 2,
    employee: ana,
    items: earnings.map((earning, index) => ({
      publicId: `settlement-item-${index + 1}`,
      typeSnapshot: earning.type,
      directionSnapshot: earning.direction,
      amountCentsSnapshot: earning.amountCents,
      active: true,
      earning,
    })),
    payments: [firstPayment],
  };

  return {
    employees,
    policies: [
      {
        publicId: 'policy-ana-v1',
        employeeId: 21,
        baseModel: 'FIXED_MONTHLY',
        fixedMonthlyCents: 300_000,
        hourlyRateCents: null,
        variableModel: 'NONE',
        variableBasisPoints: null,
        fixedPerTableCents: null,
        prorationMode: 'CALENDAR_DAYS',
        effectiveFrom: '2025-01-01T12:00:00.000Z',
        effectiveUntil: null,
        version: 1,
        active: true,
        employee: ana,
      },
      {
        publicId: 'policy-carla-v1',
        employeeId: 23,
        baseModel: 'NONE',
        fixedMonthlyCents: null,
        hourlyRateCents: null,
        variableModel: 'SERVICE_FEE_PERCENTAGE',
        variableBasisPoints: 6_000,
        fixedPerTableCents: null,
        prorationMode: 'NONE',
        effectiveFrom: '2025-01-01T12:00:00.000Z',
        effectiveUntil: null,
        version: 1,
        active: true,
        employee: carla,
      },
    ],
    workEntries: [],
    earnings,
    settlements: [settlement],
    policyPayload: null,
    paymentPayload: null,
    reversePayload: null,
  };
}

async function fulfillJson(
  route: Parameters<Parameters<Page['route']>[1]>[0],
  body: unknown,
  status = 200,
) {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

function activePaidCents(settlement: EmployeeSettlement) {
  return settlement.payments
    .filter((payment) => payment.status === 'ACTIVE')
    .reduce((total, payment) => total + payment.amountCents, 0);
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

    if (pathname === '/employee-compensation/admin/policies' && method === 'GET') {
      await fulfillJson(route, state.policies);
      return;
    }
    if (pathname === '/employee-compensation/admin/work-entries' && method === 'GET') {
      await fulfillJson(route, state.workEntries);
      return;
    }
    if (pathname === '/employee-compensation/admin/earnings' && method === 'GET') {
      await fulfillJson(route, state.earnings);
      return;
    }
    if (pathname === '/employee-compensation/admin/settlements' && method === 'GET') {
      await fulfillJson(route, state.settlements);
      return;
    }

    const policyMatch = pathname.match(
      /^\/employee-compensation\/admin\/employees\/(\d+)\/policies$/,
    );
    if (policyMatch && method === 'POST') {
      const employeeId = Number(policyMatch[1]);
      const payload = request.postDataJSON() as CompensationPolicyInput;
      const employee = state.employees.find((item) => item.id === employeeId);
      if (!employee) throw new Error('Employee fixture was not found.');
      state.policyPayload = { employeeId, ...payload };
      const created: EmployeeCompensationPolicy = {
        publicId: `policy-${employeeId}-v1`,
        employeeId,
        baseModel: payload.baseModel,
        fixedMonthlyCents: payload.fixedMonthlyCents ?? null,
        hourlyRateCents: payload.hourlyRateCents ?? null,
        variableModel: payload.variableModel,
        variableBasisPoints: payload.variableBasisPoints ?? null,
        fixedPerTableCents: payload.fixedPerTableCents ?? null,
        prorationMode: payload.prorationMode,
        effectiveFrom: payload.effectiveFrom,
        effectiveUntil: payload.effectiveUntil ?? null,
        version: 1,
        active: true,
        employee: person(employee),
      };
      state.policies = [created, ...state.policies];
      await fulfillJson(route, created, 201);
      return;
    }

    const settlementDetailMatch = pathname.match(
      /^\/employee-compensation\/admin\/settlements\/([^/]+)$/,
    );
    if (settlementDetailMatch && method === 'GET') {
      const settlement = state.settlements.find(
        (item) => item.publicId === settlementDetailMatch[1],
      );
      await fulfillJson(route, settlement ?? {}, settlement ? 200 : 404);
      return;
    }

    const paymentMatch = pathname.match(
      /^\/employee-compensation\/admin\/settlements\/([^/]+)\/payments$/,
    );
    if (paymentMatch && method === 'POST') {
      const settlementPublicId = paymentMatch[1];
      const payload = request.postDataJSON() as {
        amountCents: number;
        method: EmployeeSettlementPayment['method'];
        reference?: string;
        notes?: string;
      };
      const idempotencyKey = request.headers()['idempotency-key'] || '';
      const current = state.settlements.find((item) => item.publicId === settlementPublicId);
      if (!current) throw new Error('Settlement fixture was not found.');
      const payment: EmployeeSettlementPayment = {
        publicId: 'payment-ana-final',
        amountCents: payload.amountCents,
        method: payload.method,
        reference: payload.reference || null,
        notes: payload.notes || null,
        status: 'ACTIVE',
        registeredAt: new Date().toISOString(),
        reversedAt: null,
        reverseReason: null,
      };
      const nextPaid = activePaidCents(current) + payment.amountCents;
      const updated: EmployeeSettlement = {
        ...current,
        status: nextPaid >= current.totalDueCents ? 'PAID' : 'PARTIALLY_PAID',
        paidAt: nextPaid >= current.totalDueCents ? new Date().toISOString() : null,
        version: current.version + 1,
        payments: [...current.payments, payment],
      };
      state.paymentPayload = {
        settlementPublicId,
        ...payload,
        idempotencyKey,
      };
      state.settlements = state.settlements.map((item) =>
        item.publicId === settlementPublicId ? updated : item,
      );
      await fulfillJson(route, { payment, settlement: updated, idempotentReplay: false }, 201);
      return;
    }

    const reverseMatch = pathname.match(
      /^\/employee-compensation\/admin\/payments\/([^/]+)\/reverse$/,
    );
    if (reverseMatch && method === 'POST') {
      const paymentPublicId = reverseMatch[1];
      const payload = request.postDataJSON() as { reason: string };
      const current = state.settlements.find((item) =>
        item.payments.some((payment) => payment.publicId === paymentPublicId),
      );
      if (!current) throw new Error('Payment fixture was not found.');
      const payments = current.payments.map((payment) =>
        payment.publicId === paymentPublicId
          ? {
              ...payment,
              status: 'REVERSED' as const,
              reversedAt: new Date().toISOString(),
              reverseReason: payload.reason,
            }
          : payment,
      );
      const paid = payments
        .filter((payment) => payment.status === 'ACTIVE')
        .reduce((total, payment) => total + payment.amountCents, 0);
      const updated: EmployeeSettlement = {
        ...current,
        status:
          paid === 0 ? 'CONFIRMED' : paid >= current.totalDueCents ? 'PAID' : 'PARTIALLY_PAID',
        paidAt: paid >= current.totalDueCents ? current.paidAt : null,
        version: current.version + 1,
        payments,
      };
      const reversed = payments.find((payment) => payment.publicId === paymentPublicId);
      state.reversePayload = { paymentPublicId, reason: payload.reason };
      state.settlements = state.settlements.map((item) =>
        item.publicId === current.publicId ? updated : item,
      );
      await fulfillJson(route, { payment: reversed, settlement: updated });
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
      '/employees': state.employees,
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

async function openEmployeeCompensation(page: Page, mobile = false) {
  await page.goto('/admin');
  if (mobile) await page.getByRole('button', { name: 'Abrir menu administrativo' }).click();
  await page.getByRole('button', { name: 'Configurações' }).click();
  await page.getByRole('button', { name: 'Pagamento dos funcionários', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Remuneração da equipe' })).toBeVisible();
  await expect(page.getByText('Ana Cozinha', { exact: true }).first()).toBeVisible();
}

test('admin versiona política, quita acerto parcial e reverte o pagamento', async ({
  page,
}, testInfo) => {
  const state = initialState();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await mockAdminApi(page, state);
  await openEmployeeCompensation(page);

  await expect(page.getByText('Caio Motoqueiro')).toHaveCount(0);
  const brunoRow = page.locator('.policy-row').filter({ hasText: 'Bruno Atendimento' });
  await brunoRow.getByRole('button', { name: 'Configurar' }).click();
  const policyDialog = page.getByRole('dialog');
  await policyDialog.getByLabel('Valor mensal').fill('2500');
  await policyDialog.getByRole('button', { name: 'Criar versão' }).click();
  await expect
    .poll(() => state.policyPayload)
    .toMatchObject({
      employeeId: 22,
      baseModel: 'FIXED_MONTHLY',
      fixedMonthlyCents: 250_000,
      variableModel: 'NONE',
    });
  await expect(brunoRow).toContainText('R$ 2.500,00 / mês');

  await page.getByRole('tab', { name: /Acertos/ }).click();
  const anaRow = page.locator('.settlement-row').filter({ hasText: 'Ana Cozinha' });
  await expect(anaRow).toContainText('Pago parcialmente');
  await expect(anaRow).toContainText('R$ 1.800,00 restante');
  await anaRow.getByRole('button', { name: 'Pagar' }).click();

  const paymentDialog = page.getByRole('dialog');
  await expect(paymentDialog.getByLabel('Valor pago')).toHaveValue('1800.00');
  await paymentDialog.getByLabel('Referência do pagamento').fill('pix-saldo-final');
  await page.screenshot({
    path: testInfo.outputPath('employee-compensation-payment-desktop.png'),
    fullPage: true,
  });
  await paymentDialog.getByRole('button', { name: 'Registrar pagamento' }).click();
  await expect
    .poll(() => state.paymentPayload)
    .toMatchObject({
      settlementPublicId: 'settlement-ana',
      amountCents: 180_000,
      method: 'PIX',
      reference: 'pix-saldo-final',
    });
  expect(state.paymentPayload?.idempotencyKey).not.toBe('');
  await expect(anaRow).toContainText('Pago');

  await anaRow.getByRole('button', { name: 'Ver acerto de Ana Cozinha' }).click();
  const detailDialog = page.getByRole('dialog');
  await expect(detailDialog).toContainText('Composição do acerto');
  await expect(detailDialog).toContainText('Bônus');
  await expect(detailDialog).toContainText('pix-saldo-final');
  await page.screenshot({
    path: testInfo.outputPath('employee-compensation-settlement-desktop.png'),
    fullPage: true,
  });

  await detailDialog
    .getByRole('button', { name: 'Reverter pagamento de Ana Cozinha' })
    .last()
    .click();
  const reverseDialog = page.getByRole('dialog');
  await reverseDialog.getByLabel('Motivo da operação').fill('Comprovante bancário estornado');
  await reverseDialog.getByRole('button', { name: 'Confirmar' }).click();
  await expect
    .poll(() => state.reversePayload)
    .toEqual({
      paymentPublicId: 'payment-ana-final',
      reason: 'Comprovante bancário estornado',
    });
  await expect(anaRow).toContainText('Pago parcialmente');
});

test('workspace e folha de pagamento permanecem contidos no celular', async ({
  page,
}, testInfo) => {
  const state = initialState();
  await page.setViewportSize({ width: 390, height: 844 });
  await mockAdminApi(page, state);
  await openEmployeeCompensation(page, true);

  await page.getByRole('tab', { name: /Acertos/ }).click();
  const anaRow = page.locator('.settlement-row').filter({ hasText: 'Ana Cozinha' });
  await anaRow.getByRole('button', { name: 'Pagar' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  const layout = await page.evaluate(() => {
    const workspace = document.querySelector<HTMLElement>('[aria-busy]');
    const paymentDialog = document.querySelector<HTMLElement>('[role="dialog"]');
    const workspaceBounds = workspace?.getBoundingClientRect();
    const dialogBounds = paymentDialog?.getBoundingClientRect();
    return {
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      workspaceLeft: workspaceBounds?.left,
      workspaceRight: workspaceBounds?.right,
      dialogLeft: dialogBounds?.left,
      dialogRight: dialogBounds?.right,
    };
  });
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth + 1);
  expect(layout.workspaceLeft).toBeGreaterThanOrEqual(-1);
  expect(layout.workspaceRight).toBeLessThanOrEqual(layout.clientWidth + 1);
  expect(layout.dialogLeft).toBeGreaterThanOrEqual(-1);
  expect(layout.dialogRight).toBeLessThanOrEqual(layout.clientWidth + 1);
  await page.screenshot({
    path: testInfo.outputPath('employee-compensation-mobile.png'),
    fullPage: true,
  });
});
