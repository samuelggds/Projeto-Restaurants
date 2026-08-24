import assert from 'node:assert/strict';
import test, { afterEach, beforeEach } from 'node:test';
import { validateCriticalEnv } from './validateEnv.js';

const originalEnv = { ...process.env };

function setValidProductionEnv() {
  Object.assign(process.env, {
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://app:secret@db:5432/app',
    FRONTEND_URL: 'https://app.example.com',
    BACKEND_URL: 'https://api.example.com',
    CORS_ORIGINS: 'https://app.example.com',
    SOCKET_CORS_ORIGINS: 'https://app.example.com',
    JWT_SECRET: 'jwt_secret_with_at_least_32_characters_123',
    JWT_REFRESH_SECRET: 'refresh_secret_with_at_least_32_characters_123',
    JWT_MFA_SECRET: 'mfa_secret_with_at_least_32_characters_123',
    PAYMENT_PIN_SECRET: 'pin_secret_with_at_least_32_characters_123',
    ROUTING_REQUIRED: 'true',
    OSRM_BASE_URL: 'http://osrm:5000',
    GEOCODER_BASE_URL: 'http://nominatim:8080',
    ROUTING_USER_AGENT: 'PizzaIADelivery/1.0 (ops@example.com)',
    ROUTING_REQUEST_TIMEOUT_MS: '4000',
    GEOCODER_REQUEST_TIMEOUT_MS: '4000',
    ROUTING_CACHE_MAX_ENTRIES: '5000',
    DELIVERY_LOCATION_RETENTION_DAYS: '30',
    ALLOW_INSECURE_STRIPE_WEBHOOK: 'false',
    ALLOW_GLOBAL_PAYMENT_FALLBACK: 'false',
    ENABLE_TEST_PAYMENT_WEBHOOK: 'false',
    ENABLE_DESTRUCTIVE_CLEANUP: 'false',
  });
}

beforeEach(() => {
  setValidProductionEnv();
});

afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) delete process.env[key];
  }
  Object.assign(process.env, originalEnv);
});

test('aceita configuracao completa com roteamento interno', () => {
  assert.doesNotThrow(() => validateCriticalEnv());
});

test('bloqueia servicos publicos de demonstracao quando o roteamento e obrigatorio', () => {
  process.env.OSRM_BASE_URL = 'https://router.project-osrm.org';
  process.env.GEOCODER_BASE_URL = 'https://nominatim.openstreetmap.org';

  assert.throws(
    () => validateCriticalEnv(),
    /servidor publico de demonstracao.*Nominatim publico/i,
  );
});

test('falha cedo quando URLs e origens essenciais nao foram configuradas', () => {
  delete process.env.BACKEND_URL;
  delete process.env.SOCKET_CORS_ORIGINS;
  delete process.env.OSRM_BASE_URL;

  assert.throws(
    () => validateCriticalEnv(),
    /BACKEND_URL e obrigatoria.*SOCKET_CORS_ORIGINS e obrigatoria.*OSRM_BASE_URL e obrigatoria/i,
  );
});

test('permite desativar explicitamente o calculo de rota', () => {
  process.env.ROUTING_REQUIRED = 'false';
  delete process.env.OSRM_BASE_URL;
  delete process.env.GEOCODER_BASE_URL;
  delete process.env.ROUTING_USER_AGENT;

  assert.doesNotThrow(() => validateCriticalEnv());
});

test('rejeita segredos placeholders ou reutilizados', () => {
  process.env.JWT_SECRET = 'change_me_at_least_32_chars_long_123';
  process.env.JWT_REFRESH_SECRET = process.env.JWT_SECRET;

  assert.throws(() => validateCriticalEnv(), /placeholder.*diferente de JWT_SECRET/i);
});

test('rejeita banco com protocolo incompatível e URLs públicas sem HTTPS', () => {
  process.env.DATABASE_URL = 'mysql://app:secret@db:3306/app';
  process.env.FRONTEND_URL = 'http://app.example.com';
  process.env.CORS_ORIGINS = 'http://app.example.com';

  assert.throws(
    () => validateCriticalEnv(),
    /DATABASE_URL deve usar.*FRONTEND_URL deve usar https.*CORS_ORIGINS deve usar https/i,
  );
});

test('permite HTTP apenas em loopback para a execução local', () => {
  process.env.FRONTEND_URL = 'http://localhost:5173';
  process.env.BACKEND_URL = 'http://127.0.0.1:3000';
  process.env.CORS_ORIGINS = 'http://localhost:5173';
  process.env.SOCKET_CORS_ORIGINS = 'http://localhost:5173';

  assert.doesNotThrow(() => validateCriticalEnv());
});
