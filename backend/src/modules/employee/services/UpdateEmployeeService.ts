import { FuncionarioSubRole, UserRole } from '@prisma/client';
import employeeRepository from '../repositories/EmployeeRepository.js';

type UpdateEmployeePayload = {
  id: number | string;
  restaurantId: number;
  name?: string;
  phone?: string | null;
  email?: string;
  role?: UserRole;
  subRole?: FuncionarioSubRole | null;
};

class UpdateEmployeeService {
  async execute({ id, restaurantId, name, phone, email, role, subRole }: UpdateEmployeePayload) {
    const employee = await employeeRepository.findById(id, restaurantId);

    if (!employee) {
      throw new Error('Funcionário não encontrado!');
    }

    const emailExists = email ? await employeeRepository.findByEmail(email) : null;

    if (emailExists && emailExists.id !== employee.id) {
      throw new Error('Email já está em uso!');
    }

    return employeeRepository.update(
      id,
      {
        ...(name !== undefined ? { name } : {}),
        ...(phone !== undefined ? { phone: phone || null } : {}),
        ...(email !== undefined ? { email } : {}),
        ...(role !== undefined ? { role } : {}),
        ...(role === UserRole.MOTOQUEIRO
          ? { subRole: null }
          : subRole !== undefined
            ? { subRole }
            : {}),
      },
      restaurantId,
    );
  }
}

export default new UpdateEmployeeService();
