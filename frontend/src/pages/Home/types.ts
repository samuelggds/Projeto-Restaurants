import type { CustomerAddress } from '../../Services/customerAddressService';
import type { BusinessHour } from '../admin/types';

export type HomeBrand = {
  name: string;
  monogram?: string;
  logoUrl?: string;
  address: string;
  primaryColor?: string;
  whatsapp?: string;
  instagram?: string;
  facebook?: string;
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
  image: string;
  rating: number;
  stock?: number | null;
  available: boolean;
};

export type HomeBanner = {
  title: string;
  highlight: string;
  description?: string;
  image: string;
};

export type HomeData = {
  brand: HomeBrand;
  hero: HomeBanner;
  banners: HomeBanner[];
  categories: HomeCategory[];
  products: HomeProduct[];
  deliveryTime: string;
  minimumOrder: number;
  freeDeliveryFrom: number;
  isOpen: boolean;
  about: string;
  businessHours?: BusinessHour[];
};

export type HomePageProps = {
  data?: HomeData;
  cartCount?: number;
  userName?: string;
  userEmail?: string;
  userLoggedIn?: boolean;
  isAdmin?: boolean;
  favoriteProductIds?: string[];
  savedAddresses?: CustomerAddress[];
  selectedAddressId?: string;
  onSelectAddress?: (addressId: string) => void;
  onOpenMenu?: () => void;
  onOpenProfile?: () => void;
  onOpenAdmin?: () => void;
  onOpenCart?: () => void;
  onSearch?: () => void;
  onSelectCategory?: (categoryId: string) => void;
  onAddProduct?: (productId: string) => void;
  onToggleFavorite?: (productId: string) => void;
  onLogout?: () => void;
};
