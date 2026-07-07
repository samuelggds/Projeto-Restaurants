import { Router } from "express";
import { authMiddleware } from "../../../middlewares/authMiddleware.js";
import { adminMiddleware } from "../../../middlewares/adminMiddleware.js";
import CreateEmployeeController from "../Controllers/CreateEmployeeController.js";
import ListEmployeeController from "../Controllers/ListEmployeeController.js";
import UpdateEmployeeController from "../Controllers/UpdateEmployeeController.js";
import DeactivateEmployeeController from "../Controllers/DeactivateEmployeeController.js";

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
