import { Request, Response } from "express";
import resetPasswordByCodeService from "../services/ResetPasswordByCodeService.js";

class ResetPasswordByCodeController {
  async handle(req: Request, res: Response) {
    try {
      const { email, code, newPassword, confirmPassword } = req.body;

      const result = await resetPasswordByCodeService.execute({
        email,
        code,
        newPassword,
        confirmPassword,
      });

      return res.status(200).json(result);
    } catch (error: unknown) {
      return res.status(400).json({
        error:
          error instanceof Error ? error.message : "Erro ao redefinir senha",
      });
    }
  }
}

export default new ResetPasswordByCodeController();
