import bannerRepository from '../repositories/BannerRepository.js';

type DeleteBannerPayload = {
  id: number | string;
  restaurantId: number | string;
};

class DeleteBannerService {
  async execute({ id, restaurantId }: DeleteBannerPayload) {
    const banner = await bannerRepository.findById(id, restaurantId);

    if (!banner) {
      throw new Error('Banner não encontrado');
    }

    await bannerRepository.delete(id, restaurantId);

    return { message: 'Banner removido com sucesso' };
  }
}

export default new DeleteBannerService();
