import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ordersService from '../../../Services/ordersService';
import type { CartItem } from './useCart';
import {
  isDeliveryAddressReadyForQuote,
  normalizeOrderQuote,
  ORDER_QUOTE_DEBOUNCE_MS,
  useOrderQuote,
} from './useOrderQuote';

vi.mock('../../../Services/ordersService', () => ({
  default: {
    quoteOrder: vi.fn(),
  },
}));

const cart: CartItem[] = [
  {
    productId: '10',
    name: 'Pizza teste',
    price: 25,
    image: '',
    quantity: 1,
    selectedOptionIds: [],
    selectedOptions: [],
    ingredientIds: [],
    observation: '',
  },
];

const completeAddress = {
  address: 'Rua das Flores',
  number: '123',
  district: 'Centro',
  city: 'Fortaleza',
  state: 'CE',
  zipCode: '60000-000',
  complement: '',
};

function HookProbe({
  restaurantId = 7,
  address = completeAddress,
  couponRedemptionId = null,
}: {
  restaurantId?: number | null;
  address?: typeof completeAddress;
  couponRedemptionId?: number | null;
}) {
  useOrderQuote({
    restaurantId,
    type: 'DELIVERY',
    cart,
    deliveryAddress: address,
    couponRedemptionId,
  });
  return null;
}

describe('useOrderQuote', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(ordersService.quoteOrder).mockReset();
    vi.mocked(ordersService.quoteOrder).mockResolvedValue({
      itemsSubtotal: 25,
      productDiscountTotal: 0,
      couponDiscount: 0,
      deliveryFeeAmount: 0,
      deliveryDistanceMeters: null,
      deliveryFeeFallbackApplied: false,
      total: 25,
      couponCode: null,
    });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.useRealTimers();
  });

  it('normaliza a composição de valores devolvida pelo servidor', () => {
    expect(
      normalizeOrderQuote({
        itemsSubtotal: '80.00',
        productDiscountTotal: '10',
        couponDiscount: 7,
        deliveryFeeAmount: 5,
        deliveryDistanceMeters: 4200,
        deliveryFeeFallbackApplied: true,
        total: '68',
        couponCode: 'FIEL7',
      }),
    ).toEqual({
      itemsSubtotal: 80,
      productDiscountTotal: 10,
      couponDiscount: 7,
      deliveryFeeAmount: 5,
      deliveryDistanceMeters: 4200,
      deliveryFeeFallbackApplied: true,
      total: 68,
      couponCode: 'FIEL7',
    });
  });

  it('só considera delivery pronto para cotação com endereço completo', () => {
    expect(isDeliveryAddressReadyForQuote(completeAddress)).toBe(true);
    expect(isDeliveryAddressReadyForQuote({ ...completeAddress, number: '' })).toBe(false);
    expect(isDeliveryAddressReadyForQuote({ ...completeAddress, zipCode: '60000' })).toBe(false);
  });

  it('não chama quote enquanto o endereço de delivery estiver incompleto', async () => {
    await act(async () => {
      root.render(<HookProbe address={{ ...completeAddress, number: '' }} />);
      await vi.advanceTimersByTimeAsync(ORDER_QUOTE_DEBOUNCE_MS * 2);
    });
    expect(ordersService.quoteOrder).not.toHaveBeenCalled();
  });

  it('permite validar cupom selecionado antes de concluir o endereço de delivery', async () => {
    await act(async () => {
      root.render(
        <HookProbe
          address={{ ...completeAddress, number: '' }}
          couponRedemptionId={71}
        />,
      );
      await Promise.resolve();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ORDER_QUOTE_DEBOUNCE_MS);
      await Promise.resolve();
    });

    expect(ordersService.quoteOrder).toHaveBeenCalledTimes(1);
    expect(vi.mocked(ordersService.quoteOrder).mock.calls[0]?.[0]).toMatchObject({
      restaurantId: 7,
      couponRedemptionId: 71,
    });
  });

  it('faz uma única cotação depois que a digitação estabiliza', async () => {
    await act(async () => {
      root.render(<HookProbe address={{ ...completeAddress, number: '1' }} />);
      await Promise.resolve();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
      root.render(<HookProbe address={{ ...completeAddress, number: '12' }} />);
      await Promise.resolve();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
      root.render(<HookProbe address={{ ...completeAddress, number: '123' }} />);
      await Promise.resolve();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ORDER_QUOTE_DEBOUNCE_MS - 1);
    });

    expect(ordersService.quoteOrder).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
      await Promise.resolve();
    });

    expect(ordersService.quoteOrder).toHaveBeenCalledTimes(1);
  });

  it('não refaz quote ao digitar somente o complemento', async () => {
    await act(async () => {
      root.render(<HookProbe />);
      await Promise.resolve();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ORDER_QUOTE_DEBOUNCE_MS);
      await Promise.resolve();
    });
    expect(ordersService.quoteOrder).toHaveBeenCalledTimes(1);

    await act(async () => {
      root.render(<HookProbe address={{ ...completeAddress, complement: 'Apto 10' }} />);
      await vi.advanceTimersByTimeAsync(ORDER_QUOTE_DEBOUNCE_MS * 2);
    });

    expect(ordersService.quoteOrder).toHaveBeenCalledTimes(1);
  });

  it('mantém a cotação isolada pelo restaurantId', async () => {
    await act(async () => {
      root.render(<HookProbe restaurantId={7} />);
      await Promise.resolve();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ORDER_QUOTE_DEBOUNCE_MS);
      await Promise.resolve();
    });
    await act(async () => {
      root.render(<HookProbe restaurantId={8} />);
      await Promise.resolve();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ORDER_QUOTE_DEBOUNCE_MS);
      await Promise.resolve();
    });

    expect(ordersService.quoteOrder).toHaveBeenCalledTimes(2);
    expect(vi.mocked(ordersService.quoteOrder).mock.calls[0]?.[0]).toMatchObject({ restaurantId: 7 });
    expect(vi.mocked(ordersService.quoteOrder).mock.calls[1]?.[0]).toMatchObject({ restaurantId: 8 });
  });
});
