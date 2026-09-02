import { FuncionarioSubRole, UserRole } from '@prisma/client';
import employeeRepository from '../repositories/EmployeeRepository.js';
import { withTenantDbContext } from '../../../database/tenantDbContext.js';
import { prepareEmployeeCompensationAccessChange } from '../../employeeCompensation/services/employeeCompensationLifecycle.js';
import type { CompensationActor } from '../../employeeCompensation/services/employeeCompensationSupport.js';

type UpdateEmployeePayload = {
  id: number | string;
  restaurantId: number;
  name?: string;
  phone?: string | null;
  email?: string;
  role?: UserRole;
  subRole?: FuncionarioSubRole | null;
  actor: CompensationActor;
};

class UpdateEmployeeService {
  async execute({
    id,
    restaurantId,
    name,
    phone,
    email,
    role,
    subRole,
    actor,
  }: UpdateEmployeePayload) {
    const employee = await employeeRepository.findById(id, restaurantId);

    if (!employee) {
      throw new Error('Funcionário não encontrado!');
    }

    const emailExists = email ? await employeeRepository.findByEmail(email) : null;

    if (emailExists && emailExists.id !== employee.id) {
      throw new Error('Email já está em uso!');
    }

    const updateData = {
      ...(name !== undefined ? { name } : {}),
      ...(phone !== undefined ? { phone: phone || null } : {}),
      ...(email !== undefined ? { email } : {}),
      ...(role !== undefined ? { role } : {}),
      ...(role === UserRole.MOTOQUEIRO
        ? { subRole: null }
        : subRole !== undefined
          ? { subRole }
          : {}),
      ...(role !== undefined || subRole !== undefined ? { authVersion: { increment: 1 } } : {}),
    };
    const nextRole = role ?? employee.role;
    const nextSubRole =
      nextRole === UserRole.MOTOQUEIRO ? null : subRole === undefined ? employee.subRole : subRole;
    const leavingWaiter =
      employee.role === UserRole.FUNCIONARIO &&
      employee.subRole === FuncionarioSubRole.GARCOM &&
      !(nextRole === UserRole.FUNCIONARIO && nextSubRole === FuncionarioSubRole.GARCOM);
    const leavingEmployee =
      employee.role === UserRole.FUNCIONARIO && nextRole !== UserRole.FUNCIONARIO;

    if (!leavingWaiter && !leavingEmployee) {
      return employeeRepository.update(id, updateData, restaurantId);
    }
    return withTenantDbContext(restaurantId, async (db) => {
      await prepareEmployeeCompensationAccessChange({
        db,
        restaurantId,
        employee,
        mode: leavingEmployee ? 'LEAVE_EMPLOYEE' : 'LEAVE_WAITER',
        actor,
      });
      return employeeRepository.update(id, updateData, restaurantId, db);
    });
  }
}

export default new UpdateEmployeeService();
