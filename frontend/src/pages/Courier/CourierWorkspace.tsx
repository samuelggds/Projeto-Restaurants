import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bike,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  History,
  LayoutGrid,
  LocateFixed,
  LogOut,
  MapPinOff,
  Menu,
  Navigation,
  PackageCheck,
  RefreshCw,
  Search,
  User,
  DollarSign,
  MapPinned,
  X,
} from "lucide-react";
import { useAuth } from "../../contexts/authContext";
import ordersService from "../../Services/ordersService";
import restaurantSettingsService from "../../Services/restaurantSettingsService";
import { connectSocket, disconnectSocket } from "../../Services/socketService";
import * as L from "../kitchen/Kitchen.styles";
import * as S from "./styles";

const OrderCard = lazy(() => import("./components/OrderCard"));
const ProfilePanel = lazy(() => import("./components/ProfilePanel"));
const DeliveryMap = lazy(() => import("./components/DeliveryMap"));

type CourierView = "overview" | "ready" | "route" | "map" | "finance" | "history" | "profile";
type GeoStatus = "checking" | "enabled" | "blocked" | "unsupported";
type CourierOrder = {
  id: number;
  status: string;
  type?: string;
  createdAt?: string;
  deliveredAt?: string;
  [key: string]: unknown;
};
type FinanceData = {
  today: { amount: number; deliveries: number };
  week: { amount: number; deliveries: number };
  month: { amount: number; deliveries: number };
  pending: { amount: number; deliveries: number };
  deliveries: Array<{
    id: number;
    courierEarning: number;
    courierPaidAt?: string | null;
    deliveredAt?: string | null;
    district?: string | null;
    city?: string | null;
  }>;
};
type RoutePoint = { latitude: number; longitude: number; recordedAt?: string; speed?: number | null };

const PAYMENT_LABEL: Record<string, string> = {
  PIX: "PIX",
  CARTAO: "Cartão",
  CARTAO_DEBITO: "Débito",
  CARTAO_CREDITO: "Crédito",
  DINHEIRO: "Dinheiro",
};
const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  PRONTO: { label: "Pronto para retirada", color: "#f59e0b" },
  SAIU_PARA_ENTREGA: { label: "Em entrega", color: "#2563eb" },
  ENTREGUE: { label: "Entregue", color: "#16a34a" },
};
const DIGITAL_PAYMENT_METHODS = new Set(["PIX", "CARTAO", "CARTAO_DEBITO", "CARTAO_CREDITO"]);
const LOCATION_UPDATE_INTERVAL_MS = 5_000;

function monogram(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "R"
  );
}

