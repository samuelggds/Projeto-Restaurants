import { Router } from 'express';

import { adminMiddleware } from '../../../middlewares/adminMiddleware.js';
import { authMiddleware } from '../../../middlewares/authMiddleware.js';
import controller from '../controllers/CourierCompensationController.js';

const router = Router();

router.get('/admin/configuration', authMiddleware, adminMiddleware, (req, res) =>
  controller.getConfiguration(req, res),
);
router.put('/admin/configuration', authMiddleware, adminMiddleware, (req, res) =>
  controller.updateDefault(req, res),
);
router.put('/admin/couriers/:courierId/rule', authMiddleware, adminMiddleware, (req, res) =>
  controller.updateCourierOverride(req, res),
);
router.delete('/admin/couriers/:courierId/rule', authMiddleware, adminMiddleware, (req, res) =>
  controller.removeCourierOverride(req, res),
);
router.get('/admin/pending-orders', authMiddleware, adminMiddleware, (req, res) =>
  controller.pendingOrders(req, res),
);
router.get('/admin/settlements', authMiddleware, adminMiddleware, (req, res) =>
  controller.listAdminSettlements(req, res),
);
router.post('/admin/settlements', authMiddleware, adminMiddleware, (req, res) =>
  controller.createSettlement(req, res),
);
router.patch('/admin/settlements/:publicId/cancel', authMiddleware, adminMiddleware, (req, res) =>
  controller.cancelSettlement(req, res),
);

router.get('/courier/settlements', authMiddleware, (req, res) =>
  controller.listCourierSettlements(req, res),
);
router.post('/courier/settlements/:publicId/confirm', authMiddleware, (req, res) =>
  controller.confirmSettlement(req, res),
);
router.post('/courier/settlements/:publicId/dispute', authMiddleware, (req, res) =>
  controller.disputeSettlement(req, res),
);

export default router;
