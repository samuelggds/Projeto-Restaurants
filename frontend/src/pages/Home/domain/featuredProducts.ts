import type { HomeProduct } from '../types';

export function getFeaturedProducts(products: HomeProduct[]) {
  return products.filter(
    (product) =>
      product.available &&
      product.promotion?.active === true &&
      Number.isFinite(product.promotion.discountAmount) &&
      product.promotion.discountAmount > 0,
  );
}
