import { FuncionarioSubRole } from '@prisma/client';
import employeeRepository from '../repositories/EmployeeRepository.js';

type UpdateEmployeePayload = {
  id: number | string;
  restaurantId: number;
  name?: string;
  phone?: string | null;
  email: string;
  subRole?: FuncionarioSubRole | null;
};

class UpdateEmployeeService {
  async execute({ id, restaurantId, name, phone, email, subRole }: UpdateEmployeePayload) {
    const employee = await employeeRepository.findById(id, restaurantId);

    if (!employee) {
      throw new Error('Funcionário não encontrado!');
    }

    const emailExists = await employeeRepository.findByEmail(email);

    if (emailExists && emailExists.id !== employee.id) {
      throw new Error('Email já está em uso!');
    }

    return employeeRepository.update(
      id,
      { name, phone, email, subRole: subRole ?? null },
      restaurantId,
    );
  }
}

export default new UpdateEmployeeService();
