import type { OrderPaymentAttempt } from '@prisma/client';
import {
  getMercadoPagoOrderApi,
  type MercadoPagoOrder,
} from '../../payments/providers/mercadoPagoClient.js';
import {
  mercadoPagoCardAttemptExternalReference,
  mercadoPagoCardExternalReference,
  mercadoPagoCardExternalReferenceCandidates,
} from '../domain/mercadoPagoCardReference.js';
import orderPaymentAttemptRepository from '../repositories/OrderPaymentAttemptRepository.js';
import { matchesOrderPaymentEvidence } from '../utils/paymentEvidence.js';

type Order = { id: number; restaurantId: number; total: unknown };

class RecoverUnknownCardPaymentService {
  async execute(order: Order, attempt: OrderPaymentAttempt) {
    if (
      attempt.orderId !== order.id ||
      attempt.restaurantId !== order.restaurantId ||
      attempt.provider !== 'MERCADO_PAGO' ||
      !['PENDING', 'PROCESSING', 'APPROVED'].includes(attempt.status)
    )
      return null;
    if (!attempt.providerOrderId && Date.now() - attempt.createdAt.getTime() < 30_000) return null;
    const api = await getMercadoPagoOrderApi(order.restaurantId);
    const reference = mercadoPagoCardAttemptExternalReference(
      order.id,
      order.restaurantId,
      attempt.publicId,
    );
    const references = [reference];
    let remote: MercadoPagoOrder | null = null;
    if (attempt.providerOrderId) {
      remote = await api.get(attempt.providerOrderId);
      references.push(...mercadoPagoCardExternalReferenceCandidates(order.id, order.restaurantId));
    } else {
      // Legacy references identified only the order. Use them only when there
      // was exactly one local attempt; never guess which retry a result belongs to.
      if ((await orderPaymentAttemptRepository.countForOrder(order.id, order.restaurantId)) === 1)
        references.push(mercadoPagoCardExternalReference(order.id, order.restaurantId));
      for (const candidate of references) {
        const result = await api.search(candidate, new Date(attempt.createdAt.getTime() - 60_000));
        if (!Array.isArray(result.data)) return null;
        if (result.data.length > 1 || Number(result.paging?.total || 0) > 1) return null;
        if (!result.data.length) continue;
        const id = String(result.data[0]?.id || '');
        if (!/^ORD[a-z0-9_-]+$/i.test(id)) return null;
        remote = await api.get(id);
        if (remote.id !== id || remote.external_reference !== candidate) return null;
        break;
      }
    }
    if (
      !remote ||
      !remote.id ||
      (attempt.providerOrderId && remote.id !== attempt.providerOrderId) ||
      !references.includes(String(remote.external_reference || '')) ||
      (remote.type !== undefined && remote.type !== 'online') ||
      !matchesOrderPaymentEvidence({
        expectedAmount: Number(order.total),
        providerAmount: remote.total_amount,
        providerCurrency: remote.currency,
      }) ||
      !matchesOrderPaymentEvidence({
        expectedAmount: attempt.amount,
        providerAmount: remote.total_amount,
        providerCurrency: remote.currency,
      })
    )
      return null;
    const bound = await orderPaymentAttemptRepository.bindRecoveredProviderOrder({
      orderId: order.id,
      restaurantId: order.restaurantId,
      attemptId: attempt.id,
      providerOrderId: remote.id,
      amount: Number(order.total),
    });
    return bound ? remote : null;
  }
}

export default new RecoverUnknownCardPaymentService();
