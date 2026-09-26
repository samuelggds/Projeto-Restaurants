import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import prisma from '../../../config/prisma.js';
import {
  decryptCredential,
  encryptCredential,
} from '../../restaurantSettings/security/credentialEncryption.js';
import {
  formatCommercialWhatsappSchedule,
  isCommercialWhatsappHumanServiceOpen,
  normalizeCommercialWhatsappHours,
  validateCommercialWhatsappHours,
} from '../domain/commercialWhatsappHours.js';

type JsonRecord = Record<string, unknown>;
const PLATFORM_CONNECTION_ID = 1;
const PLATFORM_INSTANCE_NAME = 'gastronexa-platform';
const TOKEN_CONTEXT = 'platform-whatsapp-connection:evolution';
const AUTO_REPLY_COOLDOWN_MS = 12 * 60 * 60 * 1000;
const MAX_AUTOMATED_OUTBOUND_PER_DAY = 3;

function env(name: string) {
  return String(process.env[name] || '').trim();
}

function digitsOnly(value: unknown) {
  return String(value || '').replace(/\D/gu, '');
}

function hashSecret(value: string) {
  return createHash('sha256').update(value).digest();
}

function secretMatches(value: string, storedHex: string) {
  const candidate = hashSecret(value);
  const stored = Buffer.from(storedHex, 'hex');
  return stored.length === candidate.length && timingSafeEqual(candidate, stored);
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
  if (!configured) throw new Error('BACKEND_URL não configurada.');
  const url = new URL(configured);
  if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
    throw new Error('BACKEND_URL deve usar HTTPS em produção.');
  }
  return url.toString().replace(/\/+$/u, '');
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
  if (!response.ok) throw new Error(`Evolution API recusou a operação (${response.status}).`);
  try {
    return text ? (JSON.parse(text) as unknown) : null;
  } catch {
    return text;
  }
}

function connectionToken(row: { instanceTokenCiphertext: string }) {
  const token = decryptCredential(row.instanceTokenCiphertext, TOKEN_CONTEXT);
  if (!token) throw new Error('Credencial da conexão comercial indisponível. Reconecte o WhatsApp.');
  return token;
}

async function connection() {
  return prisma.platformWhatsappConnection.findUnique({ where: { id: PLATFORM_CONNECTION_ID } });
}

function publicConnection(row: Awaited<ReturnType<typeof connection>>) {
  if (!row) return { configured: false, provider: 'EVOLUTION', status: 'NOT_CONFIGURED' } as const;
  return {
    configured: true,
    provider: 'EVOLUTION' as const,
    status: row.status,
    phone: row.phone,
    connectedAt: row.connectedAt?.toISOString() || null,
    disconnectedAt: row.disconnectedAt?.toISOString() || null,
    lastWebhookAt: row.lastWebhookAt?.toISOString() || null,
  };
}

async function configureWebhook(row: NonNullable<Awaited<ReturnType<typeof connection>>>, secret: string) {
  await evolutionRequest(`/webhook/set/${encodeURIComponent(row.externalInstanceId)}`, {
    method: 'POST',
    apiKey: connectionToken(row),
    body: {
      webhook: {
        enabled: true,
        url: `${backendBaseUrl()}/api/webhooks/evolution/platform/${encodeURIComponent(row.externalInstanceId)}`,
        headers: { 'x-gastronexa-webhook-token': secret },
        byEvents: false,
        base64: false,
        events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE'],
      },
    },
  });
}

export async function getPlatformWhatsappConnection() {
  return publicConnection(await connection());
}

