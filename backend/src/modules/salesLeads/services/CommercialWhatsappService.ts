import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import prisma from '../../../config/prisma.js';
import { commercialWhatsappAiEnabled, generateCommercialWhatsappAiReply } from './CommercialWhatsappAiService.js';
import { realtimePublisher } from '../../../realtime/realtimePublisher.js';
import { resumeUnansweredCustomerHandoffs } from './CommercialWhatsappHandoffRecoveryService.js';
import { botReplyForMessage } from '../domain/commercialWhatsappMenu.js';
import { AUTOMATIC_REPLY_KINDS, enqueueAutoReply, suppressPendingAutomaticReplies } from './CommercialWhatsappOutboxQueueService.js';
import {
  decryptCredential,
  encryptCredential,
} from '../../restaurantSettings/security/credentialEncryption.js';
import {
  isCommercialWhatsappHumanServiceOpen,
  normalizeCommercialWhatsappHours,
  validateCommercialWhatsappHours,
} from '../domain/commercialWhatsappHours.js';
import {
  COMMERCIAL_WHATSAPP_AUTO_REPLY_DELAY_MS,
  commercialWhatsappAutoReplyAvailableAt,
  commercialWhatsappAutoReplyRetryAt,
  commercialWhatsappAutoReplySuppressionReason,
  type CommercialWhatsappConversationMode,
} from '../domain/commercialWhatsappAutomation.js';

type JsonRecord = Record<string, unknown>;
const PLATFORM_CONNECTION_ID = 1;
const PLATFORM_INSTANCE_NAME = 'gastronexa-platform';
const TOKEN_CONTEXT = 'platform-whatsapp-connection:evolution';
const HUMAN_UNAVAILABLE_TEXT = 'Olá! 😊 Nossa equipe humana não está disponível neste momento. Mas estou aqui 24 horas para ajudar com suas dúvidas sobre a GastroNexa. Como posso te ajudar?';

export class PlatformWhatsappRecoveryRequiredError extends Error {
  readonly code = 'PLATFORM_WHATSAPP_ORPHAN_SESSION';

  constructor() {
    super(
      'Existe uma sessão anterior do WhatsApp comercial na Evolution sem vínculo seguro com o banco atual. Reinicie essa conexão de forma controlada para gerar um novo QR Code.',
    );
    this.name = 'PlatformWhatsappRecoveryRequiredError';
  }
}

export class PlatformEvolutionRequestError extends Error {
  constructor(
    readonly status: number,
    readonly operation: string,
  ) {
    super(`Evolution API recusou a operação (${status}).`);
    this.name = 'PlatformEvolutionRequestError';
  }
}

function env(name: string) {
  return String(process.env[name] || '').trim();
}

function digitsOnly(value: unknown) {
  return String(value || '').replace(/\D/gu, '');
}

function normalizeBrazilWhatsappNumber(value: unknown) {
  const digits = digitsOnly(value);
  if (/^\d{10,11}$/u.test(digits)) return `55${digits}`;
  return digits;
}

function localBrazilPhone(value: unknown) {
  const digits = digitsOnly(value);
  return digits.startsWith('55') && (digits.length === 12 || digits.length === 13)
    ? digits.slice(2)
    : digits;
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
  const configured = env('EVOLUTION_PLATFORM_API_URL') || env('EVOLUTION_API_URL');
  if (!configured) {
    throw new Error('EVOLUTION_PLATFORM_API_URL não configurada para o WhatsApp comercial.');
  }
  const url = new URL(configured);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('EVOLUTION_API_URL inválida.');
  }
  return url.toString().replace(/\/+$/u, '');
}

