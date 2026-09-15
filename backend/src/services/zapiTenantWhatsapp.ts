import { createHash, randomBytes } from 'node:crypto';
import prisma from '../config/prisma.js';
import {
  decryptCredential,
  encryptCredential,
} from '../modules/restaurantSettings/security/credentialEncryption.js';
import { buildTenantWhatsappGreeting } from './gupshupInbound.js';
import { enqueueWhatsappSessionGreeting } from './notificationOutbox.js';

const ZAPI_BASE_URL = 'https://api.z-api.io';

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

function env(name: string) {
  return String(process.env[name] || '').trim();
}

function normalizedBaseUrl() {
  const configured = env('ZAPI_BASE_URL') || ZAPI_BASE_URL;
  const url = new URL(configured);
  if (url.protocol !== 'https:' || url.username || url.password) {
    throw new Error('ZAPI_BASE_URL deve usar HTTPS.');
  }
  return url.toString().replace(/\/+$/u, '');
}

function backendBaseUrl() {
  const configured = env('BACKEND_URL');
  if (!configured) throw new Error('BACKEND_URL não configurada para os webhooks da Z-API.');
  const url = new URL(configured);
  if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
    throw new Error('BACKEND_URL deve usar HTTPS em produção.');
  }
  return url.toString().replace(/\/+$/u, '');
}

function tokenContext(restaurantId: number) {
  return `restaurant-whatsapp-connection:zapi:${restaurantId}`;
}

