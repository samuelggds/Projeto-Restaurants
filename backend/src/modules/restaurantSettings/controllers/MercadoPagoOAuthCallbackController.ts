import { Request, Response } from "express";
import completeMercadoPagoOAuthService from "../services/CompleteMercadoPagoOAuthService.js";

class MercadoPagoOAuthCallbackController {
  private getFrontendBaseUrl() {
    return String(process.env.FRONTEND_URL || "http://localhost:5173")
      .trim()
      .replace(/\/+$/, "");
  }

  private buildAdminRedirect(status: "success" | "error", message?: string) {
    const query = new URLSearchParams({
      mp_oauth: status,
    });

    const normalizedMessage = String(message || "").trim();
    if (normalizedMessage) {
      query.set("message", normalizedMessage);
    }

    return `${this.getFrontendBaseUrl()}/admin?${query.toString()}`;
  }

  async handle(req: Request, res: Response) {
    try {
      const code = String(req.query.code || "").trim();
      const state = String(req.query.state || "").trim();
      const providerError = String(req.query.error || "").trim();
      const providerErrorDescription = String(
        req.query.error_description || "",
      ).trim();

      await completeMercadoPagoOAuthService.execute({
        code,
        state,
        providerError,
        providerErrorDescription,
      });

      return res.redirect(this.buildAdminRedirect("success"));
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Erro ao concluir conexao com Mercado Pago.";

      return res.redirect(this.buildAdminRedirect("error", message));
    }
  }
}

export default new MercadoPagoOAuthCallbackController();
