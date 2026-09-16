import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, CreditCard, QrCode, XCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import { useAppDialog } from '../../../components/AppDialog/context';
import type { AdminOrder } from '../types';

const DIGITAL_METHODS = new Set(['PIX', 'CARTAO', 'CARD', 'CREDIT_CARD', 'DEBIT_CARD']);

function isPendingOnlinePayment(order: AdminOrder) {
  const method = String(order.paymentMethod || '').trim().toUpperCase();
  const status = String(order.status || '').trim().toUpperCase();
  return (
    !order.paid &&
    order.payOnDelivery !== true &&
    DIGITAL_METHODS.has(method) &&
    status !== 'CANCELADO' &&
    status !== 'ENTREGUE'
  );
}

function methodLabel(method?: string) {
  return String(method || '').toUpperCase() === 'PIX' ? 'Pix' : 'Cartão';
}

type Props = {
  orders: AdminOrder[];
  money: (value: number) => string;
  onConfirmPayment: (id: number) => Promise<void>;
  onCancelOrder: (id: number) => Promise<void>;
};

export function AdminPendingPayments({ orders, money, onConfirmPayment, onCancelOrder }: Props) {
  const { confirmDialog } = useAppDialog();
  const [busyOrderId, setBusyOrderId] = useState<number | null>(null);
  const pendingOrders = useMemo(() => orders.filter(isPendingOnlinePayment), [orders]);

  if (!pendingOrders.length) return null;

  const confirmManually = async (order: AdminOrder) => {
    const method = methodLabel(order.paymentMethod);
    const confirmed = await confirmDialog({
      title: `Confirmar manualmente o pagamento do pedido ${order.id}?`,
      description: `Use esta ação somente depois de conferir diretamente no ${method}/provedor que ${money(order.total)} foi realmente recebido. Ela libera o pedido para o fluxo operacional mesmo sem a confirmação automática do webhook.`,
      confirmLabel: 'Já conferi e recebi',
      cancelLabel: 'Voltar',
    });
    if (!confirmed) return;

    setBusyOrderId(order.numericId);
    try {
      await onConfirmPayment(order.numericId);
      toast.success(`Pagamento do pedido ${order.id} confirmado pelo administrador.`);
    } catch {
      toast.error('Não foi possível confirmar esse pagamento. Confira o pedido e tente novamente.');
    } finally {
      setBusyOrderId(null);
    }
  };

  const cancelPending = async (order: AdminOrder) => {
    const confirmed = await confirmDialog({
      title: `Cancelar o pedido ${order.id}?`,
      description: `Este pedido ainda não possui pagamento confirmado. Cancele somente depois de verificar que não houve recebimento no provedor.`,
      confirmLabel: 'Cancelar pedido',
      cancelLabel: 'Manter pedido',
      tone: 'danger',
    });
    if (!confirmed) return;

    setBusyOrderId(order.numericId);
    try {
      await onCancelOrder(order.numericId);
      toast.success(`Pedido ${order.id} cancelado.`);
    } catch {
      toast.error('Não foi possível cancelar esse pedido. Tente novamente.');
    } finally {
      setBusyOrderId(null);
    }
  };

  return (
    <section
      aria-label="Pagamentos online pendentes"
      style={{
        marginBottom: 20,
        border: '1px solid #f59e0b55',
        borderRadius: 18,
        background: '#fffbeb',
        color: '#1f2937',
        padding: 18,
      }}
    >
      <header style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 14 }}>
        <AlertTriangle aria-hidden="true" size={22} />
        <div>
          <strong style={{ display: 'block', fontSize: 16 }}>Pagamentos online aguardando confirmação</strong>
          <span style={{ display: 'block', marginTop: 4, color: '#6b7280', fontSize: 13 }}>
            Estes pedidos ficam fora da cozinha enquanto não estiverem pagos. Confira o provedor antes de intervir manualmente.
          </span>
        </div>
      </header>

      <div style={{ display: 'grid', gap: 10 }}>
        {pendingOrders.map((order) => {
          const method = methodLabel(order.paymentMethod);
          const busy = busyOrderId === order.numericId;
          return (
            <article
              key={order.numericId}
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                border: '1px solid #e5e7eb',
                borderRadius: 14,
                background: '#fff',
                padding: 14,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {method === 'Pix' ? <QrCode aria-hidden="true" size={20} /> : <CreditCard aria-hidden="true" size={20} />}
                <div>
                  <strong>{order.id} · {order.customerName}</strong>
                  <span style={{ display: 'block', marginTop: 2, color: '#6b7280', fontSize: 13 }}>
                    {method} online · {money(order.total)} · não pago
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void confirmManually(order)}
                  aria-label={`Confirmar manualmente pagamento do pedido ${order.id}`}
                  style={{ padding: '9px 12px', borderRadius: 10, border: '1px solid #15803d', background: '#15803d', color: '#fff' }}
                >
                  <CheckCircle2 aria-hidden="true" size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                  {busy ? 'Processando...' : 'Confirmar como pago'}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void cancelPending(order)}
                  aria-label={`Cancelar pagamento pendente do pedido ${order.id}`}
                  style={{ padding: '9px 12px', borderRadius: 10, border: '1px solid #dc2626', background: '#fff', color: '#b91c1c' }}
                >
                  <XCircle aria-hidden="true" size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                  Cancelar pedido
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
