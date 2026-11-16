/**
 * The Evolution/Baileys webhook has several message envelopes. We only process
 * customer-authored text and safe, fixed media/referral prompts. Provider links
 * and advertising descriptions are never treated as user instructions.
 */
type RecordValue = Record<string, unknown>;
const record = (value: unknown): RecordValue =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as RecordValue : {};
const value = (input: unknown) => typeof input === 'string' ? input.trim().slice(0, 4000) : '';
const nested = (message: RecordValue): RecordValue => {
  let current = message;
  for (let i = 0; i < 3; i++) {
    const next = record(record(current.ephemeralMessage).message ||
      record(current.viewOnceMessage).message ||
      record(current.viewOnceMessageV2).message ||
      record(current.documentWithCaptionMessage).message);
    if (!Object.keys(next).length) break;
    current = next;
  }
  return current;
};
export type CommercialWhatsappInboundContent = {
  text: string;
  kind: 'TEXT' | 'AUDIO' | 'AD_REFERRAL' | 'UNSUPPORTED';
  needsFixedReply: boolean;
};
export const COMMERCIAL_WHATSAPP_UNSUPPORTED_REPLY =
  'Recebi sua mensagem! 🙂 Para eu entender melhor, poderia escrever sua dúvida sobre a GastroNexa por texto?';
export function parseCommercialWhatsappInboundContent(body: RecordValue): CommercialWhatsappInboundContent {
  const data = record(body.data);
  const message = nested(record(data.message));
  const extended = record(message.extendedTextMessage);
  const image = record(message.imageMessage);
  const video = record(message.videoMessage);
  const buttons = record(message.buttonsResponseMessage);
  const list = record(message.listResponseMessage);
  const template = record(message.templateButtonReplyMessage);
  const authoredText = [
    message.conversation,
    extended.text,
    image.caption,
    video.caption,
    buttons.selectedDisplayText,
    buttons.selectedButtonId,
    record(list.singleSelectReply).selectedRowId,
    list.title,
    template.selectedDisplayText,
    data.text,
  ].map(value).find(Boolean) || '';
  // Ads may arrive as image/extended-text referral metadata without
  // conversation text. Do not pass externalAdReply.title/body/URL to AI.
  const ctx = [
    record(message.messageContextInfo),
    record(extended.contextInfo), record(image.contextInfo),
    record(video.contextInfo), record(message.contextInfo),
    record(data.contextInfo),
  ];
  const referral = record(data.referral);
  const hasAd = ctx.some(c => Object.keys(record(c.externalAdReply)).length > 0 ||
    Object.keys(record(c.referral)).length > 0) ||
    Object.keys(referral).length > 0 ||
    Object.keys(record(data.adReply)).length > 0;
  // A tracking link alone is not a question; greet visitors who entered
  // from GastroNexa campaigns without copying any URL into the model.
  const onlyLinks = /^(?:(?:https?:\/\/|www\.)[^\s]+\s*)+$/iu.test(authoredText);
  const gastronexaLink = /(?:https?:\/\/)?(?:www\.)?gastronexa\.com\.br(?:\/|\b)/iu.test(authoredText);
  if ((hasAd && (!authoredText || onlyLinks)) || (onlyLinks && gastronexaLink)) {
    return {
      text: 'Olá! Vim por um anúncio e gostaria de conhecer a GastroNexa.',
      kind: 'AD_REFERRAL',
      needsFixedReply: false,
    };
  }
  if (authoredText) return { text: authoredText, kind: 'TEXT', needsFixedReply: false };
  if (Object.keys(record(message.audioMessage)).length > 0 ||
      Object.keys(record(message.pttMessage)).length > 0) {
    return { text: '[Áudio recebido, não transcrito]', kind: 'AUDIO', needsFixedReply: true };
  }
  return { text: '', kind: 'UNSUPPORTED', needsFixedReply: false };
}
