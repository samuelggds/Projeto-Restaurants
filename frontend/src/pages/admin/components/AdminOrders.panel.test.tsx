import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'react-toastify';
import { AppDialogProvider } from '../../../components/AppDialog/AppDialogProvider';
import { AdminOrders } from './AdminOrders';
import type { AdminOrder } from '../types';

const mocks = vi.hoisted(() => ({
  list: vi.fn(), print: vi.fn(), sessions: vi.fn(),
  confirm: vi.fn(), cancel: vi.fn(), tableConfirm: vi.fn(), status: vi.fn(),
}));
vi.mock('../../../Services/ordersService', () => ({
  default: { listRestaurantOrdersPage: mocks.list, reprintKitchenOrder: mocks.print },
}));
vi.mock('../../../Services/tableAccountService', () => ({
  default: { listAdminSessions: mocks.sessions, confirmManualPayment: mocks.tableConfirm },
}));
vi.mock('./LalamoveFreightQuote', () => ({ LalamoveFreightQuote: () => null }));
vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const orders: AdminOrder[] = [
  { id: '#81', numericId: 81, customerName: 'Cliente Pix', paid: true, paymentMethod: 'PIX', type: 'DELIVERY', status: 'PREPARANDO', total: 31 },
  { id: '#82', numericId: 82, customerName: 'Cliente Mesa', paid: true, paymentMethod: 'PIX', type: 'MESA', status: 'PRONTO', total: 42 },
];

describe('AdminOrders: fechar, reabrir e imprimir sem mutação financeira', () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.print.mockReset().mockResolvedValue({ job: { status: 'QUEUED' } });
    mocks.sessions.mockResolvedValue({ sessions: [] });
    mocks.list.mockResolvedValue({
      orders: orders.map((order) => ({ ...order, id: order.numericId })),
      total: 2, hasMore: false, nextCursor: null,
      summary: { total: 2, active: 2, awaitingPayment: 0, inProgress: 2, delivered: 0 },
    });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => { act(() => root.unmount()); container.remove(); });

  async function renderOrders() {
    await act(async () => root.render(
      <AppDialogProvider>
        <AdminOrders orders={orders} restaurantName="Restaurante Teste"
          money={(value) => `R$ ${value.toFixed(2)}`}
          onConfirmPayment={mocks.confirm} onCancelOrder={mocks.cancel}
          onUpdateOrderStatus={mocks.status} />
      </AppDialogProvider>,
    ));
  }
  function button(label: string) {
    const value = container.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
    if (!value) throw new Error(`Botão ausente: ${label}`);
    return value;
  }
  function assertNoFinancialChanges() {
    expect(mocks.confirm).not.toHaveBeenCalled();
    expect(mocks.cancel).not.toHaveBeenCalled();
    expect(mocks.tableConfirm).not.toHaveBeenCalled();
    expect(mocks.status).not.toHaveBeenCalled();
  }

  it('recolhe o painel, devolve o foco e reabre o mesmo pedido ou outro', async () => {
    await renderOrders();
    const panel = container.querySelector('.selected-order-detail');
    expect(panel?.getAttribute('aria-hidden')).toBe('false');
    act(() => button('Fechar detalhes do pedido').click());
    expect(container.querySelector('.orders-split-view')?.getAttribute('data-detail-open')).toBe('false');
    expect(panel?.getAttribute('aria-hidden')).toBe('true');
    expect(panel?.hasAttribute('inert')).toBe(true);
    const first = button('Ver detalhes do pedido #81 de Cliente Pix');
    expect(document.activeElement).toBe(first);
    expect(first.getAttribute('aria-expanded')).toBe('false');
    const readsBefore = mocks.list.mock.calls.length;
    act(() => first.click());
    expect(panel?.getAttribute('aria-hidden')).toBe('false');
    expect(panel?.hasAttribute('inert')).toBe(false);
    expect(first.getAttribute('aria-expanded')).toBe('true');
    act(() => button('Fechar detalhes do pedido').click());
    act(() => button('Ver detalhes do pedido #82 de Cliente Mesa').click());
    expect(panel?.textContent).toContain('Pedido #82');
    expect(panel?.textContent).not.toContain('Pedido #81');
    expect(mocks.list).toHaveBeenCalledTimes(readsBefore);
    assertNoFinancialChanges();
  });

  it('imprime somente depois de confirmar e envia apenas o ID do pedido', async () => {
    await renderOrders();
    await act(async () => button('Imprimir pedido #81').click());
    expect(mocks.print).not.toHaveBeenCalled();
    expect(container.querySelector('[role="dialog"]')?.textContent).toContain('fila de impressão deste restaurante');
    const submit = container.querySelector<HTMLButtonElement>('[role="dialog"] button[type="submit"]');
    expect(submit).not.toBeNull();
    await act(async () => submit?.click());
    expect(mocks.print).toHaveBeenCalledExactlyOnceWith(81);
    expect(toast.success).toHaveBeenCalledWith('Comanda do pedido #81 enviada à fila de impressão.');
    assertNoFinancialChanges();
  });

  it('não apresenta sucesso de impressão quando o backend recusa o pedido', async () => {
    mocks.print.mockRejectedValue(new Error('Impressora indisponível.'));
    await renderOrders();
    await act(async () => button('Imprimir pedido #81').click());
    const submit = container.querySelector<HTMLButtonElement>('[role="dialog"] button[type="submit"]');
    await act(async () => submit?.click());
    expect(mocks.print).toHaveBeenCalledExactlyOnceWith(81);
    expect(toast.error).toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    expect(button('Imprimir pedido #81').disabled).toBe(false);
    assertNoFinancialChanges();
  });
});
