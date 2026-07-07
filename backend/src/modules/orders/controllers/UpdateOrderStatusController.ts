import { Request, Response } from "express";
import updateOrderStatusService from "../services/UpdateOrderStatusService.js";

class UpdateOrderStatusController {
  async handle(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const { status } = req.body;

      const { restaurantId, role } = req.user;

      const updatedOrder = await updateOrderStatusService.execute(
        id,
        restaurantId,
        status,
        role,
      );

      return res.status(200).json(updatedOrder);
    } catch (error: unknown) {
      return res.status(400).json({
        error:
          error instanceof Error
            ? error.message
            : "Erro ao atualizar status do pedido",
      });
    }
  }
}

export default new UpdateOrderStatusController();
