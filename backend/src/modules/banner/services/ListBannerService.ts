import bannerRepository from '../repositories/BannerRepository.js';
import { normalizeBannerId } from '../domain/bannerValidation.js';

type ListBannerPayload = {
  restaurantId: number | string;
};

class ListBannerService {
  async execute({ restaurantId }: ListBannerPayload) {
    return bannerRepository.findAllByRestaurant(normalizeBannerId(restaurantId, 'Restaurante'));
  }
}

export default new ListBannerService();
