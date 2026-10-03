import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/authMiddleware.js';
import { adminMiddleware } from '../../../middlewares/adminMiddleware.js';
import ManagedServiceController from '../controllers/ManagedServiceController.js';

const router = Router();
router.use(authMiddleware, adminMiddleware);

router.get('/', (req, res, next) => ManagedServiceController.adminOverview(req, res, next));
router.post('/requests', (req, res, next) => ManagedServiceController.createRequest(req, res, next));

export default router;
