import { describe, expect, it } from 'vitest';
import {
  filterAdminOrders,
  getAdminOrdersSummary,
  getNextOrderStatuses,
  getOrderPaymentPresentation,
  getOrderProgress,
  getOrderTypeLabel,
  isAutomaticRefundEligible,
} from './adminOrders';
import type { AdminOrder } from '../types';

const orders = [
  { id: '#100', numericId: 100, customerName: 'João Silva', status: 'PENDENTE', total: 40 },
  { id: '#101', numericId: 101, customerName: 'Maria Souza', status: 'PREPARANDO', total: 60 },
] as AdminOrder[];

describe('pedidos administrativos', () => {
  it('busca por cliente ou número do pedido sem diferenciar maiúsculas', () => {
    expect(filterAdminOrders(orders, 'joão', '')).toEqual([orders[0]]);
    expect(filterAdminOrders(orders, '#101', '')).toEqual([orders[1]]);
  });

  it('combina busca e filtro de status', () => {
    expect(filterAdminOrders(orders, 'maria', 'PREPARANDO')).toEqual([orders[1]]);
    expect(filterAdminOrders(orders, 'maria', 'PENDENTE')).toEqual([]);
  });

  it('permite somente transições operacionais válidas', () => {
    expect(getNextOrderStatuses('PENDENTE')).toEqual(['PREPARANDO', 'CANCELADO']);
    expect(getNextOrderStatuses('PREPARANDO')).toEqual(['PRONTO']);
    expect(getNextOrderStatuses('ENTREGUE')).toEqual([]);
  });

  it('resume os estados que exigem atenção sem contar cancelados como pendentes', () => {
    expect(
      getAdminOrdersSummary([
        ...orders,
        {
          id: '#102',
          numericId: 102,
          customerName: 'Ana',
          status: 'ENTREGUE',
          total: 30,
          paid: true,
        },
        {
          id: '#103',
          numericId: 103,
          customerName: 'Carlos',
          status: 'CANCELADO',
          total: 20,
          paid: false,
        },
      ]),
    ).toEqual({ active: 2, awaitingPayment: 2, inProgress: 1, delivered: 1 });
  });

  it('só promete estorno automático para Pix ou cartão pagos online', () => {
    const base: AdminOrder = {
      id: '#200',
      numericId: 200,
      customerName: 'Cliente',
      status: 'PREPARANDO',
      total: 50,
      paid: true,
    };

    expect(isAutomaticRefundEligible({ ...base, paymentMethod: 'PIX' })).toBe(true);
    expect(isAutomaticRefundEligible({ ...base, paymentMethod: 'CARTAO' })).toBe(true);
    expect(isAutomaticRefundEligible({ ...base, paymentMethod: 'CREDIT_CARD' })).toBe(true);
    expect(isAutomaticRefundEligible({ ...base, paymentMethod: 'PIX', payOnDelivery: true })).toBe(
      false,
    );
    expect(isAutomaticRefundEligible({ ...base, paymentMethod: 'DINHEIRO' })).toBe(false);
    expect(isAutomaticRefundEligible({ ...base, paymentMethod: 'PIX', paid: false })).toBe(false);
  });

  it('traduz pagamento, modalidade, progresso e auditoria de estorno para o admin', () => {
    const order: AdminOrder = {
      id: '#201',
      numericId: 201,
      customerName: 'Cliente',
      status: 'SAIU_PARA_ENTREGA',
      total: 80,
      paid: true,
      paymentMethod: 'PIX',
      type: 'DELIVERY',
    };

    expect(getOrderPaymentPresentation(order)).toEqual({
      title: 'Pago online',
      detail: 'Pix · estorno automático ao cancelar',
      tone: 'success',
      automaticRefund: true,
    });
    expect(getOrderPaymentPresentation({ ...order, refundStatus: 'SUCCEEDED' }).title).toBe(
      'Estorno concluído',
    );
    expect(getOrderTypeLabel(order.type)).toBe('Entrega');
    expect(getOrderProgress(order.status)).toBe(4);
    expect(getOrderProgress('CANCELADO')).toBe(0);
  });
});
