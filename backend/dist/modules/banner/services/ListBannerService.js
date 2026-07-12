import bannerRepository from "../repositories/BannerRepository.js";
class ListBannerService {
    async execute({ restaurantId }) {
        return await bannerRepository.findAllByRestaurant(Number(restaurantId));
    }
}
export default new ListBannerService();
