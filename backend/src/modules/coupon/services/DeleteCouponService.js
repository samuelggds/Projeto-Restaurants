import couponRepository from "../repositories/CouponRepository.js";

class DeleteCouponService {
  async execute({ id }) {
    const coupon = await couponRepository.findById(id);

    if (!coupon) {
      throw new Error("Cupom não encontrado");
    }

    await couponRepository.delete(id);

    return { message: "Cupom removido com sucesso" };
  }
}

export default new DeleteCouponService();
