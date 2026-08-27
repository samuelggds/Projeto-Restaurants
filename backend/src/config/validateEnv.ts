import { parseCredentialEncryptionKey } from '../modules/restaurantSettings/security/credentialEncryption.js';
import { validateConfiguredOAuthEndpoints } from '../modules/restaurantSettings/security/oauthEndpoints.js';

function asNumber(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined || value.trim() === '') return fallback;
  return value.trim().toLowerCase() === 'true';
}

function parseHttpUrl(name: string, value: string, errors: string[]) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      errors.push(`${name} deve usar http:// ou https://.`);
      return null;
    }
    return url;
  } catch {
    errors.push(`${name} deve ser uma URL valida.`);
    return null;
  }
}

function isLocalHostname(hostname: string) {
  const normalized = hostname.toLowerCase();
  return normalized === 'localhost' || normalized === '127.0.0.1' || normalized === '::1';
}

function parsePublicUrl(name: string, value: string, errors: string[]) {
  const url = parseHttpUrl(name, value, errors);
  if (url && url.protocol !== 'https:' && !isLocalHostname(url.hostname)) {
    errors.push(`${name} deve usar https:// em producao, exceto no ambiente local.`);
  }
  return url;
}

function validateDatabaseUrl(value: string, errors: string[]) {
  if (!value) return;

  try {
    const url = new URL(value);
    if (url.protocol !== 'postgresql:' && url.protocol !== 'postgres:') {
      errors.push('DATABASE_URL deve usar o protocolo postgresql:// ou postgres://.');
    }
    if (/substitua|change[_-]?me|replace[_-]?me/i.test(value)) {
      errors.push('DATABASE_URL nao pode conter credenciais placeholder em producao.');
    }
  } catch {
    errors.push('DATABASE_URL deve ser uma URL PostgreSQL valida.');
  }
}

function requireValue(name: string, errors: string[]) {
  const value = String(process.env[name] || '').trim();
  if (!value) errors.push(`${name} e obrigatoria em producao.`);
  return value;
}

function validatePositiveInteger(name: string, fallback: number, errors: string[]) {
  const value = asNumber(String(process.env[name] || fallback), fallback);
  if (!Number.isInteger(value) || value <= 0) {
    errors.push(`${name} deve ser um numero inteiro maior que zero.`);
  }
}

function isPlaceholder(value: string) {
  return /^(change[_-]?me|replace[_-]?me|substitua|secret|password|your[_-]?|seu[_-]?|x{6,})/i.test(
    value.trim(),
  );
}

