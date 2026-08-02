import { Request, Response } from "express";
import prisma from "../../../config/prisma.js";

function formatElapsed(date: Date): string {
  const diffMs = Date.now() - new Date(date).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) return `${diffMin}min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ${diffMin % 60}min`;
  return `${Math.floor(diffH / 24)}d`;
}

class GetAllSupportTicketsController {
  async handle(_req: Request, res: Response) {
    try {
      const grouped = await prisma.supportChatMessage.groupBy({
        by: ["restaurantId"],
        _max: { sentAt: true },
        _count: { id: true },
        orderBy: { _max: { sentAt: "desc" } },
        take: 100,
      });

      if (grouped.length === 0) return res.status(200).json([]);

      const restaurantIds = grouped.map((g) => g.restaurantId);

      const [restaurants, firstMessages] = await Promise.all([
        prisma.restaurant.findMany({
          where: { id: { in: restaurantIds } },
          select: { id: true, name: true },
        }),
        prisma.supportChatMessage.findMany({
          where: {
            restaurantId: { in: restaurantIds },
            senderRole: { not: "SUPER_ADMIN" },
          },
          orderBy: { sentAt: "asc" },
          select: { restaurantId: true, message: true },
          distinct: ["restaurantId"],
        }),
      ]);

      const restaurantMap = new Map(restaurants.map((r) => [r.id, r.name]));
      const subjectMap = new Map(
        firstMessages.map((m) => [m.restaurantId, m.message]),
      );

      const tickets = grouped.map((g) => ({
        id: `#SUP-${String(g.restaurantId).padStart(4, "0")}`,
        restaurant: restaurantMap.get(g.restaurantId) ?? "Desconhecido",
        subject: (subjectMap.get(g.restaurantId) ?? "Sem mensagem").slice(
          0,
          60,
        ),
        priority: "MEDIUM",
        status: "OPEN",
        responsible: "Suporte",
        elapsed: g._max.sentAt ? formatElapsed(g._max.sentAt) : "—",
      }));

      return res.status(200).json(tickets);
    } catch (error: unknown) {
      return res.status(400).json({
        message:
          error instanceof Error ? error.message : "Erro ao listar tickets",
      });
    }
  }
}

export default new GetAllSupportTicketsController();
