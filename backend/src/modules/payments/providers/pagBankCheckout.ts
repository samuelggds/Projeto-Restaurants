import { getPagBankAccessToken } from '../../restaurantSettings/services/RestaurantPaymentCredentialsService.js';
import { resolveOAuthEndpoint } from '../../restaurantSettings/security/oauthEndpoints.js';

type RecordValue = Record<string, any>;
const record = (value: unknown): RecordValue =>
  value && typeof value === 'object' && !Array.isArray(value) ? value : {};

export function pagBankApiBaseUrl() {
  return resolveOAuthEndpoint('PAGBANK_API');
}

export function pagBankCardReference(order: {
  id: number | string;
  restaurantId: number | string;
  publicId: string;
}) {
  return `ordercard:${order.id}:${order.restaurantId}:${order.publicId.replace(/-/g, '')}`;
}

export function pagBankTableReference(intent: {
  id: number | string;
  restaurantId: number | string;
  publicId: string;
}) {
  return `tablecard:${intent.id}:${intent.restaurantId}:${intent.publicId.replace(/-/g, '')}`;
}

async function request(restaurantId: number, path: string, init: RequestInit = {}) {
  const token = await getPagBankAccessToken(restaurantId);
  const response = await fetch(`${pagBankApiBaseUrl()}${path}`, {
    ...init,
    redirect: 'error',
    signal: AbortSignal.timeout(15_000),
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });
  const body = record(await response.json().catch(() => ({})));
  if (!response.ok)
    throw new Error(
      'O PagBank não permitiu consultar ou processar este pagamento. Tente novamente.',
    );
  return body;
}

export async function createPagBankCheckout(input: {
  restaurantId: number;
  reference: string;
  amountCents: number;
  title: string;
  redirectUrl: string;
  notificationUrl: string;
  expiresAt?: Date | null;
}) {
  const body = await request(input.restaurantId, '/checkouts', {
    method: 'POST',
    headers: { 'x-idempotency-key': input.reference },
    body: JSON.stringify({
      reference_id: input.reference,
      customer_modifiable: true,
      items: [
        {
          reference_id: input.reference,
          name: input.title,
          quantity: 1,
          unit_amount: input.amountCents,
        },
      ],
      payment_methods: [{ type: 'CREDIT_CARD' }],
      payment_methods_configs: [
        { type: 'CREDIT_CARD', config_options: [{ option: 'INSTALLMENTS_LIMIT', value: '1' }] },
      ],
      redirect_url: input.redirectUrl,
      return_url: input.redirectUrl,
      ...(input.expiresAt ? { expiration_date: input.expiresAt.toISOString() } : {}),
      ...(input.notificationUrl
        ? {
            notification_urls: [input.notificationUrl],
            payment_notification_urls: [input.notificationUrl],
          }
        : {}),
    }),
  });
  const id = String(body.id || '');
  const payLink = (Array.isArray(body.links) ? body.links : []).find(
    (link: RecordValue) => link.rel === 'PAY',
  );
  let url: URL;
  try {
    url = new URL(String(payLink?.href || ''));
  } catch {
    throw new Error('O PagBank não retornou um endereço válido de checkout.');
  }
  const officialHost = [
    'pagamento.pagbank.com.br',
    'pagamento.pagseguro.uol.com.br',
    'sandbox.pagamento.pagbank.com.br',
    'sandbox.pagamento.pagseguro.uol.com.br',
  ].includes(url.hostname);
  if (
    !/^CHEC_[\w-]+$/.test(id) ||
    !officialHost ||
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    body.reference_id !== input.reference
  ) {
    throw new Error('O checkout retornado pelo PagBank não corresponde ao pedido.');
  }
  return { id, checkoutUrl: url.toString() };
}

export type PagBankCardEvidence = {
  status: 'PAID' | 'PENDING' | 'EXPIRED' | 'REFUNDED';
  chargeId: string | null;
};

