import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MapPin,
  Package,
  CheckCircle,
  Clock,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  User,
  Phone,
  CreditCard,
  Bike,
  AlertCircle,
  KeyRound,
  LogOut,
  Mail,
  IdCard,
  Pencil,
  Save,
  X,
} from "lucide-react";
import * as S from "./styles";
import ordersService from "../../Services/ordersService";
import authService from "../../Services/authService";
import { connectSocket, disconnectSocket } from "../../Services/socketService";
import { useAuth } from "../../contexts/authContext";

const STATUS_LABEL = {
  PRONTO: { label: "Pronto p/ retirada", color: "#f59e0b" },
  SAIU_PARA_ENTREGA: { label: "Em entrega", color: "#3b82f6" },
  ENTREGUE: { label: "Entregue", color: "#22c55e" },
};

const PAYMENT_LABEL = {
  DINHEIRO: "Dinheiro",
  PIX: "PIX",
  CARTAO: "Cartão",
  CARTAO_DEBITO: "Débito",
  CARTAO_CREDITO: "Crédito",
};

function formatCpfDisplay(raw) {
  const d = String(raw || "")
    .replace(/\D/g, "")
    .slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function ProfilePanel({ user, onUpdated }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    cpf: formatCpfDisplay(user?.cpf),
  });

  function handleChange(e) {
    const { name, value } = e.target;
    if (name === "cpf") {
      const digits = value.replace(/\D/g, "").slice(0, 11);
      const masked = digits
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
      setForm((f) => ({ ...f, cpf: masked }));
    } else {
      setForm((f) => ({ ...f, [name]: value }));
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const updated = await authService.updateProfile({
        name: form.name,
        email: form.email,
        phone: form.phone,
      });
      onUpdated(updated);
      setEditing(false);
      setSuccess("Perfil atualizado com sucesso!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err?.response?.data?.error || "Erro ao salvar perfil.");
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setForm({
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
      cpf: formatCpfDisplay(user?.cpf),
    });
    setEditing(false);
    setError("");
  }

  const ROLE_LABEL = {
    MOTOQUEIRO: "Motoqueiro",
    FUNCIONARIO: "Funcionário",
    ADMIN: "Administrador",
  };

  return (
    <S.ProfilePanel>
      <S.ProfileAvatarRow>
        <S.ProfileAvatar>
          <User size={40} />
        </S.ProfileAvatar>
        <div>
          <S.ProfileName>{user?.name || "—"}</S.ProfileName>
          <S.ProfileRole>{ROLE_LABEL[user?.role] || user?.role}</S.ProfileRole>
        </div>
        {!editing && (
          <S.EditProfileBtn onClick={() => setEditing(true)} type="button">
            <Pencil size={15} />
            Editar
          </S.EditProfileBtn>
        )}
      </S.ProfileAvatarRow>

      {success && (
        <S.SuccessMsg>
          <CheckCircle size={14} />
          {success}
        </S.SuccessMsg>
      )}
      {error && (
        <S.ErrorMsg>
          <AlertCircle size={14} />
          {error}
        </S.ErrorMsg>
      )}

      {editing ? (
        <form onSubmit={handleSave}>
          <S.ProfileFieldsGrid>
            <S.ProfileField>
              <label>
                <User size={13} /> Nome completo
              </label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                required
              />
            </S.ProfileField>
            <S.ProfileField>
              <label>
                <Mail size={13} /> E-mail
              </label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                required
              />
            </S.ProfileField>
            <S.ProfileField>
              <label>
                <Phone size={13} /> Telefone
              </label>
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="(11) 99999-9999"
              />
            </S.ProfileField>
            <S.ProfileField>
              <label>
                <IdCard size={13} /> CPF
              </label>
              <input
                name="cpf"
                value={form.cpf || "Não informado"}
                readOnly
                disabled
                style={{ cursor: "not-allowed", opacity: 0.6 }}
              />
            </S.ProfileField>
          </S.ProfileFieldsGrid>
          <S.ProfileActions>
            <S.SaveButton type="submit" disabled={saving}>
              <Save size={15} />
              {saving ? "Salvando..." : "Salvar alterações"}
            </S.SaveButton>
            <S.CancelButton type="button" onClick={handleCancel}>
              <X size={15} />
              Cancelar
            </S.CancelButton>
          </S.ProfileActions>
        </form>
      ) : (
        <S.ProfileFieldsGrid>
          <S.ProfileInfoItem>
            <span>
              <Mail size={13} /> E-mail
            </span>
            <strong>{user?.email || "—"}</strong>
          </S.ProfileInfoItem>
          <S.ProfileInfoItem>
            <span>
              <Phone size={13} /> Telefone
            </span>
            <strong>{user?.phone || "Não informado"}</strong>
          </S.ProfileInfoItem>
          <S.ProfileInfoItem>
            <span>
              <IdCard size={13} /> CPF
            </span>
            <strong>
              {user?.cpf ? formatCpfDisplay(user.cpf) : "Não informado"}
            </strong>
          </S.ProfileInfoItem>
          <S.ProfileInfoItem>
            <span>
              <User size={13} /> Cargo
            </span>
            <strong>{ROLE_LABEL[user?.role] || user?.role || "—"}</strong>
          </S.ProfileInfoItem>
        </S.ProfileFieldsGrid>
      )}
    </S.ProfilePanel>
  );
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function getDeliveryAddress(order) {
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

function needsPinPayment(order) {
  return (
    ["PIX", "CARTAO", "CARTAO_DEBITO", "CARTAO_CREDITO"].includes(
      order.paymentMethod,
    ) && order.paid !== true
  );
}

function OrderCard({ order, onMarkDelivered, onRequestPin, onConfirmPin }) {
  const [expanded, setExpanded] = useState(false);
  const [pin, setPin] = useState("");
  const [pinMode, setPinMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);
  const [error, setError] = useState("");

  const statusInfo = STATUS_LABEL[order.status] || {};
  const canDeliver = order.status === "SAIU_PARA_ENTREGA";
  const requiresPin = needsPinPayment(order);

  async function handleMarkDelivered() {
    setLoading(true);
    setError("");
    try {
      await onMarkDelivered(order.id);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Erro ao atualizar");
    } finally {
      setLoading(false);
    }
  }

  async function handleRequestPin() {
    setPinLoading(true);
    setError("");
    try {
      await onRequestPin(order.id);
      setPinMode(true);
    } catch (e) {
      setError(
        e?.response?.data?.message || e?.message || "Erro ao solicitar PIN",
      );
    } finally {
      setPinLoading(false);
    }
  }

  async function handleConfirmPin() {
    if (!pin.trim()) return;
    setPinLoading(true);
    setError("");
    try {
      await onConfirmPin(order.id, pin.trim());
      setPinMode(false);
      setPin("");
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "PIN inválido");
    } finally {
      setPinLoading(false);
    }
  }

  return (
    <S.OrderCard>
      <S.OrderCardHeader onClick={() => setExpanded((v) => !v)}>
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
          {PAYMENT_LABEL[order.paymentMethod] || order.paymentMethod}
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
            {(order.items || []).map((item, idx) => (
              <S.ItemRow key={idx}>
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
          {requiresPin && !order.paid && (
            <>
              {!pinMode ? (
                <S.SecondaryButton
                  onClick={handleRequestPin}
                  disabled={pinLoading}
                >
                  <KeyRound size={15} />
                  {pinLoading ? "Solicitando..." : "Solicitar PIN de Pagamento"}
                </S.SecondaryButton>
              ) : (
                <S.PinRow>
                  <input
                    type="text"
                    placeholder="Digite o PIN"
                    value={pin}
                    maxLength={8}
                    onChange={(e) => setPin(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleConfirmPin()}
                  />
                  <S.PinConfirmButton
                    onClick={handleConfirmPin}
                    disabled={pinLoading || !pin.trim()}
                  >
                    {pinLoading ? "..." : "Confirmar"}
                  </S.PinConfirmButton>
                </S.PinRow>
              )}
            </>
          )}

          <S.DeliverButton
            onClick={handleMarkDelivered}
            disabled={loading || (requiresPin && !order.paid)}
            title={
              requiresPin && !order.paid
                ? "Confirme o pagamento antes de marcar como entregue"
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

export default function CourierDashboard() {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("SAIU_PARA_ENTREGA");
  const [deliveredCount, setDeliveredCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  function handleProfileUpdated(updatedUser) {
    const token = localStorage.getItem("token");
    if (token) login(updatedUser, token);
  }

  function fetchOrders() {
    setRefreshKey((k) => k + 1);
  }

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      try {
        const data = await ordersService.listRestaurantOrders();
        if (!mounted) return;
        const allOrders = Array.isArray(data) ? data : data?.orders || [];
        const deliveryOrders = allOrders.filter(
          (o) => String(o.type || "").toUpperCase() === "DELIVERY",
        );
        setOrders(deliveryOrders);
        setDeliveredCount(
          deliveryOrders.filter((o) => o.status === "ENTREGUE").length,
        );
      } catch {
        // silently fail
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [refreshKey]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const socket = connectSocket(token);

    function onStatusChanged(updatedOrder) {
      setOrders((prev) => {
        const exists = prev.find((o) => o.id === updatedOrder.id);
        if (!exists) {
          if (String(updatedOrder.type || "").toUpperCase() !== "DELIVERY")
            return prev;
          return [updatedOrder, ...prev];
        }
        return prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o));
      });
      if (updatedOrder.status === "ENTREGUE") {
        setDeliveredCount((n) => n + 1);
      }
    }

    socket.on("order:status-changed", onStatusChanged);

    return () => {
      socket.off("order:status-changed", onStatusChanged);
      disconnectSocket();
    };
  }, []);

  async function handleMarkDelivered(orderId) {
    const updated = await ordersService.updateStatus(orderId, "ENTREGUE");
    const updatedOrder = updated?.order || updated;
    setOrders((prev) =>
      prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o)),
    );
  }

  async function handleRequestPin(orderId) {
    await ordersService.requestPaymentConfirmationPin(orderId);
  }

  async function handleConfirmPin(orderId, pin) {
    const updated = await ordersService.confirmPaymentWithPin(orderId, pin);
    const updatedOrder = updated?.order || updated;
    setOrders((prev) =>
      prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o)),
    );
  }

  const filteredOrders = orders.filter((o) => o.status === activeTab);
  const prontoCount = orders.filter((o) => o.status === "PRONTO").length;
  const saiuCount = orders.filter(
    (o) => o.status === "SAIU_PARA_ENTREGA",
  ).length;
  const entregueCount = orders.filter((o) => o.status === "ENTREGUE").length;

  return (
    <S.PageWrapper>
      {/* Sidebar */}
      <S.Sidebar>
        <S.SidebarHeader>
          <S.BikeIcon>
            <Bike size={28} />
          </S.BikeIcon>
          <div>
            <h2>Olá, {user?.name?.split(" ")[0] || "Entregador"}</h2>
            <p>{user?.email || ""}</p>
          </div>
        </S.SidebarHeader>

        <S.SidebarStats>
          <S.SideStatItem>
            <Package size={18} />
            <div>
              <span>Prontos</span>
              <strong>{prontoCount}</strong>
            </div>
          </S.SideStatItem>
          <S.SideStatItem>
            <Clock size={18} />
            <div>
              <span>Em rota</span>
              <strong>{saiuCount}</strong>
            </div>
          </S.SideStatItem>
          <S.SideStatItem>
            <CheckCircle size={18} />
            <div>
              <span>Entregues hoje</span>
              <strong>{deliveredCount}</strong>
            </div>
          </S.SideStatItem>
        </S.SidebarStats>

        <S.SidebarNav>
          <S.SideNavItem
            active={activeTab === "PRONTO"}
            onClick={() => setActiveTab("PRONTO")}
          >
            <Package size={16} />
            Prontos para retirada
            {prontoCount > 0 && <S.NavBadge>{prontoCount}</S.NavBadge>}
          </S.SideNavItem>
          <S.SideNavItem
            active={activeTab === "SAIU_PARA_ENTREGA"}
            onClick={() => setActiveTab("SAIU_PARA_ENTREGA")}
          >
            <Bike size={16} />
            Em entrega
            {saiuCount > 0 && <S.NavBadge urgent>{saiuCount}</S.NavBadge>}
          </S.SideNavItem>
          <S.SideNavItem
            active={activeTab === "ENTREGUE"}
            onClick={() => setActiveTab("ENTREGUE")}
          >
            <CheckCircle size={16} />
            Entregues
            {entregueCount > 0 && <S.NavBadge>{entregueCount}</S.NavBadge>}
          </S.SideNavItem>
          <S.SideNavItem
            active={activeTab === "PERFIL"}
            onClick={() => setActiveTab("PERFIL")}
          >
            <User size={16} />
            Meu Perfil
          </S.SideNavItem>
        </S.SidebarNav>

        <S.LogoutButton
          onClick={() => {
            logout();
            navigate("/login");
          }}
        >
          <LogOut size={16} />
          Sair
        </S.LogoutButton>
      </S.Sidebar>

      {/* Conteúdo principal */}
      <S.MainArea>
        <S.TopBar>
          <S.TopBarTitle>
            {activeTab === "PRONTO"
              ? "Prontos para retirada"
              : activeTab === "SAIU_PARA_ENTREGA"
                ? "Em entrega"
                : activeTab === "ENTREGUE"
                  ? "Pedidos Entregues"
                  : "Meu Perfil"}
            {activeTab !== "PERFIL" && (
              <S.CountChip>{filteredOrders.length}</S.CountChip>
            )}
          </S.TopBarTitle>
          {activeTab !== "PERFIL" && (
            <S.RefreshButton onClick={fetchOrders} title="Atualizar">
              <RefreshCw size={16} />
              Atualizar
            </S.RefreshButton>
          )}
        </S.TopBar>

        {/* Tabs mobile */}
        <S.MobileTabs>
          <S.MobileTab
            active={activeTab === "PRONTO"}
            onClick={() => setActiveTab("PRONTO")}
          >
            <Package size={15} /> Prontos{" "}
            {prontoCount > 0 && `(${prontoCount})`}
          </S.MobileTab>
          <S.MobileTab
            active={activeTab === "SAIU_PARA_ENTREGA"}
            onClick={() => setActiveTab("SAIU_PARA_ENTREGA")}
          >
            <Bike size={15} /> Em rota {saiuCount > 0 && `(${saiuCount})`}
          </S.MobileTab>
          <S.MobileTab
            active={activeTab === "ENTREGUE"}
            onClick={() => setActiveTab("ENTREGUE")}
          >
            <CheckCircle size={15} /> Entregues{" "}
            {entregueCount > 0 && `(${entregueCount})`}
          </S.MobileTab>
          <S.MobileTab
            active={activeTab === "PERFIL"}
            onClick={() => setActiveTab("PERFIL")}
          >
            <User size={15} /> Perfil
          </S.MobileTab>
        </S.MobileTabs>

        {activeTab === "PERFIL" ? (
          <ProfilePanel user={user} onUpdated={handleProfileUpdated} />
        ) : loading ? (
          <S.EmptyState>
            <RefreshCw size={32} className="spinning" />
            <p>Carregando pedidos...</p>
          </S.EmptyState>
        ) : filteredOrders.length === 0 ? (
          <S.EmptyState>
            <Package size={40} />
            <p>
              {activeTab === "PRONTO"
                ? "Nenhum pedido pronto para retirada."
                : activeTab === "SAIU_PARA_ENTREGA"
                  ? "Nenhum pedido em rota no momento."
                  : "Nenhum pedido entregue ainda."}
            </p>
          </S.EmptyState>
        ) : (
          <S.OrdersList>
            {filteredOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onMarkDelivered={handleMarkDelivered}
                onRequestPin={handleRequestPin}
                onConfirmPin={handleConfirmPin}
              />
            ))}
          </S.OrdersList>
        )}
      </S.MainArea>
    </S.PageWrapper>
  );
}
