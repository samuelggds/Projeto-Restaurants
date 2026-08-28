import path from 'node:path';
import { collectStrongPasswordErrors } from '../../auth/security/passwordPolicy.js';

export type BootstrapEnvironment = Record<string, string | undefined>;

export type SuperAdminBootstrapConfig = {
  enabled: boolean;
  email: string;
  name: string;
  password: string;
  passwordFile: string;
};

function parseEnabled(env: BootstrapEnvironment) {
  const configured = String(env.SUPER_ADMIN_BOOTSTRAP_ENABLED || '')
    .trim()
    .toLowerCase();
  if (configured) return configured === 'true';
  return env.NODE_ENV === 'production';
}

export function validateInitialSuperAdminPassword(password: string) {
  return collectStrongPasswordErrors(password).map((error) => `a senha inicial ${error}`);
}

export function collectSuperAdminBootstrapConfigErrors(
  env: BootstrapEnvironment,
  { requirePassword = false }: { requirePassword?: boolean } = {},
) {
  const enabled = parseEnabled(env);
  if (!enabled) return [];

  const errors: string[] = [];
  const email = String(env.SUPER_ADMIN_BOOTSTRAP_EMAIL || '')
    .trim()
    .toLowerCase();
  const name = String(env.SUPER_ADMIN_BOOTSTRAP_NAME || '').trim();
  const password = String(env.SUPER_ADMIN_BOOTSTRAP_PASSWORD || '');
  const passwordFile = String(env.SUPER_ADMIN_BOOTSTRAP_PASSWORD_FILE || '').trim();

  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) {
    errors.push('SUPER_ADMIN_BOOTSTRAP_EMAIL deve conter um email válido');
  }
  if (name.length < 2 || name.length > 120) {
    errors.push('SUPER_ADMIN_BOOTSTRAP_NAME deve conter entre 2 e 120 caracteres');
  }
  if (password && passwordFile) {
    errors.push(
      'configure somente SUPER_ADMIN_BOOTSTRAP_PASSWORD ou SUPER_ADMIN_BOOTSTRAP_PASSWORD_FILE',
    );
  }
  if (passwordFile && !path.isAbsolute(passwordFile)) {
    errors.push('SUPER_ADMIN_BOOTSTRAP_PASSWORD_FILE deve usar um caminho absoluto');
  }
  if (password) {
    errors.push(...validateInitialSuperAdminPassword(password));
  }
  if (requirePassword && !password && !passwordFile) {
    errors.push(
      'a primeira inicialização exige SUPER_ADMIN_BOOTSTRAP_PASSWORD ou SUPER_ADMIN_BOOTSTRAP_PASSWORD_FILE',
    );
  }

  return errors;
}

export function resolveSuperAdminBootstrapConfig(
  env: BootstrapEnvironment = process.env,
): SuperAdminBootstrapConfig {
  const enabled = parseEnabled(env);
  if (!enabled) {
    return { enabled: false, email: '', name: '', password: '', passwordFile: '' };
  }

  const errors = collectSuperAdminBootstrapConfigErrors(env);
  if (errors.length) {
    throw new Error(`Configuração do bootstrap de SUPER_ADMIN inválida: ${errors.join('; ')}.`);
  }

  return {
    enabled: true,
    email: String(env.SUPER_ADMIN_BOOTSTRAP_EMAIL).trim().toLowerCase(),
    name: String(env.SUPER_ADMIN_BOOTSTRAP_NAME).trim(),
    password: String(env.SUPER_ADMIN_BOOTSTRAP_PASSWORD || ''),
    passwordFile: String(env.SUPER_ADMIN_BOOTSTRAP_PASSWORD_FILE || '').trim(),
  };
}
