import { useCallback, useEffect, useRef, useState } from 'react';
import ordersService, {
  clearGuestOrderTrackingAccess,
  getLatestGuestDeliveryOrderId,
} from '../../../Services/ordersService';
import { getActiveOrderNotice, type ActiveOrderNotice } from '../domain/activeOrderNotice';

function readOrders(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload as Record<string, unknown>[];
  const value = payload as { orders?: unknown } | null;
  return Array.isArray(value?.orders) ? (value.orders as Record<string, unknown>[]) : [];
}

function trackingOrder(payload: unknown) {
  const value = payload as { order?: Record<string, unknown> } | null;
  return value?.order && typeof value.order === 'object' ? value.order : null;
}

async function enrichOutForDelivery(notice: ActiveOrderNotice | null) {
  if (!notice || notice.status !== 'SAIU_PARA_ENTREGA') return notice;
  try {
    const tracking = await ordersService.getDeliveryTracking(notice.id);
    const order = trackingOrder(tracking);
    return order ? getActiveOrderNotice([order]) || notice : notice;
  } catch {
    return notice;
  }
}

export function useActiveOrderNotice(customerId: number | string | null | undefined) {
  const [noticeState, setNoticeState] = useState<{
    accessKey: string;
    order: ActiveOrderNotice | null;
  }>({ accessKey: '', order: null });
  const customerKey = customerId == null ? '' : String(customerId);
  const accessKeyRef = useRef('');

  const refresh = useCallback(async () => {
    const guestOrderId = customerKey ? null : getLatestGuestDeliveryOrderId();
    const requestedAccessKey = customerKey
      ? `customer:${customerKey}`
      : guestOrderId
        ? `guest:${guestOrderId}`
        : '';
    accessKeyRef.current = requestedAccessKey;

    if (!requestedAccessKey) {
      setNoticeState({ accessKey: '', order: null });
      return;
    }

    try {
      let activeOrder: ActiveOrderNotice | null = null;
      if (customerKey) {
        const orders = await ordersService.listMyOrders();
        activeOrder = await enrichOutForDelivery(getActiveOrderNotice(readOrders(orders)));
      } else if (guestOrderId) {
        const tracking = await ordersService.getDeliveryTracking(guestOrderId);
        const order = trackingOrder(tracking);
        const status = String(order?.status || '').toUpperCase();
        if (status === 'ENTREGUE' || status === 'CANCELADO') {
          clearGuestOrderTrackingAccess(guestOrderId);
          activeOrder = null;
        } else {
          activeOrder = order ? getActiveOrderNotice([order]) : null;
        }
      }

      if (accessKeyRef.current === requestedAccessKey) {
        setNoticeState({ accessKey: requestedAccessKey, order: activeOrder });
      }
    } catch {
      if (accessKeyRef.current === requestedAccessKey) {
        setNoticeState({ accessKey: requestedAccessKey, order: null });
      }
    }
  }, [customerKey]);

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => void refresh(), 0);
    const interval = window.setInterval(() => void refresh(), 10_000);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearTimeout(initialRefresh);
      window.clearInterval(interval);
      window.removeEventListener('focus', refresh);
    };
  }, [refresh]);

  const currentGuestOrderId = customerKey ? null : getLatestGuestDeliveryOrderId();
  const currentAccessKey = customerKey
    ? `customer:${customerKey}`
    : currentGuestOrderId
      ? `guest:${currentGuestOrderId}`
      : '';

  return {
    activeOrder: noticeState.accessKey === currentAccessKey ? noticeState.order : null,
    refreshActiveOrder: refresh,
  };
}