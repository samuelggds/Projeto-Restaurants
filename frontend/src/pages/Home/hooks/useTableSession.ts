import { useCallback, useEffect, useState } from 'react';
import {
  connectTableSessionSocket,
  disconnectTableSessionSocket,
} from '../../../Services/socketService';
import tableSessionService from '../../../Services/tableSessionService';
import { readJsonStorage } from '../../../shared/storage/jsonStorage';
import {
  belongsToTableRoute,
  isTableSessionActive,
  resolveTableRoute,
  type StoredTableSession,
} from '../domain/tableSession';

type Notify = (type: 'success' | 'error' | 'warning', title: string, message?: string) => void;
type Options = {
  tableNumber: unknown;
  restaurantId: unknown;
  tableToken?: unknown;
  tableId: unknown;
  notify: Notify;
};

function clearStoredSession() {
  localStorage.removeItem('tableSession');
  localStorage.removeItem('tableSessionToken');
}

export function useTableSession(options: Options) {
  const notify = options.notify;
  const route = resolveTableRoute(options.tableNumber, options.restaurantId, options.tableId);
  const [tableSession, setTableSession] = useState<StoredTableSession | null>(() =>
    readJsonStorage('tableSession', null),
  );
  const [sessionEndedMessage, setSessionEndedMessage] = useState('');
  const sessionRouteMismatch = Boolean(
    route.mesaMode &&
    tableSession?.sessionToken &&
    !belongsToTableRoute(
      tableSession,
      route.routeTableId,
      route.routeRestaurantId,
      route.routeTableNumber,
    ),
  );
  const activeSession = sessionRouteMismatch ? null : tableSession;
  const mesaLabel =
    route.routeTableNumber ||
    activeSession?.tableNumber ||
    activeSession?.tableId ||
    route.routeTableId ||
    '';
  const hasValidQrContext =
    !route.mesaMode || Boolean(route.routeTableNumber && String(options.tableToken || '').trim());
  const mesaSessionIsActive = isTableSessionActive(
    activeSession,
    route.mesaMode,
    route.routeTableId,
    route.routeRestaurantId,
    route.routeTableNumber,
  );
  const storedSessionRestaurantId = Number(activeSession?.restaurantId || 0);

  const endSession = useCallback(
    (message: string, showNotification = true) => {
      clearStoredSession();
      setTableSession(null);
      setSessionEndedMessage(message);
      if (showNotification) {
        notify(
          'warning',
          'Atendimento da mesa encerrado',
          'Novos pedidos foram bloqueados. Peça ao garçom para abrir a mesa novamente.',
        );
      }
    },
    [notify, setSessionEndedMessage, setTableSession],
  );

  const markClosingRequested = useCallback(() => {
    setTableSession((current) => {
      if (!current) return current;
      const closingSession: StoredTableSession = {
        ...current,
        sessionStatus: 'CLOSING_REQUESTED',
        tableOrderingEnabled: false,
      };
      localStorage.setItem('tableSession', JSON.stringify(closingSession));
      return closingSession;
    });
  }, [setTableSession]);

  useEffect(() => {
    if (!route.mesaMode || !tableSession?.sessionToken) return;
    if (sessionRouteMismatch) {
      clearStoredSession();
    }
  }, [route.mesaMode, sessionRouteMismatch, tableSession]);

  useEffect(() => {
    if (!route.mesaMode || !activeSession?.sessionToken) return undefined;

    const socket = connectTableSessionSocket(
      activeSession.sessionToken,
      `menu-table-${activeSession.tableId || 'unknown'}`,
    );
    const handleClosed = (payload?: { sessionId?: number; tableId?: number }) => {
      const sameSession =
        !payload?.sessionId || Number(payload.sessionId) === Number(activeSession.sessionId);
      const sameTable =
        !payload?.tableId || Number(payload.tableId) === Number(activeSession.tableId);
      if (sameSession && sameTable) {
        endSession(
          'Esta mesa foi fechada pelo garçom. Para pedir novamente, aguarde uma nova abertura.',
        );
      }
    };
    const handleServiceUpdate = (payload?: {
      tableId?: number;
      type?: 'WAITER' | 'BILL';
      status?: 'IN_PROGRESS' | 'RESOLVED';
    }) => {
      if (payload?.tableId && Number(payload.tableId) !== Number(activeSession.tableId)) return;
      if (payload?.status === 'IN_PROGRESS') {
        notify(
          'success',
          payload.type === 'BILL' ? 'Conta em atendimento' : 'Garçom a caminho',
          'Seu aviso foi assumido pela equipe do salão.',
        );
      }
      if (payload?.status === 'RESOLVED') {
        notify(
          'success',
          payload.type === 'BILL' ? 'Solicitação da conta concluída' : 'Atendimento concluído',
          'Se precisar novamente, envie um novo aviso pelo cardápio.',
        );
      }
    };
    socket?.on('table:session-closed', handleClosed);
    socket?.on('waiter-call:updated', handleServiceUpdate);

    const verifySession = async () => {
      try {
        const current = await tableSessionService.getCurrentSession();
        if (
          Number(current?.id || current?.sessionId) !== Number(activeSession.sessionId) ||
          Number(current?.tableId) !== Number(activeSession.tableId)
        ) {
          endSession('A sessão ativa não corresponde mais a esta mesa. Escaneie o QR novamente.');
        } else {
          const closingRequested = current?.sessionStatus === 'CLOSING_REQUESTED';
          const shouldEnrichPublicId = !activeSession.sessionPublicId && current?.sessionPublicId;
          const shouldSyncClosing =
            closingRequested && activeSession.sessionStatus !== 'CLOSING_REQUESTED';

          if (!shouldEnrichPublicId && !shouldSyncClosing) return;

          const enrichedSession: StoredTableSession = {
            ...activeSession,
            ...(shouldEnrichPublicId
              ? { sessionPublicId: String(current.sessionPublicId) }
              : undefined),
            ...(shouldSyncClosing
              ? {
                  sessionStatus: 'CLOSING_REQUESTED' as const,
                  tableOrderingEnabled: false,
                }
              : undefined),
          };
          localStorage.setItem('tableSession', JSON.stringify(enrichedSession));
          setTableSession(enrichedSession);
        }
      } catch (error: unknown) {
        const status = Number((error as { response?: { status?: number } })?.response?.status || 0);
        if (status === 403 || status === 404) {
          endSession('Esta mesa já foi fechada ou a sessão expirou. Aguarde o garçom reabri-la.');
        }
      }
    };

    void verifySession();
    const intervalId = window.setInterval(() => void verifySession(), 30_000);
    const verifyWhenVisible = () => {
      if (document.visibilityState === 'visible') void verifySession();
    };
    document.addEventListener('visibilitychange', verifyWhenVisible);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', verifyWhenVisible);
      socket?.off('table:session-closed', handleClosed);
      socket?.off('waiter-call:updated', handleServiceUpdate);
      disconnectTableSessionSocket();
    };
  }, [activeSession, endSession, notify, route.mesaMode]);

  return {
    ...route,
    tableSession: activeSession,
    sessionEndedMessage: sessionRouteMismatch
      ? 'Este acesso pertence a outra mesa. Escaneie o QR Code oficial novamente.'
      : sessionEndedMessage,
    mesaLabel,
    hasValidQrContext,
    mesaSessionIsActive,
    storedSessionRestaurantId,
    markClosingRequested,
  };
}
