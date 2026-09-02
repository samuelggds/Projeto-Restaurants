import type {
  EmployeeCompensationBaseModel,
  EmployeeCompensationPolicy,
  EmployeeCompensationProrationMode,
  EmployeeCompensationVariableModel,
  EmployeeEarningDirection,
  EmployeeEarningType,
  EmployeeSettlement,
  EmployeeSettlementPaymentMethod,
  EmployeeSettlementStatus,
  EmployeeWorkEntryStatus,
} from '../../../Services/employeePaymentsService';
import type { Employee } from '../types';

export type View = 'policies' | 'hours' | 'settlements' | 'ledger';
export type ManualAdjustmentType = 'BONUS' | 'DEDUCTION' | 'ADVANCE' | 'CORRECTION';
export type StaffEmployee = Employee & { numericId: number };
export type ReasonAction = 'cancel-work' | 'cancel-settlement' | 'reverse-payment';
export type ModalState =
  | { kind: 'policy'; employee: StaffEmployee }
  | { kind: 'work'; employee?: StaffEmployee }
  | { kind: 'adjustment'; employee?: StaffEmployee }
  | { kind: 'settlement'; settlement: EmployeeSettlement }
  | { kind: 'payment'; settlement: EmployeeSettlement }
  | { kind: 'reason'; action: ReasonAction; publicId: string; subject: string }
  | null;

export type EmployeeCompensationSettingsProps = {
  employees: Employee[];
  onOpenEmployees: () => void;
};

export type PolicyDraft = {
  baseModel: EmployeeCompensationBaseModel;
  baseValue: string;
  prorationMode: EmployeeCompensationProrationMode;
  variableModel: EmployeeCompensationVariableModel;
  variableValue: string;
  effectiveFrom: string;
};

export type WorkDraft = {
  employeeId: string;
  workDate: string;
  hours: string;
  minutes: string;
};

export type AdjustmentDraft = {
  employeeId: string;
  type: ManualAdjustmentType;
  direction: EmployeeEarningDirection;
  amount: string;
  occurredAt: string;
  reason: string;
  idempotencyKey: string;
};

export type PaymentDraft = {
  amount: string;
  method: EmployeeSettlementPaymentMethod;
  reference: string;
  notes: string;
  idempotencyKey: string;
};

export const baseModelLabel: Record<EmployeeCompensationBaseModel, string> = {
  NONE: 'Sem valor-base',
  FIXED_MONTHLY: 'Mensal fixo',
  HOURLY: 'Por hora',
};

export const variableModelLabel: Record<EmployeeCompensationVariableModel, string> = {
  NONE: 'Sem comissão de mesa',
  SERVICE_FEE_PERCENTAGE: '% da taxa de serviço',
  FIXED_PER_TABLE: 'Valor fixo por mesa',
  TABLE_SALES_PERCENTAGE: '% das vendas da mesa',
};

export const workStatusMeta: Record<EmployeeWorkEntryStatus, { label: string; tone: string }> = {
  DRAFT: { label: 'Rascunho', tone: 'warning' },
  APPROVED: { label: 'Aprovado', tone: 'success' },
  CANCELED: { label: 'Cancelado', tone: 'neutral' },
};

export const settlementStatusMeta: Record<
  EmployeeSettlementStatus,
  { label: string; tone: string }
> = {
  DRAFT: { label: 'Rascunho', tone: 'neutral' },
  CONFIRMED: { label: 'Confirmado', tone: 'warning' },
  PARTIALLY_PAID: { label: 'Pago parcialmente', tone: 'info' },
  PAID: { label: 'Pago', tone: 'success' },
  CANCELED: { label: 'Cancelado', tone: 'neutral' },
};

export const earningTypeLabel: Record<EmployeeEarningType, string> = {
  FIXED_MONTHLY: 'Base mensal',
  HOURLY: 'Horas aprovadas',
  WAITER_SERVICE_FEE: 'Comissão sobre serviço',
  WAITER_TABLE_FIXED: 'Comissão por mesa',
  WAITER_TABLE_SALES: 'Comissão sobre vendas',
  BONUS: 'Bônus',
  DEDUCTION: 'Desconto',
  ADVANCE: 'Adiantamento',
  CORRECTION: 'Correção',
  REFUND_REVERSAL: 'Reversão de reembolso',
};

