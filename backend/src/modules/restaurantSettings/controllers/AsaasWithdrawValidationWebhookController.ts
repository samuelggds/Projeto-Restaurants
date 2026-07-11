import { Request, Response } from "express";

type AsaasWithdrawValidationPayload = {
  type?: string;
  transfer?: {
    id?: string;
    operationType?: string;
    value?: number;
    description?: string | null;
  };
};

class AsaasWithdrawValidationWebhookController {
  async handle(req: Request, res: Response) {
    try {
      const tokenFromHeader = String(
        req.header("asaas-access-token") || "",
      ).trim();
      const expectedToken = String(
        process.env.ASAAS_WITHDRAW_WEBHOOK_TOKEN ||
          process.env.ASAAS_WEBHOOK_TOKEN ||
          "",
      ).trim();

      if (!expectedToken || tokenFromHeader !== expectedToken) {
        return res.status(401).json({
          status: "REFUSED",
          refuseReason: "Token de webhook invalido.",
        });
      }

      const payload = req.body as AsaasWithdrawValidationPayload;
      const normalizedType = String(payload?.type || "")
        .trim()
        .toUpperCase();

      if (!normalizedType) {
        return res.status(200).json({
          status: "REFUSED",
          refuseReason: "Payload sem tipo de operacao.",
        });
      }

      // Este endpoint aprova saque validado por token para não travar operações.
      // A aplicação pode evoluir para regras antifraude mais rígidas no futuro.
      return res.status(200).json({ status: "APPROVED" });
    } catch (error: unknown) {
      console.error(
        "[ASAAS_WITHDRAW_VALIDATION_WEBHOOK_ERROR]",
        error instanceof Error ? error.message : String(error),
      );

      return res.status(200).json({
        status: "REFUSED",
        refuseReason: "Falha interna na validacao de saque.",
      });
    }
  }
}

export default new AsaasWithdrawValidationWebhookController();
