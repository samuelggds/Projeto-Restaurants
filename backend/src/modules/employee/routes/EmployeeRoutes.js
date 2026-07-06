import { Router } from "express";
import { authMiddleware } from "../../../middlewares/authMiddleware.js";
import { adminMiddleware } from "../../../middlewares/adminMiddleware.js";
import CreateEmployeeController from "../controllers/CreateEmployeeController.js";
import ListEmployeeController from "../controllers/ListEmployeeController.js";
import UpdateEmployeeController from "../controllers/UpdateEmployeeController.js";
import DeactivateEmployeeController from "../controllers/DeactivateEmployeeController.js";

const router = Router();

router.post("/", authMiddleware, adminMiddleware, (req, res) => {
  CreateEmployeeController.handle(req, res);
});
router.get("/", authMiddleware, adminMiddleware, (req, res) => {
  ListEmployeeController.handle(req, res);
});

router.put("/:id", authMiddleware, adminMiddleware, (req, res) => {
  UpdateEmployeeController.handle(req, res);
});

router.patch("/:id", authMiddleware, adminMiddleware, (req, res) => {
  DeactivateEmployeeController.handle(req, res);
});

export default router;
