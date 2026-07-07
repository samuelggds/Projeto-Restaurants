import { Request, Response } from "express";
import closeTableSessionService from "../services/CloseTableSessionService.js";

class CloseTableSessionController {
  async handle(req: Request, res: Response) {
    try {
      const closedById = req.user.id;
      const sessionId = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;

      const session = await closeTableSessionService.execute({
        sessionId,
        closedById,
      });

      return res.status(200).json(session);
    } catch (error: unknown) {
      return res.status(400).json({
        error:
          error instanceof Error
            ? error.message
            : "Erro ao fechar sessao de mesa",
      });
    }
  }
}
export default new CloseTableSessionController();
