/** A primeira compra é a primeira compra paga, não a data de cadastro. */
export type PromotionalAudience = 'ALL' | 'NEW_CUSTOMERS' | 'RETURNING_CUSTOMERS';

export function isPromotionalAudienceEligible(
  audience: PromotionalAudience,
  paidPurchases: number,
): boolean {
  if (audience === 'NEW_CUSTOMERS') return paidPurchases === 0;
  if (audience === 'RETURNING_CUSTOMERS') return paidPurchases > 0;
  return true;
}

type CampaignAvailability = {
  active: boolean;
  expiration: Date | null;
  usageLimit: number | null;
  usageCount: number;
  perCustomerLimit: number;
  audience: PromotionalAudience;
};

export function promotionalCampaignAvailability(
  campaign: CampaignAvailability,
  paidPurchases: number,
  customerUses: number,
  now: Date,
) {
  if (!campaign.active) return { status: 'INACTIVE' as const, inactiveReason: 'Desativado pelo restaurante' };
  if (campaign.expiration && campaign.expiration.getTime() <= now.getTime())
    return { status: 'INACTIVE' as const, inactiveReason: 'Prazo de utilização encerrado' };
  if (campaign.usageLimit !== null && campaign.usageCount >= campaign.usageLimit)
    return { status: 'INACTIVE' as const, inactiveReason: 'Limite total de utilizações atingido' };
  if (customerUses >= campaign.perCustomerLimit)
    return { status: 'INACTIVE' as const, inactiveReason: 'Limite de utilizações por cliente atingido' };
  if (!isPromotionalAudienceEligible(campaign.audience, paidPurchases))
    return { status: 'INACTIVE' as const, inactiveReason: 'Benefício não disponível para seu histórico de compras' };
  return { status: 'ACTIVE' as const, inactiveReason: null };
}
