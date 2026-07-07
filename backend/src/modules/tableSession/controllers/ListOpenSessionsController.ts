import { Request, Response } from "express";
import listOpenSessionService from "../services/ListOpenSessionService.js";

class ListOpenSessionsController {
  async handle(req: Request, res: Response) {
    try {
      const restaurantId = req.user.restaurantId;

      const sessions = await listOpenSessionService.execute({
        restaurantId,
      });

      return res.status(200).json(sessions);
    } catch (error: unknown) {
      return res.status(400).json({
        error:
          error instanceof Error
            ? error.message
            : "Erro ao listar sessoes abertas",
      });
    }
  }
}

export default new ListOpenSessionsController();
