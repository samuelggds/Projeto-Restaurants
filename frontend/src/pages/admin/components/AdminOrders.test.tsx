import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { toast } from 'react-toastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppDialogProvider } from '../../../components/AppDialog/AppDialogProvider';
import type { AdminOrder } from '../types';
import { AdminOrders } from './AdminOrders';

vi.mock('react-toastify', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const orders: AdminOrder[] = [
  {
    id: '#301',
    numericId: 301,
    customerName: 'Cliente Pix',
    status: 'PREPARANDO',
    total: 72.5,
    paid: true,
    paymentMethod: 'PIX',
    payOnDelivery: false,
    type: 'DELIVERY',
    createdAt: '2026-08-25T12:00:00.000Z',
  },
  {
    id: '#302',
    numericId: 302,
    customerName: 'Cliente na entrega',
    status: 'PENDENTE',
    total: 48,
    paid: true,
    paymentMethod: 'CARTAO',
    payOnDelivery: true,
    payOnDeliveryMethod: 'CARTAO',
    type: 'DELIVERY',
  },
  {
    id: '#303',
    numericId: 303,
    customerName: 'Cliente sem pagamento',
    status: 'PENDENTE',
    total: 35,
    paid: false,
    paymentMethod: 'PIX',
    payOnDelivery: false,
    type: 'RETIRADA',
  },
];

const money = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function buttonByLabel(container: HTMLElement, label: string) {
  return container.querySelector(`button[aria-label="${label}"]`) as HTMLButtonElement;
}

describe('AdminOrders', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    vi.clearAllMocks();
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  function renderOrders(
    onCancelOrder = vi.fn().mockResolvedValue(undefined),
    renderedOrders = orders,
  ) {
    const onConfirmPayment = vi.fn().mockResolvedValue(undefined);
    act(() =>
      root.render(
        <AppDialogProvider>
          <AdminOrders
            orders={renderedOrders}
            money={money}
            onConfirmPayment={onConfirmPayment}
            onCancelOrder={onCancelOrder}
          />
        </AppDialogProvider>,
      ),
    );
    return { onCancelOrder, onConfirmPayment };
  }

  it('separa pagamento, modalidade, andamento e regras de devolução', () => {
    renderOrders();

    expect(container.textContent).toContain('Pedidos ativos');
    expect(container.textContent).toContain('Pago online');
    expect(container.textContent).toContain('Pix · estorno automático ao cancelar');
    expect(container.textContent).toContain('Pago na entrega');
    expect(container.textContent).toContain('Pagamento na entrega exige devolução manual');
    expect(container.textContent).toContain('Pagamento pendente');
    expect(container.textContent).toContain('Sem cobrança online confirmada');
    expect(container.textContent).toContain('Entrega');
    expect(container.textContent).toContain('Retirada no balcão');
    expect(container.querySelectorAll('[role="progressbar"]')).toHaveLength(3);
  });

  it('cresce em blocos de 10 e retorna aos 10 pedidos iniciais', () => {
    const manyOrders = Array.from({ length: 23 }, (_, index) => ({
      ...orders[0],
      id: `#${401 + index}`,
      numericId: 401 + index,
      customerName: `Cliente ${index + 1}`,
    }));
    renderOrders(undefined, manyOrders);

    expect(container.querySelectorAll('.order-card')).toHaveLength(10);
    expect(container.textContent).toContain('Exibindo 10 de 23 pedidos');

    act(() => buttonByLabel(container, 'Mostrar mais 10 pedidos').click());
    expect(container.querySelectorAll('.order-card')).toHaveLength(20);

    act(() => buttonByLabel(container, 'Mostrar mais 10 pedidos').click());
    expect(container.querySelectorAll('.order-card')).toHaveLength(23);

    act(() => buttonByLabel(container, 'Voltar aos 10 pedidos iniciais').click());
    expect(container.querySelectorAll('.order-card')).toHaveLength(10);
  });

  it('só chama o cancelamento online depois da confirmação no diálogo interno', async () => {
    const { onCancelOrder } = renderOrders();

    await act(async () => buttonByLabel(container, 'Cancelar e estornar o pedido #301').click());

    expect(onCancelOrder).not.toHaveBeenCalled();
    expect(container.querySelector('[role="dialog"]')).not.toBeNull();
    expect(container.textContent).toContain('Cancelar pedido e solicitar estorno?');
    expect(container.textContent).toContain('será solicitado automaticamente no Pix');

    const confirmButton = container.querySelector(
      '[role="dialog"] button[type="submit"]',
    ) as HTMLButtonElement;
    await act(async () => {
      confirmButton.click();
      await Promise.resolve();
    });

    expect(onCancelOrder).toHaveBeenCalledTimes(1);
    expect(onCancelOrder).toHaveBeenCalledWith(301);
    expect(toast.success).toHaveBeenCalledWith('Pedido #301 cancelado e estorno solicitado.');
  });

  it('informa devolução manual para pagamento recebido na entrega', async () => {
    const { onCancelOrder } = renderOrders();

    await act(async () => buttonByLabel(container, 'Cancelar o pedido #302').click());

    expect(container.textContent).toContain('não possui transação online');
    expect(container.textContent).toContain('deve ser feita manualmente');
    expect(onCancelOrder).not.toHaveBeenCalled();
  });

  it('trata a rejeição da API e mostra o erro sem deixar a Promise escapar', async () => {
    const onCancelOrder = vi.fn().mockRejectedValue({
      response: { data: { error: 'O provedor recusou o estorno.' } },
    });
    renderOrders(onCancelOrder);

    await act(async () => buttonByLabel(container, 'Cancelar e estornar o pedido #301').click());
    const confirmButton = container.querySelector(
      '[role="dialog"] button[type="submit"]',
    ) as HTMLButtonElement;
    await act(async () => {
      confirmButton.click();
      await Promise.resolve();
    });

    expect(onCancelOrder).toHaveBeenCalledWith(301);
    expect(toast.error).toHaveBeenCalledWith('O provedor recusou o estorno.');
  });
});
