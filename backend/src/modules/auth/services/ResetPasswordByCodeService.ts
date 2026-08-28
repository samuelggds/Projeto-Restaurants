import bcrypt from 'bcrypt';
import prisma from '../../../config/prisma.js';
import userRepository from '../repositories/UserRepository.js';
import { resetPasswordSchema } from '../../../validators/ForgotPasswordValidator.js';
import { validateStrongPassword } from '../security/passwordPolicy.js';

const MAX_RESET_ATTEMPTS = 5;
const RESET_LOCK_MS = 30 * 60 * 1000;
const INVALID_CODE_MESSAGE = 'Codigo invalido ou expirado';

class ResetPasswordByCodeService {
  async execute({
    email,
    phone,
    code,
    newPassword,
    confirmPassword,
  }: {
    email?: string;
    phone?: string;
    code: string;
    newPassword: string;
    confirmPassword: string;
  }) {
    resetPasswordSchema.parse({ email, phone, code, newPassword, confirmPassword });

    const normalizedEmail = String(email || '').trim();
    const normalizedPhone = String(phone || '').trim();
    const user = normalizedEmail
      ? await userRepository.findByEmail(normalizedEmail)
      : await userRepository.findByPhone(normalizedPhone);
    const now = new Date();

    if (
      !user?.resetPasswordCodeHash ||
      !user.resetPasswordCodeExpiresAt ||
      new Date(user.resetPasswordCodeExpiresAt).getTime() <= now.getTime() ||
      Number(user.resetPasswordFailedAttempts || 0) >= MAX_RESET_ATTEMPTS ||
      (user.resetPasswordLockedUntil &&
        new Date(user.resetPasswordLockedUntil).getTime() > now.getTime())
    ) {
      throw new Error(INVALID_CODE_MESSAGE);
    }

    const isCodeValid = await bcrypt.compare(code, user.resetPasswordCodeHash);
    if (!isCodeValid) {
      await prisma.$transaction(async (transaction) => {
        const incremented = await transaction.user.updateMany({
          where: {
            id: user.id,
            resetPasswordCodeHash: user.resetPasswordCodeHash,
            resetPasswordCodeExpiresAt: { gt: now },
            resetPasswordFailedAttempts: { lt: MAX_RESET_ATTEMPTS },
            OR: [{ resetPasswordLockedUntil: null }, { resetPasswordLockedUntil: { lte: now } }],
          },
          data: { resetPasswordFailedAttempts: { increment: 1 } },
        });
        if (incremented.count !== 1) return;

        const current = await transaction.user.findUnique({
          where: { id: user.id },
          select: { resetPasswordFailedAttempts: true },
        });
        if (Number(current?.resetPasswordFailedAttempts || 0) >= MAX_RESET_ATTEMPTS) {
          await transaction.user.updateMany({
            where: {
              id: user.id,
              resetPasswordCodeHash: user.resetPasswordCodeHash,
              resetPasswordFailedAttempts: { gte: MAX_RESET_ATTEMPTS },
            },
            data: {
              resetPasswordCodeHash: null,
              resetPasswordCodeExpiresAt: null,
              resetPasswordLockedUntil: new Date(now.getTime() + RESET_LOCK_MS),
            },
          });
        }
      });
      throw new Error(INVALID_CODE_MESSAGE);
    }

    const requiresStrongPassword =
      user.mustChangePassword || String(user.role || '').toUpperCase() === 'SUPER_ADMIN';
    if (requiresStrongPassword) {
      validateStrongPassword(newPassword);
    }

    const passwordHash = await bcrypt.hash(newPassword, requiresStrongPassword ? 12 : 10);
    const consumed = await prisma.$transaction(async (transaction) => {
      const claimed = await transaction.user.updateMany({
        where: {
          id: user.id,
          resetPasswordCodeHash: user.resetPasswordCodeHash,
          resetPasswordCodeExpiresAt: { gt: now },
          resetPasswordFailedAttempts: { lt: MAX_RESET_ATTEMPTS },
          OR: [{ resetPasswordLockedUntil: null }, { resetPasswordLockedUntil: { lte: now } }],
        },
        data: {
          password: passwordHash,
          resetPasswordCodeHash: null,
          resetPasswordCodeExpiresAt: null,
          resetPasswordFailedAttempts: 0,
          resetPasswordLockedUntil: null,
          mustChangePassword: false,
          active: true,
          authVersion: { increment: 1 },
        },
      });
      if (claimed.count === 1) {
        await transaction.authRefreshSession.deleteMany({ where: { userId: user.id } });
      }
      return claimed.count === 1;
    });

    if (!consumed) throw new Error(INVALID_CODE_MESSAGE);
    return { message: 'Senha redefinida e conta reativada quando necessário' };
  }
}

export default new ResetPasswordByCodeService();
