import prisma from '../../../config/prisma.js';
import { realtimePublisher as io } from '../../../realtime/realtimePublisher.js';
import restaurantSettingsRepository from '../../restaurantSettings/repositories/RestaurantSettingsRepository.js';
import orderRepository from '../../orders/repositories/OrderRepository.js';
import orderPixPaymentService from '../../orders/services/OrderPixPaymentService.js';
import { markCouponRedemptionUsedForOrder } from '../../orders/services/couponRedemptionLifecycle.js';
import paymentTerminalRepository from '../repositories/PaymentTerminalRepository.js';

const MERCADO_PAGO_API = 'https://api.mercadopago.com';

type MercadoPagoTerminal = {
  id?: string;
  pos_id?: string | number | null;
  store_id?: string | number | null;
  external_pos_id?: string | null;
  operating_mode?: string | null;
};

type MercadoPagoTerminalList = {
  data?: { terminals?: MercadoPagoTerminal[] };
};

type MercadoPagoPointOrder = {
  id?: string;
  type?: string;
  external_reference?: string;
  status?: string;
  status_detail?: string;
  total_paid_amount?: string | number;
  config?: { point?: { terminal_id?: string } };
  transactions?: {
    payments?: Array<{
      id?: string;
      amount?: string | number;
      paid_amount?: string | number;
      status?: string;
      status_detail?: string;
    }>;
  };
};

function cents(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round((number + Number.EPSILON) * 100) : null;
}

function publicTerminal(row: any) {
  return {
    publicId: String(row.publicId),
    provider: String(row.provider),
    providerTerminalId: String(row.providerTerminalId),
    serial: String(row.providerTerminalId).split('__').pop() || String(row.providerTerminalId),
    posId: row.posId ? String(row.posId) : null,
    storeId: row.storeId ? String(row.storeId) : null,
    externalPosId: row.externalPosId ? String(row.externalPosId) : null,
    operatingMode: row.operatingMode ? String(row.operatingMode) : null,
    active: row.active === true,
    assignedCourierId: row.assignedCourierId ? Number(row.assignedCourierId) : null,
    courierName: row.courierName ? String(row.courierName) : null,
    lastSyncedAt: row.lastSyncedAt,
  };
}

function publicDeliveryPayment(row: any) {
  if (!row) return null;
  return {
    publicId: String(row.publicId),
    orderId: Number(row.orderId),
    method: String(row.method),
    provider: String(row.provider),
    status: String(row.status),
    amount: Number(row.amount),
    currency: String(row.currency || 'BRL'),
    pixCopyPaste: row.pixCopyPaste ? String(row.pixCopyPaste) : null,
    pixQrCodeBase64: row.pixQrCodeBase64 ? String(row.pixQrCodeBase64) : null,
    expiresAt: row.expiresAt || null,
    lastProviderStatus: row.lastProviderStatus ? String(row.lastProviderStatus) : null,
    paidAt: row.paidAt || null,
  };
}

class PaymentTerminalService {
  async getMercadoPagoToken(restaurantId: number) {
    const settings = await restaurantSettingsRepository.findByRestaurantId(restaurantId);
    const token = String(settings?.mercadoPagoAccessToken || '').trim();
    if (!token) {
      throw new Error('Conecte a conta Mercado Pago do restaurante antes de configurar maquininhas.');
    }
    return token;
  }