export async function createPlatformWhatsappConnection() {
  const existing = await connection();
  if (existing && existing.status !== 'ERROR') return publicConnection(existing);

  const token = randomBytes(24).toString('hex');
  const secret = randomBytes(32).toString('hex');
  await evolutionRequest('/instance/create', {
    method: 'POST',
    body: {
      instanceName: PLATFORM_INSTANCE_NAME,
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS',
      token,
    },
  });

  const row = await prisma.platformWhatsappConnection.upsert({
    where: { id: PLATFORM_CONNECTION_ID },
    create: {
      id: PLATFORM_CONNECTION_ID,
      externalInstanceId: PLATFORM_INSTANCE_NAME,
      instanceTokenCiphertext: encryptCredential(token, TOKEN_CONTEXT),
      webhookSecretHash: hashSecret(secret).toString('hex'),
    },
    update: {
      provider: 'EVOLUTION',
      externalInstanceId: PLATFORM_INSTANCE_NAME,
      instanceTokenCiphertext: encryptCredential(token, TOKEN_CONTEXT),
      webhookSecretHash: hashSecret(secret).toString('hex'),
      status: 'PENDING',
      phone: null,
      connectedAt: null,
      disconnectedAt: null,
    },
  });
  await configureWebhook(row, secret);
  return publicConnection(row);
}

export async function getPlatformWhatsappQrCode() {
  let row = await connection();
  if (!row || row.status === 'ERROR') {
    await createPlatformWhatsappConnection();
    row = await connection();
  }
  if (!row) throw new Error('Não foi possível iniciar a conexão comercial.');
  const payload = (await evolutionRequest(
    `/instance/connect/${encodeURIComponent(row.externalInstanceId)}`,
    { apiKey: connectionToken(row) },
  )) as JsonRecord | null;
  const base64 = String(payload?.base64 || '').trim();
  if (!base64) throw new Error('A Evolution API não retornou um QR Code válido.');
  return {
    ...publicConnection(row),
    qrCode: base64.startsWith('data:image/') ? base64 : `data:image/png;base64,${base64}`,
  };
}

export async function refreshPlatformWhatsappConnection() {
  const row = await connection();
  if (!row) return publicConnection(null);
  const payload = (await evolutionRequest(
    `/instance/connectionState/${encodeURIComponent(row.externalInstanceId)}`,
    { apiKey: connectionToken(row) },
  )) as JsonRecord | null;
  const instance =
    payload?.instance && typeof payload.instance === 'object' ? (payload.instance as JsonRecord) : {};
  const state = String(instance.state || '').toLowerCase();
  const connected = state === 'open';
  const status = connected ? 'CONNECTED' : state === 'connecting' ? 'PENDING' : 'DISCONNECTED';
  const updated = await prisma.platformWhatsappConnection.update({
    where: { id: PLATFORM_CONNECTION_ID },
    data: {
      status,
      connectedAt: connected ? row.connectedAt || new Date() : row.connectedAt,
      disconnectedAt: connected ? null : new Date(),
    },
  });
  return publicConnection(updated);
}

export async function disconnectPlatformWhatsappConnection() {
  const row = await connection();
  if (!row) return publicConnection(null);
  try {
    await evolutionRequest(`/instance/logout/${encodeURIComponent(row.externalInstanceId)}`, {
      method: 'DELETE',
      apiKey: connectionToken(row),
    });
  } finally {
    await prisma.platformWhatsappConnection.update({
      where: { id: PLATFORM_CONNECTION_ID },
      data: { status: 'DISCONNECTED', phone: null, disconnectedAt: new Date() },
    });
  }
  return publicConnection(await connection());
}

export async function sendPlatformWhatsappText(destination: string, message: string) {
  const row = await connection();
  if (!row || row.status !== 'CONNECTED') {
    throw new Error('WhatsApp comercial da GastroNexa não está conectado.');
  }
  const number = digitsOnly(destination);
  if (!/^\d{10,15}$/u.test(number)) throw new Error('Número de WhatsApp inválido.');
  const text = String(message || '').trim();
  if (!text || text.length > 4000) throw new Error('Mensagem comercial inválida.');
  await evolutionRequest(`/message/sendText/${encodeURIComponent(row.externalInstanceId)}`, {
    method: 'POST',
    apiKey: connectionToken(row),
    body: { number, text, linkPreview: false },
  });
}

function inboundData(body: JsonRecord) {
  return body.data && typeof body.data === 'object' && !Array.isArray(body.data)
    ? (body.data as JsonRecord)
    : {};
}

