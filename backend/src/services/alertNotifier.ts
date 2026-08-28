import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import {
  limitTelemetryText,
  redactTelemetryText,
  safeErrorName,
  sanitizeTelemetryValue,
} from './telemetrySanitizer.js';

const alertWebhookUrl = process.env.ALERT_WEBHOOK_URL || '';
const configuredProvider = (process.env.ALERT_PROVIDER || 'generic').trim().toLowerCase();
const alertEmailTo = process.env.ALERT_EMAIL_TO || '';
const alertEmailFrom = process.env.ALERT_EMAIL_FROM || '';
const smtpHost = process.env.SMTP_HOST || '';
const smtpPort = Number(process.env.SMTP_PORT || 587);
const smtpSecure = process.env.SMTP_SECURE === 'true';
const smtpUser = process.env.SMTP_USER || '';
const smtpPass = process.env.SMTP_PASS || '';
const configuredTimeoutMs = Number(process.env.ALERT_TIMEOUT_MS || 5_000);
const alertTimeoutMs =
  Number.isSafeInteger(configuredTimeoutMs) &&
  configuredTimeoutMs >= 1_000 &&
  configuredTimeoutMs <= 30_000
    ? configuredTimeoutMs
    : 5_000;

type AlertDetails = string | Record<string, unknown>;

let cachedTransporter: Transporter | null = null;

function resolveProvider() {
  if (configuredProvider !== 'generic') {
    return configuredProvider;
  }

  if (smtpHost && alertEmailTo) {
    return 'email';
  }

  if (alertWebhookUrl.includes('discord.com/api/webhooks')) {
    return 'discord';
  }

  if (alertWebhookUrl.includes('hooks.slack.com/services/')) {
    return 'slack';
  }

  if (alertWebhookUrl.includes('chat.googleapis.com/')) {
    return 'google_chat';
  }

  return 'generic';
}

function canSendEmail() {
  return Boolean(
    smtpHost && smtpPort > 0 && smtpUser && smtpPass && alertEmailTo && alertEmailFrom,
  );
}

function getTransporter() {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  cachedTransporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  return cachedTransporter;
}

function formatDetails(details: AlertDetails) {
  const sanitized = sanitizeTelemetryValue(details, {
    maxDepth: 5,
    maxEntries: 100,
    maxStringLength: 1_000,
  });
  const formatted = typeof sanitized === 'string' ? sanitized : JSON.stringify(sanitized, null, 2);

  return limitTelemetryText(formatted, 4_000);
}

async function sendEmailAlert(title: string, details: AlertDetails) {
  if (!canSendEmail()) {
    return false;
  }

  try {
    await getTransporter().sendMail({
      from: alertEmailFrom,
      to: alertEmailTo,
      subject: `[ALERTA] ${redactTelemetryText(title, 160)}`,
      text: `${redactTelemetryText(title, 300)}\n\n${formatDetails(details)}`,
    });

    return true;
  } catch (emailError: unknown) {
    console.error('[ALERT_EMAIL_ERROR]', { errorType: safeErrorName(emailError) });
    return false;
  }
}

function buildPayload(title: string, details: AlertDetails) {
  const provider = resolveProvider();
  const safeTitle = redactTelemetryText(title, 300);
  const safeDetails = formatDetails(details);
  const message = `${safeTitle}\n${safeDetails}`;

  if (provider === 'discord') {
    return {
      content: message,
    };
  }

  if (provider === 'slack') {
    return {
      text: `*${safeTitle}*\n${safeDetails}`,
    };
  }

  if (provider === 'google_chat') {
    return {
      text: message,
    };
  }

  return {
    text: message,
  };
}

export async function notifyCriticalError(title: string, details: AlertDetails) {
  const provider = resolveProvider();

  if (provider === 'email') {
    const sentByEmail = await sendEmailAlert(title, details);

    if (sentByEmail) {
      return;
    }
  }

  if (!alertWebhookUrl) {
    return;
  }

  try {
    const response = await fetch(alertWebhookUrl, {
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(alertTimeoutMs),
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildPayload(title, details)),
    });
    if (!response.ok) {
      console.error('[ALERT_WEBHOOK_HTTP_ERROR]', { status: response.status });
    }
  } catch (notificationError: unknown) {
    console.error('[ALERT_WEBHOOK_ERROR]', { errorType: safeErrorName(notificationError) });
  }
}
