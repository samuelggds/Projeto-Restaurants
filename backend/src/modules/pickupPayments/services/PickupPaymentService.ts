import { OrderType, PaymentMethod, UserRole } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import { realtimePublisher as io } from '../../../realtime/realtimePublisher.js';
import orderRepository from '../../orders/repositories/OrderRepository.js';
import orderPixPaymentService from '../../orders/services/OrderPixPaymentService.js';
import { markCouponRedemptionUsedForOrder } from '../../orders/services/couponRedemptionLifecycle.js';
import restaurantSettingsRepository from '../../restaurantSettings/repositories/RestaurantSettingsRepository.js';
import paymentTerminalRepository from '../../paymentTerminals/repositories/PaymentTerminalRepository.js';
import paymentTerminalService from '../../paymentTerminals/services/PaymentTerminalService.js';

function cents(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round((number + Number.EPSILON) * 100) : null;
}

function publicPayment(row: any) {
  if (!row) return null;
  return {
    orderId: Number(row.orderId),
    method: String(row.method),
    provider: String(row.provider),
    status: String(row.status),
    amount: Number(row.amount),
    pixCopyPaste: row.pixCopyPaste ? String(row.pixCopyPaste) : null,
    pixQrCodeBase64: row.pixQrCodeBase64 ? String(row.pixQrCodeBase64) : null,
    providerOrderId: row.providerOrderId ? String(row.providerOrderId) : null,
    lastProviderStatus: row.lastProviderStatus ? String(row.lastProviderStatus) : null,
    paidAt: row.paidAt || null,
  };
}

class PickupPaymentService {
  private assertOperator(role: string, subRole?: string | null) {
    const normalizedRole = String(role || '').toUpperCase();
    const normalizedSubRole = String(subRole || '').toUpperCase();
    const allowed =
      normalizedRole === UserRole.ADMIN ||
      (normalizedRole === UserRole.FUNCIONARIO && normalizedSubRole === 'ATENDENTE');
    if (!allowed) throw new Error('Somente administrador ou atendente pode receber retirada no balcão.');
  }

  private async getPickup(orderId: number, restaurantId: number) {
    const order = await orderRepository.findById(orderId, restaurantId);
    if (!order || order.type !== OrderType.RETIRADA) throw new Error('Pedido de retirada não encontrado.');
    if (order.paid === true) return order;
    if (order.paymentMethod) {
      throw new Error('Este pedido possui pagamento online definido e não é pagamento no balcão.');
    }
    return order;
  }

