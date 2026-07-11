import { Router } from "express";

import authRoutes from "../modules/auth/routes/authRoutes.js";
import productRoutes from "../modules/products/routes/productsRoutes.js";
import orderRoutes from "../modules/orders/routes/orderRoutes.js";
import restaurantRoutes from "../modules/restaurants/routes/restaurantRoutes.js";
import categoryRoutes from "../modules/categories/routes/CategoryRoutes.js";
import employeeRoutes from "../modules/employee/routes/EmployeeRoutes.js";
import tableSessionRoutes from "../modules/tableSession/routes//SessionsTablesRoutes.js";
import tableRoutes from "../modules/table/routes/TablesRoutes.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import restaurantSettingsRoutes from "../modules/restaurantSettings/routes/RestaurantSettingsRoutes.js";
import bannerRoutes from "../modules/banner/routes/BannerRoutes.js";
import couponRoutes from "../modules/coupon/routes/CouponRoutes.js";
import subscripitionRoutes from "../modules/subscription/routes/SubscriptionRoutes.js";
import aiSupportRoutes from "../modules/aiSupport/routes/AiSupportRoutes.js";
import menuImportRoutes from "../modules/menuImport/routes/MenuImportRoutes.js";
import AsaasOrderWebhookController from "../modules/orders/controllers/AsaasOrderWebhookController.js";
import AsaasWithdrawValidationWebhookController from "../modules/restaurantSettings/controllers/AsaasWithdrawValidationWebhookController.js";

const router = Router();

router.post("/api/webhooks/asaas", (req, res) => {
  AsaasOrderWebhookController.handle(req, res);
});

router.post("/api/webhooks/asaas/withdraw-validation", (req, res) => {
  AsaasWithdrawValidationWebhookController.handle(req, res);
});

router.use("/auth", authRoutes);
router.use("/restaurants", restaurantRoutes);
router.use("/categories", categoryRoutes);
router.use("/products", productRoutes);
router.use("/orders", orderRoutes);
router.use("/employees", employeeRoutes);
router.use("/table-sessions", tableSessionRoutes);
router.use("/tables", tableRoutes);
router.use("/settings", restaurantSettingsRoutes);
router.use("/banners", bannerRoutes);
router.use("/coupons", couponRoutes);
router.use("/subscription", subscripitionRoutes);
router.use("/ai-support", aiSupportRoutes);
router.use("/menu-import", menuImportRoutes);

router.get("/profile", authMiddleware, (req, res) => {
  return res.json({
    message: "Rota protegida!",
    user: req.user,
  });
});

export default router;
