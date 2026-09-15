import userRepository from '../repositories/UserRepository.js';
import prisma from '../../../config/prisma.js';

class UpdateMfaPreferenceService {
  async execute(userId: number | string, enabled: unknown) {
    if (typeof enabled !== 'boolean') {
      throw new Error('A preferencia de verificacao em duas etapas e obrigatoria');
    }

    return prisma.$transaction(async (transaction) => {
      const user = await userRepository.findById(userId, transaction);
      if (!user) {
        throw new Error('Usuario nao encontrado');
      }

      const updated = await userRepository.updateMfaEnabled(userId, enabled, transaction);
      await transaction.authRefreshSession.deleteMany({ where: { userId: Number(userId) } });
      await transaction.authMfaChallenge.deleteMany({ where: { userId: Number(userId) } });
      return updated;
    });
  }
}

export default new UpdateMfaPreferenceService();
