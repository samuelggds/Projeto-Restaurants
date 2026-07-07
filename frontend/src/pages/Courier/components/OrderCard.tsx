import { useState } from "react";
import {
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  CreditCard,
  MapPin,
  Phone,
  User,
} from "lucide-react";
import * as S from "../styles";

type OrderItem = {
  quantity: number;
  price: number;
  product?: {
    name?: string;
  };
};

type Order = {
  id: number;
  status: string;
  total: number;
  paymentMethod?: string;
  paid?: boolean;
  user?: {
    name?: string;
    phone?: string;
  };
  items?: OrderItem[];
  notes?: string;
  address?: string;
  number?: string;
  complement?: string;
  district?: string;
  city?: string;
  state?: string;
};

type OrderCardProps = {
  order: Order;
  onMarkDelivered: (orderId: number) => Promise<void>;
  digitalPaymentMethods: Set<string>;
  paymentLabel: Record<string, string>;
  statusLabel: Record<string, { label: string; color: string }>;
};

function formatCurrency(value: number) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function getDeliveryAddress(order: Order) {
  const parts = [
    order.address,
    order.number,
    order.complement,
    order.district,
    order.city,
    order.state,
  ].filter(Boolean);

  return parts.length ? parts.join(", ") : "Endereço não informado";
}

function requiresConfirmedPayment(
  order: Order,
  digitalPaymentMethods: Set<string>,
) {
  const paymentMethod = String(order?.paymentMethod || "").toUpperCase();
  return digitalPaymentMethods.has(paymentMethod) && order?.paid !== true;
}

export default function OrderCard({
  order,
  onMarkDelivered,
  digitalPaymentMethods,
  paymentLabel,
  statusLabel,
}: OrderCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const statusInfo = statusLabel[order.status] || {
    label: order.status,
    color: "#64748b",
  };
  const canDeliver = order.status === "SAIU_PARA_ENTREGA";
  const paymentPendingConfirmation = requiresConfirmedPayment(
    order,
    digitalPaymentMethods,
  );

  async function handleMarkDelivered() {
    setLoading(true);
    setError("");
    try {
      await onMarkDelivered(order.id);
    } catch (err) {
      const message =
        (
          err as {
            response?: { data?: { message?: string } };
            message?: string;
          }
        )?.response?.data?.message ||
        (err as { message?: string })?.message ||
        "Erro ao atualizar";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <S.OrderCard>
      <S.OrderCardHeader onClick={() => setExpanded((value) => !value)}>
        <S.OrderMeta>
          <S.OrderId>Pedido #{order.id}</S.OrderId>
          <S.StatusBadgeInline color={statusInfo.color}>
            {statusInfo.label}
          </S.StatusBadgeInline>
        </S.OrderMeta>
        <S.OrderTopRight>
          <S.OrderTotal>{formatCurrency(order.total)}</S.OrderTotal>
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </S.OrderTopRight>
      </S.OrderCardHeader>

      <S.OrderSummaryRow>
        <S.InfoChip>
          <User size={13} />
          {order.user?.name || "Cliente"}
        </S.InfoChip>
        <S.InfoChip>
          <CreditCard size={13} />
          {paymentLabel[order.paymentMethod || ""] || order.paymentMethod}
          {order.paid && " ✓"}
        </S.InfoChip>
      </S.OrderSummaryRow>

      <S.AddressRow>
        <MapPin size={14} />
        <span>{getDeliveryAddress(order)}</span>
      </S.AddressRow>

      {expanded && (
        <S.ExpandedContent>
          {order.user?.phone && (
            <S.DetailRow>
              <Phone size={14} />
              <span>{order.user.phone}</span>
            </S.DetailRow>
          )}

          <S.ItemsList>
            {(order.items || []).map((item, index) => (
              <S.ItemRow key={`${order.id}-${index}`}>
                <span>
                  {item.quantity}x {item.product?.name || "Item"}
                </span>
                <span>{formatCurrency(item.price * item.quantity)}</span>
              </S.ItemRow>
            ))}
          </S.ItemsList>

          {order.notes && (
            <S.NotesBox>
              <strong>Obs:</strong> {order.notes}
            </S.NotesBox>
          )}
        </S.ExpandedContent>
      )}

      {error && (
        <S.ErrorMsg>
          <AlertCircle size={14} />
          {error}
        </S.ErrorMsg>
      )}

      {canDeliver && (
        <S.CardActions>
          <S.DeliverButton
            onClick={handleMarkDelivered}
            disabled={loading || paymentPendingConfirmation}
            title={
              paymentPendingConfirmation ? "Pagamento ainda não confirmado" : ""
            }
          >
            <CheckCircle size={16} />
            {loading ? "Atualizando..." : "Marcar como Entregue"}
          </S.DeliverButton>
        </S.CardActions>
      )}
    </S.OrderCard>
  );
}
