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
import GetTableAccountSettingsController from '../controllers/GetTableAccountSettingsController.js';
import UpdateTableAccountSettingsController from '../controllers/UpdateTableAccountSettingsController.js';
import ListTableAccountAdminSessionsController from '../controllers/ListTableAccountAdminSessionsController.js';
import ReconcileTablePaymentController from '../controllers/ReconcileTablePaymentController.js';

const router = Router();

router.get('/settings', authMiddleware, adminMiddleware, (req, res) =>
  GetTableAccountSettingsController.handle(req, res),
);

router.patch('/settings', authMiddleware, adminMiddleware, (req, res) =>
  UpdateTableAccountSettingsController.handle(req, res),
);

router.get('/admin/sessions', authMiddleware, waiterMiddleware, (req, res) =>
  ListTableAccountAdminSessionsController.handle(req, res),
);

router.get('/waiter/sessions', authMiddleware, waiterMiddleware, (req, res) =>
  ListTableAccountAdminSessionsController.handle(req, res),
);

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

router.post(
  '/sessions/:sessionPublicId/payments/:publicId/reconcile',
  optionalAuthMiddleware,
  tableAccountSessionMiddleware,
  tableParticipantMiddleware,
  tablePaymentActionRateLimitMiddleware,
  (req, res) => ReconcileTablePaymentController.handle(req, res),
);

router.post('/payments/:publicId/confirm-manual', authMiddleware, waiterMiddleware, (req, res) =>
  ConfirmManualTablePaymentController.handle(req, res),
);

router.post('/payments/:publicId/refund', authMiddleware, adminMiddleware, (req, res) =>
  RefundTablePaymentController.handle(req, res),
);

export default router;
