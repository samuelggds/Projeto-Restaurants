import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/authMiddleware.js';
import { adminMiddleware } from '../../../middlewares/adminMiddleware.js';
import controller from '../controllers/EnhanceRestaurantImageController.js';

const router = Router();
router.post('/restaurant', authMiddleware, adminMiddleware, (req, res) =>
  controller.handle(req, res),
);
export default router;
