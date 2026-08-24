import bannerRepository from '../repositories/BannerRepository.js';
import { normalizeRestaurantImage } from '../../restaurantSettings/utils/normalizeRestaurantImage.js';

type CreateBannerPayload = {
  title: string;
  image: string;
  restaurantId: number | string;
};

class CreateBannerService {
  async execute({ title, image, restaurantId }: CreateBannerPayload) {
    const normalizedTitle = String(title || '').trim();
    const normalizedImage = normalizeRestaurantImage(image);
    if (!normalizedTitle || !normalizedImage) {
      throw new Error('Título e imagem são obrigatórios');
    }
    if (normalizedTitle.length > 80) throw new Error('O título pode ter no máximo 80 caracteres.');

    return await bannerRepository.create({
      title: normalizedTitle,
      image: normalizedImage,
      restaurantId: Number(restaurantId),
    });
  }
}

export default new CreateBannerService();
