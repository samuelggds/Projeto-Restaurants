import bannerRepository from '../repositories/BannerRepository.js';
import { normalizeBannerId } from '../domain/bannerValidation.js';

type DeleteBannerPayload = {
  id: number | string;
  restaurantId: number | string;
};

class DeleteBannerService {
  async execute({ id, restaurantId }: DeleteBannerPayload) {
    const normalizedId = normalizeBannerId(id);
    const normalizedRestaurantId = normalizeBannerId(restaurantId, 'Restaurante');
    const banner = await bannerRepository.findById(normalizedId, normalizedRestaurantId);

    if (!banner) {
      throw new Error('Banner não encontrado');
    }

    await bannerRepository.delete(normalizedId, normalizedRestaurantId);

    return { message: 'Banner removido com sucesso' };
  }
}

export default new DeleteBannerService();
