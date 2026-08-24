import { Request, Response } from 'express';
import createEmployeeService from '../services/CreateEmployeeService.js';
import { EmployeeUserSchema } from '../../../validators/EmployeeSchema.js';

class CreateEmployeeController {
  async handle(req: Request, res: Response) {
    try {
      const restaurantId = req.user.restaurantId;

      const parsed = EmployeeUserSchema.parse({
        ...req.body,
      });
      const { name, email, password, phone, role, cpf, subRole } = parsed;

      const employee = await createEmployeeService.execute({
        name,
        email,
        password,
        phone,
        role,
        subRole: subRole ?? null,
        cpf,
        restaurantId,
      });

      return res.status(201).json(employee);
    } catch (error: unknown) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Erro ao criar funcionario',
      });
    }
  }
}

export default new CreateEmployeeController();
