import { Router } from 'express';

import { authMiddleware } from '../../../middlewares/authMiddleware.js';

import CreateRestaurantSettingsController from '../controllers/CreateRestaurantSettingsController.js';
import GetRestaurantSettingsController from '../controllers/GetRestaurantSettingsController.js';
import UpdateRestaurantSettingsController from '../controllers/UpdateRestaurantSettingsController.js';
import GetPublicRestaurantSettingsController from '../controllers/GetPublicRestaurantSettingsController.js';
import GetPublicRestaurantSettingsRevisionController from '../controllers/GetPublicRestaurantSettingsRevisionController.js';
import GetPublicCardPaymentConfigController from '../controllers/GetPublicCardPaymentConfigController.js';
import OnboardRestaurantAsaasController from '../controllers/OnboardRestaurantAsaasController.js';
import GetAsaasConnectionStatusController from '../controllers/GetAsaasConnectionStatusController.js';
import GetPaymentConnectionsController from '../controllers/GetPaymentConnectionsController.js';
import GetAsaasWalletBalanceController from '../controllers/GetAsaasWalletBalanceController.js';
import WithdrawAsaasWalletController from '../controllers/WithdrawAsaasWalletController.js';
import StartMercadoPagoOAuthController from '../controllers/StartMercadoPagoOAuthController.js';
import DisconnectMercadoPagoController from '../controllers/DisconnectMercadoPagoController.js';
import MercadoPagoOAuthCallbackController from '../controllers/MercadoPagoOAuthCallbackController.js';
import StartPagBankOAuthController from '../controllers/StartPagBankOAuthController.js';
import PagBankOAuthCallbackController from '../controllers/PagBankOAuthCallbackController.js';
import UpdateWhatsappProfilePhotoController from '../controllers/UpdateWhatsappProfilePhotoController.js';
import EvolutionWhatsappConnectionController from '../controllers/EvolutionWhatsappConnectionController.js';
import { adminMiddleware } from '../../../middlewares/adminMiddleware.js';
import { publicRestaurantBillingMiddleware } from '../../../middlewares/publicRestaurantBillingMiddleware.js';

const router = Router();

router.get('/public/default/revision', publicRestaurantBillingMiddleware, (req, res) =>
  GetPublicRestaurantSettingsRevisionController.handle(req, res),
);

router.get('/public/slug/:slug/revision', publicRestaurantBillingMiddleware, (req, res) =>
  GetPublicRestaurantSettingsRevisionController.handle(req, res),
);

router.get('/public/:restaurantId/revision', publicRestaurantBillingMiddleware, (req, res) =>
  GetPublicRestaurantSettingsRevisionController.handle(req, res),
);

router.get('/public/:restaurantId/card-payment-config', publicRestaurantBillingMiddleware, (req, res) =>
  GetPublicCardPaymentConfigController.handle(req, res),
);

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

router.get('/payment-connections', authMiddleware, adminMiddleware, (req, res) =>
  GetPaymentConnectionsController.handle(req, res),
);

router.post('/mercado-pago/oauth/start', authMiddleware, adminMiddleware, (req, res) =>
  StartMercadoPagoOAuthController.handle(req, res),
);

router.post('/mercado-pago/disconnect', authMiddleware, adminMiddleware, (req, res) =>
  DisconnectMercadoPagoController.handle(req, res),
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

router.get('/asaas/status', authMiddleware, adminMiddleware, (req, res) =>
  GetAsaasConnectionStatusController.handle(req, res),
);

router.get('/asaas/wallet/balance', authMiddleware, adminMiddleware, (req, res) =>
  GetAsaasWalletBalanceController.handle(req, res),
);

router.post('/asaas/wallet/withdraw', authMiddleware, adminMiddleware, (req, res) =>
  WithdrawAsaasWalletController.handle(req, res),
);

router.put('/whatsapp/profile-photo', authMiddleware, adminMiddleware, (req, res) =>
  UpdateWhatsappProfilePhotoController.handle(req, res),
);

router.get('/whatsapp/connection', authMiddleware, adminMiddleware, (req, res) =>
  EvolutionWhatsappConnectionController.status(req, res),
);

router.post('/whatsapp/connection', authMiddleware, adminMiddleware, (req, res) =>
  EvolutionWhatsappConnectionController.create(req, res),
);

router.get('/whatsapp/connection/qr-code', authMiddleware, adminMiddleware, (req, res) =>
  EvolutionWhatsappConnectionController.qrCode(req, res),
);

router.post('/whatsapp/connection/refresh', authMiddleware, adminMiddleware, (req, res) =>
  EvolutionWhatsappConnectionController.refresh(req, res),
);

router.post('/whatsapp/connection/disconnect', authMiddleware, adminMiddleware, (req, res) =>
  EvolutionWhatsappConnectionController.disconnect(req, res),
);

router.put('/:id', authMiddleware, adminMiddleware, (req, res) =>
  UpdateRestaurantSettingsController.handle(req, res),
);

export default router;
