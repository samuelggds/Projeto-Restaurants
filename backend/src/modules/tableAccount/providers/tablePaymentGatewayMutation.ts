import restaurantSettingsRepository from '../../restaurantSettings/repositories/RestaurantSettingsRepository.js';
import { getMercadoPagoAccessToken } from '../../restaurantSettings/services/RestaurantPaymentCredentialsService.js';
import { getMercadoPagoOrderApi } from '../../payments/providers/mercadoPagoClient.js';
import { mercadoPagoCardExternalReferenceCandidates } from '../../orders/domain/mercadoPagoCardReference.js';
import { tableCardExternalReferenceCandidates } from '../domain/tableCardExternalReference.js';
import { tablePixExternalReference } from '../domain/tablePixExternalReference.js';
import refundOrderPaymentService from '../../orders/services/RefundOrderPaymentService.js';
import type { ProviderMutationInput, ProviderPayment } from './PaymentProvider.js';

type BoundPayment = {
  restaurantId: number;
  intentId: number;
  intentPublicId?: string;
  provider: string;
  method: 'PIX' | 'CARD';
  externalId: string;
  providerChargeId?: string | null;
  amountCents: number;
  expiresAt: Date;
};
type DirectReference =
  | { kind: 'MP_PAYMENT'; id: string }
  | { kind: 'MP_ORDER'; id: string }
  | { kind: 'ASAAS_PAYMENT'; id: string };

function directReference(input: BoundPayment): DirectReference | null {
  if (input.provider === 'MERCADO_PAGO') {
    if (input.externalId.startsWith('mp_order:')) {
      const id = input.externalId.slice('mp_order:'.length).trim();
      return id ? { kind: 'MP_ORDER', id } : null;
    }
    const id = input.externalId.replace(/^mp_pay:/u, '');
    return /^\d+$/u.test(id) ? { kind: 'MP_PAYMENT', id } : null;
  }
  if (input.provider === 'ASAAS') {
    const id = input.externalId.replace(/^asaas(?:_pay)?:/u, '');
    return /^pay_[\w-]+$/u.test(id) ? { kind: 'ASAAS_PAYMENT', id } : null;
  }
  return null;
}

async function connection(input: BoundPayment) {
  const reference = directReference(input);
  if (!reference) {
    throw new Error('Referência sem estorno automático seguro; requer revisão no gateway.');
  }
  if (reference.kind === 'MP_ORDER') {
    return { reference, url: null, headers: null };
  }

  const settings = await restaurantSettingsRepository.findByRestaurantId(input.restaurantId);
  const token = String(
    (input.provider === 'MERCADO_PAGO'
      ? await getMercadoPagoAccessToken(input.restaurantId)
      : settings?.asaasAccessToken) || '',
  ).trim();
  if (!token) throw new Error('Credencial do restaurante indisponível.');
  const url =
    reference.kind === 'MP_PAYMENT'
      ? `https://api.mercadopago.com/v1/payments/${reference.id}`
      : `${String(process.env.ASAAS_API_BASE_URL || 'https://api.asaas.com').replace(/\/+$/u, '')}/v3/payments/${reference.id}`;
  const headers: Record<string, string> =
    reference.kind === 'MP_PAYMENT'
      ? { Authorization: `Bearer ${token}` }
      : { access_token: token };
  return { reference, url, headers };
}

