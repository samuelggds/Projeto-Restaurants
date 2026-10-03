import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import prisma from '../config/prisma.js';
import {
  decryptCredential,
  encryptCredential,
} from '../modules/restaurantSettings/security/credentialEncryption.js';
import { buildTenantWhatsappGreeting } from './gupshupInbound.js';
import { enqueueWhatsappSessionGreeting } from './notificationOutbox.js';

type ConnectionRow = {
  id: bigint;
  restaurantId: number;
  provider: string;
  externalInstanceId: string;
  instanceTokenCiphertext: string;
  webhookSecretHash: string;
  phone: string | null;
  status: string;
  trialExpiresAt: Date | null;
  connectedAt: Date | null;
  disconnectedAt: Date | null;
  lastWebhookAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type JsonRecord = Record<string, unknown>;

type EvolutionInstanceInfo = JsonRecord & {
  name?: unknown;
  connectionStatus?: unknown;
  ownerJid?: unknown;
  number?: unknown;
  profileName?: unknown;
  _count?: unknown;
};

export class EvolutionRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly operation: string,
  ) {
    super('Falha na comunicação com o serviço de WhatsApp.');
    this.name = 'EvolutionRequestError';
  }
}

function env(name: string) {
  return String(process.env[name] || '').trim();
}

function digitsOnly(value: unknown) {
  return String(value || '').replace(/\D/g, '');
}

const EVOLUTION_QR_MAX_ATTEMPTS = 5;
const EVOLUTION_QR_RETRY_DELAY_MS = 700;
const MAX_QR_IMAGE_LENGTH = 2_500_000;
const MAX_QR_CONTENT_LENGTH = 20_000;

function record(value: unknown): JsonRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function normalizeQrImage(value: unknown) {
  const raw = String(value || '').trim();
  if (!raw || raw.length > MAX_QR_IMAGE_LENGTH) return '';
  if (/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=\r\n]+$/u.test(raw)) {
    return raw;
  }
  if (raw.length >= 128 && /^[A-Za-z0-9+/=\r\n]+$/u.test(raw)) {
    return `data:image/png;base64,${raw}`;
  }
  return '';
}

function normalizeQrContent(value: unknown) {
  const raw = String(value || '').trim();
  if (!raw || raw.length > MAX_QR_CONTENT_LENGTH) return '';
  if (/^data:image\//iu.test(raw)) return '';
  return raw;
}

export function extractEvolutionQrPayload(payload: unknown) {
  const root = record(payload);
  const data = record(root?.data);
  const candidates = [
    record(root?.qrcode),
    root,
    record(data?.qrcode),
    data,
  ].filter((value): value is JsonRecord => Boolean(value));

  for (const candidate of candidates) {
    const qrCode = normalizeQrImage(candidate.base64);
    const rawContent =
      typeof candidate.code === 'string'
        ? candidate.code
        : typeof candidate.qrcode === 'string'
          ? candidate.qrcode
          : '';
    const qrContent = normalizeQrContent(rawContent);
    const pairingCode =
      typeof candidate.pairingCode === 'string' && candidate.pairingCode.trim()
        ? candidate.pairingCode.trim()
        : null;
    if (qrCode || qrContent || pairingCode) {
      return { qrCode, qrContent, pairingCode };
    }
  }

  return { qrCode: '', qrContent: '', pairingCode: null };
}

function connectionStateFromPayload(payload: unknown) {
  const root = record(payload);
  const instance = record(root?.instance);
  return String(instance?.state || root?.state || '').trim().toLowerCase();
}

function evolutionBaseUrl() {
  const configured = env('EVOLUTION_TENANT_API_URL') || env('EVOLUTION_API_URL');
  if (!configured) {
    throw new Error('EVOLUTION_TENANT_API_URL não configurada para os WhatsApps dos restaurantes.');
  }
  const url = new URL(configured);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('EVOLUTION_API_URL inválida.');
  }
  return url.toString().replace(/\/+$/u, '');
}

function globalApiKey() {
  const value = env('EVOLUTION_TENANT_API_KEY') || env('EVOLUTION_API_KEY');
  if (!value) {
    throw new Error('EVOLUTION_TENANT_API_KEY não configurada para os WhatsApps dos restaurantes.');
  }
  return value;
}

