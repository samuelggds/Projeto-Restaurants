import { useEffect, useMemo, useState } from 'react';
import ordersService from '../../../Services/ordersService';
import { buildOrderQuotePayload, type OrderType } from '../domain/checkout';
import type { CartItem } from './useCart';

export type OrderQuote = {
  itemsSubtotal: number;
  productDiscountTotal: number;
  couponDiscount: number;
  deliveryFeeAmount: number;
  total: number;
  couponCode: string | null;
};

function money(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

export function normalizeOrderQuote(payload: unknown): OrderQuote {
  const root =
    payload && typeof payload === 'object' && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : {};
  const quote =
    root.quote && typeof root.quote === 'object'
      ? (root.quote as Record<string, unknown>)
      : root;
  return {
    itemsSubtotal: money(quote.itemsSubtotal),
    productDiscountTotal: money(quote.productDiscountTotal),
    couponDiscount: money(quote.couponDiscount),
    deliveryFeeAmount: money(quote.deliveryFeeAmount),
    total: money(quote.total),
    couponCode: quote.couponCode ? String(quote.couponCode) : null,
  };
}

type Options = {
  restaurantId: number | null;
  type: OrderType;
  cart: CartItem[];
  couponRedemptionId: number | null;
};

export function useOrderQuote({ restaurantId, type, cart, couponRedemptionId }: Options) {
  const [quote, setQuote] = useState<OrderQuote | null>(null);
  const [resolvedKey, setResolvedKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const requestKey = useMemo(
    () =>
      JSON.stringify({
        restaurantId,
        type,
        couponRedemptionId,
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          selectedOptionIds: item.selectedOptionIds,
          selectedOptions: item.selectedOptions,
        })),
      }),
    [cart, couponRedemptionId, restaurantId, type],
  );

  useEffect(() => {
    if (!restaurantId || cart.length === 0) {
      return;
    }

    let active = true;
    const timeout = window.setTimeout(async () => {
      if (!active) return;
      setLoading(true);
      setError(false);
      try {
        const response = await ordersService.quoteOrder(
          buildOrderQuotePayload({ restaurantId, type, cart, couponRedemptionId }),
        );
        if (active) {
          setQuote(normalizeOrderQuote(response));
          setResolvedKey(requestKey);
        }
      } catch {
        if (active) {
          setQuote(null);
          setError(true);
        }
      } finally {
        if (active) setLoading(false);
      }
    }, 180);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [cart, couponRedemptionId, requestKey, restaurantId, type]);

  const enabled = Boolean(restaurantId && cart.length);
  return {
    quote: enabled && resolvedKey === requestKey ? quote : null,
    loading: enabled ? loading : false,
    error: enabled ? error : false,
  };
}
