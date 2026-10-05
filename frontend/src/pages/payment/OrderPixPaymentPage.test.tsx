import { act, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ordersService from '../../Services/ordersService';
import restaurantSettingsService from '../../Services/restaurantSettingsService';
import OrderPixPaymentPage from './OrderPixPaymentPage';

vi.mock('../../Services/ordersService', () => ({ default: {
  recoverPayment: vi.fn(), getCardPaymentStatus: vi.fn(), retryCardPayment: vi.fn(),
} }));
vi.mock('../../Services/restaurantSettingsService', () => ({ default: { getPublicSettings: vi.fn() } }));
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({ restaurantSlug: 'restaurant-test', orderPublicId: 'order-test' }),
}));
vi.mock('../../shared/tenant/useCustomDomainTenant', () => ({
  useResolvedTenantSlug: () => 'restaurant-test',
}));
vi.mock('../Cart/components/PixPaymentPanel', () => ({ default: () => null }));
vi.mock('../Home/components/OnlineCardPaymentForm', () => ({
  OnlineCardPaymentForm: ({ onPreparerChange }: {
    onPreparerChange: (prepare: () => Promise<Record<string, unknown>>) => void;
  }) => {
    useEffect(() => {
      onPreparerChange(async () => ({ cardToken: 'test-token' }));
    }, [onPreparerChange]);
    return null;
  },
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const publicId = '123e4567-e89b-42d3-a456-426614174002';
const declined = {
  orderId: 1, orderPublicId: 'order-test', restaurantId: 7, totalAmount: 30,
  paid: false, paymentMethod: 'CARTAO',
  paymentAttempt: {
    publicId, status: 'DECLINED', providerStatusDetail: 'high_risk',
    failureMessage: 'private provider text buyer@example.test',
  },
};

describe('OrderPixPaymentPage card decline diagnostics', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.mocked(ordersService.recoverPayment).mockResolvedValue(declined);
    vi.mocked(ordersService.getCardPaymentStatus).mockResolvedValue(declined);
    vi.mocked(restaurantSettingsService.getPublicSettings).mockResolvedValue({});
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.useRealTimers();
  });

  const load = async () => {
    await act(async () => root.render(<OrderPixPaymentPage />));
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
  };

  it('explica a recusa recuperada e mostra referência pública sem mensagem bruta', async () => {
    await load();
    expect(container.textContent).toContain('análise de segurança');
    expect(container.textContent).toContain('O motivo específico não foi informado');
    expect(container.textContent).toContain(`Referência para suporte: ${publicId}`);
    expect(container.textContent).not.toContain('buyer@example.test');
    expect(ordersService.retryCardPayment).not.toHaveBeenCalled();
  });

  it('não mostra recusa antiga quando o pedido recuperado está pago', async () => {
    vi.mocked(ordersService.recoverPayment).mockResolvedValue({ ...declined, paid: true });
    await load();
    expect(container.textContent).toContain('Pagamento confirmado');
    expect(container.textContent).not.toContain('análise de segurança');
    expect(container.textContent).not.toContain(publicId);
    expect(ordersService.getCardPaymentStatus).not.toHaveBeenCalled();
  });

  it('troca motivo e referência quando uma nova tentativa é recusada', async () => {
    const nextPublicId = '123e4567-e89b-42d3-a456-426614174003';
    vi.mocked(ordersService.retryCardPayment).mockRejectedValue({ response: { data: {
      code: 'CARD_PAYMENT_FAILED', error: 'private provider text buyer@example.test',
      paymentAttemptId: nextPublicId,
      paymentError: { statusDetail: 'insufficient_amount', providerRequestId: 'private-request-id' },
    } } });
    await load();
    const retry = [...container.querySelectorAll('button')].find((button) =>
      button.textContent === 'Tentar pagamento novamente');
    expect(retry).toBeTruthy();
    await act(async () => retry?.click());
    expect(container.textContent).toContain('saldo ou limite insuficiente');
    expect(container.textContent).toContain(nextPublicId);
    expect(container.textContent).not.toContain(publicId);
    expect(container.textContent).not.toContain('análise de segurança');
    expect(container.textContent).not.toContain('buyer@example.test');
    expect(container.textContent).not.toContain('private-request-id');
    expect(ordersService.retryCardPayment).toHaveBeenCalledTimes(1);
  });
});
