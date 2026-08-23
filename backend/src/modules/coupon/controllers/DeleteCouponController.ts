import { Request, Response } from 'express';
import deleteCouponService from '../services/DeleteCouponService.js';
import { couponIdSchema } from '../../../validators/CouponValidator.js';
import { couponControllerError } from './CouponControllerHelpers.js';

class DeleteCouponController {
  async handle(req: Request, res: Response) {
    try {
      const restaurantId = Number(req.user?.restaurantId || 0);
      const id = couponIdSchema.parse(
        Array.isArray(req.params.id) ? req.params.id[0] : req.params.id,
      );

      if (!restaurantId) {
        return res.status(403).json({ error: 'Restaurante não identificado.' });
      }

      const result = await deleteCouponService.execute({
        id,
        restaurantId,
      });

      return res.status(200).json(result);
    } catch (error: unknown) {
      return couponControllerError(res, error, 'Não foi possível remover o cupom.');
    }
  }
}

export default new DeleteCouponController();
