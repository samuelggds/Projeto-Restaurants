// Keep the TTL and resend window together: the persisted expiry is the issue marker.
// This avoids an extra column/migration while preserving the existing 15-minute codes.
export const PASSWORD_RESET_CODE_TTL_MS = 15 * 60 * 1000;
export const PASSWORD_RESET_RESEND_COOLDOWN_MS = 30 * 1000;

export function passwordResetExpiryCutoff(now: Date) {
  return new Date(
    now.getTime() + PASSWORD_RESET_CODE_TTL_MS - PASSWORD_RESET_RESEND_COOLDOWN_MS,
  );
}

export function isPasswordResetCoolingDown(expiresAt: Date | null, now: Date) {
  return Boolean(expiresAt && expiresAt.getTime() > passwordResetExpiryCutoff(now).getTime());
}
