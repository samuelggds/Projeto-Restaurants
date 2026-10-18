import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/authMiddleware.js';
import { adminMiddleware } from '../../../middlewares/adminMiddleware.js';
import ManagedServiceController from '../controllers/ManagedServiceController.js';

import { listSetupAccess, decideSetupAccess, revokeSetupAccess } from '../controllers/RestaurantSetupAccessController.js';

import { listRemoteSupport, decideRemoteSupport, closeRemoteSupport } from '../controllers/RestaurantRemoteSupportController.js';

const router = Router();
router.use(authMiddleware, adminMiddleware);

router.get('/remote-support/:restaurantId', listRemoteSupport);
router.patch('/remote-support/:restaurantId/:sessionId', decideRemoteSupport);
router.post('/remote-support/:restaurantId/:sessionId/close', closeRemoteSupport);

router.get('/setup-access/:restaurantId', listSetupAccess);
router.patch('/setup-access/:restaurantId/:id', decideSetupAccess);
router.post('/setup-access/:restaurantId/:id/revoke', revokeSetupAccess);

router.get('/', (req, res, next) => ManagedServiceController.adminOverview(req, res, next));
router.post('/requests', (req, res, next) => ManagedServiceController.createRequest(req, res, next));

export default router;
