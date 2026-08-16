import 'dotenv/config';
import prisma from '../src/config/prisma.js';

const RESTAURANT_ID = Number(process.env.E2E_RESTAURANT_ID || 2);
const ASAAS_BASE_URL = String(process.env.ASAAS_API_BASE_URL || 'https://api.asaas.com')
  .trim()
  .replace(/\/+$/, '');

type AsaasErrorItem = {
  description?: string;
};

type AsaasMyAccountPayload = {
  id?: string;
  walletId?: string;
  name?: string;
  email?: string;
  errors?: AsaasErrorItem[];
};

type AsaasPaymentItem = {
  id?: string;
  walletId?: string;
};

type AsaasPaymentsPayload = {
  data?: AsaasPaymentItem[];
  errors?: AsaasErrorItem[];
};

type AsaasPaymentDetailsPayload = {
  id?: string;
  walletId?: string;
  errors?: AsaasErrorItem[];
};

function providerError(payload: AsaasMyAccountPayload) {
  const first = String(payload?.errors?.[0]?.description || '').trim();
  return first || 'Falha ao consultar conta no Asaas.';
}

(async () => {
  try {
    const settings = await prisma.restaurantSettings.findUnique({
      where: { restaurantId: RESTAURANT_ID },
      select: {
        asaasAccessToken: true,
        gatewayMerchantId: true,
      },
    });

    if (!settings) {
      throw new Error('Configuracoes do restaurante nao encontradas.');
    }

    const token = String(settings.asaasAccessToken || '').trim();
    if (!token) {
      throw new Error('asaasAccessToken nao configurado para o restaurante.');
    }

    const response = await fetch(`${ASAAS_BASE_URL}/v3/myAccount`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        access_token: token,
      },
    });

    const body = (await response.json()) as AsaasMyAccountPayload;
    if (!response.ok) {
      throw new Error(providerError(body));
    }

    let walletId = String(body.walletId || body.id || '').trim();

    if (!walletId) {
      const paymentsResponse = await fetch(`${ASAAS_BASE_URL}/v3/payments?limit=10&offset=0`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          access_token: token,
        },
      });

      const paymentsBody = (await paymentsResponse.json()) as AsaasPaymentsPayload;

      if (!paymentsResponse.ok) {
        throw new Error(providerError(paymentsBody));
      }

      const firstWithWallet = Array.isArray(paymentsBody.data)
        ? paymentsBody.data.find((item) => String(item?.walletId || '').trim())
        : null;

      walletId = String(firstWithWallet?.walletId || '').trim();
    }

    if (!walletId) {
      const recentOrders = await prisma.order.findMany({
        where: {
          restaurantId: RESTAURANT_ID,
          cardCheckoutSessionId: {
            startsWith: 'asaas_pay:',
          },
        },
        select: {
          cardCheckoutSessionId: true,
        },
        orderBy: {
          id: 'desc',
        },
        take: 10,
      });

      const asaasPaymentIds = recentOrders
        .map((row) =>
          String(row.cardCheckoutSessionId || '')
            .trim()
            .replace(/^asaas_pay:/i, ''),
        )
        .filter((id) => id.length > 0);

      for (const paymentId of asaasPaymentIds) {
        const paymentDetailsResponse = await fetch(
          `${ASAAS_BASE_URL}/v3/payments/${encodeURIComponent(paymentId)}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              access_token: token,
            },
          },
        );

        const paymentDetailsBody =
          (await paymentDetailsResponse.json()) as AsaasPaymentDetailsPayload;

        if (!paymentDetailsResponse.ok) {
          continue;
        }

        const candidate = String(paymentDetailsBody.walletId || '').trim();
        if (candidate) {
          walletId = candidate;
          break;
        }
      }
    }

    if (!walletId) {
      throw new Error(
        'Asaas nao retornou walletId/id em /v3/myAccount, /v3/payments ou detalhes dos pagamentos locais.',
      );
    }

    const previous = String(settings.gatewayMerchantId || '').trim();

    await prisma.restaurantSettings.update({
      where: { restaurantId: RESTAURANT_ID },
      data: {
        gatewayMerchantId: walletId,
      },
    });

    console.log(
      JSON.stringify(
        {
          ok: true,
          restaurantId: RESTAURANT_ID,
          updated: previous !== walletId,
          previousGatewayMerchantIdConfigured: Boolean(previous),
          gatewayMerchantIdConfigured: true,
          gatewayMerchantIdLength: walletId.length,
          accountName: String(body.name || '').trim() || null,
          accountEmailConfigured: Boolean(String(body.email || '').trim()),
        },
        null,
        2,
      ),
    );
  } catch (error) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          restaurantId: RESTAURANT_ID,
          error: error instanceof Error ? error.message : String(error),
        },
        null,
        2,
      ),
    );
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
