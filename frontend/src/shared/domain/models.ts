export type Product = {
  id: number;
  name: string;
  description?: string | null;
  image?: string | null;
  price?: number | string;
  active?: boolean;
  stock?: number | string | null;
  category?: {
    name?: string | null;
  } | null;
};

export type TableSession = {
  sessionToken: string;
  sessionId: number;
  tableId: number;
  tableNumber: number | null;
  restaurantId: number | null;
};

export type MesaOrder = {
  id: number;
  status: string;
  total: number;
  paymentMethod: string;
  paid: boolean;
  createdAt: string;
  customerName: string;
  tableId: number | null;
  tableNumber?: number | null;
  restaurantId: number | null;
};

export type RestaurantProfile = {
  name: string;
  logo: string;
  coverImage: string;
  instagram: string;
};
