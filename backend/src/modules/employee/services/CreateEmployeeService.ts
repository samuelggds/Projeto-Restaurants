import { FuncionarioSubRole, UserRole } from '@prisma/client';
import employeeRepository from '../repositories/EmployeeRepository.js';
import bcrypt from 'bcrypt';
import { validatePassword } from '../../auth/security/passwordPolicy.js';
import { randomUUID } from 'node:crypto';

type CreateEmployeePayload = {
  name: string;
  username: string;
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
    username,
    password,
    phone,
    restaurantId,
    role,
    subRole,
    cpf,
  }: CreateEmployeePayload) {
    validatePassword(password);

    const exists = await employeeRepository.findByUsername(username, restaurantId);

    if (exists) {
      throw new Error('Este usuário já está em uso neste restaurante.');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const normalizedRole = role || UserRole.FUNCIONARIO;
    const internalEmail = `staff-${randomUUID()}@accounts.gastronexa.local`;

    const employee = await employeeRepository.create({
      name,
      username,
      email: internalEmail,
      password: passwordHash,
      phone,
      cpf: cpf ? String(cpf).replace(/\D/g, '') : undefined,
      restaurantId,
      role: normalizedRole,
      subRole:
        normalizedRole === UserRole.FUNCIONARIO ? (subRole ?? FuncionarioSubRole.ATENDENTE) : null,
    });

    return employee;
  }
}

export default new CreateEmployeeService();
