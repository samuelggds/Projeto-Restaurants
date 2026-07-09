import { Request, Response } from "express";
import loginMfaService from "../services/LoginMfaService.js";

class VerifyLoginMfaController {
  async handle(req: Request, res: Response) {
    try {
      const { mfaToken, code } = req.body;

      const result = await loginMfaService.verifyAndIssueTokens({
        mfaToken,
        code,
      });

      return res.status(200).json(result);
    } catch (error: unknown) {
      return res.status(401).json({
        error:
          error instanceof Error
            ? error.message
            : "Falha na verificacao de login",
      });
    }
  }
}

export default new VerifyLoginMfaController();
