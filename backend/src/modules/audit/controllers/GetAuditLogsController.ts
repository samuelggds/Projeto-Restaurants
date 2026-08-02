import { Request, Response } from "express";
import prisma from "../../../config/prisma.js";

class GetAuditLogsController {
  async handle(_req: Request, res: Response) {
    try {
      const logs = await prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 200,
      });

      const result = logs.map((log) => ({
        id: `AUD-${String(log.id).padStart(4, "0")}`,
        date: log.createdAt.toLocaleString("pt-BR"),
        user: log.userName ?? "—",
        role: log.userRole ?? "—",
        restaurant: log.restaurantName ?? "—",
        action: log.action,
        resource: log.resource ?? "—",
        ip: log.ipAddress ?? "—",
        result: log.result,
      }));

      return res.status(200).json(result);
    } catch (error: unknown) {
      return res.status(400).json({
        message:
          error instanceof Error
            ? error.message
            : "Erro ao listar logs de auditoria",
      });
    }
  }
}

export default new GetAuditLogsController();
