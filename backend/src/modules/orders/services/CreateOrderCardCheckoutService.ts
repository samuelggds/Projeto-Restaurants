import createOrderService from './CreateOrderService.js';
import orderRepository from '../repositories/OrderRepository.js';
import restaurantSettingsRepository from '../../restaurantSettings/repositories/RestaurantSettingsRepository.js';
import { assertRestaurantIsOpenForOrders } from '../utils/restaurantAvailability.js';
import {
  type CardProvider,
  normalizeCardProvider,
} from '../../payments/providers/providerCatalog.js';
import {
  getCardCheckoutProviderHandler,
  type CardCheckoutResult,
  type CreateOrderCardCheckoutPayload,
} from './cardCheckoutProviders.js';
import { resolveOrderRestaurantId } from '../utils/orderTenant.js';
import { PaymentCreationUncertainError } from './PaymentCreationUncertainError.js';
import finalizeOrderCardPaymentService from './FinalizeOrderCardPaymentService.js';
import { replayCreatedOrder } from './orderCreationRequest.js';
import { withTenantDbContext } from '../../../database/tenantDbContext.js';
import directOrderCardPaymentService, {
  CardPaymentDeclinedError,
  CardPaymentProviderRequestError,
  hasDirectCardPaymentPayload,
  normalizeCardPaymentType,
  type DirectCardPaymentPayload,
} from './DirectOrderCardPaymentService.js';
import { OrderRequestError } from '../domain/OrderRequestError.js';
import { OrderPaymentAttemptStatus } from '@prisma/client';
import orderPaymentAttemptRepository from '../repositories/OrderPaymentAttemptRepository.js';
import { getMercadoPagoAccountReadiness } from '../../restaurantSettings/services/RestaurantPaymentReadinessService.js';
import { resolveSafeOrderReturnUrl } from '../utils/paymentReturnUrl.js';

type CardCheckoutPayload = CreateOrderCardCheckoutPayload &
  DirectCardPaymentPayload & {
    paymentMethodId?: string | null;
    enforceSingleActiveOnlinePayment?: boolean;
  };

class CreateOrderCardCheckoutService {
  async resolveCardProvider(payload: CreateOrderCardCheckoutPayload) {
    const resolvedRestaurantId = resolveOrderRestaurantId({
      requestedRestaurantId: payload.restaurantId,
      contextRestaurantId: payload.userRestaurantId,
    });

    const settings = await restaurantSettingsRepository.findByRestaurantId(resolvedRestaurantId);

    assertRestaurantIsOpenForOrders(settings?.isOpenForOrders, settings?.businessHours);

    if (settings?.acceptsCard === false) {
      throw new Error('O restaurante não está aceitando pagamentos com cartão no momento.');
    }

    const configuredProvider = String(settings?.cardGateway || '').trim();
    if (!configuredProvider) {
      throw new Error(
        'Pagamento com cartão indisponível. Configure o gateway nas configurações do restaurante.',
      );
    }

    const normalizedProvider = configuredProvider.toUpperCase();
    if (!['MERCADO_PAGO', 'PAGARME', 'ASAAS'].includes(normalizedProvider)) {
      throw new Error('Gateway de cartão indisponível.');
    }

    if (
      normalizedProvider !== 'MERCADO_PAGO' &&
      process.env.ENABLE_FUTURE_PAYMENT_PROVIDERS !== 'true'
    ) {
      throw new Error(
        'No momento, apenas Mercado Pago está disponível para cartão. Asaas e Pagar.me serão liberados após o cadastro empresarial/CNPJ.',
      );
    }

    if (normalizedProvider === 'MERCADO_PAGO') {
      const readiness = await getMercadoPagoAccountReadiness({
        restaurantId: resolvedRestaurantId,
        settings,
      });
      if (!readiness.readyForCard) {
        throw new OrderRequestError(
          'Pagamento com cartão indisponível. Reconecte o Mercado Pago nas configurações do restaurante.',
          503,
          'CARD_PAYMENT_UNAVAILABLE',
        );
      }
    }

    return normalizeCardProvider(normalizedProvider);
  }

  ensureCardProviderSupported(provider: CardProvider) {
    getCardCheckoutProviderHandler(provider);
  }

