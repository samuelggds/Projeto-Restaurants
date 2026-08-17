import bannerRepository from '../repositories/BannerRepository.js';

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

    return await bannerRepository.update(id, restaurantId, {
      title,
      image,
    });
  }
}

export default new UpdateBannerService();
