export type NfcInventoryVisualState =
  | 'READY'
  | 'ACTIVE'
  | 'OPEN_BALANCE'
  | 'BLOCKED'
  | 'PENDING_WRITE'
  | 'REVOKED';

export function nfcInventoryVisualState(
  cardStatus: 'READY' | 'ACTIVE' | 'PENDING_WRITE' | 'REVOKED',
  blockedByOverdueDebt: boolean,
  comanda?: { status: 'OPEN' | 'UNPAID' | 'PAID'; totalCents: bigint; paidCents: bigint } | null,
): NfcInventoryVisualState {
  if (cardStatus === 'REVOKED') return 'REVOKED';
  if (cardStatus === 'PENDING_WRITE') return 'PENDING_WRITE';
  if (cardStatus === 'READY') return 'READY';
  if (blockedByOverdueDebt) return 'BLOCKED';
  if (comanda && (comanda.status === 'OPEN' || comanda.status === 'UNPAID')
    && comanda.totalCents > comanda.paidCents) return 'OPEN_BALANCE';
  return 'ACTIVE';
}
