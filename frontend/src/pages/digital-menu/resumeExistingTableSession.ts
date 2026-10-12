import tableSessionService from '../../Services/tableSessionService';
import { readJsonStorage } from '../../shared/storage/jsonStorage';
import type { StoredTableSession } from '../Home/domain/tableSession';

export class TemporaryTableResumeError extends Error {}

type ResumeInput = { routeTableNumber: number; restaurantId: number | null; restaurantSlug: string };

export function matchesStoredTableSession(
  stored: StoredTableSession | null,
  routeTableNumber: number,
  restaurantId: number | null,
): boolean {
  return Boolean(stored?.sessionToken && stored.sessionId && restaurantId &&
    Number(stored.restaurantId) === restaurantId &&
    (Number(stored.tableNumber) === routeTableNumber ||
      Number(stored.originalTableNumber) === routeTableNumber));
}

export async function resumeExistingTableSession(input: ResumeInput) {
  const stored = readJsonStorage<StoredTableSession | null>('tableSession', null);
  if (!matchesStoredTableSession(stored, input.routeTableNumber, input.restaurantId) ||
      !stored || !input.restaurantId) return null;

  const wasTransferred =
    Number(stored.originalTableNumber) === input.routeTableNumber &&
    Number(stored.tableNumber) !== input.routeTableNumber;
  try {
    // Verify the credential and participant on the server before preserving the session.
    const current = await tableSessionService.getCurrentSession();
    const tableId = Number(current?.tableId);
    const tableNumber = Number(current?.tableNumber);
    if (Number(current?.sessionId) !== Number(stored.sessionId) ||
        Number(current?.restaurantId) !== input.restaurantId ||
        !Number.isSafeInteger(tableId) || tableId <= 0 ||
        !Number.isSafeInteger(tableNumber) || tableNumber <= 0 ||
        !current?.participant?.publicId) {
      throw new Error('Sessão anterior não corresponde ao atendimento autenticado.');
    }

    const session: StoredTableSession = {
      ...stored,
      tableId,
      tableNumber,
      originalTableNumber: stored.originalTableNumber ||
        (tableNumber !== input.routeTableNumber ? input.routeTableNumber : null),
      sessionStatus: current.sessionStatus === 'CLOSING_REQUESTED' ? 'CLOSING_REQUESTED' : 'OPEN',
      tableOrderingEnabled: current.sessionStatus === 'OPEN' &&
        current.participant.orderingBlocked !== true &&
        stored.tableOrderingEnabled !== false,
    };
    return {
      session,
      table: {
        id: tableId,
        number: tableNumber,
        restaurantId: input.restaurantId,
        restaurantSlug: input.restaurantSlug,
        tableOrderingEnabled: session.tableOrderingEnabled !== false,
        waiterCallEnabled: stored.waiterCallEnabled !== false,
        billRequestEnabled: stored.billRequestEnabled !== false,
      },
    };
  } catch (error: unknown) {
    const status = Number((error as { response?: { status?: number } })?.response?.status || 0);
    if (!status || status >= 500) {
      throw new TemporaryTableResumeError(
        'Não foi possível verificar sua sessão. Tente novamente sem escanear outra mesa.',
        { cause: error },
      );
    }
    if (wasTransferred) {
      throw new Error('A mesa transferida não pôde ser validada. Solicite auxílio ao garçom.', { cause: error });
    }
    return null;
  }
}
