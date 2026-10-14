/** Targeting is checked in the wallet, quote and inside the order transaction. */
export type PromotionalAudience =
  | 'ALL'
  | 'AUTHENTICATED'
  | 'NEW_CUSTOMERS'
  | 'RETURNING_CUSTOMERS'
  | 'INACTIVE_CUSTOMERS'
  | 'SPECIFIC_CUSTOMERS';

export type PromotionalHistory = {
  paidPurchases: number;
  lastPaidAt: Date | null;
  recipient: boolean;
};

/** Subtract calendar months in UTC, clamping days at month-end (Jan 31 -> Feb 28). */
export function inactivityCutoff(now: Date, months: number): Date {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() - months;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month,
    Math.min(now.getUTCDate(), lastDay),
    now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds(), now.getUTCMilliseconds()));
}

export function isPromotionalAudienceEligible(
  audience: PromotionalAudience,
  paidPurchases: number,
  options: { lastPaidAt?: Date | null; inactivityMonths?: number | null; now?: Date; recipient?: boolean } = {},
): boolean {
  switch (audience) {
    case 'ALL':
    case 'AUTHENTICATED':
      return true;
    case 'NEW_CUSTOMERS':
      return paidPurchases === 0;
    case 'RETURNING_CUSTOMERS':
      return paidPurchases > 0;
    case 'SPECIFIC_CUSTOMERS':
      return options.recipient === true;
    case 'INACTIVE_CUSTOMERS':
      return paidPurchases > 0 &&
        Boolean(options.lastPaidAt) &&
        Number.isInteger(options.inactivityMonths) &&
        (options.inactivityMonths || 0) >= 1 &&
        (options.inactivityMonths || 0) <= 36 &&
        options.lastPaidAt!.getTime() <= inactivityCutoff(options.now || new Date(), options.inactivityMonths!).getTime();
  }
}

type CampaignAvailability = {
  active: boolean;
  expiration: Date | null;
  usageLimit: number | null;
  usageCount: number;
  perCustomerLimit: number;
  audience: PromotionalAudience;
  inactivityMonths?: number | null;
};

export function promotionalCampaignAvailability(
  campaign: CampaignAvailability,
  paidPurchases: number,
  customerUses: number,
  now: Date,
  options: { lastPaidAt?: Date | null; recipient?: boolean } = {},
) {
  if (!campaign.active) return { status: 'INACTIVE' as const, inactiveReason: 'Desativado pelo restaurante' };
  if (campaign.expiration && campaign.expiration.getTime() <= now.getTime())
    return { status: 'INACTIVE' as const, inactiveReason: 'Prazo de utilização encerrado' };
  if (campaign.usageLimit !== null && campaign.usageCount >= campaign.usageLimit)
    return { status: 'INACTIVE' as const, inactiveReason: 'Limite total de utilizações atingido' };
  if (customerUses >= campaign.perCustomerLimit)
    return { status: 'INACTIVE' as const, inactiveReason: 'Limite de utilizações por cliente atingido' };
  if (!isPromotionalAudienceEligible(campaign.audience, paidPurchases, {
    ...options, inactivityMonths: campaign.inactivityMonths, now,
  }))
    return { status: 'INACTIVE' as const, inactiveReason: 'Benefício não disponível para seu histórico de compras' };
  return { status: 'ACTIVE' as const, inactiveReason: null };
}
