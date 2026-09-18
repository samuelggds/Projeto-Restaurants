import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/authMiddleware.js';
import { adminMiddleware } from '../../../middlewares/adminMiddleware.js';
import { billingMiddleware } from '../../../middlewares/billingMiddleware.js';
import { imageEnhancementRateLimitMiddleware } from '../../../middlewares/security/imageEnhancementRateLimitMiddleware.js';
import controller from '../controllers/ProductComboController.js';

const router = Router();
const admin = [authMiddleware, adminMiddleware, billingMiddleware] as const;

router.get('/', ...admin, (req, res) => controller.list(req, res));
router.post('/', ...admin, (req, res) => controller.create(req, res));
router.post('/generate-image-preview', ...admin, imageEnhancementRateLimitMiddleware, (req, res) =>
  controller.generatePreviewImage(req, res),
);
router.put('/:id', ...admin, (req, res) => controller.update(req, res));
router.delete('/:id', ...admin, (req, res) => controller.remove(req, res));
router.post('/:id/generate-image', ...admin, imageEnhancementRateLimitMiddleware, (req, res) =>
  controller.generateImage(req, res),
);

export default router;
