import { Router } from "express";
import MercadoPagoWebhookController from "../controllers/MercadoPagoWebhookController.js";
import BillingWebhookController from "../controllers/BillingWebhookController.js";
import GetInvoicesController from "../controllers/GetInvoicesController.js";
import RegenerateInvoicePaymentLinkController from "../controllers/RegenerateInvoicePaymentLinkController.js";
import { authMiddleware } from "../../../middlewares/authMiddleware.js";
import { adminMiddleware } from "../../../middlewares/adminMiddleware.js";
const router = Router();
// Webhook routes (public)
router.post("/webhook/mercadopago", MercadoPagoWebhookController.handle);
// Route for local testing (bypasses Mercado Pago API; uses webhook payload directly)
router.post("/webhook/mercadopago/test", BillingWebhookController.handle);
// Invoice routes (protected)
router.get("/invoices", authMiddleware, adminMiddleware, (req, res) => GetInvoicesController.handle(req, res));
router.post("/invoices/:id/regenerate-link", authMiddleware, adminMiddleware, (req, res) => RegenerateInvoicePaymentLinkController.handle(req, res));
export default router;
