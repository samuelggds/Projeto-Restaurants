import { Request, Response } from "express";
import prisma from "../../../config/prisma.js";

const STATUS_MAP: Record<string, string> = {
  PAGO: "PAID",
  PENDENTE: "PENDING",
  ATRASADO: "OVERDUE",
  CANCELADO: "REFUNDED",
};

class GetAllInvoicesController {
  async handle(_req: Request, res: Response) {
    try {
      const invoices = await prisma.invoice.findMany({
        include: {
          restaurant: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      });

      const result = invoices.map((inv) => ({
        id: `#FAT-${String(inv.id).padStart(4, "0")}`,
        restaurant: inv.restaurant.name,
        dueDate: inv.dueDate.toLocaleDateString("pt-BR"),
        value: Number(inv.total),
        method: "Sistema",
        status: STATUS_MAP[inv.status] ?? "PENDING",
      }));

      return res.status(200).json(result);
    } catch (error: unknown) {
      return res.status(400).json({
        message:
          error instanceof Error ? error.message : "Erro ao listar faturas",
      });
    }
  }
}

export default new GetAllInvoicesController();
