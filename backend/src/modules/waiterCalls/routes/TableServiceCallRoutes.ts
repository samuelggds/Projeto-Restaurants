import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/authMiddleware.js';
import { optionalAuthMiddleware } from '../../../middlewares/optionalAuthMiddleware.js';
import { sessionMiddleware } from '../../../middlewares/sessionMiddleware.js';
import { tableParticipantMiddleware } from '../../../middlewares/tableParticipantMiddleware.js';
import { waiterMiddleware } from '../../../middlewares/waiterMiddleware.js';
import { tableServiceCallRateLimitMiddleware } from '../../../middlewares/security/tableSessionRateLimitMiddleware.js';
import CreateTableServiceCallController from '../controllers/CreateTableServiceCallController.js';
import ListTableServiceCallsController from '../controllers/ListTableServiceCallsController.js';
import UpdateTableServiceCallStatusController from '../controllers/UpdateTableServiceCallStatusController.js';
import DeleteTableServiceCallController from '../controllers/DeleteTableServiceCallController.js';

const router = Router();

router.post(
  '/',
  tableServiceCallRateLimitMiddleware,
  optionalAuthMiddleware,
  sessionMiddleware,
  tableParticipantMiddleware,
  (req, res) => CreateTableServiceCallController.handle(req, res),
);

router.get('/', authMiddleware, waiterMiddleware, (req, res) =>
  ListTableServiceCallsController.handle(req, res),
);

router.patch('/:id/status', authMiddleware, waiterMiddleware, (req, res) =>
  UpdateTableServiceCallStatusController.handle(req, res),
);

router.delete('/:id', authMiddleware, waiterMiddleware, (req, res) =>
  DeleteTableServiceCallController.handle(req, res),
);

export default router;
