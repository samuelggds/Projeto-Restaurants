import { z } from 'zod';
import { createSmtpTransporter } from '../../../services/smtpTransport.js';

export function salesLeadEmailConfiguration(env: NodeJS.ProcessEnv = process.env) {
  const recipient = z
    .string()
    .email()
    .safeParse(String(env.SALES_CONTACT_NOTIFICATION_EMAIL || '').trim());
  const from = String(
    env.SALES_CONTACT_EMAIL_FROM || env.ALERT_EMAIL_FROM || env.SMTP_USER || '',
  ).trim();
  const oauth =
    String(env.SMTP_AUTH_TYPE || 'basic')
      .trim()
      .toLowerCase() === 'oauth2';
  const credentials = oauth
    ? env.SMTP_CLIENT_ID && env.SMTP_CLIENT_SECRET && env.SMTP_REFRESH_TOKEN
    : env.SMTP_PASS;
  const port = Number(env.SMTP_PORT || 587);
  if (
    !recipient.success ||
    !from ||
    /[\r\n]/u.test(from) ||
    !env.SMTP_HOST ||
    !env.SMTP_USER ||
    !credentials ||
    !Number.isSafeInteger(port) ||
    port <= 0 ||
    port > 65535
  )
    return null;
  return { recipient: recipient.data, from };
}

export type SalesLeadEmail = {
  id: string;
  name: string;
  restaurantName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  businessType: string;
  channels: string[];
  planInterest: string;
  message: string | null;
};

export function createSalesLeadEmailSender() {
  const config = salesLeadEmailConfiguration();
  if (!config) return null;
  const transporter = createSmtpTransporter();
  if (!transporter) return null;
  return async (lead: SalesLeadEmail) => {
    // Fixed subject/from/to; visitor input only appears in the plain-text body and reply-to.
    const result = await transporter.sendMail({
      from: config.from,
      to: config.recipient,
      replyTo: lead.email,
      subject: 'Novo contato comercial — GastroNexa',
      messageId: `<sales-lead-${lead.id}@gastronexa.local>`,
      text: [
        'Novo contato recebido pelo site GastroNexa.',
        '',
        `Nome: ${lead.name}`,
        `Restaurante: ${lead.restaurantName}`,
        `E-mail: ${lead.email}`,
        `Telefone: ${lead.phone}`,
        `Cidade/UF: ${lead.city}/${lead.state}`,
        `Tipo: ${lead.businessType}`,
        `Canais: ${lead.channels.join(', ')}`,
        `Plano de interesse: ${lead.planInterest}`,
        `Mensagem: ${lead.message || 'Não informada'}`,
        '',
        `Referência no painel: ${lead.id}`,
      ].join('\n'),
    });
    // A resolved sendMail is insufficient when SMTP rejects the recipient.
    if (
      !Array.isArray(result.accepted) ||
      result.accepted.length === 0 ||
      result.rejected?.length
    ) {
      throw new Error('SMTP não aceitou o destinatário do contato.');
    }
  };
}
