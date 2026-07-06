import couponRepository from "../repositories/CouponRepository.js";

class CreateCouponService {
  async execute({ code, discount, expiration, restaurantId }) {
    const exists = await couponRepository.findByCode(code, restaurantId);

    if (exists) {
      throw new Error("Cupom já existe!");
    }

    return await couponRepository.create({
      code,
      discount,
      expiration,
      restaurantId,
    });
  }
}

export default new CreateCouponService();
