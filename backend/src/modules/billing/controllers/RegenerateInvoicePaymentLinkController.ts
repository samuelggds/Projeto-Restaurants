import { Request, Response } from "express";
import regenerateInvoicePaymentLinkService from "../services/RegenerateInvoicePaymentLinkService.js";

class RegenerateInvoicePaymentLinkController {
  async handle(req: Request, res: Response) {
    try {
      const invoiceId = Number(req.params.id);
      const restaurantId = Number(req.user.restaurantId);

      if (!invoiceId) {
        return res.status(400).json({ error: "Invoice ID inválido." });
      }

      const result = await regenerateInvoicePaymentLinkService.execute({
        invoiceId,
        restaurantId,
      });

      return res.status(200).json(result);
    } catch (error: unknown) {
      return res.status(400).json({
        error:
          error instanceof Error
            ? error.message
            : "Erro ao regenerar link de pagamento.",
      });
    }
  }
}

export default new RegenerateInvoicePaymentLinkController();
