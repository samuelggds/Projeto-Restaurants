import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/authMiddleware.js';
import { adminMiddleware } from '../../../middlewares/adminMiddleware.js';
import PaymentTerminalController from '../controllers/PaymentTerminalController.js';

const router = Router();

router.get('/', authMiddleware, adminMiddleware, (req, res) =>
  PaymentTerminalController.list(req, res),
);

router.post('/mercado-pago/sync', authMiddleware, adminMiddleware, (req, res) =>
  PaymentTerminalController.syncMercadoPago(req, res),
);

router.patch('/:publicId/assignment', authMiddleware, adminMiddleware, (req, res) =>
  PaymentTerminalController.assign(req, res),
);

export default router;