export async function getDirectTablePayment(input: BoundPayment): Promise<ProviderPayment | null> {
  const reference = directReference(input);
  if (!reference) return null;

  if (reference.kind === 'MP_ORDER') {
    const body = await (await getMercadoPagoOrderApi(input.restaurantId)).get(reference.id);
    const providerAmount = Number(body.total_paid_amount ?? body.total_amount);
    const validReferences =
      input.method === 'PIX'
        ? new Set([tablePixExternalReference(input.intentId, input.restaurantId)])
        : new Set([
            ...tableCardExternalReferenceCandidates(input.intentId, input.restaurantId),
            ...mercadoPagoCardExternalReferenceCandidates(input.intentId, input.restaurantId),
          ]);
    const validReference = validReferences.has(String(body.external_reference || '').trim());

    if (
      !validReference ||
      !Number.isFinite(providerAmount) ||
      Math.round(providerAmount * 100) !== input.amountCents ||
      String(body.currency || 'BRL').toUpperCase() !== 'BRL'
    ) {
      throw new Error('A cobrança não corresponde à referência, valor ou moeda da mesa.');
    }

    const status = String(body.status || '').trim().toUpperCase();
    const normalized: ProviderPayment['status'] =
      status === 'PROCESSED'
        ? 'PAID'
        : ['CANCELED', 'CANCELLED'].includes(status)
          ? 'CANCELED'
          : ['REJECTED', 'FAILED'].includes(status)
            ? 'FAILED'
            : ['REFUNDED', 'CHARGED_BACK'].includes(status)
              ? 'REFUNDED'
              : status === 'EXPIRED'
                ? 'EXPIRED'
                : 'PENDING';

    return {
      externalId: input.externalId,
      status: normalized,
      amountCents: input.amountCents,
      expiresAt: input.expiresAt,
      checkoutUrl: null,
      paymentCode: null,
    };
  }

  const { url, headers } = await connection(input);
  if (!url || !headers) throw new Error('Referência de pagamento inválida.');
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(15_000) });
  const body = (await response.json().catch(() => ({}))) as Record<string, any>;
  const rawAmount = reference.kind === 'MP_PAYMENT' ? body.transaction_amount : body.value;
  const amount = Number(rawAmount);
  if (
    !response.ok ||
    String(body.id) !== reference.id ||
    rawAmount == null ||
    !Number.isFinite(amount) ||
    Math.round(amount * 100) !== input.amountCents ||
    (reference.kind === 'MP_PAYMENT' && body.currency_id !== 'BRL') ||
    (body.currency && body.currency !== 'BRL')
  ) {
    throw new Error('A cobrança não corresponde à referência, valor ou moeda da mesa.');
  }
  const status = String(body.status || '').toUpperCase();
  let normalized: ProviderPayment['status'] = ['APPROVED', 'RECEIVED', 'CONFIRMED'].includes(status)
    ? 'PAID'
    : ['CANCELED', 'CANCELLED'].includes(status) || body.deleted === true
      ? 'CANCELED'
      : ['REJECTED', 'FAILED'].includes(status)
        ? 'FAILED'
        : status === 'REFUNDED'
          ? 'REFUNDED'
          : 'PENDING';
  if (reference.kind === 'ASAAS_PAYMENT' && Array.isArray(body.refunds)) {
    const done = body.refunds
      .filter((refund: any) => refund.status === 'DONE')
      .reduce((sum: number, refund: any) => sum + Math.round(Number(refund.value || 0) * 100), 0);
    if (done >= input.amountCents) normalized = 'REFUNDED';
    else if (status === 'REFUNDED') normalized = 'PENDING';
  }
  return {
    externalId: input.externalId,
    status: normalized,
    amountCents: input.amountCents,
    expiresAt: input.expiresAt,
    checkoutUrl: null,
    paymentCode: null,
  };
}

export async function mutateDirectTablePayment(
  input: BoundPayment,
  operation: 'cancel' | 'refund',
  mutation: ProviderMutationInput,
) {
  const before = await getDirectTablePayment(input);
  if (!before)
    throw new Error(
      'Checkout sem referência inequívoca de cobrança; concilie manualmente no gateway.',
    );
  if (
    before.status === 'REFUNDED' ||
    (operation === 'cancel' && ['CANCELED', 'FAILED', 'EXPIRED'].includes(before.status))
  )
    return before;
  if (operation === 'cancel') {
    if (before.status === 'PAID') return before;
    if (input.provider !== 'MERCADO_PAGO') {
      throw new Error('Cancelamento remoto não suportado; revise no gateway.');
    }

    const reference = directReference(input);
    if (reference?.kind === 'MP_ORDER') {
      await (await getMercadoPagoOrderApi(input.restaurantId)).cancel(
        reference.id,
        mutation.idempotencyKey,
      );
    } else {
      const { url, headers } = await connection(input);
      if (!url || !headers) throw new Error('Referência de pagamento inválida.');
      const response = await fetch(url, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) throw new Error('Cancelamento não confirmado pelo gateway.');
    }
  } else {
    if (before.status !== 'PAID') return before;
    // Reutiliza credenciais tenant/idempotência dos pedidos apenas com ID concreto.
    await refundOrderPaymentService.execute(
        {
          id: input.intentId,
          restaurantId: input.restaurantId,
          total: input.amountCents / 100,
          paid: true,
          paymentMethod: input.method === 'PIX' ? 'PIX' : 'CARTAO',
          pixPaymentId: input.method === 'PIX' ? input.externalId : null,
          cardCheckoutSessionId: input.method === 'CARD' ? input.externalId : null,
        },
        { idempotencyKey: mutation.idempotencyKey, verifyExistingRefund: true },
      );
  }
  const after = await getDirectTablePayment(input);
  if (!after) throw new Error('Estado final do gateway indisponível.');
  return after;
}
