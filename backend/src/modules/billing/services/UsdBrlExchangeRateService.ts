export type UsdBrlQuote = {
  rateBrlPerUsd: number;
  source: string;
  quotedAt: Date;
  fetchedAt: Date;
  bid: number;
  ask: number;
};

type AwesomeApiPayload = {
  USDBRL?: {
    code?: unknown;
    codein?: unknown;
    bid?: unknown;
    ask?: unknown;
    timestamp?: unknown;
  };
};

function positiveNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseRate(value: unknown, field: string) {
  const parsed = Number(String(value ?? '').replace(',', '.'));
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Cotação USD/BRL inválida recebida do provedor (${field}).`);
  }
  return parsed;
}

function parseProviderTimestamp(value: unknown) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    throw new Error('Cotação USD/BRL sem horário válido do provedor.');
  }
  const date = new Date(seconds * 1000);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Cotação USD/BRL sem horário válido do provedor.');
  }
  return date;
}

function resolveConfig() {
  const baseUrl = String(
    process.env.FX_AWESOME_BASE_URL || 'https://economia.awesomeapi.com.br',
  )
    .trim()
    .replace(/\/+$/u, '');
  const apiKey = String(process.env.FX_AWESOME_API_KEY || '').trim();
  const timeoutMs = positiveNumber(process.env.FX_REQUEST_TIMEOUT_MS, 5000);
  const maxAgeSeconds = positiveNumber(process.env.FX_MAX_QUOTE_AGE_SECONDS, 180);

  if (!/^https:\/\//iu.test(baseUrl)) {
    throw new Error('FX_AWESOME_BASE_URL deve usar HTTPS.');
  }
  if (process.env.NODE_ENV === 'production' && !apiKey) {
    throw new Error('Cotação USD/BRL em tempo real indisponível. Configure FX_AWESOME_API_KEY.');
  }

  return { baseUrl, apiKey, timeoutMs, maxAgeSeconds };
}

export class UsdBrlExchangeRateService {
  async getCurrentQuote(): Promise<UsdBrlQuote> {
    const config = resolveConfig();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

    try {
      const response = await fetch(`${config.baseUrl}/json/last/USD-BRL`, {
        method: 'GET',
        redirect: 'error',
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
          ...(config.apiKey ? { 'x-api-key': config.apiKey } : {}),
        },
      });
      if (!response.ok) {
        throw new Error(`Falha ao consultar cotação USD/BRL (HTTP ${response.status}).`);
      }

      const payload = (await response.json().catch(() => null)) as AwesomeApiPayload | null;
      const quote = payload?.USDBRL;
      if (
        !quote ||
        String(quote.code || '').toUpperCase() !== 'USD' ||
        String(quote.codein || '').toUpperCase() !== 'BRL'
      ) {
        throw new Error('Resposta inesperada do provedor de cotação USD/BRL.');
      }

      const bid = parseRate(quote.bid, 'bid');
      const ask = parseRate(quote.ask, 'ask');
      const quotedAt = parseProviderTimestamp(quote.timestamp);
      const fetchedAt = new Date();
      const ageSeconds = Math.max(0, (fetchedAt.getTime() - quotedAt.getTime()) / 1000);
      if (ageSeconds > config.maxAgeSeconds) {
        throw new Error('Cotação USD/BRL desatualizada. Tente novamente em instantes.');
      }

      return {
        rateBrlPerUsd: ask,
        source: 'AWESOME_API',
        quotedAt,
        fetchedAt,
        bid,
        ask,
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Tempo limite ao consultar a cotação USD/BRL em tempo real.');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}

export default new UsdBrlExchangeRateService();
