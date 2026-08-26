import type { TablePaymentIntentStatus } from './tableAccountContracts.js';
import type { ProviderPaymentStatus } from '../providers/PaymentProvider.js';

export type TablePaymentProviderEventKind =
  'PROVIDER_WEBHOOK' | 'PAID' | 'FAILED' | 'EXPIRED' | 'CANCELED' | 'REFUNDED';

const latePaymentStatuses: TablePaymentIntentStatus[] = ['FAILED', 'EXPIRED', 'CANCELED'];

export function resolveTablePaymentProviderTransition(
  currentStatus: TablePaymentIntentStatus,
  providerStatus: ProviderPaymentStatus,
) {
  const latePayment = providerStatus === 'PAID' && latePaymentStatuses.includes(currentStatus);
  if (latePayment) {
    return {
      nextStatus: null,
      eventType: 'PROVIDER_WEBHOOK' as const,
      latePayment: true,
    };
  }

  if (
    providerStatus === 'PAID' &&
    (currentStatus === 'RESERVED' || currentStatus === 'PROCESSING')
  ) {
    return { nextStatus: 'PAID' as const, eventType: 'PAID' as const, latePayment: false };
  }

  if (providerStatus === 'REFUNDED' && currentStatus === 'PAID') {
    return {
      nextStatus: 'REFUNDED' as const,
      eventType: 'REFUNDED' as const,
      latePayment: false,
    };
  }

  const failureStatus =
    providerStatus === 'FAILED'
      ? ('FAILED' as const)
      : providerStatus === 'EXPIRED'
        ? ('EXPIRED' as const)
        : providerStatus === 'CANCELED'
          ? ('CANCELED' as const)
          : null;
  if (failureStatus && (currentStatus === 'RESERVED' || currentStatus === 'PROCESSING')) {
    return {
      nextStatus: failureStatus,
      eventType: failureStatus,
      latePayment: false,
    };
  }

  return {
    nextStatus: null,
    eventType: 'PROVIDER_WEBHOOK' as const,
    latePayment: false,
  };
}
