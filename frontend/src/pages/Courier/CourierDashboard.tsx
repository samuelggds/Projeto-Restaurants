import { lazy, Suspense, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Package,
  CheckCircle,
  Clock,
  RefreshCw,
  User,
  Bike,
  ShieldAlert,
  LogOut,
} from "lucide-react";
import * as S from "./styles";
import ordersService from "../../Services/ordersService";
import { connectSocket, disconnectSocket } from "../../Services/socketService";
import { useAuth } from "../../contexts/authContext";

const ProfilePanel = lazy(() => import("./components/ProfilePanel"));
const OrderCard = lazy(() => import("./components/OrderCard"));

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
const DIGITAL_PAYMENT_METHODS = new Set([
  "PIX",
  "CARTAO",
  "CARTAO_DEBITO",
  "CARTAO_CREDITO",
]);

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
            $active={activeTab === "PRONTO"}
            onClick={() => setActiveTab("PRONTO")}
          >
            <Package size={16} />
            Prontos para retirada
            {prontoCount > 0 && <S.NavBadge>{prontoCount}</S.NavBadge>}
          </S.SideNavItem>
          <S.SideNavItem
            $active={activeTab === "SAIU_PARA_ENTREGA"}
            onClick={() => setActiveTab("SAIU_PARA_ENTREGA")}
          >
            <Bike size={16} />
            Em entrega
            {saiuCount > 0 && <S.NavBadge $urgent>{saiuCount}</S.NavBadge>}
          </S.SideNavItem>
          <S.SideNavItem
            $active={activeTab === "ENTREGUE"}
            onClick={() => setActiveTab("ENTREGUE")}
          >
            <CheckCircle size={16} />
            Entregues
            {entregueCount > 0 && <S.NavBadge>{entregueCount}</S.NavBadge>}
          </S.SideNavItem>
          <S.SideNavItem
            $active={activeTab === "PERFIL"}
            onClick={() => setActiveTab("PERFIL")}
          >
            <User size={16} />
            Meu Perfil
          </S.SideNavItem>
        </S.SidebarNav>

        {user?.role === "ADMIN" && (
          <S.LogoutButton
            style={{ marginBottom: "0.75rem" }}
            onClick={() => navigate("/admin")}
          >
            <ShieldAlert size={16} />
            Entrar na tela de admin
          </S.LogoutButton>
        )}

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
            $active={activeTab === "PRONTO"}
            onClick={() => setActiveTab("PRONTO")}
          >
            <Package size={15} /> Prontos{" "}
            {prontoCount > 0 && `(${prontoCount})`}
          </S.MobileTab>
          <S.MobileTab
            $active={activeTab === "SAIU_PARA_ENTREGA"}
            onClick={() => setActiveTab("SAIU_PARA_ENTREGA")}
          >
            <Bike size={15} /> Em rota {saiuCount > 0 && `(${saiuCount})`}
          </S.MobileTab>
          <S.MobileTab
            $active={activeTab === "ENTREGUE"}
            onClick={() => setActiveTab("ENTREGUE")}
          >
            <CheckCircle size={15} /> Entregues{" "}
            {entregueCount > 0 && `(${entregueCount})`}
          </S.MobileTab>
          <S.MobileTab
            $active={activeTab === "PERFIL"}
            onClick={() => setActiveTab("PERFIL")}
          >
            <User size={15} /> Perfil
          </S.MobileTab>
        </S.MobileTabs>

        {activeTab === "PERFIL" ? (
          <Suspense fallback={null}>
            <ProfilePanel user={user} onUpdated={handleProfileUpdated} />
          </Suspense>
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
          <Suspense fallback={null}>
            <S.OrdersList>
              {filteredOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onMarkDelivered={handleMarkDelivered}
                  digitalPaymentMethods={DIGITAL_PAYMENT_METHODS}
                  paymentLabel={PAYMENT_LABEL}
                  statusLabel={STATUS_LABEL}
                />
              ))}
            </S.OrdersList>
          </Suspense>
        )}
      </S.MainArea>
    </S.PageWrapper>
  );
}
