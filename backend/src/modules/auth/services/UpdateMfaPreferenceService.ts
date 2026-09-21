import userRepository from '../repositories/UserRepository.js';
import prisma from '../../../config/prisma.js';
import bcrypt from 'bcrypt';
import { isMfaDisableProtectedRole } from '../security/mfaPolicy.js';

export class MfaPreferenceError extends Error {}

class UpdateMfaPreferenceService {
  async execute(userId: number | string, enabled: unknown, currentPassword?: unknown) {
    if (typeof enabled !== 'boolean') {
      throw new MfaPreferenceError('A preferencia de verificacao em duas etapas e obrigatoria');
    }

    return prisma.$transaction(async (transaction) => {
      const user = await userRepository.findByIdWithPassword(userId, transaction);
      if (!user?.active) {
        throw new MfaPreferenceError('Usuario nao encontrado');
      }
      if (!enabled && isMfaDisableProtectedRole(user.role)) {
        throw new MfaPreferenceError('A verificação em duas etapas é obrigatória para esta conta.');
      }
      if (
        typeof currentPassword !== 'string' ||
        !currentPassword ||
        Buffer.byteLength(currentPassword, 'utf8') > 72 ||
        !(await bcrypt.compare(currentPassword, user.password))
      ) {
        throw new MfaPreferenceError(
          'Confirme sua senha atual para alterar a verificação em duas etapas.',
        );
      }
      const updated = await userRepository.updateMfaEnabled(
        userId,
        enabled,
        transaction,
        user.authVersion,
      );
      await transaction.authRefreshSession.deleteMany({ where: { userId: Number(userId) } });
      await transaction.authMfaChallenge?.deleteMany({ where: { userId: Number(userId) } });
      return updated;
    });
  }
}

export default new UpdateMfaPreferenceService();
