export type Category = {
  id: string;
  name: string;
};

export type Product = {
  id: number;
  categoryId: string; // mapped from category.name on load
  name: string;
  description: string;
  price: number;
  image: string;
  active?: boolean;
  stock?: number | string | null;
  category?: { name?: string | null } | null;
};

export type CartItem = Product & { quantity: number };

export type TenantConfig = {
  name: string;
  primaryColor: string;
  phone: string;
  address: string;
  socialLinks: SocialLink[];
  instagram?: string;
  logo?: string;
};

export type SocialLink = {
  name: string;
  url: string;
  icon: string;
};
