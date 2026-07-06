import { Router } from "express";
import CreateProductController from "../controllers/CreateProductController.js";
import UpdateProductController from "../controllers/UpdateProductController.js";
import DeleteProductController from "../controllers/DeleteProductController.js";
import ListProductsController from "../controllers/ListProductController.js";
import { authMiddleware } from "../../../middlewares/authMiddleware.js";
import { adminMiddleware } from "../../../middlewares/adminMiddleware.js";


const router = Router();

router.post(
  "/",
  authMiddleware,
  adminMiddleware,
  CreateProductController.handle,
);

router.get("/", ListProductsController.handle);

router.put(
  "/:id",
  authMiddleware,
  adminMiddleware,
  UpdateProductController.handle,
);

router.delete(
  "/:id",
  authMiddleware,
  adminMiddleware,
  DeleteProductController.handle,
);

export default router;
