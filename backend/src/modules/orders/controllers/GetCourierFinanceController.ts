import type { Request, Response } from "express";
import getCourierFinanceService from "../services/GetCourierFinanceService.js";

class GetCourierFinanceController {
  async handle(req: Request, res: Response) {
    try {
      const result = await getCourierFinanceService.execute({
        courierId: Number(req.user.id || 0),
        restaurantId: Number(req.user.restaurantId || 0),
        role: req.user.role,
      });
      return res.json(result);
    } catch (error: unknown) {
      return res.status(403).json({ error: error instanceof Error ? error.message : "Erro ao consultar financeiro" });
    }
  }
}

export default new GetCourierFinanceController();
