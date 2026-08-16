import { FuncionarioSubRole, UserRole } from '@prisma/client';
import employeeRepository from '../repositories/EmployeeRepository.js';
import bcrypt from 'bcrypt';

type CreateEmployeePayload = {
  name: string;
  email: string;
  password: string;
  phone?: string | null;
  restaurantId: number;
  role?: UserRole;
  subRole?: FuncionarioSubRole | null;
  cpf?: string | null;
};

class CreateEmployeeService {
  async execute({
    name,
    email,
    password,
    phone,
    restaurantId,
    role,
    subRole,
    cpf,
  }: CreateEmployeePayload) {
    const exists = await employeeRepository.findByEmail(email);

    if (exists) {
      throw new Error('Email já está em uso!');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const employee = await employeeRepository.create({
      name,
      email,
      password: passwordHash,
      phone,
      cpf: cpf ? String(cpf).replace(/\D/g, '') : undefined,
      restaurantId,
      role: role || UserRole.FUNCIONARIO,
      subRole: subRole ?? null,
    });

    return employee;
  }
}

export default new CreateEmployeeService();
