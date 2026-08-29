import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/authMiddleware.js';
import { adminMiddleware } from '../../../middlewares/adminMiddleware.js';
import { billingMiddleware } from '../../../middlewares/billingMiddleware.js';
import { imageEnhancementRateLimitMiddleware } from '../../../middlewares/security/imageEnhancementRateLimitMiddleware.js';
import controller from '../controllers/EnhanceRestaurantImageController.js';

const router = Router();
router.post(
  '/restaurant',
  authMiddleware,
  adminMiddleware,
  billingMiddleware,
  imageEnhancementRateLimitMiddleware,
  (req, res) => controller.handle(req, res, 'COVER'),
);
router.post(
  '/banner',
  authMiddleware,
  adminMiddleware,
  billingMiddleware,
  imageEnhancementRateLimitMiddleware,
  (req, res) => controller.handle(req, res, 'BANNER'),
);
export default router;
