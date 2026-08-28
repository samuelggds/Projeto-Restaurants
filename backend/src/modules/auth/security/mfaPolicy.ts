import { UserRole } from '@prisma/client';

const DEFAULT_REQUIRED_MFA_ROLES = `${UserRole.ADMIN},${UserRole.SUPER_ADMIN}`;

function normalizeRole(role: unknown) {
  return String(role || '')
    .trim()
    .toUpperCase();
}

export function getRequiredMfaRoles(env: NodeJS.ProcessEnv = process.env) {
  const rawValue = env.MFA_REQUIRED_ROLES;
  const configuredValue = rawValue === undefined ? DEFAULT_REQUIRED_MFA_ROLES : String(rawValue);

  return new Set(
    configuredValue
      .split(',')
      .map(normalizeRole)
      .filter(Boolean),
  );
}

export function isMfaRequiredForRole(
  role: unknown,
  env: NodeJS.ProcessEnv = process.env,
) {
  return getRequiredMfaRoles(env).has(normalizeRole(role));
}

export function isMfaDisableProtectedRole(
  role: unknown,
  env: NodeJS.ProcessEnv = process.env,
) {
  const normalizedRole = normalizeRole(role);

  return (
    normalizedRole === UserRole.SUPER_ADMIN ||
    getRequiredMfaRoles(env).has(normalizedRole)
  );
}
