import { Router } from 'express';
import MercadoPagoWebhookController from '../controllers/MercadoPagoWebhookController.js';
import BillingWebhookController from '../controllers/BillingWebhookController.js';
import GetInvoicesController from '../controllers/GetInvoicesController.js';
import GetAllInvoicesController from '../controllers/GetAllInvoicesController.js';
import GetPlansController from '../controllers/GetPlansController.js';
import RegenerateInvoicePaymentLinkController from '../controllers/RegenerateInvoicePaymentLinkController.js';
import PlatformRecurringBillingController from '../controllers/PlatformRecurringBillingController.js';
import { authMiddleware } from '../../../middlewares/authMiddleware.js';
import { adminMiddleware } from '../../../middlewares/adminMiddleware.js';
import { superAdminMiddleware } from '../../../middlewares/superAdminMiddleware.js';

const router = Router();

router.post('/webhook/mercadopago', MercadoPagoWebhookController.handle);
router.post('/webhook/mercadopago/test', BillingWebhookController.handle);

router.get('/plans', authMiddleware, adminMiddleware, (req, res) =>
  GetPlansController.handle(req, res),
);

router.get('/invoices', authMiddleware, adminMiddleware, (req, res) =>
  GetInvoicesController.handle(req, res),
);

router.get('/invoices/all', authMiddleware, superAdminMiddleware, (req, res) =>
  GetAllInvoicesController.handle(req, res),
);

router.post('/invoices/:id/regenerate-link', authMiddleware, adminMiddleware, (req, res) =>
  RegenerateInvoicePaymentLinkController.handle(req, res),
);

router.get('/recurring', authMiddleware, adminMiddleware, (req, res) =>
  PlatformRecurringBillingController.profile(req, res),
);
router.get('/recurring/config', authMiddleware, adminMiddleware, (req, res) =>
  PlatformRecurringBillingController.config(req, res),
);
router.post('/recurring/card', authMiddleware, adminMiddleware, (req, res) =>
  PlatformRecurringBillingController.card(req, res),
);
router.put('/recurring/pix', authMiddleware, adminMiddleware, (req, res) =>
  PlatformRecurringBillingController.pix(req, res),
);

export default router;