function globalApiKey() {
  const value = env('EVOLUTION_PLATFORM_API_KEY') || env('EVOLUTION_API_KEY');
  if (!value) {
    throw new Error('EVOLUTION_PLATFORM_API_KEY não configurada para o WhatsApp comercial.');
  }
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
  if (!response.ok) {
    const operation = path
      .split('?')[0]
      .split('/')
      .filter(Boolean)
      .slice(0, 2)
      .join('/');
    throw new PlatformEvolutionRequestError(response.status, operation);
  }
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

export function isPlatformEvolutionInstanceNotFound(error: unknown) {
  return (
    error instanceof PlatformEvolutionRequestError &&
    error.status === 404 &&
    error.operation === 'instance/fetchInstances'
  );
}

async function fetchPlatformEvolutionInstance() {
  let payload: unknown;
  try {
    payload = await evolutionRequest(
      `/instance/fetchInstances?instanceName=${encodeURIComponent(PLATFORM_INSTANCE_NAME)}`,
    );
  } catch (error) {
    if (isPlatformEvolutionInstanceNotFound(error)) return null;
    throw error;
  }
  const instances = Array.isArray(payload) ? payload : [];
  return (
    instances.find(
      (candidate) =>
        candidate &&
        typeof candidate === 'object' &&
        String((candidate as JsonRecord).name || '').trim() === PLATFORM_INSTANCE_NAME,
    ) || null
  );
}

async function assertPlatformInstanceNameAvailable() {
  const remote = await fetchPlatformEvolutionInstance();
  if (remote) throw new PlatformWhatsappRecoveryRequiredError();
}

function connectionStateFromPayload(payload: unknown) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return '';
  const root = payload as JsonRecord;
  const instance =
    root.instance && typeof root.instance === 'object' && !Array.isArray(root.instance)
      ? (root.instance as JsonRecord)
      : {};
  return String(instance.state || root.state || '').trim().toLowerCase();
}

export function canRecoverPlatformEvolutionLogoutFailure(
  providerStatus: number,
  verifiedState: string,
) {
  const normalizedState = String(verifiedState || '').trim().toLowerCase();
  return (
    providerStatus === 500 &&
    Boolean(normalizedState) &&
    normalizedState !== 'open' &&
    normalizedState !== 'connecting'
  );
}

async function platformEvolutionConnectionState() {
  try {
    const payload = await evolutionRequest(
      `/instance/connectionState/${encodeURIComponent(PLATFORM_INSTANCE_NAME)}`,
    );
    return connectionStateFromPayload(payload);
  } catch (error) {
    if (error instanceof PlatformEvolutionRequestError && error.status === 404) return 'missing';
    throw error;
  }
}

async function logoutPlatformEvolutionInstance() {
  try {
    await evolutionRequest(`/instance/logout/${encodeURIComponent(PLATFORM_INSTANCE_NAME)}`, {
      method: 'DELETE',
    });
    return;
  } catch (error) {
    if (error instanceof PlatformEvolutionRequestError && error.status === 404) return;
    if (error instanceof PlatformEvolutionRequestError && error.status === 500) {
      const state = await platformEvolutionConnectionState().catch(() => '');
      if (canRecoverPlatformEvolutionLogoutFailure(error.status, state)) {
        console.warn('[PLATFORM_WHATSAPP_LOGOUT_RECOVERED]', {
          instanceName: PLATFORM_INSTANCE_NAME,
          providerStatus: error.status,
          verifiedState: state,
        });
        return;
      }
    }
    throw error;
  }
}

