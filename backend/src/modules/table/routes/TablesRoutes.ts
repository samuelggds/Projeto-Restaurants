import { Router } from 'express';

import { authMiddleware } from '../../../middlewares/authMiddleware.js';
import { waiterMiddleware } from '../../../middlewares/waiterMiddleware.js';
import { adminMiddleware } from '../../../middlewares/adminMiddleware.js';

import CreateTableController from '../controllers/CreateTableController.js';
import ListTableController from '../controllers/ListTableController.js';
import GetTableByIdController from '../controllers/GetTableByIdController.js';
import UpdateTableController from '../controllers/UpdateTableController.js';
import DeactivateTableController from '../controllers/DeactivateTableController.js';
import DeleteTableController from '../controllers/DeleteTableController.js';
import ResolvePublicTableController from '../controllers/ResolvePublicTableController.js';
import { billingMiddleware } from '../../../middlewares/billingMiddleware.js';
import { premiumTablePlanMiddleware } from '../../../middlewares/premiumTablePlanMiddleware.js';

const router = Router();

router.get('/public/resolve', (req, res) => ResolvePublicTableController.handle(req, res));

router.post(
  '/',
  authMiddleware,
  adminMiddleware,
  billingMiddleware,
  premiumTablePlanMiddleware,
  (req, res) => CreateTableController.handle(req, res),
);

router.get('/', authMiddleware, waiterMiddleware, premiumTablePlanMiddleware, (req, res) =>
  ListTableController.handle(req, res),
);

router.get('/:id', authMiddleware, waiterMiddleware, premiumTablePlanMiddleware, (req, res) =>
  GetTableByIdController.handle(req, res),
);

router.put('/:id', authMiddleware, adminMiddleware, premiumTablePlanMiddleware, (req, res) =>
  UpdateTableController.handle(req, res),
);

router.patch('/:id', authMiddleware, adminMiddleware, premiumTablePlanMiddleware, (req, res) =>
  DeactivateTableController.handle(req, res),
);

router.delete('/:id', authMiddleware, adminMiddleware, premiumTablePlanMiddleware, (req, res) =>
  DeleteTableController.handle(req, res),
);

export default router;
