import { Router } from 'express';
import CreateOrderController from '../controllers/CreateOrderController.js';
import { adminMiddleware } from '../../../middlewares/adminMiddleware.js';
import UpdateOrderStatusController from '../controllers/UpdateOrderStatusController.js';
import ClaimOrderForDeliveryController from '../controllers/ClaimOrderForDeliveryController.js';
import ClaimGuestOrdersController from '../controllers/ClaimGuestOrdersController.js';
import GetCourierFinanceController from '../controllers/GetCourierFinanceController.js';
import GetDeliveryTrackingController from '../controllers/GetDeliveryTrackingController.js';
import ListOrdersController from '../controllers/ListOrdersController.js';
import GetOrderByIdController from '../controllers/GetOrderByIdController.js';
import ListMyOrdersController from '../controllers/ListMyOrdersController.js';
import CancelOrderController from '../controllers/CancelOrderController.js';
import CancelTableParticipantOrderController from '../controllers/CancelTableParticipantOrderController.js';
import ConfirmOrderPaymentController from '../controllers/ConfirmOrderPaymentController.js';
import ConfirmOrderPaymentWithPinController from '../controllers/ConfirmOrderPaymentWithPinController.js';
import GenerateOrderPaymentConfirmationPinController from '../controllers/GenerateOrderPaymentConfirmationPinController.js';
import RequestOrderPaymentConfirmationPinController from '../controllers/RequestOrderPaymentConfirmationPinController.js';
import CreateOrderPixPaymentController from '../controllers/CreateOrderPixPaymentController.js';
import CreateOrderCardCheckoutController from '../controllers/CreateOrderCardCheckoutController.js';
import GetOrderCardPaymentStatusController from '../controllers/GetOrderCardPaymentStatusController.js';
import GetOrderPixPaymentStatusController from '../controllers/GetOrderPixPaymentStatusController.js';
import ConfirmOrderPixPaymentController from '../controllers/ConfirmOrderPixPaymentController.js';
import ReportOrderIssueController from '../controllers/ReportOrderIssueController.js';
import ReplyOrderIssueController from '../controllers/ReplyOrderIssueController.js';
import GetOrderIssueThreadController from '../controllers/GetOrderIssueThreadController.js';
import ResolveOrderIssueController from '../controllers/ResolveOrderIssueController.js';
import RefundOrderByAdminController from '../controllers/RefundOrderByAdminController.js';
import ClearOrdersAndCategoriesController from '../controllers/ClearOrdersAndCategoriesController.js';
import MercadoPagoOrderWebhookController from '../controllers/MercadoPagoOrderWebhookController.js';
import StripeOrderWebhookController from '../controllers/StripeOrderWebhookController.js';
import PagBankOrderWebhookController from '../controllers/PagBankOrderWebhookController.js';
import GetCurrentTableOrderController from '../controllers/GetCurrentTableOrderController.js';
import ConfirmOrderDeliveryReceivedController from '../controllers/ConfirmOrderDeliveryReceivedController.js';
import QuoteOrderController from '../controllers/QuoteOrderController.js';
import DeliveryPaymentController from '../../paymentTerminals/controllers/DeliveryPaymentController.js';
import MercadoPagoPointWebhookController from '../../paymentTerminals/controllers/MercadoPagoPointWebhookController.js';
import { staffMiddleware } from '../../../middlewares/staffMiddleware.js';
import { billingMiddleware } from '../../../middlewares/billingMiddleware.js';
import { orderAccessMiddleware } from '../../../middlewares/orderAccessMiddleware.js';
import { orderIssueAccessMiddleware } from '../../../middlewares/orderIssueAccessMiddleware.js';
import { orderSupportStaffMiddleware } from '../../../middlewares/orderSupportStaffMiddleware.js';
import { authMiddleware } from '../../../middlewares/authMiddleware.js';
import { optionalAuthMiddleware } from '../../../middlewares/optionalAuthMiddleware.js';
import { sessionMiddleware } from '../../../middlewares/sessionMiddleware.js';
import { tableParticipantMiddleware } from '../../../middlewares/tableParticipantMiddleware.js';
import { premiumTablePlanMiddleware } from '../../../middlewares/premiumTablePlanMiddleware.js';
import { premiumTableOrderMiddleware } from '../../../middlewares/premiumTableOrderMiddleware.js';
import { deliveryTrackingAccessMiddleware } from '../../../middlewares/deliveryTrackingAccessMiddleware.js';
import {
  deliveryConfirmationAttemptRateLimitMiddleware,
  paymentPinAttemptRateLimitMiddleware,
  paymentPinRequestRateLimitMiddleware,
} from '../../../middlewares/security/orderPaymentRateLimitMiddleware.js';

const router = Router();

router.post('/webhook/mercadopago', MercadoPagoOrderWebhookController.handle);
router.post('/webhook/mercadopago-point', MercadoPagoPointWebhookController.handle);
router.post('/webhook/stripe', StripeOrderWebhookController.handle);
router.post('/webhook/pagbank', PagBankOrderWebhookController.handle);

router.post('/', orderAccessMiddleware, premiumTableOrderMiddleware, billingMiddleware, (req, res) => {
  CreateOrderController.handle(req, res);
});

router.post('/quote', orderAccessMiddleware, premiumTableOrderMiddleware, billingMiddleware, (req, res) => {
  QuoteOrderController.handle(req, res);
});

