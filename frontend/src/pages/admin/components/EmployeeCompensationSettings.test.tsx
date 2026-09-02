import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppDialogProvider } from '../../../components/AppDialog/AppDialogProvider';
import type {
  EmployeeCompensationPolicy,
  EmployeeSettlement,
} from '../../../Services/employeePaymentsService';
import type { Employee } from '../types';

const mocks = vi.hoisted(() => ({
  listPolicies: vi.fn(),
  listWorkEntries: vi.fn(),
  listEarnings: vi.fn(),
  listSettlements: vi.fn(),
  getSettlement: vi.fn(),
  generateSettlement: vi.fn(),
}));

vi.mock('../../../Services/employeePaymentsService', () => ({ default: mocks }));

import { EmployeeCompensationSettings } from './EmployeeCompensationSettings';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const now = new Date();
const periodYear = now.getFullYear();
const periodMonth = now.getMonth() + 1;

const employees: Employee[] = [
  {
    id: '21',
    name: 'Ana Cozinha',
    email: 'ana@equipe.test',
    role: 'COOK',
    active: true,
    permissions: { viewOrders: true, updateOrderStatus: true, manageQrTables: false },
  },
  {
    id: '22',
    name: 'Carla Garçom',
    email: 'carla@equipe.test',
    role: 'WAITER',
    active: true,
    permissions: { viewOrders: true, updateOrderStatus: true, manageQrTables: true },
  },
  {
    id: '23',
    name: 'Caio Motoqueiro',
    email: 'caio@equipe.test',
    role: 'COURIER',
    active: true,
    permissions: { viewOrders: true, updateOrderStatus: true, manageQrTables: false },
  },
];

const policy: EmployeeCompensationPolicy = {
  publicId: 'policy-ana-v1',
  employeeId: 21,
  baseModel: 'FIXED_MONTHLY',
  fixedMonthlyCents: 300_000,
  hourlyRateCents: null,
  variableModel: 'NONE',
  variableBasisPoints: null,
  fixedPerTableCents: null,
  prorationMode: 'CALENDAR_DAYS',
  effectiveFrom: '2026-01-01T12:00:00.000Z',
  effectiveUntil: null,
  version: 1,
  active: true,
};

const settlement: EmployeeSettlement = {
  publicId: 'settlement-ana',
  employeeId: 21,
  periodYear,
  periodMonth,
  periodStart: `${periodYear}-${String(periodMonth).padStart(2, '0')}-01T00:00:00.000Z`,
  periodEnd: `${periodYear}-${String(periodMonth).padStart(2, '0')}-28T23:59:59.999Z`,
  status: 'PARTIALLY_PAID',
  grossCreditsCents: 320_000,
  grossDebitsCents: 20_000,
  totalDueCents: 300_000,
  confirmedAt: '2026-09-28T12:00:00.000Z',
  paidAt: null,
  canceledAt: null,
  cancelReason: null,
  version: 2,
  employee: {
    id: 21,
    name: 'Ana Cozinha',
    email: 'ana@equipe.test',
    subRole: 'COZINHA',
    active: true,
  },
  payments: [
    {
      publicId: 'payment-ana-1',
      amountCents: 120_000,
      method: 'PIX',
      reference: null,
      notes: null,
      status: 'ACTIVE',
      registeredAt: '2026-09-29T12:00:00.000Z',
      reversedAt: null,
      reverseReason: null,
    },
  ],
};

async function flush() {
  await act(async () => {
    await new Promise((resolve) => window.setTimeout(resolve, 1));
  });
}

describe('remuneração dos funcionários', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listPolicies.mockResolvedValue([policy]);
    mocks.listWorkEntries.mockResolvedValue([]);
    mocks.listEarnings.mockResolvedValue([]);
    mocks.listSettlements.mockResolvedValue([settlement]);
    mocks.getSettlement.mockResolvedValue(settlement);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  async function renderSettings() {
    await act(async () =>
      root.render(
        <AppDialogProvider>
          <EmployeeCompensationSettings employees={employees} onOpenEmployees={vi.fn()} />
        </AppDialogProvider>,
      ),
    );
    await flush();
  }

  it('mostra políticas em reais e mantém motoqueiros fora do módulo', async () => {
    await renderSettings();

    expect(container.textContent).toContain('Remuneração da equipe');
    expect(container.textContent).toContain('Ana Cozinha');
    expect(container.textContent).toContain('R$ 3.000,00 / mês');
    expect(container.textContent).toContain('Carla Garçom');
    expect(container.textContent).not.toContain('Caio Motoqueiro');
  });

  it('abre um pagamento parcial somente com o saldo restante do acerto', async () => {
    await renderSettings();

    const settlementsTab = [...container.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Acertos'),
    ) as HTMLButtonElement;
    act(() => settlementsTab.click());

    const payButton = [...container.querySelectorAll('button')].find(
      (button) => button.textContent?.trim() === 'Pagar',
    ) as HTMLButtonElement;
    act(() => payButton.click());

    const dialog = container.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog.textContent).toContain('Pagamento do acerto');
    expect((dialog.querySelector('[aria-label="Valor pago"]') as HTMLInputElement).value).toBe(
      '1800.00',
    );
    expect(dialog.textContent).toContain('R$ 1.800,00');
  });

  it('permite gerar novamente um acerto cancelado pelo detalhe', async () => {
    const canceledSettlement: EmployeeSettlement = {
      ...settlement,
      status: 'CANCELED',
      grossCreditsCents: 0,
      grossDebitsCents: 0,
      totalDueCents: 0,
      confirmedAt: null,
      canceledAt: '2026-09-02T12:00:00.000Z',
      cancelReason: 'Horas incorretas',
      payments: [],
    };
    mocks.listSettlements.mockResolvedValue([canceledSettlement]);
    mocks.getSettlement.mockResolvedValue(canceledSettlement);
    mocks.generateSettlement.mockResolvedValue({
      ...canceledSettlement,
      status: 'DRAFT',
      canceledAt: null,
      cancelReason: null,
      version: canceledSettlement.version + 1,
    });
    await renderSettings();

    const settlementsTab = [...container.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Acertos'),
    ) as HTMLButtonElement;
    act(() => settlementsTab.click());
    const detailsButton = container.querySelector(
      '[aria-label="Ver acerto de Ana Cozinha"]',
    ) as HTMLButtonElement;
    await act(async () => detailsButton.click());
    await flush();

    const dialog = container.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog.textContent).toContain('Cancelado');
    expect(dialog.textContent).toContain('Voltar');
    const regenerateButton = [...dialog.querySelectorAll('button')].find(
      (button) => button.textContent?.trim() === 'Gerar novamente',
    ) as HTMLButtonElement;
    await act(async () => regenerateButton.click());

    expect(mocks.generateSettlement).toHaveBeenCalledWith({
      employeeId: 21,
      referenceMonth: `${periodYear}-${String(periodMonth).padStart(2, '0')}`,
    });
  });
});