async function deletePlatformEvolutionInstance() {
  const remote = await fetchPlatformEvolutionInstance();
  if (!remote) return;

  await logoutPlatformEvolutionInstance();

  let deleteError: unknown = null;
  try {
    await evolutionRequest(`/instance/delete/${encodeURIComponent(PLATFORM_INSTANCE_NAME)}`, {
      method: 'DELETE',
    });
  } catch (error) {
    if (error instanceof PlatformEvolutionRequestError && error.status === 404) return;
    deleteError = error;
  }

  const remaining = await fetchPlatformEvolutionInstance();
  if (!remaining) {
    if (deleteError instanceof PlatformEvolutionRequestError) {
      console.warn('[PLATFORM_WHATSAPP_DELETE_RECOVERED]', {
        instanceName: PLATFORM_INSTANCE_NAME,
        providerStatus: deleteError.status,
      });
    }
    return;
  }

  if (deleteError) throw deleteError;
  throw new Error(
    'A sessão anterior do WhatsApp comercial não pôde ser removida com segurança. Nenhuma nova conexão foi criada.',
  );
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

  await assertPlatformInstanceNameAvailable();

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

export async function resetPlatformWhatsappConnection() {
  await deletePlatformEvolutionInstance();
  await prisma.platformWhatsappConnection.deleteMany({ where: { id: PLATFORM_CONNECTION_ID } });
  return createPlatformWhatsappConnection();
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
  const number = normalizeBrazilWhatsappNumber(destination);
  if (!/^\d{12,15}$/u.test(number)) throw new Error('Número de WhatsApp inválido.');
  const text = String(message || '').trim();
  if (!text || text.length > 4000) throw new Error('Mensagem comercial inválida.');
  const response = await evolutionRequest(`/message/sendText/${encodeURIComponent(row.externalInstanceId)}`, {
    method: 'POST',
    apiKey: connectionToken(row),
    body: { number, text, linkPreview: false },
  });
  const result = response && typeof response === 'object' ? response as JsonRecord : {};
  const key = result.key && typeof result.key === 'object' ? result.key as JsonRecord : {};
  const resultData = result.data && typeof result.data === 'object' ? result.data as JsonRecord : {};
  const nestedKey = resultData.key && typeof resultData.key === 'object' ? resultData.key as JsonRecord : {};
  const providerMessageId = String(key.id || nestedKey.id || result.id || '').trim();
  return providerMessageId && providerMessageId.length <= 191 ? providerMessageId : null;
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

function publishCommercialWhatsappUpdate(conversationId: string, reason: string) {
  realtimePublisher.to('super_admin').emit('sales-leads:whatsapp-chat-updated', {
    conversationId,
    reason,
    updatedAt: new Date().toISOString(),
  });
}

function scheduleCommercialWhatsappDrain() {
  const timer = setTimeout(() => {
    void deliverPlatformWhatsappOutbox().catch(() => undefined);
  }, COMMERCIAL_WHATSAPP_AUTO_REPLY_DELAY_MS + 25);
  timer.unref?.();
}

export async function processPlatformEvolutionInbound(
  instanceNameInput: unknown,
  webhookTokenInput: unknown,
  bodyInput: unknown,
) {
  const row = await connection();
  const instanceName = String(instanceNameInput || '').trim();
  const token = String(webhookTokenInput || '').trim();
  if (instanceName !== PLATFORM_INSTANCE_NAME) {
    return { accepted: false, status: 404, reason: 'wrong_commercial_instance' } as const;
  }
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

  const receivedAt = new Date();
  await prisma.platformWhatsappConnection.update({
    where: { id: PLATFORM_CONNECTION_ID },
    data: { lastWebhookAt: receivedAt },
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
          connectedAt: connected ? row.connectedAt || receivedAt : row.connectedAt,
          disconnectedAt: connected ? null : receivedAt,
        },
      });
    }
    return { accepted: true, queued: false } as const;
  }
  if (!meta.event.includes('messages')) {
    return { accepted: true, queued: false } as const;
  }
  if (!meta.remoteJid || /@g\.us$/u.test(meta.remoteJid) || /@newsletter$/u.test(meta.remoteJid)) {
    return { accepted: true, queued: false } as const;
  }

  const phone = digitsOnly(meta.remoteJid.split('@')[0]);
  if (!/^\d{10,15}$/u.test(phone)) return { accepted: true, queued: false } as const;
  const text = inboundText(body);
  // Outgoing voice, image, document and sticker messages are still human
  // activity even when their WhatsApp payload contains no text.
  if (!text && !meta.fromMe) return { accepted: true, queued: false } as const;

  if (meta.fromMe) {
    // This webhook is authenticated for the single configured commercial
    // Evolution instance. remoteJid identifies the CUSTOMER, not our own number.
    // Never hardcode the business phone or infer ownership from message text.
    if (!meta.providerMessageId || meta.providerMessageId.length > 191) {
      return { accepted: true, queued: false, reason: 'missing_provider_message_id' } as const;
    }
    const existing = await prisma.salesLeadWhatsappMessage.findUnique({
      where: { providerMessageId: meta.providerMessageId },
      select: { id: true },
    });
    if (existing) return { accepted: true, queued: false, reason: 'already_recorded_outbound' } as const;

    // An Evolution echo can arrive before sendText returns its provider ID.
    // A short, exact match against our in-flight/recent outbox avoids treating
    // most automated echoes as human. This is deliberately a fallback, not a
    // cryptographic proof of origin; matching provider IDs takes precedence.
    const ownReply = await prisma.salesLeadWhatsappOutbox.findFirst({
      where: {
        conversation: { is: { phone } },
        kind: { in: AUTOMATIC_REPLY_KINDS },
        body: text,
        status: { in: ['UNCERTAIN', 'SENT'] },
        createdAt: { gte: new Date(receivedAt.getTime() - 60_000) },
      },
      select: { id: true },
    });
    if (ownReply) return { accepted: true, queued: false, reason: 'automated_echo' } as const;

    const changed = await prisma.$transaction(async (tx) => {
      const conversation = await tx.salesLeadWhatsappConversation.upsert({
        where: { phone },
        create: { id: randomUUID(), phone, automationMode: 'HUMAN', lastOutboundAt: receivedAt, handoffRequestedAt: receivedAt },
        update: {},
      });
      // Only process the provider event once, including retries/replays.
      const inserted = await tx.salesLeadWhatsappMessage.createMany({
        data: [{
          id: randomUUID(),
          conversationId: conversation.id,
          direction: 'OUTBOUND',
          kind: 'MANUAL_DEVICE',
          body: text || '[Mensagem manual enviada no WhatsApp comercial]',
          providerMessageId: meta.providerMessageId,
          automated: false,
        }],
        skipDuplicates: true,
      });
      if (inserted.count !== 1) return null;
      await suppressPendingAutomaticReplies(tx, conversation.id, 'human_mode');
      await tx.salesLeadWhatsappConversation.update({
        where: { id: conversation.id },
        data: {
          automationMode: 'HUMAN',
          handoffRequestedAt: receivedAt,
          lastOutboundAt: receivedAt,
          closedAt: null,
        },
      });
      return conversation.id;
    });
    if (changed) publishCommercialWhatsappUpdate(changed, 'manual_device_message');
    return { accepted: true, queued: false, reason: changed ? 'human_device_takeover' : 'duplicate_outbound' } as const;
  }

  // Provider message IDs are mandatory for deterministic replay handling.
  // Do not turn an unidentifiable webhook into a customer-facing message.
  if (!meta.providerMessageId || meta.providerMessageId.length > 191) {
    return { accepted: true, queued: false, reason: 'missing_provider_message_id' } as const;
  }

  const leadPhone = localBrazilPhone(phone);
  const [lead, settings] = await Promise.all([
    prisma.salesLead.findFirst({
      where: { phone: { in: [phone, leadPhone] } },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    }),
    prisma.platformSettings.findUnique({
      where: { id: 1 },
      select: {
        commercialWhatsappEnabled: true,
        commercialWhatsappHours: true,
        timezone: true,
      },
    }),
  ]);

  // Persist the inbound message and its reply intent in ONE transaction.
  // ON CONFLICT DO NOTHING serializes concurrent webhook deliveries by the
  // provider ID, without producing a 500 or a second outbox entry.
  const result = await prisma.$transaction(async (tx) => {
    const conversation = await tx.salesLeadWhatsappConversation.upsert({
      where: { phone },
      create: { id: randomUUID(), phone, lastInboundAt: receivedAt },
      update: { lastInboundAt: receivedAt },
    });
    const inboundMessageId = randomUUID();
    const inserted = await tx.salesLeadWhatsappMessage.createMany({
      data: [{
        id: inboundMessageId,
        conversationId: conversation.id,
        leadId: lead?.id || null,
        direction: 'INBOUND',
        kind: 'CUSTOMER',
        body: text,
        providerMessageId: meta.providerMessageId,
        automated: false,
      }],
      skipDuplicates: true,
    });
    if (inserted.count !== 1) {
      return { accepted: true, queued: false, reason: 'duplicate_inbound' } as const;
    }
    const recorded = { conversationId: conversation.id };
    if (conversation.automationMode === 'HUMAN') {
      return { ...recorded, accepted: true, queued: false, reason: 'human_mode' } as const;
    }
    if (!settings?.commercialWhatsappEnabled) {
      return { ...recorded, accepted: true, queued: false, reason: 'automation_disabled' } as const;
    }
    if (conversation.automationMode === 'CLOSED') {
      return { ...recorded, accepted: true, queued: false, reason: 'conversation_closed' } as const;
    }
    const open = isCommercialWhatsappHumanServiceOpen(
      settings.commercialWhatsappHours,
      settings.timezone,
      receivedAt,
    );
    const aiEnabled = commercialWhatsappAiEnabled();
    if (!aiEnabled && !open) {
      return { ...recorded, accepted: true, queued: false, reason: 'outside_hours' } as const;
    }
    const botReply = aiEnabled ? null : botReplyForMessage(text);
    // The outbox stores an intent; the model is called only during delivery.
    const queued = await enqueueAutoReply(
      tx,
      conversation.id,
      phone,
      aiEnabled ? 'AI_REPLY' : botReply!.handoff ? 'HANDOFF' : 'GREETING',
      aiEnabled ? 'AI_PENDING' : botReply!.body,
      meta.providerMessageId,
    );
    return {
      ...recorded,
      accepted: true,
      queued: queued.queued,
      sent: 0,
      reason: queued.queued ? 'queued_with_delay' : queued.reason,
    } as const;
  });

  if ('conversationId' in result) {
    publishCommercialWhatsappUpdate(result.conversationId, 'inbound_message');
  }
  if (result.queued) scheduleCommercialWhatsappDrain();
  // Do not expose internal database identifiers to the webhook caller.
  return result.accepted === true ? { accepted: true, queued: result.queued, reason: result.reason } : result;
}