  async start(input: {
    orderId: number;
    restaurantId: number;
    role: string;
    subRole?: string | null;
    method: 'PIX' | 'CARTAO';
    terminalPublicId?: string | null;
  }) {
    this.assertOperator(input.role, input.subRole);
    const order = await this.getPickup(input.orderId, input.restaurantId);
    if (order.paid === true) return { payment: null, order };

    const existing = await paymentTerminalRepository.findDeliveryPayment(order.id, order.restaurantId);
    if (existing) return { payment: publicPayment(existing), order };

    if (input.method === 'PIX') {
      const settings = await restaurantSettingsRepository.findByRestaurantId(order.restaurantId);
      const provider = String(settings?.pixProvider || 'MERCADO_PAGO').toUpperCase();
      await paymentTerminalRepository.createDeliveryPayment({
        orderId: order.id,
        restaurantId: order.restaurantId,
        method: 'PIX',
        provider,
        amount: Number(order.total),
      });
      const result = await orderPixPaymentService.createPixPayment({
        restaurantId: order.restaurantId,
        type: 'RETIRADA',
        paymentMethod: 'PIX',
        pixProvider: provider,
        items: (order.items || []).map((item: any) => ({
          productId: Number(item.productId),
          quantity: Number(item.quantity),
          observation: item.observation || undefined,
        })),
        customerName: order.user?.name || 'Cliente',
        customerPhone: order.user?.phone || undefined,
        userEmail: order.user?.email || null,
        orderId: order.id,
        orderTotal: Number(order.total),
        orderSubtotal: Number(order.itemsSubtotal) - Number(order.couponDiscount),
        orderDeliveryFee: 0,
      });
      await orderPixPaymentService.attachPaymentToOrder({
        orderId: order.id,
        restaurantId: order.restaurantId,
        paymentId: String(result.paymentId || ''),
      });
      const updated = await paymentTerminalRepository.updateDeliveryPaymentProvider({
        orderId: order.id,
        restaurantId: order.restaurantId,
        providerPaymentId: String(result.paymentId || ''),
        status: 'PENDING',
        lastProviderStatus: String(result.status || 'pending'),
        pixCopyPaste: String(result.qrCode || ''),
        pixQrCodeBase64: result.qrCodeBase64 ? String(result.qrCodeBase64) : null,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });
      return { payment: publicPayment(updated), order };
    }

    const settings = await restaurantSettingsRepository.findByRestaurantId(order.restaurantId);
    if (String(settings?.cardGateway || '').toUpperCase() !== 'MERCADO_PAGO') {
      throw new Error('Cartão automático no balcão exige Mercado Pago Point configurado.');
    }
    const terminals = await paymentTerminalRepository.listTerminals(order.restaurantId);
    const terminal = input.terminalPublicId
      ? terminals.find((item) => item.publicId === input.terminalPublicId)
      : terminals.find(
          (item) => item.active === true && String(item.operatingMode || '').toUpperCase() === 'PDV',
        );
    if (!terminal || terminal.active !== true) throw new Error('Selecione uma maquininha ativa do restaurante.');
    if (String(terminal.operatingMode || '').toUpperCase() !== 'PDV') {
      throw new Error('A maquininha precisa estar em modo PDV.');
    }

    await paymentTerminalRepository.createDeliveryPayment({
      orderId: order.id,
      restaurantId: order.restaurantId,
      method: 'CARTAO',
      provider: 'MERCADO_PAGO',
      amount: Number(order.total),
      terminalId: terminal.id,
    });
    const providerOrder = await paymentTerminalService.mercadoPagoRequest<any>(
      order.restaurantId,
      '/v1/orders',
      {
        method: 'POST',
        headers: { 'X-Idempotency-Key': `pickup-${order.restaurantId}-${order.id}` },
        body: JSON.stringify({
          type: 'point',
          external_reference: `pickup-${order.restaurantId}-${order.id}`,
          expiration_time: 'PT1H',
          description: `Retirada pedido ${order.id}`,
          transactions: { payments: [{ amount: Number(order.total).toFixed(2) }] },
          config: {
            point: { terminal_id: terminal.providerTerminalId, print_on_terminal: 'no_ticket' },
          },
        }),
      },
    );
    const providerOrderId = String(providerOrder?.id || '').trim();
    if (!providerOrderId) throw new Error('Mercado Pago não retornou o ID da cobrança Point.');
    const updated = await paymentTerminalRepository.updateDeliveryPaymentProvider({
      orderId: order.id,
      restaurantId: order.restaurantId,
      providerOrderId,
      status: 'PENDING',
      lastProviderStatus: String(providerOrder?.status || 'created'),
    });
    return { payment: publicPayment(updated), order };
  }

