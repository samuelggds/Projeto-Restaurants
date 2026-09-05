import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/authMiddleware.js';
import PickupPaymentController from '../controllers/PickupPaymentController.js';

const router = Router();

router.post('/:id/start', authMiddleware, (req, res) => PickupPaymentController.start(req, res));
router.post('/:id/reconcile', authMiddleware, (req, res) => PickupPaymentController.reconcile(req, res));
router.post('/:id/cash', authMiddleware, (req, res) => PickupPaymentController.cash(req, res));

export default router;
