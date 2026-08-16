import { Request, Response } from 'express';
import listCouponService from '../services/ListCouponService.js';

class ListCouponController {
  async handle(req: Request, res: Response) {
    try {
      const restaurantId = req.user.restaurantId;

      const coupons = await listCouponService.execute({
        restaurantId,
      });

      return res.status(200).json(coupons);
    } catch (error: unknown) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Erro ao listar cupons',
      });
    }
  }
}

export default new ListCouponController();
