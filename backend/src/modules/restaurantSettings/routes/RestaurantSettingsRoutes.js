import { Router } from "express";

import { authMiddleware } from "../../../middlewares/authMiddleware.js";

import CreateRestaurantSettingsController from "../controllers/CreateRestaurantSettingsController.js";
import GetRestaurantSettingsController from "../controllers/GetRestaurantSettingsController.js";
import UpdateRestaurantSettingsController from "../controllers/UpdateRestaurantSettingsController.js";
import { staffMiddleware } from "../../../middlewares/staffMiddleware.js";
import { adminMiddleware } from "../../../middlewares/adminMiddleware.js";

const router = Router();

router.post("/", authMiddleware, adminMiddleware, (req, res) =>
  CreateRestaurantSettingsController.handle(req, res),
);

router.get("/", authMiddleware, adminMiddleware, (req, res) =>
  GetRestaurantSettingsController.handle(req, res),
);

router.put("/:id", authMiddleware, adminMiddleware, (req, res) =>
  UpdateRestaurantSettingsController.handle(req, res),
);

export default router;
