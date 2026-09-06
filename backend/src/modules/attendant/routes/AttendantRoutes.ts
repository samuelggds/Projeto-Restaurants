import { Router } from 'express';
import { attendantMiddleware } from '../../../middlewares/attendantMiddleware.js';
import { authMiddleware } from '../../../middlewares/authMiddleware.js';
import UpdateTableServiceCallStatusController from '../../waiterCalls/controllers/UpdateTableServiceCallStatusController.js';
import GetAttendantWorkspaceController from '../controllers/GetAttendantWorkspaceController.js';

const router = Router();

router.get('/workspace', authMiddleware, attendantMiddleware, (req, res) =>
  GetAttendantWorkspaceController.handle(req, res),
);

router.patch('/calls/:id/status', authMiddleware, attendantMiddleware, (req, res) =>
  UpdateTableServiceCallStatusController.handle(req, res),
);

export default router;
