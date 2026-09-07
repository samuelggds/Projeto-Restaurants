import prisma from '../../../config/prisma.js';
import {
  PASSWORD_RESET_CODE_TTL_MS,
  passwordResetExpiryCutoff,
} from '../security/passwordResetCooldown.js';

type ClaimPasswordResetCode = {
  userId: number;
  authVersion: number;
  previousCodeHash: string | null;
  codeHash: string;
  requestedAt: Date;
  resetAttempts: boolean;
};

class PasswordResetCodeRepository {
  async claim(input: ClaimPasswordResetCode) {
    const { userId, authVersion, previousCodeHash, codeHash, requestedAt, resetAttempts } = input;
    // One conditional write, not read-then-write. Only the winner may send a code.
    // The guard survives reloads, other tabs, API calls and multiple API processes.
    const claimed = await prisma.user.updateMany({
      where: {
        id: userId,
        authVersion,
        resetPasswordCodeHash: previousCodeHash,
        AND: [
          {
            OR: [
              { resetPasswordCodeExpiresAt: null },
              { resetPasswordCodeExpiresAt: { lte: passwordResetExpiryCutoff(requestedAt) } },
            ],
          },
          {
            OR: [
              { resetPasswordLockedUntil: null },
              { resetPasswordLockedUntil: { lte: requestedAt } },
            ],
          },
        ],
      },
      data: {
        resetPasswordCodeHash: codeHash,
        resetPasswordCodeExpiresAt: new Date(requestedAt.getTime() + PASSWORD_RESET_CODE_TTL_MS),
        ...(resetAttempts
          ? { resetPasswordFailedAttempts: 0, resetPasswordLockedUntil: null }
          : {}),
      },
    });
    return claimed.count === 1;
  }
}

export default new PasswordResetCodeRepository();