function backendBaseUrl() {
  const configured = env('BACKEND_URL');
  if (!configured) throw new Error('BACKEND_URL não configurada para o webhook da Evolution API.');
  const url = new URL(configured);
  if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
    throw new Error('BACKEND_URL deve usar HTTPS em produção.');
  }
  return url.toString().replace(/\/+$/u, '');
}

function tokenContext(restaurantId: number) {
  return `restaurant-whatsapp-connection:evolution:${restaurantId}`;
}

function hashSecret(value: string) {
  return createHash('sha256').update(value).digest();
}

function secretMatches(value: string, storedHex: string) {
  const candidate = hashSecret(value);
  const stored = Buffer.from(storedHex, 'hex');
  return stored.length === candidate.length && timingSafeEqual(candidate, stored);
}

const LEGACY_TENANT_INSTANCE_PATTERN = /^gastronexa-\d+$/u;
const TENANT_INSTANCE_PATTERN = /^gastronexa-(?:dev|test|stage|prod)-\d+-[a-f0-9]{16}$/u;

function evolutionEnvironmentNamespace() {
  const environment = String(process.env.NODE_ENV || 'development')
    .trim()
    .toLowerCase();
  if (environment === 'production') return 'prod';
  if (environment === 'test' || environment === 'testing') return 'test';
  if (environment === 'staging' || environment === 'stage') return 'stage';
  return 'dev';
}

export function isTenantEvolutionInstanceName(value: unknown) {
  const instanceName = String(value || '').trim();
  return (
    LEGACY_TENANT_INSTANCE_PATTERN.test(instanceName) ||
    TENANT_INSTANCE_PATTERN.test(instanceName)
  );
}

export function buildTenantEvolutionInstanceName(
  restaurantId: number,
  nonce = randomBytes(8).toString('hex'),
) {
  if (!Number.isInteger(restaurantId) || restaurantId <= 0) {
    throw new Error('restaurantId inválido para instância Evolution.');
  }
  const normalizedNonce = String(nonce || '').trim().toLowerCase();
  if (!/^[a-f0-9]{16}$/u.test(normalizedNonce)) {
    throw new Error('Identificador aleatório inválido para instância Evolution.');
  }
  return `gastronexa-${evolutionEnvironmentNamespace()}-${restaurantId}-${normalizedNonce}`;
}

async function readConnectionByRestaurant(restaurantId: number) {
  const rows = await prisma.$queryRaw<ConnectionRow[]>`
    SELECT * FROM "RestaurantWhatsappConnection"
    WHERE "restaurantId" = ${restaurantId}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

async function readConnectionByInstance(instanceName: string) {
  const rows = await prisma.$queryRaw<ConnectionRow[]>`
    SELECT * FROM "RestaurantWhatsappConnection"
    WHERE "externalInstanceId" = ${instanceName}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

function publicConnection(row: ConnectionRow | null) {
  if (!row || row.provider !== 'EVOLUTION') {
    return { configured: false, provider: 'EVOLUTION', status: 'NOT_CONFIGURED' } as const;
  }
  return {
    configured: true,
    provider: 'EVOLUTION' as const,
    status: row.status,
    phone: row.phone,
    connectedAt: row.connectedAt?.toISOString() ?? null,
    disconnectedAt: row.disconnectedAt?.toISOString() ?? null,
  };
}

function instanceToken(row: ConnectionRow) {
  const token = decryptCredential(row.instanceTokenCiphertext, tokenContext(row.restaurantId));
  if (!token) throw new Error('Credencial da conexão Evolution indisponível. Reconecte o WhatsApp.');
  return token;
}

async function evolutionRequest(
  path: string,
  options: { method?: string; body?: unknown; apiKey?: string } = {},
) {
  const response = await fetch(`${evolutionBaseUrl()}${path}`, {
    method: options.method || 'GET',
    redirect: 'error',
    signal: AbortSignal.timeout(12_000),
    headers: {
      apikey: options.apiKey || globalApiKey(),
      'Content-Type': 'application/json',
    },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });
  const text = await response.text();
  let payload: unknown;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }
  if (!response.ok) {
    const operation = path
      .split('?')[0]
      .split('/')
      .filter(Boolean)
      .slice(0, 2)
      .join('/');
    throw new EvolutionRequestError(response.status, operation);
  }
  return payload;
}

