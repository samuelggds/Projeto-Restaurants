import { Request, Response } from 'express';
import createEmployeeService from '../services/CreateEmployeeService.js';
import { EmployeeUserSchema } from '../../../validators/EmployeeSchema.js';

class CreateEmployeeController {
  async handle(req: Request, res: Response) {
    try {
      const restaurantId = req.user.restaurantId;

      const { name, email, password, confirmPassword, phone, role, cpf, subRole } = req.body;

      EmployeeUserSchema.parse({
        name,
        email,
        password,
        confirmPassword,
        phone,
        role,
        subRole,
        cpf,
      });

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
