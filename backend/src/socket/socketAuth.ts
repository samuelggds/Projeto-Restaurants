import jwt from 'jsonwebtoken';
import type { JwtPayload } from 'jsonwebtoken';
import type { Socket } from 'socket.io';
import tableSessionRepository from '../modules/tableSession/repositories/TableSessionRepository.js';
import { TableSessionStatus } from '@prisma/client';

type SocketAuthNext = (err?: Error) => void;

type SocketUser = JwtPayload & {
  id?: number | null;
  role?: string;
  restaurantId?: number | null;
};

type SocketTableSession = {
  id: number;
  tableId: number;
  tableNumber: number | null;
  restaurantId: number | null;
};

type AppSocket = Socket & {
  user?: SocketUser;
  authType?: 'user' | 'table-session';
  tableSession?: SocketTableSession;
};

export async function socketAuth(socket: AppSocket, next: SocketAuthNext) {
  try {
    const token = socket.handshake.auth?.token;
    const sessionToken = socket.handshake.auth?.sessionToken;

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET) as SocketUser;

      socket.user = decoded;
      socket.authType = 'user';

      return next();
    }

    if (sessionToken) {
      const session = await tableSessionRepository.findBySessionToken(sessionToken);

      if (!session || session.status !== TableSessionStatus.OPEN) {
        return next(new Error('Sessão da mesa inválida'));
      }

      socket.authType = 'table-session';
      socket.tableSession = {
        id: session.id,
        tableId: session.tableId,
        tableNumber: session?.table?.number ?? null,
        restaurantId: session?.table?.restaurantId ?? null,
      };

      return next();
    }

    return next(new Error('Token não enviado'));
  } catch (_error: unknown) {
    return next(new Error('Token inválido'));
  }
}
