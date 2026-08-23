import { Request, Response } from 'express';
import listCouponService from '../services/ListCouponService.js';
import { couponControllerError } from './CouponControllerHelpers.js';

class ListCouponController {
  async handle(req: Request, res: Response) {
    try {
      const restaurantId = Number(req.user?.restaurantId || 0);

      if (!restaurantId) {
        return res.status(403).json({ error: 'Restaurante não identificado.' });
      }

      const coupons = await listCouponService.execute({
        restaurantId,
      });

      return res.status(200).json(coupons);
    } catch (error: unknown) {
      return couponControllerError(res, error, 'Não foi possível listar os cupons.');
    }
  }
}

export default new ListCouponController();
