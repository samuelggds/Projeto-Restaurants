import type { SignOptions } from 'jsonwebtoken';

const DEFAULT_JWT_EXPIRES_IN = '15m';
const DEFAULT_JWT_REFRESH_EXPIRES_IN = '14d';
const DEFAULT_JWT_MFA_EXPIRES_IN = '10m';

export function getJwtSecret() {
  return String(process.env.JWT_SECRET || '').trim();
}

export function getJwtExpiresIn(): SignOptions['expiresIn'] {
  const value = String(process.env.JWT_EXPIRES_IN || '').trim();
  return (value || DEFAULT_JWT_EXPIRES_IN) as SignOptions['expiresIn'];
}

export function getJwtRefreshSecret() {
  return String(process.env.JWT_REFRESH_SECRET || '').trim();
}

export function getJwtRefreshExpiresIn(): SignOptions['expiresIn'] {
  const value = String(process.env.JWT_REFRESH_EXPIRES_IN || '').trim();
  return (value || DEFAULT_JWT_REFRESH_EXPIRES_IN) as SignOptions['expiresIn'];
}

export function getJwtMfaSecret() {
  return String(process.env.JWT_MFA_SECRET || '').trim();
}

export function getJwtMfaExpiresIn(): SignOptions['expiresIn'] {
  const value = String(process.env.JWT_MFA_EXPIRES_IN || '').trim();
  return (value || DEFAULT_JWT_MFA_EXPIRES_IN) as SignOptions['expiresIn'];
}
