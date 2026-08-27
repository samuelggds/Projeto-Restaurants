import type { LookupAddress } from 'node:dns';
import { lookup as dnsLookup } from 'node:dns/promises';
import type { IncomingHttpHeaders } from 'node:http';
import * as https from 'node:https';
import { isIP, type LookupFunction } from 'node:net';

export const MAX_IFOOD_REDIRECTS = 5;
export const MAX_IFOOD_HTML_BYTES = 2 * 1024 * 1024;
export const IFOOD_REQUEST_TIMEOUT_MS = 15_000;

const MAX_IFOOD_URL_LENGTH = 2_048;
const MAX_RESPONSE_HEADER_BYTES = 16 * 1024;
const IFOOD_ROOT_HOSTNAME = 'ifood.com.br';
const REDIRECT_STATUS_CODES = new Set([301, 302, 303, 307, 308]);
const HTML_CONTENT_TYPES = new Set(['text/html', 'application/xhtml+xml']);

export type IfoodDnsResolver = (hostname: string) => Promise<LookupAddress[]>;

export type IfoodHttpResponse = {
  statusCode: number;
  headers: IncomingHttpHeaders;
  body: string;
};

export type IfoodHttpRequester = (
  url: URL,
  addresses: LookupAddress[],
) => Promise<IfoodHttpResponse>;

export type FetchIfoodHtmlDependencies = {
  resolveHostname?: IfoodDnsResolver;
  request?: IfoodHttpRequester;
};

function isIpv4InCidr(value: number, prefix: number, prefixLength: number) {
  const divisor = 2 ** (32 - prefixLength);
  return Math.floor(value / divisor) === Math.floor(prefix / divisor);
}

function parseIpv4(address: string) {
  if (isIP(address) !== 4) {
    return null;
  }

  const octets = address.split('.').map(Number);
  return octets.reduce((value, octet) => value * 256 + octet, 0);
}

function parseIpv6(address: string) {
  const withoutZone = address.toLowerCase().split('%', 1)[0];
  if (isIP(withoutZone) !== 6) {
    return null;
  }

  let normalized = withoutZone;
  const lastColon = normalized.lastIndexOf(':');
  const possibleIpv4 = normalized.slice(lastColon + 1);

  if (possibleIpv4.includes('.')) {
    const ipv4 = parseIpv4(possibleIpv4);
    if (ipv4 === null) {
      return null;
    }

    const high = Math.floor(ipv4 / 65_536).toString(16);
    const low = (ipv4 % 65_536).toString(16);
    normalized = `${normalized.slice(0, lastColon)}:${high}:${low}`;
  }

  const halves = normalized.split('::');
  if (halves.length > 2) {
    return null;
  }

  const left = halves[0] ? halves[0].split(':') : [];
  const right = halves[1] ? halves[1].split(':') : [];
  const missingGroups = 8 - left.length - right.length;

  if ((halves.length === 1 && missingGroups !== 0) || missingGroups < 0) {
    return null;
  }

  const groups = [
    ...left,
    ...Array.from({ length: halves.length === 2 ? missingGroups : 0 }, () => '0'),
    ...right,
  ];

  if (groups.length !== 8 || groups.some((group) => !/^[0-9a-f]{1,4}$/i.test(group))) {
    return null;
  }

  return groups.reduce((value, group) => (value << 16n) + BigInt(`0x${group}`), 0n);
}

function ipv6MatchesPrefix(value: bigint, prefix: bigint, prefixLength: number) {
  const shift = BigInt(128 - prefixLength);
  return value >> shift === prefix >> shift;
}

