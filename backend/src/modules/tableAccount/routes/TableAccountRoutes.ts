import { Router } from 'express';
import { optionalAuthMiddleware } from '../../../middlewares/optionalAuthMiddleware.js';
import { tableAccountSessionMiddleware } from '../../../middlewares/tableAccountSessionMiddleware.js';
import { tableParticipantMiddleware } from '../../../middlewares/tableParticipantMiddleware.js';
import GetCurrentTableAccountController from '../controllers/GetCurrentTableAccountController.js';
import CreateTablePaymentIntentController from '../controllers/CreateTablePaymentIntentController.js';
import CancelTablePaymentIntentController from '../controllers/CancelTablePaymentIntentController.js';
import { tablePaymentActionRateLimitMiddleware } from '../../../middlewares/security/accountActionRateLimitMiddleware.js';
import ConfirmManualTablePaymentController from '../controllers/ConfirmManualTablePaymentController.js';
import { authMiddleware } from '../../../middlewares/authMiddleware.js';
import { waiterMiddleware } from '../../../middlewares/waiterMiddleware.js';
import FakeTablePaymentWebhookController from '../controllers/FakeTablePaymentWebhookController.js';
import RefundTablePaymentController from '../controllers/RefundTablePaymentController.js';
import { adminMiddleware } from '../../../middlewares/adminMiddleware.js';
import GetTableAccountAdminSnapshotController from '../controllers/GetTableAccountAdminSnapshotController.js';

const router = Router();

router.post('/webhooks/fake', (req, res) => FakeTablePaymentWebhookController.handle(req, res));

router.get(
  '/sessions/:sessionPublicId',
  optionalAuthMiddleware,
  tableAccountSessionMiddleware,
  tableParticipantMiddleware,
  (req, res) => GetCurrentTableAccountController.handle(req, res),
);

router.get('/sessions/:sessionPublicId/admin', authMiddleware, waiterMiddleware, (req, res) =>
  GetTableAccountAdminSnapshotController.handle(req, res),
);

router.post(
  '/sessions/:sessionPublicId/payments',
  optionalAuthMiddleware,
  tableAccountSessionMiddleware,
  tableParticipantMiddleware,
  tablePaymentActionRateLimitMiddleware,
  (req, res) => CreateTablePaymentIntentController.handle(req, res),
);

router.patch(
  '/sessions/:sessionPublicId/payments/:publicId/cancel',
  optionalAuthMiddleware,
  tableAccountSessionMiddleware,
  tableParticipantMiddleware,
  tablePaymentActionRateLimitMiddleware,
  (req, res) => CancelTablePaymentIntentController.handle(req, res),
);

router.post('/payments/:publicId/confirm-manual', authMiddleware, waiterMiddleware, (req, res) =>
  ConfirmManualTablePaymentController.handle(req, res),
);

router.post('/payments/:publicId/refund', authMiddleware, adminMiddleware, (req, res) =>
  RefundTablePaymentController.handle(req, res),
);

export default router;
