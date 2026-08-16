import { Request, Response } from 'express';
import reactivateEmployeeService from '../services/ReactivateEmployeeService.js';

class ReactivateEmployeeController {
  async handle(req: Request, res: Response) {
    try {
      const restaurantId = req.user.restaurantId;
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      const employee = await reactivateEmployeeService.execute(id, restaurantId);

      return res.status(200).json(employee);
    } catch (error: unknown) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Erro ao reativar funcionário',
      });
    }
  }
}

export default new ReactivateEmployeeController();
