import OpenAI, { toFile } from 'openai';
import { redactCommercialWhatsappHistoryText } from './CommercialWhatsappAiService.js';
import { isCommercialWhatsappPromptOverride } from '../domain/commercialWhatsappDisclosurePolicy.js';

type JsonRecord = Record<string, unknown>;
const object = (value: unknown): JsonRecord =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {};

const MAX_AUDIO_BYTES = 8 * 1024 * 1024;
const MAX_AUDIO_BASE64_CHARS = Math.ceil(MAX_AUDIO_BYTES / 3) * 4 + 4;
const SUPPORTED_AUDIO_TYPES: Record<string, { extension: string; mime: string }> = {
  'audio/ogg': { extension: 'ogg', mime: 'audio/ogg' },
  'audio/opus': { extension: 'ogg', mime: 'audio/ogg' },
  'audio/mpeg': { extension: 'mp3', mime: 'audio/mpeg' },
  'audio/mp3': { extension: 'mp3', mime: 'audio/mpeg' },
  'audio/mp4': { extension: 'm4a', mime: 'audio/mp4' },
  'audio/x-m4a': { extension: 'm4a', mime: 'audio/mp4' },
  'audio/wav': { extension: 'wav', mime: 'audio/wav' },
  'audio/webm': { extension: 'webm', mime: 'audio/webm' },
};

export const COMMERCIAL_WHATSAPP_AUDIO_RETRY_TEXT =
  'Recebi seu áudio, mas não consegui entendê-lo agora. Pode enviar novamente ou escrever sua dúvida? 🙂';

export function safeCommercialWhatsappTranscript(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const text = raw.trim().slice(0, 4000);
  if (!text || isCommercialWhatsappPromptOverride(text)) return null;
  // Redaction runs before ANY persistence, history lookup, prompt or reply.
  const clean = redactCommercialWhatsappHistoryText(text);
  return clean && !isCommercialWhatsappPromptOverride(clean) ? clean : null;
}

/**
 * Called exclusively for an authenticated commercial Evolution webhook.
 * Media is fetched through the configured Evolution instance (never a URL from
 * the WhatsApp payload). Neither media nor the raw transcript is persisted.
 */
export async function transcribeCommercialWhatsappAudio(input: {
  instanceName: string;
  instanceApiKey: string;
  evolutionBaseUrl: string;
  providerMessage: JsonRecord;
  openAiApiKey: string;
}): Promise<string | null> {
  if (!input.openAiApiKey) return null;
  const audio = object(object(input.providerMessage.message).audioMessage);
  const mimeInput = String(audio.mimetype || '').split(';')[0].trim().toLowerCase();
  const format = SUPPORTED_AUDIO_TYPES[mimeInput];
  if (!format) return null;
  const seconds = Number(audio.seconds || 0);
  if (!Number.isFinite(seconds) || seconds < 0 || seconds > 120) return null;
  // Key and message are passed only to the trusted provider; no user-supplied
  // media URL or webhook-configured endpoint may influence the request.
  const mediaRequest = await fetch(
    `${input.evolutionBaseUrl}/chat/getBase64FromMediaMessage/${encodeURIComponent(input.instanceName)}`,
    {
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(15_000),
      headers: { apikey: input.instanceApiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: input.providerMessage, convertToMp4: false }),
    },
  );
  if (!mediaRequest.ok) return null;
  // Cap response bytes prior to JSON parsing to avoid huge media payloads.
  const sizeHeader = Number(mediaRequest.headers.get('content-length') || 0);
  if (sizeHeader > MAX_AUDIO_BASE64_CHARS * 2) return null;
  const responseText = await mediaRequest.text();
  if (responseText.length > MAX_AUDIO_BASE64_CHARS * 2) return null;
  const payload = object(JSON.parse(responseText) as unknown);
  const base64Raw = String(payload.base64 || object(payload.data).base64 || '');
  const base64 = base64Raw.replace(/^data:[^,]{0,100},/iu, '');
  if (!base64 || base64.length > MAX_AUDIO_BASE64_CHARS ||
      !/^[A-Za-z0-9+/]+={0,2}$/u.test(base64)) return null;
  const bytes = Buffer.from(base64, 'base64');
  if (!bytes.length || bytes.length > MAX_AUDIO_BYTES) return null;
  const client = new OpenAI({ apiKey: input.openAiApiKey, timeout: 35_000, maxRetries: 0 });
  const file = await toFile(bytes, `commercial-voice.${format.extension}`, { type: format.mime });
  const result = await client.audio.transcriptions.create({
    file,
    model: 'gpt-4o-mini-transcribe',
    language: 'pt',
    response_format: 'json',
  });
  return safeCommercialWhatsappTranscript(result.text);
}
