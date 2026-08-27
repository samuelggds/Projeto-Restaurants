import { useCallback, useEffect, useRef, useState } from 'react';
import ordersService from '../../../Services/ordersService';
import { connectTableSessionSocket } from '../../../Services/socketService';
import { getTableOrderNotice, type TableOrderNotice } from '../domain/tableOrderNotice';

type Options = {
  enabled: boolean;
  sessionKey?: number | string | null;
  sessionToken?: string | null;
};

export function useTableOrderNotice({ enabled, sessionKey, sessionToken }: Options) {
  const requestKey = enabled && sessionToken ? `table:${String(sessionKey || 'current')}` : '';
  const requestKeyRef = useRef(requestKey);
  const [state, setState] = useState<{ requestKey: string; order: TableOrderNotice | null }>({
    requestKey: '',
    order: null,
  });

  useEffect(() => {
    requestKeyRef.current = requestKey;
  }, [requestKey]);

  const refresh = useCallback(async () => {
    if (!requestKey) {
      setState({ requestKey: '', order: null });
      return;
    }

    const requestedKey = requestKey;
    try {
      const order = await ordersService.getCurrentTableOrder();
      if (requestKeyRef.current === requestedKey) {
        setState({ requestKey: requestedKey, order: getTableOrderNotice(order) });
      }
    } catch {
      if (requestKeyRef.current === requestedKey) {
        setState({ requestKey: requestedKey, order: null });
      }
    }
  }, [requestKey]);

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => void refresh(), 0);
    if (!requestKey) return () => window.clearTimeout(initialRefresh);

    const intervalId = window.setInterval(() => void refresh(), 10_000);
    const refreshWhenFocused = () => void refresh();
    window.addEventListener('focus', refreshWhenFocused);

    return () => {
      window.clearTimeout(initialRefresh);
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshWhenFocused);
    };
  }, [refresh, requestKey]);

  useEffect(() => {
    if (!requestKey || !sessionToken) return undefined;

    const socket = connectTableSessionSocket(sessionToken, 'home-table-order-status');
    if (!socket) return undefined;

    const refreshTableOrder = (payload?: { type?: string }) => {
      if (payload?.type && String(payload.type).toUpperCase() !== 'MESA') return;
      void refresh();
    };

    socket.on('new-order', refreshTableOrder);
    socket.on('order:status-changed', refreshTableOrder);

    return () => {
      // O socket é compartilhado com a sessão e a conta da mesa. Removemos apenas
      // os listeners deste recurso para não interromper os demais painéis.
      socket.off('new-order', refreshTableOrder);
      socket.off('order:status-changed', refreshTableOrder);
    };
  }, [refresh, requestKey, sessionToken]);

  return {
    tableOrder: state.requestKey === requestKey ? state.order : null,
    refreshTableOrder: refresh,
  };
}
