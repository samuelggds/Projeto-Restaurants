import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/authMiddleware.js';
import { sessionMiddleware } from '../../../middlewares/sessionMiddleware.js';
import { waiterMiddleware } from '../../../middlewares/waiterMiddleware.js';
import { tableServiceCallRateLimitMiddleware } from '../../../middlewares/security/tableSessionRateLimitMiddleware.js';
import CreateTableServiceCallController from '../controllers/CreateTableServiceCallController.js';
import ListTableServiceCallsController from '../controllers/ListTableServiceCallsController.js';
import UpdateTableServiceCallStatusController from '../controllers/UpdateTableServiceCallStatusController.js';

const router = Router();

// The restaurant/table identity is always derived from the validated table
// session; restaurantId and tableId sent by the browser are intentionally ignored.
router.post('/', tableServiceCallRateLimitMiddleware, sessionMiddleware, (req, res) =>
  CreateTableServiceCallController.handle(req, res),
);

router.get('/', authMiddleware, waiterMiddleware, (req, res) =>
  ListTableServiceCallsController.handle(req, res),
);

router.patch('/:id/status', authMiddleware, waiterMiddleware, (req, res) =>
  UpdateTableServiceCallStatusController.handle(req, res),
);

export default router;
