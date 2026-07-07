import { Request, Response } from "express";
import generateOrderPaymentConfirmationPinService from "../services/GenerateOrderPaymentConfirmationPinService.js";

class GenerateOrderPaymentConfirmationPinController {
  async handle(req: Request, res: Response) {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const { restaurantId } = req.user;

      const result = await generateOrderPaymentConfirmationPinService.execute(
        id,
        restaurantId,
      );

      return res.status(200).json(result);
    } catch (error: unknown) {
      return res.status(400).json({
        error:
          error instanceof Error
            ? error.message
            : "Erro ao gerar PIN de confirmacao de pagamento",
      });
    }
  }
}

export default new GenerateOrderPaymentConfirmationPinController();
