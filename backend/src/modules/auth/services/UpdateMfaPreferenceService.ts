import userRepository from '../repositories/UserRepository.js';
import prisma from '../../../config/prisma.js';

class UpdateMfaPreferenceService {
  async execute(userId: number | string, enabled: unknown) {
    if (typeof enabled !== 'boolean') {
      throw new Error('A preferencia de verificacao em duas etapas e obrigatoria');
    }

    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('Usuario nao encontrado');
    }

    return prisma.$transaction(async (transaction) => {
      const updated = await userRepository.updateMfaEnabled(userId, enabled, transaction);
      await transaction.authRefreshSession.deleteMany({ where: { userId: Number(userId) } });
      return updated;
    });
  }
}

export default new UpdateMfaPreferenceService();
