import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { LookupAddress } from 'node:dns';
import { lookup as dnsLookup } from 'node:dns/promises';
import type { IncomingHttpHeaders } from 'node:http';
import * as https from 'node:https';
import { isIP } from 'node:net';
import { z } from 'zod';

import {
  createPinnedLookup,
  isPublicNetworkAddress,
} from '../../menuImport/security/ifoodScraperHttp.js';

const ALLOWED_PROVIDER_IMAGE_HOST = 'images.pexels.com';
const MAX_IMAGE_BYTES = 512 * 1024;
const MAX_DATA_URL_LENGTH = 700_000;
const DOWNLOAD_TIMEOUT_MS = 8_000;
const ephemeralTokenSecret = randomBytes(32);
const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

const selectionPayloadSchema = z.object({
  version: z.literal(1),
  restaurantId: z.number().int().positive(),
  provider: z.literal('pexels'),
  providerId: z.string().min(1).max(80),
  downloadUrl: z.string().url().max(2_048),
  expiresAt: z.number().int().positive(),
});

export type IngredientImageSelectionPayload = z.infer<typeof selectionPayloadSchema>;
export type IngredientImageDnsResolver = (hostname: string) => Promise<LookupAddress[]>;
export type IngredientImageHttpResponse = {
  statusCode: number;
  headers: IncomingHttpHeaders;
  body: Buffer;
};
export type IngredientImageHttpRequester = (
  url: URL,
  address: LookupAddress,
) => Promise<IngredientImageHttpResponse>;

function tokenSecret() {
  const configured = String(
    process.env.INGREDIENT_IMAGE_TOKEN_SECRET || process.env.JWT_SECRET || '',
  ).trim();
  return configured ? Buffer.from(configured) : ephemeralTokenSecret;
}

function signature(value: string) {
  return createHmac('sha256', tokenSecret()).update(value).digest();
}

export function createIngredientImageSelectionToken(payload: IngredientImageSelectionPayload) {
  const parsed = selectionPayloadSchema.parse(payload);
  const encoded = Buffer.from(JSON.stringify(parsed)).toString('base64url');
  return `${encoded}.${signature(encoded).toString('base64url')}`;
}

export function verifyIngredientImageSelectionToken(token: string, restaurantId: number) {
  const [encoded, encodedSignature, extra] = String(token || '').split('.');
  if (!encoded || !encodedSignature || extra || token.length > 4_096) {
    throw new Error('A seleção da imagem expirou ou é inválida. Pesquise novamente.');
  }

  let suppliedSignature: Buffer;
  try {
    suppliedSignature = Buffer.from(encodedSignature, 'base64url');
  } catch {
    throw new Error('A seleção da imagem expirou ou é inválida. Pesquise novamente.');
  }
  const expectedSignature = signature(encoded);
  if (
    suppliedSignature.length !== expectedSignature.length ||
    !timingSafeEqual(suppliedSignature, expectedSignature)
  ) {
    throw new Error('A seleção da imagem expirou ou é inválida. Pesquise novamente.');
  }

  let payload: IngredientImageSelectionPayload;
  try {
    payload = selectionPayloadSchema.parse(
      JSON.parse(Buffer.from(encoded, 'base64url').toString()),
    );
  } catch {
    throw new Error('A seleção da imagem expirou ou é inválida. Pesquise novamente.');
  }
  if (payload.restaurantId !== restaurantId || payload.expiresAt <= Date.now()) {
    throw new Error('A seleção da imagem expirou ou é inválida. Pesquise novamente.');
  }
  assertAllowedProviderImageUrl(payload.downloadUrl);
  return payload;
}

export function assertAllowedProviderImageUrl(value: string | URL) {
  let url: URL;
  try {
    url = value instanceof URL ? new URL(value.href) : new URL(String(value || ''));
  } catch {
    throw new Error('A imagem sugerida possui um endereço inválido.');
  }

  if (
    url.protocol !== 'https:' ||
    url.hostname.toLowerCase() !== ALLOWED_PROVIDER_IMAGE_HOST ||
    url.username ||
    url.password ||
    (url.port && url.port !== '443')
  ) {
    throw new Error('A imagem sugerida possui um endereço não permitido.');
  }
  url.hash = '';
  return url;
}

function detectImageType(buffer: Buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return 'image/png';
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}

