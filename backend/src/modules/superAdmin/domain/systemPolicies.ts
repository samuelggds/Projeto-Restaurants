import { getRequiredMfaRoles } from '../../auth/security/mfaPolicy.js';

type PolicyItem = {
  key: string;
  label: string;
  value: string | number | boolean | null;
  description: string;
  configured?: boolean;
};

type MaintenanceSettings = {
  maintenanceMode: boolean;
  maintenanceMessage: string;
};

function positiveInteger(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function configuredValue(env: NodeJS.ProcessEnv, ...names: string[]) {
  return names.some((name) => {
    const value = String(env[name] || '').trim();
    return Boolean(value) && !/substitua|change[_-]?me|replace[_-]?me|x{6,}/iu.test(value);
  });
}

function allConfigured(env: NodeJS.ProcessEnv, names: string[]) {
  return names.every((name) => configuredValue(env, name));
}

function policy(
  key: string,
  label: string,
  value: PolicyItem['value'],
  description: string,
  configured?: boolean,
): PolicyItem {
  return { key, label, value, description, ...(configured === undefined ? {} : { configured }) };
}

function countAllowedOrigins(env: NodeJS.ProcessEnv) {
  return new Set(
    [env.CORS_ORIGINS, env.FRONTEND_URL]
      .flatMap((value) => String(value || '').split(','))
      .map((value) => value.trim().replace(/\/+$/u, ''))
      .filter(Boolean),
  ).size;
}

export function getPublicSystemPolicies(
  env: NodeJS.ProcessEnv = process.env,
  settings?: MaintenanceSettings,
) {
  const smtpAuthType = String(env.SMTP_AUTH_TYPE || 'basic')
    .trim()
    .toLowerCase();
  const smtpCredentialConfigured =
    smtpAuthType === 'oauth2'
      ? allConfigured(env, ['SMTP_CLIENT_ID', 'SMTP_CLIENT_SECRET', 'SMTP_REFRESH_TOKEN'])
      : configuredValue(env, 'SMTP_PASS');
  const smtpConfigured = allConfigured(env, ['SMTP_HOST', 'SMTP_USER']) && smtpCredentialConfigured;
  const mercadoPagoConfigured =
    configuredValue(env, 'PLATFORM_MP_ACCESS_TOKEN', 'MP_ACCESS_TOKEN') ||
    allConfigured(env, ['MP_OAUTH_CLIENT_ID', 'MP_OAUTH_CLIENT_SECRET']);
  const pagBankConfigured =
    allConfigured(env, ['PAGBANK_EMAIL', 'PAGBANK_TOKEN']) ||
    allConfigured(env, [
      'PAGBANK_CONNECT_CLIENT_ID',
      'PAGBANK_CONNECT_CLIENT_SECRET',
      'PAGBANK_CONNECT_PLATFORM_TOKEN',
    ]);
  const stripeConfigured = allConfigured(env, ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET']);
  const whatsappConfigured = allConfigured(env, ['WHATSAPP_WEBHOOK_URL', 'WHATSAPP_WEBHOOK_TOKEN']);

  return {
    deployment: [
      policy(
        'environment',
        'Ambiente de execução',
        String(env.NODE_ENV || 'development'),
        'Ambiente em que esta instância do backend está executando.',
      ),
      policy(
        'frontendUrl',
        'URL pública do frontend',
        configuredValue(env, 'FRONTEND_URL') ? 'Configurada' : 'Não configurada',
        'Origem usada em links públicos e fluxos de autenticação.',
        configuredValue(env, 'FRONTEND_URL'),
      ),
      policy(
        'backendUrl',
        'URL pública do backend',
        configuredValue(env, 'BACKEND_URL') ? 'Configurada' : 'Não configurada',
        'Origem pública usada em callbacks e notificações dos provedores.',
        configuredValue(env, 'BACKEND_URL'),
      ),
      policy(
        'corsOrigins',
        'Origens CORS autorizadas',
        countAllowedOrigins(env),
        'Quantidade de origens únicas autorizadas para acessar a API.',
        countAllowedOrigins(env) > 0,
      ),
    ],
    email: [
      policy(
        'smtp',
        'Servidor SMTP',
        smtpConfigured ? 'Configurado' : 'Não configurado',
        'Canal usado para MFA, recuperação de senha e alertas operacionais.',
        smtpConfigured,
      ),
      policy(
        'smtpAuthType',
        'Autenticação SMTP',
        smtpAuthType === 'oauth2' ? 'OAuth 2.0' : 'Usuário e senha',
        'Método de autenticação configurado no provedor de e-mail.',
        smtpCredentialConfigured,
      ),
      policy(
        'emailSender',
        'Remetente de alertas',
        configuredValue(env, 'ALERT_EMAIL_FROM') ? 'Configurado' : 'Padrão do SMTP',
        'Identidade exibida como remetente das mensagens da plataforma.',
        configuredValue(env, 'ALERT_EMAIL_FROM', 'SMTP_USER'),
      ),
    ],
    integrations: [
      policy(
        'mercadoPago',
        'Mercado Pago',
        mercadoPagoConfigured ? 'Configurado' : 'Não configurado',
        'Credencial global ou OAuth da plataforma; o segredo nunca é exibido.',
        mercadoPagoConfigured,
      ),
      policy(
        'pagBank',
        'PagBank',
        pagBankConfigured ? 'Configurado' : 'Não configurado',
        'Credencial global ou Connect; o segredo nunca é exibido.',
        pagBankConfigured,
      ),
      policy(
        'asaas',
        'Asaas',
        configuredValue(env, 'ASAAS_API_KEY') ? 'Configurado' : 'Não configurado',
        'Integração da plataforma para onboarding, pagamentos e saques.',
        configuredValue(env, 'ASAAS_API_KEY'),
      ),
      policy(
        'stripe',
        'Stripe',
        stripeConfigured ? 'Configurado' : 'Não configurado',
        'Checkout e validação de webhook da plataforma.',
        stripeConfigured,
      ),
      policy(
        'sentry',
        'Sentry',
        configuredValue(env, 'SENTRY_DSN') ? 'Configurado' : 'Não configurado',
        'Monitoramento técnico de erros; o DSN não é retornado pela API.',
        configuredValue(env, 'SENTRY_DSN'),
      ),
      policy(
        'whatsapp',
        'Notificações por WhatsApp',
        whatsappConfigured ? 'Configurado' : 'Não configurado',
        'Webhook global usado para notificações aos clientes; URL e token nunca são exibidos.',
        whatsappConfigured,
      ),
    ],
    security: [
      policy(
        'accessTokenTtl',
        'Validade do token de acesso',
        String(env.JWT_EXPIRES_IN || '15m'),
        'Tempo máximo da sessão curta antes da renovação.',
      ),
      policy(
        'refreshTokenTtl',
        'Validade da renovação',
        String(env.JWT_REFRESH_EXPIRES_IN || '14d'),
        'Tempo máximo da família de tokens de renovação.',
      ),
      policy(
        'mfaRequiredRoles',
        'Perfis com MFA obrigatório',
        [...getRequiredMfaRoles(env)].join(', ') || 'Nenhum',
        'Perfis que sempre passam por verificação adicional no login.',
      ),
      policy(
        'passwordPolicy',
        'Política de senha administrativa',
        '16–128 caracteres',
        'Exige minúscula, maiúscula, número e símbolo; limite de 72 bytes UTF-8.',
        true,
      ),
      policy(
        'loginLockout',
        'Bloqueio por tentativas',
        positiveInteger(env.LOGIN_LOCKOUT_AFTER_FAILURES, 5),
        'Quantidade de falhas antes do bloqueio progressivo do login.',
        true,
      ),
      policy(
        'rateLimit',
        'Limite global de requisições',
        positiveInteger(env.RATE_LIMIT_MAX_REQUESTS, 300),
        `Por janela de ${positiveInteger(env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000)} ms.`,
        true,
      ),
      policy(
        'singleSuperAdmin',
        'SUPER_ADMIN único',
        true,
        'Restrição aplicada no banco de dados para manter uma única conta da plataforma.',
        true,
      ),
    ],
    maintenance: [
      policy(
        'maintenanceMode',
        'Modo manutenção',
        settings?.maintenanceMode ?? false,
        'Estado persistido aplicado globalmente às rotas operacionais.',
        true,
      ),
      policy(
        'maintenanceMessage',
        'Mensagem pública',
        settings?.maintenanceMessage ? 'Configurada' : 'Mensagem padrão',
        'Mensagem apresentada aos usuários durante uma manutenção.',
        Boolean(settings?.maintenanceMessage),
      ),
      policy(
        'settingsCacheTtl',
        'Atualização da configuração',
        positiveInteger(env.PLATFORM_SETTINGS_CACHE_TTL_MS, 5_000),
        'Cache em milissegundos; alterações pelo painel invalidam o cache imediatamente.',
        true,
      ),
      policy(
        'criticalBypass',
        'Rotas críticas preservadas',
        true,
        'Saúde, autenticação, painel SUPER_ADMIN e webhooks continuam disponíveis.',
        true,
      ),
    ],
  };
}
