import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ordersService, {
  type RestaurantOrdersPage,
  type RestaurantOrdersQueue,
} from '../../../Services/ordersService';
import { mapAdminOrder } from '../domain/adminOrderMapper';
import type { AdminOrder } from '../types';

export const ADMIN_ORDERS_PAGE_SIZE = 10;

type OrdersPageState = Omit<RestaurantOrdersPage, 'orders'> & {
  orders: AdminOrder[];
  loading: boolean;
  error: string;
  queryKey: string;
};

const emptySummary = { total: 0, active: 0, awaitingPayment: 0, inProgress: 0, delivered: 0 };

export function useAdminOrdersPage({
  search,
  status,
  queue,
  refreshSignal,
}: {
  search: string;
  status: string;
  queue: RestaurantOrdersQueue;
  refreshSignal: unknown;
}) {
  const [debouncedSearch, setDebouncedSearch] = useState(search.trim());
  const [page, setPage] = useState<OrdersPageState>({
    orders: [], nextCursor: null, hasMore: false, total: 0,
    summary: emptySummary, loading: true, error: '', queryKey: '',
  });
  const requestVersion = useRef(0);
  const loadingRef = useRef(false);
  const visiblePages = useRef(1);
  const loadedQuery = useRef('');
  const query = useMemo(() => ({
    limit: ADMIN_ORDERS_PAGE_SIZE,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(status ? { status } : {}),
    queue,
  }), [debouncedSearch, status, queue]);
  const queryKey = JSON.stringify(query);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  const requestPage = useCallback(async (cursor?: number) => {
    // A second click must not request the same page while its first request is pending.
    if (cursor !== undefined && loadingRef.current) return;
    const version = ++requestVersion.current;
    const changedQuery = loadedQuery.current !== queryKey;
    if (changedQuery) visiblePages.current = 1;
    loadingRef.current = true;
    setPage((current) => ({
      ...current,
      ...(changedQuery ? { orders: [], nextCursor: null, hasMore: false } : {}),
      loading: true, error: '', queryKey,
    }));
    try {
      let result = await ordersService.listRestaurantOrdersPage({
        ...query,
        ...(cursor === undefined ? {} : { cursor }),
      });
      const refreshedOrders = [...result.orders];
      if (cursor === undefined) {
        for (let index = 1; index < visiblePages.current && result.hasMore; index += 1) {
          if (version !== requestVersion.current) return;
          result = await ordersService.listRestaurantOrdersPage({ ...query, cursor: result.nextCursor! });
          refreshedOrders.push(...result.orders);
        }
        result = { ...result, orders: refreshedOrders };
      }
      if (version !== requestVersion.current) return;
      loadedQuery.current = queryKey;
      if (cursor !== undefined) visiblePages.current += 1;
      setPage((current) => {
        const incoming = result.orders.map(mapAdminOrder);
        const merged = cursor === undefined ? incoming : [...current.orders, ...incoming];
        const unique = new Map(merged.map((order) => [order.numericId, order]));
        return {
          ...result, summary: result.summary || emptySummary, orders: [...unique.values()], loading: false, error: '', queryKey,
        };
      });
    } catch {
      if (version !== requestVersion.current) return;
      setPage((current) => ({
        ...current, loading: false,
        error: cursor === undefined
          ? 'Não foi possível carregar os pedidos. Tente novamente.'
          : 'Não foi possível carregar mais pedidos. Tente novamente.',
      }));
    } finally {
      if (version === requestVersion.current) loadingRef.current = false;
    }
  }, [query, queryKey]);

  useEffect(() => {
    let active = true;
    // Schedule state updates outside the effect and invalidate outstanding responses on cleanup.
    void Promise.resolve().then(() => {
      if (active) void requestPage();
    });
    return () => {
      active = false;
      requestVersion.current += 1;
      loadingRef.current = false;
    };
  }, [requestPage, refreshSignal]);

  const searchPending = search.trim() !== debouncedSearch;
  const queryPending = page.queryKey !== queryKey;
  const loading = page.loading || searchPending || queryPending;
  return {
    ...page,
    orders: searchPending || queryPending ? [] : page.orders,
    loading,
    refresh: () => requestPage(),
    loadMore: () => {
      if (!loading && page.hasMore && page.nextCursor !== null) {
        return requestPage(page.nextCursor);
      }
    },
    retry: () => page.orders.length && page.nextCursor !== null
      ? requestPage(page.nextCursor)
      : requestPage(),
  };
}
