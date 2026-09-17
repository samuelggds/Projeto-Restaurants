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

function env(name: string) {
  return String(process.env[name] || '').trim();
}

function digitsOnly(value: unknown) {
  return String(value || '').replace(/\D/g, '');
}

function evolutionBaseUrl() {
  const configured = env('EVOLUTION_API_URL');
  if (!configured) throw new Error('EVOLUTION_API_URL não configurada.');
  const url = new URL(configured);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('EVOLUTION_API_URL inválida.');
  }
  return url.toString().replace(/\/+$/u, '');
}

function globalApiKey() {
  const value = env('EVOLUTION_API_KEY');
  if (!value) throw new Error('EVOLUTION_API_KEY não configurada.');
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

function instanceNameForRestaurant(restaurantId: number) {
  return `gastronexa-${restaurantId}`;
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
    throw new Error(`Evolution API recusou a operação (${response.status}).`);
  }
  return payload;
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
  const instanceName = instanceNameForRestaurant(restaurantId);
  const token = randomBytes(24).toString('hex');
  const webhookSecret = randomBytes(32).toString('hex');

  await evolutionRequest('/instance/create', {
    method: 'POST',
    body: {
      instanceName,
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS',
      token,
    },
  });

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
    await deleteEvolutionInstance(instanceName);
    throw new Error('Não foi possível registrar a conexão Evolution API.');
  }

  try {
    await configureWebhook(row, webhookSecret);
  } catch (error) {
    await prisma.$executeRaw`
      UPDATE "RestaurantWhatsappConnection"
      SET "status" = 'ERROR', "updatedAt" = CURRENT_TIMESTAMP
      WHERE "restaurantId" = ${restaurantId} AND "provider" = 'EVOLUTION'
    `;
    await deleteEvolutionInstance(instanceName);
    throw error;
  }

  return row;
}

export async function getTenantEvolutionConnection(restaurantId: number) {
  return publicConnection(await readConnectionByRestaurant(restaurantId));
}

export async function createTenantEvolutionConnection(restaurantId: number) {
  const existing = await readConnectionByRestaurant(restaurantId);
  if (existing?.provider === 'EVOLUTION' && existing.status !== 'ERROR') {
    return publicConnection(existing);
  }

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { id: true },
  });
  if (!restaurant) throw new Error('Restaurante não encontrado.');

  return publicConnection(await createEvolutionInstance(restaurantId));
}

export async function getTenantEvolutionQrCode(restaurantId: number) {
  let row = await readConnectionByRestaurant(restaurantId);
  if (!row || row.provider !== 'EVOLUTION' || row.status === 'ERROR') {
    row = await createEvolutionInstance(restaurantId);
  }
  const payload = (await evolutionRequest(
    `/instance/connect/${encodeURIComponent(row.externalInstanceId)}`,
    { apiKey: instanceToken(row) },
  )) as JsonRecord | null;
  const base64 = String(payload?.base64 || '').trim();
  if (!base64) throw new Error('A Evolution API não retornou um QR Code válido.');
  const qrCode = base64.startsWith('data:image/') ? base64 : `data:image/png;base64,${base64}`;
  return { qrCode, ...publicConnection(row) };
}

export async function refreshTenantEvolutionConnection(restaurantId: number) {
  const row = await readConnectionByRestaurant(restaurantId);
  if (!row || row.provider !== 'EVOLUTION') return publicConnection(null);
  const payload = (await evolutionRequest(
    `/instance/connectionState/${encodeURIComponent(row.externalInstanceId)}`,
    { apiKey: instanceToken(row) },
  )) as JsonRecord | null;
  const instance = payload?.instance && typeof payload.instance === 'object'
    ? (payload.instance as JsonRecord)
    : {};
  const state = String(instance.state || '').toLowerCase();
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
  await evolutionRequest(`/instance/logout/${encodeURIComponent(row.externalInstanceId)}`, {
    method: 'DELETE',
    apiKey: instanceToken(row),
  });
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
  const number = digitsOnly(input.destination);
  if (!/^\d{10,15}$/u.test(number)) throw new Error('Número de destino inválido para o WhatsApp.');
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
  const customerPhone = digitsOnly(remoteJid.split('@')[0]);
  if (!/^\d{10,15}$/u.test(customerPhone)) {
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
