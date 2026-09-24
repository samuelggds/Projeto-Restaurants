import { MercadoPagoConfig, Payment } from 'mercadopago';
import { parseProviderPaymentId, normalizeTxid } from './pixPayload.js';
import productRepository from '../../products/repositories/ProductRepository.js';
import restaurantSettingsRepository from '../../restaurantSettings/repositories/RestaurantSettingsRepository.js';
import { assertRestaurantIsOpenForOrders } from '../utils/restaurantAvailability.js';
import {
  PIX_PROVIDERS,
  type PixProvider,
  normalizePixProvider,
} from '../../payments/providers/providerCatalog.js';
import { mercadoPagoOrderNotificationFields } from '../../payments/providers/mercadoPagoOrderNotification.js';
import {
  getRestaurantPagarmeCredentials,
  pagarmeJson,
  safePagarmeError,
} from '../../payments/providers/pagarmeV5.js';
import { buildOrderItemCustomizationSnapshot } from '../utils/productIngredients.js';
import { withTenantDbContext } from '../../../database/tenantDbContext.js';
import orderRepository from '../repositories/OrderRepository.js';
import { getMercadoPagoAccessToken } from '../../restaurantSettings/services/RestaurantPaymentCredentialsService.js';

const APPROVED_PAYMENT_STATUSES = new Set(['approved', 'accredited', 'paid']);
const APPROVED_ASAAS_PAYMENT_STATUSES = new Set(['received', 'confirmed', 'received_in_cash']);

type OrderItemInput = {
  productId: number;
  quantity: number;
  observation?: string;
  ingredientIds?: number[];
  optionIds?: number[];
  selectedOptions?: Array<{ groupId: number; optionIds: number[] }>;
};

type CreatePixPayload = {
  restaurantId: number | string;
  type: string;
  paymentMethod: string;
  pixProvider?: string;
  items: OrderItemInput[];
  address?: string;
  number?: string;
  district?: string;
  city?: string;
  state?: string;
  customerName?: string;
  customerCpf?: string;
  customerPhone?: string;
  userEmail?: string | null;
  orderId?: number | string;
  orderTotal?: number;
  orderSubtotal?: number;
  orderDeliveryFee?: number;
  expiresAt?: Date | string | null;
  /** Supplied only by a persisted, immutable payment attempt. */
  idempotencyKey?: string;
  resumeOnly?: boolean;
};

type PaymentStatusPayload = {
  paymentId: string;
  restaurantId?: number | string;
};

type PixPaymentCreationResult = {
  paymentId: string;
  status: string;
  provider: PixProvider;
  totalAmount: number;
  qrCode: string;
  qrCodeBase64: string | null;
  requiresStatusCheck: boolean;
  expiresAt?: string | null;
};

type PaymentApprovalPayload = PaymentStatusPayload & {
  expectedOrderId?: number | string;
  expectedAmount?: number | string;
  expectedCurrency?: string;
};

type PixPaymentPayload = {
  id?: string | number;
  status?: string;
  external_reference?: string;
  transaction_amount?: number;
  currency_id?: string;
  point_of_interaction?: {
    transaction_data?: {
      qr_code?: string;
      qr_code_base64?: string;
    };
  };
  metadata?: {
    restaurant_id?: string;
  };
};

type AsaasErrorItem = {
  code?: string;
  description?: string;
};

type AsaasCustomerPayload = {
  id?: string;
  errors?: AsaasErrorItem[];
};

type AsaasPaymentPayload = {
  id?: string;
  status?: string;
  externalReference?: string;
  value?: number;
  currency?: string;
  errors?: AsaasErrorItem[];
};

type AsaasPixQrCodePayload = {
  payload?: string;
  encodedImage?: string;
  errors?: AsaasErrorItem[];
};

type PagarmeChargePayload = {
  id?: string;
  amount?: number;
  paid_amount?: number;
  status?: string;
  currency?: string;
  payment_method?: string;
  order?: {
    code?: string;
    metadata?: Record<string, unknown>;
  };
  last_transaction?: {
    id?: string;
    status?: string;
    amount?: number;
    qr_code?: string;
    qr_code_url?: string;
    expires_at?: string;
  };
};

type PagarmeOrderPayload = {
  id?: string;
  code?: string;
  amount?: number;
  currency?: string;
  status?: string;
  charges?: PagarmeChargePayload[];
  message?: string;
};

function normalizeReferenceToken(value: string | number | null | undefined) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function doesProofContainTransactionId(paymentProof: string, transactionId: string) {
  const normalizedProof = normalizeReferenceToken(paymentProof);
  const normalizedTransactionId = normalizeReferenceToken(transactionId);

  if (!normalizedProof || !normalizedTransactionId) {
    return false;
  }

  return normalizedProof.includes(normalizedTransactionId);
}

function toCurrencyCents(value: unknown) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return Math.round((amount + Number.EPSILON) * 100);
}

type ParsedManualPixPaymentId = {
  provider: PixProvider;
  restaurantId: number;
  createdAt: Date;
  transactionId: string;
};

class OrderPixPaymentService {
  getAsaasBaseUrl() {
    return String(process.env.ASAAS_API_BASE_URL || 'https://api.asaas.com')
      .trim()
      .replace(/\/+$/, '');
  }

