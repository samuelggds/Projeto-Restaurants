// A revoked card can only be returned to inventory after all of the customer's
// accounts are closed and have an authoritative zero balance. This is a policy
// calculation; the caller must also check in-flight payments and orders.
export type NfcReuseAccount = {
  status: 'OPEN' | 'UNPAID' | 'PAID';
  totalCents: bigint;
  paidCents: bigint;
};
export function canReuseRevokedNfcCard(
  status: string,
  customerId: string | null,
  accounts: NfcReuseAccount[],
) {
  if (status !== 'REVOKED' || !customerId) return false;
  return accounts.every(account =>
    account.status === 'PAID' && account.totalCents === account.paidCents);
}
