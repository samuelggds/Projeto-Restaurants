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

function Probe() {
  const payment = useCardPaymentReturn({
    restaurantId: 7,
    orderPublicId: '123e4567-e89b-42d3-a456-426614174001',
    orderType: 'DELIVERY',
    providerReturnStatus: 'success',
    onPaymentConfirmed,
  });
  return <output>{payment.status}</output>;
}

describe('useCardPaymentReturn', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
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
});
