import { UserRole } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import tableParticipantRepository from '../modules/tableSession/repositories/TableParticipantRepository.js';
import {
  getParticipantCookieName,
  hashParticipantToken,
  isParticipantTokenShape,
  parseCookieHeader,
} from '../modules/tableSession/security/participantToken.js';

export async function tableParticipantMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const session = req.tableSession;
    if (!session) {
      return res.status(401).json({
        error: 'Entre novamente na mesa pelo QR Code.',
        code: 'TABLE_SESSION_REQUIRED',
      });
    }

    const authenticatedCustomerId =
      req.user?.role === UserRole.CLIENTE && Number(req.user.id) > 0 ? Number(req.user.id) : null;
    let participant = authenticatedCustomerId
      ? await tableParticipantRepository.findByUser(
          authenticatedCustomerId,
          session.id,
          session.restaurantId,
        )
      : null;

    if (!participant) {
      const cookieName = getParticipantCookieName(session.publicId);
      const rawToken = parseCookieHeader(req.headers.cookie)[cookieName];
      if (isParticipantTokenShape(rawToken)) {
        participant = await tableParticipantRepository.findGuestByTokenHash(
          hashParticipantToken(rawToken),
          session.id,
          session.restaurantId,
        );
      }
    }

    if (!participant) {
      return res.status(401).json({
        error: 'Sua identificação nesta mesa expirou. Leia o QR Code novamente.',
        code: 'TABLE_PARTICIPANT_REQUIRED',
      });
    }

    req.tableParticipant = {
      id: participant.id,
      publicId: participant.publicId,
      tableSessionId: participant.tableSessionId,
      restaurantId: participant.restaurantId,
      userId: participant.userId,
      displayName: participant.displayName || participant.user?.name || null,
      authenticated: Boolean(participant.userId),
    };

    return next();
  } catch (error: unknown) {
    return res.status(500).json({
      error: 'Não foi possível validar sua identificação nesta mesa.',
      ...(process.env.NODE_ENV === 'development' && error instanceof Error
        ? { detail: error.message }
        : {}),
    });
  }
}
