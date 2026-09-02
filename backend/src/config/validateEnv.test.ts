import assert from 'node:assert/strict';
import test, { afterEach, beforeEach } from 'node:test';
import { validateCriticalEnv } from './validateEnv.js';

const originalEnv = { ...process.env };

function setValidProductionEnv() {
  Object.assign(process.env, {
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://app:secret@db:5432/app',
    SUPER_ADMIN_BOOTSTRAP_ENABLED: 'true',
    SUPER_ADMIN_BOOTSTRAP_EMAIL: 'developer@example.com',
    SUPER_ADMIN_BOOTSTRAP_NAME: 'Desenvolvedor da Plataforma',
    CREDENTIAL_ENCRYPTION_KEY: 'MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=',
    FRONTEND_URL: 'https://app.example.com',
    BACKEND_URL: 'https://api.example.com',
    CORS_ORIGINS: 'https://app.example.com',
    SOCKET_CORS_ORIGINS: 'https://app.example.com',
    JWT_SECRET: 'jwt_secret_with_at_least_32_characters_123',
    JWT_REFRESH_SECRET: 'refresh_secret_with_at_least_32_characters_123',
    JWT_MFA_SECRET: 'mfa_secret_with_at_least_32_characters_123',
    PAYMENT_PIN_SECRET: 'pin_secret_with_at_least_32_characters_123',
    MFA_REQUIRED_ROLES: 'ADMIN,SUPER_ADMIN',
    IMAGE_ENHANCEMENT_RATE_LIMIT_WINDOW_MS: '900000',
    IMAGE_ENHANCEMENT_RATE_LIMIT_MAX_REQUESTS: '5',
    INGREDIENT_IMAGE_SEARCH_RATE_LIMIT_WINDOW_MS: '900000',
    INGREDIENT_IMAGE_SEARCH_RATE_LIMIT_MAX_REQUESTS: '20',
    SMTP_HOST: 'smtp.example.com',
    SMTP_PORT: '587',
    SMTP_SECURE: 'false',
    SMTP_AUTH_TYPE: 'basic',
    SMTP_USER: 'mailer@example.com',
    SMTP_PASS: 'smtp-app-password',
    ALLOW_LEGACY_ACCESS_TOKENS: 'false',
    ALLOW_LOCAL_AUTH_CODE_LOGGING: 'false',
    ALLOW_UNTRUSTED_OAUTH_ENDPOINTS: 'false',
    MP_OAUTH_API_BASE_URL: 'https://api.mercadopago.com',
    MP_API_BASE_URL: 'https://api.mercadopago.com',
    MP_OAUTH_AUTH_URL: 'https://auth.mercadopago.com/authorization',
    MP_OAUTH_REDIRECT_URI: '',
    PAGBANK_CONNECT_API_URL: 'https://api.pagseguro.com',
    PAGBANK_CONNECT_AUTH_URL: 'https://connect.pagbank.com.br/oauth2/authorize',
    PAGBANK_CONNECT_REDIRECT_URI: '',
    ROUTING_REQUIRED: 'true',
    ROUTING_PROVIDER: 'osrm',
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
  delete process.env.GEOAPIFY_API_KEY;
  delete process.env.GEOAPIFY_BASE_URL;
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

test('aceita geoapify em producao sem exigir osrm ou nominatim', () => {
  process.env.ROUTING_PROVIDER = 'geoapify';
  process.env.GEOAPIFY_API_KEY = 'geoapify-production-key';
  process.env.GEOAPIFY_BASE_URL = 'https://api.geoapify.com';
  delete process.env.OSRM_BASE_URL;
  delete process.env.GEOCODER_BASE_URL;
  delete process.env.ROUTING_USER_AGENT;

  assert.doesNotThrow(() => validateCriticalEnv());
});

test('geoapify exige chave quando o roteamento e obrigatorio', () => {
  process.env.ROUTING_PROVIDER = 'geoapify';
  delete process.env.GEOAPIFY_API_KEY;
  delete process.env.OSRM_BASE_URL;
  delete process.env.GEOCODER_BASE_URL;

  assert.throws(() => validateCriticalEnv(), /GEOAPIFY_API_KEY e obrigatoria/i);
});

test('rejeita provider de roteamento desconhecido em producao', () => {
  process.env.ROUTING_PROVIDER = 'outro';

  assert.throws(() => validateCriticalEnv(), /ROUTING_PROVIDER deve ser osrm ou geoapify/i);
});

test('bloqueia servicos publicos de demonstracao quando osrm e obrigatorio', () => {
  process.env.ROUTING_PROVIDER = 'osrm';
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

test('exige a identidade do bootstrap do unico SUPER_ADMIN em producao', () => {
  delete process.env.SUPER_ADMIN_BOOTSTRAP_EMAIL;
  delete process.env.SUPER_ADMIN_BOOTSTRAP_NAME;

  assert.throws(
    () => validateCriticalEnv(),
    /SUPER_ADMIN_BOOTSTRAP_EMAIL deve conter um email v.lido.*SUPER_ADMIN_BOOTSTRAP_NAME deve conter entre 2 e 120/i,
  );
});

test('nao permite desativar ou configurar uma senha inicial fraca no bootstrap de producao', () => {
  process.env.SUPER_ADMIN_BOOTSTRAP_ENABLED = 'false';
  process.env.SUPER_ADMIN_BOOTSTRAP_PASSWORD = 'senha123';

  assert.throws(
    () => validateCriticalEnv(),
    /SUPER_ADMIN_BOOTSTRAP_ENABLED deve ser true.*senha inicial deve conter.*valor previs.vel/i,
  );
});

test('bootstrap de producao rejeita senha com menos de oito caracteres', () => {
  process.env.SUPER_ADMIN_BOOTSTRAP_PASSWORD = 'Ab1!xyz';

  assert.throws(() => validateCriticalEnv(), /senha inicial deve conter entre 8 e 128/i);
});

test('permite desativar explicitamente o calculo de rota', () => {
  process.env.ROUTING_REQUIRED = 'false';
  delete process.env.ROUTING_PROVIDER;
  delete process.env.OSRM_BASE_URL;
  delete process.env.GEOCODER_BASE_URL;
  delete process.env.ROUTING_USER_AGENT;
  delete process.env.GEOAPIFY_API_KEY;

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

test('exige chave AES de 32 bytes para credenciais dos gateways', () => {
  process.env.CREDENTIAL_ENCRYPTION_KEY = 'curta';
  assert.throws(() => validateCriticalEnv(), /exatamente 32 bytes/i);
});

test('valida a chave anterior usada durante rotação de credenciais', () => {
  process.env.CREDENTIAL_ENCRYPTION_KEY_PREVIOUS = process.env.CREDENTIAL_ENCRYPTION_KEY;
  assert.throws(() => validateCriticalEnv(), /PREVIOUS deve ser diferente/u);

  process.env.CREDENTIAL_ENCRYPTION_KEY_PREVIOUS = 'curta';
  assert.throws(() => validateCriticalEnv(), /PREVIOUS deve representar exatamente 32 bytes/u);
});

test('permite HTTP apenas em loopback para a execução local', () => {
  process.env.FRONTEND_URL = 'http://localhost:5173';
  process.env.BACKEND_URL = 'http://127.0.0.1:3000';
  process.env.CORS_ORIGINS = 'http://localhost:5173';
  process.env.SOCKET_CORS_ORIGINS = 'http://localhost:5173';

  assert.doesNotThrow(() => validateCriticalEnv());
});

test('exige MFA para administradores e super administradores', () => {
  process.env.MFA_REQUIRED_ROLES = 'ADMIN';
  assert.throws(() => validateCriticalEnv(), /deve incluir SUPER_ADMIN/i);

  process.env.MFA_REQUIRED_ROLES = 'SUPER_ADMIN';
  assert.throws(() => validateCriticalEnv(), /deve incluir ADMIN/i);
});

test('exige um transporte SMTP utilizável para entregar o MFA em produção', () => {
  delete process.env.SMTP_HOST;
  delete process.env.SMTP_PASS;

  assert.throws(() => validateCriticalEnv(), /SMTP_HOST e obrigatoria.*SMTP_PASS e obrigatoria/i);

  setValidProductionEnv();
  process.env.SMTP_AUTH_TYPE = 'oauth2';
  delete process.env.SMTP_CLIENT_ID;
  delete process.env.SMTP_CLIENT_SECRET;
  delete process.env.SMTP_REFRESH_TOKEN;

  assert.throws(
    () => validateCriticalEnv(),
    /SMTP_CLIENT_ID e obrigatoria.*SMTP_CLIENT_SECRET e obrigatoria.*SMTP_REFRESH_TOKEN e obrigatoria/i,
  );
});

test('rejeita flags temporárias de compatibilidade em produção', () => {
  process.env.ALLOW_LEGACY_ACCESS_TOKENS = 'true';
  process.env.ALLOW_UNTRUSTED_OAUTH_ENDPOINTS = 'true';
  process.env.ALLOW_LOCAL_AUTH_CODE_LOGGING = 'true';
  assert.throws(
    () => validateCriticalEnv(),
    /ALLOW_LEGACY_ACCESS_TOKENS nao pode.*ALLOW_LOCAL_AUTH_CODE_LOGGING nao pode.*ALLOW_UNTRUSTED_OAUTH_ENDPOINTS nao pode/i,
  );
});

test('rejeita endpoint OAuth não oficial e redirect fora da origem do backend', () => {
  process.env.MP_OAUTH_API_BASE_URL = 'https://attacker.example';
  process.env.PAGBANK_CONNECT_REDIRECT_URI = 'https://other.example/oauth/callback';
  assert.throws(
    () => validateCriticalEnv(),
    /MP_OAUTH_API_BASE_URL deve apontar.*PAGBANK_CONNECT_REDIRECT_URI deve usar a mesma origem/i,
  );
});

test('rejeita endpoint de reconciliação Mercado Pago não oficial', () => {
  process.env.MP_API_BASE_URL = 'https://attacker.example';
  assert.throws(() => validateCriticalEnv(), /MP_API_BASE_URL deve apontar.*producao/i);
});

test('rejeita política SameSite inválida para o refresh cookie', () => {
  process.env.REFRESH_COOKIE_SAME_SITE = 'disabled';
  assert.throws(() => validateCriticalEnv(), /REFRESH_COOKIE_SAME_SITE deve ser/u);
});

test('impõe uma janela e um teto seguros para melhorias de imagem por IA', () => {
  process.env.IMAGE_ENHANCEMENT_RATE_LIMIT_MAX_REQUESTS = '50';
  process.env.IMAGE_ENHANCEMENT_RATE_LIMIT_WINDOW_MS = '1000';

  assert.throws(
    () => validateCriticalEnv(),
    /IMAGE_ENHANCEMENT_RATE_LIMIT_MAX_REQUESTS deve estar entre 1 e 20.*IMAGE_ENHANCEMENT_RATE_LIMIT_WINDOW_MS deve ser de pelo menos 60000/u,
  );
});

test('impõe limite seguro para busca e segredo forte quando configurado', () => {
  process.env.INGREDIENT_IMAGE_SEARCH_RATE_LIMIT_MAX_REQUESTS = '101';
  process.env.INGREDIENT_IMAGE_SEARCH_RATE_LIMIT_WINDOW_MS = '1000';
  process.env.INGREDIENT_IMAGE_TOKEN_SECRET = 'curto';

  assert.throws(
    () => validateCriticalEnv(),
    /INGREDIENT_IMAGE_SEARCH_RATE_LIMIT_MAX_REQUESTS deve estar entre 1 e 100.*INGREDIENT_IMAGE_SEARCH_RATE_LIMIT_WINDOW_MS deve ser de pelo menos 60000.*INGREDIENT_IMAGE_TOKEN_SECRET deve ter pelo menos 32 caracteres/u,
  );
});
