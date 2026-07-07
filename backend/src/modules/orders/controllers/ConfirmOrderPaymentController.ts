import { Request, Response } from "express";
import confirmOrderPaymentService from "../services/ConfirmOrderPaymentService.js";

class ConfirmOrderPaymentController {
  async handle(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { restaurantId, role } = req.user;

      const updatedOrder = await confirmOrderPaymentService.execute(
        id,
        restaurantId,
        role,
      );

      return res.status(200).json(updatedOrder);
    } catch (error: unknown) {
      return res.status(400).json({
        error:
          error instanceof Error
            ? error.message
            : "Erro ao confirmar pagamento do pedido",
      });
    }
  }
}

export default new ConfirmOrderPaymentController();