function countEvolutionInstanceData(instance: EvolutionInstanceInfo) {
  const counts =
    instance._count && typeof instance._count === 'object' && !Array.isArray(instance._count)
      ? (instance._count as JsonRecord)
      : {};
  return ['Message', 'Contact', 'Chat'].reduce((total, key) => {
    const value = Number(counts[key] || 0);
    return total + (Number.isFinite(value) && value > 0 ? value : 0);
  }, 0);
}

export function isSafeDisposableOrphanEvolutionInstance(instance: EvolutionInstanceInfo | null) {
  if (!instance) return false;
  const state = String(instance.connectionStatus || '').trim().toLowerCase();
  const ownerJid = String(instance.ownerJid || '').trim();
  const number = digitsOnly(instance.number);
  const profileName = String(instance.profileName || '').trim();

  return (
    state === 'close' &&
    !ownerJid &&
    !number &&
    !profileName &&
    countEvolutionInstanceData(instance) === 0
  );
}

export function isEvolutionInstanceNotFound(error: unknown) {
  return (
    error instanceof EvolutionRequestError &&
    error.status === 404 &&
    error.operation === 'instance/fetchInstances'
  );
}

export function isRecoverableEvolutionDisconnectError(error: unknown) {
  return (
    error instanceof EvolutionRequestError &&
    [401, 404].includes(error.status) &&
    error.operation === 'instance/logout'
  );
}

async function fetchEvolutionInstance(instanceName: string) {
  let payload: unknown;
  try {
    payload = await evolutionRequest(
      `/instance/fetchInstances?instanceName=${encodeURIComponent(instanceName)}`,
    );
  } catch (error) {
    if (isEvolutionInstanceNotFound(error)) return null;
    throw error;
  }

  const list = Array.isArray(payload) ? payload : [];
  const match = list.find(
    (candidate) =>
      candidate &&
      typeof candidate === 'object' &&
      String((candidate as EvolutionInstanceInfo).name || '') === instanceName,
  );
  return (match as EvolutionInstanceInfo | undefined) ?? null;
}

async function prepareEvolutionInstanceName(instanceName: string) {
  const remote = await fetchEvolutionInstance(instanceName);
  if (!remote) return;

  if (!isSafeDisposableOrphanEvolutionInstance(remote)) {
    throw new Error(
      'Já existe uma conexão anterior de WhatsApp preservada para este restaurante. Ela não foi apagada por segurança. Entre em contato com o suporte para recuperar essa sessão.',
    );
  }

  await evolutionRequest(`/instance/delete/${encodeURIComponent(instanceName)}`, {
    method: 'DELETE',
  });

  const remaining = await fetchEvolutionInstance(instanceName);
  if (remaining) {
    throw new Error(
      'Não foi possível preparar uma nova conexão do WhatsApp sem risco para a sessão anterior.',
    );
  }

  console.warn('[EVOLUTION_ORPHAN_INSTANCE_RECOVERED]', {
    instanceName,
    reason: 'unbound_closed_instance_without_identity',
  });
}

async function configureWebhook(row: ConnectionRow, webhookSecret: string) {
  const webhookUrl = `${backendBaseUrl()}/api/webhooks/evolution/inbound/${encodeURIComponent(row.externalInstanceId)}`;
  await evolutionRequest(`/webhook/set/${encodeURIComponent(row.externalInstanceId)}`, {
    method: 'POST',
    apiKey: instanceToken(row),
    body: {
      webhook: {
        enabled: true,
        url: webhookUrl,
        headers: {
          'x-gastronexa-webhook-token': webhookSecret,
        },
        byEvents: false,
        base64: false,
        events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE'],
      },
    },
  });
}

