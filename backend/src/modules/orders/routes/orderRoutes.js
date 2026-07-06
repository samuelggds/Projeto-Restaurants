import { Router } from "express";
import CreateOrderController from "../controllers/CreateOrderController.js";
import { adminMiddleware } from "../../../middlewares/adminMiddleware.js";
import UpdateOrderStatusController from "../controllers/UpdateOrderStatusController.js";
import ListOrdersController from "../controllers/ListOrdersController.js";
import GetOrderByIdController from "../controllers/GetOrderByIdController.js";
import ListMyOrdersController from "../controllers/ListMyOrdersController.js";
import CancelOrderController from "../controllers/CancelOrderController.js";
import { staffMiddleware } from "../../../middlewares/staffMiddleware.js";
import { billingMiddleware } from "../../../middlewares/billingMiddleware.js";
import { orderAccessMiddleware } from "../../../middlewares/orderAccessMiddleware.js";
import { authMiddleware } from "../../../middlewares/authMiddleware.js";

const router = Router();

router.post("/", orderAccessMiddleware, billingMiddleware, (req, res) => {
  CreateOrderController.handle(req, res);
});

router.put("/:id/status", authMiddleware, staffMiddleware, (req, res) => {
  UpdateOrderStatusController.handle(req, res);
});

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
