export type StoredPaymentMethod = {
  publicId: string;
  provider: string;
  providerPaymentMethodId?: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  holderName: string | null;
  isDefault: boolean;
  createdAt: Date;
};

export function toPublicPaymentMethod(method: StoredPaymentMethod) {
  return {
    publicId: method.publicId,
    provider: method.provider,
    brand: method.brand,
    last4: method.last4,
    expMonth: method.expMonth,
    expYear: method.expYear,
    holderName: method.holderName,
    isDefault: method.isDefault,
    createdAt: method.createdAt,
  };
}