async function deleteEvolutionInstance(instanceName: string) {
  try {
    await evolutionRequest(`/instance/delete/${encodeURIComponent(instanceName)}`, {
      method: 'DELETE',
    });
  } catch {
    // Best-effort cleanup only. The original failure is more useful to the caller.
  }
}

async function createEvolutionInstance(restaurantId: number) {
  const instanceName = buildTenantEvolutionInstanceName(restaurantId);
  const token = randomBytes(24).toString('hex');
  const webhookSecret = randomBytes(32).toString('hex');

  await prepareEvolutionInstanceName(instanceName);

  const createPayload = await evolutionRequest('/instance/create', {
    method: 'POST',
    body: {
      instanceName,
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS',
      token,
    },
  });
  const initialQr = extractEvolutionQrPayload(createPayload);

  try {
    const ciphertext = encryptCredential(token, tokenContext(restaurantId));
    const secretHashHex = hashSecret(webhookSecret).toString('hex');
    await prisma.$executeRaw`
      INSERT INTO "RestaurantWhatsappConnection" (
        "restaurantId", "provider", "externalInstanceId", "instanceTokenCiphertext",
        "webhookSecretHash", "status", "trialExpiresAt", "phone",
        "connectedAt", "disconnectedAt", "createdAt", "updatedAt"
      ) VALUES (
        ${restaurantId}, 'EVOLUTION', ${instanceName}, ${ciphertext},
        ${secretHashHex}, 'PENDING', NULL, NULL,
        NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      ON CONFLICT ("restaurantId") DO UPDATE SET
        "provider" = 'EVOLUTION',
        "externalInstanceId" = EXCLUDED."externalInstanceId",
        "instanceTokenCiphertext" = EXCLUDED."instanceTokenCiphertext",
        "webhookSecretHash" = EXCLUDED."webhookSecretHash",
        "status" = 'PENDING',
        "trialExpiresAt" = NULL,
        "phone" = NULL,
        "connectedAt" = NULL,
        "disconnectedAt" = NULL,
        "updatedAt" = CURRENT_TIMESTAMP
    `;

    const row = await readConnectionByRestaurant(restaurantId);
    if (!row) {
      throw new Error('Não foi possível registrar a conexão automática do WhatsApp.');
    }

    await configureWebhook(row, webhookSecret);
    return { row, initialQr };
  } catch (error) {
    try {
      await prisma.$executeRaw`
        UPDATE "RestaurantWhatsappConnection"
        SET "status" = 'ERROR', "updatedAt" = CURRENT_TIMESTAMP
        WHERE "restaurantId" = ${restaurantId} AND "provider" = 'EVOLUTION'
      `;
    } catch {
      // A limpeza remota abaixo ainda evita deixar uma nova instância órfã.
    }
    await deleteEvolutionInstance(instanceName);
    throw error;
  }
}

export async function getTenantEvolutionConnection(restaurantId: number) {
  return publicConnection(await readConnectionByRestaurant(restaurantId));
}

export async function createTenantEvolutionConnection(restaurantId: number) {
  const existing = await readConnectionByRestaurant(restaurantId);
  if (existing?.provider === 'EVOLUTION' && existing.status !== 'ERROR') {
    const remote = await fetchEvolutionInstance(existing.externalInstanceId);
    if (remote) {
      return publicConnection(existing);
    }

    await prisma.$executeRaw`
      UPDATE "RestaurantWhatsappConnection"
      SET "status" = 'ERROR', "updatedAt" = CURRENT_TIMESTAMP
      WHERE "restaurantId" = ${restaurantId} AND "provider" = 'EVOLUTION'
    `;
  }

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { id: true },
  });
  if (!restaurant) throw new Error('Restaurante não encontrado.');

  const created = await createEvolutionInstance(restaurantId);
  return publicConnection(created.row);
}

