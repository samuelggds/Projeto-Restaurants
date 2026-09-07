import { useCallback, useEffect, useRef, useState } from 'react';
import ordersService from '../../../Services/ordersService';
import type { CheckoutPaymentMethod, ResolvedCheckoutPaymentMethod } from '../domain/checkout';
import customerPaymentMethodService from '../../../Services/customerPaymentMethodService';
import {
  getUnsuccessfulPaymentOutcome,
  type TerminalPaymentOutcome,
} from '../domain/paymentOutcome';
import type { PaymentResultStatus } from '../../../components/payment/PaymentResultView';

export type PixPaymentData = {
  restaurantId?: number;
  orderId: number | null;
  total: number;
  paymentId?: string;
  provider: string;
  pixCode: string;
  qrCodeBase64: string | null;
  requiresStatusCheck?: boolean;
  paid?: boolean;
};

export type PixPaymentStatus =
  'WAITING' | 'VERIFYING' | 'PENDING' | 'ERROR' | TerminalPaymentOutcome;

export type CheckoutPaymentResult = {
  restaurantId: number;
  status: PaymentResultStatus;
  method: 'Cartão';
  orderId: number | null;
  total: number;
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
    if (typeof firstMessage === 'string') return getCheckoutErrorMessage(firstMessage);
    return '';
  }

  const message = String(candidate).trim();
  if (!message)
    return 'Não conseguimos concluir o pagamento neste momento. Tente outra forma ou tente novamente em alguns minutos.';

  if (!message.startsWith('[')) {
    const normalized = message.toLowerCase();
    const hidesTechnicalConfig =
      (normalized.includes('access token') ||
        normalized.includes('configur') ||
        normalized.includes('mercado pago') ||
        normalized.includes('pagbank') ||
        normalized.includes('asaas') ||
        normalized.includes('gateway') ||
        normalized.includes('credencial') ||
        normalized.includes('token') ||
        normalized.includes('integração') ||
        normalized.includes('integracao')) &&
      !/cart(?:ã|a)o|cvv|dados do cart(?:ã|a)o|dados do pagamento/i.test(message);

    if (hidesTechnicalConfig) {
      return 'Não conseguimos concluir o pagamento neste momento. Tente outra forma ou tente novamente em alguns minutos.';
    }

    return message;
  }

  try {
    const issues = JSON.parse(message) as Array<{ message?: unknown }>;
    const firstMessage = issues.find((issue) => typeof issue?.message === 'string')?.message;
    if (typeof firstMessage !== 'string') {
      return 'Não conseguimos concluir o pagamento neste momento. Tente outra forma ou tente novamente em alguns minutos.';
    }
    return getCheckoutErrorMessage(firstMessage);
  } catch {
    return 'Não conseguimos concluir o pagamento neste momento. Tente outra forma ou tente novamente em alguns minutos.';
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
  const pixIsTerminal = ['PAID', 'FAILED', 'CANCELED', 'EXPIRED', 'REFUNDED'].includes(
    pixPaymentStatus,
  );
  const [pixPaymentError, setPixPaymentError] = useState<string | null>(null);
  const [paymentResult, setPaymentResult] = useState<CheckoutPaymentResult | null>(null);
  const pixCheckInFlightRef = useRef(false);
  const pixConfirmedRef = useRef(false);
  const pixTerminalRef = useRef<TerminalPaymentOutcome | null>(null);
  const attemptRef = useRef(0);
  const currentRestaurantRef = useRef(restaurantId);
  const onPaymentConfirmedRef = useRef(onPaymentConfirmed);

  useEffect(() => {
    onPaymentConfirmedRef.current = onPaymentConfirmed;
  }, [onPaymentConfirmed]);

  useEffect(() => {
    currentRestaurantRef.current = restaurantId;
    return () => {
      attemptRef.current += 1;
      pixCheckInFlightRef.current = false;
    };
  }, [restaurantId]);

  const verifyPixPayment = useCallback(
    async (background = false): Promise<PixPaymentStatus> => {
      if (pixPaymentData?.restaurantId && pixPaymentData.restaurantId !== restaurantId)
        return 'ERROR';
      if (pixTerminalRef.current) return pixTerminalRef.current;
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
      const attempt = attemptRef.current;
      const isCurrent = () =>
        attempt === attemptRef.current && currentRestaurantRef.current === restaurantId;
      if (!background) {
        setPixPaymentStatus('VERIFYING');
        setPixPaymentError(null);
      }
      try {
        const providerStatus = await ordersService.getPixPaymentStatus({
          paymentId: pixPaymentData.paymentId,
          restaurantId,
        });
        if (!isCurrent()) return 'ERROR';
        if (providerStatus?.sameRestaurant === false)
          throw new Error('Não foi possível verificar este pagamento.');
        const unsuccessful = getUnsuccessfulPaymentOutcome(providerStatus?.status);
        if (unsuccessful) {
          pixTerminalRef.current = unsuccessful;
          setPixPaymentStatus(unsuccessful);
          return unsuccessful;
        }
        if (providerStatus?.isApproved !== true) {
          setPixPaymentStatus('PENDING');
          return 'PENDING';
        }

        const confirmedOrder = await ordersService.confirmPixPayment({
          orderId: pixPaymentData.orderId,
          paymentId: pixPaymentData.paymentId,
          restaurantId,
        });
        if (!isCurrent()) return 'ERROR';
        if (confirmedOrder?.paid !== true) {
          setPixPaymentStatus('ERROR');
          setPixPaymentError(
            'Seu pedido ainda aguarda confirmação. Aguarde um instante e verifique novamente.',
          );
          return 'ERROR';
        }

        pixConfirmedRef.current = true;
        pixTerminalRef.current = 'PAID';
        setPixPaymentData((current) => (current ? { ...current, paid: true } : current));
        setPixPaymentStatus('PAID');
        try {
          await onPaymentConfirmedRef.current();
        } catch {
          // Atualizações auxiliares não alteram a confirmação canônica já recebida.
        }
        return 'PAID';
      } catch (error: unknown) {
        if (!isCurrent()) return 'ERROR';
        setPixPaymentStatus('ERROR');
        setPixPaymentError(
          getCheckoutErrorMessage(error) ||
            'Não foi possível consultar o pagamento agora. O pedido continua sem confirmação.',
        );
        return 'ERROR';
      } finally {
        if (isCurrent()) pixCheckInFlightRef.current = false;
      }
    },
    [pixPaymentData, restaurantId],
  );

  useEffect(() => {
    if (
      !pixPaymentData?.requiresStatusCheck ||
      pixPaymentData.paid ||
      !pixPaymentData.paymentId ||
      !pixPaymentData.orderId ||
      (pixPaymentData.restaurantId && pixPaymentData.restaurantId !== restaurantId) ||
      pixIsTerminal ||
      !restaurantId
    )
      return;

    const initialCheckId = window.setTimeout(() => void verifyPixPayment(), 0);
    const intervalId = window.setInterval(() => {
      if (!document.hidden) void verifyPixPayment(true);
    }, 5000);
    return () => {
      window.clearTimeout(initialCheckId);
      window.clearInterval(intervalId);
    };
  }, [pixPaymentData, pixIsTerminal, restaurantId, verifyPixPayment]);

  const clearPixPayment = useCallback(() => {
    attemptRef.current += 1;
    pixCheckInFlightRef.current = false;
    pixConfirmedRef.current = false;
    pixTerminalRef.current = null;
    setPixPaymentData(null);
    setPixPaymentStatus('WAITING');
    setPixPaymentError(null);
  }, []);

  const executePayment = async (
    payload: Record<string, unknown>,
    paymentMethod: CheckoutPaymentMethod,
    payOnDelivery: boolean,
    resolvedPaymentMethod: ResolvedCheckoutPaymentMethod,
  ) => {
    if (checkoutLoading) return false;
    setCheckoutLoading(true);
    const checkoutAttempt = ++attemptRef.current;
    const isCurrentCheckout = () =>
      checkoutAttempt === attemptRef.current && currentRestaurantRef.current === restaurantId;
    try {
      if (paymentMethod === 'pickup_store') {
        const order = await ordersService.createOrder(payload);
        onPurchased();
        onClearCart();
        onCloseCart();
        notify(
          'success',
          `Pedido #${String(order?.id || '')} recebido`,
          'Seu pedido será preparado. O pagamento será feito no restaurante quando você retirar.',
          6000,
        );
        return true;
      }

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
        if (!isCurrentCheckout()) return false;
        setPixPaymentData({
          restaurantId: restaurantId || undefined,
          orderId: Number(result.orderId) || null,
          total: Number(result.totalAmount || cartTotal),
          paymentId: String(result.paymentId || ''),
          provider: String(result.provider || 'PIX'),
          pixCode: String(result.qrCode || ''),
          qrCodeBase64: result.qrCodeBase64 ? String(result.qrCodeBase64) : null,
          requiresStatusCheck: Boolean(result.requiresStatusCheck),
        });
        pixConfirmedRef.current = false;
        pixTerminalRef.current = null;
        pixCheckInFlightRef.current = false;
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
      if (!isCurrentCheckout()) return false;
      const checkoutUrl = String(result.checkoutUrl || '');
      if (result.paid !== true && !/^https:\/\//i.test(checkoutUrl)) {
        throw new Error('O serviço de pagamento não retornou um endereço seguro.');
      }
      onPurchased();
      onClearCart();
      if (result.paid === true && restaurantId) {
        onCloseCart();
        setPaymentResult({
          restaurantId,
          status: 'PAID',
          method: 'Cartão',
          orderId: Number(result.orderId) || null,
          total: Number(result.totalAmount ?? cartTotal),
        });
        try {
          await onPaymentConfirmedRef.current();
        } catch {
          // A atualização do cardápio não altera um pagamento já confirmado.
        }
      } else {
        window.location.assign(checkoutUrl);
      }
      return true;
    } catch (error: unknown) {
      if (!isCurrentCheckout()) return false;
      notify(
        'error',
        paymentMethod === 'pickup_store'
          ? 'Não foi possível criar o pedido para retirada'
          : 'Não foi possível iniciar o pagamento',
        getCheckoutErrorMessage(error) || 'Confira os dados do pedido e tente novamente.',
      );
      return false;
    } finally {
      setCheckoutLoading(false);
    }
  };

  return {
    checkoutLoading,
    pixPaymentData:
      pixPaymentData?.restaurantId && pixPaymentData.restaurantId !== restaurantId
        ? null
        : pixPaymentData,
    paymentResult: paymentResult?.restaurantId === restaurantId ? paymentResult : null,
    clearPaymentResult: () => setPaymentResult(null),
    setPixPaymentData,
    pixPaymentStatus,
    pixPaymentError,
    verifyPixPayment,
    clearPixPayment,
    executePayment,
  };
}
