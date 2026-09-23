import { Router } from 'express';
import RegisterController from '../controllers/RegisterController.js';
import LoginController from '../controllers/LoginController.js';
import GoogleAuthController from '../controllers/GoogleAuthController.js';
import MeController from '../controllers/MeController.js';
import { authMiddleware } from '../../../middlewares/authMiddleware.js';
import UpdatePasswordController from '../controllers/UpdatePasswordController.js';
import UpdateProfileController from '../controllers/UpdateProfileController.js';
import DeactivateUserController from '../controllers/DeactivateUserController.js';
import RequestPasswordResetController from '../controllers/RequestPasswordResetController.js';
import ResetPasswordByCodeController from '../controllers/ResetPasswordByCodeController.js';
import { loginRateLimitMiddleware } from '../../../middlewares/security/loginRateLimitMiddleware.js';
import RefreshTokenController from '../controllers/RefreshTokenController.js';
import LogoutController from '../controllers/LogoutController.js';
import VerifyLoginMfaController from '../controllers/VerifyLoginMfaController.js';
import ResendLoginMfaController from '../controllers/ResendLoginMfaController.js';
import SelectLoginMfaChannelController from '../controllers/SelectLoginMfaChannelController.js';
import ClaimEmployeeOnboardingController from '../controllers/ClaimEmployeeOnboardingController.js';
import UpdateMfaPreferenceController from '../controllers/UpdateMfaPreferenceController.js';
import VerifyEmailController from '../controllers/VerifyEmailController.js';
import ResendEmailVerificationController from '../controllers/ResendEmailVerificationController.js';
import PhoneAuthConfigController from '../controllers/PhoneAuthConfigController.js';
import RequestPhoneVerificationController from '../controllers/RequestPhoneVerificationController.js';
import ConfirmPhoneVerificationController from '../controllers/ConfirmPhoneVerificationController.js';
import RequestSmsPasswordResetController from '../controllers/RequestSmsPasswordResetController.js';
import ResetPasswordBySmsController from '../controllers/ResetPasswordBySmsController.js';
import {
  emailVerificationRateLimitMiddleware,
  passwordResetRateLimitMiddleware,
  registrationRateLimitMiddleware,
  securityPreferenceRateLimitMiddleware,
  smsRecoveryRequestRateLimitMiddleware,
  smsRecoveryVerifyRateLimitMiddleware,
} from '../../../middlewares/security/accountActionRateLimitMiddleware.js';

const router = Router();

router.post('/register', registrationRateLimitMiddleware, (req, res) => {
  RegisterController.handle(req, res);
});

router.post('/login', loginRateLimitMiddleware, (req, res) => {
  LoginController.handle(req, res);
});

router.get('/verify-email', (req, res) => {
  VerifyEmailController.handle(req, res);
});

router.post('/resend-email-verification', emailVerificationRateLimitMiddleware, (req, res) => {
  ResendEmailVerificationController.handle(req, res);
});

router.get('/phone-auth/config', (_req, res) => {
  PhoneAuthConfigController.handle(_req, res);
});

router.post('/phone-verification/request', authMiddleware, securityPreferenceRateLimitMiddleware, (req, res) => {
  RequestPhoneVerificationController.handle(req, res);
});

router.post('/phone-verification/confirm', authMiddleware, securityPreferenceRateLimitMiddleware, (req, res) => {
  ConfirmPhoneVerificationController.handle(req, res);
});

router.post('/forgot-password/sms', smsRecoveryRequestRateLimitMiddleware, (req, res) => {
  RequestSmsPasswordResetController.handle(req, res);
});

router.post('/reset-password/sms', smsRecoveryVerifyRateLimitMiddleware, (req, res) => {
  ResetPasswordBySmsController.handle(req, res);
});


router.post('/forgot-password', passwordResetRateLimitMiddleware, (req, res) => {
  RequestPasswordResetController.handle(req, res);
});

router.post('/reset-password', passwordResetRateLimitMiddleware, (req, res) => {
  ResetPasswordByCodeController.handle(req, res);
});

router.post('/google', (req, res) => {
  GoogleAuthController.handle(req, res);
});

router.post('/refresh', (req, res) => {
  RefreshTokenController.handle(req, res);
});

router.post('/logout', (req, res) => {
  LogoutController.handle(req, res);
});

router.post('/login/select-2fa-channel', loginRateLimitMiddleware, (req, res) => {
  SelectLoginMfaChannelController.handle(req, res);
});

router.post('/login/verify-2fa', loginRateLimitMiddleware, (req, res) => {
  VerifyLoginMfaController.handle(req, res);
});

router.post('/login/resend-2fa', loginRateLimitMiddleware, (req, res) => {
  ResendLoginMfaController.handle(req, res);
});

router.post('/employee-onboarding/claim', authMiddleware, (req, res) => {
  ClaimEmployeeOnboardingController.handle(req, res);
});

router.get('/google/client-id', (req, res) => {
  const singleClientId = String(process.env.GOOGLE_CLIENT_ID || '').trim();
  const listClientIds = String(process.env.GOOGLE_CLIENT_IDS || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  const clientId = singleClientId || listClientIds[0] || null;

  return res.json({
    clientId,
  });
});

router.get('/me', authMiddleware, (req, res) => {
  MeController.handle(req, res);
});

router.put('/password', authMiddleware, (req, res) => {
  UpdatePasswordController.handle(req, res);
});

router.put('/profile', authMiddleware, (req, res) => {
  UpdateProfileController.handle(req, res);
});

router.patch('/mfa', authMiddleware, securityPreferenceRateLimitMiddleware, (req, res) => {
  UpdateMfaPreferenceController.handle(req, res);
});

router.patch('/deactivate', authMiddleware, (req, res) => {
  DeactivateUserController.handle(req, res);
});

export default router;
