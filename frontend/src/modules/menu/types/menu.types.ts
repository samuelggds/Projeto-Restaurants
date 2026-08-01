export type MenuCategory = {
  id: string;
  name: string;
  icon: string;
};

export type MenuProduct = {
  id: number;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  image: string;
  badge?: string;
  rating: number;
  preparationTime: string;
  available: boolean;
  featured?: boolean;
  options?: ProductOption[];
  // raw backend fields
  active?: boolean;
  stock?: number | string | null;
  category?: { name?: string | null } | null;
};

export type ProductOption = {
  id: string;
  name: string;
  price: number;
};

export type MenuRestaurant = {
  name: string;
  logoUrl: string;
  primaryColor: string;
  coverImage: string;
  deliveryTime: string;
  deliveryFee: number;
  minimumOrder: number;
  rating: number;
  isOpen: boolean;
};

export type MenuCartItem = {
  id: string;
  product: MenuProduct;
  quantity: number;
  notes: string;
  selectedOptions: ProductOption[];
  unitPrice: number;
};
