import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/authMiddleware.js';
import { superAdminMiddleware } from '../../../middlewares/superAdminMiddleware.js';
import GetAuditLogsController from '../controllers/GetAuditLogsController.js';

const router = Router();

router.get('/', authMiddleware, superAdminMiddleware, (req, res) =>
  GetAuditLogsController.handle(req, res),
);

export default router;