export async function enqueueLeadWhatsappGreeting(leadId: string) {
  const lead = await prisma.salesLead.findUnique({
    where: { id: leadId },
    select: { id: true, name: true, restaurantName: true, phone: true, consent: true },
  });
  if (!lead?.consent) return { queued: false, reason: 'no_consent' } as const;

  const settings = await prisma.platformSettings.findUnique({
    where: { id: 1 },
    select: {
      commercialWhatsappEnabled: true,
      commercialWhatsappHours: true,
      timezone: true,
    },
  });
  // Use the same queue and delivery policy: form greetings are 24h only
  // while commercial AI is enabled. Otherwise they follow human business hours.
  const queueBlockReason = commercialWhatsappAutoReplySuppressionReason({
    kind: 'FORM_GREETING',
    mode: 'BOT',
    automationEnabled: settings?.commercialWhatsappEnabled === true,
    open: settings
      ? isCommercialWhatsappHumanServiceOpen(settings.commercialWhatsappHours, settings.timezone)
      : false,
    aiEnabled: commercialWhatsappAiEnabled(),
  });
  if (queueBlockReason) return { queued: false, reason: queueBlockReason } as const;

  const whatsappPhone = normalizeBrazilWhatsappNumber(lead.phone);
  const conversation = await prisma.salesLeadWhatsappConversation.upsert({
    where: { phone: whatsappPhone },
    create: { id: randomUUID(), phone: whatsappPhone },
    update: {},
  });
  if (conversation.automationMode !== 'BOT') {
    return {
      queued: false,
      reason:
        conversation.automationMode === 'CLOSED' ? 'conversation_closed' : 'human_mode',
    } as const;
  }

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
      availableAt: commercialWhatsappAutoReplyAvailableAt(),
    },
    update: {},
  });
  scheduleCommercialWhatsappDrain();
  return { queued: true } as const;
}

