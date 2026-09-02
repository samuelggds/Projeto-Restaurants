import { Router } from 'express';

import authRoutes from '../modules/auth/routes/authRoutes.js';
import productRoutes from '../modules/products/routes/productsRoutes.js';
import orderRoutes from '../modules/orders/routes/orderRoutes.js';
import restaurantRoutes from '../modules/restaurants/routes/restaurantRoutes.js';
import categoryRoutes from '../modules/categories/routes/CategoryRoutes.js';
import employeeRoutes from '../modules/employee/routes/EmployeeRoutes.js';
import tableSessionRoutes from '../modules/tableSession/routes/SessionsTablesRoutes.js';
import tableRoutes from '../modules/table/routes/TablesRoutes.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import restaurantSettingsRoutes from '../modules/restaurantSettings/routes/RestaurantSettingsRoutes.js';
import bannerRoutes from '../modules/banner/routes/BannerRoutes.js';
import couponRoutes from '../modules/coupon/routes/CouponRoutes.js';
import subscriptionRoutes from '../modules/subscription/routes/SubscriptionRoutes.js';
import aiSupportRoutes from '../modules/aiSupport/routes/AiSupportRoutes.js';
import menuImportRoutes from '../modules/menuImport/routes/MenuImportRoutes.js';
import auditRoutes from '../modules/audit/routes/AuditRoutes.js';
import favoriteRoutes from '../modules/favorites/routes/FavoriteRoutes.js';
import imageEnhancementRoutes from '../modules/imageEnhancement/routes/ImageEnhancementRoutes.js';
import customerAddressRoutes from '../modules/customerAddresses/routes/CustomerAddressRoutes.js';
import AsaasOrderWebhookController from '../modules/orders/controllers/AsaasOrderWebhookController.js';
import AsaasWithdrawValidationWebhookController from '../modules/restaurantSettings/controllers/AsaasWithdrawValidationWebhookController.js';
import ingredientRoutes from '../modules/ingredients/routes/ingredientRoutes.js';
import tableServiceCallRoutes from '../modules/waiterCalls/routes/TableServiceCallRoutes.js';
import tableAccountRoutes from '../modules/tableAccount/routes/TableAccountRoutes.js';
import superAdminRoutes from '../modules/superAdmin/routes/SuperAdminRoutes.js';
import publicMediaRoutes from '../modules/publicMedia/routes/PublicMediaRoutes.js';
import customerPaymentMethodRoutes from '../modules/customerPaymentMethods/routes/CustomerPaymentMethodRoutes.js';
import kitchenPrintingRoutes from '../modules/kitchenPrinting/routes/KitchenPrintingRoutes.js';
import courierCompensationRoutes from '../modules/courierCompensation/routes/CourierCompensationRoutes.js';
import employeeCompensationRoutes from '../modules/employeeCompensation/routes/EmployeeCompensationRoutes.js';
import productConfigurationTemplateRoutes from '../modules/productConfigurationTemplates/routes/ProductConfigurationTemplateRoutes.js';
import attendantRoutes from '../modules/attendant/routes/AttendantRoutes.js';

const router = Router();

router.post('/api/webhooks/asaas', (req, res) => {
  AsaasOrderWebhookController.handle(req, res);
});

router.post('/api/webhooks/asaas/withdraw-validation', (req, res) => {
  AsaasWithdrawValidationWebhookController.handle(req, res);
});

router.use('/auth', authRoutes);
router.use('/restaurants', restaurantRoutes);
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/ingredients', ingredientRoutes);
router.use('/orders', orderRoutes);
router.use('/employees', employeeRoutes);
router.use('/table-sessions', tableSessionRoutes);
router.use('/table-accounts', tableAccountRoutes);
router.use('/waiter-calls', tableServiceCallRoutes);
router.use('/tables', tableRoutes);
router.use('/settings', restaurantSettingsRoutes);
router.use('/banners', bannerRoutes);
router.use('/coupons', couponRoutes);
router.use('/subscription', subscriptionRoutes);
router.use('/ai-support', aiSupportRoutes);
router.use('/menu-import', menuImportRoutes);
router.use('/audit-logs', auditRoutes);
router.use('/favorites', favoriteRoutes);
router.use('/image-enhancement', imageEnhancementRoutes);
router.use('/customer-addresses', customerAddressRoutes);
router.use('/customer-payment-methods', customerPaymentMethodRoutes);
router.use('/kitchen-printing', kitchenPrintingRoutes);
router.use('/courier-compensation', courierCompensationRoutes);
router.use('/employee-compensation', employeeCompensationRoutes);
router.use('/employee-payments', employeeCompensationRoutes);
router.use('/product-configuration-templates', productConfigurationTemplateRoutes);
router.use('/attendant', attendantRoutes);
router.use('/super-admin', superAdminRoutes);
router.use('/public-media', publicMediaRoutes);

router.get('/profile', authMiddleware, (req, res) => {
  return res.json({
    message: 'Rota protegida!',
    user: req.user,
  });
});

export default router;
