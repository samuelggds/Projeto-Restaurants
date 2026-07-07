import { Router } from "express";
import CreateOrderController from "../controllers/CreateOrderController.js";
import { adminMiddleware } from "../../../middlewares/adminMiddleware.js";
import UpdateOrderStatusController from "../controllers/UpdateOrderStatusController.js";
import ListOrdersController from "../controllers/ListOrdersController.js";
import GetOrderByIdController from "../controllers/GetOrderByIdController.js";
import ListMyOrdersController from "../controllers/ListMyOrdersController.js";
import CancelOrderController from "../controllers/CancelOrderController.js";
import ConfirmOrderPaymentController from "../controllers/ConfirmOrderPaymentController.js";
import ConfirmOrderPaymentWithPinController from "../controllers/ConfirmOrderPaymentWithPinController.js";
import GenerateOrderPaymentConfirmationPinController from "../controllers/GenerateOrderPaymentConfirmationPinController.js";
import RequestOrderPaymentConfirmationPinController from "../controllers/RequestOrderPaymentConfirmationPinController.js";
import CreateOrderPixPaymentController from "../controllers/CreateOrderPixPaymentController.js";
import GetOrderPixPaymentStatusController from "../controllers/GetOrderPixPaymentStatusController.js";
import { staffMiddleware } from "../../../middlewares/staffMiddleware.js";
import { billingMiddleware } from "../../../middlewares/billingMiddleware.js";
import { orderAccessMiddleware } from "../../../middlewares/orderAccessMiddleware.js";
import { authMiddleware } from "../../../middlewares/authMiddleware.js";

const router = Router();

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
  "/pix/payment/status",
  orderAccessMiddleware,
  billingMiddleware,
  (req, res) => {
    GetOrderPixPaymentStatusController.handle(req, res);
  },
);

router.put("/:id/status", authMiddleware, staffMiddleware, (req, res) => {
  UpdateOrderStatusController.handle(req, res);
});

router.patch(
  "/:id/confirm-payment",
  authMiddleware,
  staffMiddleware,
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
  (req, res) => {
    RequestOrderPaymentConfirmationPinController.handle(req, res);
  },
);

router.patch(
  "/:id/confirm-payment-with-pin",
  authMiddleware,
  staffMiddleware,
  (req, res) => {
    ConfirmOrderPaymentWithPinController.handle(req, res);
  },
);

router.get("/", authMiddleware, staffMiddleware, (req, res) => {
  ListOrdersController.handle(req, res);
});
router.get("/my-orders", authMiddleware, (req, res) => {
  ListMyOrdersController.handle(req, res);
});

router.get("/:id", authMiddleware, staffMiddleware, (req, res) => {
  GetOrderByIdController.handle(req, res);
});

router.patch("/:id/cancel", authMiddleware, (req, res) => {
  CancelOrderController.handle(req, res);
});

export default router;
