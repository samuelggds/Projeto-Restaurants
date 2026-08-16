function asNumber(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function validateCriticalEnv() {
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    return;
  }

  const errors: string[] = [];
  const jwtSecret = String(process.env.JWT_SECRET || '').trim();
  if (jwtSecret.length < 32) {
    errors.push('JWT_SECRET deve ter pelo menos 32 caracteres em producao.');
  }

  const jwtRefreshSecret = String(process.env.JWT_REFRESH_SECRET || jwtSecret).trim();
  if (jwtRefreshSecret.length < 32) {
    errors.push('JWT_REFRESH_SECRET deve ter pelo menos 32 caracteres em producao.');
  }

  const rateLimitMax = asNumber(String(process.env.RATE_LIMIT_MAX_REQUESTS || '300'), 300);
  if (rateLimitMax <= 0) {
    errors.push('RATE_LIMIT_MAX_REQUESTS deve ser maior que zero.');
  }

  const authRateLimitMax = asNumber(String(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || '50'), 50);
  if (authRateLimitMax <= 0) {
    errors.push('AUTH_RATE_LIMIT_MAX_REQUESTS deve ser maior que zero.');
  }

  const loginLockoutAfterFailures = asNumber(
    String(process.env.LOGIN_LOCKOUT_AFTER_FAILURES || '5'),
    5,
  );
  if (loginLockoutAfterFailures < 3) {
    errors.push('LOGIN_LOCKOUT_AFTER_FAILURES deve ser >= 3 em producao.');
  }

  const loginLockoutBaseSeconds = asNumber(
    String(process.env.LOGIN_LOCKOUT_BASE_SECONDS || '60'),
    60,
  );
  if (loginLockoutBaseSeconds < 30) {
    errors.push('LOGIN_LOCKOUT_BASE_SECONDS deve ser >= 30 em producao.');
  }

  const mfaRoles = String(process.env.MFA_REQUIRED_ROLES || 'ADMIN,SUPER_ADMIN')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  if (mfaRoles.length > 0) {
    const jwtMfaSecret = String(process.env.JWT_MFA_SECRET || jwtSecret).trim();

    if (jwtMfaSecret.length < 32) {
      errors.push('JWT_MFA_SECRET deve ter pelo menos 32 caracteres em producao.');
    }
  }

  const allowInsecureStripe =
    String(process.env.ALLOW_INSECURE_STRIPE_WEBHOOK || 'false').trim() === 'true';
  if (allowInsecureStripe) {
    errors.push('ALLOW_INSECURE_STRIPE_WEBHOOK nao pode ser true em producao.');
  }

  const allowGlobalFallback =
    String(process.env.ALLOW_GLOBAL_PAYMENT_FALLBACK || 'false').trim() === 'true';
  if (allowGlobalFallback) {
    errors.push('ALLOW_GLOBAL_PAYMENT_FALLBACK nao pode ser true em producao multi-tenant.');
  }

  const paymentPinSecret = String(
    process.env.PAYMENT_PIN_SECRET || process.env.JWT_MFA_SECRET || jwtSecret,
  ).trim();
  if (paymentPinSecret.length < 32) {
    errors.push('PAYMENT_PIN_SECRET deve ter pelo menos 32 caracteres em producao.');
  }

  const enableTestPaymentWebhook =
    String(process.env.ENABLE_TEST_PAYMENT_WEBHOOK || 'false').trim() === 'true';
  if (enableTestPaymentWebhook) {
    errors.push('ENABLE_TEST_PAYMENT_WEBHOOK nao pode ser true em producao.');
  }

  const enableDestructiveCleanup =
    String(process.env.ENABLE_DESTRUCTIVE_CLEANUP || 'false').trim() === 'true';
  if (enableDestructiveCleanup) {
    errors.push('ENABLE_DESTRUCTIVE_CLEANUP nao pode ser true em producao.');
  }

  if (errors.length) {
    throw new Error(`Falha na validacao de ambiente: ${errors.join(' ')}`);
  }
}
