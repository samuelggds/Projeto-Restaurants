import type { Request, Response } from 'express';
import { loyaltyRestaurantQuerySchema } from '../../../validators/CouponValidator.js';
import listLoyaltyCouponsService from '../services/ListLoyaltyCouponsService.js';
import { couponControllerError } from './CouponControllerHelpers.js';

class ListLoyaltyCouponsController {
  async handle(req: Request, res: Response) {
    try {
      const { restaurantId } = loyaltyRestaurantQuerySchema.parse(req.query);
      const userId = Number(req.user?.id || 0);
      const result = await listLoyaltyCouponsService.execute({ restaurantId, userId });
      return res.status(200).json(result);
    } catch (error: unknown) {
      return couponControllerError(
        res,
        error,
        'Não foi possível carregar seu progresso de fidelidade.',
      );
    }
  }
}

export default new ListLoyaltyCouponsController();
