import restaurantSettingsRepository from '../../restaurantSettings/repositories/RestaurantSettingsRepository.js';
import refundOrderPaymentService from '../../orders/services/RefundOrderPaymentService.js';
import type { ProviderMutationInput, ProviderPayment } from './PaymentProvider.js';

type BoundPayment = { restaurantId: number; intentId: number; provider: string; method: 'PIX' | 'CARD'; externalId: string; amountCents: number; expiresAt: Date };
function directReference(input: BoundPayment) {
  if (input.provider === 'MERCADO_PAGO') {
    const id = input.externalId.replace(/^mp_pay:/u, '');
    return /^\d+$/u.test(id) ? id : null;
  }
  if (input.provider === 'ASAAS') {
    const id = input.externalId.replace(/^asaas(?:_pay)?:/u, '');
    return /^pay_[\w-]+$/u.test(id) ? id : null;
  }
  if (input.provider === 'PAGBANK') {
    const id = input.externalId.replace(/^pagbank(?:_tx)?:/u, '');
    return /^(?:ORDE|CHAR)[_-][\w-]+$/u.test(id) ? id : null;
  }
  return null;
}

async function connection(input: BoundPayment) {
  const id = directReference(input);
  if (!id) throw new Error('Referência sem estorno automático seguro; requer revisão no gateway.');
  const settings = await restaurantSettingsRepository.findByRestaurantId(input.restaurantId);
  const token = String((input.provider === 'MERCADO_PAGO' ? settings?.mercadoPagoAccessToken
    : input.provider === 'ASAAS' ? settings?.asaasAccessToken : settings?.pagbankToken) || '').trim();
  if (!token) throw new Error('Credencial do restaurante indisponível.');
  const url = input.provider === 'MERCADO_PAGO'
    ? `https://api.mercadopago.com/v1/payments/${id}`
    : input.provider === 'ASAAS' ? `${String(process.env.ASAAS_API_BASE_URL || 'https://api.asaas.com').replace(/\/+$/u, '')}/v3/payments/${id}`
    : `${String(process.env.PAGBANK_API_BASE_URL || 'https://api.pagseguro.com').replace(/\/+$/u, '')}/${id.startsWith('ORDE') ? 'orders' : 'charges'}/${id}`;
  const headers: Record<string, string> = input.provider !== 'ASAAS' ? { Authorization: `Bearer ${token}` } : { access_token: token };
  return { id, url, headers };
}

