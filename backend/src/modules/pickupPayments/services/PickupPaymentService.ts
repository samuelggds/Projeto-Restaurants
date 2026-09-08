import { OrderType, PaymentMethod, UserRole } from '@prisma/client';
import { realtimePublisher as io } from '../../../realtime/realtimePublisher.js';
import orderRepository from '../../orders/repositories/OrderRepository.js';
import orderPixPaymentService from '../../orders/services/OrderPixPaymentService.js';
import { markCouponRedemptionUsedForOrder } from '../../orders/services/couponRedemptionLifecycle.js';
import restaurantSettingsRepository from '../../restaurantSettings/repositories/RestaurantSettingsRepository.js';
import paymentTerminalRepository from '../../paymentTerminals/repositories/PaymentTerminalRepository.js';
import paymentTerminalService from '../../paymentTerminals/services/PaymentTerminalService.js';
import {
  findPickupPayment, markPickupPaid, reservePickupPayment, savePickupProvider,
  withLockedPickup, type PickupPayment,
} from './pickupPaymentPersistence.js';

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
    if (order.status === 'CANCELADO') throw new Error('Pedido cancelado não pode receber pagamento.');
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

    const settings = await restaurantSettingsRepository.findByRestaurantId(order.restaurantId);
    const provider = input.method === 'PIX'
      ? String(settings?.pixProvider || 'MERCADO_PAGO').toUpperCase()
      : 'MERCADO_PAGO';
    const terminals = input.method === 'CARTAO'
      ? await paymentTerminalRepository.listTerminals(order.restaurantId) : [];
    const requestedTerminal = input.terminalPublicId
      ? terminals.find((item) => item.publicId === input.terminalPublicId)
      : terminals.find((item) => item.active && String(item.operatingMode).toUpperCase() === 'PDV');
    if (input.method === 'CARTAO' && String(settings?.cardGateway).toUpperCase() !== 'MERCADO_PAGO') {
      throw new Error('Cartão automático no balcão exige Mercado Pago Point configurado.');
    }

    // The same order lock is used for cash confirmation. Once this commits,
    // a pending charge cannot race with a different payment method.
    const reservation = await withLockedPickup(order.id, order.restaurantId, async (tx, current) => {
      if (current.paid) return { order: current, payment: null, created: false };
      if (current.paymentMethod) throw new Error('Este pedido já possui pagamento online definido.');
      const existing = await findPickupPayment(tx, order.id, order.restaurantId);
      if (existing) {
        if (existing.method !== input.method) throw new Error('Concilie a cobrança existente antes de trocar a forma de pagamento.');
        if (existing.provider !== provider) throw new Error('O provedor mudou. Concilie a cobrança anterior antes de continuar.');
        if (input.terminalPublicId && existing.terminalId !== requestedTerminal?.id) {
          throw new Error('Concilie a cobrança existente antes de trocar a maquininha.');
        }
        if (cents(existing.amount) !== cents(current.total) || existing.currency !== 'BRL') {
          throw new Error('O valor da tentativa diverge do pedido. Concilie a cobrança existente.');
        }
        return { order: current, payment: existing, created: false };
      }
      if (input.method === 'CARTAO' && (!requestedTerminal?.active || String(requestedTerminal.operatingMode).toUpperCase() !== 'PDV')) {
        throw new Error('Selecione uma maquininha ativa em modo PDV.');
      }
      const payment = await reservePickupPayment(tx, {
        orderId: current.id, restaurantId: current.restaurantId, method: input.method,
        provider, amount: Number(current.total), terminalId: requestedTerminal?.id,
      });
      return { order: current, payment, created: true };
    });
    const payment = reservation.payment;
    if (!payment) return { payment: null, order: reservation.order };
    if ((payment.method === 'PIX' && payment.providerPaymentId && payment.pixCopyPaste) ||
      (payment.method === 'CARTAO' && payment.providerOrderId) || payment.status === 'PAID') {
      return { payment: publicPayment(payment), order: reservation.order };
    }
    // Old attempts did not persist an idempotency key; never replay their POST.
    if (!reservation.created && payment.provider !== 'ASAAS' &&
      (!String(payment.lastProviderStatus).endsWith(':v1') ||
        Date.now() - new Date(payment.createdAt).getTime() > 60 * 60 * 1000)) {
      throw new Error('A tentativa anterior precisa de conciliação com o provedor. Nenhuma nova cobrança foi criada.');
    }
    const idempotencyKey = `pickup-${payment.publicId}`;
    try {
    if (input.method === 'PIX') {
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
        idempotencyKey,
        resumeOnly: !reservation.created,
      });
      const updated = await savePickupProvider({
        payment, providerPaymentId: String(result.paymentId || ''),
        lastProviderStatus: String(result.status || 'pending'),
        pixCopyPaste: String(result.qrCode || ''),
        pixQrCodeBase64: result.qrCodeBase64 ? String(result.qrCodeBase64) : null,
      });
      await orderPixPaymentService.attachPaymentToOrder({
        orderId: order.id,
        restaurantId: order.restaurantId,
        paymentId: String(result.paymentId || ''),
      });
      return { payment: publicPayment(updated), order };
    }

    const terminal = terminals.find((item) => item.id === payment.terminalId);
    if (!terminal || terminal.active !== true) throw new Error('Selecione uma maquininha ativa do restaurante.');
    if (String(terminal.operatingMode || '').toUpperCase() !== 'PDV') {
      throw new Error('A maquininha precisa estar em modo PDV.');
    }

    const providerOrder = await paymentTerminalService.mercadoPagoRequest<any>(
      order.restaurantId,
      '/v1/orders',
      {
        method: 'POST',
        headers: { 'X-Idempotency-Key': idempotencyKey },
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
    const updated = await savePickupProvider({
      payment,
      providerOrderId,
      lastProviderStatus: String(providerOrder?.status || 'created'),
    });
    return { payment: publicPayment(updated), order };
    } catch (error) {
      await savePickupProvider({ payment, lastProviderStatus: 'creation_unknown:v1' }).catch(() => undefined);
      console.error('[PICKUP_PAYMENT_CREATION_UNCERTAIN]', {
        orderId: order.id, restaurantId: order.restaurantId,
        errorType: error instanceof Error ? error.name : 'UnknownError',
      });
      throw new Error('Não foi possível concluir a cobrança. A tentativa foi preservada; consulte ou retome este pagamento antes de cobrar novamente.');
    }
  }

  private async confirm(orderId: number, restaurantId: number, method: PaymentMethod, approvedPayment?: PickupPayment, providerPaymentId?: string | null) {
    const result = await withLockedPickup(orderId, restaurantId, async (tx, order) => {
      const payment = await findPickupPayment(tx, orderId, restaurantId);
      if (method === PaymentMethod.DINHEIRO && payment && !['FAILED', 'CANCELLED', 'CANCELED', 'EXPIRED'].includes(payment.status)) {
        throw new Error('Concilie a cobrança pendente antes de receber em dinheiro.');
      }
      if (method !== PaymentMethod.DINHEIRO && (!payment || payment.publicId !== approvedPayment?.publicId || payment.method !== method)) {
        throw new Error('A confirmação não corresponde à tentativa de pagamento atual.');
      }
      if (order.paid) {
        if (order.paymentMethod !== method) throw new Error('O pedido já foi pago por outra forma de pagamento.');
        if (payment && approvedPayment) await markPickupPaid(tx, payment, providerPaymentId);
        return { order, changed: false };
      }
      if (order.paymentMethod) throw new Error('Este pedido possui pagamento online definido.');
      const changed = await tx.order.updateMany({
        where: { id: order.id, restaurantId, type: OrderType.RETIRADA, paid: false, status: { not: 'CANCELADO' }, paymentMethod: null },
        data: { paid: true, paidAt: new Date(), paymentMethod: method },
      });
      if (changed.count !== 1) throw new Error('O pedido mudou durante a confirmação. Consulte o estado atual.');
      await markCouponRedemptionUsedForOrder(order.id, restaurantId, tx);
      if (payment && approvedPayment) await markPickupPaid(tx, payment, providerPaymentId);
      const paidOrder = await orderRepository.findById(orderId, restaurantId, tx);
      if (!paidOrder) throw new Error('Pedido não encontrado após confirmação.');
      return { order: paidOrder, changed: true };
    });
    const updated = result.order;
    if (!result.changed) return updated;
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
    let payment = await paymentTerminalRepository.findDeliveryPayment(order.id, order.restaurantId);
    if (!payment) throw new Error('Inicie o pagamento no balcão primeiro.');
    if (!payment.providerPaymentId && !payment.providerOrderId) {
      await this.start({ ...input, method: payment.method as 'PIX' | 'CARTAO' });
      payment = await paymentTerminalRepository.findDeliveryPayment(order.id, order.restaurantId);
      if (!payment) throw new Error('Tentativa de pagamento não encontrada.');
    }

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
      const updatedOrder = await this.confirm(order.id, order.restaurantId, PaymentMethod.PIX, payment, String(payment.providerPaymentId));
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
    const updatedOrder = await this.confirm(order.id, order.restaurantId, PaymentMethod.CARTAO, payment, transaction?.id ? String(transaction.id) : null);
    return { paid: true, order: updatedOrder, payment: publicPayment(await paymentTerminalRepository.findDeliveryPayment(order.id, order.restaurantId)) };
  }

  async confirmCash(input: {
    orderId: number;
    restaurantId: number;
    role: string;
    subRole?: string | null;
  }) {
    this.assertOperator(input.role, input.subRole);
    return this.confirm(input.orderId, input.restaurantId, PaymentMethod.DINHEIRO);
  }
}

export default new PickupPaymentService();
