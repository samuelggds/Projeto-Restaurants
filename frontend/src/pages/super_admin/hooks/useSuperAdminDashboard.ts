import { useCallback, useEffect, useRef, useState } from 'react';
import superAdminService from '../../../Services/superAdminService';
import { mapSuperAdminDashboard } from '../adapters/superAdminDataAdapter';
import { requestErrorMessage } from '../domain/superAdminDomain';
import type { SuperAdminData } from '../types';

export function useSuperAdminDashboard() {
  const [data, setData] = useState<SuperAdminData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const requestSequence = useRef(0);
  const abortController = useRef<AbortController | null>(null);
  const load = useCallback(async () => {
    const requestId = ++requestSequence.current;
    abortController.current?.abort();
    const controller = new AbortController();
    abortController.current = controller;
    setError(null);
    setLoading(true);
    setRefreshing(true);
    try {
      const response = await superAdminService.getDashboard(controller.signal);
      if (requestId !== requestSequence.current || controller.signal.aborted) return;
      setData(mapSuperAdminDashboard(response));
    } catch (requestError) {
      if (requestId !== requestSequence.current || controller.signal.aborted) return;
      setError(
        requestErrorMessage(requestError, 'Não foi possível carregar o painel da plataforma.'),
      );
    } finally {
      if (requestId === requestSequence.current && !controller.signal.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0);
    return () => {
      window.clearTimeout(initialLoad);
      requestSequence.current += 1;
      abortController.current?.abort();
    };
  }, [load]);

  return { data, error, loading, refreshing, refresh: load };
}