function isPublicIpv4(address: string) {
  const value = parseIpv4(address);
  if (value === null) {
    return false;
  }

  const blockedRanges: Array<[number, number]> = [
    [0x00000000, 8], // Current network and unspecified addresses.
    [0x0a000000, 8], // RFC 1918.
    [0x64400000, 10], // Carrier-grade NAT and metadata endpoints such as 100.100.100.200.
    [0x7f000000, 8], // Loopback.
    [0xa9fe0000, 16], // Link-local and 169.254.169.254 cloud metadata.
    [0xac100000, 12], // RFC 1918.
    [0xc0000000, 24], // IETF protocol assignments.
    [0xc0000200, 24], // Documentation.
    [0xc0586300, 24], // Deprecated 6to4 relay anycast.
    [0xc0a80000, 16], // RFC 1918.
    [0xc6120000, 15], // Benchmarking.
    [0xc6336400, 24], // Documentation.
    [0xcb007100, 24], // Documentation.
    [0xe0000000, 4], // Multicast.
    [0xf0000000, 4], // Reserved and limited broadcast.
  ];

  return !blockedRanges.some(([prefix, prefixLength]) =>
    isIpv4InCidr(value, prefix, prefixLength),
  );
}

function isPublicIpv6(address: string) {
  const value = parseIpv6(address);
  if (value === null) {
    return false;
  }

  const ipv4CompatiblePrefix = 0n;
  const ipv4MappedPrefix = 0xffffn;
  const first96Bits = value >> 32n;

  if (first96Bits === ipv4CompatiblePrefix || first96Bits === ipv4MappedPrefix) {
    const embeddedIpv4 = Number(value & 0xffffffffn);
    const addressText = [24, 16, 8, 0]
      .map((shift) => String((embeddedIpv4 >>> shift) & 0xff))
      .join('.');
    return isPublicIpv4(addressText);
  }

  const blockedRanges: Array<[bigint, number]> = [
    [0x0064ff9b000000000000000000000000n, 32], // NAT64 translation prefixes.
    [0x01000000000000000000000000000000n, 64], // Discard-only.
    [0x20010000000000000000000000000000n, 32], // Teredo.
    [0x20010002000000000000000000000000n, 48], // Benchmarking.
    [0x20010db8000000000000000000000000n, 32], // Documentation.
    [0x20010010000000000000000000000000n, 28], // ORCHID.
    [0x20020000000000000000000000000000n, 16], // 6to4 can embed non-public IPv4.
    [0xfcn << 120n, 7], // Unique local.
    [0xfe80n << 112n, 10], // Link-local.
    [0xfec0n << 112n, 10], // Deprecated site-local.
    [0xffn << 120n, 8], // Multicast.
  ];

  return !blockedRanges.some(([prefix, prefixLength]) =>
    ipv6MatchesPrefix(value, prefix, prefixLength),
  );
}

export function isPublicNetworkAddress(address: string) {
  const family = isIP(address);
  if (family === 4) {
    return isPublicIpv4(address);
  }

  if (family === 6) {
    return isPublicIpv6(address);
  }

  return false;
}

export function assertAllowedIfoodUrl(rawUrl: string | URL) {
  const serializedUrl = rawUrl instanceof URL ? rawUrl.href : String(rawUrl || '').trim();

  if (!serializedUrl || serializedUrl.length > MAX_IFOOD_URL_LENGTH) {
    throw new Error('A URL do iFood é inválida ou excede o tamanho permitido.');
  }

  let url: URL;
  try {
    url = new URL(serializedUrl);
  } catch {
    throw new Error('Informe uma URL HTTPS válida do iFood.');
  }

  if (url.protocol !== 'https:') {
    throw new Error('A importação aceita somente URLs HTTPS do iFood.');
  }

  if (url.username || url.password) {
    throw new Error('A URL do iFood não pode conter credenciais.');
  }

  if (url.port && url.port !== '443') {
    throw new Error('A URL do iFood deve usar a porta HTTPS padrão.');
  }

  const hostname = url.hostname.toLowerCase();
  const isOfficialHostname =
    hostname === IFOOD_ROOT_HOSTNAME || hostname.endsWith(`.${IFOOD_ROOT_HOSTNAME}`);

  if (!isOfficialHostname) {
    throw new Error('A URL deve pertencer ao domínio oficial ifood.com.br.');
  }

  url.hash = '';
  return url;
}

