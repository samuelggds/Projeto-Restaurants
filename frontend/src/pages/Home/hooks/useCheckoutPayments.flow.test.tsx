import { act, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ordersService from '../../../Services/ordersService';
import { useCheckoutPayments } from './useCheckoutPayments';

vi.mock('../../../Services/ordersService', () => ({
  default: {
    createOrder: vi.fn(),
    createPixPayment: vi.fn(),
    createCardCheckout: vi.fn(),
    getPixPaymentStatus: vi.fn(),
    confirmPixPayment: vi.fn(),
    getCardPaymentStatus: vi.fn(),
  },
}));

vi.mock('../../../Services/customerPaymentMethodService', () => ({
  default: { list: vi.fn().mockResolvedValue([]) },
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

type CheckoutPayments = ReturnType<typeof useCheckoutPayments>;
type CheckoutPaymentsRef = { current: CheckoutPayments | null };
const onPaymentConfirmed = vi.fn();

function Probe({ paymentsRef }: { paymentsRef: CheckoutPaymentsRef }) {
  const checkoutPayments = useCheckoutPayments({
    restaurantId: 7,
    pixProvider: 'MERCADO_PAGO',
    cartTotal: 49.9,
    notify: vi.fn(),
    onPurchased: vi.fn(),
    onPaymentConfirmed,
    onClearCart: vi.fn(),
    onCloseCart: vi.fn(),
  });

  useEffect(() => {
    paymentsRef.current = checkoutPayments;
    return () => {
      paymentsRef.current = null;
    };
  }, [checkoutPayments, paymentsRef]);

  return <output>{checkoutPayments.pixPaymentStatus}</output>;
}

describe('useCheckoutPayments confirmação canônica do Pix', () => {
  let container: HTMLDivElement;
  let root: Root;
  let checkoutPayments: CheckoutPaymentsRef;

  beforeEach(async () => {
    vi.clearAllMocks();
    onPaymentConfirmed.mockReset();
    vi.mocked(ordersService.getPixPaymentStatus).mockReset();
    vi.mocked(ordersService.confirmPixPayment).mockReset();
    checkoutPayments = { current: null };
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    vi.mocked(ordersService.createPixPayment).mockResolvedValue({
      orderId: 91,
      totalAmount: 49.9,
      paymentId: 'pix-provider-91',
      provider: 'MERCADO_PAGO',
      qrCode: 'pix-code-91',
      qrCodeBase64: null,
      requiresStatusCheck: false,
    });
    await act(async () => root.render(<Probe paymentsRef={checkoutPayments} />));
    await act(async () => {
      await checkoutPayments.current?.executePayment({}, 'pix', false, 'PIX');
    });
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('não anuncia pago quando o provedor aprova mas o pedido canônico continua pendente', async () => {
    vi.mocked(ordersService.getPixPaymentStatus).mockResolvedValue({ isApproved: true });
    vi.mocked(ordersService.confirmPixPayment).mockResolvedValue({ paid: false });

    await act(async () => {
      await checkoutPayments.current?.verifyPixPayment();
    });

    expect(container.textContent).toBe('ERROR');
    expect(onPaymentConfirmed).not.toHaveBeenCalled();
  });

  it('mostra pago somente depois que a confirmação final devolve paid verdadeiro', async () => {
    vi.mocked(ordersService.getPixPaymentStatus).mockResolvedValue({ isApproved: true });
    vi.mocked(ordersService.confirmPixPayment).mockResolvedValue({ paid: true });

    await act(async () => {
      await checkoutPayments.current?.verifyPixPayment();
    });

    expect(container.textContent).toBe('PAID');
    expect(onPaymentConfirmed).toHaveBeenCalledTimes(1);
    expect(ordersService.confirmPixPayment).toHaveBeenCalledWith({
      orderId: 91,
      paymentId: 'pix-provider-91',
      restaurantId: 7,
    });
  });

  it.each([
    ['rejected', 'FAILED'],
    ['DECLINED', 'FAILED'],
    ['cancelled', 'CANCELED'],
    ['EXPIRED', 'EXPIRED'],
    ['refunded', 'REFUNDED'],
  ])('encerra o Pix %s sem confirmar ou continuar consultando', async (status, outcome) => {
    vi.mocked(ordersService.getPixPaymentStatus).mockResolvedValue({ isApproved: false, status });
    await act(async () => {
      await checkoutPayments.current?.verifyPixPayment();
    });
    expect(container.textContent).toBe(outcome);
    await act(async () => {
      await checkoutPayments.current?.verifyPixPayment();
    });
    expect(ordersService.getPixPaymentStatus).toHaveBeenCalledTimes(1);
    expect(ordersService.confirmPixPayment).not.toHaveBeenCalled();
    expect(onPaymentConfirmed).not.toHaveBeenCalled();
  });

  it('não transforma falha de conexão em recusa e permite nova consulta', async () => {
    vi.mocked(ordersService.getPixPaymentStatus)
      .mockRejectedValueOnce(new Error('Conexão indisponível'))
      .mockResolvedValueOnce({ isApproved: false, status: 'pending' });
    await act(async () => {
      await checkoutPayments.current?.verifyPixPayment();
    });
    expect(container.textContent).toBe('ERROR');
    await act(async () => {
      await checkoutPayments.current?.verifyPixPayment();
    });
    expect(container.textContent).toBe('PENDING');
    expect(onPaymentConfirmed).not.toHaveBeenCalled();
  });

  it('não confirma resposta que pertence a outro restaurante', async () => {
    vi.mocked(ordersService.getPixPaymentStatus).mockResolvedValue({
      isApproved: true,
      sameRestaurant: false,
    });
    await act(async () => {
      await checkoutPayments.current?.verifyPixPayment();
    });
    expect(container.textContent).toBe('ERROR');
    expect(ordersService.confirmPixPayment).not.toHaveBeenCalled();
  });

  it('ignora resposta atrasada depois de fechar a tela do Pix', async () => {
    let resolveStatus!: (value: { isApproved: boolean }) => void;
    vi.mocked(ordersService.getPixPaymentStatus).mockReturnValue(
      new Promise((resolve) => {
        resolveStatus = resolve;
      }),
    );
    let check!: Promise<unknown>;
    await act(async () => {
      check = checkoutPayments.current!.verifyPixPayment();
    });
    await act(async () => {
      checkoutPayments.current!.clearPixPayment();
    });
    await act(async () => {
      resolveStatus({ isApproved: true });
      await check;
    });
    expect(container.textContent).toBe('WAITING');
    expect(checkoutPayments.current?.pixPaymentData).toBeNull();
    expect(ordersService.confirmPixPayment).not.toHaveBeenCalled();
  });

  it('interrompe o polling ao receber resultado terminal', async () => {
    vi.useFakeTimers();
    vi.mocked(ordersService.getPixPaymentStatus).mockResolvedValue({
      isApproved: false,
      status: 'rejected',
    });
    await act(async () => {
      checkoutPayments.current!.setPixPaymentData(
        (value) => value && { ...value, requiresStatusCheck: true },
      );
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(container.textContent).toBe('FAILED');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20_000);
    });
    expect(ordersService.getPixPaymentStatus).toHaveBeenCalledTimes(1);
  });

  it('mantém o Pix pendente visível enquanto consulta em segundo plano', async () => {
    vi.useFakeTimers();
    let finishPoll!: (value: { isApproved: boolean; status: string }) => void;
    vi.mocked(ordersService.getPixPaymentStatus)
      .mockResolvedValueOnce({ isApproved: false, status: 'pending' })
      .mockReturnValueOnce(
        new Promise((resolve) => {
          finishPoll = resolve;
        }),
      );
    await act(async () => {
      checkoutPayments.current!.setPixPaymentData(
        (value) => value && { ...value, requiresStatusCheck: true },
      );
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(container.textContent).toBe('PENDING');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });
    expect(ordersService.getPixPaymentStatus).toHaveBeenCalledTimes(2);
    expect(container.textContent).toBe('PENDING');
    await act(async () => {
      finishPoll({ isApproved: false, status: 'pending' });
    });
    expect(container.textContent).toBe('PENDING');
    expect(ordersService.confirmPixPayment).not.toHaveBeenCalled();
  });

  it('abre resultado para cartão já pago mesmo sem URL de checkout e preserva sucesso se atualização auxiliar falhar', async () => {
    vi.mocked(ordersService.createCardCheckout).mockResolvedValue({
      paid: true,
      orderId: 92,
      totalAmount: 49.9,
    });
    onPaymentConfirmed.mockRejectedValueOnce(new Error('Atualização indisponível'));
    await act(async () => {
      expect(await checkoutPayments.current?.executePayment({}, 'card', false, 'CARTAO')).toBe(
        true,
      );
    });
    expect(checkoutPayments.current?.paymentResult).toMatchObject({
      restaurantId: 7,
      status: 'PAID',
      method: 'Cartão',
      orderId: 92,
      total: 49.9,
    });
    await act(async () => {
      checkoutPayments.current?.clearPaymentResult();
    });
    expect(checkoutPayments.current?.paymentResult).toBeNull();
  });
});