  async execute(payload: CardCheckoutPayload) {
    if (payload.creationRequest) {
      const restaurantId = resolveOrderRestaurantId({
        requestedRestaurantId: payload.restaurantId,
        contextRestaurantId: payload.userRestaurantId,
      });
      const previous = await withTenantDbContext(restaurantId, (db) =>
        replayCreatedOrder(db, restaurantId, payload.creationRequest),
      );
      if (previous) throw new PaymentCreationUncertainError(previous.id, previous.publicId);
    }
    const resolvedCardProvider = await this.resolveCardProvider(payload);
    this.ensureCardProviderSupported(resolvedCardProvider);
    const cardPaymentType = normalizeCardPaymentType(payload.cardPaymentType);
    if (cardPaymentType === 'debit' && resolvedCardProvider !== 'MERCADO_PAGO') {
      throw new OrderRequestError(
        'Débito online ainda não está disponível neste gateway.',
        400,
        'DEBIT_CARD_PROVIDER_UNAVAILABLE',
      );
    }
    const normalizedPayload = { ...payload, cardPaymentType };
    if (String(normalizedPayload.paymentMethodId || '').trim()) {
      throw new OrderRequestError(
        'Cartão salvo não está disponível. Informe os dados do cartão nesta compra.',
        400,
        'SAVED_CARD_DISABLED',
      );
    }
    if (cardPaymentType === 'debit' && !hasDirectCardPaymentPayload(normalizedPayload)) {
      throw new OrderRequestError(
        'Informe os dados do cartão de débito para continuar.',
        400,
        'DEBIT_CARD_TOKEN_REQUIRED',
      );
    }

    const {
      cardPaymentType: _cardPaymentType,
      cardToken: _cardToken,
      cardPaymentMethodId: _cardPaymentMethodId,
      cardBrand: _cardBrand,
      cardLast4: _cardLast4,
      encryptedCard: _encryptedCard,
      cardData: _cardData,
      holderName: _holderName,
      holderTaxId: _holderTaxId,
      payerEmail: _payerEmail,
      mercadoPagoDeviceId: _mercadoPagoDeviceId,
      expMonth: _expMonth,
      expYear: _expYear,
      billingPostalCode: _billingPostalCode,
      billingAddressNumber: _billingAddressNumber,
      paymentMethodId: _paymentMethodId,
      successUrl: _successUrl,
      cancelUrl: _cancelUrl,
      cardProvider: _cardProvider,
      customerIp: _customerIp,
      ...orderPayload
    } = normalizedPayload;

    const createdOrder = await createOrderService.execute({
      ...orderPayload,
      deferRealtimeUntilPaid: true,
      paid: false,
    });

    const successUrlBase = await resolveSafeOrderReturnUrl(
      createdOrder.restaurantId,
      payload.successUrl,
      '/',
    );
    const cancelUrlBase = await resolveSafeOrderReturnUrl(
      createdOrder.restaurantId,
      payload.cancelUrl || successUrlBase,
      '/',
    );

    const orderForPayment = {
      id: createdOrder.id,
      publicId: createdOrder.publicId,
      restaurantId: createdOrder.restaurantId,
      total: createdOrder.total,
      systemFee: createdOrder.systemFee,
      restaurant: createdOrder.restaurant,
    };
    const paymentAttempt = await orderPaymentAttemptRepository.createCardAttempt({
      orderId: createdOrder.id,
      restaurantId: createdOrder.restaurantId,
      provider: resolvedCardProvider,
      amount: Number(createdOrder.total),
      cardPaymentType,
      cardBrand: normalizedPayload.cardPaymentMethodId || normalizedPayload.cardBrand,
      cardLast4: normalizedPayload.cardLast4,
    });

    let checkout: CardCheckoutResult;
    try {
      if (hasDirectCardPaymentPayload(normalizedPayload)) {
        checkout = await directOrderCardPaymentService.execute({
          provider: resolvedCardProvider,
          payload: normalizedPayload,
          order: orderForPayment,
          successUrlBase,
          idempotencyKey: paymentAttempt.idempotencyKey,
          paymentAttemptId: paymentAttempt.publicId,
        });
      } else {
        const providerHandler = getCardCheckoutProviderHandler(resolvedCardProvider);
        checkout = await providerHandler.createCheckout({
          payload: normalizedPayload,
          order: orderForPayment,
          successUrlBase,
          cancelUrlBase,
        });
      }
    } catch (error) {
      if (error instanceof CardPaymentDeclinedError) {
        await orderPaymentAttemptRepository.update(
          paymentAttempt.id,
          createdOrder.restaurantId,
          OrderPaymentAttemptStatus.DECLINED,
          {
            providerOrderId: error.diagnostic?.providerOrderId || null,
            providerPaymentId: error.diagnostic?.providerPaymentId || null,
            providerStatus: error.diagnostic?.status || 'declined',
            providerStatusDetail: error.diagnostic?.statusDetail || null,
            providerRequestId: error.diagnostic?.providerRequestId || null,
            failureCode: error.diagnostic?.providerCode || 'card_declined',
            failureMessage: error.message,
          },
        );
        throw new OrderRequestError(
          error.message,
          402,
          error.diagnostic ? 'CARD_PAYMENT_FAILED' : 'CARD_DECLINED',
          {
            orderId: createdOrder.id,
            orderPublicId: createdOrder.publicId,
            paymentPending: true,
            paymentAttemptId: paymentAttempt.publicId,
            ...(error.diagnostic ? { paymentError: error.diagnostic } : {}),
          },
        );
      }

      if (error instanceof CardPaymentProviderRequestError) {
        await orderPaymentAttemptRepository.update(
          paymentAttempt.id,
          createdOrder.restaurantId,
          OrderPaymentAttemptStatus.FAILED,
          {
            providerOrderId: error.diagnostic?.providerOrderId || null,
            providerPaymentId: error.diagnostic?.providerPaymentId || null,
            providerStatus: error.diagnostic?.status || 'failed',
            providerStatusDetail: error.diagnostic?.statusDetail || null,
            providerRequestId: error.diagnostic?.providerRequestId || null,
            failureCode: error.providerCode,
            failureMessage: error.message,
          },
        );
        console.error('[CARD_PROVIDER_REQUEST_ERROR]', {
          orderId: createdOrder.id,
          restaurantId: createdOrder.restaurantId,
          paymentAttemptId: paymentAttempt.publicId,
          providerStatus: error.providerStatus,
          providerCode: error.providerCode,
        });
        throw new OrderRequestError(
          'Não foi possível processar o cartão neste momento. Tente novamente em alguns minutos.',
          502,
          'CARD_PROVIDER_ERROR',
          {
            orderId: createdOrder.id,
            orderPublicId: createdOrder.publicId,
            paymentPending: true,
            paymentAttemptId: paymentAttempt.publicId,
            ...(error.diagnostic ? { paymentError: error.diagnostic } : {}),
          },
        );
      }

      // Even a missing/malformed response can follow a successful charge or webhook.
      // Preserve the order, stock reservation and coupon until reconciliation.
      await orderPaymentAttemptRepository.update(
        paymentAttempt.id,
        createdOrder.restaurantId,
        OrderPaymentAttemptStatus.PROCESSING,
        {
          failureCode: 'reconciliation_required',
          failureMessage: error instanceof Error ? error.message : 'Resposta incerta do provedor.',
        },
      );
      console.error('[CARD_PAYMENT_CREATION_UNCERTAIN]', {
        orderId: createdOrder.id,
        restaurantId: createdOrder.restaurantId,
        paymentAttemptId: paymentAttempt.publicId,
        errorType: error instanceof Error ? error.name : 'UnknownError',
      });
      throw new PaymentCreationUncertainError(createdOrder.id, createdOrder.publicId);
    }

    await orderPaymentAttemptRepository.update(
      paymentAttempt.id,
      createdOrder.restaurantId,
      checkout.paymentApproved
        ? OrderPaymentAttemptStatus.APPROVED
        : OrderPaymentAttemptStatus.PROCESSING,
      {
        providerOrderId: String(checkout.sessionId || '').trim() || null,
        providerPaymentId: checkout.providerPaymentId || null,
        providerRequestId: checkout.providerRequestId || null,
        providerStatus:
          String(checkout.providerStatus || '').trim() ||
          (checkout.paymentApproved ? 'processed' : 'pending'),
        providerStatusDetail: String(checkout.providerStatusDetail || '').trim() || null,
      },
    );

    try {
      await orderRepository.setCardCheckoutSessionId(
        createdOrder.id,
        createdOrder.restaurantId,
        String(checkout.persistenceSessionId || checkout.sessionId),
      );
    } catch (error: unknown) {
      // Do not delete an order after an external checkout exists. Every
      // provider reference carries the order id and its webhook can reconcile.
      console.error(
        '[CARD_ORDER_PAYMENT_LINK_ERROR]',
        error instanceof Error ? error.message : String(error),
        { orderId: createdOrder.id, restaurantId: createdOrder.restaurantId },
      );
    }

    let paymentConfirmed = false;
    if (checkout.paymentApproved) {
      const finalizedOrder = await finalizeOrderCardPaymentService.execute({
        orderId: createdOrder.id,
        restaurantId: createdOrder.restaurantId,
        checkoutSessionId: String(checkout.persistenceSessionId || checkout.sessionId),
      });
      paymentConfirmed = finalizedOrder?.paid === true;
    }

    return {
      orderId: createdOrder.id,
      orderPublicId: createdOrder.publicId,
      provider: checkout.provider,
      sessionId: checkout.sessionId,
      checkoutUrl: checkout.checkoutUrl,
      challengeUrl: checkout.challengeUrl || null,
      paid: paymentConfirmed,
      paymentAttemptId: paymentAttempt.publicId,
    };
  }
}

export default new CreateOrderCardCheckoutService();
