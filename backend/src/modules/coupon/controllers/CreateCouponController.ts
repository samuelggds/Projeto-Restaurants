import { Request, Response } from 'express';
import createCouponService from '../services/CreateCouponService.js';
import { couponControllerError } from './CouponControllerHelpers.js';

class CreateCouponController {
  async handle(req: Request, res: Response) {
    try {
      const restaurantId = Number(req.user?.restaurantId || 0);

      if (!restaurantId) {
        return res.status(403).json({ error: 'Restaurante não identificado.' });
      }

      const coupon = await createCouponService.execute({
        ...req.body,
        restaurantId,
      });

      return res.status(201).json(coupon);
    } catch (error: unknown) {
      return couponControllerError(res, error, 'Não foi possível criar o cupom.');
    }
  }
}

export default new CreateCouponController();
