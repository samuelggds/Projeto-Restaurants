import { useCallback, useEffect, useRef, useState } from 'react';
import ordersService from '../../../Services/ordersService';
import type { OrderType } from '../domain/checkout';
import { getCheckoutErrorMessage } from './useCheckoutPayments';
import {
  getUnsuccessfulPaymentOutcome,
  type TerminalPaymentOutcome,
} from '../domain/paymentOutcome';

export type CardPaymentReturnStatus = 'VERIFYING' | 'PENDING' | 'ERROR' | TerminalPaymentOutcome;

type Options = {
  restaurantId: number | null;
  orderPublicId: string;
  orderType: OrderType;
  providerReturnStatus: string;
  onPaymentConfirmed: () => void | Promise<void>;
};

export type CardPaymentReturnDetails = {
  orderId?: number | null;
  orderPublicId?: string;
  restaurantId?: number;
  restaurantName?: string;
  restaurantLogoUrl?: string | null;
  deliveryTime?: string | null;
  totalAmount?: number;
  paidAt?: string | null;
  kitchenPrintedAt?: string | null;
  cardPaymentType?: 'credit' | 'debit';
  cardBrand?: string | null;
  cardLast4?: string | null;
};

type StatusState = {
  requestKey: string;
  status: CardPaymentReturnStatus;
  error: string | null;
  details: CardPaymentReturnDetails | null;
};

export function useCardPaymentReturn({
  restaurantId,
  orderPublicId,
  orderType,
  providerReturnStatus,
  onPaymentConfirmed,
}: Options) {
  const requestKey =
    restaurantId && orderPublicId ? `${restaurantId}:${orderType}:${orderPublicId}` : '';
  const [state, setState] = useState<StatusState>({
    requestKey: '',
    status: 'VERIFYING',
    error: null,
    details: null,
  });
  const inFlightKeyRef = useRef('');
  const activeRequestKeyRef = useRef(requestKey);
  const terminalStatusRef = useRef<{
    requestKey: string;
    status: TerminalPaymentOutcome;
  } | null>(null);
  const notifiedKeyRef = useRef('');
  const onPaymentConfirmedRef = useRef(onPaymentConfirmed);

  useEffect(() => {
    onPaymentConfirmedRef.current = onPaymentConfirmed;
  }, [onPaymentConfirmed]);

  useEffect(() => {
    activeRequestKeyRef.current = requestKey;
    return () => {
      activeRequestKeyRef.current = '';
    };
  }, [requestKey]);

  const verify = useCallback(
    async (background = false): Promise<CardPaymentReturnStatus> => {
      if (!requestKey || !restaurantId || !orderPublicId) return 'ERROR';
      if (terminalStatusRef.current?.requestKey === requestKey) {
        return terminalStatusRef.current.status;
      }
      if (inFlightKeyRef.current === requestKey) return 'VERIFYING';

      inFlightKeyRef.current = requestKey;
      if (!background) setState((current) => ({ requestKey, status: 'VERIFYING', error: null, details: current.details }));
      try {
        const response = await ordersService.getCardPaymentStatus({
          orderPublicId,
          restaurantId,
          type: orderType,
        });
        if (activeRequestKeyRef.current !== requestKey) return 'ERROR';
        const unsuccessful = getUnsuccessfulPaymentOutcome(response?.status);
        const status: CardPaymentReturnStatus = unsuccessful
          ? unsuccessful
          : response?.status === 'PAID' && response?.paid === true
            ? 'PAID'
            : 'PENDING';

        setState({
          requestKey,
          status,
          error: null,
          details: {
            orderId: response?.orderId,
            orderPublicId: response?.orderPublicId,
            restaurantId: response?.restaurantId,
            restaurantName: response?.restaurantName,
            restaurantLogoUrl: response?.restaurantLogoUrl,
            deliveryTime: response?.deliveryTime,
            totalAmount: response?.totalAmount,
            paidAt: response?.paidAt,
            kitchenPrintedAt: response?.kitchenPrintedAt,
            cardPaymentType:
              response?.paymentAttempt?.cardPaymentType === 'debit' ? 'debit' : 'credit',
            cardBrand: response?.paymentAttempt?.cardBrand || 'card',
            cardLast4: response?.paymentAttempt?.cardLast4 || null,
          },
        });
        if (status === 'PAID' || unsuccessful) {
          terminalStatusRef.current = { requestKey, status: unsuccessful || 'PAID' };
        }
        if (status === 'PAID' && notifiedKeyRef.current !== requestKey) {
          notifiedKeyRef.current = requestKey;
          try {
            await onPaymentConfirmedRef.current();
          } catch {
            // A leitura canônica permanece válida mesmo se uma atualização auxiliar falhar.
          }
        }
        return status;
      } catch (error: unknown) {
        if (activeRequestKeyRef.current !== requestKey) return 'ERROR';
        setState((current) => ({
          requestKey,
          status: 'ERROR',
          error:
            getCheckoutErrorMessage(error) ||
            'Não conseguimos consultar o pagamento agora. Se você já pagou, aguarde e consulte novamente antes de fazer outra tentativa.',
          details: current.requestKey === requestKey ? current.details : null,
        }));
        return 'ERROR';
      } finally {
        if (inFlightKeyRef.current === requestKey) inFlightKeyRef.current = '';
      }
    },
    [orderPublicId, orderType, requestKey, restaurantId],
  );

  const status = state.requestKey === requestKey ? state.status : 'VERIFYING';
  const terminal = ['PAID', 'FAILED', 'CANCELED', 'EXPIRED', 'REFUNDED'].includes(status);

  useEffect(() => {
    if (!requestKey || terminal) return undefined;
    const initialCheck = window.setTimeout(() => void verify(), 0);
    const intervalId = window.setInterval(() => {
      if (!document.hidden) void verify(true);
    }, 5_000);
    return () => {
      window.clearTimeout(initialCheck);
      window.clearInterval(intervalId);
    };
  }, [requestKey, terminal, verify]);

  return {
    status,
    error: state.requestKey === requestKey ? state.error : null,
    providerReturnStatus,
    details: state.requestKey === requestKey ? state.details : null,
    verify,
  };
}
