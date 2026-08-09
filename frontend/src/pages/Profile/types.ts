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

export type ProfileOrderStatus =
  | "confirmed"
  | "preparing"
  | "onTheWay"
  | "delivered";
export type ProfileView =
  | "overview"
  | "orders"
  | "addresses"
  | "favorites"
  | "personalData"
  | "security";

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
};

export type ProfileAddress = {
  id: string;
  label: string;
  address: string;
  complement?: string;
  isDefault: boolean;
};

export type ActiveProfileOrder = {
  id: string;
  status: ProfileOrderStatus;
  estimatedArrival: string;
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
  cartCount?: number;
  onGoHome?: () => void;
  onOpenMenu?: () => void;
  onOpenCart?: () => void;
  onOpenSearch?: () => void;
  onTrackOrder?: (orderId: string) => void;
  onViewOrder?: (orderId: string) => void;
  onReorder?: (orderId: string) => void;
  onViewAllOrders?: () => void;
  onEditAddress?: () => void;
  onEditPayment?: () => void;
  onOpenFavorites?: () => void;
  onToggleFavorite?: (productId: string) => void | Promise<void>;
  onOpenPersonalData?: () => void;
  onOpenSecurity?: () => void;
  onSupport?: () => void;
  onLogout?: () => void;
  onSavePersonalData?: (data: {
    name: string;
    email: string;
    phone: string;
  }) => Promise<void>;
  onChangePassword?: (data: {
    currentPassword: string;
    newPassword: string;
  }) => Promise<void>;
  onUploadAvatar?: (file: File) => Promise<void>;
};