export async function getTenantEvolutionQrCode(restaurantId: number) {
  let row = await readConnectionByRestaurant(restaurantId);
  let initialQr = { qrCode: '', qrContent: '', pairingCode: null as string | null };

  if (!row || row.provider !== 'EVOLUTION' || row.status === 'ERROR') {
    const created = await createEvolutionInstance(restaurantId);
    row = created.row;
    initialQr = created.initialQr;
  } else {
    const remote = await fetchEvolutionInstance(row.externalInstanceId);
    if (!remote) {
      await prisma.$executeRaw`
        UPDATE "RestaurantWhatsappConnection"
        SET "status" = 'ERROR', "updatedAt" = CURRENT_TIMESTAMP
        WHERE "restaurantId" = ${restaurantId} AND "provider" = 'EVOLUTION'
      `;
      const created = await createEvolutionInstance(restaurantId);
      row = created.row;
      initialQr = created.initialQr;
    } else if (String(remote.connectionStatus || '').trim().toLowerCase() === 'open') {
      await prisma.$executeRaw`
        UPDATE "RestaurantWhatsappConnection"
        SET "status" = 'CONNECTED',
            "connectedAt" = COALESCE("connectedAt", CURRENT_TIMESTAMP),
            "disconnectedAt" = NULL,
            "updatedAt" = CURRENT_TIMESTAMP
        WHERE "restaurantId" = ${restaurantId} AND "provider" = 'EVOLUTION'
      `;
      return {
        qrCode: '',
        qrContent: '',
        pairingCode: null,
        ...publicConnection(await readConnectionByRestaurant(restaurantId)),
      };
    }
  }

  if (initialQr.qrCode || initialQr.qrContent) {
    return { ...initialQr, ...publicConnection(row) };
  }

  for (let attempt = 0; attempt < EVOLUTION_QR_MAX_ATTEMPTS; attempt += 1) {
    const payload = await evolutionRequest(
      `/instance/connect/${encodeURIComponent(row.externalInstanceId)}`,
      { apiKey: instanceToken(row) },
    );
    const qr = extractEvolutionQrPayload(payload);
    if (qr.qrCode || qr.qrContent) {
      return { ...qr, ...publicConnection(row) };
    }

    if (connectionStateFromPayload(payload) === 'open') {
      await prisma.$executeRaw`
        UPDATE "RestaurantWhatsappConnection"
        SET "status" = 'CONNECTED',
            "connectedAt" = COALESCE("connectedAt", CURRENT_TIMESTAMP),
            "disconnectedAt" = NULL,
            "updatedAt" = CURRENT_TIMESTAMP
        WHERE "restaurantId" = ${restaurantId} AND "provider" = 'EVOLUTION'
      `;
      return {
        qrCode: '',
        qrContent: '',
        pairingCode: null,
        ...publicConnection(await readConnectionByRestaurant(restaurantId)),
      };
    }

    if (attempt < EVOLUTION_QR_MAX_ATTEMPTS - 1) {
      await delay(EVOLUTION_QR_RETRY_DELAY_MS);
    }
  }

  throw new Error(
    'O QR Code ainda está sendo gerado pelo WhatsApp. Aguarde alguns segundos e tente mostrar o QR Code novamente.',
  );
}

export async function refreshTenantEvolutionConnection(restaurantId: number) {
  const row = await readConnectionByRestaurant(restaurantId);
  if (!row || row.provider !== 'EVOLUTION') return publicConnection(null);

  let payload: unknown;
  try {
    payload = await evolutionRequest(
      `/instance/connectionState/${encodeURIComponent(row.externalInstanceId)}`,
      { apiKey: instanceToken(row) },
    );
  } catch (error) {
    if (error instanceof EvolutionRequestError && [401, 404].includes(error.status)) {
      await prisma.$executeRaw`
        UPDATE "RestaurantWhatsappConnection"
        SET "status" = 'ERROR', "updatedAt" = CURRENT_TIMESTAMP
        WHERE "restaurantId" = ${restaurantId} AND "provider" = 'EVOLUTION'
      `;
      return publicConnection(await readConnectionByRestaurant(restaurantId));
    }
    throw error;
  }

  const state = connectionStateFromPayload(payload);
  const connected = state === 'open';
  const status = connected ? 'CONNECTED' : state === 'connecting' ? 'PENDING' : 'DISCONNECTED';
  await prisma.$executeRaw`
    UPDATE "RestaurantWhatsappConnection"
    SET "status" = ${status},
        "connectedAt" = CASE WHEN ${connected} THEN COALESCE("connectedAt", CURRENT_TIMESTAMP) ELSE "connectedAt" END,
        "disconnectedAt" = CASE WHEN ${connected} THEN NULL ELSE CURRENT_TIMESTAMP END,
        "updatedAt" = CURRENT_TIMESTAMP
    WHERE "restaurantId" = ${restaurantId} AND "provider" = 'EVOLUTION'
  `;
  return publicConnection(await readConnectionByRestaurant(restaurantId));
}