export async function getDirectTablePayment(input: BoundPayment): Promise<ProviderPayment | null> {
  if (!directReference(input)) return null;
  const { id, url, headers } = await connection(input);
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(15_000) });
  const body = await response.json().catch(() => ({})) as Record<string, any>;
  if (input.provider === 'PAGBANK') {
    if (!response.ok || String(body.id) !== id) throw new Error('Referência PagBank divergente.');
    const charges = id.startsWith('ORDE') ? (Array.isArray(body.charges) ? body.charges : []) : [body];
    if (charges.length !== 1) throw new Error('Cobrança PagBank ausente ou ambígua; revisão manual necessária.');
    const charge = charges[0];
    if (!/^CHAR[_-][\w-]+$/u.test(String(charge.id)) || charge.amount?.value !== input.amountCents || charge.amount?.currency !== 'BRL') {
      throw new Error('Evidência financeira PagBank divergente.');
    }
    const refunded = charge.amount?.summary?.refunded;
    const status: ProviderPayment['status'] = refunded === input.amountCents ? 'REFUNDED'
      : charge.status === 'PAID' ? 'PAID' : charge.status === 'CANCELED' ? 'CANCELED'
      : charge.status === 'DECLINED' ? 'FAILED' : 'PENDING';
    return { externalId: input.externalId, status, amountCents: input.amountCents, expiresAt: input.expiresAt, checkoutUrl: null, paymentCode: null };
  }
  const rawAmount = input.provider === 'MERCADO_PAGO' ? body.transaction_amount : body.value;
  const amount = Number(rawAmount);
  if (!response.ok || String(body.id) !== id || rawAmount == null || !Number.isFinite(amount) || Math.round(amount * 100) !== input.amountCents ||
    (input.provider === 'MERCADO_PAGO' && body.currency_id !== 'BRL') || (body.currency && body.currency !== 'BRL')) {
    throw new Error('A cobrança não corresponde à referência, valor ou moeda da mesa.');
  }
  const status = String(body.status || '').toUpperCase();
  let normalized: ProviderPayment['status'] = ['APPROVED', 'RECEIVED', 'CONFIRMED'].includes(status) ? 'PAID'
    : ['CANCELED', 'CANCELLED'].includes(status) || body.deleted === true ? 'CANCELED'
    : ['REJECTED', 'FAILED'].includes(status) ? 'FAILED'
    : status === 'REFUNDED' ? 'REFUNDED' : 'PENDING';
  // Asaas: somente itens DONE contam como devolução. Solicitado/pendente não é estornado.
  if (input.provider === 'ASAAS' && Array.isArray(body.refunds)) {
    const done = body.refunds.filter((refund: any) => refund.status === 'DONE')
      .reduce((sum: number, refund: any) => sum + Math.round(Number(refund.value || 0) * 100), 0);
    if (done >= input.amountCents) normalized = 'REFUNDED';
    else if (status === 'REFUNDED') normalized = 'PENDING';
  }
  return { externalId: input.externalId, status: normalized, amountCents: input.amountCents, expiresAt: input.expiresAt, checkoutUrl: null, paymentCode: null };
}

export async function mutateDirectTablePayment(input: BoundPayment, operation: 'cancel' | 'refund', mutation: ProviderMutationInput) {
  const before = await getDirectTablePayment(input);
  if (!before) throw new Error('Checkout sem referência inequívoca de cobrança; concilie manualmente no gateway.');
  if (before.status === 'REFUNDED' || (operation === 'cancel' && ['CANCELED', 'FAILED', 'EXPIRED'].includes(before.status))) return before;
  if (operation === 'cancel') {
    if (before.status === 'PAID') return before; // O chamador tratará aprovação tardia como estorno.
    if (input.provider !== 'MERCADO_PAGO') throw new Error('Cancelamento remoto não suportado; revise no gateway.');
    const { url, headers } = await connection(input);
    const response = await fetch(url, { method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'cancelled' }), signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw new Error('Cancelamento não confirmado pelo gateway.');
  } else {
    if (before.status !== 'PAID') return before;
    if (input.provider === 'PAGBANK' && input.method === 'CARD') {
      const { id, url, headers } = await connection(input);
      if (!id.startsWith('CHAR')) throw new Error('Referência PagBank de cartão não suportada.');
      const response = await fetch(`${url}/cancel`, { method: 'POST', headers: { ...headers,
        'Content-Type': 'application/json', 'x-idempotency-key': mutation.idempotencyKey },
        body: JSON.stringify({ amount: { value: input.amountCents } }), signal: AbortSignal.timeout(15_000) });
      if (!response.ok) throw new Error('Estorno PagBank não confirmado.');
    } else {
    // Reutiliza credenciais tenant/idempotência dos pedidos apenas com ID concreto.
    await refundOrderPaymentService.execute({ id: input.intentId, restaurantId: input.restaurantId,
      total: input.amountCents / 100, paid: true, paymentMethod: input.method === 'PIX' ? 'PIX' : 'CARTAO',
      pixPaymentId: input.method === 'PIX' ? input.externalId : null,
      cardCheckoutSessionId: input.method === 'CARD' ? input.externalId : null,
    }, { idempotencyKey: mutation.idempotencyKey, verifyExistingRefund: true });
    }
  }
  const after = await getDirectTablePayment(input);
  if (!after) throw new Error('Estado final do gateway indisponível.');
  return after;
}
