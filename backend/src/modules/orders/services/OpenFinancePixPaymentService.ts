import prisma from '../../../config/prisma.js';
import orderRepository from '../repositories/OrderRepository.js';
import restaurantSettingsRepository from '../../restaurantSettings/repositories/RestaurantSettingsRepository.js';
import {
  belvoIdempotencyKey,
  belvoJson,
  isBelvoOpenFinanceConfigured,
  isUuid,
  normalizePixKey,
  safeBelvoError,
} from '../../payments/providers/belvoOpenFinance.js';
import { isValidCpf } from './pixPayload.js';

type BelvoInstitution = {
  id?: string;
  name?: string;
  display_name?: string;
  displayName?: string;
  logo?: string | null;
  icon_logo?: string | null;
  status?: string;
  country_code?: string;
};

type BelvoInstitutionsResponse =
  | BelvoInstitution[]
  | {
      results?: BelvoInstitution[];
      data?: BelvoInstitution[];
    };

export type OpenFinanceInstitution = {
  id: string;
  name: string;
  logo: string | null;
};

type BelvoPaymentIntent = {
  id?: string;
  external_id?: string;
  status?: string;
  amount?: string | number;
  currency?: string;
  failure_code?: string | null;
  failure_message?: string | null;
  payment_method_information?: {
    open_finance?: {
      redirect_url?: string;
      end_to_end_id?: string;
      provider_request_id?: string;
    };
  };
};

function requireHttpsUrl(raw: unknown, label: string) {
  let url: URL;
  try {
    url = new URL(String(raw || '').trim());
  } catch {
    throw new Error(`${label} inválida.`);
  }
  if (url.protocol !== 'https:' || url.username || url.password) {
    throw new Error(`${label} precisa usar HTTPS sem credenciais embutidas.`);
  }
  return url;
}

function callbackUrl(slug: string, publicId: string) {
  const frontend = requireHttpsUrl(process.env.FRONTEND_URL, 'FRONTEND_URL');
  frontend.pathname = `/${encodeURIComponent(slug)}/pedido/${encodeURIComponent(publicId)}/pagamento`;
  frontend.search = 'openFinanceReturn=1';
  frontend.hash = '';
  return frontend.toString();
}

function normalizeCpf(value: unknown) {
  const digits = String(value || '').replace(/\D/gu, '');
  if (!isValidCpf(digits)) {
    throw new Error('Informe um CPF válido para pagar pelo app do banco.');
  }
  return digits;
}

function expectedExternalId(restaurantId: number, orderId: number) {
  return belvoIdempotencyKey(`orderpix:${restaurantId}:${orderId}`);
}

function expectedReference(restaurantId: number, orderId: number) {
  return `orderpix:${restaurantId}:${orderId}`;
}

function paymentEvidence(intent: BelvoPaymentIntent, restaurantId: number, orderId: number, total: number) {
  if (!isUuid(intent.id)) throw new Error('A Belvo retornou uma Payment Intent inválida.');
  if (String(intent.external_id || '') !== expectedExternalId(restaurantId, orderId)) {
    throw new Error('A Payment Intent não corresponde ao pedido informado.');
  }
  const amount = Number(intent.amount);
  if (!Number.isFinite(amount) || Math.round(amount * 100) !== Math.round(total * 100)) {
    throw new Error('O valor da Payment Intent não corresponde ao total do pedido.');
  }
  if (String(intent.currency || 'BRL').trim().toUpperCase() !== 'BRL') {
    throw new Error('A moeda da Payment Intent não corresponde ao pedido.');
  }
}

