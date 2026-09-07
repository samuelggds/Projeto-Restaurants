type SendPasswordResetCodeInput = {
  to: string;
  code: string;
};

type WhatsAppCloudApiConfig = {
  apiVersion: string;
  phoneNumberId: string;
  accessToken: string;
  templateName: string;
  templateLanguage: string;
  timeoutMs: number;
};

function normalizeApiVersion(value: string) {
  const normalized = String(value || '').trim();
  if (!normalized) return 'v25.0';
  return /^v\d+\.\d+$/u.test(normalized) ? normalized : '';
}

export function normalizeWhatsappPhone(
  value: string | number | null | undefined,
  defaultCountryCode = process.env.WHATSAPP_DEFAULT_COUNTRY_CODE || '55',
) {
  const digits = String(value || '').replace(/\D/g, '');
  const countryCode = String(defaultCountryCode || '').replace(/\D/g, '');

  if (!digits || !countryCode) return '';

  if (digits.startsWith(countryCode) && digits.length >= countryCode.length + 10) {
    return digits;
  }

  if (digits.length >= 10 && digits.length <= 11) {
    return `${countryCode}${digits}`;
  }

  return digits.length >= 10 && digits.length <= 15 ? digits : '';
}

function resolveConfig(): WhatsAppCloudApiConfig | null {
  if (String(process.env.WHATSAPP_ENABLED || 'false').trim().toLowerCase() !== 'true') {
    return null;
  }

  const apiVersion = normalizeApiVersion(process.env.WHATSAPP_API_VERSION || 'v25.0');
  const phoneNumberId = String(process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim();
  const accessToken = String(process.env.WHATSAPP_ACCESS_TOKEN || '').trim();
  const templateName = String(process.env.WHATSAPP_PASSWORD_RESET_TEMPLATE || '').trim();
  const templateLanguage = String(
    process.env.WHATSAPP_PASSWORD_RESET_TEMPLATE_LANGUAGE || 'pt_BR',
  ).trim();
  const timeoutMs = Number(process.env.WHATSAPP_REQUEST_TIMEOUT_MS || 8000);

  if (
    !apiVersion ||
    !phoneNumberId ||
    !accessToken ||
    !templateName ||
    !templateLanguage ||
    !Number.isFinite(timeoutMs) ||
    timeoutMs <= 0
  ) {
    return null;
  }

  return {
    apiVersion,
    phoneNumberId,
    accessToken,
    templateName,
    templateLanguage,
    timeoutMs,
  };
}

export function isWhatsappPasswordResetConfigured() {
  return Boolean(resolveConfig());
}

export async function sendWhatsappPasswordResetCode({
  to,
  code,
}: SendPasswordResetCodeInput) {
  const config = resolveConfig();
  if (!config) {
    throw new Error('WhatsApp Cloud API nao configurada para recuperacao de senha.');
  }

  const destination = normalizeWhatsappPhone(to);
  const normalizedCode = String(code || '').trim();

  if (!destination) {
    throw new Error('Telefone invalido para envio via WhatsApp.');
  }
  if (!/^\d{6}$/u.test(normalizedCode)) {
    throw new Error('Codigo de recuperacao invalido para envio via WhatsApp.');
  }

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
          to: destination,
          type: 'template',
          template: {
            name: config.templateName,
            language: { code: config.templateLanguage },
            components: [
              {
                type: 'body',
                parameters: [{ type: 'text', text: normalizedCode }],
              },
              {
                type: 'button',
                sub_type: 'url',
                index: '0',
                parameters: [{ type: 'text', text: normalizedCode }],
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

    const payload = await response.json().catch(() => null);
    return {
      sent: true,
      provider: 'meta_whatsapp_cloud_api' as const,
      messageId: String(payload?.messages?.[0]?.id || '').trim() || null,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Tempo limite ao enviar codigo pelo WhatsApp.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