export async function getPagBankCardChargePayment(input: {
  restaurantId: number;
  chargeId: string;
  amountCents: number;
  reference?: string;
  hostedCheckout?: boolean;
}): Promise<PagBankCardEvidence> {
  if (!/^CHAR_[\w-]+$/.test(input.chargeId))
    throw new Error('Referência de cobrança PagBank inválida.');
  const charge = await request(
    input.restaurantId,
    `/charges/${encodeURIComponent(input.chargeId)}`,
  );
  if (charge.id !== input.chargeId)
    throw new Error('A cobrança PagBank não pertence ao pagamento salvo.');
  if (input.reference && charge.reference_id !== input.reference)
    throw new Error('A referência da cobrança PagBank não corresponde ao pedido.');
  if (
    charge.amount?.summary?.refunded === input.amountCents &&
    charge.amount?.value === input.amountCents &&
    charge.amount?.currency === 'BRL' &&
    (input.hostedCheckout || charge.payment_method?.type === 'CREDIT_CARD')
  ) {
    return { status: 'REFUNDED', chargeId: input.chargeId };
  }
  const paid = paidCharge([charge], input.amountCents, input.hostedCheckout);
  return paid
    ? { status: 'PAID', chargeId: input.chargeId }
    : { status: 'PENDING', chargeId: null };
}

function paidCharge(
  charges: unknown,
  amountCents: number,
  hostedCheckout = false,
): RecordValue | undefined {
  const paid = (Array.isArray(charges) ? charges : [])
    .map(record)
    .filter((charge) => charge.status === 'PAID');
  if (paid.length === 0) return undefined;
  if (paid.length !== 1)
    throw new Error('O PagBank retornou mais de uma cobrança paga; revisão necessária.');
  const charge = paid[0];
  if (
    !/^CHAR_[\w-]+$/.test(String(charge.id)) ||
    charge.amount?.value !== amountCents ||
    charge.amount?.currency !== 'BRL' ||
    (!hostedCheckout && charge.payment_method?.type !== 'CREDIT_CARD') ||
    Number(charge.amount?.summary?.refunded || 0) !== 0
  ) {
    throw new Error('Os dados financeiros retornados pelo PagBank não correspondem ao pedido.');
  }
  return charge;
}

// A notificação é apenas um aviso. A evidência é consultada com a credencial
// do restaurante e vinculada à referência aleatória do pedido e ao checkout salvo.
export async function getPagBankCheckoutPayment(input: {
  restaurantId: number;
  checkoutId: string;
  reference: string;
  amountCents: number;
  orderId?: string;
}): Promise<PagBankCardEvidence> {
  if (!/^CHEC_[\w-]+$/.test(input.checkoutId))
    throw new Error('Referência de checkout PagBank inválida.');
  const checkout = await request(
    input.restaurantId,
    `/checkouts/${encodeURIComponent(input.checkoutId)}`,
  );
  if (checkout.id !== input.checkoutId || checkout.reference_id !== input.reference)
    throw new Error('O checkout PagBank não pertence a este pedido.');
  // GET checkout comprova apenas identidade/estado do checkout. A evidência
  // financeira vem do pedido informado na notificação e consultado na API Orders.
  const orders: RecordValue[] = [];
  if (input.orderId) {
    if (!/^ORDE_[\w-]+$/.test(input.orderId))
      throw new Error('Referência de pagamento PagBank inválida.');
    const paymentOrder = await request(
      input.restaurantId,
      `/orders/${encodeURIComponent(input.orderId)}`,
    );
    if (paymentOrder.id !== input.orderId || paymentOrder.reference_id !== input.reference)
      throw new Error('O pagamento PagBank não pertence a este pedido.');
    orders.unshift(paymentOrder);
  }
  const verifiedIds = new Set<string>();
  const charges: RecordValue[] = [];
  for (const order of orders) {
    if (order.reference_id !== input.reference) continue;
    for (const charge of (Array.isArray(order.charges) ? order.charges : []).map(record)) {
      if (verifiedIds.has(String(charge.id))) continue;
      verifiedIds.add(String(charge.id));
      charges.push(charge);
    }
  }
  // O checkout hospedado sempre oferece "Pagar com PagBank" além do cartão.
  // A confirmação depende da cobrança capturada vinculada, não do meio usado na carteira.
  const charge = paidCharge(charges, input.amountCents, true);
  if (charge) return { status: 'PAID', chargeId: String(charge.id) };
  const refunded = charges.find(
    (candidate) =>
      /^CHAR_[\w-]+$/.test(String(candidate.id)) &&
      candidate.amount?.value === input.amountCents &&
      candidate.amount?.currency === 'BRL' &&
      candidate.amount?.summary?.refunded === input.amountCents,
  );
  return refunded
    ? { status: 'REFUNDED', chargeId: String(refunded.id) }
    : { status: checkout.status === 'EXPIRED' ? 'EXPIRED' : 'PENDING', chargeId: null };
}

