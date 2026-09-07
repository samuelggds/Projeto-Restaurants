export type TerminalPaymentOutcome = 'PAID' | 'FAILED' | 'CANCELED' | 'EXPIRED' | 'REFUNDED';

// Approval is deliberately excluded: the order must also be confirmed by the backend.
export function getUnsuccessfulPaymentOutcome(
  status: unknown,
): Exclude<TerminalPaymentOutcome, 'PAID'> | null {
  switch (
    String(status || '')
      .trim()
      .toUpperCase()
  ) {
    case 'REJECTED':
    case 'DECLINED':
    case 'DENIED':
    case 'FAILED':
      return 'FAILED';
    case 'CANCELED':
    case 'CANCELLED':
      return 'CANCELED';
    case 'EXPIRED':
      return 'EXPIRED';
    case 'REFUNDED':
    case 'CHARGED_BACK':
      return 'REFUNDED';
    default:
      return null;
  }
}
