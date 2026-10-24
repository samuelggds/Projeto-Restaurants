/**
 * Temporary SUPER_ADMIN access grants are measured in elapsed 24-hour days.
 * A grant never settles invoices, bypasses manual suspensions, or disables
 * subscription cancellation. All time checks run on the server.
 */
export const TEMPORARY_BILLING_ACCESS_DAYS = [1, 3, 7] as const;
export type TemporaryBillingAccessDays = (typeof TEMPORARY_BILLING_ACCESS_DAYS)[number];

export function temporaryBillingAccessExpiresAt(now: Date, days: TemporaryBillingAccessDays) {
  if (!TEMPORARY_BILLING_ACCESS_DAYS.includes(days) || !Number.isFinite(now.getTime())) {
    throw new Error('Prazo de autorizacao temporaria invalido.');
  }
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
}

export function hasActiveTemporaryBillingAccess(
  endsAt: Date | null | undefined,
  now = new Date(),
) {
  return endsAt instanceof Date &&
    Number.isFinite(endsAt.getTime()) &&
    endsAt.getTime() > now.getTime();
}
