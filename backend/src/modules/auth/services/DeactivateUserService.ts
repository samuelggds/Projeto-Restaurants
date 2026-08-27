import userRepository from '../repositories/UserRepository.js';
import prisma from '../../../config/prisma.js';

class DeactivateUserService {
  async execute(userId: number | string) {
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new Error('Usuário não encontrado!');
    }

    return prisma.$transaction(async (transaction) => {
      const deactivated = await userRepository.deactivate(userId, transaction);
      await transaction.authRefreshSession.deleteMany({ where: { userId: Number(userId) } });
      return deactivated;
    });
  }
}

export default new DeactivateUserService();
