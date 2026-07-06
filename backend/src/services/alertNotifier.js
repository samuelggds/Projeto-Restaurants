import nodemailer from "nodemailer";

const alertWebhookUrl = process.env.ALERT_WEBHOOK_URL || "";
const configuredProvider = (process.env.ALERT_PROVIDER || "generic")
  .trim()
  .toLowerCase();
const alertEmailTo = process.env.ALERT_EMAIL_TO || "";
const alertEmailFrom = process.env.ALERT_EMAIL_FROM || "";
const smtpHost = process.env.SMTP_HOST || "";
const smtpPort = Number(process.env.SMTP_PORT || 587);
const smtpSecure = process.env.SMTP_SECURE === "true";
const smtpUser = process.env.SMTP_USER || "";
const smtpPass = process.env.SMTP_PASS || "";

let cachedTransporter = null;

function resolveProvider() {
  if (configuredProvider !== "generic") {
    return configuredProvider;
  }

  if (smtpHost && alertEmailTo) {
    return "email";
  }

  if (alertWebhookUrl.includes("discord.com/api/webhooks")) {
    return "discord";
  }

  if (alertWebhookUrl.includes("hooks.slack.com/services/")) {
    return "slack";
  }

  if (alertWebhookUrl.includes("chat.googleapis.com/")) {
    return "google_chat";
  }

  return "generic";
}

function canSendEmail() {
  return Boolean(
    smtpHost &&
    smtpPort > 0 &&
    smtpUser &&
    smtpPass &&
    alertEmailTo &&
    alertEmailFrom,
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

async function sendEmailAlert(title, details) {
  if (!canSendEmail()) {
    return false;
  }

  try {
    await getTransporter().sendMail({
      from: alertEmailFrom,
      to: alertEmailTo,
      subject: `[ALERTA] ${title}`,
      text: `${title}\n\n${details}`,
    });

    return true;
  } catch (emailError) {
    console.error("[ALERT_EMAIL_ERROR]", emailError?.message);
    return false;
  }
}

function buildPayload(title, details) {
  const provider = resolveProvider();
  const message = `${title}\n${details}`;

  if (provider === "discord") {
    return {
      content: message,
    };
  }

  if (provider === "slack") {
    return {
      text: `*${title}*\n${details}`,
    };
  }

  if (provider === "google_chat") {
    return {
      text: message,
    };
  }

  return {
    text: message,
  };
}

export async function notifyCriticalError(title, details) {
  const provider = resolveProvider();

  if (provider === "email") {
    const sentByEmail = await sendEmailAlert(title, details);

    if (sentByEmail) {
      return;
    }
  }

  if (!alertWebhookUrl) {
    return;
  }

  try {
    await fetch(alertWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildPayload(title, details)),
    });
  } catch (notificationError) {
    console.error("[ALERT_WEBHOOK_ERROR]", notificationError?.message);
  }
}