export async function disconnectTenantEvolutionConnection(restaurantId: number) {
  const row = await readConnectionByRestaurant(restaurantId);
  if (!row || row.provider !== 'EVOLUTION') return publicConnection(null);

  try {
    await evolutionRequest(`/instance/logout/${encodeURIComponent(row.externalInstanceId)}`, {
      method: 'DELETE',
      apiKey: instanceToken(row),
    });
  } catch (error) {
    if (!isRecoverableEvolutionDisconnectError(error)) throw error;

    if (error instanceof EvolutionRequestError && error.status === 401) {
      try {
        await evolutionRequest(`/instance/delete/${encodeURIComponent(row.externalInstanceId)}`, {
          method: 'DELETE',
        });
      } catch (deleteError) {
        if (
          !(deleteError instanceof EvolutionRequestError) ||
          deleteError.status !== 404
        ) {
          throw deleteError;
        }
      }
    }
  }

  await prisma.$executeRaw`
    UPDATE "RestaurantWhatsappConnection"
    SET "status" = 'DISCONNECTED', "phone" = NULL,
        "disconnectedAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "restaurantId" = ${restaurantId} AND "provider" = 'EVOLUTION'
  `;
  return publicConnection(await readConnectionByRestaurant(restaurantId));
}

export async function sendTenantEvolutionTextMessage(input: {
  restaurantId: number;
  destination: string;
  message: string;
}) {
  const row = await readConnectionByRestaurant(input.restaurantId);
  if (!row || row.provider !== 'EVOLUTION' || row.status !== 'CONNECTED') {
    throw new Error('WhatsApp Evolution não conectado para este restaurante.');
  }
  const nationalNumber = digitsOnly(input.destination);
  if (!/^[1-9]\d{9,10}$/u.test(nationalNumber)) {
    throw new Error('Número de destino inválido para o WhatsApp.');
  }
  const number = `55${nationalNumber}`;
  const text = String(input.message || '').trim();
  if (!text) throw new Error('Mensagem do WhatsApp vazia.');

  await evolutionRequest(`/message/sendText/${encodeURIComponent(row.externalInstanceId)}`, {
    method: 'POST',
    apiKey: instanceToken(row),
    body: { number, text, linkPreview: false },
  });
  return { sent: true, provider: 'evolution' } as const;
}

function inboundEvent(body: JsonRecord) {
  return String(body.event || body.type || '').trim().toLowerCase();
}

function inboundData(body: JsonRecord) {
  return body.data && typeof body.data === 'object' && !Array.isArray(body.data)
    ? (body.data as JsonRecord)
    : {};
}

function inboundRemoteJid(body: JsonRecord) {
  const data = inboundData(body);
  const key = data.key && typeof data.key === 'object' && !Array.isArray(data.key)
    ? (data.key as JsonRecord)
    : {};
  return String(key.remoteJid || data.remoteJid || body.remoteJid || '').trim();
}

function inboundFromMe(body: JsonRecord) {
  const data = inboundData(body);
  const key = data.key && typeof data.key === 'object' && !Array.isArray(data.key)
    ? (data.key as JsonRecord)
    : {};
  return key.fromMe === true || data.fromMe === true || body.fromMe === true;
}