function inboundText(body: JsonRecord) {
  const data = inboundData(body);
  const message =
    data.message && typeof data.message === 'object' ? (data.message as JsonRecord) : {};
  return String(
    message.conversation ||
      (message.extendedTextMessage as JsonRecord | undefined)?.text ||
      data.text ||
      '',
  )
    .trim()
    .slice(0, 4000);
}

function inboundMeta(body: JsonRecord) {
  const data = inboundData(body);
  const key = data.key && typeof data.key === 'object' ? (data.key as JsonRecord) : {};
  return {
    event: String(body.event || body.type || '').toLowerCase(),
    remoteJid: String(key.remoteJid || data.remoteJid || body.remoteJid || ''),
    fromMe: key.fromMe === true || data.fromMe === true || body.fromMe === true,
    providerMessageId: String(key.id || data.id || '').trim() || null,
  };
}

function menuMessage() {
  return [
    'Olá! 👋 Você está falando com a GastroNexa.',
    '',
    'Como podemos ajudar?',
    '1. Conhecer a plataforma',
    '2. Planos e valores',
    '3. Ver uma demonstração',
    '4. Já sou cliente e preciso de suporte',
    '5. Falar com uma pessoa',
  ].join('\n');
}

function buildAwayMessage(message: string, hours: unknown) {
  return [
    message,
    '',
    'Horários configurados:',
    formatCommercialWhatsappSchedule(hours) || 'consulte novamente mais tarde.',
    '',
    'Enquanto isso, posso registrar sua mensagem por aqui.',
  ].join('\n');
}

async function enqueueAutoReply(
  conversationId: string,
  phone: string,
  kind: 'GREETING' | 'AWAY',
  body: string,
  providerMessageId: string | null,
) {
  const now = new Date();
  const since = new Date(now.getTime() - AUTO_REPLY_COOLDOWN_MS);
  const [recentMessage, recentQueued] = await Promise.all([
    prisma.salesLeadWhatsappMessage.findFirst({
      where: {
        conversationId,
        direction: 'OUTBOUND',
        automated: true,
        kind,
        createdAt: { gte: since },
      },
      select: { id: true },
    }),
    prisma.salesLeadWhatsappOutbox.findFirst({
      where: {
        conversationId,
        kind,
        status: { in: ['PENDING', 'SENT'] },
        createdAt: { gte: since },
      },
      select: { id: true },
    }),
  ]);
  if (recentMessage || recentQueued) return { queued: false, reason: 'cooldown' } as const;

  const dayStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const [automatedSentCount, automatedQueuedCount] = await Promise.all([
    prisma.salesLeadWhatsappMessage.count({
      where: { conversationId, direction: 'OUTBOUND', automated: true, createdAt: { gte: dayStart } },
    }),
    prisma.salesLeadWhatsappOutbox.count({
      where: {
        conversationId,
        kind: { in: ['GREETING', 'AWAY', 'FORM_GREETING'] },
        status: { in: ['PENDING', 'SENT'] },
        createdAt: { gte: dayStart },
      },
    }),
  ]);
  const automatedCount = automatedSentCount + automatedQueuedCount;
  if (automatedCount >= MAX_AUTOMATED_OUTBOUND_PER_DAY) {
    return { queued: false, reason: 'daily_limit' } as const;
  }

  const key = createHash('sha256')
    .update(JSON.stringify([kind, phone, providerMessageId || Math.floor(now.getTime() / AUTO_REPLY_COOLDOWN_MS)]))
    .digest('hex');
  await prisma.salesLeadWhatsappOutbox.upsert({
    where: { deduplicationKey: key },
    create: {
      id: randomUUID(),
      conversationId,
      deduplicationKey: key,
      kind,
      body,
    },
    update: {},
  });
  return { queued: true } as const;
}

