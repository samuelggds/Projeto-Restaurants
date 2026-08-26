import { Router } from 'express';

import { authMiddleware } from '../../../middlewares/authMiddleware.js';
import { waiterMiddleware } from '../../../middlewares/waiterMiddleware.js';
import { sessionMiddleware } from '../../../middlewares/sessionMiddleware.js';

import OpenTableSessionController from '../controllers/OpenTableSessionController.js';
import ValidatePinController from '../controllers/ValidatePinController.js';
import CloseTableSessionController from '../controllers/CloseTableSessionController.js';
import ListOpenSessionsController from '../controllers/ListOpenSessionsController.js';
import RequestPinAssistanceController from '../controllers/RequestPinAssistanceController.js';
import GetCurrentSessionController from '../controllers/GetCurrentSessionController.js';
import JoinTableSessionController from '../controllers/JoinTableSessionController.js';
import {
  tablePinAssistanceRateLimitMiddleware,
  tablePinRateLimitMiddleware,
  tableJoinRateLimitMiddleware,
} from '../../../middlewares/security/tableSessionRateLimitMiddleware.js';
import { premiumTablePlanMiddleware } from '../../../middlewares/premiumTablePlanMiddleware.js';
import { optionalAuthMiddleware } from '../../../middlewares/optionalAuthMiddleware.js';
import { tableParticipantMiddleware } from '../../../middlewares/tableParticipantMiddleware.js';
import UpdateTableParticipantController from '../controllers/UpdateTableParticipantController.js';

const router = Router();

router.post('/join', tableJoinRateLimitMiddleware, optionalAuthMiddleware, (req, res) =>
  JoinTableSessionController.handle(req, res),
);

router.post('/validate', tablePinRateLimitMiddleware, (req, res) =>
  ValidatePinController.handle(req, res),
);
router.post('/request-pin', tablePinAssistanceRateLimitMiddleware, (req, res) =>
  RequestPinAssistanceController.handle(req, res),
);
router.get(
  '/current',
  optionalAuthMiddleware,
  sessionMiddleware,
  tableParticipantMiddleware,
  (req, res) => GetCurrentSessionController.handle(req, res),
);
router.patch(
  '/participant',
  optionalAuthMiddleware,
  sessionMiddleware,
  tableParticipantMiddleware,
  (req, res) => UpdateTableParticipantController.handle(req, res),
);

router.post('/open', authMiddleware, waiterMiddleware, premiumTablePlanMiddleware, (req, res) =>
  OpenTableSessionController.handle(req, res),
);

router.patch(
  '/:id/close',
  authMiddleware,
  waiterMiddleware,
  premiumTablePlanMiddleware,
  (req, res) => CloseTableSessionController.handle(req, res),
);

router.get('/open', authMiddleware, waiterMiddleware, premiumTablePlanMiddleware, (req, res) =>
  ListOpenSessionsController.handle(req, res),
);

export default router;
