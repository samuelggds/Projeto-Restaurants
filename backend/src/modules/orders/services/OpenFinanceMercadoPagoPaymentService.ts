import prisma from '../../../config/prisma.js';
import orderRepository from '../repositories/OrderRepository.js';
import restaurantSettingsRepository from '../../restaurantSettings/repositories/RestaurantSettingsRepository.js';
import { getMercadoPagoPreferenceApi, getMercadoPagoOrderApi } from '../../payments/providers/mercadoPagoClient.js';
import {
  mercadoPagoOpenFinanceExternalReference,
  mercadoPagoOpenFinancePaymentId,
  parseMercadoPagoOpenFinancePaymentId,
} from '../domain/mercadoPagoOpenFinanceReference.js';

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
  return url.toString();
}

function callbackBase(raw: unknown) {
  return requireHttpsUrl(raw, 'URL de retorno');
}

class OpenFinanceMercadoPagoPaymentService {
  async start({
    orderId,
    restaurantId,
    successUrl,
    cancelUrl,
  }: {
    orderId: number | string;
    restaurantId: number | string;
    successUrl: unknown;
    cancelUrl: unknown;
  }) {
    const normalizedRestaurantId = Number(restaurantId);
    const normalizedOrderId = Number(orderId);
    if (!Number.isSafeInteger(normalizedRestaurantId) || normalizedRestaurantId <= 0) {
      throw new Error('Restaurante inválido para Open Finance.');
    }
    if (!Number.isSafeInteger(normalizedOrderId) || normalizedOrderId <= 0) {
      throw new Error('Pedido inválido para Open Finance.');
    }

    const settings = await restaurantSettingsRepository.findByRestaurantId(normalizedRestaurantId);
    if (!settings?.openFinancePixEnabled) {
      throw new Error('Open Finance está desativado neste restaurante.');
    }
    if (!settings?.mercadoPagoAccessToken) {
      throw new Error('Conecte a conta Mercado Pago do restaurante para usar Open Finance.');
    }

    const order = await orderRepository.findById(normalizedOrderId, normalizedRestaurantId);
    if (!order || String(order.paymentMethod || '').toUpperCase() !== 'PIX' || order.payOnDelivery) {
      throw new Error('Pedido inválido para pagamento via Open Finance.');
    }
    if (order.paid === true) {
      return {
        paymentId: String(order.pixPaymentId || ''),
        provider: 'MERCADO_PAGO_OPEN_FINANCE',
        status: 'processed',
        paid: true,
        orderId: order.id,
        orderPublicId: order.publicId,
        totalAmount: Number(order.total),
      };
    }
    if (String(order.status || '').toUpperCase() === 'CANCELADO') {
      throw new Error('Este pedido foi cancelado e não pode mais ser pago.');
    }

    const existingPaymentId = String(order.pixPaymentId || '').trim();
    if (existingPaymentId) {
      const providerOrderId = parseMercadoPagoOpenFinancePaymentId(existingPaymentId);
      if (!providerOrderId) {
        throw new Error('Este pedido já possui outra tentativa de pagamento Pix.');
      }
      const remoteOrder = await (await getMercadoPagoOrderApi(normalizedRestaurantId)).get(providerOrderId);
      return {
        paymentId: existingPaymentId,
        provider: 'MERCADO_PAGO_OPEN_FINANCE',
        status: String(remoteOrder.status || 'created'),
        paid: String(remoteOrder.status || '').toLowerCase() === 'processed',
        redirectUrl: remoteOrder.checkout_url ? requireHttpsUrl(remoteOrder.checkout_url, 'Checkout Mercado Pago') : null,
        orderId: order.id,
        orderPublicId: order.publicId,
        totalAmount: Number(order.total),
      };
    }

    const restaurant = await prisma.restaurant.findFirst({
      where: { id: normalizedRestaurantId, active: true },
      select: { name: true },
    });
    if (!restaurant) throw new Error('Restaurante indisponível para este pagamento.');

    const total = Number(order.total);
    if (!Number.isFinite(total) || total <= 0) throw new Error('Total do pedido inválido.');

    const successBase = callbackBase(successUrl);
    const cancelBase = callbackBase(cancelUrl || successBase);
    const withParams = (base: string, status: string) => {
      const url = new URL(base);
      url.searchParams.set('openFinanceCheckoutStatus', status);
      url.searchParams.set('orderPublicId', String(order.publicId));
      return url.toString();
    };

    const preferenceApi = await getMercadoPagoPreferenceApi(normalizedRestaurantId);
    const response = await preferenceApi.create({
      body: {
        items: [
          {
            id: String(order.id),
            title: `Pedido #${order.id}`,
            description: String(restaurant.name || 'Pedido GastroNexa').slice(0, 256),
            quantity: 1,
            unit_price: total,
          },
        ],
        external_reference: mercadoPagoOpenFinanceExternalReference(order.id, normalizedRestaurantId),
        back_urls: {
          success: withParams(successBase, 'success'),
          pending: withParams(successBase, 'pending'),
          failure: withParams(cancelBase, 'cancel'),
        },
      },
    });

    const providerOrderId = String((response as { id?: unknown }).id || '').trim();
    const checkoutUrl = String((response as { init_point?: unknown }).init_point || '').trim();
    if (!providerOrderId || !checkoutUrl) {
      throw new Error('Mercado Pago não retornou um checkout válido para Open Finance.');
    }

    const paymentId = mercadoPagoOpenFinancePaymentId(providerOrderId);
    await orderRepository.claimPixPaymentId(order.id, normalizedRestaurantId, paymentId);

    return {
      paymentId,
      provider: 'MERCADO_PAGO_OPEN_FINANCE',
      status: 'created',
      paid: false,
      redirectUrl: requireHttpsUrl(checkoutUrl, 'Checkout Mercado Pago'),
      orderId: order.id,
      orderPublicId: order.publicId,
      totalAmount: total,
    };
  }
}

export default new OpenFinanceMercadoPagoPaymentService();
