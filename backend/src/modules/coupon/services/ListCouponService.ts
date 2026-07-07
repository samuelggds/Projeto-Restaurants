import couponRepository from "../repositories/CouponRepository.js";

type ListCouponPayload = {
  restaurantId: number | string;
};

class ListCouponService {
  async execute({ restaurantId }: ListCouponPayload) {
    return await couponRepository.findAllByRestaurant(restaurantId);
  }
}

export default new ListCouponService();
