import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import tableSessionService from '../../Services/tableSessionService';
import tablesService from '../../Services/tablesService';
import {
  connectTableWaitingSocket,
  disconnectTableWaitingSocket,
} from '../../Services/socketService';
import type { StoredTableSession } from '../Home/domain/tableSession';
import Home from '../Home/Home';
import { TableAccessGate } from '../Home/components/TableAccessGate';

type ResolvedTable = {
  id: number;
  number: number;
  restaurantId: number;
  restaurantSlug: string;
  tableOrderingEnabled: boolean;
  waiterCallEnabled: boolean;
  billRequestEnabled: boolean;
};

type EntryState =
  | { status: 'loading'; key: string; table: null; error: '' }
  | { status: 'ready'; key: string; table: ResolvedTable; error: '' }
  | { status: 'waiting'; key: string; table: ResolvedTable | null; error: string }
  | { status: 'invalid'; key: string; table: null; error: string };

const WAITING_RETRY_MS = 3_000;

const Loading = styled.main`
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  background: #fffdf9;
  color: #6f6a63;
  font:
    600 14px Inter,
    ui-sans-serif,
    system-ui,
    sans-serif;
`;

function positiveInteger(value: unknown) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function apiError(error: unknown) {
  const typed = error as {
    response?: { data?: { error?: string; code?: string } };
    message?: string;
  };
  return {
    message:
      typed.response?.data?.error ||
      typed.message ||
      'Não foi possível validar esta mesa. Escaneie o QR Code oficial novamente.',
    code: String(typed.response?.data?.code || ''),
  };
}

function isWaitingForWaiter(message: string) {
  const normalized = message.toLocaleLowerCase('pt-BR');
  return (
    normalized.includes('ainda não foi aberta') ||
    normalized.includes('mesa novamente') ||
    normalized.includes('sessão') ||
    normalized.includes('desativad')
  );
}

function isWaitingForTableOpening(message: string) {
  const normalized = message.toLocaleLowerCase('pt-BR');
  return (
    normalized.includes('ainda não foi aberta') ||
    normalized.includes('aguarde uma nova abertura') ||
    normalized.includes('mesa novamente')
  );
}

function persistTableSession(session: StoredTableSession) {
  localStorage.setItem('tableSession', JSON.stringify(session));
  localStorage.setItem('tableSessionToken', String(session.sessionToken));
  if (session.restaurantId) {
    localStorage.setItem('menuRestaurantId', String(session.restaurantId));
  }
}

