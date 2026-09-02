import publicMediaRepository from '../repositories/PublicMediaRepository.js';

export type PublicMedia = {
  source: string;
  updatedAt: Date;
};

function positiveInteger(value: unknown, label: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} inválido.`);
  }
  return parsed;
}

function requireSource(source: unknown, updatedAt: Date | undefined): PublicMedia {
  const normalized = String(source || '').trim();
  if (!normalized || !updatedAt) throw new Error('Imagem não encontrada.');
  return { source: normalized, updatedAt };
}

class GetPublicMediaService {
  async restaurantImage(restaurantIdInput: unknown, kind: 'logo' | 'cover'): Promise<PublicMedia> {
    const restaurantId = positiveInteger(restaurantIdInput, 'Restaurante');
    const image = await publicMediaRepository.findRestaurantImage(restaurantId, kind);
    return requireSource(kind === 'logo' ? image?.logo : image?.coverImage, image?.updatedAt);
  }

  async bannerImage(restaurantIdInput: unknown, bannerIdInput: unknown): Promise<PublicMedia> {
    const restaurantId = positiveInteger(restaurantIdInput, 'Restaurante');
    const bannerId = positiveInteger(bannerIdInput, 'Banner');
    const banner = await publicMediaRepository.findBannerImage(restaurantId, bannerId);
    return requireSource(banner?.image, banner?.updatedAt);
  }

  async productImage(restaurantIdInput: unknown, productIdInput: unknown): Promise<PublicMedia> {
    const restaurantId = positiveInteger(restaurantIdInput, 'Restaurante');
    const productId = positiveInteger(productIdInput, 'Produto');
    const product = await publicMediaRepository.findProductImage(restaurantId, productId);
    return requireSource(product?.image, product?.updatedAt);
  }

  async ingredientImage(
    restaurantIdInput: unknown,
    ingredientIdInput: unknown,
  ): Promise<PublicMedia> {
    const restaurantId = positiveInteger(restaurantIdInput, 'Restaurante');
    const ingredientId = positiveInteger(ingredientIdInput, 'Ingrediente');
    const ingredient = await publicMediaRepository.findIngredientImage(restaurantId, ingredientId);
    return requireSource(ingredient?.image, ingredient?.updatedAt);
  }
}

export default new GetPublicMediaService();