router.post('/pix/payment', orderAccessMiddleware, premiumTableOrderMiddleware, billingMiddleware, (req, res) => {
  CreateOrderPixPaymentController.handle(req, res);
});

router.post('/card/checkout', orderAccessMiddleware, premiumTableOrderMiddleware, billingMiddleware, (req, res) => {
  CreateOrderCardCheckoutController.handle(req, res);
});

router.post('/card/checkout/status', orderAccessMiddleware, premiumTableOrderMiddleware, billingMiddleware, (req, res) => {
  GetOrderCardPaymentStatusController.handle(req, res);
});

router.post('/pix/payment/status', orderAccessMiddleware, premiumTableOrderMiddleware, billingMiddleware, (req, res) => {
  GetOrderPixPaymentStatusController.handle(req, res);
});

router.post('/pix/payment/confirm', orderAccessMiddleware, premiumTableOrderMiddleware, billingMiddleware, (req, res) => {
  ConfirmOrderPixPaymentController.handle(req, res);
});

router.post('/claim-guest-orders', authMiddleware, (req, res) => {
  ClaimGuestOrdersController.handle(req, res);
});

router.put(
  '/:id/status',
  authMiddleware,
  staffMiddleware,
  deliveryConfirmationAttemptRateLimitMiddleware,
  (req, res) => {
    UpdateOrderStatusController.handle(req, res);
  },
);

router.patch('/:id/claim-delivery', authMiddleware, (req, res) => {
  ClaimOrderForDeliveryController.handle(req, res);
});

router.get('/:id/delivery-payment', authMiddleware, (req, res) => {
  DeliveryPaymentController.get(req, res);
});

router.post('/:id/delivery-payment/reconcile-pix', authMiddleware, (req, res) => {
  DeliveryPaymentController.reconcilePix(req, res);
});

router.post('/:id/delivery-payment/reconcile-card', authMiddleware, (req, res) => {
  DeliveryPaymentController.reconcileCard(req, res);
});

router.patch('/:id/confirm-delivery-received', authMiddleware, (req, res) => {
  ConfirmOrderDeliveryReceivedController.handle(req, res);
});

router.patch('/:id/confirm-payment', authMiddleware, adminMiddleware, (req, res) => {
  ConfirmOrderPaymentController.handle(req, res);
});

router.post('/:id/payment-confirmation-pin', authMiddleware, adminMiddleware, (req, res) => {
  GenerateOrderPaymentConfirmationPinController.handle(req, res);
});

router.post(
  '/:id/request-payment-confirmation-pin',
  authMiddleware,
  staffMiddleware,
  paymentPinRequestRateLimitMiddleware,
  (req, res) => {
    RequestOrderPaymentConfirmationPinController.handle(req, res);
  },
);

router.patch(
  '/:id/confirm-payment-with-pin',
  authMiddleware,
  staffMiddleware,
  paymentPinAttemptRateLimitMiddleware,
  (req, res) => {
    ConfirmOrderPaymentWithPinController.handle(req, res);
  },
);

router.get('/', authMiddleware, staffMiddleware, (req, res) => {
  ListOrdersController.handle(req, res);
});

router.get('/courier/finance', authMiddleware, (req, res) => {
  GetCourierFinanceController.handle(req, res);
});

router.delete('/cleanup/orders-categories', authMiddleware, adminMiddleware, (req, res) => {
  ClearOrdersAndCategoriesController.handle(req, res);
});

router.get('/my-orders', authMiddleware, (req, res) => {
  ListMyOrdersController.handle(req, res);
});

router.get(
  '/table/current',
  optionalAuthMiddleware,
  sessionMiddleware,
  premiumTablePlanMiddleware,
  tableParticipantMiddleware,
  (req, res) => {
    GetCurrentTableOrderController.handle(req, res);
  },
);

router.patch(
  '/table/:publicOrderId/cancel',
  optionalAuthMiddleware,
  sessionMiddleware,
  premiumTablePlanMiddleware,
  tableParticipantMiddleware,
  (req, res) => {
    CancelTableParticipantOrderController.handle(req, res);
  },
);

router.get('/:id/tracking', deliveryTrackingAccessMiddleware, (req, res, next) => {
  GetDeliveryTrackingController.handle(req, res, next);
});

router.get('/:id', authMiddleware, staffMiddleware, (req, res) => {
  GetOrderByIdController.handle(req, res);
});

router.patch('/:id/cancel', authMiddleware, (req, res) => {
  CancelOrderController.handle(req, res);
});

router.post('/:id/report-issue', orderIssueAccessMiddleware, (req, res) => {
  ReportOrderIssueController.handle(req, res);
});

router.get('/:id/issue-thread', orderIssueAccessMiddleware, (req, res) => {
  GetOrderIssueThreadController.handle(req, res);
});

router.post('/:id/reply-issue', authMiddleware, orderSupportStaffMiddleware, (req, res) => {
  ReplyOrderIssueController.handle(req, res);
});

router.patch('/:id/resolve-issue', authMiddleware, orderSupportStaffMiddleware, (req, res) => {
  ResolveOrderIssueController.handle(req, res);
});

router.patch('/:id/refund', authMiddleware, adminMiddleware, (req, res) => {
  RefundOrderByAdminController.handle(req, res);
});

export default router;
