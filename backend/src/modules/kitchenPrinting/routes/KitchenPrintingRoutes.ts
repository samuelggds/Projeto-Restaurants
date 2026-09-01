import { Router } from 'express';

import { adminMiddleware } from '../../../middlewares/adminMiddleware.js';
import { authMiddleware } from '../../../middlewares/authMiddleware.js';
import { kitchenPrintingRoleMiddleware } from '../../../middlewares/kitchenPrintingRoleMiddleware.js';
import { printerAgentAuthMiddleware } from '../../../middlewares/printerAgentAuthMiddleware.js';
import {
  printerAgentRateLimitMiddleware,
  printerCredentialRateLimitMiddleware,
} from '../../../middlewares/security/kitchenPrintingRateLimitMiddleware.js';
import controller from '../controllers/KitchenPrintingController.js';

const router = Router();

router.get('/settings', authMiddleware, adminMiddleware, (req, res) =>
  controller.getSettings(req, res),
);
router.patch('/settings', authMiddleware, adminMiddleware, (req, res) =>
  controller.updateSettings(req, res),
);
router.post(
  '/devices/credential',
  authMiddleware,
  adminMiddleware,
  printerCredentialRateLimitMiddleware,
  (req, res) => controller.issueCredential(req, res),
);
router.delete('/devices/:devicePublicId', authMiddleware, adminMiddleware, (req, res) =>
  controller.revokeCredential(req, res),
);
router.post('/test', authMiddleware, adminMiddleware, (req, res) => controller.testPrint(req, res));
router.get('/jobs', authMiddleware, adminMiddleware, (req, res) => controller.listJobs(req, res));
router.post('/jobs/:jobPublicId/retry', authMiddleware, adminMiddleware, (req, res) =>
  controller.retryJob(req, res),
);
router.post('/orders/:orderId/reprint', authMiddleware, kitchenPrintingRoleMiddleware, (req, res) =>
  controller.reprintOrder(req, res),
);

router.post(
  '/agent/heartbeat',
  printerAgentRateLimitMiddleware,
  printerAgentAuthMiddleware,
  (req, res) => controller.agentHeartbeat(req, res),
);
router.post(
  '/agent/jobs/claim',
  printerAgentRateLimitMiddleware,
  printerAgentAuthMiddleware,
  (req, res) => controller.agentClaim(req, res),
);
router.post(
  '/agent/jobs/:jobPublicId/printed',
  printerAgentRateLimitMiddleware,
  printerAgentAuthMiddleware,
  (req, res) => controller.agentPrinted(req, res),
);
router.post(
  '/agent/jobs/:jobPublicId/failed',
  printerAgentRateLimitMiddleware,
  printerAgentAuthMiddleware,
  (req, res) => controller.agentFailed(req, res),
);

export default router;
