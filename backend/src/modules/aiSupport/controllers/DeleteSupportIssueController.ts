import { Request, Response } from 'express';
import prisma from '../../../config/prisma.js';
import { io } from '../../../server.js';

class DeleteSupportIssueController {
  async handle(req: Request, res: Response) {
    try {
      if (String(req.user.role).toUpperCase() !== 'ADMIN') {
        return res.status(403).json({ error: 'Somente administradores podem excluir relatos.' });
      }

      const id = Number(req.params.id);
      const restaurantId = Number(req.user.restaurantId);
      if (
        !Number.isInteger(id) ||
        id <= 0 ||
        !Number.isInteger(restaurantId) ||
        restaurantId <= 0
      ) {
        return res.status(400).json({ error: 'Relato inválido.' });
      }

      const deleted = await prisma.$queryRaw<Array<{ id: number }>>`
        DELETE FROM "SupportChatMessage"
        WHERE
          "id" = ${id}
          AND "restaurantId" = ${restaurantId}
          AND "issueStatus" = 'CLOSED'
        RETURNING "id"
      `;
      if (!deleted[0]) {
        return res.status(409).json({
          error:
            'Encerre o relato antes de excluí-lo, ou confirme se ele pertence ao seu restaurante.',
        });
      }

      io.to(`restaurant:${restaurantId}:admin`).emit('support:issue-deleted', { id: String(id) });
      return res.status(200).json({ id: String(id) });
    } catch (error) {
      console.error('Erro ao excluir relato de suporte:', error);
      return res.status(500).json({ error: 'Não foi possível excluir o relato.' });
    }
  }
}

export default new DeleteSupportIssueController();
