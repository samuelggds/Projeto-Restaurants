import couponRepository from '../repositories/CouponRepository.js';

type DeleteCouponPayload = {
  id: number | string | string[];
  restaurantId: number | string;
};

class DeleteCouponService {
  async execute({ id, restaurantId }: DeleteCouponPayload) {
    const normalizedId = Array.isArray(id) ? id[0] : id;
    const coupon = await couponRepository.findById(normalizedId, restaurantId);

    if (!coupon) {
      throw new Error('Cupom não encontrado');
    }

    await couponRepository.delete(normalizedId, restaurantId);

    return { message: 'Cupom removido com sucesso' };
  }
}

export default new DeleteCouponService();
