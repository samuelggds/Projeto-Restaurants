import type { CustomerAddress } from '../../Services/customerAddressService';
import type { BusinessHour } from '../admin/types';
import type { ProductConfiguration, ProductOptionGroup } from './domain/productCustomization';
import type { HomeFontFamily } from './domain/publicSettings';

export type HomeBrand = {
  name: string;
  monogram?: string;
  logoUrl?: string;
  address: string;
  primaryColor?: string;
  whatsapp?: string;
  whatsappDisplayName?: string;
  whatsappDefaultMessage?: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  youtube?: string;
  legalName?: string;
  phone?: string;
  email?: string;
};

export type HomeCategory = {
  id: string;
  name: string;
  image: string;
};

export type HomeProduct = {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  originalPrice: number;
  promotion?: {
    active: boolean;
    discountAmount: number;
    discountPercentage: number;
    badgeLabel: string;
    endsAt?: string;
  };
  image: string;
  rating: number;
  stock?: number | null;
  available: boolean;
  ingredients?: Array<{ id: string; name: string; price: number; required: boolean }>;
  optionGroups?: ProductOptionGroup[];
};

export type LoyaltyCoupon = {
  id: number;
  code: string;
  title: string;
  description: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discount: number;
  minimumSubtotal: number;
  maxDiscount?: number | null;
  expiration?: string | null;
  redemptionValidityDays?: number;
  loyaltyPurchasesRequired?: number;
  perCustomerLimit?: number;
};

export type LoyaltyRedemption = {
  id: number;
  status: 'CLAIMED' | 'RESERVED' | 'USED' | 'EXPIRED';
  cycle: number;
  expiresAt?: string | null;
  expired?: boolean;
  coupon: LoyaltyCoupon;
};

export type LoyaltyRewardProgress = {
  coupon: LoyaltyCoupon;
  purchasesCompleted: number;
  purchasesRequired: number;
  remaining: number;
  progressPercent: number;
  canRedeem: boolean;
  limitReached?: boolean;
  activeRedemptions?: number;
  walletLimit?: number;
  nextCycle?: number;
  redemptions: LoyaltyRedemption[];
};

export type LoyaltySummary = {
  purchasesCompleted: number;
  rewards: LoyaltyRewardProgress[];
  redemptions?: LoyaltyRedemption[];
};

export type LoyaltyProgramProps = {
  primaryColor: string;
  loading: boolean;
  error?: string;
  summary: LoyaltySummary | null;
  loggedIn: boolean;
  redeemingCouponId?: number | null;
  onLogin: () => void;
  onRetry: () => void;
  onRedeem: (couponId: number) => void;
};

export type HomeBanner = {
  id: number;
  title: string;
  highlight?: string;
  description?: string;
  buttonLabel?: string;
  image: string;
  active: boolean;
  position: number;
};

export type HomeHero = {
  title: string;
  highlight?: string;
  description?: string;
  image: string;
};

export type HomeData = {
  brand: HomeBrand;
  /** Compatibilidade com respostas antigas que possuíam somente um banner principal. */
  hero: HomeHero;
  banners: HomeBanner[];
  categories: HomeCategory[];
  products: HomeProduct[];
  deliveryTime: string;
  minimumOrder: number;
  freeDeliveryFrom: number;
  acceptsDelivery: boolean;
  acceptsPickup: boolean;
  acceptsPix: boolean;
  acceptsCard: boolean;
  fontFamily: HomeFontFamily;
  seoTitle: string;
  seoDescription: string;
  isOpen: boolean;
  /** Manual master switch. When absent, `isOpen` keeps legacy behavior. */
  isOpenForOrders?: boolean;
  about: string;
  businessHours?: BusinessHour[];
};

export type HomePageProps = {
  data: HomeData;
  cartCount?: number;
  userName?: string;
  userEmail?: string;
  userAvatar?: string;
  userLoggedIn?: boolean;
  isAdmin?: boolean;
  isTableMenu?: boolean;
  orderingLocked?: boolean;
  tableLabel?: string | number;
  favoriteProductIds?: string[];
  savedAddresses?: CustomerAddress[];
  selectedAddressId?: string;
  onSelectAddress?: (addressId: string) => void;
  onManageAddresses?: () => void;
  onOpenMenu?: () => void;
  onOpenProfile?: () => void;
  onOpenAdmin?: () => void;
  onOpenCart?: () => void;
  onOpenTableAccount?: () => void;
  onSearch?: () => void;
  onSelectCategory?: (categoryId: string) => void;
  onAddProduct?: (productId: string, configuration: ProductConfiguration) => void;
  onToggleFavorite?: (productId: string) => void;
  onLogout?: () => void;
};
