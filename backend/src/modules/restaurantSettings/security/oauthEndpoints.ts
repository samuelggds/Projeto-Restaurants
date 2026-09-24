type Environment = Record<string, string | undefined>;

export type OAuthEndpoint = 'MERCADO_PAGO_API' | 'MERCADO_PAGO_AUTHORIZATION';

type EndpointDefinition = {
  envName: string;
  defaultUrl: string;
  productionUrls: readonly string[];
  developmentUrls?: readonly string[];
};

const ENDPOINTS: Record<OAuthEndpoint, EndpointDefinition> = {
  MERCADO_PAGO_API: {
    envName: 'MP_OAUTH_API_BASE_URL',
    defaultUrl: 'https://api.mercadopago.com',
    productionUrls: ['https://api.mercadopago.com'],
  },
  MERCADO_PAGO_AUTHORIZATION: {
    envName: 'MP_OAUTH_AUTH_URL',
    defaultUrl: 'https://auth.mercadopago.com/authorization',
    productionUrls: [
      'https://auth.mercadopago.com/authorization',
      'https://auth.mercadopago.com.br/authorization',
    ],
  },
};

const MERCADO_PAGO_RECONCILIATION_API: EndpointDefinition = {
  envName: 'MP_API_BASE_URL',
  defaultUrl: 'https://api.mercadopago.com',
  productionUrls: ['https://api.mercadopago.com'],
};

function canonicalizeEndpoint(name: string, rawValue: string) {
  let url: URL;
  try {
    url = new URL(rawValue);
  } catch {
    throw new Error(`${name} deve ser uma URL valida.`);
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error(`${name} deve usar HTTP ou HTTPS.`);
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error(`${name} nao pode conter credenciais, query string ou fragmento.`);
  }

  const normalizedPath = url.pathname === '/' ? '' : url.pathname.replace(/\/+$/, '');
  return `${url.origin}${normalizedPath}`;
}

function resolveTrustedEndpoint(definition: EndpointDefinition, env: Environment) {
  const configured = String(env[definition.envName] || definition.defaultUrl).trim();
  const resolved = canonicalizeEndpoint(definition.envName, configured);

  if (definition.productionUrls.includes(resolved)) return resolved;

  const isProduction = env.NODE_ENV === 'production';
  if (!isProduction && definition.developmentUrls?.includes(resolved)) return resolved;

  const allowUntrusted = env.ALLOW_UNTRUSTED_OAUTH_ENDPOINTS === 'true';
  if (!isProduction && allowUntrusted) return resolved;

  throw new Error(
    `${definition.envName} deve apontar para um endpoint oficial do provedor` +
      (isProduction
        ? ' em producao.'
        : ' ou ALLOW_UNTRUSTED_OAUTH_ENDPOINTS=true deve ser definido apenas no ambiente local.'),
  );
}

export function resolveOAuthEndpoint(endpoint: OAuthEndpoint, env: Environment = process.env) {
  return resolveTrustedEndpoint(ENDPOINTS[endpoint], env);
}

export function resolveMercadoPagoApiEndpoint(env: Environment = process.env) {
  return resolveTrustedEndpoint(MERCADO_PAGO_RECONCILIATION_API, env);
}