export function validateCriticalEnv() {
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    return;
  }

  const errors: string[] = [];
  const databaseUrl = requireValue('DATABASE_URL', errors);
  validateDatabaseUrl(databaseUrl, errors);

  const credentialEncryptionKey = requireValue('CREDENTIAL_ENCRYPTION_KEY', errors);
  if (credentialEncryptionKey) {
    try {
      parseCredentialEncryptionKey(credentialEncryptionKey);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'CREDENTIAL_ENCRYPTION_KEY inválida.');
    }
  }

  const frontendUrl = requireValue('FRONTEND_URL', errors);
  if (frontendUrl) parsePublicUrl('FRONTEND_URL', frontendUrl, errors);

  const backendUrl = requireValue('BACKEND_URL', errors);
  const parsedBackendUrl = backendUrl ? parsePublicUrl('BACKEND_URL', backendUrl, errors) : null;

  const corsOrigins = requireValue('CORS_ORIGINS', errors);
  if (corsOrigins) {
    corsOrigins
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)
      .forEach((origin) => parsePublicUrl('CORS_ORIGINS', origin, errors));
  }

  const socketCorsOrigins = requireValue('SOCKET_CORS_ORIGINS', errors);
  if (socketCorsOrigins) {
    socketCorsOrigins
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)
      .forEach((origin) => parsePublicUrl('SOCKET_CORS_ORIGINS', origin, errors));
  }

  const jwtSecret = String(process.env.JWT_SECRET || '').trim();
  if (jwtSecret.length < 32) {
    errors.push('JWT_SECRET deve ter pelo menos 32 caracteres em producao.');
  } else if (isPlaceholder(jwtSecret)) {
    errors.push('JWT_SECRET nao pode usar um valor placeholder em producao.');
  }

  const jwtRefreshSecret = String(process.env.JWT_REFRESH_SECRET || jwtSecret).trim();
  if (jwtRefreshSecret.length < 32) {
    errors.push('JWT_REFRESH_SECRET deve ter pelo menos 32 caracteres em producao.');
  } else if (isPlaceholder(jwtRefreshSecret)) {
    errors.push('JWT_REFRESH_SECRET nao pode usar um valor placeholder em producao.');
  }
  if (jwtRefreshSecret && jwtRefreshSecret === jwtSecret) {
    errors.push('JWT_REFRESH_SECRET deve ser diferente de JWT_SECRET em producao.');
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
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
  for (const requiredRole of ['ADMIN', 'SUPER_ADMIN']) {
    if (!mfaRoles.includes(requiredRole)) {
      errors.push(`MFA_REQUIRED_ROLES deve incluir ${requiredRole} em producao.`);
    }
  }
  if (mfaRoles.length > 0) {
    const jwtMfaSecret = String(process.env.JWT_MFA_SECRET || jwtSecret).trim();

    if (jwtMfaSecret.length < 32) {
      errors.push('JWT_MFA_SECRET deve ter pelo menos 32 caracteres em producao.');
    } else if (isPlaceholder(jwtMfaSecret)) {
      errors.push('JWT_MFA_SECRET nao pode usar um valor placeholder em producao.');
    }
    if (jwtMfaSecret === jwtSecret || jwtMfaSecret === jwtRefreshSecret) {
      errors.push('JWT_MFA_SECRET deve ser diferente dos demais segredos JWT em producao.');
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

  const allowLegacyAccessTokens =
    String(process.env.ALLOW_LEGACY_ACCESS_TOKENS || 'false').trim() === 'true';
  if (allowLegacyAccessTokens) {
    errors.push('ALLOW_LEGACY_ACCESS_TOKENS nao pode ser true em producao.');
  }

  const allowUntrustedOAuthEndpoints =
    String(process.env.ALLOW_UNTRUSTED_OAUTH_ENDPOINTS || 'false').trim() === 'true';
  if (allowUntrustedOAuthEndpoints) {
    errors.push('ALLOW_UNTRUSTED_OAUTH_ENDPOINTS nao pode ser true em producao.');
  }
  try {
    validateConfiguredOAuthEndpoints(process.env);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Endpoints OAuth invalidos.');
  }

  for (const redirectName of ['MP_OAUTH_REDIRECT_URI', 'PAGBANK_CONNECT_REDIRECT_URI']) {
    const redirectValue = String(process.env[redirectName] || '').trim();
    if (!redirectValue) continue;
    const redirectUrl = parsePublicUrl(redirectName, redirectValue, errors);
    if (redirectUrl && parsedBackendUrl && redirectUrl.origin !== parsedBackendUrl.origin) {
      errors.push(`${redirectName} deve usar a mesma origem de BACKEND_URL em producao.`);
    }
  }

  const paymentPinSecret = String(
    process.env.PAYMENT_PIN_SECRET || process.env.JWT_MFA_SECRET || jwtSecret,
  ).trim();
  if (paymentPinSecret.length < 32) {
    errors.push('PAYMENT_PIN_SECRET deve ter pelo menos 32 caracteres em producao.');
  } else if (isPlaceholder(paymentPinSecret)) {
    errors.push('PAYMENT_PIN_SECRET nao pode usar um valor placeholder em producao.');
  }
  if (
    paymentPinSecret === jwtSecret ||
    paymentPinSecret === jwtRefreshSecret ||
    paymentPinSecret === String(process.env.JWT_MFA_SECRET || jwtSecret).trim()
  ) {
    errors.push('PAYMENT_PIN_SECRET deve ser independente dos segredos JWT em producao.');
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

  const routingRequired = asBoolean(process.env.ROUTING_REQUIRED, true);
  if (routingRequired) {
    const osrmBaseUrl = requireValue('OSRM_BASE_URL', errors);
    const geocoderBaseUrl = requireValue('GEOCODER_BASE_URL', errors);
    const routingUserAgent = requireValue('ROUTING_USER_AGENT', errors);

    const osrmUrl = osrmBaseUrl ? parseHttpUrl('OSRM_BASE_URL', osrmBaseUrl, errors) : null;
    const geocoderUrl = geocoderBaseUrl
      ? parseHttpUrl('GEOCODER_BASE_URL', geocoderBaseUrl, errors)
      : null;

    const publicDemoHosts = new Set(['router.project-osrm.org', 'nominatim.openstreetmap.org']);
    if (osrmUrl && publicDemoHosts.has(osrmUrl.hostname.toLowerCase())) {
      errors.push('OSRM_BASE_URL nao pode usar o servidor publico de demonstracao em producao.');
    }
    if (geocoderUrl && publicDemoHosts.has(geocoderUrl.hostname.toLowerCase())) {
      errors.push('GEOCODER_BASE_URL nao pode usar o Nominatim publico em producao.');
    }
    if (routingUserAgent && routingUserAgent === 'PizzaIADelivery/1.0') {
      errors.push('ROUTING_USER_AGENT deve incluir um contato real em producao.');
    }

    validatePositiveInteger('ROUTING_REQUEST_TIMEOUT_MS', 4000, errors);
    validatePositiveInteger('GEOCODER_REQUEST_TIMEOUT_MS', 4000, errors);
    validatePositiveInteger('ROUTING_CACHE_MAX_ENTRIES', 5000, errors);
  }

  validatePositiveInteger('DELIVERY_LOCATION_RETENTION_DAYS', 30, errors);
  validatePositiveInteger('READINESS_TIMEOUT_MS', 3000, errors);
  validatePositiveInteger('SHUTDOWN_TIMEOUT_MS', 10_000, errors);
  validatePositiveInteger('PORT', 3000, errors);

  if (errors.length) {
    throw new Error(`Falha na validacao de ambiente: ${errors.join(' ')}`);
  }
}
