import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  getTracking: vi.fn(),
  rate: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: '601' }),
  useNavigate: () => mocks.navigate,
}));
vi.mock('../../Services/ordersService', () => ({
  default: {
    getDeliveryTracking: mocks.getTracking,
    rateDeliveredOrder: mocks.rate,
  },
  getGuestOrderTrackingToken: () => '',
}));

import DeliveredOrderPage from './DeliveredOrderPage';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  mocks.getTracking.mockResolvedValue({
    order: {
      id: 601,
      restaurantId: 7,
      status: 'ENTREGUE',
      deliveryConfirmedAt: '2026-09-30T20:00:00.000Z',
      total: 62.7,
      itemsSubtotal: 57.7,
      deliveryFeeAmount: 5,
      paymentMethod: 'PIX',
      restaurant: { id: 7, name: 'North Pizza', slug: 'north-pizza', logo: '/logo.png' },
      assignedCourier: { name: 'Eduardo Silva', phone: '85999999999', avatar: null },
      items: [
        { id: 1, quantity: 1, price: 34.9, product: { id: 10, name: 'Smash Bacon' } },
        { id: 2, quantity: 1, price: 22.8, product: { id: 11, name: 'Batata + Coca-Cola' } },
      ],
      paymentAttempts: [],
    },
    locations: [],
  });
  mocks.rate.mockResolvedValue({ deliveryRating: 5 });
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.clearAllMocks();
});

describe('DeliveredOrderPage', () => {
  it('exibe somente dados reais do backend e salva a avaliação', async () => {
    await act(async () => root.render(<DeliveredOrderPage />));
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });

    expect(container.textContent).toContain('North Pizza');
    expect(container.textContent).toContain('Smash Bacon');
    expect(container.textContent).toContain('Eduardo Silva');
    expect(container.textContent).toContain('R$ 62,70');

    const fiveStars = container.querySelector(
      'button[aria-label="Avaliar com 5 estrelas"]',
    ) as HTMLButtonElement;
    await act(async () => fiveStars.click());
    expect(mocks.rate).toHaveBeenCalledWith(601, 5);
  });

  it('não abre como concluído se o recebimento ainda não foi confirmado', async () => {
    mocks.getTracking.mockResolvedValueOnce({
      order: { id: 601, restaurantId: 7, status: 'ENTREGUE', deliveryConfirmedAt: null },
      locations: [],
    });
    await act(async () => root.render(<DeliveredOrderPage />));
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(container.textContent).toContain('ainda não possui uma entrega confirmada');
  });
});