export async function processPlatformEvolutionInbound(
  instanceNameInput: unknown,
  webhookTokenInput: unknown,
  bodyInput: unknown,
) {
  const row = await connection();
  const instanceName = String(instanceNameInput || '').trim();
  const token = String(webhookTokenInput || '').trim();
  const body =
    bodyInput && typeof bodyInput === 'object' && !Array.isArray(bodyInput)
      ? (bodyInput as JsonRecord)
      : {};
  if (
    !row ||
    instanceName !== row.externalInstanceId ||
    !token ||
    !secretMatches(token, row.webhookSecretHash)
  ) {
    return { accepted: false, status: 401 } as const;
  }

  await prisma.platformWhatsappConnection.update({
    where: { id: PLATFORM_CONNECTION_ID },
    data: { lastWebhookAt: new Date() },
  });

  const meta = inboundMeta(body);
  if (meta.event.includes('connection')) {
    const data = inboundData(body);
    const state = String(data.state || data.status || '').toLowerCase();
    if (state) {
      const connected = state === 'open' || state === 'connected';
      await prisma.platformWhatsappConnection.update({
        where: { id: PLATFORM_CONNECTION_ID },
        data: {
          status: connected ? 'CONNECTED' : state === 'connecting' ? 'PENDING' : 'DISCONNECTED',
          connectedAt: connected ? row.connectedAt || new Date() : row.connectedAt,
          disconnectedAt: connected ? null : new Date(),
        },
      });
    }
    return { accepted: true, queued: false } as const;
  }
  if (!meta.event.includes('messages') || meta.fromMe) {
    return { accepted: true, queued: false } as const;
  }
  if (!meta.remoteJid || /@g\.us$/u.test(meta.remoteJid) || /@newsletter$/u.test(meta.remoteJid)) {
    return { accepted: true, queued: false } as const;
  }

  const phone = digitsOnly(meta.remoteJid.split('@')[0]);
  if (!/^\d{10,15}$/u.test(phone)) return { accepted: true, queued: false } as const;
  const text = inboundText(body);
  if (!text) return { accepted: true, queued: false } as const;

  const lead = await prisma.salesLead.findFirst({
    where: { phone },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  });
  const conversation = await prisma.salesLeadWhatsappConversation.upsert({
    where: { phone },
    create: { id: randomUUID(), phone, lastInboundAt: new Date() },
    update: { lastInboundAt: new Date() },
  });

  if (meta.providerMessageId) {
    const duplicate = await prisma.salesLeadWhatsappMessage.findUnique({
      where: { providerMessageId: meta.providerMessageId },
      select: { id: true },
    });
    if (duplicate) return { accepted: true, queued: false } as const;
  }

  await prisma.salesLeadWhatsappMessage.create({
    data: {
      id: randomUUID(),
      conversationId: conversation.id,
      leadId: lead?.id || null,
      direction: 'INBOUND',
      kind: 'CUSTOMER',
      body: text,
      providerMessageId: meta.providerMessageId,
      automated: false,
    },
  });

  if (conversation.automationMode === 'HUMAN') {
    return { accepted: true, queued: false, reason: 'human_mode' } as const;
  }

  const settings = await prisma.platformSettings.findUnique({ where: { id: 1 } });
  if (!settings?.commercialWhatsappEnabled) {
    return { accepted: true, queued: false, reason: 'automation_disabled' } as const;
  }

  const open = isCommercialWhatsappHumanServiceOpen(
    settings.commercialWhatsappHours,
    settings.timezone,
  );
  const bodyText = open
    ? menuMessage()
    : buildAwayMessage(
        settings.commercialWhatsappAwayMessage,
        settings.commercialWhatsappHours,
      );

  const queued = await enqueueAutoReply(
    conversation.id,
    phone,
    open ? 'GREETING' : 'AWAY',
    bodyText,
    meta.providerMessageId,
  );

  if (queued.queued) {
    await deliverPlatformWhatsappOutbox();
  }

  return { accepted: true, queued: queued.queued, reason: queued.queued ? 'queued' : queued.reason } as const;
}

