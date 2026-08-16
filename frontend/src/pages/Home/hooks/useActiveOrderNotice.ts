import { useCallback, useEffect, useRef, useState } from 'react';
import ordersService from '../../../Services/ordersService';
import { getActiveOrderNotice, type ActiveOrderNotice } from '../domain/activeOrderNotice';

function readOrders(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload as Record<string, unknown>[];

  const value = payload as { orders?: unknown } | null;
  return Array.isArray(value?.orders) ? (value.orders as Record<string, unknown>[]) : [];
}

export function useActiveOrderNotice(customerId: number | string | null | undefined) {
  const [noticeState, setNoticeState] = useState<{
    customerKey: string;
    order: ActiveOrderNotice | null;
  }>({ customerKey: '', order: null });
  const customerKey = customerId == null ? '' : String(customerId);
  const customerKeyRef = useRef(customerKey);

  useEffect(() => {
    customerKeyRef.current = customerKey;
  }, [customerKey]);

  const refresh = useCallback(async () => {
    if (!customerKey) {
      setNoticeState({ customerKey: '', order: null });
      return;
    }

    const requestedCustomerKey = customerKey;
    try {
      const orders = await ordersService.listMyOrders();
      if (customerKeyRef.current === requestedCustomerKey) {
        setNoticeState({
          customerKey: requestedCustomerKey,
          order: getActiveOrderNotice(readOrders(orders)),
        });
      }
    } catch {
      if (customerKeyRef.current === requestedCustomerKey) {
        setNoticeState({ customerKey: requestedCustomerKey, order: null });
      }
    }
  }, [customerKey]);

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => void refresh(), 0);
    if (!customerKey) {
      return () => window.clearTimeout(initialRefresh);
    }

    const interval = window.setInterval(() => void refresh(), 10_000);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearTimeout(initialRefresh);
      window.clearInterval(interval);
      window.removeEventListener('focus', refresh);
    };
  }, [customerKey, refresh]);

  return {
    activeOrder: noticeState.customerKey === customerKey ? noticeState.order : null,
    refreshActiveOrder: refresh,
  };
}
