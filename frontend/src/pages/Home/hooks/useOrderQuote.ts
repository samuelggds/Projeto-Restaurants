import { useEffect, useMemo, useState } from 'react';
import ordersService from '../../../Services/ordersService';
import { buildOrderQuotePayload, type OrderType } from '../domain/checkout';
import type { DeliveryAddress } from './useDeliveryAddress';
import type { CartItem } from './useCart';

export const ORDER_QUOTE_DEBOUNCE_MS = 700;

export type OrderQuote = {
  itemsSubtotal: number;
  productDiscountTotal: number;
  couponDiscount: number;
  deliveryFeeAmount: number;
  deliveryDistanceMeters: number | null;
  total: number;
  couponCode: string | null;
};

function money(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function optionalNonNegativeNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function isDeliveryAddressReadyForQuote(address?: DeliveryAddress) {
  if (!address) return false;
  const zipCode = String(address.zipCode || '').replace(/\D/g, '');
  return Boolean(
    String(address.address || '').trim().length >= 3 &&
      /^\d+[A-Za-z]?$/.test(String(address.number || '').trim()) &&
      String(address.district || '').trim().length >= 2 &&
      String(address.city || '').trim().length >= 2 &&
      /^[A-Za-z]{2}$/.test(String(address.state || '').trim()) &&
      zipCode.length === 8,
  );
}

export function normalizeOrderQuote(payload: unknown): OrderQuote {
  const root =
    payload && typeof payload === 'object' && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : {};
  const quote =
    root.quote && typeof root.quote === 'object' ? (root.quote as Record<string, unknown>) : root;
  return {
    itemsSubtotal: money(quote.itemsSubtotal),
    productDiscountTotal: money(quote.productDiscountTotal),
    couponDiscount: money(quote.couponDiscount),
    deliveryFeeAmount: money(quote.deliveryFeeAmount),
    deliveryDistanceMeters: optionalNonNegativeNumber(quote.deliveryDistanceMeters),
    total: money(quote.total),
    couponCode: quote.couponCode ? String(quote.couponCode) : null,
  };
}

type Options = {
  restaurantId: number | null;
  type: OrderType;
  cart: CartItem[];
  deliveryAddress?: DeliveryAddress;
  couponRedemptionId: number | null;
};

export function useOrderQuote({
  restaurantId,
  type,
  cart,
  deliveryAddress,
  couponRedemptionId,
}: Options) {
  const [quote, setQuote] = useState<OrderQuote | null>(null);
  const [resolvedKey, setResolvedKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const quotePayload = useMemo(
    () =>
      restaurantId
        ? buildOrderQuotePayload({
            restaurantId,
            type,
            cart,
            deliveryAddress,
            couponRedemptionId,
          })
        : null,
    [
      cart,
      couponRedemptionId,
      deliveryAddress?.address,
      deliveryAddress?.number,
      deliveryAddress?.district,
      deliveryAddress?.city,
      deliveryAddress?.state,
      restaurantId,
      type,
    ],
  );
  const requestKey = useMemo(() => JSON.stringify(quotePayload), [quotePayload]);
  const enabled = Boolean(
    restaurantId &&
      cart.length > 0 &&
      (type !== 'DELIVERY' || isDeliveryAddressReadyForQuote(deliveryAddress)),
  );

  useEffect(() => {
    if (!enabled || !quotePayload) {
      setLoading(false);
      setError(false);
      return;
    }

    let active = true;
    const timeout = window.setTimeout(async () => {
      if (!active) return;
      setLoading(true);
      setError(false);
      try {
        const response = await ordersService.quoteOrder(quotePayload);
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
    }, ORDER_QUOTE_DEBOUNCE_MS);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [enabled, quotePayload, requestKey]);

  return {
    quote: enabled && resolvedKey === requestKey ? quote : null,
    loading: enabled ? loading : false,
    error: enabled ? error : false,
  };
}
