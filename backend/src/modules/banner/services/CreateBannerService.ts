import bannerRepository from '../repositories/BannerRepository.js';

type CreateBannerPayload = {
  title: string;
  image: string;
  restaurantId: number | string;
};

class CreateBannerService {
  async execute({ title, image, restaurantId }: CreateBannerPayload) {
    if (!title || !image) {
      throw new Error('Título e imagem são obrigatórios');
    }

    return await bannerRepository.create({
      title,
      image,
      restaurantId: Number(restaurantId),
    });
  }
}

export default new CreateBannerService();
