import { Router } from "express";
import CreateOrderController from "../controllers/CreateOrderController.js";
import { adminMiddleware } from "../../../middlewares/adminMiddleware.js";
import UpdateOrderStatusController from "../controllers/UpdateOrderStatusController.js";
import ClaimOrderForDeliveryController from "../controllers/ClaimOrderForDeliveryController.js";
import GetCourierFinanceController from "../controllers/GetCourierFinanceController.js";
import GetDeliveryTrackingController from "../controllers/GetDeliveryTrackingController.js";
import ListOrdersController from "../controllers/ListOrdersController.js";
import GetOrderByIdController from "../controllers/GetOrderByIdController.js";
import ListMyOrdersController from "../controllers/ListMyOrdersController.js";
import CancelOrderController from "../controllers/CancelOrderController.js";
import ConfirmOrderPaymentController from "../controllers/ConfirmOrderPaymentController.js";
import ConfirmOrderPaymentWithPinController from "../controllers/ConfirmOrderPaymentWithPinController.js";
import GenerateOrderPaymentConfirmationPinController from "../controllers/GenerateOrderPaymentConfirmationPinController.js";
import RequestOrderPaymentConfirmationPinController from "../controllers/RequestOrderPaymentConfirmationPinController.js";
import CreateOrderPixPaymentController from "../controllers/CreateOrderPixPaymentController.js";
import CreateOrderCardCheckoutController from "../controllers/CreateOrderCardCheckoutController.js";
import GetOrderPixPaymentStatusController from "../controllers/GetOrderPixPaymentStatusController.js";
import ConfirmOrderPixPaymentController from "../controllers/ConfirmOrderPixPaymentController.js";
import ReportOrderIssueController from "../controllers/ReportOrderIssueController.js";
import ReplyOrderIssueController from "../controllers/ReplyOrderIssueController.js";
import GetOrderIssueThreadController from "../controllers/GetOrderIssueThreadController.js";
import ResolveOrderIssueController from "../controllers/ResolveOrderIssueController.js";
import RefundOrderByAdminController from "../controllers/RefundOrderByAdminController.js";
import ClearOrdersAndCategoriesController from "../controllers/ClearOrdersAndCategoriesController.js";
import MercadoPagoOrderWebhookController from "../controllers/MercadoPagoOrderWebhookController.js";
import StripeOrderWebhookController from "../controllers/StripeOrderWebhookController.js";
import PagBankOrderWebhookController from "../controllers/PagBankOrderWebhookController.js";
import GetCurrentTableOrderController from "../controllers/GetCurrentTableOrderController.js";
import { staffMiddleware } from "../../../middlewares/staffMiddleware.js";
import { billingMiddleware } from "../../../middlewares/billingMiddleware.js";
import { orderAccessMiddleware } from "../../../middlewares/orderAccessMiddleware.js";
import { authMiddleware } from "../../../middlewares/authMiddleware.js";
import { sessionMiddleware } from "../../../middlewares/sessionMiddleware.js";
import {
  paymentPinAttemptRateLimitMiddleware,
  paymentPinRequestRateLimitMiddleware,
} from "../../../middlewares/security/orderPaymentRateLimitMiddleware.js";

const router = Router();

router.post("/webhook/mercadopago", MercadoPagoOrderWebhookController.handle);
router.post("/webhook/stripe", StripeOrderWebhookController.handle);
router.post("/webhook/pagbank", PagBankOrderWebhookController.handle);

router.post("/", orderAccessMiddleware, billingMiddleware, (req, res) => {
  CreateOrderController.handle(req, res);
});

router.post(
  "/pix/payment",
  orderAccessMiddleware,
  billingMiddleware,
  (req, res) => {
    CreateOrderPixPaymentController.handle(req, res);
  },
);

router.post(
  "/card/checkout",
  orderAccessMiddleware,
  billingMiddleware,
  (req, res) => {
    CreateOrderCardCheckoutController.handle(req, res);
  },
);

router.post(
  "/pix/payment/status",
  orderAccessMiddleware,
  billingMiddleware,
  (req, res) => {
    GetOrderPixPaymentStatusController.handle(req, res);
  },
);

router.post(
  "/pix/payment/confirm",
  orderAccessMiddleware,
  billingMiddleware,
  (req, res) => {
    ConfirmOrderPixPaymentController.handle(req, res);
  },
);

router.put("/:id/status", authMiddleware, staffMiddleware, (req, res) => {
  UpdateOrderStatusController.handle(req, res);
});

router.patch("/:id/claim-delivery", authMiddleware, (req, res) => {
  ClaimOrderForDeliveryController.handle(req, res);
});

router.patch(
  "/:id/confirm-payment",
  authMiddleware,
  adminMiddleware,
  (req, res) => {
    ConfirmOrderPaymentController.handle(req, res);
  },
);

router.post(
  "/:id/payment-confirmation-pin",
  authMiddleware,
  adminMiddleware,
  (req, res) => {
    GenerateOrderPaymentConfirmationPinController.handle(req, res);
  },
);

router.post(
  "/:id/request-payment-confirmation-pin",
  authMiddleware,
  staffMiddleware,
  paymentPinRequestRateLimitMiddleware,
  (req, res) => {
    RequestOrderPaymentConfirmationPinController.handle(req, res);
  },
);

router.patch(
  "/:id/confirm-payment-with-pin",
  authMiddleware,
  staffMiddleware,
  paymentPinAttemptRateLimitMiddleware,
  (req, res) => {
    ConfirmOrderPaymentWithPinController.handle(req, res);
  },
);

router.get("/", authMiddleware, staffMiddleware, (req, res) => {
  ListOrdersController.handle(req, res);
});

router.get("/courier/finance", authMiddleware, (req, res) => {
  GetCourierFinanceController.handle(req, res);
});

router.delete(
  "/cleanup/orders-categories",
  authMiddleware,
  adminMiddleware,
  (req, res) => {
    ClearOrdersAndCategoriesController.handle(req, res);
  },
);

router.get("/my-orders", authMiddleware, (req, res) => {
  ListMyOrdersController.handle(req, res);
});

router.get("/table/current", sessionMiddleware, (req, res) => {
  GetCurrentTableOrderController.handle(req, res);
});

router.get("/:id/tracking", authMiddleware, (req, res) => {
  GetDeliveryTrackingController.handle(req, res);
});

router.get("/:id", authMiddleware, staffMiddleware, (req, res) => {
  GetOrderByIdController.handle(req, res);
});

router.patch("/:id/cancel", authMiddleware, (req, res) => {
  CancelOrderController.handle(req, res);
});

router.post("/:id/report-issue", authMiddleware, (req, res) => {
  ReportOrderIssueController.handle(req, res);
});

router.get("/:id/issue-thread", authMiddleware, (req, res) => {
  GetOrderIssueThreadController.handle(req, res);
});

router.post("/:id/reply-issue", authMiddleware, adminMiddleware, (req, res) => {
  ReplyOrderIssueController.handle(req, res);
});

router.patch(
  "/:id/resolve-issue",
  authMiddleware,
  adminMiddleware,
  (req, res) => {
    ResolveOrderIssueController.handle(req, res);
  },
);

router.patch("/:id/refund", authMiddleware, adminMiddleware, (req, res) => {
  RefundOrderByAdminController.handle(req, res);
});

export default router;
