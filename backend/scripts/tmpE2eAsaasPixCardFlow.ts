import 'dotenv/config';
import prisma from '../src/config/prisma.js';
import orderPixPaymentService from '../src/modules/orders/services/OrderPixPaymentService.js';
import createOrderService from '../src/modules/orders/services/CreateOrderService.js';
import createOrderCardCheckoutService from '../src/modules/orders/services/CreateOrderCardCheckoutService.js';

const RESTAURANT_ID = Number(process.env.E2E_RESTAURANT_ID || 2);
const ASAAS_BASE_URL = String(process.env.ASAAS_API_BASE_URL || 'https://api.asaas.com')
  .trim()
  .replace(/\/+$/, '');

type AsaasApiError = {
  description?: string;
};

type AsaasPaymentResponse = {
  id?: string;
  value?: number;
  walletId?: string;
  status?: string;
  errors?: AsaasApiError[];
};

async function getSampleProductId(restaurantId: number) {
  const product = await prisma.product.findFirst({
    where: {
      restaurantId,
      active: true,
    },
    orderBy: {
      id: 'asc',
    },
    select: {
      id: true,
      name: true,
      price: true,
    },
  });

  if (!product) {
    throw new Error('Nenhum produto ativo encontrado para o restaurante.');
  }

  return product;
}

function formatMoney(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed.toFixed(2) : '0.00';
}

function getAsaasToken(settingsToken?: string | null) {
  const token = String(settingsToken || process.env.ASAAS_API_KEY || '').trim();
  if (!token) {
    throw new Error(
      'Restaurante sem asaasAccessToken e ASAAS_API_KEY ausente. Configure para testar carteira.',
    );
  }

  return token;
}

function extractAsaasError(payload: AsaasPaymentResponse | { errors?: AsaasApiError[] }) {
  const firstError = String(payload?.errors?.[0]?.description || '').trim();
  return firstError || 'Falha de integracao com Asaas.';
}

