import couponRepository from "../repositories/CouponRepository.js";

type DeleteCouponPayload = {
  id: number | string | string[];
};

class DeleteCouponService {
  async execute({ id }: DeleteCouponPayload) {
    const normalizedId = Array.isArray(id) ? id[0] : id;
    const coupon = await couponRepository.findById(normalizedId);

    if (!coupon) {
      throw new Error("Cupom não encontrado");
    }

    await couponRepository.delete(normalizedId);

    return { message: "Cupom removido com sucesso" };
  }
}

export default new DeleteCouponService();