const defaultDnsResolver: IfoodDnsResolver = (hostname) =>
  dnsLookup(hostname, {
    all: true,
    verbatim: true,
  });

export async function resolvePublicIfoodAddresses(
  hostname: string,
  resolver: IfoodDnsResolver = defaultDnsResolver,
) {
  let addresses: LookupAddress[];
  try {
    addresses = await resolver(hostname);
  } catch {
    throw new Error('Não foi possível resolver o endereço do iFood.');
  }

  if (!addresses.length) {
    throw new Error('O domínio do iFood não retornou nenhum endereço de rede.');
  }

  const uniqueAddresses = Array.from(
    new Map(addresses.map((address) => [`${address.family}:${address.address}`, address])).values(),
  );

  for (const address of uniqueAddresses) {
    const detectedFamily = isIP(address.address);
    if (
      (address.family !== 4 && address.family !== 6) ||
      detectedFamily !== address.family ||
      !isPublicNetworkAddress(address.address)
    ) {
      throw new Error('O domínio informado resolve para uma rede privada ou não permitida.');
    }
  }

  return uniqueAddresses;
}

export function createPinnedLookup(
  expectedHostname: string,
  address: LookupAddress,
): LookupFunction {
  return (hostname, options, callback) => {
    if (hostname.toLowerCase() !== expectedHostname.toLowerCase()) {
      const error = new Error('O destino DNS da requisição foi alterado.') as NodeJS.ErrnoException;
      error.code = 'EACCES';
      callback(error, '', 0);
      return;
    }

    if (options.all) {
      callback(null, [address]);
      return;
    }

    callback(null, address.address, address.family);
  };
}

function readHeader(headers: IncomingHttpHeaders, name: string) {
  const value = headers[name];
  return Array.isArray(value) ? value[0] : value;
}

function assertHtmlResponseHeaders(headers: IncomingHttpHeaders) {
  const contentType = normalizeContentType(readHeader(headers, 'content-type'));
  if (!contentType || !HTML_CONTENT_TYPES.has(contentType)) {
    throw new Error('A página do iFood não retornou conteúdo HTML válido.');
  }

  const contentEncoding = String(readHeader(headers, 'content-encoding') || '')
    .trim()
    .toLowerCase();
  if (contentEncoding && contentEncoding !== 'identity') {
    throw new Error('A página do iFood retornou uma codificação de conteúdo não permitida.');
  }

  const contentLength = Number(readHeader(headers, 'content-length'));
  if (Number.isFinite(contentLength) && contentLength > MAX_IFOOD_HTML_BYTES) {
    throw new Error('A página do iFood excede o limite de tamanho permitido.');
  }
}

function normalizeContentType(value: string | undefined) {
  return String(value || '').split(';', 1)[0].trim().toLowerCase();
}