class OpenFinancePixPaymentService {
  async listInstitutions(): Promise<OpenFinanceInstitution[]> {
    if (!isBelvoOpenFinanceConfigured()) {
      throw new Error('Pix pelo app do banco ainda não está disponível.');
    }

    const { response, body } = await belvoJson<BelvoInstitutionsResponse>(
      '/payments/br/institutions/?page_size=200',
      { method: 'GET' },
    );

    if (!response.ok) {
      throw new Error(safeBelvoError(body, 'Não foi possível carregar os bancos disponíveis.'));
    }

    const rows = Array.isArray(body)
      ? body
      : Array.isArray(body?.results)
        ? body.results
        : Array.isArray(body?.data)
          ? body.data
          : [];

    const unique = new Map<string, OpenFinanceInstitution>();
    for (const row of rows) {
      const id = String(row?.id || '').trim();
      const name = String(row?.display_name || row?.displayName || row?.name || '').trim();
      if (!isUuid(id) || !name) continue;
      if (String(row?.status || '').trim().toUpperCase() === 'UNAVAILABLE') continue;
      const rawLogo = String(row?.logo || row?.icon_logo || '').trim();
      const logo = rawLogo && /^https:\/\//iu.test(rawLogo) ? rawLogo : null;
      unique.set(id, { id, name: name.slice(0, 120), logo });
    }

    return [...unique.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }

  async start({
    orderId,
    restaurantId,
    payerInstitution,
    customerCpf,
  }: {
    orderId: number | string;
    restaurantId: number | string;
    payerInstitution: unknown;
    customerCpf: unknown;
  }) {
    if (!isBelvoOpenFinanceConfigured()) {
      throw new Error('Pix pelo app do banco ainda não está disponível.');
    }

    const normalizedRestaurantId = Number(restaurantId);
    const normalizedOrderId = Number(orderId);
    if (
      !Number.isSafeInteger(normalizedRestaurantId) ||
      normalizedRestaurantId <= 0 ||
      !Number.isSafeInteger(normalizedOrderId) ||
      normalizedOrderId <= 0
    ) {
      throw new Error('Pedido inválido para pagamento via Open Finance.');
    }

    const institutionId = String(payerInstitution || '').trim();
    if (!isUuid(institutionId)) throw new Error('Escolha um banco válido para continuar.');

    const cpf = normalizeCpf(customerCpf);
    const order = await orderRepository.findById(normalizedOrderId, normalizedRestaurantId);
    if (!order || String(order.paymentMethod || '') !== 'PIX' || order.payOnDelivery === true) {
      throw new Error('Pedido inválido para pagamento via Open Finance.');
    }
    if (order.paid === true) {
      return {
        paymentId: String(order.pixPaymentId || ''),
        status: 'SUCCEEDED',
        paid: true,
        orderId: order.id,
        orderPublicId: order.publicId,
        totalAmount: Number(order.total),
      };
    }
    if (String(order.status || '').toUpperCase() === 'CANCELADO') {
      throw new Error('Este pedido foi cancelado e não pode mais ser pago.');
    }

    const settings = await restaurantSettingsRepository.findByRestaurantId(normalizedRestaurantId);
    if (!settings?.openFinancePixEnabled || settings.acceptsPix === false) {
      throw new Error('Pix pelo app do banco está desativado neste restaurante.');
    }

    const pixKey = normalizePixKey(settings.pixKey);
    const restaurant = await prisma.restaurant.findFirst({
      where: { id: normalizedRestaurantId, active: true },
      select: { slug: true, name: true },
    });
    if (!restaurant?.slug) throw new Error('Restaurante indisponível para este pagamento.');

    const total = Number(order.total);
    if (!Number.isFinite(total) || total <= 0) throw new Error('Total do pedido inválido.');

    const existingPaymentId = String(order.pixPaymentId || '').trim();
    if (existingPaymentId) {
      if (!existingPaymentId.startsWith('belvo:')) {
        throw new Error('Este pedido já está vinculado a outra tentativa de pagamento Pix.');
      }
      return this.resume({
        paymentId: existingPaymentId,
        restaurantId: normalizedRestaurantId,
        orderId: normalizedOrderId,
        total,
      });
    }

    const externalId = expectedExternalId(normalizedRestaurantId, normalizedOrderId);
    const createResult = await belvoJson<BelvoPaymentIntent>('/payments/br/payment-intents/', {
      method: 'POST',
      headers: {
        'Belvo-Idempotency-Key': belvoIdempotencyKey(
          `open-finance-create:${normalizedRestaurantId}:${normalizedOrderId}`,
        ),
      },
      body: JSON.stringify({
        amount: total.toFixed(2),
        description: `Pedido #${normalizedOrderId} - ${String(restaurant.name || 'Restaurante').slice(0, 80)}`,
        statement_description: `Pedido #${normalizedOrderId} GastroNexa`,
        allowed_payment_method_types: ['open_finance'],
        external_id: externalId,
        confirm: false,
        payment_method_details: {
          open_finance: {
            pix_key: pixKey,
            payer_institution: institutionId,
            callback_url: callbackUrl(restaurant.slug, String(order.publicId)),
          },
        },
        customer: { identifier: cpf },
      }),
    });

    if (!createResult.response.ok) {
      throw new Error(
        safeBelvoError(createResult.body, 'Não foi possível iniciar o Pix pelo app do banco.'),
      );
    }

    paymentEvidence(createResult.body, normalizedRestaurantId, normalizedOrderId, total);
    const intentId = String(createResult.body.id);

    await orderRepository.claimPixPaymentId(
      normalizedOrderId,
      normalizedRestaurantId,
      `belvo:${intentId}`,
    );

    return this.confirmAndRedirect({
      intentId,
      restaurantId: normalizedRestaurantId,
      orderId: normalizedOrderId,
      total,
      orderPublicId: String(order.publicId),
    });
  }

  private async confirmAndRedirect({
    intentId,
    restaurantId,
    orderId,
    total,
    orderPublicId,
  }: {
    intentId: string;
    restaurantId: number;
    orderId: number;
    total: number;
    orderPublicId: string;
  }) {
    const confirmed = await belvoJson<BelvoPaymentIntent>(
      `/payments/br/payment-intents/${encodeURIComponent(intentId)}/`,
      {
        method: 'PATCH',
        headers: {
          'Belvo-Idempotency-Key': belvoIdempotencyKey(
            `open-finance-confirm:${restaurantId}:${orderId}`,
          ),
        },
        body: JSON.stringify({ confirm: true }),
      },
    );

    if (!confirmed.response.ok) {
      throw new Error(
        safeBelvoError(
          confirmed.body,
          'Não foi possível abrir o banco agora. O pedido foi preservado para nova tentativa.',
        ),
      );
    }

    paymentEvidence(confirmed.body, restaurantId, orderId, total);
    const redirectUrl = requireHttpsUrl(
      confirmed.body.payment_method_information?.open_finance?.redirect_url,
      'URL de autorização bancária',
    ).toString();

    return {
      paymentId: `belvo:${intentId}`,
      provider: 'BELVO',
      status: String(confirmed.body.status || 'REQUIRES_ACTION'),
      redirectUrl,
      requiresStatusCheck: true,
      paid: String(confirmed.body.status || '').toUpperCase() === 'SUCCEEDED',
      orderId,
      orderPublicId,
      totalAmount: total,
      externalReference: expectedReference(restaurantId, orderId),
    };
  }

  async resume({
    paymentId,
    restaurantId,
    orderId,
    total,
  }: {
    paymentId: string;
    restaurantId: number;
    orderId: number;
    total: number;
  }) {
    const intentId = String(paymentId || '').replace(/^belvo:/iu, '').trim();
    if (!isUuid(intentId)) throw new Error('Payment Intent Open Finance inválida.');

    const current = await belvoJson<BelvoPaymentIntent>(
      `/payments/br/payment-intents/${encodeURIComponent(intentId)}/`,
      { method: 'GET' },
    );
    if (!current.response.ok) {
      throw new Error(
        safeBelvoError(current.body, 'Não foi possível recuperar o pagamento Open Finance.'),
      );
    }
    paymentEvidence(current.body, restaurantId, orderId, total);

    const status = String(current.body.status || '').toUpperCase();
    if (status === 'SUCCEEDED') {
      return {
        paymentId: `belvo:${intentId}`,
        provider: 'BELVO',
        status,
        paid: true,
        requiresStatusCheck: false,
        orderId,
        orderPublicId: '',
        totalAmount: total,
        externalReference: expectedReference(restaurantId, orderId),
      };
    }
    if (status === 'FAILED') throw new Error('A autorização bancária anterior falhou.');

    const redirect = String(
      current.body.payment_method_information?.open_finance?.redirect_url || '',
    ).trim();
    if (redirect) {
      return {
        paymentId: `belvo:${intentId}`,
        provider: 'BELVO',
        status,
        redirectUrl: requireHttpsUrl(redirect, 'URL de autorização bancária').toString(),
        requiresStatusCheck: true,
        paid: false,
        orderId,
        orderPublicId: '',
        totalAmount: total,
        externalReference: expectedReference(restaurantId, orderId),
      };
    }

    return this.confirmAndRedirect({
      intentId,
      restaurantId,
      orderId,
      total,
      orderPublicId: '',
    });
  }
}

export default new OpenFinancePixPaymentService();
