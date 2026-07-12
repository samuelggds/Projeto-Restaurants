import couponRepository from "../repositories/CouponRepository.js";
class ListCouponService {
    async execute({ restaurantId }) {
        return await couponRepository.findAllByRestaurant(restaurantId);
    }
}
export default new ListCouponService();