  private async confirm(orderId: number, restaurantId: number, method: PaymentMethod) {
    const order = await orderRepository.findById(orderId, restaurantId);
    if (!order) throw new Error('Pedido não encontrado.');
    if (order.paid === true) return order;
    const updated = await prisma.$transaction(async (tx) => {
      const paidOrder = await tx.order.update({
        where: { id: order.id },
        data: { paid: true, paidAt: new Date(), paymentMethod: method },
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          restaurant: { select: { id: true, name: true, whatsapp: true } },
          table: { select: { id: true, number: true, active: true, restaurantId: true } },
          participant: { select: { id: true, publicId: true, displayName: true } },
          items: { include: { product: true } },
        },
      });
      await markCouponRedemptionUsedForOrder(order.id, restaurantId, tx);
      return paidOrder;
    });
    io.to(`restaurant:${restaurantId}`).emit('order:payment-confirmed', {
      orderId: updated.id,
      paid: true,
      paymentMethod: updated.paymentMethod,
    });
    io.to(`restaurant:${restaurantId}`).emit('order:status-changed', updated);
    if (updated.userId) {
      io.to(`user:${updated.userId}`).emit('order:payment-confirmed', {
        orderId: updated.id,
        paid: true,
        paymentMethod: updated.paymentMethod,
      });
      io.to(`user:${updated.userId}`).emit('order:status-changed', updated);
    }
    return updated;
  }

  async reconcile(input: {
    orderId: number;
    restaurantId: number;
    role: string;
    subRole?: string | null;
  }) {
    this.assertOperator(input.role, input.subRole);
    const order = await this.getPickup(input.orderId, input.restaurantId);
    if (order.paid === true) return { paid: true, order, payment: null };
    const payment = await paymentTerminalRepository.findDeliveryPayment(order.id, order.restaurantId);
    if (!payment) throw new Error('Inicie o pagamento no balcão primeiro.');

    if (String(payment.method).toUpperCase() === 'PIX') {
      if (!payment.providerPaymentId) throw new Error('Cobrança Pix ainda não foi criada.');
      const status = await orderPixPaymentService.ensurePaymentApproved({
        paymentId: String(payment.providerPaymentId),
        restaurantId: order.restaurantId,
        expectedOrderId: order.id,
        expectedAmount: Number(order.total),
        expectedCurrency: 'BRL',
      }).catch(() => null);
      if (!status?.isApproved) {
        return { paid: false, payment: publicPayment(payment), order };
      }
      const updatedOrder = await this.confirm(order.id, order.restaurantId, PaymentMethod.PIX);
      await paymentTerminalRepository.markDeliveryPaymentPaid({
        orderId: order.id,
        restaurantId: order.restaurantId,
        providerPaymentId: String(payment.providerPaymentId),
        lastProviderStatus: String(status.status || 'paid'),
      });
      return { paid: true, order: updatedOrder, payment: publicPayment(await paymentTerminalRepository.findDeliveryPayment(order.id, order.restaurantId)) };
    }

    if (!payment.providerOrderId) throw new Error('Cobrança da maquininha ainda não foi criada.');
    const providerOrder = await paymentTerminalService.mercadoPagoRequest<any>(
      order.restaurantId,
      `/v1/orders/${encodeURIComponent(String(payment.providerOrderId))}`,
    );
    if (String(providerOrder?.external_reference || '') !== `pickup-${order.restaurantId}-${order.id}`) {
      throw new Error('Cobrança Point não corresponde a este pedido de retirada.');
    }
    if (String(providerOrder?.status || '').toLowerCase() !== 'processed') {
      await paymentTerminalRepository.updateDeliveryPaymentProvider({
        orderId: order.id,
        restaurantId: order.restaurantId,
        lastProviderStatus: String(providerOrder?.status || 'pending'),
      });
      return { paid: false, payment: publicPayment(payment), order };
    }
    const expectedAmount = cents(order.total);
    const totalPaid = cents(providerOrder?.total_paid_amount);
    const transaction = providerOrder?.transactions?.payments?.find(
      (item: any) => String(item?.status || '').toLowerCase() === 'processed',
    );
    const transactionPaid = cents(transaction?.paid_amount ?? transaction?.amount);
    if (expectedAmount === null || totalPaid !== expectedAmount || transactionPaid !== expectedAmount) {
      throw new Error('O valor aprovado na maquininha não corresponde ao total do pedido.');
    }
    const updatedOrder = await this.confirm(order.id, order.restaurantId, PaymentMethod.CARTAO);
    await paymentTerminalRepository.markDeliveryPaymentPaid({
      orderId: order.id,
      restaurantId: order.restaurantId,
      providerOrderId: String(payment.providerOrderId),
      providerPaymentId: transaction?.id ? String(transaction.id) : null,
      lastProviderStatus: String(providerOrder?.status || 'processed'),
    });
    return { paid: true, order: updatedOrder, payment: publicPayment(await paymentTerminalRepository.findDeliveryPayment(order.id, order.restaurantId)) };
  }

  async confirmCash(input: {
    orderId: number;
    restaurantId: number;
    role: string;
    subRole?: string | null;
  }) {
    this.assertOperator(input.role, input.subRole);
    const order = await this.getPickup(input.orderId, input.restaurantId);
    if (order.paid === true) return order;
    return this.confirm(order.id, order.restaurantId, PaymentMethod.DINHEIRO);
  }
}

export default new PickupPaymentService();
