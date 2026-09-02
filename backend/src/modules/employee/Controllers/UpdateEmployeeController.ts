import { Request, Response } from 'express';
import updateEmployeeService from '../services/UpdateEmployeeService.js';
import { UpdateEmployeeSchema } from '../../../validators/EmployeeSchema.js';

class UpdateEmployeeController {
  async handle(req: Request, res: Response) {
    try {
      const restaurantId = req.user.restaurantId;

      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      const { name, email, phone, role, subRole } = UpdateEmployeeSchema.parse(req.body);

      const employee = await updateEmployeeService.execute({
        id,
        restaurantId,
        name,
        email,
        phone,
        role,
        subRole,
        actor: { userId: Number(req.user.id), role: String(req.user.role) },
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
