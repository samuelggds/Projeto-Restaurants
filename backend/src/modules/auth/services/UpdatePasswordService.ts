import userRepository from '../repositories/UserRepository.js';
import bcrypt from 'bcrypt';
import prisma from '../../../config/prisma.js';

class UpdatePasswordService {
  async execute(userId: number | string, oldPassword: string, newPassword: string) {
    if (
      typeof oldPassword !== 'string' ||
      typeof newPassword !== 'string' ||
      !oldPassword ||
      newPassword.length < 6
    ) {
      throw new Error('Informe a senha atual e uma nova senha com ao menos 6 caracteres');
    }

    const user = await userRepository.findByIdWithPassword(userId);

    if (!user) {
      throw new Error('Usuário não encontrado!');
    }

    const passwordCompare = await bcrypt.compare(oldPassword, user.password);

    if (!passwordCompare) {
      throw new Error('Senha atual incorreta!');
    }

    const hashPassword = await bcrypt.hash(newPassword, 10);

    return prisma.$transaction(async (transaction) => {
      const updated = await userRepository.updatePassword(userId, hashPassword, transaction);
      await transaction.authRefreshSession.deleteMany({ where: { userId: Number(userId) } });
      return updated;
    });
  }
}

export default new UpdatePasswordService();
