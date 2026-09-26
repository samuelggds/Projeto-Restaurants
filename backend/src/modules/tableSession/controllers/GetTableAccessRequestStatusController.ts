import type { Request, Response } from 'express';
import tableAccessRequestService from '../services/TableAccessRequestService.js';
import { getParticipantCookieOptions } from '../security/participantToken.js';

class GetTableAccessRequestStatusController {
  async handle(req: Request, res: Response) {
    try {
      const result = await tableAccessRequestService.resolve({
        publicId: String(req.body?.requestId || ''),
        requestToken: String(req.body?.requestToken || ''),
        restaurantId: Number(req.body?.restaurantId || 0),
      });

      if ('participantToken' in result && result.participantToken && result.participantCookieExpiresAt) {
        res.cookie(
          result.participantCookieName,
          result.participantToken,
          getParticipantCookieOptions(result.participantCookieExpiresAt),
        );
      }

      const {
        participantToken,
        participantCookieName,
        participantCookieExpiresAt,
        clearParticipantCookie,
        ...publicResult
      } = result as typeof result & {
        participantToken?: string;
        participantCookieName?: string;
        participantCookieExpiresAt?: Date | null;
        clearParticipantCookie?: boolean;
      };

      return res.status(200).json(publicResult);
    } catch (error: unknown) {
      return res.status(400).json({
        error:
          error instanceof Error
            ? error.message
            : 'Não foi possível consultar a liberação desta mesa.',
      });
    }
  }
}

export default new GetTableAccessRequestStatusController();
