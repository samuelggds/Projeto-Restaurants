import { Request, Response } from "express";
import requestOrderPaymentConfirmationPinService from "../services/RequestOrderPaymentConfirmationPinService.js";

class RequestOrderPaymentConfirmationPinController {
  async handle(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { restaurantId, role } = req.user;

      const result = await requestOrderPaymentConfirmationPinService.execute(
        id,
        restaurantId,
        role,
      );

      return res.status(200).json(result);
    } catch (error: unknown) {
      return res.status(400).json({
        error:
          error instanceof Error
            ? error.message
            : "Erro ao solicitar PIN de confirmacao de pagamento",
      });
    }
  }
}

export default new RequestOrderPaymentConfirmationPinController();
