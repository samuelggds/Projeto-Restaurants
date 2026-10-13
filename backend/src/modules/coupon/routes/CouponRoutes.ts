import { Router, type NextFunction, type Request, type Response } from 'express';

import { authMiddleware } from '../../../middlewares/authMiddleware.js';
import { loyaltyRestaurantQuerySchema } from '../../../validators/CouponValidator.js';
import couponRepository from '../repositories/CouponRepository.js';
import { presentCoupon } from '../utils/couponPresenter.js';
import { couponControllerError } from '../controllers/CouponControllerHelpers.js';

import CreateCouponController from '../controllers/CreateCouponController.js';
import ListCouponController from '../controllers/ListCouponController.js';
import UpdateCouponController from '../controllers/UpdateCouponController.js';
import DeleteCouponController from '../controllers/DeleteCouponController.js';
import ListLoyaltyCouponsController from '../controllers/ListLoyaltyCouponsController.js';
import RedeemLoyaltyCouponController from '../controllers/RedeemLoyaltyCouponController.js';
import { adminMiddleware } from '../../../middlewares/adminMiddleware.js';
import { billingMiddleware } from '../../../middlewares/billingMiddleware.js';

const router = Router();

function clientMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== 'CLIENTE' || !req.user.id) {
    return res.status(403).json({ error: 'O programa de fidelidade é exclusivo para clientes.' });
  }
  return next();
}

// Public listing is strictly scoped and intentionally excludes loyalty rewards.
router.get('/public', async (req, res) => {
  try {
    const { restaurantId } = loyaltyRestaurantQuerySchema.parse(req.query);
    const coupons = await couponRepository.findActivePromotionalByRestaurant(restaurantId);
    return res.status(200).json(coupons
      .filter((coupon) => coupon.usageLimit === null || coupon.usageCount < coupon.usageLimit)
      .map(presentCoupon));
  } catch (error: unknown) {
    return couponControllerError(res, error, 'Não foi possível consultar as campanhas.');
  }
});

router.get('/loyalty', authMiddleware, clientMiddleware, (req, res) =>
  ListLoyaltyCouponsController.handle(req, res),
);

router.post('/:id/redeem', authMiddleware, clientMiddleware, (req, res) =>
  RedeemLoyaltyCouponController.handle(req, res),
);

router.post('/', authMiddleware, adminMiddleware, billingMiddleware, (req, res) =>
  CreateCouponController.handle(req, res),
);

router.get('/', authMiddleware, adminMiddleware, (req, res) =>
  ListCouponController.handle(req, res),
);

router.put('/:id', authMiddleware, adminMiddleware, (req, res) =>
  UpdateCouponController.handle(req, res),
);

router.delete('/:id', authMiddleware, adminMiddleware, (req, res) =>
  DeleteCouponController.handle(req, res),
);

export default router;
