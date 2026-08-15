import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { ArrowLeft, Bike, Clock3, LocateFixed, Phone, RefreshCw } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import styled from "styled-components";
import ordersService from "../../Services/ordersService";
import { connectSocket, disconnectSocket } from "../../Services/socketService";

const DeliveryMap = lazy(() => import("../Courier/components/DeliveryMap"));
type RoutePoint = { latitude: number; longitude: number; recordedAt?: string; speed?: number | null };
type TrackingData = {
  order: {
    id: number;
    status: string;
    deliveryStartedAt?: string | null;
    estimatedArrival?: string | null;
    routeEstimate?: { durationSeconds: number; distanceMeters: number | null; provider: "OSRM" } | null;
    assignedCourier?: { name?: string; phone?: string; avatar?: string } | null;
  };
  locations: RoutePoint[];
};

export default function DeliveryTrackingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<TrackingData | null>(null);
  const [error, setError] = useState("");
  const lastRouteRefreshAt = useRef(0);

  useEffect(() => {
    const orderId = Number(id || 0);
    if (!orderId) return;

    const refreshTracking = () => ordersService.getDeliveryTracking(orderId)
      .then((result) => {
        lastRouteRefreshAt.current = Date.now();
        setData(result as TrackingData);
      })
      .catch((err) => setError(err?.response?.data?.error || "Não foi possível acompanhar esta entrega."));

    refreshTracking();

    const token = localStorage.getItem("token");
    if (!token) return;
    const socket = connectSocket(token, `delivery-tracking-${orderId}`);
    const onLocation = (point: RoutePoint & { orderId: number }) => {
      if (point.orderId !== orderId) return;
      setData((current) => current ? { ...current, locations: [...current.locations, point].slice(-1000) } : current);

      // A rota é recalculada periodicamente, sem chamar o provedor a cada ponto de GPS.
      if (Date.now() - lastRouteRefreshAt.current >= 20_000) refreshTracking();
    };
    const onStatus = (order: TrackingData["order"]) => {
      if (order.id !== orderId) return;
      setData((current) => current ? { ...current, order: { ...current.order, ...order } } : current);
      refreshTracking();
    };
    socket.on("order:delivery-location", onLocation);
    socket.on("order:status-changed", onStatus);
    return () => {
      socket.off("order:delivery-location", onLocation);
      socket.off("order:status-changed", onStatus);
      disconnectSocket();
    };
  }, [id]);

  const latest = data?.locations[data.locations.length - 1];
  const formatTime = (value?: string | null) => value
    ? new Date(value).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : null;
  const routeMinutes = data?.order.routeEstimate
    ? Math.max(1, Math.ceil(data.order.routeEstimate.durationSeconds / 60))
    : null;

  return (
    <Page>
      <Header>
        <button onClick={() => navigate("/profile")}><ArrowLeft /> Voltar</button>
        <div><Bike /><span><b>Pedido #{data?.order.id || id}</b><small>Acompanhamento da entrega</small></span></div>
      </Header>
      <Main>
        {error ? <State><LocateFixed /><h2>{error}</h2></State> : !data ? <State><RefreshCw className="spinning" /><h2>Carregando rastreamento...</h2></State> : (
          <>
            <Summary>
              <article><span>Status</span><strong>{data.order.status === "SAIU_PARA_ENTREGA" ? "Saiu para entrega" : data.order.status === "ENTREGUE" ? "Entregue" : data.order.status}</strong></article>
              <article><span>Motoqueiro</span><strong>{data.order.assignedCourier?.name || "Aguardando retirada"}</strong></article>
              <article><span>Saiu para entrega às</span><strong>{formatTime(data.order.deliveryStartedAt) || "Aguardando saída"}</strong></article>
              <article><span>Previsão de chegada</span><strong>{formatTime(data.order.estimatedArrival) || (latest ? "Calculando rota" : "Aguardando GPS")}</strong>{routeMinutes && <small>Estimativa de rota: cerca de {routeMinutes} min</small>}</article>
            </Summary>
            {data.order.assignedCourier?.phone && <Contact href={`tel:${data.order.assignedCourier.phone}`}><Phone /> Ligar para o motoqueiro</Contact>}
            {data.locations.length ? (
              <Suspense fallback={<State><RefreshCw className="spinning" /></State>}>
                <DeliveryMap points={data.locations} label={data.order.assignedCourier?.name || "Motoqueiro"} statusMessage={data.order.status === "ENTREGUE" ? "Seu pedido foi entregue" : "Seu pedido está a caminho"} statusDetail={data.order.status === "ENTREGUE" ? "Entrega concluída com sucesso." : "Acompanhe a localização do motoqueiro em tempo real."} />
              </Suspense>
            ) : <State><Clock3 /><h2>Aguardando a primeira posição do motoqueiro</h2><p>O mapa aparecerá automaticamente quando a rota começar.</p></State>}
            <Privacy>O mapa usa tiles do OpenStreetMap. A localização é exibida somente para este pedido autenticado.</Privacy>
          </>
        )}
      </Main>
    </Page>
  );
}

const Page = styled.div`min-height:100dvh;background:#fbfaf8;color:#17191b;`;
const Header = styled.header`height:78px;background:#fff;border-bottom:1px solid #e5e1dc;display:flex;align-items:center;justify-content:space-between;padding:0 clamp(18px,5vw,72px);button{border:0;background:transparent;display:flex;align-items:center;gap:8px;font-weight:700;color:#475569}button svg{width:18px}div{display:flex;align-items:center;gap:12px}div>svg{color:#d64d08}span{display:grid}small{color:#687079;margin-top:3px}`;
const Main = styled.main`width:min(1120px,calc(100% - 32px));margin:28px auto 50px;`;
const Summary = styled.div`display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-bottom:18px;article{background:#fff;border:1px solid #e5e1dc;border-radius:14px;padding:18px;display:grid;gap:7px}span,small{font-size:12px;color:#687079}strong{font-size:16px}@media(max-width:850px){grid-template-columns:repeat(2,minmax(0,1fr))}@media(max-width:540px){grid-template-columns:1fr}`;
const State = styled.div`min-height:300px;display:grid;place-items:center;align-content:center;text-align:center;gap:12px;color:#687079;svg{width:34px;height:34px;color:#d64d08}.spinning{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}h2{font-size:18px;color:#334155;margin:0}p{margin:0}`;
const Contact = styled.a`display:inline-flex;align-items:center;gap:8px;margin-bottom:16px;padding:10px 14px;border-radius:10px;background:#eaf7ee;color:#166534;text-decoration:none;font-weight:700;svg{width:17px}`;
const Privacy = styled.p`font-size:11px;color:#7c858d;text-align:center;margin-top:12px;`;