  async getAsaasAccessToken(restaurantId: number) {
    const allowGlobalFallback = process.env.ALLOW_GLOBAL_PAYMENT_FALLBACK === 'true';
    const settings = await restaurantSettingsRepository.findByRestaurantId(restaurantId);
    const settingsToken = String(settings?.asaasAccessToken || '').trim();
    const globalToken = String(process.env.ASAAS_API_KEY || '').trim();
    const accessToken = settingsToken || (allowGlobalFallback ? globalToken : '');

    if (!accessToken) {
      throw new Error(
        'Pagamento PIX Asaas indisponivel. Configure token Asaas nas configuracoes do restaurante.',
      );
    }

    return accessToken;
  }

  getAsaasError(payload: { errors?: AsaasErrorItem[] }, fallbackMessage: string) {
    if (!Array.isArray(payload?.errors) || payload.errors.length === 0) {
      return fallbackMessage;
    }

    const message = String(payload.errors[0]?.description || '').trim();
    return message || fallbackMessage;
  }

  normalizeAsaasStatus(value: unknown) {
    return String(value || '')
      .trim()
      .toLowerCase();
  }

  normalizeAsaasPaymentId(paymentId: string) {
    const normalized = String(paymentId || '').trim();
    if (!normalized) {
      return '';
    }

    if (normalized.toLowerCase().startsWith('asaas:')) {
      return normalized;
    }

    return `asaas:${normalized}`;
  }