export async function enqueueLeadWhatsappGreeting(leadId: string) {
  const lead = await prisma.salesLead.findUnique({
    where: { id: leadId },
    select: { id: true, name: true, restaurantName: true, phone: true, consent: true },
  });
  if (!lead?.consent) return { queued: false, reason: 'no_consent' } as const;
  const settings = await prisma.platformSettings.findUnique({ where: { id: 1 } });
  if (!settings?.commercialWhatsappEnabled) return { queued: false, reason: 'disabled' } as const;

  const conversation = await prisma.salesLeadWhatsappConversation.upsert({
    where: { phone: lead.phone },
    create: { id: randomUUID(), phone: lead.phone },
    update: {},
  });
  const key = createHash('sha256').update(`FORM_GREETING:${lead.id}`).digest('hex');
  const body = [
    `Olá, ${lead.name}! 👋 Aqui é da GastroNexa.`,
    '',
    `Recebemos seu interesse em conhecer nossa plataforma para ${lead.restaurantName}.`,
    'Posso te mostrar como a GastroNexa pode ajudar com vendas, pedidos, pagamentos e atendimento?',
  ].join('\n');
  await prisma.salesLeadWhatsappOutbox.upsert({
    where: { deduplicationKey: key },
    create: {
      id: randomUUID(),
      conversationId: conversation.id,
      leadId: lead.id,
      deduplicationKey: key,
      kind: 'FORM_GREETING',
      body,
    },
    update: {},
  });
  return { queued: true } as const;
}

export async function deliverPlatformWhatsappOutbox() {
  const row = await connection();
  if (!row || row.status !== 'CONNECTED') return { processed: 0, sent: 0, configured: false };
  const lockToken = randomUUID();
  const rows = await prisma.$queryRaw<
    { id: string; conversationId: string; kind: string; body: string; attempts: number; phone: string }[]
  >`
    WITH picked AS (
      SELECT o."id" FROM "SalesLeadWhatsappOutbox" o
      WHERE o."status" = 'PENDING'
        AND o."availableAt" <= clock_timestamp()
        AND (o."lockedUntil" IS NULL OR o."lockedUntil" < clock_timestamp())
      ORDER BY o."availableAt", o."id"
      LIMIT 10 FOR UPDATE SKIP LOCKED
    )
    UPDATE "SalesLeadWhatsappOutbox" o
    SET "lockedUntil" = clock_timestamp() + INTERVAL '2 minutes',
        "lockToken" = ${lockToken}::uuid,
        "attempts" = o."attempts" + 1
    FROM picked, "SalesLeadWhatsappConversation" c
    WHERE o."id" = picked."id" AND c."id" = o."conversationId"
    RETURNING o."id", o."conversationId", o."kind", o."body", o."attempts", c."phone"`;

  let sent = 0;
  for (const item of rows) {
    try {
      const conversation = await prisma.salesLeadWhatsappConversation.findUnique({
        where: { id: item.conversationId },
        select: { automationMode: true },
      });
      if (item.kind !== 'MANUAL' && conversation?.automationMode === 'HUMAN') {
        await prisma.salesLeadWhatsappOutbox.update({
          where: { id: item.id },
          data: { status: 'SUPPRESSED', suppressedReason: 'human_mode', lockedUntil: null, lockToken: null },
        });
        continue;
      }
      await sendPlatformWhatsappText(item.phone, item.body);
      await prisma.$transaction([
        prisma.salesLeadWhatsappOutbox.update({
          where: { id: item.id },
          data: { status: 'SENT', sentAt: new Date(), lockedUntil: null, lockToken: null },
        }),
        prisma.salesLeadWhatsappMessage.create({
          data: {
            id: randomUUID(),
            conversationId: item.conversationId,
            direction: 'OUTBOUND',
            kind: item.kind,
            body: item.body,
            automated: item.kind !== 'MANUAL',
          },
        }),
        prisma.salesLeadWhatsappConversation.update({
          where: { id: item.conversationId },
          data: { lastOutboundAt: new Date() },
        }),
      ]);
      sent++;
    } catch {
      const exhausted = item.attempts >= 8;
      const delayMs = Math.min(60 * 60_000, 60_000 * 2 ** Math.min(item.attempts - 1, 6));
      await prisma.salesLeadWhatsappOutbox.update({
        where: { id: item.id },
        data: {
          status: exhausted ? 'FAILED' : 'PENDING',
          availableAt: new Date(Date.now() + delayMs),
          lockedUntil: null,
          lockToken: null,
        },
      });
    }
  }
  return { processed: rows.length, sent, configured: true };
}

