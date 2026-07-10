import { Request, Response } from "express";
import createOrderService from "../services/CreateOrderService.js";

class CreateOrderController {
  async handle(req: Request, res: Response) {
    try {
      const {
        restaurantId,
        type,
        paymentMethod,
        payOnDelivery,
        payOnDeliveryMethod,
        paid,
        pixPaymentId,
        observation,
        customerName,
        customerCpf,
        customerPhone,
        tableId,
        items,
        address,
        number,
        district,
        city,
        state,
        paymentProof,
        paymentProofImage,
        zipCode,
        complement,
      } = req.body;

      const userId = req.user?.id ?? null;
      const userRestaurantId =
        req.user?.restaurantId ?? req.tableSession?.restaurantId ?? null;

      const order = await createOrderService.execute({
        userId,
        restaurantId,
        userRestaurantId,
        tableSessionId: req.tableSession?.id ?? null,
        tableSessionTableId: req.tableSession?.tableId ?? null,
        type,
        paymentMethod,
        payOnDelivery,
        payOnDeliveryMethod,
        paid,
        pixPaymentId,
        observation,
        customerName,
        customerCpf,
        customerPhone,
        tableId,
        items,
        address,
        number,
        district,
        city,
        paymentProof,
        paymentProofImage,
        state,
        zipCode,
        complement,
      });

      return res.status(201).json(order);
    } catch (error: unknown) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : "Erro ao criar pedido",
      });
    }
  }
}

export default new CreateOrderController();
