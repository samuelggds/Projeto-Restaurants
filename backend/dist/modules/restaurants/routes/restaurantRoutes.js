import { Router } from "express";
import { authMiddleware } from "../../../middlewares/authMiddleware.js";
import { superAdminMiddleware } from "../../../middlewares/superAdminMiddleware.js";
import CreateRestaurantController from "../controllers/CreateRestaurantController.js";
import ListRestaurantsController from "../controllers/ListRestaurantsController.js";
import GetRestaurantsMetricsController from "../controllers/GetRestaurantsMetricsController.js";
const router = Router();
router.get("/", authMiddleware, superAdminMiddleware, (req, res) => {
    ListRestaurantsController.handle(req, res);
});
router.get("/metrics", authMiddleware, superAdminMiddleware, (req, res) => {
    GetRestaurantsMetricsController.handle(req, res);
});
router.post("/", authMiddleware, superAdminMiddleware, (req, res) => {
    CreateRestaurantController.handle(req, res);
});
export default router;
