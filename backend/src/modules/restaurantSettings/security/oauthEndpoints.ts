type Environment = Record<string, string | undefined>;

export type OAuthEndpoint =
  'MERCADO_PAGO_API' | 'MERCADO_PAGO_AUTHORIZATION' | 'PAGBANK_API' | 'PAGBANK_AUTHORIZATION';

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
  PAGBANK_API: {
    envName: 'PAGBANK_CONNECT_API_URL',
    defaultUrl: 'https://api.pagseguro.com',
    productionUrls: ['https://api.pagseguro.com'],
    developmentUrls: ['https://sandbox.api.pagseguro.com'],
  },
  PAGBANK_AUTHORIZATION: {
    envName: 'PAGBANK_CONNECT_AUTH_URL',
    defaultUrl: 'https://connect.pagbank.com.br/oauth2/authorize',
    productionUrls: ['https://connect.pagbank.com.br/oauth2/authorize'],
    developmentUrls: ['https://connect.sandbox.pagbank.com.br/oauth2/authorize'],
  },
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

/**
 * Impede que uma configuração adulterada envie client secrets/tokens para um
 * host arbitrário. Overrides locais exigem uma liberação explícita e nunca são
 * aceitos em produção.
 */
export function resolveOAuthEndpoint(endpoint: OAuthEndpoint, env: Environment = process.env) {
  const definition = ENDPOINTS[endpoint];
  const configured = String(env[definition.envName] || definition.defaultUrl).trim();
  const resolved = canonicalizeEndpoint(definition.envName, configured);
  const productionAllowed = definition.productionUrls.includes(resolved);

  if (productionAllowed) return resolved;

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

export function validateConfiguredOAuthEndpoints(env: Environment = process.env) {
  (Object.keys(ENDPOINTS) as OAuthEndpoint[]).forEach((endpoint) => {
    resolveOAuthEndpoint(endpoint, env);
  });
}
