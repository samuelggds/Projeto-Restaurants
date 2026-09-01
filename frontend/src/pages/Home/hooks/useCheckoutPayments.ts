import { useCallback, useEffect, useRef, useState } from 'react';
import ordersService from '../../../Services/ordersService';
import type { CheckoutPaymentMethod } from '../domain/checkout';
import customerPaymentMethodService from '../../../Services/customerPaymentMethodService';

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

export type PixPaymentStatus = 'WAITING' | 'VERIFYING' | 'PENDING' | 'PAID' | 'ERROR';

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
  const [pixPaymentStatus, setPixPaymentStatus] = useState<PixPaymentStatus>('WAITING');
  const [pixPaymentError, setPixPaymentError] = useState<string | null>(null);
  const pixCheckInFlightRef = useRef(false);
  const pixConfirmedRef = useRef(false);
  const onPaymentConfirmedRef = useRef(onPaymentConfirmed);

  useEffect(() => {
    onPaymentConfirmedRef.current = onPaymentConfirmed;
  }, [onPaymentConfirmed]);

  const verifyPixPayment = useCallback(async (): Promise<PixPaymentStatus> => {
    if (pixCheckInFlightRef.current) return 'VERIFYING';
    if (
      !pixPaymentData?.paymentId ||
      !pixPaymentData.orderId ||
      !restaurantId ||
      pixConfirmedRef.current
    ) {
      return pixConfirmedRef.current ? 'PAID' : 'ERROR';
    }

    pixCheckInFlightRef.current = true;
    setPixPaymentStatus('VERIFYING');
    setPixPaymentError(null);
    try {
      const providerStatus = await ordersService.getPixPaymentStatus({
        paymentId: pixPaymentData.paymentId,
        restaurantId,
      });
      if (providerStatus?.isApproved !== true) {
        setPixPaymentStatus('PENDING');
        return 'PENDING';
      }

      const confirmedOrder = await ordersService.confirmPixPayment({
        orderId: pixPaymentData.orderId,
        paymentId: pixPaymentData.paymentId,
        restaurantId,
      });
      if (confirmedOrder?.paid !== true) {
        setPixPaymentStatus('ERROR');
        setPixPaymentError(
          'O provedor respondeu, mas o pedido ainda não foi confirmado. Verifique novamente.',
        );
        return 'ERROR';
      }

      pixConfirmedRef.current = true;
      setPixPaymentData((current) => (current ? { ...current, paid: true } : current));
      setPixPaymentStatus('PAID');
      try {
        await onPaymentConfirmedRef.current();
      } catch {
        // Atualizações auxiliares não alteram a confirmação canônica já recebida.
      }
      return 'PAID';
    } catch (error: unknown) {
      setPixPaymentStatus('ERROR');
      setPixPaymentError(
        getCheckoutErrorMessage(error) ||
          'Não foi possível consultar o pagamento agora. O pedido continua sem confirmação.',
      );
      return 'ERROR';
    } finally {
      pixCheckInFlightRef.current = false;
    }
  }, [pixPaymentData, restaurantId]);

  useEffect(() => {
    if (
      !pixPaymentData?.requiresStatusCheck ||
      pixPaymentData.paid ||
      !pixPaymentData.paymentId ||
      !pixPaymentData.orderId ||
      !restaurantId
    )
      return;

    const initialCheckId = window.setTimeout(() => void verifyPixPayment(), 0);
    const intervalId = window.setInterval(() => void verifyPixPayment(), 5000);
    return () => {
      window.clearTimeout(initialCheckId);
      window.clearInterval(intervalId);
    };
  }, [pixPaymentData, restaurantId, verifyPixPayment]);

  const clearPixPayment = useCallback(() => {
    pixCheckInFlightRef.current = false;
    pixConfirmedRef.current = false;
    setPixPaymentData(null);
    setPixPaymentStatus('WAITING');
    setPixPaymentError(null);
  }, []);

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
        pixConfirmedRef.current = false;
        setPixPaymentStatus('WAITING');
        setPixPaymentError(null);
        onPurchased();
        onClearCart();
        onCloseCart();
        return true;
      }

      const savedMethods = restaurantId
        ? await customerPaymentMethodService.list(restaurantId).catch(() => [])
        : [];
      const storedMethodId = restaurantId
        ? localStorage.getItem(`selectedCustomerPaymentMethodId:${restaurantId}`)
        : '';
      const selectedSavedMethod =
        savedMethods.find((method) => method.publicId === storedMethodId) ||
        savedMethods.find((method) => method.isDefault) ||
        savedMethods[0];
      const result = await ordersService.createCardCheckout({
        ...payload,
        ...(selectedSavedMethod ? { paymentMethodId: selectedSavedMethod.publicId } : {}),
        successUrl: window.location.href,
        cancelUrl: window.location.href,
      });
      const checkoutUrl = String(result.checkoutUrl || '');
      if (!/^https:\/\//i.test(checkoutUrl)) {
        throw new Error('O serviço de pagamento não retornou um endereço seguro.');
      }
      onPurchased();
      onClearCart();
      if (result.paid) {
        onCloseCart();
        await onPaymentConfirmed();
        notify(
          'success',
          'Pagamento aprovado',
          `Pedido #${String(result.orderId || '')} confirmado automaticamente.`,
          5000,
        );
      } else {
        window.location.assign(checkoutUrl);
      }
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
    pixPaymentStatus,
    pixPaymentError,
    verifyPixPayment,
    clearPixPayment,
    executePayment,
  };
}