  async mercadoPagoRequest<T>(restaurantId: number, path: string, init: RequestInit = {}) {
    const token = await this.getMercadoPagoToken(restaurantId);
    const response = await fetch(`${MERCADO_PAGO_API}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
    });
    const text = await response.text();
    let body: T | null = null;
    if (text) {
      try {
        body = JSON.parse(text) as T;
      } catch {
        body = null;
      }
    }
    if (!response.ok) {
      const message = String(
        (body as any)?.message ||
          (body as any)?.error ||
          (body as any)?.cause?.[0]?.description ||
          `Mercado Pago respondeu HTTP ${response.status}.`,
      );
      throw new Error(message);
    }
    return body as T;
  }

  async list(restaurantId: number) {
    const [terminals, couriers] = await Promise.all([
      paymentTerminalRepository.listTerminals(restaurantId),
      paymentTerminalRepository.listActiveCouriers(restaurantId),
    ]);
    return {
      terminals: terminals.map(publicTerminal),
      couriers: couriers.map((courier) => ({
        id: Number(courier.id),
        name: String(courier.name),
        email: String(courier.email),
      })),
    };
  }

  async syncMercadoPago(restaurantId: number) {
    const settings = await restaurantSettingsRepository.findByRestaurantId(restaurantId);
    if (String(settings?.cardGateway || '').toUpperCase() !== 'MERCADO_PAGO') {
      throw new Error('Selecione Mercado Pago como gateway do cartão para integrar Point.');
    }

    const result = await this.mercadoPagoRequest<MercadoPagoTerminalList>(
      restaurantId,
      '/terminals/v1/list?limit=50&offset=0',
    );
    const terminals = Array.isArray(result?.data?.terminals) ? result.data.terminals : [];
    const ids = terminals.map((terminal) => String(terminal.id || '').trim()).filter(Boolean);

    const notIntegrated = terminals.filter(
      (terminal) => String(terminal.id || '').trim() && String(terminal.operating_mode || '').toUpperCase() !== 'PDV',
    );
    if (notIntegrated.length) {
      await this.mercadoPagoRequest(restaurantId, '/terminals/v1/setup', {
        method: 'PATCH',
        body: JSON.stringify({
          terminals: notIntegrated.map((terminal) => ({
            id: String(terminal.id),
            operating_mode: 'PDV',
          })),
        }),
      });
    }

    for (const terminal of terminals) {
      const providerTerminalId = String(terminal.id || '').trim();
      if (!providerTerminalId) continue;
      await paymentTerminalRepository.upsertMercadoPagoTerminal({
        restaurantId,
        providerTerminalId,
        posId: terminal.pos_id == null ? null : String(terminal.pos_id),
        storeId: terminal.store_id == null ? null : String(terminal.store_id),
        externalPosId: terminal.external_pos_id || null,
        operatingMode:
          String(terminal.operating_mode || '').toUpperCase() === 'PDV' || notIntegrated.includes(terminal)
            ? 'PDV'
            : String(terminal.operating_mode || '') || null,
      });
    }
    await paymentTerminalRepository.deactivateMissingMercadoPagoTerminals(restaurantId, ids);
    return this.list(restaurantId);
  }

  async assign(input: {
    restaurantId: number;
    terminalPublicId: string;
    courierId: number | null;
    adminUserId: number;
  }) {
    const terminal = await paymentTerminalRepository.findTerminalByPublicId(
      input.terminalPublicId,
      input.restaurantId,
    );
    if (!terminal || terminal.active !== true) throw new Error('Maquininha ativa não encontrada.');
    if (String(terminal.operatingMode || '').toUpperCase() !== 'PDV') {
      throw new Error('A maquininha precisa estar em modo PDV antes de ser atribuída.');
    }
    return publicTerminal(
      await paymentTerminalRepository.assignTerminal({
        publicId: input.terminalPublicId,
        restaurantId: input.restaurantId,
        courierId: input.courierId,
        assignedByUserId: input.adminUserId,
      }),
    );
  }

  async ensurePixAtDelivery(order: any) {
    const existing = await paymentTerminalRepository.findDeliveryPayment(order.id, order.restaurantId);
    if (existing?.providerPaymentId && existing.pixCopyPaste) return publicDeliveryPayment(existing);

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
      type: 'DELIVERY',
      paymentMethod: 'PIX',
      pixProvider: provider,
      items: (order.items || []).map((item: any) => ({
        productId: Number(item.productId),
        quantity: Number(item.quantity),
        observation: item.observation || undefined,
      })),
      address: order.address || undefined,
      number: order.number || undefined,
      district: order.district || undefined,
      city: order.city || undefined,
      state: order.state || undefined,
      customerName: order.user?.name || 'Cliente',
      customerCpf: order.user?.cpf || undefined,
      customerPhone: order.user?.phone || undefined,
      userEmail: order.user?.email || null,
      orderId: order.id,
      orderTotal: Number(order.total),
      orderSubtotal: Number(order.itemsSubtotal) - Number(order.couponDiscount),
      orderDeliveryFee: Number(order.deliveryFeeAmount),
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
      expiresAt: new Date(Date.now() + 3 * 60 * 60 * 1000),
    });
    return publicDeliveryPayment(updated);
  }

  async ensureCardAtDelivery(order: any, courierId: number) {
    const existing = await paymentTerminalRepository.findDeliveryPayment(order.id, order.restaurantId);
    if (existing?.providerOrderId) return publicDeliveryPayment(existing);

    const settings = await restaurantSettingsRepository.findByRestaurantId(order.restaurantId);
    const gateway = String(settings?.cardGateway || '').toUpperCase();
    if (gateway !== 'MERCADO_PAGO') {
      throw new Error(
        'Cartão na entrega automatizado exige Mercado Pago Point. Configure Mercado Pago como gateway do cartão.',
      );
    }

    const terminal = await paymentTerminalRepository.findAssignedTerminal(order.restaurantId, courierId);
    if (!terminal) {
      throw new Error('Você precisa ter uma maquininha Point vinculada antes de retirar este pedido.');
    }
    if (String(terminal.operatingMode || '').toUpperCase() !== 'PDV') {
      throw new Error('Sua maquininha ainda não está em modo PDV. Peça ao administrador para sincronizá-la.');
    }

    await paymentTerminalRepository.createDeliveryPayment({
      orderId: order.id,
      restaurantId: order.restaurantId,
      method: 'CARTAO',
      provider: 'MERCADO_PAGO',
      amount: Number(order.total),
      terminalId: terminal.id,
    });

    const providerOrder = await this.mercadoPagoRequest<MercadoPagoPointOrder>(
      order.restaurantId,
      '/v1/orders',
      {
        method: 'POST',
        headers: { 'X-Idempotency-Key': `delivery-${order.restaurantId}-${order.id}` },
        body: JSON.stringify({
          type: 'point',
          external_reference: `delivery-${order.restaurantId}-${order.id}`,
          expiration_time: 'PT3H',
          description: `Pedido ${order.id}`,
          transactions: {
            payments: [{ amount: Number(order.total).toFixed(2) }],
          },
          config: {
            point: {
              terminal_id: terminal.providerTerminalId,
              print_on_terminal: 'no_ticket',
            },
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
      lastProviderStatus: String(providerOrder.status || 'created'),
    });
    return publicDeliveryPayment(updated);
  }

  async ensureForClaim(orderId: number, restaurantId: number, courierId: number) {
    const order = await orderRepository.findById(orderId, restaurantId);
    if (!order) throw new Error('Pedido não encontrado.');
    if (order.payOnDelivery !== true) return null;
    const method = String(order.payOnDeliveryMethod || order.paymentMethod || '').toUpperCase();
    if (method === 'PIX') return this.ensurePixAtDelivery(order);
    if (method === 'CARTAO') return this.ensureCardAtDelivery(order, courierId);
    return null;
  }

  async getOrderDeliveryPayment(orderId: number, restaurantId: number, courierId?: number | null) {
    const order = await orderRepository.findById(orderId, restaurantId);
    if (!order) throw new Error('Pedido não encontrado.');
    if (courierId && order.assignedCourierId && Number(order.assignedCourierId) !== courierId) {
      throw new Error('Esta entrega não está atribuída a você.');
    }
    const payment = await paymentTerminalRepository.findDeliveryPayment(orderId, restaurantId);
    return publicDeliveryPayment(payment);
  }

  async confirmCanonicalPayment(input: {
    orderId: number;
    restaurantId: number;
    providerPaymentId?: string | null;
    providerOrderId?: string | null;
    providerStatus?: string | null;
  }) {
    const order = await orderRepository.findById(input.orderId, input.restaurantId);
    if (!order) return null;
    if (order.payOnDelivery !== true) throw new Error('Pedido não é pagamento na entrega.');
    if (order.paid === true) return order;

    const updated = await prisma.$transaction(async (tx) => {
      const confirmed = await orderRepository.confirmPayment(order.id, order.restaurantId, tx);
      await markCouponRedemptionUsedForOrder(order.id, order.restaurantId, tx);
      return confirmed;
    });
    await paymentTerminalRepository.markDeliveryPaymentPaid({
      orderId: order.id,
      restaurantId: order.restaurantId,
      providerPaymentId: input.providerPaymentId,
      providerOrderId: input.providerOrderId,
      lastProviderStatus: input.providerStatus,
    });

    io.to(`restaurant:${order.restaurantId}`).emit('order:payment-confirmed', {
      orderId: updated.id,
      paid: true,
      paymentMethod: updated.paymentMethod,
    });
    io.to(`restaurant:${order.restaurantId}`).emit('order:status-changed', updated);
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

  async reconcilePix(orderId: number, restaurantId: number) {
    const payment = await paymentTerminalRepository.findDeliveryPayment(orderId, restaurantId);
    if (!payment?.providerPaymentId) throw new Error('Cobrança Pix da entrega ainda não foi criada.');
    const order = await orderRepository.findById(orderId, restaurantId);
    if (!order) throw new Error('Pedido não encontrado.');

    const status = await orderPixPaymentService.ensurePaymentApproved({
      paymentId: String(payment.providerPaymentId),
      restaurantId,
      expectedOrderId: orderId,
      expectedAmount: Number(order.total),
      expectedCurrency: 'BRL',
    });
    await this.confirmCanonicalPayment({
      orderId,
      restaurantId,
      providerPaymentId: String(payment.providerPaymentId),
      providerStatus: String(status.status || 'paid'),
    });
    return this.getOrderDeliveryPayment(orderId, restaurantId);
  }

  async reconcilePointOrder(providerOrderId: string, restaurantId: number) {
    const payment = await paymentTerminalRepository.findByProviderOrderId(
      'MERCADO_PAGO',
      providerOrderId,
    );
    if (!payment || payment.restaurantId !== restaurantId) return null;

    const providerOrder = await this.mercadoPagoRequest<MercadoPagoPointOrder>(
      restaurantId,
      `/v1/orders/${encodeURIComponent(providerOrderId)}`,
    );
    const expectedReference = `delivery-${restaurantId}-${payment.orderId}`;
    if (String(providerOrder.external_reference || '') !== expectedReference) {
      throw new Error('Cobrança Point não corresponde ao pedido informado.');
    }
    if (String(providerOrder.type || '').toLowerCase() !== 'point') {
      throw new Error('Cobrança recebida não é uma transação Point.');
    }
    if (String(providerOrder.status || '').toLowerCase() !== 'processed') {
      await paymentTerminalRepository.updateDeliveryPaymentProvider({
        orderId: payment.orderId,
        restaurantId,
        lastProviderStatus: String(providerOrder.status || 'pending'),
      });
      return null;
    }

    const expectedAmount = cents(payment.amount);
    const totalPaid = cents(providerOrder.total_paid_amount);
    if (expectedAmount === null || totalPaid === null || expectedAmount !== totalPaid) {
      throw new Error('Valor aprovado na Point não corresponde ao total do pedido.');
    }
    const transaction = providerOrder.transactions?.payments?.find(
      (item) => String(item.status || '').toLowerCase() === 'processed',
    );
    const transactionPaid = cents(transaction?.paid_amount ?? transaction?.amount);
    if (transactionPaid === null || transactionPaid !== expectedAmount) {
      throw new Error('Transação Point aprovada possui valor divergente.');
    }

    await this.confirmCanonicalPayment({
      orderId: payment.orderId,
      restaurantId,
      providerOrderId,
      providerPaymentId: transaction?.id || null,
      providerStatus: String(providerOrder.status || 'processed'),
    });
    return this.getOrderDeliveryPayment(payment.orderId, restaurantId);
  }
}

export default new PaymentTerminalService();
