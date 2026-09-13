import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  PaymentConnectionOverview,
  PaymentProvider,
} from '../../../Services/paymentConnectionService';

export function usePaymentConnections(load?: () => Promise<PaymentConnectionOverview>) {
  const [overview, setOverview] = useState<PaymentConnectionOverview | null>(null);
  const [loading, setLoading] = useState(Boolean(load));
  const [error, setError] = useState('');
  const revision = useRef(0);
  const refresh = useCallback(async () => {
    if (!load) return;
    const request = ++revision.current;
    setLoading(true);
    setError('');
    try {
      const result = await load();
      if (revision.current === request) setOverview(result);
    } catch {
      if (revision.current === request) {
        setOverview(null);
        setError('Não foi possível verificar as conexões. Tente novamente.');
      }
    } finally {
      if (revision.current === request) setLoading(false);
    }
  }, [load]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => {
      revision.current += 1;
      window.clearTimeout(timer);
    };
  }, [refresh]);

  return {
    loading,
    error,
    refresh,
    verifying: Boolean(load),
    get: (provider: PaymentProvider) =>
      overview?.connections.find((connection) => connection.provider === provider),
  };
}
