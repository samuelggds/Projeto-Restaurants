import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/authMiddleware.js';
import { superAdminMiddleware } from '../../../middlewares/superAdminMiddleware.js';
import CreateRestaurantController from '../controllers/CreateRestaurantController.js';
import ListRestaurantsController from '../controllers/ListRestaurantsController.js';
import GetRestaurantsMetricsController from '../controllers/GetRestaurantsMetricsController.js';
import GetRestaurantAvailabilityController from '../controllers/GetRestaurantAvailabilityController.js';

const router = Router();

// Consulta pública deliberadamente mínima: permite que telas já abertas saiam
// do bloqueio sem revelar faturas, motivo da suspensão ou dados do tenant.
router.get('/:id/availability', (req, res) => {
  GetRestaurantAvailabilityController.handle(req, res);
});

router.get('/', authMiddleware, superAdminMiddleware, (req, res) => {
  ListRestaurantsController.handle(req, res);
});

router.get('/metrics', authMiddleware, superAdminMiddleware, (req, res) => {
  GetRestaurantsMetricsController.handle(req, res);
});

router.post('/', authMiddleware, superAdminMiddleware, (req, res) => {
  CreateRestaurantController.handle(req, res);
});

export default router;
