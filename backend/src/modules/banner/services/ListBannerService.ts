import bannerRepository from "../repositories/BannerRepository.js";

type ListBannerPayload = {
  restaurantId: number | string;
};

class ListBannerService {
  async execute({ restaurantId }: ListBannerPayload) {
    return await bannerRepository.findAllByRestaurant(Number(restaurantId));
  }
}

export default new ListBannerService();
