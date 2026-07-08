import { Router } from "express";

import { authMiddleware } from "../../../middlewares/authMiddleware.js";
import { staffMiddleware } from "../../../middlewares/staffMiddleware.js";

import CreateSubscriptionController from "../controllers/CreateSubscriptionController.js";
import GetSubscriptionController from "../controllers/GetSubscriptionController.js";
import UpdateSubscriptionController from "../controllers/UpdateSubscriptionController.js";
import RequestPlanChangeController from "../controllers/RequestPlanChangeController.js";
import { adminMiddleware } from "../../../middlewares/adminMiddleware.js";
import { superAdminMiddleware } from "../../../middlewares/superAdminMiddleware.js";

const router = Router();

router.post("/", authMiddleware, adminMiddleware, (req, res) =>
  CreateSubscriptionController.handle(req, res),
);

router.get("/", authMiddleware, adminMiddleware, (req, res) =>
  GetSubscriptionController.handle(req, res),
);

router.put("/", authMiddleware, adminMiddleware, (req, res) =>
  UpdateSubscriptionController.handle(req, res),
);

router.post("/change-plan", authMiddleware, adminMiddleware, (req, res) =>
  RequestPlanChangeController.handle(req, res),
);

export default router;
