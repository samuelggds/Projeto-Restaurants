import { Request, Response } from "express";
import requestPasswordResetService from "../services/RequestPasswordResetService.js";

class RequestPasswordResetController {
  async handle(req: Request, res: Response) {
    try {
      const { email, phone } = req.body;
      const result = await requestPasswordResetService.execute({
        email,
        phone,
      });

      return res.status(200).json(result);
    } catch (error: unknown) {
      return res.status(400).json({
        error:
          error instanceof Error
            ? error.message
            : "Erro ao solicitar recuperacao de senha",
      });
    }
  }
}

export default new RequestPasswordResetController();
