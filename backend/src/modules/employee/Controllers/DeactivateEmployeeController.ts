import { Request, Response } from "express";
import deactivateEmployeeService from "../services/DeactivateEmployeeService.js";

class DeactivateEmployeeController {
  async handle(req: Request, res: Response) {
    try {
      const restaurantId = req.user.restaurantId;
      const { id } = req.params;

      const employee = await deactivateEmployeeService.execute(
        id,
        restaurantId,
      );
      return res.status(200).json(employee);
    } catch (error: unknown) {
      return res.status(400).json({
        error:
          error instanceof Error
            ? error.message
            : "Erro ao desativar funcionario",
      });
    }
  }
}

export default new DeactivateEmployeeController();