export const sourceLabel: Record<string, string> = {
  MONTHLY_BASE: 'Política mensal',
  WORK_ENTRY: 'Lançamento de horas',
  TABLE_SESSION: 'Conta da mesa',
  MANUAL_ADJUSTMENT: 'Ajuste manual',
  REFUND_REVERSAL: 'Reembolso da mesa',
};

export const paymentMethodLabel: Record<EmployeeSettlementPaymentMethod, string> = {
  PIX: 'PIX',
  CASH: 'Dinheiro',
  BANK_TRANSFER: 'Transferência bancária',
  OTHER: 'Outro',
};

export function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function localDate() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

export function nextPolicyDate(policy?: EmployeeCompensationPolicy) {
  if (!policy) return localDate();
  const today = new Date(`${localDate()}T12:00:00.000Z`);
  const afterCurrent = new Date(new Date(policy.effectiveFrom).getTime() + 24 * 60 * 60 * 1000);
  return new Date(Math.max(today.getTime(), afterCurrent.getTime())).toISOString().slice(0, 10);
}

export function idempotencyKey() {
  return globalThis.crypto?.randomUUID?.() || `employee-${Date.now()}-${Math.random()}`;
}

export function monthLabel(value: string) {
  const [year, month] = value.split('-').map(Number);
  if (!year || !month) return value;
  const label = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(
    new Date(year, month - 1, 1),
  );
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function money(cents: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

export function moneyInput(cents: number | null | undefined) {
  return cents === null || cents === undefined ? '' : (cents / 100).toFixed(2);
}

export function parseScaledDecimal(value: string, scale: number, positive = false) {
  const compact = value.trim().replace(/\s/g, '');
  const normalized = compact.includes(',') ? compact.replace(/\./g, '').replace(',', '.') : compact;
  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) return null;
  const [whole, fraction = ''] = normalized.split('.');
  const scaled = Number(BigInt(whole) * BigInt(scale) + BigInt(fraction.padEnd(2, '0')));
  if (!Number.isSafeInteger(scaled) || (positive ? scaled <= 0 : scaled < 0)) return null;
  return scaled;
}

export function shortDate(value: string | null | undefined) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value));
}

export function shortDateTime(value: string | null | undefined) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function duration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (!hours) return `${remaining} min`;
  return remaining ? `${hours}h ${remaining}min` : `${hours}h`;
}

export function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function roleLabel(role: Employee['role']) {
  if (role === 'COOK') return 'Cozinha';
  if (role === 'WAITER') return 'Garçom';
  if (role === 'ATTENDANT') return 'Atendimento';
  return 'Motoqueiro';
}

export function errorMessage(error: unknown, fallback = 'Não foi possível concluir a operação.') {
  const requestError = error as { response?: { data?: { error?: string } }; message?: string };
  return requestError.response?.data?.error || requestError.message || fallback;
}

export function activePaidCents(settlement: EmployeeSettlement) {
  return settlement.payments
    .filter((payment) => payment.status === 'ACTIVE')
    .reduce((total, payment) => total + payment.amountCents, 0);
}

export function policyBase(policy?: EmployeeCompensationPolicy) {
  if (!policy || policy.baseModel === 'NONE') return 'Sem valor-base';
  if (policy.baseModel === 'FIXED_MONTHLY') return `${money(policy.fixedMonthlyCents || 0)} / mês`;
  return `${money(policy.hourlyRateCents || 0)} / hora`;
}

export function policyVariable(policy?: EmployeeCompensationPolicy) {
  if (!policy || policy.variableModel === 'NONE') return 'Sem comissão';
  if (policy.variableModel === 'FIXED_PER_TABLE') {
    return `${money(policy.fixedPerTableCents || 0)} / mesa`;
  }
  return `${((policy.variableBasisPoints || 0) / 100).toLocaleString('pt-BR', {
    maximumFractionDigits: 2,
  })}% · ${variableModelLabel[policy.variableModel].replace('% ', '')}`;
}
