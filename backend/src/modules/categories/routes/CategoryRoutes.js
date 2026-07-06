import { Router } from "express";
import { authMiddleware } from "../../../middlewares/authMiddleware.js";
import { adminMiddleware } from "../../../middlewares/adminMiddleware.js";
import CreateCategoryController from "../controllers/CreateCategoryController.js";
import DeleteCategoryController from "../controllers/DeleteCategoryController.js";
import UpdateCategoryController from "../controllers/UpdateCategoryController.js";
import ListCategoryController from "../controllers/ListCategoryController.js";


const router = Router();

router.post("/", authMiddleware, adminMiddleware, (req, res) => {
  CreateCategoryController.handle(req, res);
});

router.delete("/:id", authMiddleware, adminMiddleware, (req, res) => {
  DeleteCategoryController.handle(req, res);
});

router.put("/:id", authMiddleware, adminMiddleware, (req, res) => {
  UpdateCategoryController.handle(req, res);
});

router.get("/", authMiddleware, adminMiddleware, (req, res) => {
  ListCategoryController.handle(req, res);
});

export default router;
