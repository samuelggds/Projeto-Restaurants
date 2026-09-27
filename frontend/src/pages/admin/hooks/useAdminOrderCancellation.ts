import { useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { useAppDialog } from '../../../components/AppDialog/context';
import {
  canCancelAdminOrder,
  getOrderPaymentPresentation,
  getPaymentMethodLabel,
  isOrderWaitingForCapacity,
} from '../domain/adminOrders';
import type { AdminOrder } from '../types';
import { adminErrorMessage } from '../utils/adminErrorMessage';

type Options = {
  money: (value: number) => string;
  onCancelOrder?: (id: number) => Promise<void>;
  onCancelled: () => Promise<void>;
};

export function useAdminOrderCancellation({ money, onCancelOrder, onCancelled }: Options) {
  const { confirmDialog } = useAppDialog();
  const [cancellingOrderId, setCancellingOrderId] = useState<number | null>(null);
  const busy = useRef(false);

  const cancelOrder = async (order: AdminOrder) => {
    if (!onCancelOrder || busy.current || !canCancelAdminOrder(order)) return;
    busy.current = true;
    const hasOnlinePaymentToRefund = getOrderPaymentPresentation(order).automaticRefund;
    const method = getPaymentMethodLabel(order.paymentMethod);
    const financialNotice = hasOnlinePaymentToRefund
      ? `O estorno de ${money(order.total)} será solicitado automaticamente no ${method}. O prazo para o crédito depende da instituição financeira.`
      : order.paid && order.payOnDelivery
        ? `O pagamento de ${money(order.total)} foi recebido na entrega e não possui transação online. Qualquer devolução ao cliente deve ser feita manualmente.`
        : order.paid
          ? `O pagamento de ${money(order.total)} não está identificado como Pix ou cartão online. A devolução ao cliente deve ser feita manualmente.`
          : 'Ainda não há pagamento confirmado. Se existir uma cobrança em processamento, o sistema verificará as regras de segurança antes de concluir o cancelamento.';
    const queueNotice = isOrderWaitingForCapacity(order)
      ? 'Ele será retirado da fila de espera, sem iniciar o preparo. '
      : '';

    try {
      const confirmed = await confirmDialog({
        title: hasOnlinePaymentToRefund
          ? 'Cancelar pedido e solicitar estorno?'
          : 'Cancelar pedido?',
        description: `O pedido ${order.id} de ${order.customerName} será cancelado. ${queueNotice}${financialNotice}`,
        confirmLabel: hasOnlinePaymentToRefund ? 'Cancelar e estornar' : 'Cancelar pedido',
        cancelLabel: 'Manter pedido',
        tone: 'danger',
      });
      if (!confirmed) return;

      setCancellingOrderId(order.numericId);
      await onCancelOrder(order.numericId);
      await onCancelled();
      toast.success(
        hasOnlinePaymentToRefund
          ? `Pedido ${order.id} cancelado e estorno solicitado.`
          : `Pedido ${order.id} cancelado.`,
      );
    } catch (error) {
      toast.error(
        adminErrorMessage(
          error,
          hasOnlinePaymentToRefund
            ? 'Não foi possível cancelar e solicitar o estorno.'
            : 'Não foi possível cancelar o pedido.',
        ),
      );
    } finally {
      setCancellingOrderId(null);
      busy.current = false;
    }
  };

  return { cancelOrder, cancellingOrderId };
}