export async function deliverPlatformWhatsappOutbox() {
  let row = await connection();
  if (!row) return { processed: 0, sent: 0, configured: false };

  if (row.status !== 'CONNECTED') {
    try {
      await refreshPlatformWhatsappConnection();
      row = await connection();
    } catch {
      return { processed: 0, sent: 0, configured: true };
    }
  }

  if (!row || row.status !== 'CONNECTED') {
    return { processed: 0, sent: 0, configured: true };
  }

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

  const hasPolicyControlledReplies = rows.some((item) =>
    AUTOMATIC_REPLY_KINDS.includes(item.kind) || item.kind === 'MANUAL',
  );
  const automationSettings = hasPolicyControlledReplies
    ? await prisma.platformSettings.findUnique({
        where: { id: 1 },
        select: {
          commercialWhatsappEnabled: true,
          commercialWhatsappHours: true,
          timezone: true,
        },
      })
    : null;
  const automationOpen = automationSettings
    ? isCommercialWhatsappHumanServiceOpen(
        automationSettings.commercialWhatsappHours,
        automationSettings.timezone,
      )
    : false;

  let sent = 0;
  for (const item of rows) {
    let providerContacted = false;
    try {
      const conversation = await prisma.salesLeadWhatsappConversation.findUnique({
        where: { id: item.conversationId },
        select: { automationMode: true },
      });
      if (!conversation) {
        await prisma.salesLeadWhatsappOutbox.update({
          where: { id: item.id },
          data: {
            status: 'SUPPRESSED',
            suppressedReason: 'conversation_missing',
            lockedUntil: null,
            lockToken: null,
          },
        });
        continue;
      }

      const automaticSuppression = commercialWhatsappAutoReplySuppressionReason({
        kind: item.kind,
        mode: conversation.automationMode,
        automationEnabled: automationSettings?.commercialWhatsappEnabled === true,
        open: automationOpen,
        aiEnabled: commercialWhatsappAiEnabled(),
      });
      if (automaticSuppression) {
        await prisma.salesLeadWhatsappOutbox.update({
          where: { id: item.id },
          data: {
            status: 'SUPPRESSED',
            suppressedReason: automaticSuppression,
            lockedUntil: null,
            lockToken: null,
          },
        });
        continue;
      }

      if (item.kind === 'MANUAL' && !automationOpen) {
        // Even a manual message queued just before closing must not be
        // delivered outside the configured human-support schedule.
        await prisma.salesLeadWhatsappOutbox.update({
          where: { id: item.id },
          data: {
            availableAt: new Date(Date.now() + 15 * 60_000),
            attempts: { decrement: 1 },
            lockedUntil: null,
            lockToken: null,
          },
        });
        continue;
      }

      if (
        item.kind !== 'MANUAL' &&
        !AUTOMATIC_REPLY_KINDS.includes(item.kind) &&
        conversation.automationMode !== 'BOT'
      ) {
        await prisma.salesLeadWhatsappOutbox.update({
          where: { id: item.id },
          data: {
            status: 'SUPPRESSED',
            suppressedReason:
              conversation.automationMode === 'CLOSED' ? 'conversation_closed' : 'human_mode',
            lockedUntil: null,
            lockToken: null,
          },
        });
        continue;
      }

      // Reserve the automatic send slot atomically across API and worker replicas.
      // Manual replies bypass this limiter. A collision is a deferral, never a
      // failed delivery attempt, and leaves the existing outbox item intact.
      if (item.kind !== 'MANUAL') {
        const now = new Date();
        const slot = await prisma.platformWhatsappConnection.updateMany({
          where: {
            id: PLATFORM_CONNECTION_ID,
            OR: [
              { nextAutomaticSendAt: null },
              { nextAutomaticSendAt: { lte: now } },
            ],
          },
          data: {
            nextAutomaticSendAt: commercialWhatsappAutoReplyAvailableAt(now),
          },
        });
        if (slot.count !== 1) {
          const reserved = await prisma.platformWhatsappConnection.findUnique({
            where: { id: PLATFORM_CONNECTION_ID },
            select: { nextAutomaticSendAt: true },
          });
          await prisma.salesLeadWhatsappOutbox.update({
            where: { id: item.id },
            data: {
              availableAt: commercialWhatsappAutoReplyRetryAt(
                now,
                reserved?.nextAutomaticSendAt,
              ),
              attempts: { decrement: 1 },
              lockedUntil: null,
              lockToken: null,
            },
          });
          continue;
        }
      }

      let outgoingBody = item.body;
      let handoffToHuman = item.kind === 'HANDOFF';
      if (item.kind === 'AI_REPLY') {
        // On each message, load only this lead's short history. No tenant data or secrets.
        const history = await prisma.salesLeadWhatsappMessage.findMany({
          where: { conversationId: item.conversationId },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: 8,
          select: { direction: true, body: true, automated: true },
        });
        const answer = await generateCommercialWhatsappAiReply(
          history.reverse().map((turn) => ({
            direction: turn.direction === 'INBOUND' ? 'INBOUND' : 'OUTBOUND',
            body: turn.body,
            automated: turn.automated,
          })),
        ).catch(() => ({
          body: 'Não consegui confirmar essa informação agora, mas continuo por aqui para ajudar com suas outras dúvidas. 🙂',
          handoff: false,
        }));
        outgoingBody = answer.body;
        // Do not queue a human takeover outside the configured support hours.
        handoffToHuman = answer.handoff && automationOpen;
        if (answer.handoff && !automationOpen) outgoingBody = HUMAN_UNAVAILABLE_TEXT;
      }

      // An operator or a newer inbound message can invalidate a response while AI runs.
      if (item.kind === 'AI_REPLY' || item.kind === 'AI_TIMEOUT') {
        const [currentConversation, currentOutbox] = await Promise.all([
          prisma.salesLeadWhatsappConversation.findUnique({
            where: { id: item.conversationId }, select: { automationMode: true },
          }),
          prisma.salesLeadWhatsappOutbox.findUnique({
            where: { id: item.id }, select: { status: true, lockToken: true },
          }),
        ]);
        if (currentConversation?.automationMode !== 'BOT' ||
          currentOutbox?.status !== 'PENDING' ||
          currentOutbox.lockToken !== lockToken) {
          await prisma.salesLeadWhatsappOutbox.updateMany({
            where: { id: item.id, status: 'PENDING', lockToken },
            data: { status: 'SUPPRESSED', suppressedReason: 'conversation_changed', lockedUntil: null, lockToken: null },
          });
          continue;
        }
      }

      // Claim the final send decision atomically. Once the worker is about to
      // contact Evolution, a lost HTTP response is ambiguous and MUST NOT be
      // retried automatically: doing so could deliver two customer messages.
      // The uncertain state stays visible for reconciliation by an operator.
      const sendClaim = await prisma.salesLeadWhatsappOutbox.updateMany({
        where: {
          id: item.id,
          status: 'PENDING',
          lockToken,
          conversation: {
            is: { automationMode: item.kind === 'MANUAL' ? 'HUMAN' : 'BOT' },
          },
        },
        data: {
          status: 'UNCERTAIN',
          body: outgoingBody,
          lockedUntil: null,
          lockToken: null,
        },
      });
      if (sendClaim.count !== 1) continue;

      providerContacted = true;
      const providerMessageId = await sendPlatformWhatsappText(item.phone, outgoingBody);
      const sentAt = new Date();
      await prisma.$transaction([
        prisma.salesLeadWhatsappOutbox.update({
          where: { id: item.id },
          data: { status: 'SENT', body: outgoingBody, sentAt: new Date(), lockedUntil: null, lockToken: null },
        }),
        prisma.salesLeadWhatsappMessage.create({
          data: {
            id: randomUUID(),
            conversationId: item.conversationId,
            direction: 'OUTBOUND',
            kind: handoffToHuman ? 'HANDOFF' : item.kind,
            body: outgoingBody,
            providerMessageId,
            automated: item.kind !== 'MANUAL',
          },
        }),
        prisma.salesLeadWhatsappConversation.update({
          where: { id: item.conversationId },
          data: {
            lastOutboundAt: sentAt,
            ...(item.kind === 'MANUAL' ? { handoffRequestedAt: sentAt } : {}),
            ...(handoffToHuman
              ? { automationMode: 'HUMAN', closedAt: null, handoffRequestedAt: sentAt }
              : {}),
          },
        }),
      ]);
      publishCommercialWhatsappUpdate(item.conversationId, 'outbound_message');
      if (handoffToHuman) {
        publishCommercialWhatsappUpdate(item.conversationId, 'human_handoff');
      }
      sent++;
    } catch {
      if (providerContacted) {
        // May have been accepted remotely. Keep UNCERTAIN rather than resend.
        // A separate, deliberate reconciliation is required.
        continue;
      }
      const exhausted = item.attempts >= 8;
      const delayMs = Math.min(60 * 60_000, 60_000 * 2 ** Math.min(item.attempts - 1, 6));
      await prisma.salesLeadWhatsappOutbox.updateMany({
        where: { id: item.id, status: 'PENDING', lockToken },
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
    include: {
      messages: { orderBy: { createdAt: 'asc' } },
      // Super Admin can see uncertain deliveries without receiving raw tokens,
      // provider HTTP payloads or an automatic retry control.
      outbox: {
        where: { status: 'UNCERTAIN' },
        select: { id: true, kind: true, status: true, attempts: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  });
}

export async function setCommercialWhatsappConversationMode(
  id: string,
  mode: CommercialWhatsappConversationMode,
) {
  const updated = await prisma.$transaction(async (tx) => {
    const conversation = await tx.salesLeadWhatsappConversation.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!conversation) throw new Error('Conversa não encontrada.');

    if (mode === 'HUMAN' || mode === 'CLOSED') {
      await suppressPendingAutomaticReplies(
        tx,
        id,
        mode === 'CLOSED' ? 'conversation_closed' : 'human_mode',
      );
    }

    return tx.salesLeadWhatsappConversation.update({
      where: { id },
      data: {
        automationMode: mode,
        closedAt: mode === 'CLOSED' ? new Date() : null,
        // Every human takeover starts a fresh ten-minute inactivity window.
        // Another human message resets it; BOT/CLOSED do not have a timer.
        handoffRequestedAt: mode === 'HUMAN' ? new Date() : null,
      },
    });
  });
  publishCommercialWhatsappUpdate(id, mode === 'CLOSED' ? 'conversation_closed' : 'mode_changed');
  return updated;
}

export async function enqueueManualCommercialWhatsappMessage(id: string, message: string) {
  const body = String(message || '').trim();
  if (body.length < 1 || body.length > 4000) throw new Error('Mensagem inválida.');

  const key = createHash('sha256').update(`MANUAL:${id}:${randomUUID()}`).digest('hex');
  await prisma.$transaction(async (tx) => {
    const conversation = await tx.salesLeadWhatsappConversation.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!conversation) throw new Error('Conversa não encontrada.');

    // The human-service schedule is enforced server-side, never only by the UI.
    const settings = await tx.platformSettings.findUnique({
      where: { id: 1 },
      select: { commercialWhatsappHours: true, timezone: true },
    });
    if (!settings || !isCommercialWhatsappHumanServiceOpen(
      settings.commercialWhatsappHours,
      settings.timezone,
    )) {
      const error = new Error('O atendimento humano está disponível apenas no horário configurado.');
      Object.assign(error, { statusCode: 403 });
      throw error;
    }

    await suppressPendingAutomaticReplies(tx, id, 'human_mode');
    await tx.salesLeadWhatsappConversation.update({
      where: { id },
      data: { automationMode: 'HUMAN', closedAt: null, handoffRequestedAt: new Date() },
    });
    await tx.salesLeadWhatsappOutbox.create({
      data: {
        id: randomUUID(),
        conversationId: id,
        deduplicationKey: key,
        kind: 'MANUAL',
        body,
      },
    });
  });

  publishCommercialWhatsappUpdate(id, 'human_message_queued');
  const delivered = await deliverPlatformWhatsappOutbox();
  return { queued: true, sent: delivered.sent > 0 };
}

export async function getCommercialWhatsappSettings() {
  const settings = await prisma.platformSettings.findUniqueOrThrow({ where: { id: 1 } });
  return {
    enabled: settings.commercialWhatsappEnabled,
    hours: normalizeCommercialWhatsappHours(settings.commercialWhatsappHours),
    timezone: settings.timezone,
  };
}

export async function updateCommercialWhatsappSettings(input: {
  enabled: boolean;
  hours: unknown;
}) {
  const hours = normalizeCommercialWhatsappHours(input.hours);
  const hoursError = validateCommercialWhatsappHours(hours);
  if (hoursError) throw new Error(hoursError);

  const updated = await prisma.platformSettings.update({
    where: { id: 1 },
    data: {
      commercialWhatsappEnabled: input.enabled === true,
      commercialWhatsappHours: hours,
      version: { increment: 1 },
    },
  });

  return {
    enabled: updated.commercialWhatsappEnabled,
    hours: normalizeCommercialWhatsappHours(updated.commercialWhatsappHours),
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
  const resumed = await resumeUnansweredCustomerHandoffs(publishCommercialWhatsappUpdate);
  const queued = await enqueuePendingLeadWhatsappGreetings();
  const delivered = await deliverPlatformWhatsappOutbox();
  return { resumed, queued, delivered };
}
