import type { Request, Response } from "express";
import service from "../services/CompletePagBankOAuthService.js";

class PagBankOAuthCallbackController {
  async handle(req: Request, res: Response) {
    const frontendUrl = String(process.env.FRONTEND_URL || "http://localhost:5173")
      .trim().replace(/\/+$/, "");
    try {
      if (req.query.error) {
        throw new Error(String(req.query.error_description || req.query.error));
      }
      await service.execute({
        code: String(req.query.code || ""),
        state: String(req.query.state || ""),
      });
      return res.redirect(`${frontendUrl}/admin?pagbank_oauth=success`);
    } catch (error) {
      const query = new URLSearchParams({
        pagbank_oauth: "error",
        message: error instanceof Error ? error.message : "Erro ao conectar PagBank.",
      });
      return res.redirect(`${frontendUrl}/admin?${query.toString()}`);
    }
  }
}

export default new PagBankOAuthCallbackController();
