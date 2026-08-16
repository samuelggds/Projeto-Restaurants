import { Router } from 'express';

import { authMiddleware } from '../../../middlewares/authMiddleware.js';
import { staffMiddleware } from '../../../middlewares/staffMiddleware.js';

import CreateTableController from '../controllers/CreateTableController.js';
import ListTableController from '../controllers/ListTableController.js';
import GetTableByIdController from '../controllers/GetTableByIdController.js';
import UpdateTableController from '../controllers/UpdateTableController.js';
import DeactivateTableController from '../controllers/DeactivateTableController.js';
import { billingMiddleware } from '../../../middlewares/billingMiddleware.js';
import { premiumTablePlanMiddleware } from '../../../middlewares/premiumTablePlanMiddleware.js';

const router = Router();

router.post(
  '/',
  authMiddleware,
  staffMiddleware,
  billingMiddleware,
  premiumTablePlanMiddleware,
  (req, res) => CreateTableController.handle(req, res),
);

router.get('/', authMiddleware, staffMiddleware, premiumTablePlanMiddleware, (req, res) =>
  ListTableController.handle(req, res),
);

router.get('/:id', authMiddleware, staffMiddleware, premiumTablePlanMiddleware, (req, res) =>
  GetTableByIdController.handle(req, res),
);

router.put('/:id', authMiddleware, staffMiddleware, premiumTablePlanMiddleware, (req, res) =>
  UpdateTableController.handle(req, res),
);

router.patch('/:id', authMiddleware, staffMiddleware, premiumTablePlanMiddleware, (req, res) =>
  DeactivateTableController.handle(req, res),
);

export default router;
