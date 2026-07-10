import { MercadoPagoConfig, Payment } from "mercadopago";
import productRepository from "../../products/repositories/ProductRepository.js";
import restaurantSettingsRepository from "../../restaurantSettings/repositories/RestaurantSettingsRepository.js";
import {
  PIX_PROVIDERS,
  type PixProvider,
  normalizePixProvider,
} from "../../payments/providers/providerCatalog.js";

const APPROVED_PAYMENT_STATUSES = new Set(["approved", "accredited", "paid"]);

type OrderItemInput = {
  productId: number;
  quantity: number;
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
};

type PaymentStatusPayload = {
  paymentId: string;
  restaurantId?: number | string;
};

type PixPaymentPayload = {
  id?: string | number;
  status?: string;
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

function buildEmvField(id: string, value: string | number) {
  const normalizedValue = String(value || "");
  const byteLength = new TextEncoder().encode(normalizedValue).length;
  return `${id}${String(byteLength).padStart(2, "0")}${normalizedValue}`;
}

function normalizePixText(
  value: string | number | null | undefined,
  maxLength: number,
  fallback: string,
) {
  const normalized = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, "")
    .trim()
    .slice(0, maxLength)
    .toUpperCase();

  if (normalized) {
    return normalized;
  }

  return String(fallback || "")
    .slice(0, maxLength)
    .toUpperCase();
}

function normalizeTxid(value: string | number | null | undefined) {
  const normalized = String(value || "")
    .replace(/[^A-Za-z0-9]/g, "")
    .slice(0, 25);

  return normalized || "***";
}

function isValidCpf(value: string | number | null | undefined) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!/^\d{11}$/.test(digits)) {
    return false;
  }

  if (/^(\d)\1{10}$/.test(digits)) {
    return false;
  }

  const calculateCheckDigit = (baseDigits: string, factorStart: number) => {
    let total = 0;

    for (let i = 0; i < baseDigits.length; i += 1) {
      total += Number(baseDigits[i]) * (factorStart - i);
    }

    const remainder = (total * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  const firstCheckDigit = calculateCheckDigit(digits.slice(0, 9), 10);
  const secondCheckDigit = calculateCheckDigit(digits.slice(0, 10), 11);

  return (
    firstCheckDigit === Number(digits[9]) &&
    secondCheckDigit === Number(digits[10])
  );
}

function normalizePixKey(value: string | number | null | undefined) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }

  const emailCandidate = raw.toLowerCase();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailCandidate)) {
    return raw.toLowerCase();
  }

  const digits = raw.replace(/\D/g, "");

  if (isValidCpf(digits)) {
    return digits;
  }

  const looksLikeFormattedPhone = /[()+\-\s]/.test(raw);

  if (/^55\d{10,11}$/.test(digits)) {
    return `+${digits}`;
  }

  if (/^\d{11}$/.test(digits) && digits[2] === "9") {
    return `+55${digits}`;
  }

  if (/^\d{10}$/.test(digits)) {
    return `+55${digits}`;
  }

  if (looksLikeFormattedPhone && digits.length >= 10 && digits.length <= 13) {
    if (
      (digits.length === 12 || digits.length === 13) &&
      digits.startsWith("55")
    ) {
      return `+${digits}`;
    }

    if (digits.length === 10 || digits.length === 11) {
      return `+55${digits}`;
    }
  }

  return raw;
}

