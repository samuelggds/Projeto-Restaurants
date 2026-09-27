import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import tableAccountService from '../../../Services/tableAccountService';
import { connectTableSessionSocket } from '../../../Services/socketService';
import {
  createTablePaymentIdempotencyKey,
  tablePaymentFingerprint,
  type CreateTablePaymentResult,
  type TableAccountSnapshot,
  type TablePaymentDraft,
  type TablePaymentIntent,
} from '../domain/tableAccount';

type Notify = (type: 'success' | 'error', title: string, message?: string) => void;

type Options = {
  enabled: boolean;
  sessionPublicId?: string | null;
  sessionToken?: string | null;
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

export function useTableAccount({ enabled, sessionPublicId, sessionToken, notify }: Options) {
  const scopeKey = enabled && sessionPublicId ? sessionPublicId : '';
  const scope = useMemo(() => ({ scopeKey, sessionToken }), [scopeKey, sessionToken]);
  type Scope = typeof scope;
  type Action = { scope: Scope; participantPublicId: string | undefined };
  type ReadResult = TableAccountSnapshot | null;
  const [queryState, setQueryState] = useState<{
    scope: Scope | null;
    snapshot: TableAccountSnapshot | null;
    loading: boolean;
    error: string;
  }>({ scope: null, snapshot: null, loading: false, error: '' });
  const [actionState, setActionState] = useState<{ scope: Scope; loading: boolean } | null>(null);
  const currentScopeRef = useRef<Scope | null>(scope);
  const actionInFlightRef = useRef<Action | null>(null);
  const snapshotRef = useRef<TableAccountSnapshot | null>(null);
  const readInFlightRef = useRef<{ scope: Scope; promise: Promise<ReadResult> } | null>(null);
  const backgroundReadRef = useRef<{
    scope: Scope;
    dirty: boolean;
    promise: Promise<ReadResult>;
  } | null>(null);
  const latestRequestRef = useRef(0);
  const pendingAttemptRef = useRef<{
    scope: Scope;
    participantPublicId: string | undefined;
    fingerprint: string;
    key: string;
  } | null>(null);
  const notifiedPaidPaymentsRef = useRef(new Set<string>());

  const scopedQueryState =
    queryState.scope === scope
      ? queryState
      : { scope, snapshot: null, loading: Boolean(scopeKey), error: '' };

  useLayoutEffect(() => {
    currentScopeRef.current = scope;
    snapshotRef.current = null;
    pendingAttemptRef.current = null;
    notifiedPaidPaymentsRef.current.clear();
    return () => {
      currentScopeRef.current = null;
      latestRequestRef.current += 1;
    };
  }, [scope]);

  const isCurrentScope = useCallback(
    () => Boolean(scopeKey) && currentScopeRef.current === scope,
    [scope, scopeKey],
  );

  const refresh = useCallback(
    (options?: { silent?: boolean }): Promise<ReadResult> => {
      if (!isCurrentScope()) return Promise.resolve(null);
      const requestId = ++latestRequestRef.current;
      if (!options?.silent) {
        setQueryState((current) => ({
          scope,
          snapshot: current.scope === scope ? current.snapshot : null,
          loading: true,
          error: '',
        }));
      }
      const promise = (async () => {
        try {
          const result = await tableAccountService.getCurrent(scopeKey);
          if (!isCurrentScope() || latestRequestRef.current !== requestId) return null;
          snapshotRef.current = result;
          setQueryState({ scope, snapshot: result, loading: false, error: '' });
          return result;
        } catch (requestError: unknown) {
          const message = errorMessage(requestError);
          if (isCurrentScope() && latestRequestRef.current === requestId) {
            setQueryState((current) => ({
              scope,
              snapshot: current.scope === scope ? current.snapshot : null,
              loading: false,
              error: message,
            }));
          }
          return null;
        }
      })();
      const read = { scope, promise };
      readInFlightRef.current = read;
      void promise.finally(() => {
        if (readInFlightRef.current === read) readInFlightRef.current = null;
      });
      return promise;
    },
    [isCurrentScope, scope, scopeKey],
  );

  const refreshInBackground = useCallback(
    (fromEvent = false): Promise<ReadResult> => {
      if (!isCurrentScope()) return Promise.resolve(null);
      const running = backgroundReadRef.current;
      if (running?.scope === scope) {
        // Um evento ocorrido durante a leitura exige uma leitura posterior; um tick não.
        if (fromEvent) running.dirty = true;
        return running.promise;
      }
      const pending = readInFlightRef.current;
      if (!fromEvent && pending?.scope === scope) return pending.promise;

      const task = { scope, dirty: false, promise: Promise.resolve<ReadResult>(null) };
      task.promise = (async () => {
        let result: ReadResult;
        do {
          const read = readInFlightRef.current;
          if (read?.scope === scope) await read.promise;
          if (!isCurrentScope()) return null;
          task.dirty = false;
          result = await refresh({ silent: true });
        } while (task.dirty && isCurrentScope());
        return result;
      })().finally(() => {
        if (backgroundReadRef.current === task) backgroundReadRef.current = null;
      });
      backgroundReadRef.current = task;
      return task.promise;
    },
    [isCurrentScope, refresh, scope],
  );

  const beginAction = useCallback(() => {
    if (!isCurrentScope() || actionInFlightRef.current?.scope === scope) return null;
    const action = { scope, participantPublicId: snapshotRef.current?.currentParticipantPublicId };
    actionInFlightRef.current = action;
    setActionState({ scope, loading: true });
    return action;
  }, [isCurrentScope, scope]);

  const isCurrentAction = useCallback(
    (action: Action) =>
      isCurrentScope() &&
      actionInFlightRef.current === action &&
      (!action.participantPublicId ||
        snapshotRef.current?.currentParticipantPublicId === action.participantPublicId),
    [isCurrentScope],
  );

  const finishAction = useCallback(
    (action: Action) => {
      if (actionInFlightRef.current === action) {
        actionInFlightRef.current = null;
        if (isCurrentScope()) {
          setActionState({ scope, loading: false });
        }
      }
    },
    [isCurrentScope, scope],
  );

  useEffect(() => {
    if (!scopeKey) {
      latestRequestRef.current += 1;
      pendingAttemptRef.current = null;
      return undefined;
    }
    const initialRefreshId = window.setTimeout(() => void refresh(), 0);
    const intervalId = window.setInterval(() => {
      if (!document.hidden) void refreshInBackground();
    }, 15_000);
    const refreshWhenVisible = () => {
      if (!document.hidden) void refreshInBackground(true);
    };
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      latestRequestRef.current += 1;
      pendingAttemptRef.current = null;
      window.clearTimeout(initialRefreshId);
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [refresh, refreshInBackground, scopeKey]);

  useEffect(() => {
    if (!scopeKey || !sessionToken) return undefined;
    const socket = connectTableSessionSocket(sessionToken, `table-account-${scopeKey}`);
    const handleAccountUpdated = async (payload?: {
      paymentPublicId?: string;
      paymentStatus?: string;
    }) => {
      const refreshed = await refreshInBackground(true);
      if (!isCurrentScope()) return;
      const paymentPublicId = String(payload?.paymentPublicId || '');
      if (
        payload?.paymentStatus === 'PAID' &&
        paymentPublicId &&
        !notifiedPaidPaymentsRef.current.has(paymentPublicId)
      ) {
        const confirmedPayment = refreshed?.payments.find(
          (payment) => payment.publicId === paymentPublicId && payment.status === 'PAID',
        );
        // O socket apenas avisa que algo mudou. A confirmação exibida ao cliente
        // precisa vir da leitura canônica do backend, nunca só do payload do evento.
        if (!confirmedPayment || !refreshed) return;

        notifiedPaidPaymentsRef.current.add(paymentPublicId);
        const ownPayment =
          confirmedPayment?.payerParticipantPublicId === refreshed?.currentParticipantPublicId;
        notify(
          'success',
          ownPayment ? 'Seu pagamento foi confirmado' : 'Pagamento da mesa confirmado',
          ownPayment
            ? 'O valor pago já foi abatido automaticamente da sua conta.'
            : 'A conta foi atualizada após a confirmação de outro participante.',
        );
      }
    };
    socket?.on('table-account:updated', handleAccountUpdated);
    return () => {
      socket?.off('table-account:updated', handleAccountUpdated);
    };
  }, [isCurrentScope, notify, refreshInBackground, scopeKey, sessionToken]);

  const createPayment = useCallback(
    async (draft: TablePaymentDraft): Promise<CreateTablePaymentResult | null> => {
      const action = beginAction();
      if (!action) return null;
      const fingerprint = tablePaymentFingerprint(draft);
      const attempt =
        pendingAttemptRef.current?.scope === scope &&
        pendingAttemptRef.current.participantPublicId === action.participantPublicId &&
        pendingAttemptRef.current.fingerprint === fingerprint
          ? pendingAttemptRef.current
          : {
              scope,
              participantPublicId: action.participantPublicId,
              fingerprint,
              key: createTablePaymentIdempotencyKey(),
            };
      pendingAttemptRef.current = attempt;
      try {
        const result = await tableAccountService.createPayment(scopeKey, draft, attempt.key);
        if (!isCurrentAction(action)) return null;
        pendingAttemptRef.current = null;
        await refresh({ silent: true });
        return isCurrentAction(action) ? result : null;
      } catch (requestError: unknown) {
        if (!isCurrentAction(action)) return null;
        // Erros de validação são definitivos. Falhas de rede, timeout, limite ou servidor
        // reutilizam a mesma chave porque a cobrança pode ter sido criada antes da resposta.
        if (isDefinitiveClientError(requestError)) pendingAttemptRef.current = null;
        notify('error', 'Pagamento não iniciado', errorMessage(requestError));
        return null;
      } finally {
        finishAction(action);
      }
    },
    [beginAction, finishAction, isCurrentAction, notify, refresh, scope, scopeKey],
  );

  const cancelPayment = useCallback(
    async (paymentPublicId: string) => {
      const action = beginAction();
      if (!action) return false;
      try {
        await tableAccountService.cancelPayment(scopeKey, paymentPublicId);
        if (!isCurrentAction(action)) return false;
        await refresh({ silent: true });
        if (!isCurrentAction(action)) return false;
        notify('success', 'Pagamento cancelado', 'Os itens reservados voltaram para a conta.');
        return true;
      } catch (requestError: unknown) {
        if (!isCurrentAction(action)) return false;
        notify('error', 'Não foi possível cancelar', errorMessage(requestError));
        return false;
      } finally {
        finishAction(action);
      }
    },
    [beginAction, finishAction, isCurrentAction, notify, refresh, scopeKey],
  );

  const reconcilePayment = useCallback(
    async (paymentPublicId: string): Promise<TablePaymentIntent | null> => {
      const action = beginAction();
      if (!action) return null;
      try {
        const result = await tableAccountService.reconcilePayment(scopeKey, paymentPublicId);
        if (!isCurrentAction(action)) return null;
        await refresh({ silent: true });
        return isCurrentAction(action) ? result.payment : null;
      } catch (requestError: unknown) {
        if (!isCurrentAction(action)) return null;
        notify('error', 'Não foi possível verificar', errorMessage(requestError));
        return null;
      } finally {
        finishAction(action);
      }
    },
    [beginAction, finishAction, isCurrentAction, notify, refresh, scopeKey],
  );

  return {
    snapshot: scopedQueryState.snapshot,
    loading: scopedQueryState.loading,
    actionLoading: actionState?.scope === scope && actionState.loading,
    error: scopedQueryState.error,
    refresh,
    createPayment,
    cancelPayment,
    reconcilePayment,
  };
}
