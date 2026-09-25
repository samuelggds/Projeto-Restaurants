import {
  OrderPaymentAttemptStatus,
  OrderStatus,
  OrderType,
  PaymentMethod,
} from '@prisma/client';
import { z } from 'zod';
import orderRepository from '../repositories/OrderRepository.js';
import asaasPaymentVerificationService from './AsaasPaymentVerificationService.js';
import finalizeOrderCardPaymentService from './FinalizeOrderCardPaymentService.js';
import { getMercadoPagoOrderApi } from '../../payments/providers/mercadoPagoClient.js';
import { matchesOrderPaymentEvidence } from '../utils/paymentEvidence.js';
import { mercadoPagoCardExternalReferenceCandidates } from '../domain/mercadoPagoCardReference.js';
import { verifyGuestOrderOwnershipTokenByPublicId } from '../utils/guestOrderOwnershipToken.js';
import orderPaymentAttemptRepository from '../repositories/OrderPaymentAttemptRepository.js';

const publicOrderIdSchema = z.string().uuid();
const notFoundMessage = 'Pagamento com cartão não encontrado.';

type Input = {
  orderPublicId: unknown;
  restaurantId: number | string | null;
  userId?: number | string | null;
  tableSessionId?: number | string | null;
  participantId?: number | string | null;
  guest?: boolean;
  guestOwnershipToken?: string;
};

