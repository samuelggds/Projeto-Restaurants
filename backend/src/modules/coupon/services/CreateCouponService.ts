import couponRepository from "../repositories/CouponRepository.js";

type CreateCouponPayload = {
  code: string;
  discount: number;
  expiration: Date;
  restaurantId: number;
};

class CreateCouponService {
  async execute({
    code,
    discount,
    expiration,
    restaurantId,
  }: CreateCouponPayload) {
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
