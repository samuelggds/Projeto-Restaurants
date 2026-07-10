import { Request, Response } from "express";
import updateOrderStatusService from "../services/UpdateOrderStatusService.js";
import { OrderStatus } from "@prisma/client";

class UpdateOrderStatusController {
  async handle(req: Request, res: Response) {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;

      const { status, deliveryConfirmationCode } = req.body;
      const normalizedStatus = String(
        status || "",
      ).toUpperCase() as OrderStatus;

      const { restaurantId, role } = req.user;

      const updatedOrder = await updateOrderStatusService.execute(
        id,
        restaurantId,
        normalizedStatus,
        role,
        deliveryConfirmationCode,
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
