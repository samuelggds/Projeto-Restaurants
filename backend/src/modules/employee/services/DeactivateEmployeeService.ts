import prisma from '../../../config/prisma.js';
import employeeRepository from '../repositories/EmployeeRepository.js';
import { setTenantDbContext } from '../../../database/tenantDbContext.js';
import { prepareEmployeeCompensationAccessChange } from '../../employeeCompensation/services/employeeCompensationLifecycle.js';
import { UserRole } from '@prisma/client';
import type { CompensationActor } from '../../employeeCompensation/services/employeeCompensationSupport.js';

class DeactivateEmployeeService {
  async execute(id: number | string, restaurantId: number, actor: CompensationActor) {
    const normalizedUserId = Number(id);
    if (!Number.isInteger(normalizedUserId) || normalizedUserId <= 0) {
      throw new Error('Funcionário inválido!');
    }

    return prisma.$transaction(async (transaction) => {
      await setTenantDbContext(transaction, restaurantId);
      const employee = await employeeRepository.findById(
        normalizedUserId,
        restaurantId,
        transaction,
      );

      if (!employee) {
        throw new Error('Funcionário não encontrado!');
      }

      if (employee.role === UserRole.FUNCIONARIO) {
        await prepareEmployeeCompensationAccessChange({
          db: transaction,
          restaurantId,
          employee,
          mode: 'DEACTIVATE',
          actor,
        });
      }

      const deactivated = await employeeRepository.deactivate(
        normalizedUserId,
        restaurantId,
        transaction,
      );
      await transaction.authRefreshSession.deleteMany({
        where: { userId: normalizedUserId },
      });

      return deactivated;
    });
  }
}

export default new DeactivateEmployeeService();
