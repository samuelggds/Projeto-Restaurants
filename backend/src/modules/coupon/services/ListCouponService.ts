import couponRepository from '../repositories/CouponRepository.js';
import { presentCoupon } from '../utils/couponPresenter.js';

type ListCouponPayload = {
  restaurantId: number | string;
};

class ListCouponService {
  async execute({ restaurantId }: ListCouponPayload) {
    const coupons = await couponRepository.findAllByRestaurant(restaurantId);
    return coupons.map(presentCoupon);
  }
}

export default new ListCouponService();
