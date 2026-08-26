import { useEffect, useState } from 'react';
import ordersService from '../../../Services/ordersService';
import type { CheckoutPaymentMethod } from '../domain/checkout';

export type PixPaymentData = {
  orderId: number | null;
  total: number;
  paymentId?: string;
  provider: string;
  pixCode: string;
  qrCodeBase64: string | null;
  requiresStatusCheck?: boolean;
  paid?: boolean;
};

type Notify = (
  type: 'success' | 'error',
  title: string,
  message?: string,
  duration?: number,
) => void;

type Options = {
  restaurantId: number | null;
  pixProvider: unknown;
  cartTotal: number;
  notify: Notify;
  onPurchased: () => void;
  onPaymentConfirmed: () => void | Promise<void>;
  onClearCart: () => void;
  onCloseCart: () => void;
};

export function getCheckoutErrorMessage(error: unknown): string {
  if (typeof error !== 'object' || error === null) return '';
  const typed = error as {
    response?: { data?: { error?: unknown } };
    message?: unknown;
  };
  const candidate = typed.response?.data?.error || typed.message || '';

  if (Array.isArray(candidate)) {
    const firstMessage = (candidate[0] as { message?: unknown } | undefined)?.message;
    return typeof firstMessage === 'string' ? firstMessage : '';
  }

  const message = String(candidate).trim();
  if (!message.startsWith('[')) return message;

  try {
    const issues = JSON.parse(message) as Array<{ message?: unknown }>;
    const firstMessage = issues.find((issue) => typeof issue?.message === 'string')?.message;
    return typeof firstMessage === 'string' ? firstMessage : '';
  } catch {
    return 'Revise os dados do pedido e tente novamente.';
  }
}

export function useCheckoutPayments(options: Options) {
  const {
    restaurantId,
    pixProvider,
    cartTotal,
    notify,
    onPurchased,
    onPaymentConfirmed,
    onClearCart,
    onCloseCart,
  } = options;
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [pixPaymentData, setPixPaymentData] = useState<PixPaymentData | null>(null);

  useEffect(() => {
    if (
      !pixPaymentData?.requiresStatusCheck ||
      pixPaymentData.paid ||
      !pixPaymentData.paymentId ||
      !pixPaymentData.orderId ||
      !restaurantId
    )
      return;

    let active = true;
    let checking = false;
    const checkPayment = async () => {
      if (!active || checking) return;
      checking = true;
      try {
        const status = await ordersService.getPixPaymentStatus({
          paymentId: pixPaymentData.paymentId,
          restaurantId,
        });
        if (status?.isApproved && active) {
          await ordersService.confirmPixPayment({
            orderId: pixPaymentData.orderId,
            paymentId: pixPaymentData.paymentId,
            restaurantId,
          });
          if (active) {
            setPixPaymentData((current) => (current ? { ...current, paid: true } : current));
            await onPaymentConfirmed();
          }
        }
      } catch {
        // A próxima consulta repete a verificação enquanto o QR estiver aberto.
      } finally {
        checking = false;
      }
    };

    void checkPayment();
    const intervalId = window.setInterval(checkPayment, 5000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [onPaymentConfirmed, pixPaymentData, restaurantId]);

  const executePayment = async (
    payload: Record<string, unknown>,
    paymentMethod: CheckoutPaymentMethod,
    payOnDelivery: boolean,
    resolvedPaymentMethod: 'PIX' | 'CARTAO',
  ) => {
    if (checkoutLoading) return false;
    setCheckoutLoading(true);
    try {
      if (payOnDelivery) {
        const order = await ordersService.createOrder(payload);
        onPurchased();
        onClearCart();
        onCloseCart();
        notify(
          'success',
          `Pedido #${String(order?.id || '')} recebido`,
          `Pagamento na entrega por ${resolvedPaymentMethod === 'PIX' ? 'Pix' : 'cartão'}.`,
          5000,
        );
        return true;
      }

      if (paymentMethod === 'pix') {
        const result = await ordersService.createPixPayment({
          ...payload,
          pixProvider: String(pixProvider || ''),
        });
        setPixPaymentData({
          orderId: Number(result.orderId) || null,
          total: Number(result.totalAmount || cartTotal),
          paymentId: String(result.paymentId || ''),
          provider: String(result.provider || 'PIX'),
          pixCode: String(result.qrCode || ''),
          qrCodeBase64: result.qrCodeBase64 ? String(result.qrCodeBase64) : null,
          requiresStatusCheck: Boolean(result.requiresStatusCheck),
        });
        onPurchased();
        onClearCart();
        onCloseCart();
        return true;
      }

      const result = await ordersService.createCardCheckout({
        ...payload,
        successUrl: window.location.href,
        cancelUrl: window.location.href,
      });
      const checkoutUrl = String(result.checkoutUrl || '');
      if (!/^https:\/\//i.test(checkoutUrl)) {
        throw new Error('O serviço de pagamento não retornou um endereço seguro.');
      }
      onPurchased();
      onClearCart();
      window.location.assign(checkoutUrl);
      return true;
    } catch (error: unknown) {
      notify(
        'error',
        'Não foi possível iniciar o pagamento',
        getCheckoutErrorMessage(error) || 'Confira as configurações de pagamento do restaurante.',
      );
      return false;
    } finally {
      setCheckoutLoading(false);
    }
  };

  return {
    checkoutLoading,
    pixPaymentData,
    setPixPaymentData,
    executePayment,
  };
}