export default function DigitalMenuEntryPage() {
  const { tableNumber, restaurantSlug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [retryVersion, setRetryVersion] = useState(0);
  const routeTableNumber = positiveInteger(tableNumber);
  const queryTableId = positiveInteger(searchParams.get('tableId') || searchParams.get('tid'));
  const queryRestaurantId = positiveInteger(
    searchParams.get('restaurantId') || searchParams.get('rid'),
  );
  const tableToken = String(searchParams.get('tk') || searchParams.get('token') || '')
    .trim()
    .toLowerCase();
  const normalizedSlug = String(restaurantSlug || '')
    .trim()
    .toLowerCase();
  const hasValidRestaurantReference = Boolean(queryRestaurantId || normalizedSlug);
  const invalidQrContext = !routeTableNumber || !hasValidRestaurantReference || !tableToken;
  const searchParamsString = searchParams.toString();
  const entryKey = useMemo(
    () =>
      [
        routeTableNumber || '',
        queryTableId || '',
        queryRestaurantId || '',
        normalizedSlug,
        tableToken,
      ].join(':'),
    [normalizedSlug, queryRestaurantId, queryTableId, routeTableNumber, tableToken],
  );
  const [entry, setEntry] = useState<EntryState>({
    status: 'loading',
    key: entryKey,
    table: null,
    error: '',
  });
  const waitingTableId = entry.status === 'waiting' ? entry.table?.id || null : null;
  const waitingTableNumber = entry.status === 'waiting' ? entry.table?.number || null : null;
  const waitingRestaurantId = entry.status === 'waiting' ? entry.table?.restaurantId || null : null;
  const waitingRestaurantSlug = entry.status === 'waiting' ? entry.table?.restaurantSlug || '' : '';

  useEffect(() => {
    let active = true;

    if (invalidQrContext) return undefined;

    const join = async () => {
      let resolvedTable: ResolvedTable | null = null;
      try {
        const raw = (await tablesService.resolvePublicTable({
          tableNumber: routeTableNumber,
          tableToken,
          tableId: queryTableId,
          restaurantId: queryRestaurantId,
          slug: normalizedSlug,
        })) as ResolvedTable;
        resolvedTable = {
          ...raw,
          id: Number(raw.id),
          number: Number(raw.number),
          restaurantId: Number(raw.restaurantId),
        };

        if (
          !positiveInteger(resolvedTable.id) ||
          resolvedTable.number !== routeTableNumber ||
          !positiveInteger(resolvedTable.restaurantId) ||
          (queryRestaurantId && resolvedTable.restaurantId !== queryRestaurantId) ||
          (normalizedSlug && resolvedTable.restaurantSlug !== normalizedSlug)
        ) {
          throw new Error('A mesa retornada não corresponde ao QR Code escaneado.');
        }

        if (!resolvedTable.tableOrderingEnabled) {
          throw new Error(
            'O restaurante desativou temporariamente os pedidos pelo cardápio de mesa.',
          );
        }

        const result = await tableSessionService.joinOpenSession({
          tableId: resolvedTable.id,
          tableNumber: resolvedTable.number,
          tableToken,
          restaurantId: resolvedTable.restaurantId,
          restaurantSlug: resolvedTable.restaurantSlug,
        });
        const storedSession: StoredTableSession = {
          sessionToken: String(result.sessionToken || ''),
          sessionId: Number(result.sessionId),
          tableId: Number(result.tableId),
          tableNumber: Number(result.tableNumber),
          restaurantId: Number(result.restaurantId),
          expiresAt: result.expiresAt ? String(result.expiresAt) : null,
          tableOrderingEnabled: result.tableOrderingEnabled !== false,
          waiterCallEnabled: result.waiterCallEnabled !== false,
          billRequestEnabled: result.billRequestEnabled !== false,
        };

        if (
          !storedSession.sessionToken ||
          Number(storedSession.tableId) !== resolvedTable.id ||
          Number(storedSession.tableNumber) !== resolvedTable.number ||
          Number(storedSession.restaurantId) !== resolvedTable.restaurantId
        ) {
          throw new Error('A sessão aberta não corresponde à mesa deste QR Code.');
        }

        persistTableSession(storedSession);

        const canonicalParams = new URLSearchParams(searchParamsString);
        canonicalParams.set('rid', String(resolvedTable.restaurantId));
        canonicalParams.set('tk', tableToken);
        canonicalParams.delete('tid');
        canonicalParams.delete('tableId');
        canonicalParams.delete('restaurantId');
        canonicalParams.delete('token');

        if (canonicalParams.toString() !== searchParamsString) {
          setSearchParams(canonicalParams, { replace: true });
        }

        if (active) {
          setEntry({ status: 'ready', key: entryKey, table: resolvedTable, error: '' });
        }
      } catch (error: unknown) {
        if (!active) return;
        localStorage.removeItem('tableSession');
        localStorage.removeItem('tableSessionToken');
        const failure = apiError(error);
        const waiting = isWaitingForWaiter(failure.message);
        setEntry(
          waiting
            ? {
                status: 'waiting',
                key: entryKey,
                table: resolvedTable,
                error: failure.message,
              }
            : { status: 'invalid', key: entryKey, table: null, error: failure.message },
        );
      }
    };

    void join();
    return () => {
      active = false;
    };
  }, [
    entryKey,
    hasValidRestaurantReference,
    invalidQrContext,
    normalizedSlug,
    queryRestaurantId,
    queryTableId,
    retryVersion,
    routeTableNumber,
    searchParamsString,
    setSearchParams,
    tableToken,
  ]);

  useEffect(() => {
    if (
      entry.status !== 'waiting' ||
      entry.key !== entryKey ||
      !isWaitingForTableOpening(entry.error)
    ) {
      return undefined;
    }

    const retryAutomatically = () => setRetryVersion((value) => value + 1);
    const timeoutId = window.setTimeout(retryAutomatically, WAITING_RETRY_MS);
    const retryWhenVisible = () => {
      if (document.visibilityState !== 'visible') return;
      window.clearTimeout(timeoutId);
      retryAutomatically();
    };
    document.addEventListener('visibilitychange', retryWhenVisible);

    return () => {
      window.clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', retryWhenVisible);
    };
  }, [entry, entryKey]);

  useEffect(() => {
    if (
      entry.status !== 'waiting' ||
      entry.key !== entryKey ||
      !waitingTableId ||
      !waitingTableNumber ||
      !waitingRestaurantId
    ) {
      return undefined;
    }

    const socket = connectTableWaitingSocket(
      {
        tableToken,
        tableNumber: waitingTableNumber,
        restaurantId: waitingRestaurantId,
        restaurantSlug: waitingRestaurantSlug,
      },
      `waiting-table-${waitingTableId}`,
    );
    const handleOpened = (payload?: { tableId?: number; restaurantId?: number }) => {
      if (
        Number(payload?.tableId) !== waitingTableId ||
        Number(payload?.restaurantId) !== waitingRestaurantId
      ) {
        return;
      }
      setRetryVersion((value) => value + 1);
    };
    socket?.on('table:session-opened', handleOpened);

    return () => {
      socket?.off('table:session-opened', handleOpened);
      disconnectTableWaitingSocket();
    };
  }, [
    entry.key,
    entry.status,
    entryKey,
    tableToken,
    waitingRestaurantId,
    waitingRestaurantSlug,
    waitingTableId,
    waitingTableNumber,
  ]);

  const retry = () => {
    setEntry({ status: 'loading', key: entryKey, table: null, error: '' });
    setRetryVersion((value) => value + 1);
  };

  if (invalidQrContext) {
    return (
      <TableAccessGate
        primaryColor="#d64d08"
        invalidQr
        invalidMessage="O link não contém a identificação segura desta mesa. Escaneie o QR Code oficial novamente."
        tableLabel={routeTableNumber || ''}
      />
    );
  }

  if (entry.status === 'loading' || entry.key !== entryKey) {
    return <Loading role="status">Verificando se a mesa está aberta...</Loading>;
  }

  if (entry.status === 'invalid') {
    return (
      <TableAccessGate
        primaryColor="#d64d08"
        invalidQr
        invalidMessage={entry.error}
        tableLabel={routeTableNumber || ''}
        retrying={false}
        onRetry={retry}
      />
    );
  }

  if (entry.status === 'waiting') {
    return (
      <TableAccessGate
        primaryColor="#d64d08"
        tableLabel={entry.table?.number || routeTableNumber || ''}
        invalidMessage={entry.error}
        retrying={false}
        onRetry={retry}
      />
    );
  }

  return <Home />;
}