export async function listCommercialWhatsappConversations() {
  return prisma.salesLeadWhatsappConversation.findMany({
    orderBy: { updatedAt: 'desc' },
    take: 100,
    include: { messages: { orderBy: { createdAt: 'asc' }, take: 100 } },
  });
}

export async function setCommercialWhatsappConversationMode(id: string, mode: 'BOT' | 'HUMAN') {
  return prisma.salesLeadWhatsappConversation.update({
    where: { id },
    data: { automationMode: mode },
  });
}

export async function enqueueManualCommercialWhatsappMessage(id: string, message: string) {
  const body = String(message || '').trim();
  if (body.length < 1 || body.length > 4000) throw new Error('Mensagem inválida.');
  const conversation = await prisma.salesLeadWhatsappConversation.findUnique({ where: { id } });
  if (!conversation) throw new Error('Conversa não encontrada.');
  const key = createHash('sha256')
    .update(`MANUAL:${id}:${randomUUID()}`)
    .digest('hex');
  await prisma.salesLeadWhatsappOutbox.create({
    data: {
      id: randomUUID(),
      conversationId: id,
      deduplicationKey: key,
      kind: 'MANUAL',
      body,
    },
  });
  await deliverPlatformWhatsappOutbox();
  return { queued: true };
}

export async function getCommercialWhatsappSettings() {
  const settings = await prisma.platformSettings.findUniqueOrThrow({ where: { id: 1 } });
  return {
    enabled: settings.commercialWhatsappEnabled,
    hours: normalizeCommercialWhatsappHours(settings.commercialWhatsappHours),
    awayMessage: settings.commercialWhatsappAwayMessage,
    timezone: settings.timezone,
  };
}

export async function updateCommercialWhatsappSettings(input: {
  enabled: boolean;
  hours: unknown;
  awayMessage: string;
}) {
  const hours = normalizeCommercialWhatsappHours(input.hours);
  const hoursError = validateCommercialWhatsappHours(hours);
  if (hoursError) throw new Error(hoursError);
  const awayMessage = String(input.awayMessage || '').trim();
  if (awayMessage.length < 10 || awayMessage.length > 1000) throw new Error('Mensagem fora do horário inválida.');
  const updated = await prisma.platformSettings.update({
    where: { id: 1 },
    data: {
      commercialWhatsappEnabled: input.enabled === true,
      commercialWhatsappHours: hours,
      commercialWhatsappAwayMessage: awayMessage,
      version: { increment: 1 },
    },
  });

  await prisma.salesLeadWhatsappOutbox.updateMany({
    where: { kind: 'AWAY', status: 'PENDING' },
    data: {
      body: buildAwayMessage(
        updated.commercialWhatsappAwayMessage,
        updated.commercialWhatsappHours,
      ),
    },
  });

  return {
    enabled: updated.commercialWhatsappEnabled,
    hours: normalizeCommercialWhatsappHours(updated.commercialWhatsappHours),
    awayMessage: updated.commercialWhatsappAwayMessage,
    timezone: updated.timezone,
  };
}


export async function enqueuePendingLeadWhatsappGreetings() {
  const leads = await prisma.salesLead.findMany({
    where: { consent: true, whatsappOutbox: null },
    orderBy: { createdAt: 'asc' },
    take: 20,
    select: { id: true },
  });
  let queued = 0;
  for (const lead of leads) {
    const result = await enqueueLeadWhatsappGreeting(lead.id);
    if (result.queued) queued++;
  }
  return { processed: leads.length, queued };
}

export async function drainCommercialWhatsapp() {
  const queued = await enqueuePendingLeadWhatsappGreetings();
  const delivered = await deliverPlatformWhatsappOutbox();
  return { queued, delivered };
}