export async function processTenantEvolutionInbound(
  instanceNameInput: unknown,
  webhookTokenInput: unknown,
  bodyInput: unknown,
) {
  const instanceName = String(instanceNameInput || '').trim();
  const webhookToken = String(webhookTokenInput || '').trim();
  if (!isTenantEvolutionInstanceName(instanceName)) {
    return { accepted: false, status: 404, reason: 'wrong_tenant_instance' } as const;
  }
  const body = bodyInput && typeof bodyInput === 'object' && !Array.isArray(bodyInput)
    ? (bodyInput as JsonRecord)
    : {};
  if (!instanceName || !webhookToken) return { accepted: false, status: 401 } as const;

  const row = await readConnectionByInstance(instanceName);
  if (!row || row.provider !== 'EVOLUTION' || !secretMatches(webhookToken, row.webhookSecretHash)) {
    return { accepted: false, status: 401 } as const;
  }

  const payloadInstance = String(body.instance || body.instanceName || '').trim();
  if (payloadInstance && payloadInstance !== instanceName) {
    return { accepted: false, status: 403 } as const;
  }

  await prisma.$executeRaw`
    UPDATE "RestaurantWhatsappConnection"
    SET "lastWebhookAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "externalInstanceId" = ${instanceName} AND "provider" = 'EVOLUTION'
  `;

  const event = inboundEvent(body);
  if (event.includes('connection')) {
    const data = inboundData(body);
    const state = String(data.state || data.status || '').toLowerCase();
    if (state) {
      const connected = state === 'open' || state === 'connected';
      const status = connected ? 'CONNECTED' : state === 'connecting' ? 'PENDING' : 'DISCONNECTED';
      await prisma.$executeRaw`
        UPDATE "RestaurantWhatsappConnection"
        SET "status" = ${status},
            "connectedAt" = CASE WHEN ${connected} THEN COALESCE("connectedAt", CURRENT_TIMESTAMP) ELSE "connectedAt" END,
            "disconnectedAt" = CASE WHEN ${connected} THEN NULL ELSE CURRENT_TIMESTAMP END,
            "updatedAt" = CURRENT_TIMESTAMP
        WHERE "externalInstanceId" = ${instanceName} AND "provider" = 'EVOLUTION'
      `;
    }
    return { accepted: true, queued: false, reason: 'connection_event' } as const;
  }

  if (!event.includes('messages') || inboundFromMe(body)) {
    return { accepted: true, queued: false, reason: 'event_ignored' } as const;
  }

  const remoteJid = inboundRemoteJid(body);
  if (!remoteJid || /@g\.us$/u.test(remoteJid) || /@newsletter$/u.test(remoteJid)) {
    return { accepted: true, queued: false, reason: 'non_customer_chat' } as const;
  }
  const providerCustomerPhone = digitsOnly(remoteJid.split('@')[0]);
  const customerPhone = /^55\d{10,11}$/u.test(providerCustomerPhone)
    ? providerCustomerPhone.slice(2)
    : providerCustomerPhone;
  if (!/^[1-9]\d{9,10}$/u.test(customerPhone)) {
    return { accepted: true, queued: false, reason: 'invalid_customer_phone' } as const;
  }

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: row.restaurantId },
    select: {
      id: true,
      name: true,
      slug: true,
      whatsapp: true,
      settings: { select: { whatsappEnabled: true, whatsappDefaultMessage: true } },
    },
  });
  if (!restaurant?.settings?.whatsappEnabled) {
    return { accepted: true, queued: false, reason: 'tenant_whatsapp_not_enabled' } as const;
  }

  const sourcePhone = digitsOnly(restaurant.whatsapp);
  if (!/^\d{10,15}$/u.test(sourcePhone)) {
    return { accepted: true, queued: false, reason: 'restaurant_phone_not_configured' } as const;
  }

  const data = inboundData(body);
  const key = data.key && typeof data.key === 'object' && !Array.isArray(data.key)
    ? (data.key as JsonRecord)
    : {};
  const providerMessageId = String(key.id || data.id || '').trim() || null;

  const greeting = buildTenantWhatsappGreeting({
    configuredMessage: restaurant.settings.whatsappDefaultMessage,
    restaurantName: restaurant.name,
    restaurantSlug: restaurant.slug,
  });
  const queued = await enqueueWhatsappSessionGreeting({
    restaurantId: row.restaurantId,
    from: sourcePhone,
    to: customerPhone,
    message: greeting,
    providerMessageId,
  });
  return {
    accepted: true,
    queued: Boolean(queued.queued),
    reason: queued.duplicate ? 'duplicate' : 'queued',
  } as const;
}
