import type { LoyaltySummary } from '../Home/types';

export type ProfileBrand = {
  name: string;
  monogram?: string;
  logoUrl?: string;
  address: string;
  primaryColor?: string;
};

export type ProfileUser = {
  firstName: string;
  fullName: string;
  email: string;
  phone?: string;
  avatarUrl: string;
  mainAddress: string;
  paymentLastDigits?: string;
  favoriteCount: number;
};

export type ProfileOrderStatus = 'confirmed' | 'preparing' | 'onTheWay' | 'delivered' | 'cancelled';
export type ProfileView =
  'overview' | 'orders' | 'coupons' | 'addresses' | 'favorites' | 'personalData' | 'security';

export type ProfileOrder = {
  id: string;
  summary: string;
  date: string;
  total: number;
  image: string;
  status: ProfileOrderStatus;
};

export type ProfileFavorite = {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  rating: number;
  stock?: number | null;
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
  estimatedArrival: string;
  summary: string;
  image: string;
  total: number;
};

export type ProfileData = {
  brand: ProfileBrand;
  user: ProfileUser;
  activeOrder?: ActiveProfileOrder;
  recentOrders: ProfileOrder[];
  favorites?: ProfileFavorite[];
  addresses?: ProfileAddress[];
};

export type ProfilePageProps = {
  data?: ProfileData;
  initialView?: ProfileView;
  cartCount?: number;
  onGoHome?: () => void;
  onOpenMenu?: () => void;
  onOpenCart?: () => void;
  onOpenSearch?: () => void;
  onTrackOrder?: (orderId: string) => void;
  onViewOrder?: (orderId: string) => void;
  onReorder?: (orderId: string) => void;
  onViewAllOrders?: () => void;
  onOpenCoupons?: () => void;
  onUseCoupon?: (redemptionId: number) => void;
  onNewAddress?: () => void;
  onSelectAddress?: (addressId: string) => void | Promise<void>;
  onEditPayment?: () => void;
  onOpenFavorites?: () => void;
  onToggleFavorite?: (productId: string) => void | Promise<void>;
  onAddFavoriteToCart?: (favorite: ProfileFavorite) => void;
  onOpenPersonalData?: () => void;
  onOpenSecurity?: () => void;
  onSupport?: () => void;
  onLogout?: () => void;
  onSavePersonalData?: (data: { name: string; email: string; phone: string }) => Promise<void>;
  onChangePassword?: (data: { currentPassword: string; newPassword: string }) => Promise<void>;
  twoFactorEnabled?: boolean;
  onToggleTwoFactor?: (enabled: boolean) => Promise<void>;
  onDeactivateAccount?: () => Promise<void>;
  onUploadAvatar?: (file: File) => Promise<void>;
  loyaltySummary?: LoyaltySummary | null;
  loyaltyLoading?: boolean;
  loyaltyError?: string;
  onRetryLoyalty?: () => void;
};
