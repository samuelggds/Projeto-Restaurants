import { useEffect, useState, type FormEvent } from 'react';
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
  restaurantSlug?: unknown;
  tableId: unknown;
  notify: Notify;
};

export function useTableSession(options: Options) {
  const route = resolveTableRoute(options.tableNumber, options.restaurantId, options.tableId);
  const [tablePin, setTablePin] = useState('');
  const [pinError, setPinError] = useState('');
  const [isPinValidating, setIsPinValidating] = useState(false);
  const [tableSession, setTableSession] = useState<StoredTableSession | null>(() =>
    readJsonStorage('tableSession', null),
  );
  const sessionMatchesRoute =
    !route.mesaMode ||
    !tableSession?.sessionToken ||
    belongsToTableRoute(tableSession, route.routeTableId, route.routeRestaurantId);
  const activeSession = sessionMatchesRoute ? tableSession : null;
  const mesaLabel =
    route.routeTableNumber ||
    activeSession?.tableNumber ||
    activeSession?.tableId ||
    route.routeTableId ||
    '';
  const hasValidQrContext =
    !route.mesaMode || Boolean(route.routeTableNumber && route.routeTableId);
  const mesaSessionIsActive = isTableSessionActive(
    activeSession,
    route.mesaMode,
    route.routeTableId,
    route.routeRestaurantId,
  );
  const storedSessionRestaurantId = Number(activeSession?.restaurantId || 0);

  useEffect(() => {
    if (!route.mesaMode || !tableSession?.sessionToken) return;
    if (!belongsToTableRoute(tableSession, route.routeTableId, route.routeRestaurantId)) {
      localStorage.removeItem('tableSession');
      localStorage.removeItem('tableSessionToken');
    }
  }, [route.mesaMode, route.routeTableId, route.routeRestaurantId, tableSession]);

  const handleValidateTablePin = async (event: FormEvent) => {
    event.preventDefault();
    if (!route.routeTableId || !route.routeTableNumber) {
      options.notify('error', 'QR inválido', 'Escaneie o QR oficial da mesa novamente.');
      return;
    }
    if (!tablePin.trim()) {
      options.notify('warning', 'PIN obrigatório', 'Digite o PIN informado pelo garçom.');
      return;
    }
    try {
      setIsPinValidating(true);
      setPinError('');
      const result = await tableSessionService.validatePin({
        tableId: route.routeTableId,
        tableNumber: route.routeTableNumber,
        restaurantId: route.routeRestaurantId,
        restaurantSlug: String(options.restaurantSlug || '').trim() || null,
        pin: tablePin.trim(),
      });
      const next: StoredTableSession = {
        sessionToken: result.sessionToken,
        sessionId: result.sessionId,
        tableId: Number(result.tableId || route.routeTableId),
        tableNumber: Number(result.tableNumber || mesaLabel) || null,
        restaurantId: Number(result.restaurantId || route.routeRestaurantId || 0) || null,
      };
      if (
        Number(next.tableId) !== Number(route.routeTableId) ||
        Number(next.tableNumber) !== Number(route.routeTableNumber) ||
        (route.routeRestaurantId && Number(next.restaurantId) !== Number(route.routeRestaurantId))
      ) {
        throw new Error('O PIN retornou uma mesa diferente do QR Code escaneado.');
      }
      localStorage.setItem('tableSession', JSON.stringify(next));
      localStorage.setItem('tableSessionToken', String(result.sessionToken));
      if (next.restaurantId) localStorage.setItem('menuRestaurantId', String(next.restaurantId));
      setTableSession(next);
      setTablePin('');
      options.notify(
        'success',
        `Mesa ${next.tableNumber} liberada!`,
        'Cardápio disponível. Bom apetite!',
      );
    } catch (error) {
      const typed = error as { response?: { data?: { error?: string } }; message?: string };
      const message = typed.response?.data?.error || typed.message || 'Erro ao validar PIN';
      setPinError(message);
      options.notify('error', 'Erro no PIN', message);
    } finally {
      setIsPinValidating(false);
    }
  };

  return {
    ...route,
    tablePin,
    setTablePin,
    pinError,
    isPinValidating,
    mesaLabel,
    hasValidQrContext,
    mesaSessionIsActive,
    storedSessionRestaurantId,
    handleValidateTablePin,
  };
}
