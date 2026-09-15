import nodemailer from 'nodemailer';
import { canLogLocalAuthCode } from '../security/localAuthCodeLogging.js';

export type MfaDeliveryChannel = 'EMAIL' | 'SMS' | 'WHATSAPP';

export type MfaDeliveryOption = {
  channel: MfaDeliveryChannel;
  label: string;
  destination: string;
};

type MfaRecipient = {
  email: string;
  phone?: string | null;
};

type SendMfaCodeInput = {
  channel: MfaDeliveryChannel;
  recipient: MfaRecipient;
  code: string;
  ttlMinutes: number;
};

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  authType: 'basic' | 'oauth2';
  user: string;
  pass: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  accessToken: string;
};

type TwilioConfig = {
  accountSid: string;
  authToken: string;
  fromNumber: string;
  timeoutMs: number;
};

type WhatsAppConfig = {
  apiVersion: string;
  phoneNumberId: string;
  accessToken: string;
  templateName: string;
  templateLanguage: string;
  timeoutMs: number;
};

function positiveNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function isEnabled(value: unknown) {
  return String(value || 'false').trim().toLowerCase() === 'true';
}

export function normalizeMfaPhone(
  value: string | number | null | undefined,
  defaultCountryCode = process.env.MFA_DEFAULT_COUNTRY_CODE ||
    process.env.WHATSAPP_DEFAULT_COUNTRY_CODE ||
    '55',
) {
  const digits = String(value || '').replace(/\D/gu, '');
  const countryCode = String(defaultCountryCode || '').replace(/\D/gu, '');
  if (!digits) return '';

  if (!countryCode) {
    return digits.length >= 10 && digits.length <= 15 ? digits : '';
  }

  if (digits.startsWith(countryCode) && digits.length >= countryCode.length + 10) {
    return digits.length <= 15 ? digits : '';
  }

  if (digits.length >= 10 && digits.length <= 11) {
    return `${countryCode}${digits}`;
  }

  return digits.length >= 10 && digits.length <= 15 ? digits : '';
}

export function maskMfaPhone(value: string | number | null | undefined) {
  const normalized = normalizeMfaPhone(value);
  if (!normalized) return 'seu telefone cadastrado';
  const visiblePrefix = normalized.slice(0, Math.min(2, normalized.length));
  const visibleSuffix = normalized.slice(-4);
  const hiddenLength = Math.max(4, normalized.length - visiblePrefix.length - visibleSuffix.length);
  return `+${visiblePrefix}${'*'.repeat(hiddenLength)}${visibleSuffix}`;
}

export function maskMfaEmail(emailInput: unknown) {
  const email = String(emailInput || '').trim();
  const [localPart, domain] = email.split('@');
  if (!localPart || !domain) return 'seu e-mail cadastrado';

  const visibleLength = Math.min(3, Math.max(1, Math.floor(localPart.length / 3)));
  const visible = localPart.slice(0, visibleLength);
  return `${visible}${'*'.repeat(Math.max(4, localPart.length - visibleLength))}@${domain}`;
}

function resolveSmtpConfig(): SmtpConfig | null {
  const host = String(process.env.SMTP_HOST || '').trim();
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = String(process.env.SMTP_SECURE || 'false') === 'true';
  const authType = String(process.env.SMTP_AUTH_TYPE || 'basic').trim().toLowerCase();
  const user = String(process.env.SMTP_USER || '').trim();
  const pass = String(process.env.SMTP_PASS || '').trim();
  const clientId = String(process.env.SMTP_CLIENT_ID || '').trim();
  const clientSecret = String(process.env.SMTP_CLIENT_SECRET || '').trim();
  const refreshToken = String(process.env.SMTP_REFRESH_TOKEN || '').trim();
  const accessToken = String(process.env.SMTP_ACCESS_TOKEN || '').trim();

  if (!host || !Number.isFinite(port) || port <= 0 || !user) return null;
  if (authType === 'oauth2') {
    if (!clientId || !clientSecret || !refreshToken) return null;
    return {
      host,
      port,
      secure,
      authType: 'oauth2',
      user,
      pass: '',
      clientId,
      clientSecret,
      refreshToken,
      accessToken,
    };
  }

  if (!pass) return null;
  return {
    host,
    port,
    secure,
    authType: 'basic',
    user,
    pass,
    clientId: '',
    clientSecret: '',
    refreshToken: '',
    accessToken: '',
  };
}