const defaultHttpRequester: IfoodHttpRequester = async (url, addresses) => {
  const selectedAddress = addresses[0];
  const agent = new https.Agent({
    autoSelectFamily: false,
    family: selectedAddress.family,
    keepAlive: false,
    maxSockets: 1,
    lookup: createPinnedLookup(url.hostname, selectedAddress),
  });

  try {
    return await new Promise<IfoodHttpResponse>((resolve, reject) => {
      let settled = false;

      const cleanup = () => {
        clearTimeout(timeout);
      };

      const resolveOnce = (response: IfoodHttpResponse) => {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();
        resolve(response);
      };

      const rejectOnce = (error: unknown) => {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();
        reject(error instanceof Error ? error : new Error('Falha ao carregar a página do iFood.'));
      };

      const request = https.request(
        url,
        {
          method: 'GET',
          agent,
          family: selectedAddress.family,
          maxHeaderSize: MAX_RESPONSE_HEADER_BYTES,
          headers: {
            'User-Agent': [
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
              'AppleWebKit/537.36 (KHTML, like Gecko)',
              'Chrome/126.0.0.0 Safari/537.36',
            ].join(' '),
            Accept: 'text/html,application/xhtml+xml;q=0.9',
            'Accept-Encoding': 'identity',
            'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
            Referer: 'https://www.ifood.com.br/',
            'Cache-Control': 'no-cache',
            Pragma: 'no-cache',
            Connection: 'close',
          },
        },
        (response) => {
          const statusCode = response.statusCode || 0;

          if (REDIRECT_STATUS_CODES.has(statusCode) || statusCode < 200 || statusCode >= 300) {
            response.resume();
            resolveOnce({
              statusCode,
              headers: response.headers,
              body: '',
            });
            return;
          }

          try {
            assertHtmlResponseHeaders(response.headers);
          } catch (error) {
            response.destroy();
            rejectOnce(error);
            return;
          }

          const chunks: Buffer[] = [];
          let receivedBytes = 0;

          response.on('data', (chunk: Buffer | string) => {
            const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
            receivedBytes += buffer.length;

            if (receivedBytes > MAX_IFOOD_HTML_BYTES) {
              response.destroy();
              rejectOnce(new Error('A página do iFood excede o limite de tamanho permitido.'));
              return;
            }

            chunks.push(buffer);
          });
          response.once('error', rejectOnce);
          response.once('end', () => {
            resolveOnce({
              statusCode,
              headers: response.headers,
              body: Buffer.concat(chunks).toString('utf8'),
            });
          });
        },
      );

      request.once('error', rejectOnce);
      const timeout = setTimeout(() => {
        request.destroy(new Error('A página do iFood excedeu o tempo limite de resposta.'));
      }, IFOOD_REQUEST_TIMEOUT_MS);
      request.end();
    });
  } finally {
    agent.destroy();
  }
};

export async function fetchIfoodHtml(
  rawUrl: string | URL,
  dependencies: FetchIfoodHtmlDependencies = {},
) {
  const resolver = dependencies.resolveHostname || defaultDnsResolver;
  const requester = dependencies.request || defaultHttpRequester;
  let currentUrl = assertAllowedIfoodUrl(rawUrl);
  const visitedUrls = new Set<string>();

  for (let redirectCount = 0; redirectCount <= MAX_IFOOD_REDIRECTS; redirectCount += 1) {
    if (visitedUrls.has(currentUrl.href)) {
      throw new Error('A página do iFood contém um ciclo de redirecionamento.');
    }
    visitedUrls.add(currentUrl.href);

    const addresses = await resolvePublicIfoodAddresses(currentUrl.hostname, resolver);
    const response = await requester(currentUrl, addresses);

    if (REDIRECT_STATUS_CODES.has(response.statusCode)) {
      if (redirectCount === MAX_IFOOD_REDIRECTS) {
        throw new Error('A página do iFood excedeu o limite de redirecionamentos.');
      }

      const location = readHeader(response.headers, 'location');
      if (!location) {
        throw new Error('O redirecionamento do iFood não informou um destino válido.');
      }

      currentUrl = assertAllowedIfoodUrl(new URL(location, currentUrl));
      continue;
    }

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw new Error(`O iFood respondeu com status HTTP ${response.statusCode}.`);
    }

    assertHtmlResponseHeaders(response.headers);

    if (Buffer.byteLength(response.body, 'utf8') > MAX_IFOOD_HTML_BYTES) {
      throw new Error('A página do iFood excede o limite de tamanho permitido.');
    }

    if (!response.body.trim()) {
      throw new Error('Não foi possível carregar o HTML da página informada.');
    }

    return {
      html: response.body,
      finalUrl: currentUrl.href,
    };
  }

  throw new Error('A página do iFood excedeu o limite de redirecionamentos.');
}
