import { Request, Response } from 'express';
import prisma from '../../../config/prisma.js';
import { io } from '../../../server.js';

const validStatuses = new Set(['OPEN', 'IN_PROGRESS', 'CLOSED']);

class UpdateSupportIssueController {
  async handle(req: Request, res: Response) {
    try {
      if (String(req.user.role).toUpperCase() !== 'ADMIN') {
        return res.status(403).json({ error: 'Somente administradores podem atender relatos.' });
      }
      const id = Number(req.params.id);
      const status = String(req.body?.status || '').toUpperCase();
      const response =
        typeof req.body?.response === 'string' ? req.body.response.replace(/\s+/g, ' ').trim() : '';
      if (!Number.isInteger(id) || !validStatuses.has(status)) {
        return res.status(400).json({ error: 'Relato ou status inválido.' });
      }
      if (response && (response.length < 3 || response.length > 1200)) {
        return res.status(400).json({ error: 'A resposta deve ter entre 3 e 1200 caracteres.' });
      }
      const responder = response
        ? await prisma.user.findFirst({
            where: { id: Number(req.user.id), restaurantId: Number(req.user.restaurantId), role: 'ADMIN' },
            select: { name: true },
          })
        : null;
      if (response && !responder) {
        return res.status(403).json({ error: 'Administrador não encontrado para registrar a resposta.' });
      }
      const result = await prisma.$queryRaw<Array<{ id: number; senderUserId: number | null }>>`
        UPDATE "SupportChatMessage"
        SET
          "issueStatus" = ${status},
          "issueResponse" = COALESCE(${response || null}, "issueResponse"),
          "issueResponderName" = COALESCE(${responder?.name || null}, "issueResponderName"),
          "issueRespondedAt" = CASE WHEN ${Boolean(response)} THEN ${new Date()} ELSE "issueRespondedAt" END,
          "issueClosedAt" = ${status === 'CLOSED' ? new Date() : null}
        WHERE "id" = ${id} AND "restaurantId" = ${Number(req.user.restaurantId)} AND "issueStatus" IS NOT NULL
        RETURNING "id", "senderUserId"
      `;
      if (!result[0]) return res.status(404).json({ error: 'Relato não encontrado.' });
      const payload = {
        id: String(result[0].id),
        status,
        response: response || null,
        responderName: responder?.name || null,
      };
      io.to(`restaurant:${Number(req.user.restaurantId)}:admin`).emit(
        'support:issue-updated',
        payload,
      );
      if (result[0].senderUserId && (status === 'CLOSED' || response)) {
        io.to(`user:${result[0].senderUserId}`).emit('support:issue-updated', payload);
      }
      return res.status(200).json(payload);
    } catch (error) {
      console.error('Erro ao atualizar relato de suporte:', error);
      return res.status(500).json({ error: 'Não foi possível atualizar o relato.' });
    }
  }
}
export default new UpdateSupportIssueController();
