import { MercadoPagoConfig, Payment, PaymentRefund } from 'mercadopago';
import { getMercadoPagoAccessToken } from '../../restaurantSettings/services/RestaurantPaymentCredentialsService.js';

async function getAccessToken(restaurantId?: number | null) {
  const normalizedRestaurantId = Number(restaurantId || 0);
  const allowGlobalFallback = process.env.ALLOW_GLOBAL_PAYMENT_FALLBACK === 'true';
  if (Number.isSafeInteger(normalizedRestaurantId) && normalizedRestaurantId > 0) {
    return getMercadoPagoAccessToken(normalizedRestaurantId);
  }
  const globalToken = String(process.env.MP_ACCESS_TOKEN || '').trim();
  const token = allowGlobalFallback ? globalToken : '';

  if (!token) {
    throw new Error(
      'Pagamento Mercado Pago indisponivel. Configure access token do Mercado Pago nas configuracoes do restaurante.',
    );
  }

  return token;
}

function mercadoPagoApiBaseUrl() {
  return String(process.env.MP_API_BASE_URL || 'https://api.mercadopago.com')
    .trim()
    .replace(/\/+$/, '');
}

async function mercadoPagoJson<T>(
  restaurantId: number | null | undefined,
  path: string,
  options: { method?: 'GET' | 'POST'; body?: unknown; idempotencyKey?: string } = {},
): Promise<T> {
  const accessToken = await getAccessToken(restaurantId);
  const response = await fetch(`${mercadoPagoApiBaseUrl()}${path}`, {
    method: options.method || 'GET',
    redirect: 'error',
    signal: AbortSignal.timeout(15_000),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(options.idempotencyKey ? { 'X-Idempotency-Key': options.idempotencyKey } : {}),
    },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });
  const payload = (await response.json().catch(() => ({}))) as T & {
    message?: unknown;
    error?: unknown;
  };
  if (!response.ok) {
    throw new Error(
      String(payload?.message || payload?.error || 'Mercado Pago recusou a operação.'),
    );
  }
  return payload;
}

export async function getMercadoPagoClient(restaurantId?: number | null) {
  return new MercadoPagoConfig({
    accessToken: await getAccessToken(restaurantId),
  });
}

export async function getMercadoPagoPaymentApi(restaurantId?: number | null) {
  return new Payment(await getMercadoPagoClient(restaurantId));
}

export async function getMercadoPagoPaymentRefundApi(restaurantId?: number | null) {
  return new PaymentRefund(await getMercadoPagoClient(restaurantId));
}

type LegacyPreferenceBody = {
  items?: Array<{
    id?: string;
    title?: string;
    description?: string;
    quantity?: number;
    unit_price?: number;
  }>;
  external_reference?: string;
  payer?: { email?: string };
  back_urls?: { success?: string; failure?: string; pending?: string };
};

type MercadoPagoOrder = {
  id?: string;
  status?: string;
  status_detail?: string;
  external_reference?: string;
  total_amount?: string | number;
  total_paid_amount?: string | number;
  checkout_url?: string;
  user_id?: string | number;
  currency?: string;
};

function normalizeAmount(value: unknown) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Valor inválido para checkout Mercado Pago.');
  }
  return amount.toFixed(2);
}

/**
 * Compatibilidade temporária com o chamador existente de Checkout Pro.
 * A aplicação nova do Mercado Pago usa Orders API; portanto este adaptador
 * converte o corpo legado de Preference em POST /v1/orders e devolve o shape
 * mínimo que o serviço de checkout já espera (`id` + `init_point`).
 */
export async function getMercadoPagoPreferenceApi(restaurantId?: number | null) {
  return {
    create: async ({ body }: { body: LegacyPreferenceBody }) => {
      const items = Array.isArray(body.items) ? body.items : [];
      const total = items.reduce(
        (sum, item) => sum + Number(item.unit_price || 0) * Number(item.quantity || 0),
        0,
      );
      const externalReference = String(body.external_reference || '').trim();
      if (!externalReference || !items.length) {
        throw new Error('Checkout Mercado Pago incompleto.');
      }
      const orderBody = {
        type: 'online',
        processing_mode: 'manual',
        capture_mode: 'automatic_async',
        total_amount: normalizeAmount(total),
        external_reference: externalReference,
        ...(body.payer?.email ? { payer: { email: String(body.payer.email).trim() } } : {}),
        config: {
          online: {
            ...(body.back_urls?.success ? { success_url: body.back_urls.success } : {}),
            ...(body.back_urls?.failure ? { failure_url: body.back_urls.failure } : {}),
            ...(body.back_urls?.pending ? { pending_url: body.back_urls.pending } : {}),
            auto_return: 'approved',
          },
        },
        items: items.map((item) => ({
          external_code: String(item.id || externalReference).slice(0, 64),
          title: String(item.title || 'Pedido').slice(0, 256),
          ...(item.description ? { description: String(item.description).slice(0, 256) } : {}),
          quantity: Number(item.quantity || 1),
          unit_price: normalizeAmount(item.unit_price),
        })),
      };
      const response = await mercadoPagoJson<MercadoPagoOrder>(restaurantId, '/v1/orders', {
        method: 'POST',
        body: orderBody,
        idempotencyKey: `${externalReference}-base`.slice(0, 128),
      });
      const id = String(response.id || '').trim();
      const checkoutUrl = String(response.checkout_url || '').trim();
      if (!id || !checkoutUrl) {
        throw new Error('Mercado Pago não retornou a order ou o link de checkout.');
      }
      return { id, init_point: checkoutUrl };
    },
  };
}

export async function getMercadoPagoOrderApi(restaurantId?: number | null) {
  return {
    get: (orderId: string) =>
      mercadoPagoJson<MercadoPagoOrder>(
        restaurantId,
        `/v1/orders/${encodeURIComponent(String(orderId || '').trim())}`,
      ),
  };
}
