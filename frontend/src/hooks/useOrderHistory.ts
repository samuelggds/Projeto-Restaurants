import { useCallback, useEffect, useRef, useState } from 'react';
import ordersService, { type RestaurantOrdersPage, type RestaurantOrdersPageQuery } from '../Services/ordersService';

const initial = { orders: [], total: 0, hasMore: false, nextCursor: null } satisfies RestaurantOrdersPage;

/** Retains loaded history on operational refresh; each request is limited and cursor based. */
export function useOrderHistory({ mine = false, query = {}, refreshSignal }: {
  mine?: boolean; query?: RestaurantOrdersPageQuery; refreshSignal?: unknown;
} = {}) {
  const [page, setPage] = useState<RestaurantOrdersPage>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const request = useRef(0);
  const busy = useRef(false);
  const loadedCursors = useRef<number[]>([]);
  const queryKey = JSON.stringify({ limit: 20, queue: 'HISTORY', ...query });
  const read = useCallback((cursor?: number) => {
    const params = { ...JSON.parse(queryKey), ...(cursor ? { cursor } : {}) };
    return mine ? ordersService.listMyOrders(params) : ordersService.listRestaurantOrdersPage(params);
  }, [mine, queryKey]);

  const refresh = useCallback(async () => {
    const version = ++request.current;
    busy.current = true;
    setLoading(true);
    setError('');
    try {
      // Refresh only the pages the person already requested, preserving their visible history.
      let result = await read();
      const orders = new Map(result.orders.map((order) => [(order as { id: number }).id, order]));
      const nextLoaded: number[] = [];
      for (let index = 0; index < loadedCursors.current.length && result.hasMore; index += 1) {
        nextLoaded.push(result.nextCursor!);
        result = await read(result.nextCursor!);
        result.orders.forEach((order) => orders.set((order as { id: number }).id, order));
      }
      if (request.current !== version) return;
      loadedCursors.current = nextLoaded;
      setPage({ ...result, orders: [...orders.values()] });
    } catch {
      if (request.current === version) setError('Não foi possível carregar o histórico. Tente novamente.');
    } finally {
      if (request.current === version) { setLoading(false); busy.current = false; }
    }
  }, [read]);

  useEffect(() => {
    loadedCursors.current = [];
    // Prevent rows from the previous account/filter being shown while loading the next one.
    queueMicrotask(() => setPage(initial));
  }, [read]);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) void refresh(); });
    return () => { active = false; request.current += 1; busy.current = false; };
  }, [refresh, refreshSignal]);

  const loadMore = async () => {
    if (busy.current || !page.hasMore || page.nextCursor === null) return;
    const cursor = page.nextCursor;
    const version = ++request.current;
    busy.current = true;
    setLoading(true);
    setError('');
    try {
      const result = await read(cursor);
      if (version !== request.current) return;
      loadedCursors.current.push(cursor);
      setPage((current) => ({ ...result, orders: [...new Map([...current.orders, ...result.orders]
        .map((order) => [(order as { id: number }).id, order])).values()] }));
    } catch {
      if (version === request.current) setError('Não foi possível carregar mais pedidos. Tente novamente.');
    } finally {
      if (version === request.current) { busy.current = false; setLoading(false); }
    }
  };
  return { ...page, loading, error, loadMore, refresh };
}
