import { Router } from 'express';

import { adminMiddleware } from '../../../middlewares/adminMiddleware.js';
import { authMiddleware } from '../../../middlewares/authMiddleware.js';
import { staffMiddleware } from '../../../middlewares/staffMiddleware.js';
import controller from '../controllers/EmployeeCompensationController.js';

const router = Router();
const admin = [authMiddleware, adminMiddleware] as const;

router.get('/admin/policies', ...admin, (req, res) => controller.listPolicies(req, res));
router.get('/admin/employees/:employeeId/policies', ...admin, (req, res) =>
  controller.getEmployeePolicies(req, res),
);
router.post('/admin/employees/:employeeId/policies', ...admin, (req, res) =>
  controller.createPolicy(req, res),
);
router.post('/admin/policies/:publicId/close', ...admin, (req, res) =>
  controller.closePolicy(req, res),
);
router.get('/admin/earnings', ...admin, (req, res) => controller.listEarnings(req, res));
router.post('/admin/earnings/adjustments', ...admin, (req, res) =>
  controller.createAdjustment(req, res),
);
router.get('/admin/work-entries', ...admin, (req, res) => controller.listWorkEntries(req, res));
router.post('/admin/work-entries', ...admin, (req, res) => controller.createWorkEntry(req, res));
router.post('/admin/work-entries/:publicId/approve', ...admin, (req, res) =>
  controller.approveWorkEntry(req, res),
);
router.post('/admin/work-entries/:publicId/cancel', ...admin, (req, res) =>
  controller.cancelWorkEntry(req, res),
);
router.get('/admin/settlements', ...admin, (req, res) => controller.listSettlements(req, res));
router.post('/admin/settlements', ...admin, (req, res) => controller.generateSettlement(req, res));
router.get('/admin/settlements/:publicId', ...admin, (req, res) =>
  controller.getSettlement(req, res),
);
router.post('/admin/settlements/:publicId/confirm', ...admin, (req, res) =>
  controller.confirmSettlement(req, res),
);
router.post('/admin/settlements/:publicId/cancel', ...admin, (req, res) =>
  controller.cancelSettlement(req, res),
);
router.post('/admin/settlements/:publicId/payments', ...admin, (req, res) =>
  controller.registerPayment(req, res),
);
router.post('/admin/payments/:publicId/reverse', ...admin, (req, res) =>
  controller.reversePayment(req, res),
);
router.get('/table-sessions/:sessionId/waiter', authMiddleware, staffMiddleware, (req, res) =>
  controller.getWaiterAssignment(req, res),
);
router.put('/admin/table-sessions/:sessionId/waiter', ...admin, (req, res) =>
  controller.assignWaiter(req, res),
);

router.get('/me/earnings', authMiddleware, staffMiddleware, (req, res) =>
  controller.ownEarnings(req, res),
);
router.get('/me/settlements', authMiddleware, staffMiddleware, (req, res) =>
  controller.ownSettlements(req, res),
);
router.get('/me/settlements/:publicId', authMiddleware, staffMiddleware, (req, res) =>
  controller.ownSettlement(req, res),
);
router.get('/me/payments/:publicId', authMiddleware, staffMiddleware, (req, res) =>
  controller.ownPayment(req, res),
);

export default router;
