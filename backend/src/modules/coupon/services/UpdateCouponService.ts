import couponRepository from "../repositories/CouponRepository.js";

class UpdateCouponService {
  async execute({ id, code, discount, expiration }) {
    const coupon = await couponRepository.findById(id);

    if (!coupon) {
      throw new Error("Cupom não encontrado");
    }

    return await couponRepository.update(id, {
      code,
      discount,
      expiration,
    });
  }
}

export default new UpdateCouponService();