function createTransporter(config: SmtpConfig) {
  if (config.authType === 'oauth2') {
    return nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      requireTLS: true,
      auth: {
        type: 'OAuth2',
        user: config.user,
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        refreshToken: config.refreshToken,
        accessToken: config.accessToken || undefined,
      },
    });
  }

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    requireTLS: true,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });
}

function resolveTwilioConfig(): TwilioConfig | null {
  if (!isEnabled(process.env.SMS_ENABLED)) return null;
  const provider = String(process.env.SMS_PROVIDER || 'twilio').trim().toLowerCase();
  if (provider !== 'twilio') return null;

  const accountSid = String(process.env.TWILIO_ACCOUNT_SID || '').trim();
  const authToken = String(process.env.TWILIO_AUTH_TOKEN || '').trim();
  const fromNumber = normalizeMfaPhone(process.env.TWILIO_FROM_NUMBER || '', '');
  const timeoutMs = positiveNumber(process.env.SMS_REQUEST_TIMEOUT_MS, 8000);
  if (!accountSid || !authToken || !fromNumber) return null;

  return { accountSid, authToken, fromNumber: `+${fromNumber}`, timeoutMs };
}

function resolveWhatsAppConfig(): WhatsAppConfig | null {
  if (!isEnabled(process.env.WHATSAPP_ENABLED)) return null;

  const apiVersion = String(process.env.WHATSAPP_API_VERSION || 'v25.0').trim();
  const phoneNumberId = String(process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim();
  const accessToken = String(process.env.WHATSAPP_ACCESS_TOKEN || '').trim();
  const templateName = String(process.env.WHATSAPP_MFA_TEMPLATE || '').trim();
  const templateLanguage = String(process.env.WHATSAPP_MFA_TEMPLATE_LANGUAGE || 'pt_BR').trim();
  const timeoutMs = positiveNumber(process.env.WHATSAPP_REQUEST_TIMEOUT_MS, 8000);

  if (
    !/^v\d+\.\d+$/u.test(apiVersion) ||
    !phoneNumberId ||
    !accessToken ||
    !templateName ||
    !templateLanguage
  ) {
    return null;
  }

  return { apiVersion, phoneNumberId, accessToken, templateName, templateLanguage, timeoutMs };
}

export function isEmailMfaConfigured() {
  return Boolean(resolveSmtpConfig()) || process.env.NODE_ENV !== 'production';
}

export function isSmsMfaConfigured() {
  return Boolean(resolveTwilioConfig());
}

export function isWhatsAppMfaConfigured() {
  return Boolean(resolveWhatsAppConfig());
}

export function listAvailableMfaChannels(recipient: MfaRecipient): MfaDeliveryOption[] {
  const options: MfaDeliveryOption[] = [];
  const phone = normalizeMfaPhone(recipient.phone);

  if (isEmailMfaConfigured() && String(recipient.email || '').trim()) {
    options.push({ channel: 'EMAIL', label: 'E-mail', destination: maskMfaEmail(recipient.email) });
  }
  if (phone && isSmsMfaConfigured()) {
    options.push({ channel: 'SMS', label: 'SMS', destination: maskMfaPhone(phone) });
  }
  if (phone && isWhatsAppMfaConfigured()) {
    options.push({ channel: 'WHATSAPP', label: 'WhatsApp', destination: maskMfaPhone(phone) });
  }

  return options;
}

function basicAuthDisabled(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '');
  const normalized = message.toLowerCase();
  return normalized.includes('535') && normalized.includes('basic authentication is disabled');
}

