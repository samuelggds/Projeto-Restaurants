import { OrderPaymentAttemptStatus } from '@prisma/client';
import createOrderCardCheckoutService from './CreateOrderCardCheckoutService.js';
import directOrderCardPaymentService, {
  CardPaymentDeclinedError,
  CardPaymentProviderRequestError,
  hasDirectCardPaymentPayload,
  type DirectCardPaymentPayload,
} from './DirectOrderCardPaymentService.js';
import getOrderPaymentRecoveryService from './GetOrderPaymentRecoveryService.js';
import getOrderCardPaymentStatusService from './GetOrderCardPaymentStatusService.js';
import finalizeOrderCardPaymentService from './FinalizeOrderCardPaymentService.js';
import orderRepository from '../repositories/OrderRepository.js';
import orderPaymentAttemptRepository from '../repositories/OrderPaymentAttemptRepository.js';
import { OrderRequestError } from '../domain/OrderRequestError.js';

type Actor = {
  userId: number | null;
  role: string;
  guestOrderId?: number | null;
  guestPublicId?: string | null;
  guestOwnershipToken?: string;
};

type RetryPayload = DirectCardPaymentPayload & {
  customerName?: string | null;
  customerPhone?: string | null;
  customerIp?: string | null;
  address?: string | null;
  number?: string | null;
  complement?: string | null;
  district?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  successUrl?: string | null;
};

