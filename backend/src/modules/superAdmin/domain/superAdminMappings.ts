import type { InvoiceStatus, SubscriptionStatus, SupportChatSenderRole } from '@prisma/client';
import { deriveSupportConversationStatus } from '../../aiSupport/domain/supportConversation.js';

export type TenantStatus = 'ACTIVE' | 'TRIAL' | 'OVERDUE' | 'BLOCKED' | 'CANCELED';
export type PublicInvoiceStatus = 'PAID' | 'PENDING' | 'OVERDUE' | 'CANCELED';
export type SupportTicketStatus = 'OPEN' | 'WAITING_CUSTOMER';

export function deriveTenantStatus(input: {
  active: boolean;
  subscriptionStatus?: SubscriptionStatus | null;
  hasOverdueInvoice?: boolean;
}): TenantStatus {
  if (input.subscriptionStatus === 'CANCELADA') return 'CANCELED';
  if (input.hasOverdueInvoice) return 'OVERDUE';
  if (!input.active) return 'BLOCKED';
  if (!input.subscriptionStatus || input.subscriptionStatus === 'TESTE') return 'TRIAL';
  if (input.subscriptionStatus === 'EXPIRADA') return 'BLOCKED';
  return 'ACTIVE';
}

export function mapInvoiceStatus(status: InvoiceStatus): PublicInvoiceStatus {
  const statuses: Record<InvoiceStatus, PublicInvoiceStatus> = {
    PAGO: 'PAID',
    PENDENTE: 'PENDING',
    ATRASADO: 'OVERDUE',
    CANCELADO: 'CANCELED',
  };
  return statuses[status];
}

export function deriveSupportTicketStatus(
  lastSenderRole: SupportChatSenderRole | string,
): SupportTicketStatus {
  return deriveSupportConversationStatus(lastSenderRole);
}

export function decimalToNumber(value: unknown) {
  const result = Number(value ?? 0);
  return Number.isFinite(result) ? result : 0;
}

export function toIso(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function planFeatures(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

export function monthBuckets(now: Date, amount = 6) {
  return Array.from({ length: amount }, (_, index) => {
    const offset = amount - index - 1;
    const start = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - offset + 1, 1);
    return {
      key: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`,
      label: new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(start).replace('.', ''),
      start,
      end,
    };
  });
}

export function calculateMrr(
  subscriptions: Array<{ status: SubscriptionStatus; plan: string }>,
  feesByPlan: ReadonlyMap<string, number>,
) {
  return subscriptions.reduce(
    (sum, subscription) =>
      subscription.status === 'ATIVA' ? sum + (feesByPlan.get(subscription.plan) ?? 0) : sum,
    0,
  );
}
