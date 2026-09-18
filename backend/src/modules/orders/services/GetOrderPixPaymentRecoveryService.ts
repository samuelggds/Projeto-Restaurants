import { PaymentMethod } from '@prisma/client';
import orderRepository from '../repositories/OrderRepository.js';
import orderPixPaymentService from './OrderPixPaymentService.js';

type Actor = {
  userId: number | null;
  role: string;
  guestOrderId?: number | null;
  guestPublicId?: string | null;
};

class GetOrderPixPaymentRecoveryService {
  async execute(publicIdInput: unknown, actor: Actor) {
    const publicId = String(publicIdInput || '').trim();
    if (!publicId) throw new Error('Pedido inválido.');

    const order = await orderRepository.findPixPaymentRecoveryByPublicId(publicId);
    if (!order) throw new Error('Pedido não encontrado.');

    const normalizedRole = String(actor.role || '').toUpperCase();
    const authenticatedCustomer =
      normalizedRole === 'CLIENTE' &&
      Number(actor.userId || 0) > 0 &&
      Number(order.userId || 0) === Number(actor.userId);
    const guestCustomer =
      actor.userId == null &&
      Number(actor.guestOrderId || 0) === Number(order.id) &&
      String(actor.guestPublicId || '') === String(order.publicId);

    if (!authenticatedCustomer && !guestCustomer) {
      throw new Error('Você não pode acessar o pagamento deste pedido.');
    }

    if (order.paymentMethod !== PaymentMethod.PIX || order.payOnDelivery) {
      throw new Error('Este pedido não possui pagamento PIX online.');
    }

    const base = {
      orderId: order.id,
      orderPublicId: order.publicId,
      restaurantId: order.restaurantId,
      restaurantName: order.restaurant?.name || '',
      totalAmount: Number(order.total),
      paid: order.paid,
      paidAt: order.paidAt,
      orderStatus: order.status,
      paymentMethod: order.paymentMethod,
    };

    if (order.paid) {
      return {
        ...base,
        paymentId: order.pixPaymentId || null,
        provider: null,
        status: 'paid',
        isApproved: true,
        qrCode: null,
        qrCodeBase64: null,
        requiresStatusCheck: false,
      };
    }

    const paymentId = String(order.pixPaymentId || '').trim();
    if (!paymentId) {
      throw new Error('O pagamento PIX deste pedido ainda não está disponível.');
    }

    const recovered = await orderPixPaymentService.recoverExistingPixPayment({
      paymentId,
      restaurantId: order.restaurantId,
    });

    const expectedReference = `orderpix:${order.restaurantId}:${order.id}`;
    if (String(recovered.externalReference || '') !== expectedReference) {
      throw new Error('O pagamento PIX não corresponde ao pedido informado.');
    }

    const expectedAmountInCents = Math.round(Number(order.total) * 100);
    const recoveredAmountInCents = Math.round(Number(recovered.totalAmount) * 100);
    if (
      !Number.isFinite(recoveredAmountInCents) ||
      recoveredAmountInCents !== expectedAmountInCents
    ) {
      throw new Error('O valor do pagamento PIX não corresponde ao total do pedido.');
    }

    return {
      ...base,
      ...recovered,
      totalAmount: Number(order.total),
    };
  }
}

export default new GetOrderPixPaymentRecoveryService();
