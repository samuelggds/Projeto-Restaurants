import userRepository from '../repositories/UserRepository.js';
import prisma from '../../../config/prisma.js';
import { UserRole } from '@prisma/client';

class DeactivateUserService {
  async execute(userId: number | string) {
    return prisma.$transaction(async (transaction) => {
      const user = await userRepository.findById(userId, transaction);

      if (!user) {
        throw new Error('Usuário não encontrado!');
      }

      if (user.role === UserRole.SUPER_ADMIN) {
        throw new Error('A conta SUPER_ADMIN não pode ser desativada');
      }

      const deactivated = await userRepository.deactivate(userId, transaction);
      await transaction.authRefreshSession.deleteMany({ where: { userId: Number(userId) } });
      return deactivated;
    });
  }
}

export default new DeactivateUserService();
