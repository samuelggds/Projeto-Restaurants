import { Router } from 'express';

import { authMiddleware } from '../../../middlewares/authMiddleware.js';

import CreateRestaurantSettingsController from '../controllers/CreateRestaurantSettingsController.js';
import GetRestaurantSettingsController from '../controllers/GetRestaurantSettingsController.js';
import UpdateRestaurantSettingsController from '../controllers/UpdateRestaurantSettingsController.js';
import GetPublicRestaurantSettingsController from '../controllers/GetPublicRestaurantSettingsController.js';
import OnboardRestaurantAsaasController from '../controllers/OnboardRestaurantAsaasController.js';
import GetAsaasWalletBalanceController from '../controllers/GetAsaasWalletBalanceController.js';
import WithdrawAsaasWalletController from '../controllers/WithdrawAsaasWalletController.js';
import StartMercadoPagoOAuthController from '../controllers/StartMercadoPagoOAuthController.js';
import MercadoPagoOAuthCallbackController from '../controllers/MercadoPagoOAuthCallbackController.js';
import StartPagBankOAuthController from '../controllers/StartPagBankOAuthController.js';
import PagBankOAuthCallbackController from '../controllers/PagBankOAuthCallbackController.js';
import { staffMiddleware } from '../../../middlewares/staffMiddleware.js';
import { adminMiddleware } from '../../../middlewares/adminMiddleware.js';
import { publicRestaurantBillingMiddleware } from '../../../middlewares/publicRestaurantBillingMiddleware.js';

const router = Router();

router.get('/public/default', publicRestaurantBillingMiddleware, (req, res) =>
  GetPublicRestaurantSettingsController.handle(req, res),
);

router.get('/public/slug/:slug', publicRestaurantBillingMiddleware, (req, res) =>
  GetPublicRestaurantSettingsController.handle(req, res),
);

router.get('/public/:restaurantId', publicRestaurantBillingMiddleware, (req, res) =>
  GetPublicRestaurantSettingsController.handle(req, res),
);

router.post('/', authMiddleware, adminMiddleware, (req, res) =>
  CreateRestaurantSettingsController.handle(req, res),
);

router.get('/', authMiddleware, adminMiddleware, (req, res) =>
  GetRestaurantSettingsController.handle(req, res),
);

router.post('/mercado-pago/oauth/start', authMiddleware, adminMiddleware, (req, res) =>
  StartMercadoPagoOAuthController.handle(req, res),
);

router.get('/mercado-pago/oauth/callback', (req, res) =>
  MercadoPagoOAuthCallbackController.handle(req, res),
);

router.post('/pagbank/oauth/start', authMiddleware, adminMiddleware, (req, res) =>
  StartPagBankOAuthController.handle(req, res),
);

router.get('/pagbank/oauth/callback', (req, res) =>
  PagBankOAuthCallbackController.handle(req, res),
);

router.post('/asaas/onboard', authMiddleware, adminMiddleware, (req, res) =>
  OnboardRestaurantAsaasController.handle(req, res),
);

router.get('/asaas/wallet/balance', authMiddleware, adminMiddleware, (req, res) =>
  GetAsaasWalletBalanceController.handle(req, res),
);

router.post('/asaas/wallet/withdraw', authMiddleware, adminMiddleware, (req, res) =>
  WithdrawAsaasWalletController.handle(req, res),
);

router.put('/:id', authMiddleware, adminMiddleware, (req, res) =>
  UpdateRestaurantSettingsController.handle(req, res),
);

export default router;
