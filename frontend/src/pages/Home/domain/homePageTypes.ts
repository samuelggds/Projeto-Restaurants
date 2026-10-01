export type GuestCheckoutDetails = {
  name: string;
  cpf?: string;
  phone?: string;
};

export type HomeNavigationState = {
  openCart?: boolean;
  openSearch?: boolean;
  loyaltyRedemptionId?: number;
};