async function sendEmailCode(recipient: MfaRecipient, code: string, ttlMinutes: number) {
  const config = resolveSmtpConfig();
  const destination = String(recipient.email || '').trim();
  if (!destination) throw new Error('E-mail cadastrado indisponivel para MFA.');

  if (!config) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Envio de MFA por e-mail indisponivel. Configure o SMTP da plataforma.');
    }
    if (canLogLocalAuthCode()) {
      console.warn(`[login-mfa] SMTP nao configurado. Codigo para ${destination}: ${code}`);
    }
    return { destination: maskMfaEmail(destination) };
  }

  const transporter = createTransporter(config);
  const from =
    String(process.env.ALERT_EMAIL_FROM || process.env.SMTP_USER || '').trim() ||
    'no-reply@pizzaia.local';

  try {
    await transporter.sendMail({
      from,
      to: destination,
      subject: 'Código de verificação de login - GastroNexa',
      text: `Seu código de verificação é: ${code}. Ele expira em ${ttlMinutes} minutos.`,
    });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      if (canLogLocalAuthCode()) {
        console.warn(`[login-mfa] Falha no SMTP local. Codigo para ${destination}: ${code}`);
      }
      return { destination: maskMfaEmail(destination) };
    }
    if (basicAuthDisabled(error)) {
      throw new Error(
        'Falha no SMTP: o provedor bloqueou login por usuario/senha. Configure OAuth2 ou app password.',
      );
    }
    throw error;
  }

  return { destination: maskMfaEmail(destination) };
}

async function sendSmsCode(recipient: MfaRecipient, code: string, ttlMinutes: number) {
  const config = resolveTwilioConfig();
  if (!config) throw new Error('Envio de MFA por SMS nao esta configurado.');
  const phone = normalizeMfaPhone(recipient.phone);
  if (!phone) throw new Error('Telefone cadastrado invalido para envio de MFA por SMS.');

  const body = new URLSearchParams({
    To: `+${phone}`,
    From: config.fromNumber,
    Body: `GastroNexa: seu codigo de verificacao e ${code}. Expira em ${ttlMinutes} minutos.`,
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(config.accountSid)}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
        signal: controller.signal,
      },
    );
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      const providerCode = String(payload?.code || '').trim();
      throw new Error(
        `Provedor de SMS recusou o envio${providerCode ? ` (codigo ${providerCode})` : ''}.`,
      );
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Tempo limite ao enviar codigo MFA por SMS.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  return { destination: maskMfaPhone(phone) };
}

async function sendWhatsAppCode(recipient: MfaRecipient, code: string) {
  const config = resolveWhatsAppConfig();
  if (!config) throw new Error('Envio de MFA pelo WhatsApp nao esta configurado.');
  const phone = normalizeMfaPhone(recipient.phone);
  if (!phone) throw new Error('Telefone cadastrado invalido para envio de MFA pelo WhatsApp.');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(
      `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: phone,
          type: 'template',
          template: {
            name: config.templateName,
            language: { code: config.templateLanguage },
            components: [
              {
                type: 'body',
                parameters: [{ type: 'text', text: code }],
              },
              {
                type: 'button',
                sub_type: 'url',
                index: '0',
                parameters: [{ type: 'text', text: code }],
              },
            ],
          },
        }),
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      const providerCode = Number(payload?.error?.code || 0) || undefined;
      throw new Error(
        `WhatsApp Cloud API recusou o envio${providerCode ? ` (codigo ${providerCode})` : ''}.`,
      );
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Tempo limite ao enviar codigo MFA pelo WhatsApp.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  return { destination: maskMfaPhone(phone) };
}

export function parseMfaDeliveryChannel(value: unknown): MfaDeliveryChannel | null {
  const normalized = String(value || '').trim().toUpperCase();
  if (normalized === 'EMAIL' || normalized === 'SMS' || normalized === 'WHATSAPP') {
    return normalized;
  }
  return null;
}

export async function sendMfaCode({ channel, recipient, code, ttlMinutes }: SendMfaCodeInput) {
  if (!/^\d{6}$/u.test(String(code || ''))) {
    throw new Error('Codigo MFA invalido para envio.');
  }

  if (channel === 'SMS') return sendSmsCode(recipient, code, ttlMinutes);
  if (channel === 'WHATSAPP') return sendWhatsAppCode(recipient, code);
  return sendEmailCode(recipient, code, ttlMinutes);
}
