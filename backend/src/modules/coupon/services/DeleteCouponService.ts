import couponRepository from '../repositories/CouponRepository.js';

type DeleteCouponPayload = {
  id: number | string | string[];
  restaurantId: number | string;
};

const redemptionHistoryError = () =>
  new Error(
    'Este cupom já possui resgates e não pode ser excluído. Pause ou arquive a campanha para preservar o histórico dos clientes.',
  );

class DeleteCouponService {
  async execute({ id, restaurantId }: DeleteCouponPayload) {
    const normalizedId = Array.isArray(id) ? id[0] : id;
    const coupon = await couponRepository.findById(normalizedId, restaurantId);

    if (!coupon) {
      throw new Error('Cupom não encontrado');
    }

    if (await couponRepository.hasRedemptions(normalizedId, restaurantId)) {
      throw redemptionHistoryError();
    }

    try {
      await couponRepository.delete(normalizedId, restaurantId);
    } catch (error) {
      // The FK is RESTRICT. This second check turns a concurrent redemption
      // created between the guard and delete into the same friendly conflict.
      if (await couponRepository.hasRedemptions(normalizedId, restaurantId)) {
        throw redemptionHistoryError();
      }
      throw error;
    }

    return { message: 'Cupom removido com sucesso' };
  }
}

export default new DeleteCouponService();
