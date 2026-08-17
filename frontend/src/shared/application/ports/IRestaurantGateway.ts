import type { Product, RestaurantProfile } from '../../domain/models';

export interface IRestaurantGateway {
  listProducts(restaurantId: number): Promise<Product[]>;
  listProductsBySlug(slug: string): Promise<Product[]>;
  getPublicSettings(
    restaurantId: number,
  ): Promise<{ restaurant?: Partial<RestaurantProfile>; instagram?: string }>;
  getPublicSettingsBySlug(slug: string): Promise<{ restaurantId?: number }>;
}