class RetryOrderCardPaymentService {
  async execute(publicId: unknown, actor: Actor, payload: RetryPayload) {
    const recovery = await getOrderPaymentRecoveryService.execute(publicId, actor);
    if (recovery.paymentMethod !== 'CARTAO') {
      throw new OrderRequestError('Este pedido não possui pagamento por cartão.', 400);
    }
    if (recovery.paid) {
      return {
        orderId: recovery.orderId,
        orderPublicId: recovery.orderPublicId,
        paid: true,
        status: 'PAID' as const,
      };
    }
    if (!recovery.canRetry) {
      throw new OrderRequestError('Este pedido não aceita uma nova tentativa de pagamento.', 409);
    }

    const previousStatus = String(recovery.paymentAttempt?.status || '').toUpperCase();
    if (['PENDING', 'PROCESSING'].includes(previousStatus)) {
      const canonical = await getOrderCardPaymentStatusService.execute({
        orderPublicId: recovery.orderPublicId,
        restaurantId: recovery.restaurantId,
        userId: actor.userId,
        guest: Number(actor.userId || 0) <= 0,
        guestOwnershipToken: actor.guestOwnershipToken,
      });
      if (canonical.paid === true) {
        return {
          orderId: recovery.orderId,
          orderPublicId: recovery.orderPublicId,
          paid: true,
          status: 'PAID' as const,
        };
      }
      if (canonical.status === 'PENDING') {
        throw new OrderRequestError(
          'A tentativa anterior ainda está sendo processada. Aguarde a confirmação antes de tentar novamente.',
          409,
          'CARD_ATTEMPT_PROCESSING',
          { orderId: recovery.orderId, orderPublicId: recovery.orderPublicId },
        );
      }
    }

    if (!hasDirectCardPaymentPayload(payload)) {
      throw new OrderRequestError('Informe os dados do cartão para tentar novamente.', 400);
    }

    const provider = await createOrderCardCheckoutService.resolveCardProvider({
      restaurantId: recovery.restaurantId,
      userRestaurantId: recovery.restaurantId,
    } as never);
    createOrderCardCheckoutService.ensureCardProviderSupported(provider);

    const attempt = await orderPaymentAttemptRepository.createCardAttempt({
      orderId: recovery.orderId,
      restaurantId: recovery.restaurantId,
      provider,
      amount: recovery.totalAmount,
    });

    try {
      const checkout = await directOrderCardPaymentService.execute({
        provider,
        payload: {
          ...payload,
          userId: actor.userId,
        },
        order: {
          id: recovery.orderId,
          publicId: recovery.orderPublicId,
          restaurantId: recovery.restaurantId,
          total: recovery.totalAmount,
          restaurant: { name: recovery.restaurantName },
        },
        successUrlBase: String(payload.successUrl || ''),
        idempotencyKey: attempt.idempotencyKey,
      });

      await orderPaymentAttemptRepository.update(
        attempt.id,
        recovery.restaurantId,
        checkout.paymentApproved
          ? OrderPaymentAttemptStatus.APPROVED
          : OrderPaymentAttemptStatus.PROCESSING,
        {
          providerOrderId: String(checkout.sessionId || '').trim() || null,
          providerStatus: checkout.paymentApproved ? 'processed' : 'pending',
        },
      );

      const checkoutSessionId = String(checkout.persistenceSessionId || checkout.sessionId);
      await orderRepository.setCardCheckoutSessionId(
        recovery.orderId,
        recovery.restaurantId,
        checkoutSessionId,
      );

      if (checkout.paymentApproved) {
        const finalized = await finalizeOrderCardPaymentService.execute({
          orderId: recovery.orderId,
          restaurantId: recovery.restaurantId,
          checkoutSessionId,
        });
        return {
          orderId: recovery.orderId,
          orderPublicId: recovery.orderPublicId,
          paymentAttemptId: attempt.publicId,
          paid: finalized?.paid === true,
          status: finalized?.paid === true ? ('PAID' as const) : ('PENDING' as const),
        };
      }

      return {
        orderId: recovery.orderId,
        orderPublicId: recovery.orderPublicId,
        paymentAttemptId: attempt.publicId,
        paid: false,
        status: 'PENDING' as const,
      };
    } catch (error) {
      if (error instanceof CardPaymentDeclinedError) {
        await orderPaymentAttemptRepository.update(
          attempt.id,
          recovery.restaurantId,
          OrderPaymentAttemptStatus.DECLINED,
          {
            providerOrderId: error.diagnostic?.providerOrderId || null,
            providerStatus: error.diagnostic?.status || 'declined',
            providerStatusDetail: error.diagnostic?.statusDetail || null,
            providerRequestId: error.diagnostic?.providerRequestId || null,
            failureCode: error.diagnostic?.providerCode || 'card_declined',
            failureMessage: error.message,
          },
        );
        throw new OrderRequestError(error.message, 402, 'CARD_PAYMENT_FAILED', {
          orderId: recovery.orderId,
          orderPublicId: recovery.orderPublicId,
          paymentPending: true,
          paymentAttemptId: attempt.publicId,
          ...(error.diagnostic ? { paymentError: error.diagnostic } : {}),
        });
      }

      if (error instanceof CardPaymentProviderRequestError) {
        await orderPaymentAttemptRepository.update(
          attempt.id,
          recovery.restaurantId,
          OrderPaymentAttemptStatus.FAILED,
          {
            providerOrderId: error.diagnostic?.providerOrderId || null,
            providerStatus: error.diagnostic?.status || 'failed',
            providerStatusDetail: error.diagnostic?.statusDetail || null,
            providerRequestId: error.diagnostic?.providerRequestId || null,
            failureCode: error.providerCode,
            failureMessage: error.message,
          },
        );
        throw new OrderRequestError(
          'Não foi possível processar o cartão neste momento. Tente novamente em alguns minutos.',
          502,
          'CARD_PROVIDER_ERROR',
          {
            orderId: recovery.orderId,
            orderPublicId: recovery.orderPublicId,
            paymentPending: true,
            paymentAttemptId: attempt.publicId,
            ...(error.diagnostic ? { paymentError: error.diagnostic } : {}),
          },
        );
      }

      await orderPaymentAttemptRepository.update(
        attempt.id,
        recovery.restaurantId,
        OrderPaymentAttemptStatus.PROCESSING,
        {
          failureCode: 'reconciliation_required',
          failureMessage: error instanceof Error ? error.message : 'Resposta incerta do provedor.',
        },
      );
      throw error;
    }
  }
}

export default new RetryOrderCardPaymentService();
