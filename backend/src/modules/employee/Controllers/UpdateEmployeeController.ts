import { Request, Response } from 'express';
import updateEmployeeService from '../services/UpdateEmployeeService.js';

class UpdateEmployeeController {
  async handle(req: Request, res: Response) {
    try {
      const restaurantId = req.user.restaurantId;

      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      const { name, email, phone, subRole } = req.body;

      const employee = await updateEmployeeService.execute({
        id,
        restaurantId,
        name,
        email,
        phone,
        subRole: subRole ?? null,
      });

      return res.status(200).json(employee);
    } catch (error: unknown) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Erro ao atualizar funcionario',
      });
    }
  }
}

export default new UpdateEmployeeController();
