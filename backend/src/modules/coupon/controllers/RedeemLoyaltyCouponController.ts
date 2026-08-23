import type { Request, Response } from 'express';
import {
  couponIdSchema,
  loyaltyRestaurantQuerySchema,
} from '../../../validators/CouponValidator.js';
import redeemLoyaltyCouponService from '../services/RedeemLoyaltyCouponService.js';
import { couponControllerError } from './CouponControllerHelpers.js';

class RedeemLoyaltyCouponController {
  async handle(req: Request, res: Response) {
    try {
      const couponId = couponIdSchema.parse(
        Array.isArray(req.params.id) ? req.params.id[0] : req.params.id,
      );
      const { restaurantId } = loyaltyRestaurantQuerySchema.parse(req.body);
      const userId = Number(req.user?.id || 0);
      const result = await redeemLoyaltyCouponService.execute({
        couponId,
        restaurantId,
        userId,
      });
      return res.status(201).json(result);
    } catch (error: unknown) {
      return couponControllerError(res, error, 'Não foi possível resgatar este cupom.');
    }
  }
}

export default new RedeemLoyaltyCouponController();