export default function CourierWorkspace() {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<CourierView>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(
    () => typeof window !== "undefined" && window.innerWidth > 820,
  );
  const [orders, setOrders] = useState<CourierOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [brand, setBrand] = useState({ name: "Restaurante", color: "#d64d08" });
  const [geoStatus, setGeoStatus] = useState<GeoStatus>("checking");
  const [geoMessage, setGeoMessage] = useState("Ative a localização para o cliente acompanhar a entrega.");
  const [finance, setFinance] = useState<FinanceData | null>(null);
  const [routePoints, setRoutePoints] = useState<RoutePoint[]>([]);
  const ordersRef = useRef<CourierOrder[]>([]);
  const restaurantId = Number(user?.restaurantId || 0);

  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  useEffect(() => {
    if (!restaurantId) return;
    restaurantSettingsService
      .getPublicSettings(restaurantId)
      .then((settings: Record<string, unknown>) => {
        const restaurant = (settings.restaurant as Record<string, unknown>) || {};
        setBrand({
          name: String(restaurant.name || settings.restaurantName || "Restaurante"),
          color: String(settings.primaryColor || "#d64d08"),
        });
      })
      .catch(() => {});
  }, [restaurantId]);

  useEffect(() => {
    let active = true;
    ordersService
      .listRestaurantOrders()
      .then((data) => {
        if (active) setOrders((Array.isArray(data) ? data : []) as CourierOrder[]);
      })
      .catch(() => {
        if (active) setLoadError("Não foi possível carregar as entregas.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refresh]);

  useEffect(() => {
    if (view !== "finance") return;
    ordersService
      .getCourierFinance()
      .then((data) => setFinance(data as FinanceData))
      .catch(() => setLoadError("Não foi possível carregar o financeiro."));
  }, [view, refresh]);

  useEffect(() => {
    const activeOrder = orders.find((order) => order.status === "SAIU_PARA_ENTREGA");
    if (view !== "map" || !activeOrder) return;
    ordersService.getDeliveryTracking(activeOrder.id)
      .then((data) => setRoutePoints((data?.locations || []) as RoutePoint[]))
      .catch(() => setLoadError("Não foi possível carregar o percurso."));
  }, [view, orders]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    const socket = connectSocket(token, "courier-workspace");
    let watchId: number | null = null;
    let latestPosition: GeolocationPosition | null = null;

    const sendLocation = () => {
      if (!latestPosition) return;
      ordersRef.current
        .filter((order) => order.status === "SAIU_PARA_ENTREGA")
        .forEach((order) => {
          socket.emit("delivery:location:update", {
            orderId: order.id,
            latitude: latestPosition?.coords.latitude,
            longitude: latestPosition?.coords.longitude,
            heading: latestPosition?.coords.heading,
            speed: latestPosition?.coords.speed,
            accuracy: latestPosition?.coords.accuracy,
            sentAt: new Date().toISOString(),
          });
        });
    };

    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          latestPosition = position;
          setRoutePoints((current) =>
            [
              ...current,
              {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                speed: position.coords.speed,
                recordedAt: new Date().toISOString(),
              },
            ].slice(-1000),
          );
          setGeoStatus("enabled");
          setGeoMessage("Rastreamento ativo durante as entregas em andamento.");
          sendLocation();
        },
        (error) => {
          setGeoStatus("blocked");
          setGeoMessage(
            error.code === 1
              ? "Permita a localização no navegador para iniciar o rastreamento."
              : "Não foi possível obter sua localização. Verifique o GPS e a internet.",
          );
        },
        { enableHighAccuracy: true, maximumAge: 5_000, timeout: 10_000 },
      );
    } else {
      window.setTimeout(() => {
        setGeoStatus("unsupported");
        setGeoMessage("Este aparelho não oferece geolocalização neste navegador.");
      }, 0);
    }

    const timer = window.setInterval(sendLocation, LOCATION_UPDATE_INTERVAL_MS);
    const onChanged = (_updated: CourierOrder) => setRefresh((value) => value + 1);
    const onLocation = (point: RoutePoint & { orderId: number }) => {
      if (ordersRef.current.some((order) => order.id === point.orderId)) {
        setRoutePoints((current) => [...current, point].slice(-1000));
      }
    };
    socket.on("order:status-changed", onChanged);
    socket.on("order:delivery-location", onLocation);
    return () => {
      window.clearInterval(timer);
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      socket.off("order:status-changed", onChanged);
      socket.off("order:delivery-location", onLocation);
      disconnectSocket();
    };
  }, []);

  const ready = useMemo(() => orders.filter((order) => order.status === "PRONTO"), [orders]);
  const inRoute = useMemo(() => orders.filter((order) => order.status === "SAIU_PARA_ENTREGA"), [orders]);
  const delivered = useMemo(() => orders.filter((order) => order.status === "ENTREGUE"), [orders]);
  const current = view === "ready" ? ready : view === "route" ? inRoute : view === "history" ? delivered : [...inRoute, ...ready];
  const visibleOrders = current.filter((order) => String(order.id).includes(search.replace(/\D/g, "")));

  const titles: Record<CourierView, [string, string]> = {
    overview: ["Visão geral", "Acompanhe seu turno e as próximas entregas"],
    ready: ["Prontos para retirada", "Assuma um pedido quando ele estiver com você"],
    route: ["Entregas em andamento", "Pedidos atribuídos a você e em rota"],
    history: ["Histórico", "Entregas concluídas por você"],
    finance: ["Financeiro", "Veja seus ganhos por entrega e por período"],
    map: ["Minha rota", "Acompanhe seu percurso e sua posição atual"],
    profile: ["Meu perfil", "Dados da sua conta de motoqueiro"],
  };
  const [title, subtitle] = titles[view];
  const go = (next: CourierView) => {
    setView(next);
    setSearch("");
    if (window.innerWidth <= 820) setSidebarOpen(false);
  };
  const requestLocation = () => {
    if (!navigator.geolocation) return;
    setGeoStatus("checking");
    navigator.geolocation.getCurrentPosition(
      () => setGeoStatus("enabled"),
      () => setGeoStatus("blocked"),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };
  const updateLocalOrder = (updated: unknown) => {
    const order = updated as CourierOrder;
    setOrders((items) => items.map((item) => (item.id === order.id ? order : item)));
  };

  return (
    <L.Root $primary={brand.color} $sidebarOpen={sidebarOpen}>
      <L.Sidebar $open={sidebarOpen}>
        <L.CollapseBtn onClick={() => setSidebarOpen(false)}><ChevronLeft /></L.CollapseBtn>
        <L.Brand><span>{monogram(brand.name)}</span><b>{brand.name}</b><small>ÁREA DO MOTOQUEIRO</small></L.Brand>
        <L.CloseMenu onClick={() => setSidebarOpen(false)}><X /></L.CloseMenu>
        <L.Nav>
          {([
            ["overview", "Visão geral", LayoutGrid, ready.length + inRoute.length],
            ["ready", "Para retirar", PackageCheck, ready.length],
            ["route", "Em entrega", Bike, inRoute.length],
            ["map", "Minha rota", MapPinned, inRoute.length],
            ["finance", "Financeiro", DollarSign, 0],
            ["history", "Histórico", History, delivered.length],
            ["profile", "Meu perfil", User, 0],
          ] as const).map(([id, label, Icon, count]) => (
            <a key={id} className={view === id ? "active" : ""} onClick={() => go(id)}>
              <Icon /> {label} {count > 0 && <S.NavBadge>{count}</S.NavBadge>}
            </a>
          ))}
        </L.Nav>
        <L.User>
          <span className="avatar">{monogram(user?.name || "Motoqueiro")}</span>
          <span><b>{user?.name || "Motoqueiro"}</b><small>Motoqueiro</small></span>
          <button onClick={() => { logout(); navigate("/login"); }} title="Sair"><LogOut /></button>
        </L.User>
      </L.Sidebar>
      {sidebarOpen && <L.Overlay onClick={() => setSidebarOpen(false)} />}
      {!sidebarOpen && <L.SidebarOpenTab onClick={() => setSidebarOpen(true)}><ChevronRight /></L.SidebarOpenTab>}

      <L.Main>
        <L.Top>
          <L.MobileMenu onClick={() => setSidebarOpen(true)}><Menu /></L.MobileMenu>
          <div><h1>{title}</h1><p>{subtitle}</p></div>
          <L.Live><Clock3 /> Em turno <i /> {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</L.Live>
        </L.Top>
        <L.Content>
          {geoStatus !== "enabled" ? (
            <S.LocationAlertCard>
              <S.LocationAlertIcon>{geoStatus === "unsupported" ? <MapPinOff /> : <LocateFixed />}</S.LocationAlertIcon>
              <S.LocationAlertContent><strong>Localização necessária durante a rota</strong><p>{geoMessage}</p></S.LocationAlertContent>
              {geoStatus !== "unsupported" && <S.LocationAlertButton onClick={requestLocation}><Navigation /> Ativar localização</S.LocationAlertButton>}
            </S.LocationAlertCard>
          ) : view === "map" ? (
            inRoute.length ? (
              <Suspense fallback={<S.EmptyState><RefreshCw className="spinning" /></S.EmptyState>}>
                <DeliveryMap points={routePoints} label={user?.name || "Motoqueiro"} statusMessage="Sua rota está em andamento" statusDetail="Sua localização está sendo compartilhada com o cliente." />
              </Suspense>
            ) : (
              <S.EmptyState><MapPinned /><p>Retire um pedido para iniciar a rota.</p></S.EmptyState>
            )
          ) : view === "finance" ? (
            <div>
              <S.WorkspaceStatsGrid $columns={4}>
                {finance &&
                  ([
                    ["Hoje", finance.today],
                    ["Esta semana", finance.week],
                    ["Este mês", finance.month],
                    ["A receber", finance.pending],
                  ] as const).map(([label, value]) => (
                    <S.SideStatItem key={label}>
                      <DollarSign />
                      <div>
                        <span>{label}</span>
                        <strong>
                          {value.amount.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </strong>
                        <small>{value.deliveries} entregas</small>
                      </div>
                    </S.SideStatItem>
                  ))}
              </S.WorkspaceStatsGrid>
              <S.OrdersList>
                {(finance?.deliveries || []).map((delivery) => (
                  <S.OrderCard key={delivery.id}>
                    <S.OrderCardHeader>
                      <S.OrderMeta>
                        <S.OrderId>Entrega #{delivery.id}</S.OrderId>
                        <S.InfoChip>
                          {delivery.courierPaidAt ? "Pago" : "A receber"}
                        </S.InfoChip>
                      </S.OrderMeta>
                      <S.OrderTotal>
                        {delivery.courierEarning.toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </S.OrderTotal>
                    </S.OrderCardHeader>
                    <S.AddressRow>
                      {[delivery.district, delivery.city]
                        .filter(Boolean)
                        .join(", ") || "Destino não informado"}
                    </S.AddressRow>
                  </S.OrderCard>
                ))}
              </S.OrdersList>
            </div>
          ) : (
            <S.LocationStatusChip><LocateFixed /> {geoMessage}</S.LocationStatusChip>
          )}

          {view === "overview" && (
            <S.WorkspaceStatsGrid $columns={3}>
              <S.SideStatItem><PackageCheck /><div><span>Para retirar</span><strong>{ready.length}</strong></div></S.SideStatItem>
              <S.SideStatItem><Bike /><div><span>Em rota</span><strong>{inRoute.length}</strong></div></S.SideStatItem>
              <S.SideStatItem><CheckCircle2 /><div><span>Entregues</span><strong>{delivered.length}</strong></div></S.SideStatItem>
            </S.WorkspaceStatsGrid>
          )}

          {view === "profile" ? (
            <Suspense fallback={<S.EmptyState><RefreshCw className="spinning" /></S.EmptyState>}>
              <ProfilePanel user={user} onUpdated={(updated) => { const token = localStorage.getItem("token"); if (token) login(updated, token); }} />
            </Suspense>
          ) : (
            <>
              <S.TopBar>
                <div style={{ position: "relative", width: "min(340px, 100%)" }}>
                  <Search size={17} style={{ position: "absolute", left: 12, top: 11, color: "#718096" }} />
                  <input aria-label="Buscar pedido" value={search} onChange={(event) => setSearch(event.target.value.replace(/\D/g, ""))} placeholder="Buscar pelo número do pedido" style={{ width: "100%", height: 40, border: "1px solid #e5e1dc", borderRadius: 10, padding: "0 12px 0 38px" }} />
                </div>
                <S.RefreshButton onClick={() => { setLoading(true); setLoadError(""); setRefresh((value) => value + 1); }}><RefreshCw /> Atualizar</S.RefreshButton>
              </S.TopBar>
              {loadError && <S.ErrorMsg>{loadError}</S.ErrorMsg>}
              {loading ? <S.EmptyState><RefreshCw className="spinning" /><p>Carregando entregas...</p></S.EmptyState> : visibleOrders.length === 0 ? <S.EmptyState><Bike /><p>Nenhuma entrega nesta área.</p></S.EmptyState> : (
                <Suspense fallback={<S.EmptyState><RefreshCw className="spinning" /></S.EmptyState>}>
                  <S.OrdersList>
                    {visibleOrders.map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order as never}
                        onClaimDelivery={async (id) => updateLocalOrder(await ordersService.claimDelivery(id))}
                        onMarkDelivered={async (id, code) => updateLocalOrder(await ordersService.updateStatus(id, "ENTREGUE", code))}
                        digitalPaymentMethods={DIGITAL_PAYMENT_METHODS}
                        paymentLabel={PAYMENT_LABEL}
                        statusLabel={STATUS_LABEL}
                      />
                    ))}
                  </S.OrdersList>
                </Suspense>
              )}
            </>
          )}
        </L.Content>
      </L.Main>
    </L.Root>
  );
}
