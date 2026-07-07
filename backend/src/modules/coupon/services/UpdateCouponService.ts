import couponRepository from "../repositories/CouponRepository.js";

type UpdateCouponPayload = {
  id: number | string | string[];
  code?: string;
  discount?: number;
  expiration?: Date;
};

class UpdateCouponService {
  async execute({ id, code, discount, expiration }: UpdateCouponPayload) {
    const normalizedId = Array.isArray(id) ? id[0] : id;
    const coupon = await couponRepository.findById(normalizedId);

    if (!coupon) {
      throw new Error("Cupom não encontrado");
    }

    return await couponRepository.update(normalizedId, {
      code,
      discount,
      expiration,
    });
  }
}

export default new UpdateCouponService();
