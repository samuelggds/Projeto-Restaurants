import { useCallback, useEffect, useRef, useState } from 'react';
import tableAccountService from '../../../Services/tableAccountService';
import {
  createTablePaymentIdempotencyKey,
  tablePaymentFingerprint,
  type CreateTablePaymentResult,
  type TableAccountSnapshot,
  type TablePaymentDraft,
} from '../domain/tableAccount';

type Notify = (type: 'success' | 'error', title: string, message?: string) => void;

type Options = {
  enabled: boolean;
  sessionPublicId?: string | null;
  notify: Notify;
};

function errorMessage(error: unknown) {
  const typed = error as { response?: { data?: { error?: string } }; message?: string };
  return (
    typed.response?.data?.error || typed.message || 'Não foi possível atualizar a conta desta mesa.'
  );
}

function isDefinitiveClientError(error: unknown) {
  const status = Number((error as { response?: { status?: number } })?.response?.status || 0);
  return status >= 400 && status < 500 && ![408, 425, 429].includes(status);
}

export function useTableAccount({ enabled, sessionPublicId, notify }: Options) {
  const scopeKey = enabled && sessionPublicId ? sessionPublicId : '';
  const [queryState, setQueryState] = useState<{
    scopeKey: string;
    snapshot: TableAccountSnapshot | null;
    loading: boolean;
    error: string;
  }>({ scopeKey: '', snapshot: null, loading: false, error: '' });
  const [actionLoading, setActionLoading] = useState(false);
  const activeRef = useRef(true);
  const actionInFlightRef = useRef(false);
  const latestRequestRef = useRef(0);
  const pendingAttemptRef = useRef<{
    scopeKey: string;
    fingerprint: string;
    key: string;
  } | null>(null);

  const scopedQueryState =
    queryState.scopeKey === scopeKey
      ? queryState
      : { scopeKey, snapshot: null, loading: Boolean(scopeKey), error: '' };

  useEffect(() => {
    activeRef.current = true;
    return () => {
      activeRef.current = false;
    };
  }, []);

  const refresh = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!scopeKey) return null;
      const requestId = ++latestRequestRef.current;
      if (!options?.silent) {
        setQueryState((current) => ({
          scopeKey,
          snapshot: current.scopeKey === scopeKey ? current.snapshot : null,
          loading: true,
          error: '',
        }));
      }
      try {
        const result = await tableAccountService.getCurrent(scopeKey);
        if (activeRef.current && latestRequestRef.current === requestId) {
          setQueryState({ scopeKey, snapshot: result, loading: false, error: '' });
        }
        return result;
      } catch (requestError: unknown) {
        const message = errorMessage(requestError);
        if (activeRef.current && latestRequestRef.current === requestId) {
          setQueryState((current) => ({
            scopeKey,
            snapshot: current.scopeKey === scopeKey ? current.snapshot : null,
            loading: false,
            error: message,
          }));
        }
        return null;
      }
    },
    [scopeKey],
  );

  useEffect(() => {
    if (!scopeKey) {
      latestRequestRef.current += 1;
      pendingAttemptRef.current = null;
      return undefined;
    }
    const initialRefreshId = window.setTimeout(() => void refresh(), 0);
    const intervalId = window.setInterval(() => void refresh({ silent: true }), 15_000);
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void refresh({ silent: true });
    };
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      latestRequestRef.current += 1;
      pendingAttemptRef.current = null;
      window.clearTimeout(initialRefreshId);
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [refresh, scopeKey]);

  const createPayment = useCallback(
    async (draft: TablePaymentDraft): Promise<CreateTablePaymentResult | null> => {
      if (!scopeKey || actionInFlightRef.current) return null;
      const fingerprint = tablePaymentFingerprint(draft);
      const attempt =
        pendingAttemptRef.current?.scopeKey === scopeKey &&
        pendingAttemptRef.current.fingerprint === fingerprint
          ? pendingAttemptRef.current
          : { scopeKey, fingerprint, key: createTablePaymentIdempotencyKey() };
      pendingAttemptRef.current = attempt;
      actionInFlightRef.current = true;
      setActionLoading(true);
      try {
        const result = await tableAccountService.createPayment(scopeKey, draft, attempt.key);
        pendingAttemptRef.current = null;
        await refresh({ silent: true });
        return result;
      } catch (requestError: unknown) {
        // Erros de validação são definitivos. Falhas de rede, timeout, limite ou servidor
        // reutilizam a mesma chave porque a cobrança pode ter sido criada antes da resposta.
        if (isDefinitiveClientError(requestError)) pendingAttemptRef.current = null;
        notify('error', 'Pagamento não iniciado', errorMessage(requestError));
        return null;
      } finally {
        actionInFlightRef.current = false;
        if (activeRef.current) setActionLoading(false);
      }
    },
    [notify, refresh, scopeKey],
  );

  const cancelPayment = useCallback(
    async (paymentPublicId: string) => {
      if (!scopeKey || actionInFlightRef.current) return false;
      actionInFlightRef.current = true;
      setActionLoading(true);
      try {
        await tableAccountService.cancelPayment(scopeKey, paymentPublicId);
        await refresh({ silent: true });
        notify('success', 'Pagamento cancelado', 'Os itens reservados voltaram para a conta.');
        return true;
      } catch (requestError: unknown) {
        notify('error', 'Não foi possível cancelar', errorMessage(requestError));
        return false;
      } finally {
        actionInFlightRef.current = false;
        if (activeRef.current) setActionLoading(false);
      }
    },
    [notify, refresh, scopeKey],
  );

  return {
    snapshot: scopedQueryState.snapshot,
    loading: scopedQueryState.loading,
    actionLoading,
    error: scopedQueryState.error,
    refresh,
    createPayment,
    cancelPayment,
  };
}
