import { Request, Response } from 'express';
import prisma from '../../../config/prisma.js';

class ListMySupportIssueUpdatesController {
  async handle(req: Request, res: Response) {
    try {
      const role = String(req.user.role || '').toUpperCase();
      if (role !== 'FUNCIONARIO' && role !== 'MOTOQUEIRO') {
        return res.status(403).json({ error: 'Apenas funcionários podem consultar seus relatos.' });
      }

      const userId = Number(req.user.id);
      const restaurantId = Number(req.user.restaurantId);
      if (
        !Number.isInteger(userId) ||
        userId <= 0 ||
        !Number.isInteger(restaurantId) ||
        restaurantId <= 0
      ) {
        return res.status(401).json({ error: 'Sessão inválida para consultar relatos.' });
      }

      const updates = await prisma.$queryRaw<
        Array<{
          id: number;
          issueStatus: string;
          issueResponse: string | null;
          issueResponderName: string | null;
          issueRespondedAt: Date | null;
          issueClosedAt: Date | null;
        }>
      >`
        SELECT "id", "issueStatus", "issueResponse", "issueResponderName", "issueRespondedAt", "issueClosedAt"
        FROM "SupportChatMessage"
        WHERE
          "restaurantId" = ${restaurantId}
          AND "senderUserId" = ${userId}
          AND "issueStatus" IS NOT NULL
          AND ("issueResponse" IS NOT NULL OR "issueStatus" = 'CLOSED')
        ORDER BY "id" DESC
        LIMIT 50
      `;

      return res.status(200).json({
        updates: updates.map((item) => ({
          id: String(item.id),
          status: item.issueStatus,
          response: item.issueResponse,
          responderName: item.issueResponderName,
          respondedAt: item.issueRespondedAt?.toISOString?.() || null,
          closedAt: item.issueClosedAt?.toISOString?.() || null,
        })),
      });
    } catch (error) {
      console.error('Erro ao listar atualizações de relatos do funcionário:', error);
      return res
        .status(500)
        .json({ error: 'Não foi possível carregar as atualizações dos relatos.' });
    }
  }
}

export default new ListMySupportIssueUpdatesController();
