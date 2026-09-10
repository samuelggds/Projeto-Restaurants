import nodemailer from 'nodemailer';

export function createSmtpTransporter() {
  const smtpHost = String(process.env.SMTP_HOST || '').trim();
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpSecure = String(process.env.SMTP_SECURE || 'false') === 'true';
  const smtpAuthType = String(process.env.SMTP_AUTH_TYPE || 'basic')
    .trim()
    .toLowerCase();
  const smtpUser = String(process.env.SMTP_USER || '').trim();
  const smtpPass = String(process.env.SMTP_PASS || '').trim();
  const smtpClientId = String(process.env.SMTP_CLIENT_ID || '').trim();
  const smtpClientSecret = String(process.env.SMTP_CLIENT_SECRET || '').trim();
  const smtpRefreshToken = String(process.env.SMTP_REFRESH_TOKEN || '').trim();
  const smtpAccessToken = String(process.env.SMTP_ACCESS_TOKEN || '').trim();

  if (!smtpHost || !smtpPort || !smtpUser) {
    return null;
  }

  if (smtpAuthType === 'oauth2') {
    if (!smtpClientId || !smtpClientSecret || !smtpRefreshToken) {
      return null;
    }

    return nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      requireTLS: true,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
      auth: {
        type: 'OAuth2',
        user: smtpUser,
        clientId: smtpClientId,
        clientSecret: smtpClientSecret,
        refreshToken: smtpRefreshToken,
        accessToken: smtpAccessToken || undefined,
      },
    });
  }

  if (!smtpPass) {
    return null;
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    requireTLS: true,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
}
