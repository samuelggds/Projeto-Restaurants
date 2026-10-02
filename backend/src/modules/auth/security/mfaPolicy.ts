export function getRequiredMfaRoles(env: NodeJS.ProcessEnv = process.env) {
  return new Set(
    String(env.MFA_REQUIRED_ROLES || '')
      .split(',')
      .map((role) => role.trim().toUpperCase())
      .filter(Boolean),
  );
}

export function isMfaRequiredForRole(
  role: unknown,
  env: NodeJS.ProcessEnv = process.env,
) {
  const normalizedRole = String(role || '').trim().toUpperCase();
  return Boolean(normalizedRole && getRequiredMfaRoles(env).has(normalizedRole));
}

export function isMfaDisableProtectedRole(
  role: unknown,
  env: NodeJS.ProcessEnv = process.env,
) {
  return isMfaRequiredForRole(role, env);
}
