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
  payOnDelivery?: boolean;
  payOnDeliveryMethod?: string;
  paid?: boolean;
  user?: {
    name?: string;
    phone?: string;
  };
  items?: OrderItem[];
  notes?: string;
  observation?: string;
  address?: string;
  number?: string;
  complement?: string;
  district?: string;
  city?: string;
  state?: string;
  pointReference?: string;
};

type OrderCardProps = {
  order: Order;
  onClaimDelivery?: (orderId: number) => Promise<void>;
  onMarkDelivered: (
    orderId: number,
    deliveryConfirmationCode: string,
  ) => Promise<void>;
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
  const rawComplement = String(order?.complement || "").trim();
  const complementWithoutReference = rawComplement
    .replace(/\|?\s*Ref\.:\s*.+$/i, "")
    .replace(/\|?\s*Ponto de referencia:\s*.+$/i, "")
    .trim();

  const parts = [
    order.address,
    order.number,
    complementWithoutReference,
    order.district,
    order.city,
    order.state,
  ].filter(Boolean);

  return parts.length ? parts.join(", ") : "Endereço não informado";
}

function getReferencePoint(order: Order) {
  const explicitReference = String(order?.pointReference || "").trim();
  if (explicitReference) {
    return explicitReference;
  }

  const complement = String(order?.complement || "").trim();
  const complementMatch = complement.match(
    /(?:^|\|)\s*(?:Ref\.:|Ponto de referencia:)\s*(.+)$/i,
  );
  if (complementMatch?.[1]) {
    return complementMatch[1].trim();
  }

  const observation = String(order?.observation || order?.notes || "").trim();
  const observationMatch = observation.match(
    /(?:^|\|)\s*(?:Ref\.:|Ponto de referencia:)\s*(.+)$/i,
  );
  if (observationMatch?.[1]) {
    return observationMatch[1].trim();
  }

  return "";
}

function requiresConfirmedPayment(
  order: Order,
  digitalPaymentMethods: Set<string>,
) {
  const payOnDeliveryMethod = getPayOnDeliveryMethod(order);
  if (payOnDeliveryMethod) {
    return false;
  }

  const paymentMethod = String(order?.paymentMethod || "").toUpperCase();
  return digitalPaymentMethods.has(paymentMethod) && order?.paid !== true;
}

function getPayOnDeliveryMethod(order: Order) {
  const structuredMethod = String(order?.payOnDeliveryMethod || "")
    .trim()
    .toUpperCase();

  if (order?.payOnDelivery && structuredMethod) {
    return structuredMethod;
  }

  const rawObservation = String(order?.notes || order?.observation || "");
  const match = rawObservation
    .toUpperCase()
    .match(/PAY_ON_DELIVERY:\s*(PIX|CARTAO|DINHEIRO)/);
  return match?.[1] || null;
}

export default function OrderCard({
  order,
  onClaimDelivery,
  onMarkDelivered,
  digitalPaymentMethods,
  paymentLabel,
  statusLabel,
}: OrderCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deliveryCode, setDeliveryCode] = useState("");
  const canClaim = order.status === "PRONTO" && Boolean(onClaimDelivery);

  const statusInfo = statusLabel[order.status] || {
    label: order.status,
    color: "#64748b",
  };
  const canDeliver = order.status === "SAIU_PARA_ENTREGA";
  const paymentPendingConfirmation = requiresConfirmedPayment(
    order,
    digitalPaymentMethods,
  );
  const payOnDeliveryMethod = getPayOnDeliveryMethod(order);
  const normalizedDeliveryCode = String(deliveryCode || "").replace(/\D/g, "");
  const isDeliveryCodeValid = /^\d{4}$/.test(normalizedDeliveryCode);
  const paymentStatusLabel = order.paid ? "Pago" : "Nao pago";
  const orderObservation = String(order.notes || order.observation || "")
    .replace(/\s*\|?\s*PAY_ON_DELIVERY:\s*(PIX|CARTAO|DINHEIRO)\s*\|?/gi, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/^\|\s*|\s*\|$/g, "")
    .trim();
  const orderReferencePoint = getReferencePoint(order);
  const paymentStatusChipStyle = {
    color: order.paid ? "#166534" : "#991b1b",
    background: order.paid ? "#dcfce7" : "#fee2e2",
    border: order.paid
      ? "1px solid rgba(34, 197, 94, 0.35)"
      : "1px solid rgba(239, 68, 68, 0.35)",
    fontWeight: 800,
  };

  async function handleMarkDelivered() {
    if (!isDeliveryCodeValid) {
      setError("Digite exatamente 4 dígitos para confirmar a entrega.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await onMarkDelivered(order.id, normalizedDeliveryCode);
    } catch (err) {
      const message =
        (
          err as {
            response?: { data?: { message?: string; error?: string } };
            message?: string;
          }
        )?.response?.data?.message ||
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ||
        (err as { message?: string })?.message ||
        "Erro ao atualizar";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleClaimDelivery() {
    if (!onClaimDelivery) return;
    setLoading(true);
    setError("");
    try {
      await onClaimDelivery(order.id);
    } catch (err) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || "Não foi possível retirar este pedido.";
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
        </S.InfoChip>
        <S.InfoChip style={paymentStatusChipStyle}>
          <CreditCard size={13} />
          {paymentStatusLabel}
        </S.InfoChip>
        {payOnDeliveryMethod ? (
          <S.InfoChip
            style={{
              color: "#1d4ed8",
              background: "#dbeafe",
              border: "1px solid rgba(59, 130, 246, 0.35)",
              fontWeight: 800,
            }}
          >
            <CreditCard size={13} />
            {`Pagar na entrega (${paymentLabel[payOnDeliveryMethod] || payOnDeliveryMethod})`}
          </S.InfoChip>
        ) : null}
      </S.OrderSummaryRow>

      <S.AddressRow>
        <MapPin size={14} />
        <span>{getDeliveryAddress(order)}</span>
      </S.AddressRow>

      {orderReferencePoint ? (
        <S.DetailRow>
          <MapPin size={14} />
          <span>Ponto de referência: {orderReferencePoint}</span>
        </S.DetailRow>
      ) : null}

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

          {orderObservation && (
            <S.NotesBox>
              <strong>Obs:</strong> {orderObservation}
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

      {canClaim && (
        <S.CardActions>
          <S.DeliveryHint>
            Confirme a retirada somente quando o pedido estiver com você.
          </S.DeliveryHint>
          <S.ActionButton type="button" onClick={handleClaimDelivery} disabled={loading}>
            {loading ? "Confirmando retirada..." : "Retirar e iniciar entrega"}
          </S.ActionButton>
        </S.CardActions>
      )}

      {canDeliver && (
        <S.CardActions>
          <S.DeliveryHint>
            Peça ao cliente os 4 últimos dígitos do celular e digite abaixo para
            concluir a entrega.
          </S.DeliveryHint>
          <S.DeliveryCodeInput
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            value={deliveryCode}
            onChange={(event) => {
              setDeliveryCode(
                event.target.value.replace(/\D/g, "").slice(0, 4),
              );
              if (error) {
                setError("");
              }
            }}
            placeholder="4 últimos dígitos do celular"
          />
          <S.DeliverButton
            onClick={handleMarkDelivered}
            disabled={
              loading || paymentPendingConfirmation || !isDeliveryCodeValid
            }
            title={
              paymentPendingConfirmation
                ? "Pagamento ainda não confirmado"
                : !isDeliveryCodeValid
                  ? "Digite os 4 dígitos para concluir"
                  : ""
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
