import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/authMiddleware.js';
import { superAdminMiddleware } from '../../../middlewares/superAdminMiddleware.js';
import SuperAdminController from '../controllers/SuperAdminController.js';
import LalamoveReviewController from '../../externalDelivery/controllers/LalamoveReviewController.js';
import LalamoveCredentialController from '../../externalDelivery/controllers/LalamoveCredentialController.js';

const router = Router();

router.use(authMiddleware, superAdminMiddleware);

router.get('/dashboard', (req, res, next) => SuperAdminController.dashboard(req, res, next));

router.get('/delivery-partners/lalamove/requests', (req, res, next) =>
  LalamoveReviewController.queue(req, res, next),
);
router.patch('/delivery-partners/lalamove/requests/:restaurantId', (req, res, next) =>
  LalamoveReviewController.update(req, res, next),
);
router.get('/delivery-partners/lalamove/credentials/:restaurantId', (req, res, next) =>
  LalamoveCredentialController.status(req, res, next),
);
router.put('/delivery-partners/lalamove/credentials/:restaurantId', (req, res, next) =>
  LalamoveCredentialController.configure(req, res, next),
);
router.post('/delivery-partners/lalamove/credentials/:restaurantId/verify-sandbox', (req, res, next) =>
  LalamoveCredentialController.verifySandbox(req, res, next),
);
router.post('/delivery-partners/lalamove/credentials/:restaurantId/:environment/revoke', (req, res, next) =>
  LalamoveCredentialController.revoke(req, res, next),
);
router.get('/restaurants/:id', (req, res, next) =>
  SuperAdminController.restaurant(req, res, next),
);
router.delete('/restaurants/:id', (req, res, next) =>
  SuperAdminController.deleteRestaurant(req, res, next),
);
router.put('/settings', (req, res, next) => SuperAdminController.settings(req, res, next));
router.patch('/plans/:code', (req, res, next) => SuperAdminController.plan(req, res, next));
router.patch('/restaurants/:id/access', (req, res, next) =>
  SuperAdminController.restaurantAccess(req, res, next),
);
router.patch('/restaurants/:id/subscription', (req, res, next) =>
  SuperAdminController.restaurantSubscription(req, res, next),
);
router.post('/restaurants/:id/administrators', (req, res, next) =>
  SuperAdminController.createAdministrator(req, res, next),
);
router.post('/restaurants/:id/admin-portal-key', (req, res, next) =>
  SuperAdminController.rotateAdminPortalKey(req, res, next),
);
router.delete('/restaurants/:id/admin-portal-key', (req, res, next) =>
  SuperAdminController.revokeAdminPortalKey(req, res, next),
);
router.patch('/administrators/:id/access', (req, res, next) =>
  SuperAdminController.administratorAccess(req, res, next),
);
router.post('/support/:restaurantId/messages', (req, res, next) =>
  SuperAdminController.supportMessage(req, res, next),
);

export default router;