function hashSecret(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function clientHeaders() {
  const clientToken = env('ZAPI_CLIENT_TOKEN');
  return {
    'Content-Type': 'application/json',
    ...(clientToken ? { 'Client-Token': clientToken } : {}),
  };
}

async function readConnectionByRestaurant(restaurantId: number) {
  const rows = await prisma.$queryRaw<ConnectionRow[]>`
    SELECT * FROM "RestaurantWhatsappConnection"
    WHERE "restaurantId" = ${restaurantId}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

async function readConnectionByInstance(instanceId: string) {
  const rows = await prisma.$queryRaw<ConnectionRow[]>`
    SELECT * FROM "RestaurantWhatsappConnection"
    WHERE "externalInstanceId" = ${instanceId}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

function publicConnection(row: ConnectionRow | null) {
  if (!row) return { configured: false, provider: 'ZAPI', status: 'NOT_CONFIGURED' } as const;
  return {
    configured: true,
    provider: 'ZAPI' as const,
    status: row.status,
    phone: row.phone,
    trialExpiresAt: row.trialExpiresAt?.toISOString() ?? null,
    connectedAt: row.connectedAt?.toISOString() ?? null,
    disconnectedAt: row.disconnectedAt?.toISOString() ?? null,
  };
}

function instanceCredentials(row: ConnectionRow) {
  const token = decryptCredential(row.instanceTokenCiphertext, tokenContext(row.restaurantId));
  if (!token) throw new Error('Token da instância Z-API indisponível. Reconecte o WhatsApp.');
  return { instanceId: row.externalInstanceId, token };
}

async function zapiInstanceRequest(
  row: ConnectionRow,
  path: string,
  init: RequestInit = {},
) {
  const { instanceId, token } = instanceCredentials(row);
  const response = await fetch(
    `${normalizedBaseUrl()}/instances/${encodeURIComponent(instanceId)}/token/${encodeURIComponent(token)}${path}`,
    {
      ...init,
      redirect: 'error',
      signal: AbortSignal.timeout(12_000),
      headers: clientHeaders(),
    },
  );
  const text = await response.text();
  let payload: unknown = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }
  if (!response.ok) {
    throw new Error(`Z-API recusou a operação (${response.status}).`);
  }
  return payload;
}

async function createOnDemandInstance(restaurantId: number, restaurantName: string) {
  const partnerToken = env('ZAPI_PARTNER_TOKEN');
  if (!partnerToken) {
    throw new Error(
      'A criação automática de instâncias Z-API ainda não está habilitada. Configure ZAPI_PARTNER_TOKEN ou vincule uma instância existente.',
    );
  }

  const webhookSecret = randomBytes(32).toString('hex');
  const response = await fetch(`${normalizedBaseUrl()}/instances/integrator/on-demand`, {
    method: 'POST',
    redirect: 'error',
    signal: AbortSignal.timeout(12_000),
    headers: {
      Authorization: `Bearer ${partnerToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: `GastroNexa - ${restaurantName} - ${restaurantId}`,
      sessionName: `GastroNexa - ${restaurantName}`,
      callRejectAuto: true,
      autoReadMessage: false,
      businessDevice: true,
      disableEnqueueWhenDisconnected: true,
    }),
  });
  const text = await response.text();
  let body: Record<string, unknown> = {};
  try {
    body = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    body = {};
  }
  if (!response.ok) throw new Error(`Z-API recusou a criação da instância (${response.status}).`);

  const instanceId = String(body.id || '').trim();
  const token = String(body.token || '').trim();
  if (!instanceId || !token) throw new Error('A Z-API não retornou as credenciais da nova instância.');
  const due = Number(body.due || 0);
  return {
    instanceId,
    token,
    webhookSecret,
    trialExpiresAt: Number.isFinite(due) && due > Date.now() ? new Date(due) : null,
  };
}

async function configureReceivedWebhook(row: ConnectionRow, webhookSecret: string) {
  const value = `${backendBaseUrl()}/api/webhooks/zapi/inbound/${encodeURIComponent(row.externalInstanceId)}?token=${encodeURIComponent(webhookSecret)}`;
  await zapiInstanceRequest(row, '/update-webhook-received', {
    method: 'PUT',
    body: JSON.stringify({ value }),
  });
}

export async function getTenantZapiConnection(restaurantId: number) {
  return publicConnection(await readConnectionByRestaurant(restaurantId));
}

export async function createTenantZapiConnection(restaurantId: number) {
  const existing = await readConnectionByRestaurant(restaurantId);
  if (existing) return publicConnection(existing);

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { id: true, name: true },
  });
  if (!restaurant) throw new Error('Restaurante não encontrado.');

  const created = await createOnDemandInstance(restaurantId, restaurant.name);
  const ciphertext = encryptCredential(created.token, tokenContext(restaurantId));
  await prisma.$executeRaw`
    INSERT INTO "RestaurantWhatsappConnection" (
      "restaurantId", "provider", "externalInstanceId", "instanceTokenCiphertext",
      "webhookSecretHash", "status", "trialExpiresAt", "createdAt", "updatedAt"
    ) VALUES (
      ${restaurantId}, 'ZAPI', ${created.instanceId}, ${ciphertext},
      ${hashSecret(created.webhookSecret)}, 'PENDING', ${created.trialExpiresAt},
      CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
  `;

  const row = await readConnectionByRestaurant(restaurantId);
  if (!row) throw new Error('Não foi possível registrar a instância Z-API.');
  await configureReceivedWebhook(row, created.webhookSecret);
  return publicConnection(row);
}

export async function linkExistingTenantZapiConnection(
  restaurantId: number,
  input: { instanceId: unknown; token: unknown },
) {
  const instanceId = String(input.instanceId || '').trim();
  const token = String(input.token || '').trim();
  if (!/^[A-Za-z0-9_-]{8,191}$/u.test(instanceId) || token.length < 8 || token.length > 500) {
    throw new Error('Instância Z-API inválida.');
  }

  const webhookSecret = randomBytes(32).toString('hex');
  const ciphertext = encryptCredential(token, tokenContext(restaurantId));
  await prisma.$executeRaw`
    INSERT INTO "RestaurantWhatsappConnection" (
      "restaurantId", "provider", "externalInstanceId", "instanceTokenCiphertext",
      "webhookSecretHash", "status", "createdAt", "updatedAt"
    ) VALUES (
      ${restaurantId}, 'ZAPI', ${instanceId}, ${ciphertext},
      ${hashSecret(webhookSecret)}, 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
    ON CONFLICT ("restaurantId") DO UPDATE SET
      "provider" = 'ZAPI',
      "externalInstanceId" = EXCLUDED."externalInstanceId",
      "instanceTokenCiphertext" = EXCLUDED."instanceTokenCiphertext",
      "webhookSecretHash" = EXCLUDED."webhookSecretHash",
      "status" = 'PENDING',
      "phone" = NULL,
      "connectedAt" = NULL,
      "disconnectedAt" = NULL,
      "updatedAt" = CURRENT_TIMESTAMP
  `;
  const row = await readConnectionByRestaurant(restaurantId);
  if (!row) throw new Error('Não foi possível vincular a instância Z-API.');
  await configureReceivedWebhook(row, webhookSecret);
  return publicConnection(row);
}

export async function getTenantZapiQrCode(restaurantId: number) {
  const row = await readConnectionByRestaurant(restaurantId);
  if (!row) throw new Error('Conecte uma instância Z-API antes de solicitar o QR Code.');
  const payload = (await zapiInstanceRequest(row, '/qr-code')) as Record<string, unknown> | null;
  const value = String(payload?.value || '').trim();
  if (!value.startsWith('data:image/')) throw new Error('A Z-API não retornou um QR Code válido.');
  return { qrCode: value, ...publicConnection(row) };
}

export async function refreshTenantZapiConnection(restaurantId: number) {
  const row = await readConnectionByRestaurant(restaurantId);
  if (!row) return publicConnection(null);
  const payload = (await zapiInstanceRequest(row, '/me')) as Record<string, unknown> | null;
  const connected = payload?.connected === true;
  await prisma.$executeRaw`
    UPDATE "RestaurantWhatsappConnection"
    SET "status" = ${connected ? 'CONNECTED' : 'PENDING'},
        "connectedAt" = CASE WHEN ${connected} THEN COALESCE("connectedAt", CURRENT_TIMESTAMP) ELSE "connectedAt" END,
        "disconnectedAt" = CASE WHEN ${connected} THEN NULL ELSE "disconnectedAt" END,
        "updatedAt" = CURRENT_TIMESTAMP
    WHERE "restaurantId" = ${restaurantId}
  `;
  return publicConnection(await readConnectionByRestaurant(restaurantId));
}

export async function disconnectTenantZapiConnection(restaurantId: number) {
  const row = await readConnectionByRestaurant(restaurantId);
  if (!row) return publicConnection(null);
  await zapiInstanceRequest(row, '/disconnect', { method: 'GET' });
  await prisma.$executeRaw`
    UPDATE "RestaurantWhatsappConnection"
    SET "status" = 'DISCONNECTED', "disconnectedAt" = CURRENT_TIMESTAMP,
        "updatedAt" = CURRENT_TIMESTAMP
    WHERE "restaurantId" = ${restaurantId}
  `;
  return publicConnection(await readConnectionByRestaurant(restaurantId));
}

export async function sendTenantZapiTextMessage(input: {
  restaurantId: number;
  destination: string;
  message: string;
}) {
  const row = await readConnectionByRestaurant(input.restaurantId);
  if (!row || row.provider !== 'ZAPI') throw new Error('WhatsApp Z-API não conectado para este restaurante.');
  const phone = String(input.destination || '').replace(/\D/g, '');
  if (!/^\d{10,15}$/u.test(phone)) throw new Error('Número de destino inválido para o WhatsApp.');
  await zapiInstanceRequest(row, '/send-text', {
    method: 'POST',
    body: JSON.stringify({ phone, message: String(input.message || '') }),
  });
  return { sent: true, provider: 'zapi' } as const;
}

export async function processTenantZapiInbound(
  instanceIdInput: unknown,
  webhookTokenInput: unknown,
  bodyInput: unknown,
) {
  const instanceId = String(instanceIdInput || '').trim();
  const webhookToken = String(webhookTokenInput || '').trim();
  const body = bodyInput && typeof bodyInput === 'object' && !Array.isArray(bodyInput)
    ? (bodyInput as Record<string, unknown>)
    : {};
  if (!instanceId || !webhookToken) return { accepted: false, status: 401 } as const;

  const row = await readConnectionByInstance(instanceId);
  if (!row || hashSecret(webhookToken) !== row.webhookSecretHash) {
    return { accepted: false, status: 401 } as const;
  }
  if (String(body.instanceId || '').trim() && String(body.instanceId || '').trim() !== instanceId) {
    return { accepted: false, status: 403 } as const;
  }

  await prisma.$executeRaw`
    UPDATE "RestaurantWhatsappConnection"
    SET "lastWebhookAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "externalInstanceId" = ${instanceId}
  `;

  if (
    body.fromMe === true ||
    body.isGroup === true ||
    body.isNewsletter === true ||
    body.broadcast === true ||
    String(body.type || '') !== 'ReceivedCallback'
  ) {
    return { accepted: true, queued: false, reason: 'event_ignored' } as const;
  }

  const customerPhone = String(body.phone || '').replace(/\D/g, '');
  const connectedPhone = String(body.connectedPhone || '').replace(/\D/g, '');
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

  const configuredPhone = String(restaurant.whatsapp || '').replace(/\D/g, '');
  if (connectedPhone && configuredPhone && connectedPhone !== configuredPhone) {
    return { accepted: true, queued: false, reason: 'connected_phone_mismatch' } as const;
  }

  if (connectedPhone && connectedPhone !== row.phone) {
    await prisma.$executeRaw`
      UPDATE "RestaurantWhatsappConnection"
      SET "phone" = ${connectedPhone}, "status" = 'CONNECTED',
          "connectedAt" = COALESCE("connectedAt", CURRENT_TIMESTAMP),
          "disconnectedAt" = NULL, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "externalInstanceId" = ${instanceId}
    `;
  }

  const greeting = buildTenantWhatsappGreeting({
    configuredMessage: restaurant.settings.whatsappDefaultMessage,
    restaurantName: restaurant.name,
    restaurantSlug: restaurant.slug,
  });
  const result = await enqueueWhatsappSessionGreeting({
    restaurantId: restaurant.id,
    from: configuredPhone || connectedPhone,
    to: customerPhone,
    message: greeting,
    providerMessageId: String(body.messageId || '').trim() || null,
    receivedAt: Number(body.momment || 0) > 0 ? new Date(Number(body.momment)) : new Date(),
  });

  return {
    accepted: true,
    queued: result.queued,
    duplicate: 'duplicate' in result ? result.duplicate : false,
    reason: 'reason' in result ? result.reason : null,
  } as const;
}
