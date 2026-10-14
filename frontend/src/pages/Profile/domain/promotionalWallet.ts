import type { PublicPromotionalCoupon } from '../../Home/types';

export type WalletCampaign = PublicPromotionalCoupon & {
  status: 'ACTIVE' | 'INACTIVE';
  inactiveReason: string | null;
  usageLimit?: number | null;
  usageCount?: number;
};

export function normalizeWalletCampaigns(payload: unknown): WalletCampaign[] {
  if (!Array.isArray(payload)) return [];
  return payload.flatMap((raw: unknown) => {
    if (!raw || typeof raw !== 'object') return [];
    const value = raw as Record<string, unknown>;
    if (value.kind !== 'PROMOTIONAL' || !Number.isSafeInteger(value.id)) return [];
    return [{
      id: Number(value.id), code: String(value.code || ''),
      title: String(value.title || ''), description: String(value.description || ''),
      discountType: value.discountType === 'FREE_SHIPPING' ? 'FREE_SHIPPING' as const : value.discountType === 'PERCENTAGE' ? 'PERCENTAGE' as const : 'FIXED' as const,
      audience: (['ALL', 'AUTHENTICATED', 'NEW_CUSTOMERS', 'RETURNING_CUSTOMERS', 'INACTIVE_CUSTOMERS', 'SPECIFIC_CUSTOMERS'].includes(String(value.audience)) ? value.audience : 'ALL') as PublicPromotionalCoupon['audience'],
      discount: Number(value.discount) || 0, minimumSubtotal: Number(value.minimumSubtotal) || 0,
      maxDiscount: value.maxDiscount == null ? null : Number(value.maxDiscount),
      allowDelivery: value.allowDelivery === true, allowPickup: value.allowPickup === true, allowTable: value.allowTable === true,
      status: value.status === 'ACTIVE' ? 'ACTIVE' as const : 'INACTIVE' as const,
      inactiveReason: value.inactiveReason == null ? null : String(value.inactiveReason),
      usageLimit: value.usageLimit == null ? null : Number(value.usageLimit),
      usageCount: Number(value.usageCount) || 0,
    }];
  });
}
