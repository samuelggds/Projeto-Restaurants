import { Request, Response } from "express";
import getProfileService from "../services/GetProfileService.js";

class MeController {
  async handle(req: Request, res: Response) {
    try {
      const user = await getProfileService.execute(req.user.id);

      return res.status(200).json(user);
    } catch (error: unknown) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : "Erro ao buscar perfil",
      });
    }
  }
}

export default new MeController();
