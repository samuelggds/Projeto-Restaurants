import type { Request, Response } from 'express';
import joinTableSessionService, {
  TableSessionJoinError,
} from '../services/JoinTableSessionService.js';
import { TableParticipantIdentityRequiredError } from '../services/JoinTableParticipantService.js';
import { PublicTableResolutionError } from '../../table/services/ResolvePublicTableService.js';
import { getParticipantCookieOptions, parseCookieHeader } from '../security/participantToken.js';

class JoinTableSessionController {
  async handle(req: Request, res: Response) {
    try {
      const result = await joinTableSessionService.execute({
        tableId: req.body?.tableId,
        tableNumber: req.body?.tableNumber,
        tableToken: req.body?.tableToken || req.body?.token,
        restaurantId: req.body?.restaurantId,
        restaurantSlug: req.body?.restaurantSlug || req.body?.slug,
        authenticatedUser: req.user ? { id: req.user.id, role: req.user.role } : null,
        cookies: parseCookieHeader(req.headers.cookie),
        displayName: req.body?.displayName ?? req.body?.guestName,
        phone: req.body?.phone,
      });
      const {
        participantToken,
        participantCookieName,
        participantCookieExpiresAt,
        clearParticipantCookie,
        ...publicResult
      } = result;

      if (clearParticipantCookie) {
        res.clearCookie(participantCookieName, getParticipantCookieOptions(new Date(0)));
      } else if (participantToken && participantCookieExpiresAt) {
        res.cookie(
          participantCookieName,
          participantToken,
          getParticipantCookieOptions(participantCookieExpiresAt),
        );
      }

      return res.status(200).json(publicResult);
    } catch (error: unknown) {
      const isTypedError =
        error instanceof PublicTableResolutionError ||
        error instanceof TableSessionJoinError ||
        error instanceof TableParticipantIdentityRequiredError;
      const statusCode = isTypedError ? error.statusCode : 400;
      return res.status(statusCode).json({
        error: error instanceof Error ? error.message : 'Não foi possível acessar a mesa.',
        ...(isTypedError ? { code: error.code } : {}),
      });
    }
  }
}

export default new JoinTableSessionController();
