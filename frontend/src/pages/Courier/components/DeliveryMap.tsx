import { useEffect } from "react";
import { divIcon } from "leaflet";
import { Navigation } from "lucide-react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export type RoutePoint = { latitude: number; longitude: number; recordedAt?: string; speed?: number | null };

function FollowLatest({ point }: { point: RoutePoint }) {
  const map = useMap();
  useEffect(() => {
    map.setView([point.latitude, point.longitude], Math.max(map.getZoom(), 16), { animate: true });
  }, [map, point.latitude, point.longitude]);
  return null;
}

function RecenterButton({ point }: { point: RoutePoint }) {
  const map = useMap();
  return (
    <button type="button" aria-label="Centralizar no motoqueiro" onClick={() => map.setView([point.latitude, point.longitude], 17, { animate: true })} style={{ position: "absolute", right: 16, bottom: 126, zIndex: 1000, width: 46, height: 46, border: "1px solid rgba(15,23,42,.1)", borderRadius: "50%", background: "white", color: "#1f2937", display: "grid", placeItems: "center", boxShadow: "0 6px 22px rgba(15,23,42,.2)" }}>
      <Navigation size={21} />
    </button>
  );
}

const courierIcon = divIcon({
  className: "delivery-courier-marker",
  html: `<div class="delivery-courier-marker__pin" aria-label="Posicao do motoqueiro">
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="18.5" cy="17.5" r="3.5" />
      <circle cx="5.5" cy="17.5" r="3.5" />
      <circle cx="15" cy="5" r="1" />
      <path d="M12 17.5V14l-3-3 4-3 2 3h2" />
    </svg>
  </div>`,
  iconSize: [68, 68],
  iconAnchor: [34, 34],
  popupAnchor: [0, -34],
});

export default function DeliveryMap({ points, label = "Motoqueiro", statusMessage = "Entrega em andamento", statusDetail = "A posição é atualizada automaticamente." }: { points: RoutePoint[]; label?: string; statusMessage?: string; statusDetail?: string }) {
  const latest = points[points.length - 1] || { latitude: -23.5505, longitude: -46.6333 };
  const line = points.map((point) => [point.latitude, point.longitude] as [number, number]);
  return (
    <div className="delivery-map-shell" style={{ height: "min(68vh, 620px)", minHeight: 420, borderRadius: 20, overflow: "hidden", border: "1px solid #e5e1dc", position: "relative", background: "#edece7" }}>
      <style>{`
        .delivery-map-shell .leaflet-tile-pane { filter: grayscale(.72) sepia(.14) brightness(1.08) contrast(.82) opacity(.88); }
        .delivery-map-shell .leaflet-control-attribution { background: rgba(255,255,255,.72); color: #64748b; font-size: 9px; }
        .delivery-courier-marker { background: transparent; border: 0; }
        .delivery-courier-marker__pin { width: 62px; height: 62px; border-radius: 50%; background: white; display: grid; place-items: center; box-shadow: 0 8px 28px rgba(15,23,42,.28); border: 4px solid rgba(255,255,255,.9); position: relative; }
        .delivery-courier-marker__pin::after { content: ''; position: absolute; inset: 7px; border-radius: 50%; background: #d64d08; z-index: 0; }
        .delivery-courier-marker__pin svg { position: relative; z-index: 1; width: 32px; height: 32px; fill: none; stroke: white; stroke-width: 1.9; stroke-linecap: round; stroke-linejoin: round; }
        @media (max-width: 560px) { .delivery-map-shell { min-height: 520px !important; border-radius: 0 !important; } }
      `}</style>
      <MapContainer center={[latest.latitude, latest.longitude]} zoom={16} zoomControl={false} style={{ width: "100%", height: "100%" }}>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {line.length > 1 && <Polyline positions={line} pathOptions={{ color: "#d64d08", weight: 4, opacity: 0.58, dashArray: "8 10" }} />}
        <Marker position={[latest.latitude, latest.longitude]} icon={courierIcon}>
          <Popup>{label}<br />Posição atual</Popup>
        </Marker>
        <FollowLatest point={latest} />
        <RecenterButton point={latest} />
      </MapContainer>
      <div style={{ position: "absolute", left: 14, right: 14, bottom: 14, zIndex: 1000, borderRadius: 15, background: "rgba(28,30,33,.92)", color: "white", padding: "15px 18px", display: "grid", gridTemplateColumns: "44px 1fr", alignItems: "center", gap: 13, boxShadow: "0 10px 28px rgba(15,23,42,.25)", backdropFilter: "blur(8px)" }}>
        <span style={{ width: 44, height: 44, display: "grid", placeItems: "center", borderRadius: "50%", background: "#fff3ed", color: "#d64d08", fontSize: 22 }}>🛵</span>
        <span style={{ display: "grid", gap: 3 }}><strong style={{ fontSize: 14 }}>{statusMessage}</strong><small style={{ color: "rgba(255,255,255,.72)", lineHeight: 1.35 }}>{statusDetail}</small></span>
      </div>
    </div>
  );
}
