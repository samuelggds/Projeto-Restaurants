import {
  getPagBankCardChargePayment,
  getPagBankCheckoutPayment,
  pagBankCardReference,
} from '../../payments/providers/pagBankCheckout.js';
import orderRepository from '../repositories/OrderRepository.js';
import finalizeOrderCardPaymentService from './FinalizeOrderCardPaymentService.js';
import failPendingOrderPaymentService from './FailPendingOrderPaymentService.js';

class ReconcilePagBankCardPaymentService {
  async execute({
    orderId,
    restaurantId,
    providerOrderId,
  }: {
    orderId: number | string;
    restaurantId: number;
    providerOrderId?: string;
  }) {
    const order = await orderRepository.findById(orderId, restaurantId);
    if (!order || order.paymentMethod !== 'CARTAO' || order.payOnDelivery === true) return null;
    const currentReference = String(order.cardCheckoutSessionId || '');
    const amountCents = Math.round(Number(order.total) * 100);
    const result = currentReference.startsWith('pagbank_checkout:')
      ? await getPagBankCheckoutPayment({
          restaurantId,
          checkoutId: currentReference.slice('pagbank_checkout:'.length),
          reference: pagBankCardReference(order),
          amountCents,
          orderId: providerOrderId,
        })
      : currentReference.startsWith('pagbank_charge:CHAR_') ||
          currentReference.startsWith('pagbank_tx:CHAR_')
        ? await getPagBankCardChargePayment({
            restaurantId,
            chargeId: currentReference.slice(currentReference.indexOf(':') + 1),
            amountCents,
            hostedCheckout: currentReference.startsWith('pagbank_charge:'),
            ...(currentReference.startsWith('pagbank_tx:')
              ? { reference: `ordercard:${order.id}:${restaurantId}` }
              : {}),
          })
        : null;
    if (!result) return order;
    if (result.status === 'PAID' && result.chargeId) {
      const paymentReference = currentReference.startsWith('pagbank_tx:')
        ? `pagbank_tx:${result.chargeId}`
        : `pagbank_charge:${result.chargeId}`;
      if (currentReference !== paymentReference) {
        const bound = await orderRepository.bindCardPaymentReference(
          order.id,
          restaurantId,
          currentReference,
          paymentReference,
        );
        if (!bound)
          throw new Error(
            'A referência do cartão foi alterada durante a confirmação. Tente novamente.',
          );
      }
      return finalizeOrderCardPaymentService.execute({
        orderId: order.id,
        restaurantId,
        checkoutSessionId: paymentReference,
        allowMissingOrder: true,
      });
    }
    if (result.status === 'EXPIRED' && order.paid !== true) {
      await failPendingOrderPaymentService.execute({ orderId: order.id, restaurantId });
    }
    return orderRepository.findById(order.id, restaurantId);
  }
}

export default new ReconcilePagBankCardPaymentService();