export async function refundPagBankCardCharge(input: {
  restaurantId: number;
  chargeId: string;
  amountCents: number;
  reference: string;
  idempotencyKey?: string | null;
  hostedCheckout?: boolean;
}) {
  if (!/^CHAR_[\w-]+$/.test(input.chargeId))
    throw new Error('Referência da cobrança PagBank inválida.');
  const path = `/charges/${encodeURIComponent(input.chargeId)}`;
  const charge = await request(input.restaurantId, path);
  if (
    charge.id !== input.chargeId ||
    charge.amount?.value !== input.amountCents ||
    charge.amount?.currency !== 'BRL' ||
    (!input.hostedCheckout && charge.payment_method?.type !== 'CREDIT_CARD')
  )
    throw new Error('A cobrança PagBank não corresponde ao pagamento do pedido.');
  // O checkout gera a referência da charge; o ID salvo após confirmação é o vínculo.
  if (charge.amount?.summary?.refunded === input.amountCents) return input.chargeId;
  if (charge.status !== 'PAID')
    throw new Error('A cobrança PagBank não está disponível para estorno.');
  const refunded = await request(input.restaurantId, `${path}/cancel`, {
    method: 'POST',
    headers: { 'x-idempotency-key': input.idempotencyKey || `refund-${input.reference}` },
    body: JSON.stringify({ amount: { value: input.amountCents } }),
  });
  if (refunded.id !== input.chargeId || refunded.amount?.summary?.refunded !== input.amountCents)
    throw new Error('O PagBank ainda não confirmou a devolução integral do cartão.');
  return input.chargeId;
}

export async function mutatePagBankCheckoutPayment(
  input: {
    restaurantId: number;
    checkoutId: string;
    reference: string;
    amountCents: number;
    idempotencyKey: string;
  },
  operation: 'cancel' | 'refund',
): Promise<PagBankCardEvidence | { status: 'CANCELED'; chargeId: null }> {
  const before = await getPagBankCheckoutPayment(input);
  if (before.status === 'REFUNDED' || before.status === 'EXPIRED') return before;
  if (operation === 'refund') {
    if (before.status !== 'PAID' || !before.chargeId)
      throw new Error('O PagBank ainda não confirmou uma cobrança paga para estornar.');
    await refundPagBankCardCharge({ ...input, chargeId: before.chargeId, hostedCheckout: true });
    return { status: 'REFUNDED', chargeId: before.chargeId };
  }
  if (before.status === 'PAID') return before;
  await request(
    input.restaurantId,
    `/checkouts/${encodeURIComponent(input.checkoutId)}/inactivate`,
    { method: 'POST', headers: { 'x-idempotency-key': input.idempotencyKey } },
  );
  const checkout = await request(
    input.restaurantId,
    `/checkouts/${encodeURIComponent(input.checkoutId)}`,
  );
  if (
    checkout.id !== input.checkoutId ||
    checkout.reference_id !== input.reference ||
    checkout.status !== 'INACTIVE'
  )
    throw new Error('O PagBank não confirmou a inativação deste checkout.');
  // A consulta confirma apenas o estado do checkout. Uma cobrança concluída
  // durante a inativação será verificada via Orders no webhook; o processador
  // canônico trata a aprovação tardia sem reabrir a intenção cancelada.
  const after = await getPagBankCheckoutPayment(input);
  return after.status === 'PENDING' || after.status === 'EXPIRED'
    ? { status: 'CANCELED', chargeId: null }
    : after;
}