  async fetchAsaasJson<T>(
    url: string,
    accessToken: string,
    {
      method = 'GET',
      body,
    }: {
      method?: 'GET' | 'POST' | 'DELETE';
      body?: unknown;
    } = {},
  ) {
    const response = await fetch(url, {
      method,
      signal: AbortSignal.timeout(15_000),
      redirect: 'error',
      headers: {
        'Content-Type': 'application/json',
        access_token: accessToken,
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });

    const responseBody = (await response.json()) as T;

    return {
      ok: response.ok,
      responseBody,
    };
  }

  parseManualPaymentId(paymentId: string): ParsedManualPixPaymentId {
    const normalizedPaymentId = String(paymentId || '').trim();
    const [
      prefix = '',
      provider = '',
      restaurant = '',
      createdAtMs = '',
      transactionIdFromId = '',
    ] = normalizedPaymentId.split(':');

    if (prefix !== 'manual') {
      throw new Error('Pagamento PIX manual inválido.');
    }

    const restaurantId = Number(restaurant || 0);
    const createdAtTimestamp = Number(createdAtMs || 0);
    const createdAt = new Date(createdAtTimestamp);
    const fallbackTransactionId = normalizeTxid(`${provider}${restaurantId}${createdAtTimestamp}`);
    const transactionId = normalizeTxid(transactionIdFromId || fallbackTransactionId);

    if (
      !Number.isInteger(restaurantId) ||
      restaurantId <= 0 ||
      !Number.isFinite(createdAtTimestamp) ||
      Number.isNaN(createdAt.getTime()) ||
      !transactionId
    ) {
      throw new Error('Pagamento PIX manual inválido.');
    }

    return {
      provider: this.normalizePixProvider(provider),
      restaurantId,
      createdAt,
      transactionId,
    };
  }

  ensureManualPaymentConfirmationAllowed({
    paymentId,
    paymentProof,
  }: {
    paymentId: string;
    paymentProof: string;
  }) {
    const parsed = this.parseManualPaymentId(paymentId);
    const normalizedProof = String(paymentProof || '').trim();
    if (normalizedProof.length < 6) {
      throw new Error(
        'Informe no comprovante o código/ID da transação PIX para confirmar este pagamento.',
      );
    }

    if (!doesProofContainTransactionId(normalizedProof, parsed.transactionId)) {
      throw new Error(
        'Comprovante PIX inválido: o ID da transação não corresponde ao pagamento deste pedido.',
      );
    }
  }

  async getMercadoPagoPaymentApi(restaurantId?: number) {
    const normalizedRestaurantId = Number(restaurantId || 0);
    const allowGlobalFallback = process.env.ALLOW_GLOBAL_PAYMENT_FALLBACK === 'true';
    const settings =
      Number.isInteger(normalizedRestaurantId) && normalizedRestaurantId > 0
        ? await restaurantSettingsRepository.findByRestaurantId(normalizedRestaurantId)
        : null;
    const settingsToken = String(settings?.mercadoPagoAccessToken || '').trim();
    const globalToken = String(process.env.MP_ACCESS_TOKEN || '').trim();
    const accessToken = settingsToken
      ? await getMercadoPagoAccessToken(normalizedRestaurantId)
      : allowGlobalFallback
        ? globalToken
        : '';

    if (!accessToken) {
      throw new Error(
        'Pagamento PIX indisponivel no momento. Configure access token Mercado Pago nas configuracoes do restaurante.',
      );
    }

    const client = new MercadoPagoConfig({ accessToken });
    return new Payment(client);
  }

  normalizeCpf(value: string | number | null | undefined) {
    const digits = String(value || '').replace(/\D/g, '');
    return digits.length === 11 ? digits : null;
  }

  normalizeEmail(email: string | null | undefined, restaurantId: number) {
    const trimmed = String(email || '').trim();

    if (trimmed && trimmed.includes('@')) {
      return trimmed;
    }

    return `guest.pix.${restaurantId}.${Date.now()}@gastronexa.local`;
  }

  normalizePaymentStatus(status: unknown) {
    return String(status || '')
      .trim()
      .toLowerCase();
  }

  normalizePixProvider(value: unknown): PixProvider {
    return normalizePixProvider(value);
  }

  async calculateOrderSubtotal({
    restaurantId,
    items,
  }: {
    restaurantId: number;
    items: OrderItemInput[];
  }) {
    const products = await withTenantDbContext(restaurantId, (db) =>
      Promise.all(
        items.map((item) => productRepository.findById(item.productId, restaurantId, db)),
      ),
    );

    products.forEach((product, index) => {
      if (!product) {
        throw new Error(`Produto não encontrado: ${items[index].productId}`);
      }
    });

    return items.reduce((acc, item, index) => {
      const product = products[index];
      const quantity = Number(item.quantity);

      if (!Number.isInteger(quantity) || quantity <= 0) {
        throw new Error(`Quantidade inválida para ${product.name}.`);
      }

      const snapshot = buildOrderItemCustomizationSnapshot(product, item);
      return acc + Number(snapshot.price) * quantity;
    }, 0);
  }

  async createPixPayment({
    restaurantId,
    type,
    paymentMethod,
    pixProvider,
    items,
    address,
    number,
    district,
    city,
    state,
    customerName,
    customerCpf,
    customerPhone,
    userEmail,
    orderId: sourceOrderId,
    orderTotal,
    orderSubtotal,
    orderDeliveryFee,
    expiresAt,
    idempotencyKey,
    resumeOnly = false,
  }: CreatePixPayload): Promise<PixPaymentCreationResult> {
    const normalizedRestaurantId = Number(restaurantId);
    const normalizedType = String(type || '').toUpperCase();
    const normalizedPaymentMethod = String(paymentMethod || '').toUpperCase();

    if (!Number.isInteger(normalizedRestaurantId) || normalizedRestaurantId <= 0) {
      throw new Error('Restaurante inválido para gerar PIX.');
    }

    const allowsPixType =
      normalizedType === 'DELIVERY' || normalizedType === 'MESA' || normalizedType === 'RETIRADA';

    if (!allowsPixType || normalizedPaymentMethod !== 'PIX') {
      throw new Error(
        'A geracao de PIX e permitida para pedidos DELIVERY, MESA ou RETIRADA com pagamento PIX.',
      );
    }

    if (normalizedType === 'DELIVERY') {
      const requiredAddressFields = [address, number, district, city, state]
        .map((value) => String(value || '').trim())
        .filter(Boolean);

      if (requiredAddressFields.length < 5) {
        throw new Error('Informe o endereco completo para pedidos de delivery.');
      }
    }

    const settings =
      await restaurantSettingsRepository.findPublicByRestaurantId(normalizedRestaurantId);

    assertRestaurantIsOpenForOrders(settings?.isOpenForOrders, settings?.businessHours);

    if (settings?.acceptsPix === false) {
      throw new Error('O restaurante não está aceitando pagamentos por PIX no momento.');
    }
    if (normalizedType === 'DELIVERY' && settings?.acceptsDelivery === false) {
      throw new Error('O restaurante não está aceitando pedidos para delivery no momento.');
    }
    if (normalizedType === 'RETIRADA' && settings?.acceptsPickup === false) {
      throw new Error('O restaurante não está aceitando pedidos para retirada no momento.');
    }
    if (normalizedType === 'MESA' && settings?.tableOrderingEnabled === false) {
      throw new Error('Os pedidos pelo cardápio de mesa estão desativados no momento.');
    }

    void pixProvider;
    const resolvedPixProvider = this.normalizePixProvider(settings?.pixProvider);
    if (resolvedPixProvider === PIX_PROVIDERS.PAGARME) {
      if (!sourceOrderId) {
        throw new Error('Pedido obrigatório para gerar Pix no Pagar.me.');
      }
      if (!cpf) {
        throw new Error('Informe um CPF válido para pagar via Pix no Pagar.me.');
      }

      const rawPhone = String(customerPhone || '').replace(/\D/g, '');
      const nationalPhone = rawPhone.startsWith('55') && rawPhone.length >= 12 ? rawPhone.slice(2) : rawPhone;
      if (!/^\d{10,11}$/.test(nationalPhone)) {
        throw new Error('Informe um telefone válido para pagar via Pix no Pagar.me.');
      }

      const { secretKey } = await getRestaurantPagarmeCredentials(normalizedRestaurantId);
      const reference = `orderpix:${normalizedRestaurantId}:${sourceOrderId}`;
      const expiresIn = requestedExpiresAt
        ? Math.max(60, Math.floor((requestedExpiresAt.getTime() - Date.now()) / 1000))
        : 900;
      const areaCode = nationalPhone.slice(0, 2);
      const phoneNumber = nationalPhone.slice(2);

      const result = await pagarmeJson<PagarmeOrderPayload>(secretKey, '/orders', {
        method: 'POST',
        body: JSON.stringify({
          code: reference,
          items: [
            {
              amount: Math.round(totalAmount * 100),
              description: `Pedido #${sourceOrderId}`,
              quantity: 1,
              code: String(sourceOrderId),
            },
          ],
          customer: {
            name: payerName || 'Cliente',
            email: payerEmail,
            type: 'individual',
            document: cpf,
            phones: {
              mobile_phone: {
                country_code: '55',
                area_code: areaCode,
                number: phoneNumber,
              },
            },
          },
          payments: [
            {
              payment_method: 'pix',
              pix: {
                expires_in: expiresIn,
                additional_information: [
                  { name: 'Pedido', value: String(sourceOrderId) },
                ],
              },
            },
          ],
          closed: true,
          metadata: {
            restaurant_id: String(normalizedRestaurantId),
            order_id: String(sourceOrderId),
          },
        }),
      });

      const charge = Array.isArray(result.body?.charges) ? result.body.charges[0] : undefined;
      const chargeId = String(charge?.id || '').trim();
      const transaction = charge?.last_transaction;
      const qrCode = String(transaction?.qr_code || '').trim();
      if (!result.response.ok || !chargeId || !qrCode) {
        throw new Error(
          safePagarmeError(result.body, 'Não foi possível gerar o Pix no Pagar.me.'),
        );
      }

      return {
        paymentId: `pagarme:${chargeId}`,
        status: String(transaction?.status || charge?.status || 'waiting_payment'),
        provider: PIX_PROVIDERS.PAGARME,
        totalAmount,
        qrCode,
        qrCodeBase64: null,
        requiresStatusCheck: true,
        expiresAt: String(transaction?.expires_at || expiresAtIso || '') || null,
      };
    }

    if (
      idempotencyKey &&
      pixProvider &&
      this.normalizePixProvider(pixProvider) !== resolvedPixProvider
    ) {
      throw new Error('O provedor PIX mudou. Concilie a tentativa anterior antes de continuar.');
    }
    const minimumOrder = Number(settings?.minimumOrder || 0);
    const deliveryFee = Number(settings?.deliveryFee || 0);
    const freeShippingMinimum = Number(settings?.freeShippingMinimum || 0);

    const persistedTotal = Number(orderTotal);
    const hasPersistedTotal = Number.isFinite(persistedTotal) && persistedTotal >= 0;
    const persistedSubtotal = Number(orderSubtotal);
    const persistedDeliveryFee = Number(orderDeliveryFee);
    const subtotal = hasPersistedTotal
      ? Number.isFinite(persistedSubtotal) && persistedSubtotal >= 0
        ? persistedSubtotal
        : Math.max(
            persistedTotal -
              (Number.isFinite(persistedDeliveryFee)
                ? persistedDeliveryFee
                : normalizedType === 'DELIVERY'
                  ? Math.max(deliveryFee, 0)
                  : 0),
            0,
          )
      : await this.calculateOrderSubtotal({
          restaurantId: normalizedRestaurantId,
          items,
        });

    if (
      !hasPersistedTotal &&
      normalizedType === 'DELIVERY' &&
      minimumOrder > 0 &&
      subtotal < minimumOrder
    ) {
      throw new Error(
        `Pedido mínimo sobre o subtotal para delivery: R$ ${minimumOrder.toFixed(2)}. A taxa de entrega é cobrada à parte.`,
      );
    }

    const additionalFee = hasPersistedTotal
      ? Math.max(Number.isFinite(persistedDeliveryFee) ? persistedDeliveryFee : 0, 0)
      : normalizedType === 'DELIVERY'
        ? freeShippingMinimum > 0 && subtotal >= freeShippingMinimum
          ? 0
          : Math.max(deliveryFee, 0)
        : 0;
    const totalAmount = Number(
      (hasPersistedTotal ? persistedTotal : subtotal + additionalFee).toFixed(2),
    );

    if (totalAmount <= 0) {
      throw new Error('Total do pedido inválido para gerar cobrança PIX.');
    }

    const requestedExpiresAt = expiresAt ? new Date(expiresAt) : null;
    if (requestedExpiresAt && Number.isNaN(requestedExpiresAt.getTime())) {
      throw new Error('Expiração PIX inválida.');
    }
    if (requestedExpiresAt && requestedExpiresAt.getTime() <= Date.now()) {
      throw new Error('A expiração PIX precisa estar no futuro.');
    }
    const expiresAtIso = requestedExpiresAt?.toISOString() || null;

    const payerEmail = this.normalizeEmail(
      userEmail ||
        (sourceOrderId
          ? `guest.pix.${normalizedRestaurantId}.${sourceOrderId}@gastronexa.local`
          : null),
      normalizedRestaurantId,
    );
    const payerName = String(customerName || 'Cliente').trim();
    const cpf = this.normalizeCpf(customerCpf);
    if (resolvedPixProvider === PIX_PROVIDERS.ASAAS) {
      const accessToken = await this.getAsaasAccessToken(normalizedRestaurantId);
      const asaasBaseUrl = this.getAsaasBaseUrl();
      if (resumeOnly) {
        if (!sourceOrderId) throw new Error('Pedido obrigatório para conciliar PIX.');
        const reference = `orderpix:${normalizedRestaurantId}:${sourceOrderId}`;
        // Asaas externalReference is a search filter, not an idempotency guarantee.
        // An empty search after a timeout must never authorize a second POST.
        const found = await this.fetchAsaasJson<{
          data?: AsaasPaymentPayload[];
          hasMore?: boolean;
        }>(
          `${asaasBaseUrl}/v3/payments?externalReference=${encodeURIComponent(reference)}&limit=2`,
          accessToken,
        );
        const matches = found.responseBody?.data || [];
        const payment = matches[0];
        if (
          !found.ok ||
          found.responseBody?.hasMore ||
          matches.length !== 1 ||
          payment?.externalReference !== reference ||
          Math.round(Number(payment?.value) * 100) !== Math.round(totalAmount * 100)
        ) {
          throw new Error(
            'A cobrança PIX anterior ainda precisa de conciliação no Asaas. Nenhuma nova cobrança foi criada.',
          );
        }
        const paymentId = String(payment.id || '').trim();
        if (!paymentId) throw new Error('Cobrança Asaas sem identificador.');
        const qr = await this.fetchAsaasJson<AsaasPixQrCodePayload>(
          `${asaasBaseUrl}/v3/payments/${encodeURIComponent(paymentId)}/pixQrCode`,
          accessToken,
        );
        if (!qr.ok || !qr.responseBody?.payload)
          throw new Error('O QR Code da cobrança existente ainda não está disponível.');
        return {
          paymentId: this.normalizeAsaasPaymentId(paymentId),
          status: String(payment.status || 'PENDING'),
          provider: resolvedPixProvider,
          totalAmount,
          qrCode: String(qr.responseBody.payload),
          qrCodeBase64: qr.responseBody.encodedImage || null,
          requiresStatusCheck: true,
          expiresAt: expiresAtIso,
        };
      }
      const customerResult = await this.fetchAsaasJson<AsaasCustomerPayload>(
        `${asaasBaseUrl}/v3/customers`,
        accessToken,
        {
          method: 'POST',
          body: {
            name: payerName || 'Cliente',
            email: payerEmail,
            ...(cpf ? { cpfCnpj: cpf } : {}),
            ...(customerPhone ? { mobilePhone: String(customerPhone).replace(/\D/g, '') } : {}),
          },
        },
      );

      if (!customerResult.ok || !String(customerResult.responseBody?.id || '').trim()) {
        throw new Error(
          this.getAsaasError(
            customerResult.responseBody,
            'Nao foi possivel criar/identificar cliente para pagamento PIX no Asaas.',
          ),
        );
      }

      const customerId = String(customerResult.responseBody.id || '').trim();

      const paymentResult = await this.fetchAsaasJson<AsaasPaymentPayload>(
        `${asaasBaseUrl}/v3/payments`,
        accessToken,
        {
          method: 'POST',
          body: {
            customer: customerId,
            billingType: 'PIX',
            value: totalAmount,
            dueDate: new Date().toISOString().slice(0, 10),
            description: `Pedido delivery restaurante ${normalizedRestaurantId}`,
            externalReference: sourceOrderId
              ? `orderpix:${normalizedRestaurantId}:${sourceOrderId}`
              : `orderpix:${normalizedRestaurantId}:${Date.now()}`,
          },
        },
      );

      if (!paymentResult.ok) {
        throw new Error(
          this.getAsaasError(
            paymentResult.responseBody,
            'Nao foi possivel gerar cobranca PIX no Asaas.',
          ),
        );
      }

      const asaasPaymentId = String(paymentResult.responseBody?.id || '').trim();
      if (!asaasPaymentId) {
        throw new Error('Asaas nao retornou id do pagamento PIX.');
      }

      const qrResult = await this.fetchAsaasJson<AsaasPixQrCodePayload>(
        `${asaasBaseUrl}/v3/payments/${encodeURIComponent(asaasPaymentId)}/pixQrCode`,
        accessToken,
      );

      if (!qrResult.ok) {
        throw new Error(
          this.getAsaasError(qrResult.responseBody, 'Nao foi possivel gerar QR Code PIX no Asaas.'),
        );
      }

      const qrCode = String(qrResult.responseBody?.payload || '').trim();
      const qrCodeBase64 = String(qrResult.responseBody?.encodedImage || '').trim();

      if (!qrCode) {
        throw new Error('Asaas nao retornou payload PIX para pagamento.');
      }

      return {
        paymentId: this.normalizeAsaasPaymentId(asaasPaymentId),
        status: String(paymentResult.responseBody?.status || 'PENDING'),
        provider: resolvedPixProvider,
        totalAmount,
        qrCode,
        qrCodeBase64: qrCodeBase64 || null,
        requiresStatusCheck: true,
        expiresAt: expiresAtIso,
      };
    }

    if (resolvedPixProvider !== PIX_PROVIDERS.MERCADO_PAGO) {
      throw new Error(
        'Este provedor PIX ainda nao possui confirmacao automatica. Selecione Mercado Pago ou Asaas.',
      );
    }

    const paymentApi = await this.getMercadoPagoPaymentApi(normalizedRestaurantId);

    const baseBody = {
      transaction_amount: totalAmount,
      description: `Pedido delivery restaurante ${normalizedRestaurantId}`,
      payment_method_id: 'pix',
      payer: {
        email: payerEmail,
        first_name: payerName || 'Cliente',
        ...(cpf
          ? {
              identification: {
                type: 'CPF',
                number: cpf,
              },
            }
          : {}),
      },
      metadata: {
        restaurant_id: String(normalizedRestaurantId),
        source: 'order_checkout',
        provider: resolvedPixProvider,
      },
      ...mercadoPagoOrderNotificationFields(normalizedRestaurantId),
      external_reference: sourceOrderId
        ? `orderpix:${normalizedRestaurantId}:${sourceOrderId}`
        : `orderpix:${normalizedRestaurantId}:${Date.now()}`,
      ...(expiresAtIso ? { date_of_expiration: expiresAtIso } : {}),
    };

    const response = await paymentApi.create({
      ...(idempotencyKey ? { requestOptions: { idempotencyKey } } : {}),
      body: baseBody,
    });

    const payment =
      typeof response === 'object' && response !== null
        ? ((response as { body?: unknown }).body ?? response)
        : {};
    const paymentData = payment as PixPaymentPayload;
    const transactionData = paymentData?.point_of_interaction?.transaction_data || {};
    const qrCode = String(transactionData?.qr_code || '').trim();
    const qrCodeBase64 = String(transactionData?.qr_code_base64 || '').trim();

    if (!paymentData?.id || !qrCode) {
      throw new Error('Não foi possível gerar o QR Code PIX no momento.');
    }

    return {
      paymentId: String(paymentData.id),
      status: String(paymentData.status || 'pending'),
      provider: resolvedPixProvider,
      totalAmount,
      qrCode,
      qrCodeBase64: qrCodeBase64 || null,
      requiresStatusCheck: true,
      expiresAt: expiresAtIso,
    };
  }

  async recoverExistingPixPayment({
    paymentId,
    restaurantId,
  }: PaymentStatusPayload) {
    const normalizedPaymentId = String(paymentId || '').trim();
    if (!normalizedPaymentId) {
      throw new Error('Pagamento PIX inválido.');
    }

    if (normalizedPaymentId.startsWith('manual:')) {
      throw new Error('Pagamento PIX manual nao e permitido.');
    }

    const parsedPaymentId = parseProviderPaymentId(normalizedPaymentId);
    const normalizedRestaurantId = Number(restaurantId || 0);
    if (!Number.isInteger(normalizedRestaurantId) || normalizedRestaurantId <= 0) {
      throw new Error('Restaurante inválido para recuperar pagamento PIX.');
    }

    if (parsedPaymentId.provider === PIX_PROVIDERS.ASAAS) {
      const accessToken = await this.getAsaasAccessToken(normalizedRestaurantId);
      const asaasBaseUrl = this.getAsaasBaseUrl();
      const paymentResult = await this.fetchAsaasJson<AsaasPaymentPayload>(
        `${asaasBaseUrl}/v3/payments/${encodeURIComponent(parsedPaymentId.rawPaymentId)}`,
        accessToken,
      );
      if (!paymentResult.ok) {
        throw new Error(
          this.getAsaasError(
            paymentResult.responseBody,
            'Nao foi possivel recuperar pagamento PIX Asaas.',
          ),
        );
      }
      const qrResult = await this.fetchAsaasJson<AsaasPixQrCodePayload>(
        `${asaasBaseUrl}/v3/payments/${encodeURIComponent(parsedPaymentId.rawPaymentId)}/pixQrCode`,
        accessToken,
      );
      if (!qrResult.ok || !String(qrResult.responseBody?.payload || '').trim()) {
        throw new Error('O QR Code desta cobrança PIX ainda não está disponível.');
      }
      const amount = Number(paymentResult.responseBody?.value);
      return {
        paymentId: normalizedPaymentId,
        status: this.normalizeAsaasStatus(paymentResult.responseBody?.status),
        provider: PIX_PROVIDERS.ASAAS,
        isApproved: APPROVED_ASAAS_PAYMENT_STATUSES.has(
          this.normalizeAsaasStatus(paymentResult.responseBody?.status),
        ),
        totalAmount: Number.isFinite(amount) ? amount : 0,
        qrCode: String(qrResult.responseBody?.payload || '').trim(),
        qrCodeBase64: String(qrResult.responseBody?.encodedImage || '').trim() || null,
        requiresStatusCheck: true,
        externalReference: String(paymentResult.responseBody?.externalReference || '').trim(),
      };
    }

    if (parsedPaymentId.provider === PIX_PROVIDERS.PAGARME) {
      const { secretKey } = await getRestaurantPagarmeCredentials(normalizedRestaurantId);
      const result = await pagarmeJson<PagarmeChargePayload>(
        secretKey,
        `/charges/${encodeURIComponent(parsedPaymentId.rawPaymentId)}`,
        { method: 'GET' },
      );
      const transaction = result.body?.last_transaction;
      const qrCode = String(transaction?.qr_code || '').trim();
      if (!result.response.ok || !qrCode) {
        throw new Error('O QR Code desta cobrança Pagar.me não está disponível.');
      }
      const amountCents = Number(result.body?.amount);
      const status = String(transaction?.status || result.body?.status || '')
        .trim()
        .toLowerCase();
      return {
        paymentId: normalizedPaymentId,
        status,
        provider: PIX_PROVIDERS.PAGARME,
        isApproved: status === 'paid',
        totalAmount: Number.isFinite(amountCents) ? amountCents / 100 : 0,
        qrCode,
        qrCodeBase64: null,
        requiresStatusCheck: true,
        externalReference: String(result.body?.order?.code || '').trim(),
      };
    }

    const paymentApi = await this.getMercadoPagoPaymentApi(normalizedRestaurantId);
    const response = (await paymentApi.get({ id: parsedPaymentId.rawPaymentId })) as unknown;
    const payment =
      typeof response === 'object' && response !== null
        ? ((response as { body?: unknown }).body ?? response)
        : {};
    const paymentData = payment as PixPaymentPayload;
    const transactionData = paymentData?.point_of_interaction?.transaction_data || {};
    const qrCode = String(transactionData?.qr_code || '').trim();
    if (!qrCode) throw new Error('O QR Code desta cobrança PIX não está disponível.');
    const amount = Number(paymentData?.transaction_amount);
    return {
      paymentId: normalizedPaymentId,
      status: this.normalizePaymentStatus(paymentData?.status),
      provider: PIX_PROVIDERS.MERCADO_PAGO,
      isApproved: APPROVED_PAYMENT_STATUSES.has(
        this.normalizePaymentStatus(paymentData?.status),
      ),
      totalAmount: Number.isFinite(amount) ? amount : 0,
      qrCode,
      qrCodeBase64: String(transactionData?.qr_code_base64 || '').trim() || null,
      requiresStatusCheck: true,
      externalReference: String(paymentData?.external_reference || '').trim(),
    };
  }

  async expirePendingPixPayment({
    paymentId,
    restaurantId,
  }: PaymentStatusPayload) {
    const normalizedPaymentId = String(paymentId || '').trim();
    const normalizedRestaurantId = Number(restaurantId || 0);
    if (!normalizedPaymentId || !Number.isInteger(normalizedRestaurantId) || normalizedRestaurantId <= 0) {
      throw new Error('Pagamento PIX inválido para expiração.');
    }

    const parsed = parseProviderPaymentId(normalizedPaymentId);
    if (parsed.provider !== PIX_PROVIDERS.ASAAS) {
      return { provider: parsed.provider, canceledAtProvider: false };
    }

    const accessToken = await this.getAsaasAccessToken(normalizedRestaurantId);
    const result = await this.fetchAsaasJson<{ deleted?: boolean; errors?: AsaasErrorItem[] }>(
      `${this.getAsaasBaseUrl()}/v3/payments/${encodeURIComponent(parsed.rawPaymentId)}`,
      accessToken,
      { method: 'DELETE' },
    );

    if (!result.ok) {
      throw new Error(
        this.getAsaasError(
          result.responseBody,
          'Não foi possível expirar a cobrança PIX no Asaas.',
        ),
      );
    }

    return { provider: PIX_PROVIDERS.ASAAS, canceledAtProvider: true };
  }

  async getPaymentStatus({ paymentId, restaurantId }: PaymentStatusPayload) {
    const normalizedPaymentId = String(paymentId || '').trim();
    if (!normalizedPaymentId) {
      throw new Error('Pagamento PIX inválido.');
    }

    if (normalizedPaymentId.startsWith('manual:')) {
      throw new Error('Pagamento PIX manual nao e permitido.');
    }

    const parsedPaymentId = parseProviderPaymentId(normalizedPaymentId);
    const normalizedRestaurantIdNumber = Number(restaurantId || 0);

    if (parsedPaymentId.provider === PIX_PROVIDERS.ASAAS) {
      const effectiveRestaurantId =
        Number.isInteger(normalizedRestaurantIdNumber) && normalizedRestaurantIdNumber > 0
          ? normalizedRestaurantIdNumber
          : 0;

      if (!effectiveRestaurantId) {
        throw new Error('Restaurante inválido para consulta de pagamento PIX Asaas.');
      }

      const accessToken = await this.getAsaasAccessToken(effectiveRestaurantId);
      const asaasBaseUrl = this.getAsaasBaseUrl();
      const statusResult = await this.fetchAsaasJson<AsaasPaymentPayload>(
        `${asaasBaseUrl}/v3/payments/${encodeURIComponent(parsedPaymentId.rawPaymentId)}`,
        accessToken,
      );

      if (!statusResult.ok) {
        throw new Error(
          this.getAsaasError(
            statusResult.responseBody,
            'Nao foi possivel consultar pagamento PIX Asaas.',
          ),
        );
      }

      const status = this.normalizeAsaasStatus(statusResult.responseBody?.status);
      const amount = Number(statusResult.responseBody?.value);

      return {
        paymentId: normalizedPaymentId,
        status,
        provider: PIX_PROVIDERS.ASAAS,
        isApproved: APPROVED_ASAAS_PAYMENT_STATUSES.has(status),
        sameRestaurant: true,
        externalReference: String(statusResult.responseBody?.externalReference || '').trim(),
        amount: Number.isFinite(amount) ? amount : null,
        currency: String(statusResult.responseBody?.currency || 'BRL')
          .trim()
          .toUpperCase(),
        requiresStatusCheck: true,
      };
    }

    if (parsedPaymentId.provider === PIX_PROVIDERS.PAGARME) {
      if (!normalizedRestaurantIdNumber) {
        throw new Error('Restaurante inválido para consultar Pix Pagar.me.');
      }
      const { secretKey } = await getRestaurantPagarmeCredentials(normalizedRestaurantIdNumber);
      const result = await pagarmeJson<PagarmeChargePayload>(
        secretKey,
        `/charges/${encodeURIComponent(parsedPaymentId.rawPaymentId)}`,
        { method: 'GET' },
      );
      if (!result.response.ok) {
        throw new Error('Não foi possível consultar o Pix no Pagar.me.');
      }
      const transactionStatus = String(
        result.body?.last_transaction?.status || result.body?.status || '',
      )
        .trim()
        .toLowerCase();
      const amountInCents = Number(result.body?.amount);
      const metadataRestaurantId = String(
        result.body?.order?.metadata?.restaurant_id || '',
      ).trim();
      const sameRestaurant =
        !metadataRestaurantId || metadataRestaurantId === String(normalizedRestaurantIdNumber);
      return {
        paymentId: normalizedPaymentId,
        status: transactionStatus || 'waiting_payment',
        provider: PIX_PROVIDERS.PAGARME,
        isApproved: transactionStatus === 'paid',
        sameRestaurant,
        externalReference: String(result.body?.order?.code || '').trim(),
        amount: Number.isFinite(amountInCents) ? amountInCents / 100 : null,
        currency: String(result.body?.currency || 'BRL').trim().toUpperCase(),
        requiresStatusCheck: true,
      };
    }

    const paymentApi = await this.getMercadoPagoPaymentApi(
      Number.isInteger(normalizedRestaurantIdNumber) && normalizedRestaurantIdNumber > 0
        ? normalizedRestaurantIdNumber
        : undefined,
    );

    const response = (await paymentApi.get({
      id: parsedPaymentId.rawPaymentId,
    })) as unknown;
    const payment =
      typeof response === 'object' && response !== null
        ? ((response as { body?: unknown }).body ?? response)
        : {};
    const paymentData = payment as PixPaymentPayload;
    const status = this.normalizePaymentStatus(paymentData?.status);
    const amount = Number(paymentData?.transaction_amount);
    const metadataRestaurantId = String(paymentData?.metadata?.restaurant_id || '').trim();
    const normalizedRestaurantId = String(restaurantId || '').trim();

    const sameRestaurant =
      !normalizedRestaurantId ||
      !metadataRestaurantId ||
      metadataRestaurantId === normalizedRestaurantId;

    return {
      paymentId: normalizedPaymentId,
      status,
      provider: PIX_PROVIDERS.MERCADO_PAGO,
      isApproved: APPROVED_PAYMENT_STATUSES.has(status),
      sameRestaurant,
      externalReference: String(paymentData?.external_reference || '').trim(),
      amount: Number.isFinite(amount) ? amount : null,
      currency: String(paymentData?.currency_id || '')
        .trim()
        .toUpperCase(),
      requiresStatusCheck: true,
    };
  }

  async ensurePaymentApproved({
    paymentId,
    restaurantId,
    expectedOrderId,
    expectedAmount,
    expectedCurrency = 'BRL',
  }: PaymentApprovalPayload) {
    const statusResult = await this.getPaymentStatus({
      paymentId,
      restaurantId,
    });

    if (!statusResult.sameRestaurant) {
      throw new Error('Este pagamento PIX não pertence ao restaurante do pedido.');
    }

    if (!statusResult.isApproved) {
      throw new Error('Pagamento PIX ainda não foi aprovado.');
    }

    const normalizedRestaurantId = Number(restaurantId || 0);
    const normalizedOrderId = Number(expectedOrderId || 0);
    const expectedAmountInCents = toCurrencyCents(expectedAmount);
    const actualAmountInCents = toCurrencyCents(statusResult.amount);
    const normalizedExpectedCurrency = String(expectedCurrency || '')
      .trim()
      .toUpperCase();

    if (
      !Number.isInteger(normalizedRestaurantId) ||
      normalizedRestaurantId <= 0 ||
      !Number.isInteger(normalizedOrderId) ||
      normalizedOrderId <= 0 ||
      expectedAmountInCents === null ||
      !normalizedExpectedCurrency
    ) {
      throw new Error('Não foi possível validar o vínculo do pagamento PIX com o pedido.');
    }

    const expectedReference = `orderpix:${normalizedRestaurantId}:${normalizedOrderId}`;
    if (statusResult.externalReference !== expectedReference) {
      throw new Error('Pagamento PIX não corresponde ao pedido informado.');
    }

    if (actualAmountInCents === null || actualAmountInCents !== expectedAmountInCents) {
      throw new Error('O valor do pagamento PIX não corresponde ao total do pedido.');
    }

    if (statusResult.currency !== normalizedExpectedCurrency) {
      throw new Error('A moeda do pagamento PIX não corresponde à moeda do pedido.');
    }

    return statusResult;
  }

  async attachPaymentToOrder({
    orderId,
    restaurantId,
    paymentId,
    expiresAt,
  }: {
    orderId: number | string;
    restaurantId: number;
    paymentId: string;
    expiresAt?: Date | string | null;
  }) {
    const normalizedPaymentId = String(paymentId || '').trim();
    if (!normalizedPaymentId) {
      throw new Error('O provedor não retornou um identificador de pagamento PIX.');
    }

    const normalizedExpiresAt = expiresAt ? new Date(expiresAt) : null;
    if (normalizedExpiresAt && Number.isNaN(normalizedExpiresAt.getTime())) {
      throw new Error('Expiração PIX inválida para vincular ao pedido.');
    }
    await orderRepository.claimPixPaymentId(
      orderId,
      restaurantId,
      normalizedPaymentId,
      undefined,
      normalizedExpiresAt,
    );
  }
}

export default new OrderPixPaymentService();
