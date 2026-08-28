import userRepository from '../repositories/UserRepository.js';
import bcrypt from 'bcrypt';
import prisma from '../../../config/prisma.js';
import { validateStrongPassword } from '../security/passwordPolicy.js';

class UpdatePasswordService {
  async execute(userId: number | string, oldPassword: string, newPassword: string) {
    if (
      typeof oldPassword !== 'string' ||
      typeof newPassword !== 'string' ||
      !oldPassword ||
      newPassword.length < 6 ||
      newPassword.length > 128
    ) {
      throw new Error('Informe a senha atual e uma nova senha entre 6 e 128 caracteres');
    }

    const user = await userRepository.findByIdWithPassword(userId);

    if (!user) {
      throw new Error('Usuário não encontrado!');
    }

    if (user.mustChangePassword || String(user.role || '').toUpperCase() === 'SUPER_ADMIN') {
      validateStrongPassword(newPassword);
    }

    const passwordCompare = await bcrypt.compare(oldPassword, user.password);

    if (!passwordCompare) {
      throw new Error('Senha atual incorreta!');
    }

    if (await bcrypt.compare(newPassword, user.password)) {
      throw new Error('A nova senha deve ser diferente da senha atual.');
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
