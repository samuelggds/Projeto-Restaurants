import { createHmac, randomUUID } from 'node:crypto';

type Environment = 'sandbox' | 'production';
type Method = 'GET' | 'POST' | 'DELETE';

export type LalamoveCredentials = {
  apiKey: string;
  apiSecret: string;
  environment: Environment;
};

export type LalamoveStop = {
  coordinates: { lat: string; lng: string };
  address: string;
};

export type LalamoveQuotation = {
  quotationId: string;
  expiresAt: Date;
  total: string;
  currency: 'BRL';
  serviceType: 'LALAGO' | 'LALAPRO';
  thermalBagRequired: true;
  pickupStopId: string;
  dropoffStopId: string;
};

export type LalamoveBooking = {
  orderId: string;
  status: string;
  shareLink: string | null;
};

type LalamoveClientOptions = {
  transport?: typeof fetch;
  clock?: () => number;
  nonce?: () => string;
  productionEnabled?: boolean;
};

const HOSTS: Record<Environment, string> = {
  sandbox: 'https://rest.sandbox.lalamove.com',
  production: 'https://rest.lalamove.com',
};
export const THERMAL_BAG_SERVICE = 'THERMAL_BAG_1';

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Resposta inválida da Lalamove.');
  }
  return value as Record<string, unknown>;
}

function identifier(value: unknown): string {
  const text = String(value ?? '').trim();
  if (!/^[0-9]{1,24}$/.test(text)) {
    throw new Error('Identificador inválido da Lalamove.');
  }
  return text;
}

function stopForQuotation(value: LalamoveStop): LalamoveStop {
  const latitude = Number(value?.coordinates?.lat);
  const longitude = Number(value?.coordinates?.lng);
  const address = String(value?.address ?? '').trim();
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180 ||
    address.length < 5 ||
    address.length > 500
  ) {
    throw new Error('Endereço ou coordenadas de entrega inválidos.');
  }
  return {
    coordinates: { lat: String(latitude), lng: String(longitude) },
    address,
  };
}

function cityKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function availableNow(value: unknown, nowMs: number): boolean {
  const entry = record(value);
  if (entry.name !== THERMAL_BAG_SERVICE) return false;
  const startsAt = String(entry.effective_time ?? '').trim();
  const stopsAt = String(entry.offline_time ?? '').trim();
  const startMs = startsAt ? Date.parse(startsAt) : Number.NEGATIVE_INFINITY;
  const endMs = stopsAt ? Date.parse(stopsAt) : Number.POSITIVE_INFINITY;
  return !Number.isNaN(startMs) && !Number.isNaN(endMs) && startMs <= nowMs && nowMs < endMs;
}

/**
 * GET /v3/cities is the source of truth: specialRequests differ by city.
 * A thermal bag is mandatory for all GastroNexa restaurant food deliveries.
 * Never silently downgrade to an ordinary motorcycle.
 */
export function selectThermalBagMotorcycle(
  cityData: unknown[],
  requestedCity: string,
  nowMs = Date.now(),
): 'LALAGO' | 'LALAPRO' {
  const cityName = String(requestedCity || '').trim();
  if (!cityName || cityName.length > 100 || !Array.isArray(cityData)) {
    throw new Error('Cidade inválida para entrega com bolsa térmica.');
  }
  const city = cityData
    .filter((item) => item && typeof item === 'object' && !Array.isArray(item))
    .map((item) => record(item))
    .find((item) => cityKey(String(item.name ?? '')) === cityKey(cityName));
  if (!city || !Array.isArray(city.services)) {
    throw new Error('Serviço de moto com bolsa térmica indisponível nesta cidade.');
  }
  for (const candidate of ['LALAGO', 'LALAPRO'] as const) {
    const service = city.services
      .filter((item) => item && typeof item === 'object' && !Array.isArray(item))
      .map((item) => record(item))
      .find((item) => item.key === candidate);
    if (
      service &&
      Array.isArray(service.specialRequests) &&
      service.specialRequests.some((item: unknown) => {
        try {
          return availableNow(item, nowMs);
        } catch {
          return false;
        }
      })
    ) {
      return candidate;
    }
  }
  throw new Error('Serviço de moto com bolsa térmica indisponível nesta cidade.');
}

function assertQuoteHasThermalBag(data: Record<string, unknown>, nowMs: number) {
  if (
    !['LALAGO', 'LALAPRO'].includes(String(data.serviceType ?? '')) ||
    !Array.isArray(data.specialRequests) ||
    !data.specialRequests.includes(THERMAL_BAG_SERVICE)
  ) {
    throw new Error('Cotação sem confirmação de bolsa térmica. Entrega bloqueada.');
  }
  const expiresAt = new Date(String(data.expiresAt ?? ''));
  if (!Number.isFinite(expiresAt.getTime()) || expiresAt.getTime() <= nowMs) {
    throw new Error('Cotação da Lalamove expirada.');
  }
  return expiresAt;
}

export function signLalamoveRequest(
  timestamp: string,
  method: Method,
  path: string,
  serializedBody: string,
  secret: string,
): string {
  const toSign = [timestamp, method, path, '', serializedBody].join('\r\n');
  return createHmac('sha256', secret).update(toSign, 'utf8').digest('hex');
}

