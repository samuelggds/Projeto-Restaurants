import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/authMiddleware.js';
import { superAdminMiddleware } from '../../../middlewares/superAdminMiddleware.js';
import CustomDomainController from '../controllers/CustomDomainController.js';

const router = Router();

router.get('/public/custom-domain/resolve', (req, res, next) =>
  CustomDomainController.resolve(req, res, next),
);

router.get('/super-admin/custom-domains', authMiddleware, superAdminMiddleware, (req, res, next) =>
  CustomDomainController.list(req, res, next),
);
router.get(
  '/super-admin/restaurants/:restaurantId/custom-domain',
  authMiddleware,
  superAdminMiddleware,
  (req, res, next) => CustomDomainController.get(req, res, next),
);
router.put(
  '/super-admin/restaurants/:restaurantId/custom-domain',
  authMiddleware,
  superAdminMiddleware,
  (req, res, next) => CustomDomainController.save(req, res, next),
);
router.post(
  '/super-admin/restaurants/:restaurantId/custom-domain/verify',
  authMiddleware,
  superAdminMiddleware,
  (req, res, next) => CustomDomainController.verify(req, res, next),
);
router.post(
  '/super-admin/restaurants/:restaurantId/custom-domain/activate',
  authMiddleware,
  superAdminMiddleware,
  (req, res, next) => CustomDomainController.activate(req, res, next),
);
router.post(
  '/super-admin/restaurants/:restaurantId/custom-domain/disable',
  authMiddleware,
  superAdminMiddleware,
  (req, res, next) => CustomDomainController.disable(req, res, next),
);

export default router;
