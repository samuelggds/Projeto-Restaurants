import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HomePaymentOutcome } from './HomePaymentOutcome';
import { homeMockData } from '../data';

vi.mock('./CardPaymentReturnPanel', () => ({
  CardPaymentReturnPanel: ({ onClose }: { onClose: () => void }) => (
    <button type="button" onClick={onClose}>Voltar ao pagamento</button>
  ),
}));

vi.mock('../../Cart/components/PixPaymentPanel', () => ({ default: () => null }));
vi.mock('../../../components/payment/PaymentResultView', () => ({ PaymentResultView: () => null }));
vi.mock('./UncertainPaymentResult', () => ({ UncertainPaymentResult: () => null }));

describe('HomePaymentOutcome card retry navigation', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it('sends a declined card back to retry the same preserved order', async () => {
    const onRetryCardPayment = vi.fn();
    const onCloseCardPaymentReturn = vi.fn();

    await act(async () => {
      root.render(
        <HomePaymentOutcome
          hasCardPaymentReturn
          cardPaymentReturn={{
            status: 'FAILED',
            error: null,
            providerReturnStatus: 'pending',
            details: {
              orderPublicId: 'order-public-1',
              orderId: 42,
              totalAmount: 30,
            },
            verify: vi.fn(),
          }}
          paymentResult={null}
          pixPaymentData={null}
          pixPaymentStatus="WAITING"
          pixPaymentError={null}
          primaryColor="#ff4b4b"
          homeData={homeMockData}
          restaurantId={7}
          visitor={false}
          onCloseCardPaymentReturn={onCloseCardPaymentReturn}
          onRetryCardPayment={onRetryCardPayment}
          onClearPaymentResult={vi.fn()}
          onVerifyPixPayment={vi.fn()}
          onClearPixPayment={vi.fn()}
          onTrackOrder={vi.fn()}
        />,
      );
    });

    const button = container.querySelector('button');
    await act(async () => button?.click());

    expect(onRetryCardPayment).toHaveBeenCalledWith('order-public-1');
    expect(onCloseCardPaymentReturn).not.toHaveBeenCalled();
  });
});