function calculateCrc16(payload: string) {
  let crc = 0xffff;

  for (let i = 0; i < payload.length; i += 1) {
    crc ^= payload.charCodeAt(i) << 8;

    for (let bit = 0; bit < 8; bit += 1) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc <<= 1;
      }

      crc &= 0xffff;
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function buildPixPayload({
  pixKey,
  amount,
  merchantName = "RESTAURANTE",
  merchantCity = "SAO PAULO",
  txid = "***",
}: {
  pixKey: string;
  amount: number;
  merchantName?: string;
  merchantCity?: string;
  txid?: string;
}) {
  const normalizedKey = String(pixKey || "").trim();
  const normalizedPixKey = normalizePixKey(normalizedKey);
  if (!normalizedPixKey) {
    return "";
  }

  const normalizedName = normalizePixText(merchantName, 25, "RESTAURANTE");
  const normalizedCity = normalizePixText(merchantCity, 15, "SAO PAULO");
  const normalizedTxid = normalizeTxid(txid);

  const merchantAccountInfo = [
    buildEmvField("00", "BR.GOV.BCB.PIX"),
    buildEmvField("01", normalizedPixKey),
  ].join("");

  const additionalDataField = buildEmvField("05", normalizedTxid);
  const normalizedAmount = Number(amount || 0);
  const hasAmount = Number.isFinite(normalizedAmount) && normalizedAmount > 0;

  const payload = [
    buildEmvField("00", "01"),
    buildEmvField("01", "11"),
    buildEmvField("26", merchantAccountInfo),
    buildEmvField("52", "0000"),
    buildEmvField("53", "986"),
    hasAmount ? buildEmvField("54", normalizedAmount.toFixed(2)) : "",
    buildEmvField("58", "BR"),
    buildEmvField("59", normalizedName),
    buildEmvField("60", normalizedCity),
    buildEmvField("62", additionalDataField),
  ].join("");

  const payloadForCrc = `${payload}6304`;
  const crc = calculateCrc16(payloadForCrc);
  return `${payloadForCrc}${crc}`;
}

function normalizeReferenceToken(value: string | number | null | undefined) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function doesProofContainTransactionId(
  paymentProof: string,
  transactionId: string,
) {
  const normalizedProof = normalizeReferenceToken(paymentProof);
  const normalizedTransactionId = normalizeReferenceToken(transactionId);

  if (!normalizedProof || !normalizedTransactionId) {
    return false;
  }

  return normalizedProof.includes(normalizedTransactionId);
}

type ParsedManualPixPaymentId = {
  provider: PixProvider;
  restaurantId: number;
  createdAt: Date;
  transactionId: string;
};

class OrderPixPaymentService {
  parseManualPaymentId(paymentId: string): ParsedManualPixPaymentId {
    const normalizedPaymentId = String(paymentId || "").trim();
    const [
      prefix = "",
      provider = "",
      restaurant = "",
      createdAtMs = "",
      transactionIdFromId = "",
    ] = normalizedPaymentId.split(":");

    if (prefix !== "manual") {
      throw new Error("Pagamento PIX manual inválido.");
    }

    const restaurantId = Number(restaurant || 0);
    const createdAtTimestamp = Number(createdAtMs || 0);
    const createdAt = new Date(createdAtTimestamp);
    const fallbackTransactionId = normalizeTxid(
      `${provider}${restaurantId}${createdAtTimestamp}`,
    );
    const transactionId = normalizeTxid(
      transactionIdFromId || fallbackTransactionId,
    );

    if (
      !Number.isInteger(restaurantId) ||
      restaurantId <= 0 ||
      !Number.isFinite(createdAtTimestamp) ||
      Number.isNaN(createdAt.getTime()) ||
      !transactionId
    ) {
      throw new Error("Pagamento PIX manual inválido.");
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
    const normalizedProof = String(paymentProof || "").trim();
    if (normalizedProof.length < 6) {
      throw new Error(
        "Informe no comprovante o código/ID da transação PIX para confirmar este pagamento.",
      );
    }

    if (!doesProofContainTransactionId(normalizedProof, parsed.transactionId)) {
      throw new Error(
        "Comprovante PIX inválido: o ID da transação não corresponde ao pagamento deste pedido.",
      );
    }
  }

  async getMercadoPagoPaymentApi(restaurantId?: number) {
    const normalizedRestaurantId = Number(restaurantId || 0);
    const allowGlobalFallback =
      process.env.ALLOW_GLOBAL_PAYMENT_FALLBACK === "true";
    const settings =
      Number.isInteger(normalizedRestaurantId) && normalizedRestaurantId > 0
        ? await restaurantSettingsRepository.findByRestaurantId(
            normalizedRestaurantId,
          )
        : null;
    const settingsToken = String(settings?.mercadoPagoAccessToken || "").trim();
    const globalToken = String(process.env.MP_ACCESS_TOKEN || "").trim();
    const accessToken =
      settingsToken || (allowGlobalFallback ? globalToken : "");

    if (!accessToken) {
      throw new Error(
        "Pagamento PIX indisponivel no momento. Configure access token Mercado Pago nas configuracoes do restaurante.",
      );
    }

    const client = new MercadoPagoConfig({ accessToken });
    return new Payment(client);
  }

  normalizeCpf(value: string | number | null | undefined) {
    const digits = String(value || "").replace(/\D/g, "");
    return digits.length === 11 ? digits : null;
  }

  normalizeEmail(email: string | null | undefined, restaurantId: number) {
    const trimmed = String(email || "").trim();

    if (trimmed && trimmed.includes("@")) {
      return trimmed;
    }

    return `guest.pix.${restaurantId}.${Date.now()}@pecaja.local`;
  }

  normalizePaymentStatus(status: unknown) {
    return String(status || "")
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
    const products = await Promise.all(
      items.map((item) =>
        productRepository.findById(item.productId, restaurantId),
      ),
    );

    products.forEach((product, index) => {
      if (!product) {
        throw new Error(`Produto não encontrado: ${items[index].productId}`);
      }
    });

    return items.reduce((acc, item, index) => {
      const product = products[index];
      return acc + Number(product.price) * Number(item.quantity);
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
    userEmail,
  }: CreatePixPayload) {
    const normalizedRestaurantId = Number(restaurantId);
    const normalizedType = String(type || "").toUpperCase();
    const normalizedPaymentMethod = String(paymentMethod || "").toUpperCase();

    if (
      !Number.isInteger(normalizedRestaurantId) ||
      normalizedRestaurantId <= 0
    ) {
      throw new Error("Restaurante inválido para gerar PIX.");
    }

    const allowsPixType =
      normalizedType === "DELIVERY" ||
      normalizedType === "MESA" ||
      normalizedType === "RETIRADA";

    if (!allowsPixType || normalizedPaymentMethod !== "PIX") {
      throw new Error(
        "A geracao de PIX e permitida para pedidos DELIVERY, MESA ou RETIRADA com pagamento PIX.",
      );
    }

    if (normalizedType === "DELIVERY") {
      const requiredAddressFields = [address, number, district, city, state]
        .map((value) => String(value || "").trim())
        .filter(Boolean);

      if (requiredAddressFields.length < 5) {
        throw new Error(
          "Informe o endereco completo para pedidos de delivery.",
        );
      }
    }

    const settings =
      await restaurantSettingsRepository.findPublicByRestaurantId(
        normalizedRestaurantId,
      );

    const requestedPixProvider = String(pixProvider || "")
      .trim()
      .toUpperCase();
    const resolvedPixProvider = requestedPixProvider
      ? this.normalizePixProvider(requestedPixProvider)
      : this.normalizePixProvider(settings?.pixProvider);
    const pixKey = String(settings?.pixKey || "").trim();

    if (!pixKey) {
      throw new Error("Chave PIX não configurada para este restaurante.");
    }

    const minimumOrder = Number(settings?.minimumOrder || 0);
    const deliveryFee = Number(settings?.deliveryFee || 0);

    const subtotal = await this.calculateOrderSubtotal({
      restaurantId: normalizedRestaurantId,
      items,
    });

    if (
      normalizedType === "DELIVERY" &&
      minimumOrder > 0 &&
      subtotal < minimumOrder
    ) {
      throw new Error(
        `Pedido mínimo sobre o subtotal para delivery: R$ ${minimumOrder.toFixed(2)}. A taxa de entrega é cobrada à parte.`,
      );
    }

    const additionalFee =
      normalizedType === "DELIVERY" ? Math.max(deliveryFee, 0) : 0;
    const totalAmount = Number((subtotal + additionalFee).toFixed(2));

    if (totalAmount <= 0) {
      throw new Error("Total do pedido inválido para gerar cobrança PIX.");
    }

    if (resolvedPixProvider !== PIX_PROVIDERS.MERCADO_PAGO) {
      const createdAtTimestamp = Date.now();
      const transactionId = normalizeTxid(
        `${resolvedPixProvider}${normalizedRestaurantId}${createdAtTimestamp}`,
      );
      const pixCopyPaste = buildPixPayload({
        pixKey,
        amount: totalAmount,
        merchantName: "RESTAURANTE",
        merchantCity: "SAO PAULO",
        txid: transactionId,
      });

      return {
        paymentId: `manual:${resolvedPixProvider}:${normalizedRestaurantId}:${createdAtTimestamp}:${transactionId}`,
        status: "pending_manual",
        provider: resolvedPixProvider,
        totalAmount,
        qrCode: pixCopyPaste || pixKey,
        qrCodeBase64: null,
        requiresStatusCheck: false,
      };
    }

    const paymentApi = await this.getMercadoPagoPaymentApi(
      normalizedRestaurantId,
    );

    const payerEmail = this.normalizeEmail(userEmail, normalizedRestaurantId);
    const payerName = String(customerName || "Cliente").trim();
    const cpf = this.normalizeCpf(customerCpf);

    const body = {
      transaction_amount: totalAmount,
      description: `Pedido delivery restaurante ${normalizedRestaurantId}`,
      payment_method_id: "pix",
      payer: {
        email: payerEmail,
        first_name: payerName || "Cliente",
        ...(cpf
          ? {
              identification: {
                type: "CPF",
                number: cpf,
              },
            }
          : {}),
      },
      metadata: {
        restaurant_id: String(normalizedRestaurantId),
        source: "order_checkout",
        provider: resolvedPixProvider,
      },
      external_reference: `orderpix:${normalizedRestaurantId}:${Date.now()}`,
    };

    const response = (await paymentApi.create({ body })) as unknown;

    const payment =
      typeof response === "object" && response !== null
        ? ((response as { body?: unknown }).body ?? response)
        : {};
    const paymentData = payment as PixPaymentPayload;
    const transactionData =
      paymentData?.point_of_interaction?.transaction_data || {};
    const qrCode = String(transactionData?.qr_code || "").trim();
    const qrCodeBase64 = String(transactionData?.qr_code_base64 || "").trim();

    if (!paymentData?.id || !qrCode) {
      throw new Error("Não foi possível gerar o QR Code PIX no momento.");
    }

    return {
      paymentId: String(paymentData.id),
      status: String(paymentData.status || "pending"),
      provider: resolvedPixProvider,
      totalAmount,
      qrCode,
      qrCodeBase64: qrCodeBase64 || null,
      requiresStatusCheck: true,
    };
  }

  async getPaymentStatus({ paymentId, restaurantId }: PaymentStatusPayload) {
    const normalizedPaymentId = String(paymentId || "").trim();
    if (!normalizedPaymentId) {
      throw new Error("Pagamento PIX inválido.");
    }

    if (normalizedPaymentId.startsWith("manual:")) {
      const parsedManualPayment =
        this.parseManualPaymentId(normalizedPaymentId);
      const normalizedRestaurantId = String(restaurantId || "").trim();
      const sameRestaurant =
        !normalizedRestaurantId ||
        String(parsedManualPayment.restaurantId) === normalizedRestaurantId;

      return {
        paymentId: normalizedPaymentId,
        status: "pending_manual",
        provider: parsedManualPayment.provider,
        isApproved: false,
        sameRestaurant,
        requiresStatusCheck: false,
      };
    }

    const normalizedRestaurantIdNumber = Number(restaurantId || 0);
    const paymentApi = await this.getMercadoPagoPaymentApi(
      Number.isInteger(normalizedRestaurantIdNumber) &&
        normalizedRestaurantIdNumber > 0
        ? normalizedRestaurantIdNumber
        : undefined,
    );

    const response = (await paymentApi.get({
      id: normalizedPaymentId,
    })) as unknown;
    const payment =
      typeof response === "object" && response !== null
        ? ((response as { body?: unknown }).body ?? response)
        : {};
    const paymentData = payment as PixPaymentPayload;
    const status = this.normalizePaymentStatus(paymentData?.status);
    const metadataRestaurantId = String(
      paymentData?.metadata?.restaurant_id || "",
    ).trim();
    const normalizedRestaurantId = String(restaurantId || "").trim();

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
      requiresStatusCheck: true,
    };
  }

  async ensurePaymentApproved({
    paymentId,
    restaurantId,
  }: PaymentStatusPayload) {
    const statusResult = await this.getPaymentStatus({
      paymentId,
      restaurantId,
    });

    if (!statusResult.sameRestaurant) {
      throw new Error(
        "Este pagamento PIX não pertence ao restaurante do pedido.",
      );
    }

    if (!statusResult.isApproved) {
      throw new Error("Pagamento PIX ainda não foi aprovado.");
    }

    return statusResult;
  }
}

export default new OrderPixPaymentService();
