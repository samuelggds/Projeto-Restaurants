import { useCallback, useEffect, useRef, useState } from 'react';
import ordersService from '../../../Services/ordersService';
import type { OrderType } from '../domain/checkout';
import { getCheckoutErrorMessage } from './useCheckoutPayments';

export type CardPaymentReturnStatus = 'VERIFYING' | 'PENDING' | 'PAID' | 'CANCELED' | 'ERROR';

type Options = {
  restaurantId: number | null;
  orderPublicId: string;
  orderType: OrderType;
  providerReturnStatus: string;
  onPaymentConfirmed: () => void | Promise<void>;
};

type StatusState = {
  requestKey: string;
  status: CardPaymentReturnStatus;
  error: string | null;
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
  });
  const inFlightKeyRef = useRef('');
  const terminalStatusRef = useRef<{
    requestKey: string;
    status: Extract<CardPaymentReturnStatus, 'PAID' | 'CANCELED'>;
  } | null>(null);
  const notifiedKeyRef = useRef('');
  const onPaymentConfirmedRef = useRef(onPaymentConfirmed);

  useEffect(() => {
    onPaymentConfirmedRef.current = onPaymentConfirmed;
  }, [onPaymentConfirmed]);

  const verify = useCallback(async (): Promise<CardPaymentReturnStatus> => {
    if (!requestKey || !restaurantId || !orderPublicId) return 'ERROR';
    if (terminalStatusRef.current?.requestKey === requestKey) {
      return terminalStatusRef.current.status;
    }
    if (inFlightKeyRef.current === requestKey) return 'VERIFYING';

    inFlightKeyRef.current = requestKey;
    setState({ requestKey, status: 'VERIFYING', error: null });
    try {
      const response = await ordersService.getCardPaymentStatus({
        orderPublicId,
        restaurantId,
        type: orderType,
      });
      const status: CardPaymentReturnStatus =
        response?.status === 'CANCELED'
          ? 'CANCELED'
          : response?.status === 'PAID' && response?.paid === true
            ? 'PAID'
            : 'PENDING';

      setState({ requestKey, status, error: null });
      if (status === 'PAID' || status === 'CANCELED') {
        terminalStatusRef.current = { requestKey, status };
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
      setState({
        requestKey,
        status: 'ERROR',
        error:
          getCheckoutErrorMessage(error) ||
          'Não foi possível consultar o pedido. Nenhum pagamento foi confirmado nesta tela.',
      });
      return 'ERROR';
    } finally {
      if (inFlightKeyRef.current === requestKey) inFlightKeyRef.current = '';
    }
  }, [orderPublicId, orderType, requestKey, restaurantId]);

  useEffect(() => {
    if (!requestKey) return undefined;
    const initialCheck = window.setTimeout(() => void verify(), 0);
    const intervalId = window.setInterval(() => void verify(), 5_000);
    return () => {
      window.clearTimeout(initialCheck);
      window.clearInterval(intervalId);
    };
  }, [requestKey, verify]);

  return {
    status: state.requestKey === requestKey ? state.status : 'VERIFYING',
    error: state.requestKey === requestKey ? state.error : null,
    providerReturnStatus,
    verify,
  };
}
