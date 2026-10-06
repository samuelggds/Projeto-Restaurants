import type { LoyaltySummary } from '../Home/types';

export type ProfileBrand = {
  name: string;
  monogram?: string;
  logoUrl?: string;
  address: string;
  phone?: string;
  email?: string;
  whatsapp?: string;
  status?: string;
  primaryColor?: string;
  description?: string;
};

export type ProfileUser = {
  firstName: string;
  fullName: string;
  email: string;
  phone?: string;
  avatarUrl: string;
  mainAddress: string;
};

export type ProfileOrderStatus = 'confirmed' | 'preparing' | 'onTheWay' | 'delivered' | 'cancelled';
export type ProfileOrderChannel = 'Delivery' | 'Retirada' | 'Mesa' | 'Pagar na entrega' | 'Pedido';
export type ProfileView =
  | 'overview'
  | 'orders'
  | 'coupons'
  | 'addresses'
  | 'loyalty'
  | 'help'
  | 'settings';

export type ProfileOrder = {
  id: string;
  summary: string;
  date: string;
  total: number;
  image: string;
  status: ProfileOrderStatus;
  channel?: ProfileOrderChannel;
  publicId?: string;
  paymentPending?: boolean;
  loyaltyQualified?: boolean;
};

export type ProfileAddress = {
  id: string;
  label: string;
  address: string;
  complement?: string;
  isDefault: boolean;
  number?: string;
  district?: string;
  city?: string;
  state?: string;
  zipCode?: string;
};

export type ActiveProfileOrder = {
  id: string;
  status: ProfileOrderStatus;
  date?: string;
  estimatedArrival: string;
  summary: string;
  image: string;
  total: number;
  channel?: ProfileOrderChannel;
  publicId?: string;
  paymentPending?: boolean;
};

export type ProfileData = {
  brand: ProfileBrand;
  user: ProfileUser;
  activeOrder?: ActiveProfileOrder;
  activeOrders?: ActiveProfileOrder[];
  activeOrderCount?: number;
  recentOrders: ProfileOrder[];
  addresses?: ProfileAddress[];
};

export type ProfilePageProps = {
  historyPagination?: {
    loading: boolean;
    error: string;
    hasMore: boolean;
    loadMore: () => unknown;
    refresh: () => unknown;
  };
  data?: ProfileData;
  initialView?: ProfileView;
  cartCount?: number;
  onGoHome?: () => void;
  onOpenMenu?: () => void;
  onOpenCart?: () => void;
  onTrackOrder?: (orderId: string) => void;
  onViewOrder?: (orderId: string) => void;
  onContinuePayment?: (orderPublicId: string) => void;
  onReorder?: (orderId: string) => void;
  onViewAllOrders?: () => void;
  onOpenCoupons?: () => void;
  onUseCoupon?: (redemptionId: number) => void;
  onNewAddress?: () => void;
  onSelectAddress?: (addressId: string) => void | Promise<void>;
  onSupport?: () => void;
  onSupportOrder?: (orderId: string) => void;
  onLogout?: () => void;
  twoFactorEnabled?: boolean;
  onToggleTwoFactor?: (enabled: boolean, currentPassword: string) => Promise<void>;
  onDeactivateAccount?: () => Promise<void>;
  onUploadAvatar?: (file: File) => Promise<void>;
  loyaltySummary?: LoyaltySummary | null;
  loyaltyLoading?: boolean;
  loyaltyError?: string;
  onRetryLoyalty?: () => void;
  loyaltyRedeemingCouponId?: number | null;
  onRedeemLoyaltyCoupon?: (couponId: number) => Promise<void>;
};
