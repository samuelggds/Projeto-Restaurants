import { Request, Response } from "express";
import getCurrentTableOrderService from "../services/GetCurrentTableOrderService.js";

class GetCurrentTableOrderController {
  async handle(req: Request, res: Response) {
    try {
      const tableId = req.tableSession?.tableId;
      const restaurantId = req.tableSession?.restaurantId;

      const order = await getCurrentTableOrderService.execute(
        Number(tableId || 0),
        Number(restaurantId || 0),
      );

      return res.status(200).json({ order });
    } catch (error: unknown) {
      return res.status(400).json({
        error:
          error instanceof Error
            ? error.message
            : "Erro ao obter pedido atual da mesa",
      });
    }
  }
}

export default new GetCurrentTableOrderController();
