import { Router } from 'express';

import { authMiddleware } from '../../../middlewares/authMiddleware.js';

import CreateSubscriptionController from '../controllers/CreateSubscriptionController.js';
import GetSubscriptionController from '../controllers/GetSubscriptionController.js';
import RequestPlanChangeController from '../controllers/RequestPlanChangeController.js';
import { adminMiddleware } from '../../../middlewares/adminMiddleware.js';

const router = Router();

router.post('/', authMiddleware, adminMiddleware, (req, res) =>
  CreateSubscriptionController.handle(req, res),
);

router.get('/', authMiddleware, adminMiddleware, (req, res) =>
  GetSubscriptionController.handle(req, res),
);

// ADMIN não pode alterar plano/status/trial diretamente. Trocas comerciais passam
// pelo fluxo validado abaixo; alterações privilegiadas pertencem ao SUPER_ADMIN.
router.post('/change-plan', authMiddleware, adminMiddleware, (req, res) =>
  RequestPlanChangeController.handle(req, res),
);

export default router;
