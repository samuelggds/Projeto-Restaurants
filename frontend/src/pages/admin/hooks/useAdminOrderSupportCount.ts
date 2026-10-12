import { useCallback, useEffect, useRef, useState } from 'react';
import ordersService from '../../../Services/ordersService';
import { acquireSocket } from '../../../Services/socketService';
import {
  getAccessToken,
  getAuthSessionRevision,
} from '../../../modules/auth/session/authSession';

const REFRESH_INTERVAL_MS = 12_000;

export function formatAdminSupportBadge(count: number) {
  return count > 99 ? '99+' : String(Math.max(0, count));
}

/**
 * The backend's OPEN issue filter and total are authoritative and tenant-scoped.
 * Read a single row only: sidebar counters must never download customer conversations.
 */
export function useAdminOrderSupportCount() {
  const [count, setCount] = useState<number | null>(null);
  const [syncError, setSyncError] = useState(false);
  const mounted = useRef(false);
  const inFlight = useRef(false);
  const queued = useRef(false);

  const refresh = useCallback(async () => {
    if (!mounted.current) return;
    if (inFlight.current) {
      queued.current = true;
      return;
    }
    inFlight.current = true;
    const revision = getAuthSessionRevision();
    try {
      const page = await ordersService.listRestaurantOrdersPage({
        issueState: 'OPEN',
        limit: 1,
      });
      if (mounted.current && revision === getAuthSessionRevision()) {
        setCount(page.total);
        setSyncError(false);
      }
    } catch {
      // Preserve the last confirmed count rather than silently claiming zero.
      if (mounted.current && revision === getAuthSessionRevision()) setSyncError(true);
    } finally {
      inFlight.current = false;
      if (queued.current && mounted.current) {
        queued.current = false;
        void refresh();
      }
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    const onVisible = () => {
      if (document.visibilityState !== 'hidden') void refresh();
    };
    const interval = window.setInterval(onVisible, REFRESH_INTERVAL_MS);
    window.addEventListener('focus', onVisible);
    document.addEventListener('visibilitychange', onVisible);

    const token = getAccessToken();
    const connection = token ? acquireSocket(token, 'admin-order-support-count') : null;
    const invalidated = () => void refresh();
    for (const event of ['order:issue-reported', 'order:issue-message', 'order:issue-resolved']) {
      connection?.socket.on(event, invalidated);
    }
    return () => {
      mounted.current = false;
      queued.current = false;
      window.clearInterval(interval);
      window.removeEventListener('focus', onVisible);
      document.removeEventListener('visibilitychange', onVisible);
      for (const event of ['order:issue-reported', 'order:issue-message', 'order:issue-resolved']) {
        connection?.socket.off(event, invalidated);
      }
      connection?.release();
    };
  }, [refresh]);

  return { count, syncError, refresh };
}
