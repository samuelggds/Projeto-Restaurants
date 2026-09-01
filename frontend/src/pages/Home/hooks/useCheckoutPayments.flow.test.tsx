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
  });
});
