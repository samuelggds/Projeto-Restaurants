import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/authMiddleware.js';
import { superAdminMiddleware } from '../../../middlewares/superAdminMiddleware.js';
import ManagedServiceController from '../controllers/ManagedServiceController.js';

const router = Router();
router.use(authMiddleware, superAdminMiddleware);

router.get('/', (req, res, next) => ManagedServiceController.superQueue(req, res, next));
router.patch('/implementations/:restaurantId', (req, res, next) =>
  ManagedServiceController.updateImplementation(req, res, next),
);
router.patch('/requests/:requestId', (req, res, next) =>
  ManagedServiceController.updateRequest(req, res, next),
);

export default router;