export function createLalamoveApiClient(
  credentials: LalamoveCredentials,
  options: LalamoveClientOptions = {},
) {
  const expectedPrefix = credentials.environment === 'sandbox' ? 'test' : 'prod';
  if (
    !HOSTS[credentials.environment] ||
    !credentials.apiKey?.startsWith('pk_' + expectedPrefix) ||
    !credentials.apiSecret?.startsWith('sk_' + expectedPrefix)
  ) {
    throw new Error('Credenciais da Lalamove incompatíveis com o ambiente.');
  }
  if (credentials.environment === 'production' && options.productionEnabled !== true) {
    throw new Error('Contratação de entregadores reais ainda não está habilitada.');
  }

  const transport = options.transport ?? fetch;
  const clock = options.clock ?? Date.now;
  const nonce = options.nonce ?? randomUUID;
  let cachedCities: { until: number; rows: unknown[] } | null = null;

  async function request(method: Method, path: string, payload?: object): Promise<unknown> {
    const body = payload === undefined ? '' : JSON.stringify({ data: payload });
    const timestamp = String(clock());
    const signature = signLalamoveRequest(timestamp, method, path, body, credentials.apiSecret);

    const response = await transport(HOSTS[credentials.environment] + path, {
      method,
      redirect: 'error',
      signal: AbortSignal.timeout(15_000),
      headers: {
        Authorization: 'hmac ' + credentials.apiKey + ':' + timestamp + ':' + signature,
        Market: 'BR',
        'Request-ID': nonce(),
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      ...(body ? { body } : {}),
    });
    if (!response.ok) {
      // Provider errors may contain customer data. Never expose raw bodies.
      throw new Error('Lalamove indisponível (HTTP ' + response.status + ').');
    }
    if (response.status === 204) return null;
    const envelope: unknown = await response.json();
    return record(envelope).data;
  }

  async function getCities(): Promise<unknown[]> {
    if (cachedCities && clock() < cachedCities.until) return cachedCities.rows;
    const data = await request('GET', '/v3/cities');
    if (!Array.isArray(data)) throw new Error('Resposta inválida de cidades da Lalamove.');
    cachedCities = { until: clock() + 5 * 60_000, rows: data };
    return data;
  }

  return {
    environment: credentials.environment,
    getCities,

    async quotation(input: {
      cityName: string;
      stops: [LalamoveStop, LalamoveStop];
    }): Promise<LalamoveQuotation> {
      if (!Array.isArray(input.stops) || input.stops.length !== 2) {
        throw new Error('Parâmetros da cotação inválidos.');
      }
      const validatedStops = input.stops.map(stopForQuotation);
      const serviceType = selectThermalBagMotorcycle(await getCities(), input.cityName, clock());
      const data = record(
        await request('POST', '/v3/quotations', {
          serviceType,
          specialRequests: [THERMAL_BAG_SERVICE],
          language: 'pt_BR',
          stops: validatedStops,
        }),
      );
      const expiresAt = assertQuoteHasThermalBag(data, clock());
      if (data.serviceType !== serviceType) {
        throw new Error('Lalamove alterou o serviço com bolsa térmica solicitado.');
      }
      const price = record(data.priceBreakdown);
      const stops = data.stops;
      const total = String(price.total ?? '');
      if (
        price.currency !== 'BRL' ||
        !/^[0-9]+(?:\.[0-9]{1,2})?$/.test(total) ||
        !Array.isArray(stops) ||
        stops.length !== 2
      ) {
        throw new Error('Resposta incompleta da cotação Lalamove.');
      }
      return {
        quotationId: identifier(data.quotationId),
        expiresAt,
        total,
        currency: 'BRL',
        serviceType,
        thermalBagRequired: true,
        pickupStopId: identifier(record(stops[0]).stopId),
        dropoffStopId: identifier(record(stops[1]).stopId),
      };
    },

    async placeOrder(input: {
      quotationId: string;
      sender: { stopId: string; name: string; phone: string };
      recipients: [{ stopId: string; name: string; phone: string; remarks?: string }];
    }): Promise<LalamoveBooking> {
      const quotationId = identifier(input.quotationId);
      identifier(input.sender?.stopId);
      if (
        !String(input.sender?.name ?? '').trim() ||
        !String(input.sender?.phone ?? '').trim() ||
        !Array.isArray(input.recipients) ||
        input.recipients.length !== 1
      ) {
        throw new Error('Contatos de entrega inválidos.');
      }
      const recipient = input.recipients[0];
      identifier(recipient.stopId);
      if (!String(recipient.name ?? '').trim() || !String(recipient.phone ?? '').trim()) {
        throw new Error('Contato do destinatário inválido.');
      }
      // Re-verify the actual provider quotation: caller-provided flags are not proof.
      // This is not a replacement for persistent tenant-scoped booking locks.
      const quotation = record(await request('GET', '/v3/quotations/' + quotationId));
      assertQuoteHasThermalBag(quotation, clock());
      if (
        identifier(quotation.quotationId) !== quotationId ||
        !Array.isArray(quotation.stops) ||
        quotation.stops.length !== 2 ||
        identifier(record(quotation.stops[0]).stopId) !== input.sender.stopId ||
        identifier(record(quotation.stops[1]).stopId) !== recipient.stopId
      ) {
        throw new Error('Paradas incompatíveis com a cotação térmica.');
      }

      const data = record(await request('POST', '/v3/orders', input));
      return {
        orderId: identifier(data.orderId),
        status: String(data.status ?? ''),
        shareLink: typeof data.shareLink === 'string' ? data.shareLink : null,
      };
    },

    async orderDetails(orderId: string): Promise<LalamoveBooking> {
      const data = record(await request('GET', '/v3/orders/' + identifier(orderId)));
      return {
        orderId: identifier(data.orderId),
        status: String(data.status ?? ''),
        shareLink: typeof data.shareLink === 'string' ? data.shareLink : null,
      };
    },

    async cancelOrder(orderId: string): Promise<void> {
      await request('DELETE', '/v3/orders/' + identifier(orderId));
    },
  };
}