async function asaasRequest<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${ASAAS_BASE_URL}${path}`, {
    method: init?.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      access_token: token,
      ...(init?.headers || {}),
    },
    body: init?.body,
  });

  const responseBody = (await response.json()) as T & {
    errors?: AsaasApiError[];
  };

  if (!response.ok) {
    throw new Error(extractAsaasError(responseBody));
  }

  return responseBody;
}

async function postAsaasPaymentReceivedWebhook(payload: {
  paymentId: string;
  orderId: number;
  value: number;
  walletId: string;
}) {
  const webhookToken = String(process.env.ASAAS_WEBHOOK_TOKEN || '').trim();
  if (!webhookToken) {
    throw new Error('ASAAS_WEBHOOK_TOKEN ausente para simular webhook local.');
  }

  const webhookResponse = await fetch('http://localhost:3000/api/webhooks/asaas', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'asaas-access-token': webhookToken,
    },
    body: JSON.stringify({
      event: 'PAYMENT_RECEIVED',
      payment: {
        id: payload.paymentId,
        externalReference: String(payload.orderId),
        value: payload.value,
        walletId: payload.walletId,
      },
    }),
  });

  const webhookBody = await webhookResponse.json();
  return {
    ok: webhookResponse.ok,
    status: webhookResponse.status,
    body: webhookBody,
  };
}

async function confirmAsaasPaymentAndNotifyWebhook(payload: {
  token: string;
  paymentId: string;
  orderId: number;
}) {
  const paymentId = String(payload.paymentId || '').trim();
  if (!paymentId) {
    throw new Error('paymentId do Asaas nao informado.');
  }

  await asaasRequest(payload.token, `/v3/payments/${encodeURIComponent(paymentId)}/receiveInCash`, {
    method: 'POST',
    body: JSON.stringify({
      paymentDate: new Date().toISOString().slice(0, 10),
    }),
  });

  const payment = await asaasRequest<AsaasPaymentResponse>(
    payload.token,
    `/v3/payments/${encodeURIComponent(paymentId)}`,
  );

  const value = Number(payment.value || 0);
  const walletId = String(payment.walletId || '').trim();

  if (!walletId) {
    throw new Error('Asaas nao retornou walletId do pagamento confirmado.');
  }

  const webhook = await postAsaasPaymentReceivedWebhook({
    paymentId,
    orderId: payload.orderId,
    value: Number.isFinite(value) ? value : 0,
    walletId,
  });

  return {
    status: String(payment.status || '').trim(),
    value: Number.isFinite(value) ? value : 0,
    walletId,
    webhook,
  };
}

async function getWalletSnapshot(restaurantId: number) {
  const settings = await prisma.restaurantSettings.findUnique({
    where: { restaurantId },
    select: {
      asaasAccessToken: true,
    },
  });

  const token = getAsaasToken(settings?.asaasAccessToken);
  const wallet = await asaasRequest<{ balance?: number }>(token, '/v3/finance/balance');

  return {
    tokenConfigured: true,
    token,
    balance: Number(wallet?.balance || 0),
  };
}

async function ensureAsaasProviders(restaurantId: number) {
  const asaasAccessToken = String(process.env.ASAAS_API_KEY || '').trim();
  if (!asaasAccessToken) {
    throw new Error('ASAAS_API_KEY ausente no ambiente para configurar teste.');
  }

  await prisma.restaurantSettings.upsert({
    where: {
      restaurantId,
    },
    create: {
      restaurantId,
      pixProvider: 'ASAAS',
      cardGateway: 'ASAAS',
      asaasAccessToken,
    },
    update: {
      pixProvider: 'ASAAS',
      cardGateway: 'ASAAS',
      asaasAccessToken,
    },
  });
}

(async () => {
  const now = Date.now();

  try {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: RESTAURANT_ID },
      select: { id: true, name: true },
    });

    if (!restaurant) {
      throw new Error(`Restaurante ${RESTAURANT_ID} nao encontrado.`);
    }

    const product = await getSampleProductId(RESTAURANT_ID);
    const productPrice = Number(product.price || 0);
    const quantityForMinimumCharge =
      productPrice > 0 ? Math.max(1, Math.ceil(1 / productPrice)) : 1;

    await ensureAsaasProviders(RESTAURANT_ID);

    const walletBefore = await getWalletSnapshot(RESTAURANT_ID);

    const customerName = `Teste E2E ${now}`;
    const customerCpf = '52998224725';
    const customerPhone = '11987654321';

    let pixSummary:
      | {
          paymentId: string;
          orderId: number;
          asaasStatus: string;
          webhook: unknown;
          orderPaid: boolean;
          paidAt: Date | null;
          total: string;
        }
      | {
          error: string;
        } = { error: 'PIX nao executado.' };

    try {
      const pixPayment = await orderPixPaymentService.createPixPayment({
        restaurantId: RESTAURANT_ID,
        type: 'DELIVERY',
        paymentMethod: 'PIX',
        pixProvider: 'ASAAS',
        items: [{ productId: product.id, quantity: quantityForMinimumCharge }],
        address: 'Rua Teste',
        number: '123',
        district: 'Centro',
        city: 'Sao Paulo',
        state: 'SP',
        customerName,
        customerCpf,
        customerPhone,
        userEmail: `teste+${now}@example.com`,
      });

      const createdPixOrder = await createOrderService.execute({
        userId: null,
        restaurantId: RESTAURANT_ID,
        userRestaurantId: null,
        tableSessionId: null,
        tableSessionTableId: null,
        deferRealtimeUntilPaid: true,
        type: 'DELIVERY',
        paymentMethod: 'PIX',
        paid: false,
        pixPaymentId: String(pixPayment.paymentId || ''),
        observation: 'Pedido teste E2E PIX',
        customerName,
        customerCpf,
        customerPhone,
        items: [{ productId: product.id, quantity: quantityForMinimumCharge }],
        address: 'Rua Teste',
        number: '123',
        district: 'Centro',
        city: 'Sao Paulo',
        state: 'SP',
        zipCode: '01001000',
        complement: 'Apto 1',
      });

      const rawPixPaymentId = String(pixPayment.paymentId || '').replace(/^asaas:/i, '');

      if (!rawPixPaymentId) {
        throw new Error('PIX criado sem paymentId valido.');
      }

      const pixConfirmation = await confirmAsaasPaymentAndNotifyWebhook({
        token: walletBefore.token,
        paymentId: rawPixPaymentId,
        orderId: createdPixOrder.id,
      });

      const pixOrderAfterPayment = await prisma.order.findUnique({
        where: { id: createdPixOrder.id },
        select: {
          id: true,
          paid: true,
          paidAt: true,
          total: true,
        },
      });

      pixSummary = {
        paymentId: String(pixPayment.paymentId || ''),
        orderId: createdPixOrder.id,
        asaasStatus: pixConfirmation.status,
        webhook: pixConfirmation.webhook,
        orderPaid: Boolean(pixOrderAfterPayment?.paid),
        paidAt: pixOrderAfterPayment?.paidAt || null,
        total: formatMoney(pixOrderAfterPayment?.total),
      };
    } catch (pixError) {
      pixSummary = {
        error: pixError instanceof Error ? pixError.message : String(pixError),
      };
    }

    const cardCheckout = await createOrderCardCheckoutService.execute({
      userId: null,
      restaurantId: RESTAURANT_ID,
      userRestaurantId: null,
      tableSessionId: null,
      tableSessionTableId: null,
      type: 'DELIVERY',
      paymentMethod: 'CARTAO',
      items: [{ productId: product.id, quantity: quantityForMinimumCharge }],
      address: 'Rua Teste',
      number: '456',
      district: 'Centro',
      city: 'Sao Paulo',
      state: 'SP',
      zipCode: '01001000',
      complement: 'Apto 2',
      customerName: `${customerName} Card`,
      customerCpf,
      customerPhone,
      observation: 'Pedido teste E2E CARD',
      tableId: undefined,
      cardProvider: 'ASAAS',
      successUrl: 'http://localhost:5174/cart',
      cancelUrl: 'http://localhost:5174/cart',
    });

    const cardOrderAfterCreate = await prisma.order.findUnique({
      where: { id: Number(cardCheckout.orderId) },
      select: {
        id: true,
        paid: true,
        paidAt: true,
        total: true,
        cardCheckoutSessionId: true,
      },
    });

    let cardConfirmation:
      | {
          status: string;
          webhook: unknown;
        }
      | {
          error: string;
        } = {
      error: 'Confirmacao de cartao nao executada.',
    };

    try {
      const cardConfirmationResult = await confirmAsaasPaymentAndNotifyWebhook({
        token: walletBefore.token,
        paymentId: String(cardCheckout.sessionId || ''),
        orderId: Number(cardCheckout.orderId),
      });

      cardConfirmation = {
        status: cardConfirmationResult.status,
        webhook: cardConfirmationResult.webhook,
      };
    } catch (cardConfirmationError) {
      cardConfirmation = {
        error:
          cardConfirmationError instanceof Error
            ? cardConfirmationError.message
            : String(cardConfirmationError),
      };
    }

    const cardOrderAfterPayment = await prisma.order.findUnique({
      where: { id: Number(cardCheckout.orderId) },
      select: {
        id: true,
        paid: true,
        paidAt: true,
        total: true,
        cardCheckoutSessionId: true,
      },
    });

    const walletAfter = await getWalletSnapshot(RESTAURANT_ID);

    console.log(
      JSON.stringify(
        {
          ok: true,
          restaurant,
          product: {
            id: product.id,
            name: product.name,
            price: formatMoney(product.price),
          },
          wallet: {
            before: formatMoney(walletBefore.balance),
            after: formatMoney(walletAfter.balance),
            delta: formatMoney(walletAfter.balance - walletBefore.balance),
          },
          pix: pixSummary,
          card: {
            orderId: cardCheckout.orderId,
            provider: cardCheckout.provider,
            checkoutUrl: cardCheckout.checkoutUrl,
            sessionId: cardCheckout.sessionId,
            confirmation: cardConfirmation,
            orderPaidBeforeWebhook: Boolean(cardOrderAfterCreate?.paid),
            orderPaid: Boolean(cardOrderAfterPayment?.paid),
            paidAt: cardOrderAfterPayment?.paidAt || null,
            total: formatMoney(cardOrderAfterPayment?.total),
          },
        },
        null,
        2,
      ),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(JSON.stringify({ ok: false, error: message }, null, 2));
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
