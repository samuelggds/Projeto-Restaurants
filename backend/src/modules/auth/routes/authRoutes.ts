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
import RequestPasswordResetController from "../controllers/RequestPasswordResetController.js";
import ResetPasswordByCodeController from "../controllers/ResetPasswordByCodeController.js";
import { loginRateLimitMiddleware } from "../../../middlewares/security/loginRateLimitMiddleware.js";
import RefreshTokenController from "../controllers/RefreshTokenController.js";
import LogoutController from "../controllers/LogoutController.js";
import VerifyLoginMfaController from "../controllers/VerifyLoginMfaController.js";
import UpdateMfaPreferenceController from "../controllers/UpdateMfaPreferenceController.js";
import {
  passwordResetRateLimitMiddleware,
  registrationRateLimitMiddleware,
} from "../../../middlewares/security/accountActionRateLimitMiddleware.js";

const router = Router();

router.post("/register", registrationRateLimitMiddleware, (req, res) => {
  RegisterController.handle(req, res);
});

router.post("/login", loginRateLimitMiddleware, (req, res) => {
  LoginController.handle(req, res);
});

router.post("/forgot-password", passwordResetRateLimitMiddleware, (req, res) => {
  RequestPasswordResetController.handle(req, res);
});

router.post("/reset-password", passwordResetRateLimitMiddleware, (req, res) => {
  ResetPasswordByCodeController.handle(req, res);
});

router.post("/google", (req, res) => {
  GoogleAuthController.handle(req, res);
});

router.post("/refresh", (req, res) => {
  RefreshTokenController.handle(req, res);
});

router.post("/logout", (req, res) => {
  LogoutController.handle(req, res);
});

router.post("/login/verify-2fa", loginRateLimitMiddleware, (req, res) => {
  VerifyLoginMfaController.handle(req, res);
});

router.get("/google/client-id", (req, res) => {
  const singleClientId = String(process.env.GOOGLE_CLIENT_ID || "").trim();
  const listClientIds = String(process.env.GOOGLE_CLIENT_IDS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const clientId = singleClientId || listClientIds[0] || null;

  return res.json({
    clientId,
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

router.patch("/mfa", authMiddleware, (req, res) => {
  UpdateMfaPreferenceController.handle(req, res);
});

router.patch("/deactivate", authMiddleware, (req, res) => {
  DeactivateUserController.handle(req, res);
});
router.patch("/reactivate", authMiddleware, (req, res) => {
  ReactivateUserController.handle(req, res);
});

export default router;