function persistentDataUrl(buffer: Buffer, declaredType?: string) {
  if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) {
    throw new Error('A imagem ultrapassa o tamanho permitido.');
  }
  const detectedType = detectImageType(buffer);
  if (!detectedType || (declaredType && detectedType !== declaredType)) {
    throw new Error('O arquivo enviado não é uma imagem JPG, PNG ou WebP válida.');
  }
  const result = `data:${detectedType};base64,${buffer.toString('base64')}`;
  if (result.length > MAX_DATA_URL_LENGTH) {
    throw new Error('A imagem ultrapassa o tamanho permitido.');
  }
  return result;
}

export function normalizeIngredientImageUpload(value: string | null | undefined) {
  if (value === undefined) return undefined;
  if (value === null || !String(value).trim()) return null;
  const normalized = String(value).trim();
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/i.exec(normalized);
  if (!match || normalized.length > MAX_DATA_URL_LENGTH) {
    throw new Error('Envie uma imagem JPG, PNG ou WebP válida.');
  }
  return persistentDataUrl(Buffer.from(match[2], 'base64'), match[1].toLowerCase());
}

const defaultDnsResolver: IngredientImageDnsResolver = (hostname) =>
  dnsLookup(hostname, { all: true, verbatim: true });

async function resolvePublicAddresses(hostname: string, resolver: IngredientImageDnsResolver) {
  let addresses: LookupAddress[];
  try {
    addresses = await resolver(hostname);
  } catch {
    throw new Error('Não foi possível validar o endereço da imagem sugerida.');
  }
  if (!addresses.length) throw new Error('O endereço da imagem sugerida não foi encontrado.');
  for (const address of addresses) {
    if (
      (address.family !== 4 && address.family !== 6) ||
      isIP(address.address) !== address.family ||
      !isPublicNetworkAddress(address.address)
    ) {
      throw new Error('O endereço da imagem sugerida resolve para uma rede não permitida.');
    }
  }
  return addresses;
}

const defaultHttpRequester: IngredientImageHttpRequester = (url, address) =>
  new Promise((resolve, reject) => {
    const agent = new https.Agent({
      autoSelectFamily: false,
      family: address.family,
      keepAlive: false,
      maxSockets: 1,
      lookup: createPinnedLookup(url.hostname, address),
    });
    const request = https.get(
      url,
      {
        agent,
        headers: {
          Accept: 'image/jpeg,image/png,image/webp',
          'User-Agent': 'PecaJaFood-IngredientImage/1.0',
        },
      },
      (response) => {
        const chunks: Buffer[] = [];
        let receivedBytes = 0;
        response.on('data', (chunk: Buffer) => {
          receivedBytes += chunk.length;
          if (receivedBytes > MAX_IMAGE_BYTES) {
            response.destroy(new Error('A imagem ultrapassa o tamanho permitido.'));
            return;
          }
          chunks.push(chunk);
        });
        response.on('error', reject);
        response.on('end', () =>
          resolve({
            statusCode: response.statusCode || 0,
            headers: response.headers,
            body: Buffer.concat(chunks),
          }),
        );
      },
    );
    request.setTimeout(DOWNLOAD_TIMEOUT_MS, () =>
      request.destroy(new Error('O download da imagem demorou demais.')),
    );
    request.on('error', reject);
    request.on('close', () => agent.destroy());
  });

function header(headers: IncomingHttpHeaders, name: string) {
  const value = headers[name];
  return Array.isArray(value) ? value[0] : value;
}

export async function downloadProviderImage(
  input: string | URL,
  dependencies: {
    resolveHostname?: IngredientImageDnsResolver;
    request?: IngredientImageHttpRequester;
  } = {},
) {
  const url = assertAllowedProviderImageUrl(input);
  const addresses = await resolvePublicAddresses(
    url.hostname,
    dependencies.resolveHostname || defaultDnsResolver,
  );
  const response = await (dependencies.request || defaultHttpRequester)(url, addresses[0]);
  if (response.statusCode !== 200) {
    throw new Error('Não foi possível importar a imagem sugerida.');
  }
  const contentEncoding = String(header(response.headers, 'content-encoding') || '').toLowerCase();
  if (contentEncoding && contentEncoding !== 'identity') {
    throw new Error('A imagem sugerida usa uma codificação não permitida.');
  }
  const contentType = String(header(response.headers, 'content-type') || '')
    .split(';', 1)[0]
    .trim()
    .toLowerCase();
  if (!allowedImageTypes.has(contentType)) {
    throw new Error('O provedor não retornou uma imagem válida.');
  }
  const contentLength = Number(header(response.headers, 'content-length'));
  if (Number.isFinite(contentLength) && contentLength > MAX_IMAGE_BYTES) {
    throw new Error('A imagem ultrapassa o tamanho permitido.');
  }
  return persistentDataUrl(response.body, contentType);
}
