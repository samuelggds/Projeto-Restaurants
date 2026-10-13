import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AdminOrder } from '../types';
import { AdminOrderDetail, type OrderDetailBusy } from './AdminOrderDetail';

vi.mock('./LalamoveFreightQuote', () => ({
  LalamoveFreightQuote: ({ orderId }: { orderId: number }) => (
    <div data-testid="partner-quote">Cotação do pedido {orderId}</div>
  ),
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const baseOrder: AdminOrder = {
  id: '#701', numericId: 701, customerName: 'Cliente da API',
  status: 'PREPARANDO', type: 'DELIVERY', total: 51.75,
  paid: true, paymentMethod: 'PIX', payOnDelivery: false,
  createdAt: '2026-10-13T12:00:00Z',
};
const idle: OrderDetailBusy = {
  payment: false, tablePayment: false, cancel: false,
  status: false, refund: false, print: false,
};
const money = (amount: number) => amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

describe('AdminOrderDetail: apresentação sem alterar contratos financeiros', () => {
  let container: HTMLDivElement;
  let root: Root;
  const handlers = {
    onClose: vi.fn(), onPrint: vi.fn(), onCancel: vi.fn(),
    onConfirmPayment: vi.fn(), onConfirmTableCash: vi.fn(),
    onCheckRefund: vi.fn(), onChangeStatus: vi.fn(), onRefresh: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  async function renderDetail(order = baseOrder, extra: Partial<Parameters<typeof AdminOrderDetail>[0]> = {}) {
    await act(async () => root.render(
      <AdminOrderDetail {...handlers} order={order} money={money} busy={idle} {...extra} />,
    ));
  }
  function button(label: string) {
    const element = container.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
    if (!element) throw new Error(`Botão ausente: ${label}`);
    return element;
  }
  function moreButton() {
    const element = container.querySelector<HTMLButtonElement>('.detail-more');
    if (!element) throw new Error('Mais opções ausente.');
    return element;
  }

  it.each(['PIX', 'CARTAO'])('mostra %s pago online sem oferecer outra cobrança', async (paymentMethod) => {
    await renderDetail({ ...baseOrder, paymentMethod });
    expect(container.querySelector('.detail-payment')?.textContent).toContain('Pagamento online · Pago');
    expect(container.querySelector('.detail-payment-state')?.getAttribute('data-tone')).toBe('success');
    expect(container.querySelector('.detail-receipt')).toBeNull();
    expect(container.querySelector('[aria-label="Formas de pagamento no balcão"]')).toBeNull();
  });

  it('não infere pagamento a partir de PRONTO nem confirma Pix manualmente', async () => {
    await renderDetail({ ...baseOrder, paid: false, status: 'PRONTO' });
    expect(container.querySelector('.detail-payment')?.textContent).toContain('Pendente');
    expect(container.textContent).not.toContain('Pagamento online · Pago');
    expect(container.querySelector('.detail-receipt')).toBeNull();
    expect(handlers.onConfirmPayment).not.toHaveBeenCalled();
  });

  it.each(['PROCESSING', 'SUCCEEDED', 'FAILED'] as const)(
    'prioriza o estorno %s sobre a mensagem de pago', async (refundStatus) => {
      await renderDetail({ ...baseOrder, refundStatus });
      expect(container.querySelector('.detail-payment')?.textContent).toContain('Estorno');
      expect(container.textContent).not.toContain('Pagamento online · Pago');
      expect(container.querySelector('.detail-receipt')).toBeNull();
    },
  );

  it('reutiliza somente o fluxo de retirada elegível para pagar no balcão', async () => {
    const renderPickupPayment = vi.fn((order: AdminOrder) => <div data-testid="counter-payment">Balcão {order.numericId}</div>);
    await renderDetail({ ...baseOrder, type: 'RETIRADA', paid: false, paymentMethod: undefined }, { renderPickupPayment });
    expect(renderPickupPayment).toHaveBeenCalledWith(expect.objectContaining({ numericId: 701 }));
    expect(container.querySelector('[data-testid="counter-payment"]')).not.toBeNull();
    await renderDetail({ ...baseOrder, type: 'RETIRADA', paid: true }, { renderPickupPayment });
    expect(container.querySelector('[data-testid="counter-payment"]')).toBeNull();
    expect(container.textContent).toContain('Pagamento online · Pago');
  });

  it('mantém o pedido de mesa separado da cobrança de retirada', async () => {
    const renderPickupPayment = vi.fn(() => <span>Balcão indevido</span>);
    await renderDetail({ ...baseOrder, type: 'MESA', tableNumber: 9, paid: false, paymentMethod: undefined }, { renderPickupPayment });
    expect(container.textContent).toContain('Mesa 9');
    expect(container.querySelector('.detail-payment')?.textContent).toContain('Pagamento da mesa');
    expect(container.querySelector('.detail-table-methods')?.textContent).toContain('Pix');
    expect(container.querySelector('.detail-table-methods')?.textContent).toContain('Dinheiro');
    expect(container.textContent).not.toContain('Maquininha');
    expect(renderPickupPayment).not.toHaveBeenCalled();
    expect(container.querySelector('.detail-receipt')).toBeNull();
  });

  it('confirma o recebimento de mesa pelo callback próprio e não pelo de entrega', async () => {
    await renderDetail({ ...baseOrder, type: 'MESA', tableNumber: 3, paid: false, paymentMethod: undefined }, {
      pendingTableCash: { paymentPublicId: 'payment-701', totalCents: 8000, payerDisplayName: 'Responsável da mesa' },
    });
    expect(container.textContent).toContain('Dinheiro recebido pelo garçom');
    expect(container.textContent).toContain(money(80));
    act(() => button('Confirmar dinheiro recebido do pedido #701').click());
    expect(handlers.onConfirmTableCash).toHaveBeenCalledTimes(1);
    expect(handlers.onConfirmPayment).not.toHaveBeenCalled();
    expect(container.querySelector('.detail-payment-state strong')?.textContent).not.toBe('Pago');
  });

  it('não reapresenta botões manuais para mesa paga, cancelada ou estornada', async () => {
    const pendingTableCash = { paymentPublicId: 'stale-payment', totalCents: 5175, payerDisplayName: 'Cliente' };
    for (const order of [
      { ...baseOrder, type: 'MESA' },
      { ...baseOrder, type: 'MESA', paid: false, status: 'CANCELADO' },
      { ...baseOrder, type: 'MESA', paid: false, refundStatus: 'PROCESSING' as const },
    ]) {
      await renderDetail(order, { pendingTableCash });
      expect(container.querySelector('.detail-receipt')).toBeNull();
    }
  });

  it('carrega a cotação parceira só ao abrir Mais opções, sem contratar entregador', async () => {
    await renderDetail();
    expect(moreButton().getAttribute('aria-expanded')).toBe('false');
    expect(container.querySelector('[data-testid="partner-quote"]')).toBeNull();
    act(() => moreButton().click());
    expect(moreButton().getAttribute('aria-expanded')).toBe('true');
    expect(container.querySelector('[data-testid="partner-quote"]')?.textContent).toContain('701');
    expect(container.textContent).not.toContain('Contratar motoqueiro');
    act(() => moreButton().click());
    expect(container.querySelector('[data-testid="partner-quote"]')).toBeNull();
  });

  it.each([
    { paid: false }, { type: 'MESA' }, { payOnDelivery: true },
    { assignedCourierId: 14 }, { status: 'ENTREGUE' }, { refundStatus: 'PROCESSING' as const },
  ])('não oferece cotação para pedido inelegível %j', async (changes) => {
    await renderDetail({ ...baseOrder, ...changes });
    act(() => moreButton().click());
    expect(container.querySelector('[data-testid="partner-quote"]')).toBeNull();
  });

  it('usa itens, totais e horários recebidos sem criar valores ou eventos', async () => {
    await renderDetail({
      ...baseOrder, itemsSubtotal: 50, couponDiscount: 3.25, couponCode: 'API-CUPOM', deliveryFeeAmount: 5,
      items: [{ id: 2, name: 'Produto recebido', quantity: 2, unitPrice: 25, options: ['Sem cebola'], observation: 'Separar molho' }],
      observation: 'Observação da API', readyAt: '2026-10-13T12:20:00Z',
      preparationStartedAt: '2026-10-13T12:10:00Z',
    });
    expect(container.querySelector('.detail-total')?.textContent).toContain(money(baseOrder.total));
    expect(container.querySelector('.detail-items')?.textContent).toContain('Produto recebido');
    expect(container.querySelector('.detail-items')?.textContent).toContain('Sem cebola');
    expect(container.querySelector('.detail-items')?.textContent).toContain('Observação da API');
    expect(container.querySelector('.detail-history li strong')?.textContent).toBe('Pedido pronto');
    expect(container.querySelector('.detail-history')?.textContent).not.toContain('Pagamento confirmado');
  });

  it('imprimir e fechar não cancelam o pedido nem modificam o pagamento', async () => {
    await renderDetail();
    act(() => button('Imprimir pedido #701').click());
    act(() => button('Fechar detalhes do pedido').click());
    expect(handlers.onPrint).toHaveBeenCalledTimes(1);
    expect(handlers.onClose).toHaveBeenCalledTimes(1);
    expect(handlers.onCancel).not.toHaveBeenCalled();
    expect(handlers.onConfirmPayment).not.toHaveBeenCalled();
    expect(handlers.onConfirmTableCash).not.toHaveBeenCalled();
    expect(handlers.onChangeStatus).not.toHaveBeenCalled();
  });
});
