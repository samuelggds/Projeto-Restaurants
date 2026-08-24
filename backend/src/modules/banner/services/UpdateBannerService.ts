import bannerRepository from '../repositories/BannerRepository.js';
import { normalizeRestaurantImage } from '../../restaurantSettings/utils/normalizeRestaurantImage.js';

type UpdateBannerPayload = {
  id: number | string;
  restaurantId: number | string;
  title?: string;
  image?: string;
};

class UpdateBannerService {
  async execute({ id, restaurantId, title, image }: UpdateBannerPayload) {
    const banner = await bannerRepository.findById(id, restaurantId);

    if (!banner) {
      throw new Error('Banner não encontrado');
    }

    const normalizedTitle = title === undefined ? undefined : String(title || '').trim();
    if (normalizedTitle !== undefined && !normalizedTitle) {
      throw new Error('O título do banner é obrigatório.');
    }
    if (normalizedTitle && normalizedTitle.length > 80) {
      throw new Error('O título pode ter no máximo 80 caracteres.');
    }
    const normalizedImage = image === undefined ? undefined : normalizeRestaurantImage(image);
    if (image !== undefined && !normalizedImage) {
      throw new Error('A imagem do banner é obrigatória.');
    }

    return await bannerRepository.update(id, restaurantId, {
      title: normalizedTitle,
      image: normalizedImage,
    });
  }
}

export default new UpdateBannerService();
