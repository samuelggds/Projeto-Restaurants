import { MercadoPagoConfig, Payment } from "mercadopago";
import productRepository from "../../products/repositories/ProductRepository.js";
import restaurantSettingsRepository from "../../restaurantSettings/repositories/RestaurantSettingsRepository.js";

const APPROVED_PAYMENT_STATUSES = new Set(["approved", "accredited", "paid"]);
const PIX_PROVIDERS = {
  MERCADO_PAGO: "MERCADO_PAGO",
  NUBANK: "NUBANK",
  PICPAY: "PICPAY",
};

function buildEmvField(id, value) {
  const normalizedValue = String(value || "");
  const byteLength = new TextEncoder().encode(normalizedValue).length;
  return `${id}${String(byteLength).padStart(2, "0")}${normalizedValue}`;
}

function normalizePixText(value, maxLength, fallback) {
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

function normalizeTxid(value) {
  const normalized = String(value || "")
    .replace(/[^A-Za-z0-9]/g, "")
    .slice(0, 25);

  return normalized || "***";
}

function isValidCpf(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!/^\d{11}$/.test(digits)) {
    return false;
  }

  if (/^(\d)\1{10}$/.test(digits)) {
    return false;
  }

  const calculateCheckDigit = (baseDigits, factorStart) => {
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

function normalizePixKey(value) {
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

function calculateCrc16(payload) {
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

class OrderPixPaymentService {
  constructor() {
    const accessToken = String(process.env.MP_ACCESS_TOKEN || "").trim();
    this.hasAccessToken = Boolean(accessToken);
    this.client = this.hasAccessToken
      ? new MercadoPagoConfig({
          accessToken,
        })
      : null;
    this.paymentApi = this.client ? new Payment(this.client) : null;
  }

  ensureMercadoPagoConfigured() {
    if (!this.hasAccessToken || !this.paymentApi) {
      throw new Error(
        "Pagamento PIX indisponível no momento. Configure MP_ACCESS_TOKEN no servidor.",
      );
    }
  }

  normalizeCpf(value) {
    const digits = String(value || "").replace(/\D/g, "");
    return digits.length === 11 ? digits : null;
  }

  normalizeEmail(email, restaurantId) {
    const trimmed = String(email || "").trim();

    if (trimmed && trimmed.includes("@")) {
      return trimmed;
    }

    return `guest.pix.${restaurantId}.${Date.now()}@pecaja.local`;
  }

  normalizePaymentStatus(status) {
    return String(status || "")
      .trim()
      .toLowerCase();
  }

  normalizePixProvider(value) {
    const provider = String(value || PIX_PROVIDERS.MERCADO_PAGO)
      .trim()
      .toUpperCase();

    if (Object.values(PIX_PROVIDERS).includes(provider)) {
      return provider;
    }

    return PIX_PROVIDERS.MERCADO_PAGO;
  }

  async calculateOrderSubtotal({ restaurantId, items }) {
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
    items,
    address,
    number,
    district,
    city,
    state,
    customerName,
    customerCpf,
    userEmail,
  }) {
    const normalizedRestaurantId = Number(restaurantId);
    const normalizedType = String(type || "").toUpperCase();
    const normalizedPaymentMethod = String(paymentMethod || "").toUpperCase();

    if (
      !Number.isInteger(normalizedRestaurantId) ||
      normalizedRestaurantId <= 0
    ) {
      throw new Error("Restaurante inválido para gerar PIX.");
    }

    if (normalizedType !== "DELIVERY" || normalizedPaymentMethod !== "PIX") {
      throw new Error(
        "A geração de PIX é permitida apenas para pedidos DELIVERY com pagamento PIX.",
      );
    }

    const requiredAddressFields = [address, number, district, city, state]
      .map((value) => String(value || "").trim())
      .filter(Boolean);

    if (requiredAddressFields.length < 5) {
      throw new Error("Informe o endereço completo para pedidos de delivery.");
    }

    const settings =
      await restaurantSettingsRepository.findPublicByRestaurantId(
        normalizedRestaurantId,
      );

    const pixProvider = this.normalizePixProvider(settings?.pixProvider);
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

    if (minimumOrder > 0 && subtotal < minimumOrder) {
      throw new Error(
        `Pedido mínimo para delivery: R$ ${minimumOrder.toFixed(2)}.`,
      );
    }

    const totalAmount = Number(
      (subtotal + Math.max(deliveryFee, 0)).toFixed(2),
    );

    if (totalAmount <= 0) {
      throw new Error("Total do pedido inválido para gerar cobrança PIX.");
    }

    if (pixProvider !== PIX_PROVIDERS.MERCADO_PAGO) {
      const pixCopyPaste = buildPixPayload({
        pixKey,
        amount: totalAmount,
        merchantName: "RESTAURANTE",
        merchantCity: "SAO PAULO",
        txid: `${pixProvider}${normalizedRestaurantId}${Date.now()}`,
      });

      return {
        paymentId: `manual:${pixProvider}:${normalizedRestaurantId}:${Date.now()}`,
        status: "pending_manual",
        provider: pixProvider,
        totalAmount,
        qrCode: pixCopyPaste || pixKey,
        qrCodeBase64: null,
        requiresStatusCheck: false,
      };
    }

    this.ensureMercadoPagoConfigured();

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
        provider: pixProvider,
      },
      external_reference: `orderpix:${normalizedRestaurantId}:${Date.now()}`,
    };

    const response = await this.paymentApi.create({ body });
    const payment = response?.body || response || {};
    const transactionData =
      payment?.point_of_interaction?.transaction_data || {};
    const qrCode = String(transactionData?.qr_code || "").trim();
    const qrCodeBase64 = String(transactionData?.qr_code_base64 || "").trim();

    if (!payment?.id || !qrCode) {
      throw new Error("Não foi possível gerar o QR Code PIX no momento.");
    }

    return {
      paymentId: String(payment.id),
      status: String(payment.status || "pending"),
      provider: pixProvider,
      totalAmount,
      qrCode,
      qrCodeBase64: qrCodeBase64 || null,
      requiresStatusCheck: true,
    };
  }

  async getPaymentStatus({ paymentId, restaurantId }) {
    const normalizedPaymentId = String(paymentId || "").trim();
    if (!normalizedPaymentId) {
      throw new Error("Pagamento PIX inválido.");
    }

    if (normalizedPaymentId.startsWith("manual:")) {
      const [, provider = "", providerRestaurantId = ""] =
        normalizedPaymentId.split(":");
      const normalizedRestaurantId = String(restaurantId || "").trim();
      const sameRestaurant =
        !normalizedRestaurantId ||
        !providerRestaurantId ||
        providerRestaurantId === normalizedRestaurantId;

      return {
        paymentId: normalizedPaymentId,
        status: "pending_manual",
        provider: this.normalizePixProvider(provider),
        isApproved: false,
        sameRestaurant,
        requiresStatusCheck: false,
      };
    }

    this.ensureMercadoPagoConfigured();

    const response = await this.paymentApi.get({ id: normalizedPaymentId });
    const payment = response?.body || response || {};
    const status = this.normalizePaymentStatus(payment?.status);
    const metadataRestaurantId = String(
      payment?.metadata?.restaurant_id || "",
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

  async ensurePaymentApproved({ paymentId, restaurantId }) {
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
