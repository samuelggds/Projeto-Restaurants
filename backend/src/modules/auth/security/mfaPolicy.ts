export function getRequiredMfaRoles(_env: NodeJS.ProcessEnv = process.env) {
  return new Set<string>();
}

export function isMfaRequiredForRole(
  _role: unknown,
  _env: NodeJS.ProcessEnv = process.env,
) {
  return false;
}

export function isMfaDisableProtectedRole(
  _role: unknown,
  _env: NodeJS.ProcessEnv = process.env,
) {
  return false;
}
