import { Request, Response } from "express";
import deactivateUserService from "../services/DeactivateUserService.js";

class DeactivateUserController {
  async handle(req: Request, res: Response) {
    try {
      const userId = req.user.id;

      const user = await deactivateUserService.execute(userId);

      return res.json(user);
    } catch (error: unknown) {
      return res.status(400).json({
        error:
          error instanceof Error ? error.message : "Erro ao desativar usuario",
      });
    }
  }
}

export default new DeactivateUserController();
