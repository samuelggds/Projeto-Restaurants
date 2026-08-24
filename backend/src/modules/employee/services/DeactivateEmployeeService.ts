import prisma from '../../../config/prisma.js';
import employeeRepository from '../repositories/EmployeeRepository.js';

class DeactivateEmployeeService {
  async execute(id: number | string, restaurantId: number) {
    const normalizedUserId = Number(id);
    if (!Number.isInteger(normalizedUserId) || normalizedUserId <= 0) {
      throw new Error('Funcionário inválido!');
    }

    return prisma.$transaction(async (transaction) => {
      const employee = await employeeRepository.findById(
        normalizedUserId,
        restaurantId,
        transaction,
      );

      if (!employee) {
        throw new Error('Funcionário não encontrado!');
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
