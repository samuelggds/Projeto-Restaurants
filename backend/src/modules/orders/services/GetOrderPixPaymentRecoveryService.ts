import { PaymentMethod } from '@prisma/client';
import { PIX_PROVIDERS } from '../../payments/providers/providerCatalog.js';
import { efiOpenFinanceOrderReference } from '../../payments/providers/efiOpenFinance.js';
import { formatDeliveryTimeRange } from '../../restaurantSettings/utils/deliveryTimeRange.js';
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
      expiresAt: order.pixExpiresAt,
      deliveryTime:
        formatDeliveryTimeRange({
          averageDeliveryTime: order.restaurant?.settings?.averageDeliveryTime,
          deliveryTimeMin: order.restaurant?.settings?.deliveryTimeMin,
          deliveryTimeMax: order.restaurant?.settings?.deliveryTimeMax,
        }) || null,
      deliveryAddress: [
        [order.address, order.number].filter(Boolean).join(', '),
        order.complement,
        order.district,
        [order.city, order.state].filter(Boolean).join(' - '),
      ]
        .filter(Boolean)
        .join(' - '),
      deliveryFeeAmount: Number(order.deliveryFeeAmount || 0),
      itemsSubtotal: Number(order.itemsSubtotal || 0),
      items: order.items.map((item) => ({
        name: item.product.name,
        quantity: item.quantity,
        total: Number(item.price) * item.quantity,
      })),
    };

    if (String(order.status || '').toUpperCase() === 'CANCELADO' && !order.paid) {
      return {
        ...base,
        paymentId: order.pixPaymentId || null,
        provider: null,
        status: 'canceled',
        isApproved: false,
        qrCode: null,
        qrCodeBase64: null,
        requiresStatusCheck: false,
      };
    }

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

    const expired = Boolean(order.pixExpiresAt && order.pixExpiresAt.getTime() <= Date.now());
    if (expired) {
      // Uma falha do banco/webhook pode deixar um PIX aprovado externamente
      // com validade local encerrada. Consultamos a cobrança ORIGINAL, nunca criamos outra.
      const expiredResult = {
        ...base,
        paymentId: paymentId || null,
        provider: null,
        status: 'expired',
        isApproved: false,
        qrCode: null,
        qrCodeBase64: null,
        requiresStatusCheck: false,
      };
      if (!paymentId) return expiredResult;

      const remote = await orderPixPaymentService.getPaymentStatus({
        paymentId,
        restaurantId: order.restaurantId,
      });
      if (!remote.sameRestaurant) {
        throw new Error('Este pagamento PIX não pertence ao restaurante do pedido.');
      }
      if (remote.isApproved !== true) return expiredResult;

      // A aprovação exige comprovação de tenant, referência, valor e moeda.
      // Uma resposta ambígua do provedor NUNCA habilita uma segunda cobrança.
      const verified = await orderPixPaymentService.ensurePaymentApproved({
        paymentId,
        restaurantId: order.restaurantId,
        expectedOrderId: order.id,
        expectedAmount: Number(order.total),
        expectedCurrency: 'BRL',
      });
      return {
        ...base,
        paymentId,
        provider: verified.provider,
        status: verified.status,
        isApproved: true,
        qrCode: null,
        qrCodeBase64: null,
        requiresStatusCheck: false,
      };
    }

    const recovered = await orderPixPaymentService.recoverExistingPixPayment({
      paymentId,
      restaurantId: order.restaurantId,
    });

    const expectedReference =
      recovered.provider === PIX_PROVIDERS.EFI_OPEN_FINANCE
        ? efiOpenFinanceOrderReference(order.restaurantId, order.id)
        : `orderpix:${order.restaurantId}:${order.id}`;
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
