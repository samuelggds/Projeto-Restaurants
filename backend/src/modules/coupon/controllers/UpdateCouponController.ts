import { Request, Response } from 'express';
import updateCouponService from '../services/UpdateCouponService.js';
import { couponIdSchema } from '../../../validators/CouponValidator.js';
import { couponControllerError } from './CouponControllerHelpers.js';

class UpdateCouponController {
  async handle(req: Request, res: Response) {
    try {
      const restaurantId = Number(req.user?.restaurantId || 0);
      const id = couponIdSchema.parse(
        Array.isArray(req.params.id) ? req.params.id[0] : req.params.id,
      );

      if (!restaurantId) {
        return res.status(403).json({ error: 'Restaurante não identificado.' });
      }

      const coupon = await updateCouponService.execute({
        ...req.body,
        id,
        restaurantId,
      });

      return res.status(200).json(coupon);
    } catch (error: unknown) {
      return couponControllerError(res, error, 'Não foi possível atualizar o cupom.');
    }
  }
}

export default new UpdateCouponController();
