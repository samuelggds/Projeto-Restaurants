import type { Product } from "../../domain/home.models";

export interface IHomeGateway {
  listProducts(restaurantId: number): Promise<Product[]>;
  listProductsBySlug(slug: string): Promise<Product[]>;
  getPublicSettingsBySlug(slug: string): Promise<{ restaurantId?: number }>;
  validateTablePin(payload: { tableId: number; pin: string }): Promise<{
    sessionToken: string;
    sessionId: number;
    tableId: number;
    tableNumber: number;
    restaurantId: number;
  }>;
  login(user: Record<string, unknown>, token: string): void;
}
