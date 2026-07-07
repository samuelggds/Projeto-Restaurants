import { Router } from "express";
import RegisterController from "../controllers/RegisterController.js";
import LoginController from "../controllers/LoginController.js";
import GoogleAuthController from "../controllers/GoogleAuthController.js";
import MeController from "../controllers/MeController.js";
import { authMiddleware } from "../../../middlewares/authMiddleware.js";
import UpdatePasswordController from "../controllers/UpdatePasswordController.js";
import UpdateProfileController from "../controllers/UpdateProfileController.js";
import DeactivateUserController from "../controllers/DeactivateUserController.js";
import ReactivateUserController from "../controllers/ReactivateUserController.js";

const router = Router();

router.post("/register", (req, res) => {
  RegisterController.handle(req, res);
});

router.post("/login", (req, res) => {
  LoginController.handle(req, res);
});

router.post("/google", (req, res) => {
  GoogleAuthController.handle(req, res);
});

router.get("/google/client-id", (req, res) => {
  return res.json({
    clientId: process.env.GOOGLE_CLIENT_ID || null,
  });
});

router.get("/me", authMiddleware, (req, res) => {
  MeController.handle(req, res);
});

router.put("/password", authMiddleware, (req, res) => {
  UpdatePasswordController.handle(req, res);
});

router.put("/profile", authMiddleware, (req, res) => {
  UpdateProfileController.handle(req, res);
});

router.patch("/deactivate", authMiddleware, (req, res) => {
  DeactivateUserController.handle(req, res);
});
router.patch("/reactivate", authMiddleware, (req, res) => {
  ReactivateUserController.handle(req, res);
});

export default router;
