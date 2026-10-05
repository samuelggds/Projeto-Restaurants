import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ordersService from '../../../Services/ordersService';
import { useCardPaymentReturn } from './useCardPaymentReturn';

vi.mock('../../../Services/ordersService', () => ({
  default: { getCardPaymentStatus: vi.fn() },
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const onPaymentConfirmed = vi.fn();

function Probe({ restaurantId = 7 }: { restaurantId?: number }) {
  const payment = useCardPaymentReturn({
    restaurantId,
    orderPublicId: '123e4567-e89b-42d3-a456-426614174001',
    orderType: 'DELIVERY',
    providerReturnStatus: 'success',
    onPaymentConfirmed,
  });
  return <output>{payment.status}</output>;
}

function DetailsProbe() {
  const payment = useCardPaymentReturn({
    restaurantId: 7,
    orderPublicId: '123e4567-e89b-42d3-a456-426614174001',
    orderType: 'DELIVERY',
    providerReturnStatus: 'success',
    onPaymentConfirmed,
  });
  return (
    <output>
      {payment.details
        ? `${payment.details.cardPaymentType}:${payment.details.cardBrand}:${payment.details.cardLast4}:${payment.details.challengeUrl || ''}`
        : 'sem-detalhes'}
    </output>
  );
}

function FailureProbe() {
  const payment = useCardPaymentReturn({
    restaurantId: 7,
    orderPublicId: '123e4567-e89b-42d3-a456-426614174001',
    orderType: 'DELIVERY',
    providerReturnStatus: '',
    onPaymentConfirmed,
  });
  return <output>{JSON.stringify(payment.details?.paymentAttempt ?? null)}</output>;
}

describe('useCardPaymentReturn', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.resetAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('não confia no success da URL quando o backend continua pendente', async () => {
    vi.mocked(ordersService.getCardPaymentStatus).mockResolvedValue({
      orderPublicId: '123e4567-e89b-42d3-a456-426614174001',
      status: 'PENDING',
      paid: false,
    });

    await act(async () => root.render(<Probe />));
    await act(async () => new Promise((resolve) => window.setTimeout(resolve, 5)));

    expect(container.textContent).toBe('PENDING');
    expect(onPaymentConfirmed).not.toHaveBeenCalled();
    expect(ordersService.getCardPaymentStatus).toHaveBeenCalledTimes(1);
  });

  it('propaga tipo, bandeira e últimos quatro vindos da tentativa canônica', async () => {
    vi.mocked(ordersService.getCardPaymentStatus).mockResolvedValue({
      status: 'PENDING',
      paid: false,
      challengeUrl: 'https://auth.mercadopago.com/card/validation?token=challenge',
      paymentAttempt: {
        cardPaymentType: 'debit',
        cardBrand: 'mastercard',
        cardLast4: '4444',
      },
    });

    await act(async () => root.render(<DetailsProbe />));
    await act(async () => new Promise((resolve) => window.setTimeout(resolve, 5)));

    expect(container.textContent).toBe(
      'debit:mastercard:4444:https://auth.mercadopago.com/card/validation?token=challenge',
    );
  });

  it('confirma somente quando o backend devolve paid verdadeiro', async () => {
    vi.mocked(ordersService.getCardPaymentStatus).mockResolvedValue({
      orderPublicId: '123e4567-e89b-42d3-a456-426614174001',
      status: 'PAID',
      paid: true,
    });

    await act(async () => root.render(<Probe />));
    await act(async () => new Promise((resolve) => window.setTimeout(resolve, 5)));

    expect(container.textContent).toBe('PAID');
    expect(onPaymentConfirmed).toHaveBeenCalledTimes(1);
  });

  it('preserva os códigos e a referência pública da recusa canônica', async () => {
    const paymentAttempt = {
      publicId: '123e4567-e89b-42d3-a456-426614174002',
      providerStatusDetail: 'high_risk',
      failureCode: 'card_declined',
    };
    vi.mocked(ordersService.getCardPaymentStatus).mockResolvedValue({
      status: 'FAILED', paid: false, paymentAttempt,
    });
    await act(async () => root.render(<FailureProbe />));
    await act(async () => new Promise((resolve) => window.setTimeout(resolve, 5)));
    expect(JSON.parse(container.textContent || '{}')).toEqual(paymentAttempt);
    expect(onPaymentConfirmed).not.toHaveBeenCalled();
  });

  it('não propaga a última recusa quando o pedido está pago', async () => {
    vi.mocked(ordersService.getCardPaymentStatus).mockResolvedValue({
      status: 'PAID', paid: true,
      paymentAttempt: {
        publicId: '123e4567-e89b-42d3-a456-426614174002',
        providerStatusDetail: 'high_risk', failureCode: 'card_declined',
      },
    });
    await act(async () => root.render(<FailureProbe />));
    await act(async () => new Promise((resolve) => window.setTimeout(resolve, 5)));
    expect(container.textContent).toBe('null');
    expect(onPaymentConfirmed).toHaveBeenCalledTimes(1);
  });

  it('não apresenta sucesso com PAID sem paid verdadeiro', async () => {
    vi.mocked(ordersService.getCardPaymentStatus).mockResolvedValue({
      status: 'PAID',
      paid: false,
    });
    await act(async () => root.render(<Probe />));
    await act(async () => new Promise((resolve) => window.setTimeout(resolve, 5)));
    expect(container.textContent).toBe('PENDING');
    expect(onPaymentConfirmed).not.toHaveBeenCalled();
  });

  it('mostra cancelamento canônico e encerra consultas automáticas', async () => {
    vi.useFakeTimers();
    vi.mocked(ordersService.getCardPaymentStatus).mockResolvedValue({
      status: 'CANCELED',
      paid: false,
    });
    await act(async () => root.render(<Probe />));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(container.textContent).toBe('CANCELED');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20_000);
    });
    expect(ordersService.getCardPaymentStatus).toHaveBeenCalledTimes(1);
    expect(onPaymentConfirmed).not.toHaveBeenCalled();
  });

  it('trata indisponibilidade de consulta como ERROR, sem inventar recusa', async () => {
    vi.mocked(ordersService.getCardPaymentStatus).mockRejectedValueOnce(new Error('Timeout'));
    await act(async () => root.render(<Probe />));
    await act(async () => new Promise((resolve) => window.setTimeout(resolve, 5)));
    expect(container.textContent).toBe('ERROR');
    expect(onPaymentConfirmed).not.toHaveBeenCalled();
  });

  it('consulta em segundo plano sem alternar a tela para verificando a cada intervalo', async () => {
    vi.useFakeTimers();
    let finishPoll!: (value: { status: string; paid: boolean }) => void;
    vi.mocked(ordersService.getCardPaymentStatus)
      .mockResolvedValueOnce({ status: 'PENDING', paid: false })
      .mockReturnValueOnce(
        new Promise((resolve) => {
          finishPoll = resolve;
        }),
      );
    await act(async () => root.render(<Probe />));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(container.textContent).toBe('PENDING');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });
    expect(ordersService.getCardPaymentStatus).toHaveBeenCalledTimes(2);
    expect(container.textContent).toBe('PENDING');
    await act(async () => {
      finishPoll({ status: 'PAID', paid: true });
    });
    expect(container.textContent).toBe('PAID');
    expect(onPaymentConfirmed).toHaveBeenCalledTimes(1);
  });

  it('ignora aprovação atrasada de um restaurante depois de mudar o contexto', async () => {
    let finishFirst!: (value: { status: string; paid: boolean }) => void;
    vi.mocked(ordersService.getCardPaymentStatus)
      .mockReturnValueOnce(
        new Promise((resolve) => {
          finishFirst = resolve;
        }),
      )
      .mockResolvedValueOnce({ status: 'PENDING', paid: false });
    await act(async () => root.render(<Probe />));
    await act(async () => new Promise((resolve) => window.setTimeout(resolve, 5)));
    await act(async () => root.render(<Probe restaurantId={8} />));
    await act(async () => new Promise((resolve) => window.setTimeout(resolve, 5)));
    await act(async () => {
      finishFirst({ status: 'PAID', paid: true });
    });
    expect(container.textContent).toBe('PENDING');
    expect(onPaymentConfirmed).not.toHaveBeenCalled();
    expect(ordersService.getCardPaymentStatus).toHaveBeenLastCalledWith(
      expect.objectContaining({ restaurantId: 8 }),
    );
  });
});