class GetOrderCardPaymentStatusService {
  async execute(input: Input) {
    const parsedPublicId = publicOrderIdSchema.safeParse(input.orderPublicId);
    const restaurantId = Number(input.restaurantId || 0);
    if (!parsedPublicId.success || !Number.isSafeInteger(restaurantId) || restaurantId <= 0) {
      throw new Error(notFoundMessage);
    }

    let order = await orderRepository.findCardPaymentStatusByPublicId(
      parsedPublicId.data,
      restaurantId,
    );
    if (!order || order.paymentMethod !== PaymentMethod.CARTAO || order.payOnDelivery === true) {
      throw new Error(notFoundMessage);
    }

    if (order.type === OrderType.MESA) {
      const tableSessionId = Number(input.tableSessionId || 0);
      const participantId = Number(input.participantId || 0);
      if (
        !Number.isSafeInteger(tableSessionId) ||
        !Number.isSafeInteger(participantId) ||
        order.tableSessionId !== tableSessionId ||
        order.participantId !== participantId
      ) {
        throw new Error(notFoundMessage);
      }
    } else if (!order.userId || order.userId !== Number(input.userId || 0)) {
      try {
        const proof = verifyGuestOrderOwnershipTokenByPublicId(
          input.guestOwnershipToken || '',
          parsedPublicId.data,
        );
        if (proof.orderId !== order.id || order.restaurantId !== restaurantId)
          throw new Error(notFoundMessage);
      } catch {
        throw new Error(notFoundMessage);
      }
    }

    const sessionId = String(order.cardCheckoutSessionId || '');
    let latestAttempt = await orderPaymentAttemptRepository.latestForOrder(
      order.id,
      order.restaurantId,
    );

    if (
      !order.paid &&
      order.status !== OrderStatus.CANCELADO &&
      sessionId.startsWith('mp_order:')
    ) {
      try {
        const providerOrderId = sessionId.slice('mp_order:'.length);
        const remote = await (
          await getMercadoPagoOrderApi(order.restaurantId)
        ).get(providerOrderId);
        const reference = String(remote.external_reference || '').trim();
        const validReference = new Set(
          mercadoPagoCardExternalReferenceCandidates(order.id, order.restaurantId),
        ).has(reference);
        const remoteStatus = String(remote.status || '').trim().toLowerCase();
        const remoteStatusDetail = String(remote.status_detail || '').trim() || null;
        if (
          remoteStatus === 'processed' &&
          validReference &&
          matchesOrderPaymentEvidence({
            expectedAmount: order.total,
            providerAmount: remote.total_paid_amount ?? remote.total_amount,
            providerCurrency: remote.currency || 'BRL',
          })
        ) {
          const confirmed = await finalizeOrderCardPaymentService.execute({
            orderId: order.id,
            restaurantId: order.restaurantId,
            checkoutSessionId: sessionId,
          });
          if (latestAttempt) {
            latestAttempt = await orderPaymentAttemptRepository.update(
              latestAttempt.id,
              order.restaurantId,
              OrderPaymentAttemptStatus.APPROVED,
              {
                providerOrderId: providerOrderId,
                providerStatus: remoteStatus,
                providerStatusDetail: remoteStatusDetail,
              },
            );
          }
          if (confirmed) order = { ...order, paid: confirmed.paid, status: confirmed.status };
        } else if (['failed', 'rejected'].includes(remoteStatus) && latestAttempt) {
          latestAttempt = await orderPaymentAttemptRepository.update(
            latestAttempt.id,
            order.restaurantId,
            OrderPaymentAttemptStatus.DECLINED,
            {
              providerOrderId,
              providerStatus: remoteStatus,
              providerStatusDetail: remoteStatusDetail,
              failureCode: remoteStatusDetail || remoteStatus,
              failureMessage: 'Pagamento não autorizado pelo provedor.',
            },
          );
        } else if (['cancelled', 'canceled'].includes(remoteStatus) && latestAttempt) {
          latestAttempt = await orderPaymentAttemptRepository.update(
            latestAttempt.id,
            order.restaurantId,
            OrderPaymentAttemptStatus.CANCELED,
            {
              providerOrderId,
              providerStatus: remoteStatus,
              providerStatusDetail: remoteStatusDetail,
            },
          );
        } else if (remoteStatus === 'expired' && latestAttempt) {
          latestAttempt = await orderPaymentAttemptRepository.update(
            latestAttempt.id,
            order.restaurantId,
            OrderPaymentAttemptStatus.EXPIRED,
            {
              providerOrderId,
              providerStatus: remoteStatus,
              providerStatusDetail: remoteStatusDetail,
            },
          );
        } else if (['refunded', 'charged_back'].includes(remoteStatus) && latestAttempt) {
          latestAttempt = await orderPaymentAttemptRepository.update(
            latestAttempt.id,
            order.restaurantId,
            OrderPaymentAttemptStatus.REFUNDED,
            {
              providerOrderId,
              providerStatus: remoteStatus,
              providerStatusDetail: remoteStatusDetail,
            },
          );
        }
      } catch {
        /* Falha de consulta mantém o estado pendente; o webhook também concilia. */
      }
    }

    if (
      !order.paid &&
      order.status !== OrderStatus.CANCELADO &&
      sessionId.startsWith('asaas_pay:')
    ) {
      try {
        const verified = await asaasPaymentVerificationService.execute({
          restaurantId: order.restaurantId,
          orderId: order.id,
          total: Number(order.total),
          method: 'CARTAO',
          paymentId: sessionId.slice('asaas_pay:'.length),
        });
        if (verified?.approved) {
          const confirmed = await finalizeOrderCardPaymentService.execute({
            orderId: order.id,
            restaurantId: order.restaurantId,
            checkoutSessionId: sessionId,
          });
          if (confirmed) order = { ...order, paid: confirmed.paid, status: confirmed.status };
        }
      } catch {
        /* Falha de consulta mantém o estado pendente; o webhook também concilia. */
      }
    }


    const attemptStatus = String(latestAttempt?.status || '').toUpperCase();
    const status =
      order.status === OrderStatus.CANCELADO
        ? 'CANCELED'
        : order.paid === true
          ? 'PAID'
          : attemptStatus === 'DECLINED' || attemptStatus === 'FAILED'
            ? 'FAILED'
            : attemptStatus === 'CANCELED'
              ? 'CANCELED'
              : attemptStatus === 'EXPIRED'
                ? 'EXPIRED'
                : attemptStatus === 'REFUNDED'
                  ? 'REFUNDED'
                  : 'PENDING';

    return {
      orderPublicId: order.publicId,
      status,
      paid: status === 'PAID',
      paymentAttempt: latestAttempt
        ? {
            publicId: latestAttempt.publicId,
            status: latestAttempt.status,
            providerStatus: latestAttempt.providerStatus,
            providerStatusDetail: latestAttempt.providerStatusDetail,
          }
        : null,
    } as const;
  }
}

export default new GetOrderCardPaymentStatusService();
