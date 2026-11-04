// An empty NFC visit can be closed administratively without creating a
// fictitious payment. It is NOT permission to waive an outstanding balance.
export type NfcEmptyVisitEvidence = {
  status: 'OPEN' | 'UNPAID' | 'PAID' | 'CANCELLED';
  totalCents: bigint;
  paidCents: bigint;
  itemCount: number;
  orderCount: number;
  ledgerCount: number;
  gatewayCount: number;
  pendingChallengeCount: number;
  unresolvedServiceCallCount: number;
};

export const NFC_VIRGIN_REASON_PREFIX = 'ZERADO_VIRGEM: ';

export function isEmptyNfcVisitForReset(visit: NfcEmptyVisitEvidence): boolean {
  return (visit.status === 'OPEN' || visit.status === 'UNPAID')
    && visit.totalCents === 0n
    && visit.paidCents === 0n
    && visit.itemCount === 0
    && visit.orderCount === 0
    && visit.ledgerCount === 0
    && visit.gatewayCount === 0
    && visit.pendingChallengeCount === 0
    && visit.unresolvedServiceCallCount === 0;
}
