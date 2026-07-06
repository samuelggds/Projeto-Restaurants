import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import ordersService from "../../Services/ordersService";
import { connectSocket, disconnectSocket } from "../../Services/socketService";
import { useAuth } from "../../contexts/authContext";

function statusLabel(status) {
  return String(status || "").replaceAll("_", " ");
}

function getTableLabel(order) {
  const tableNumber = Number(order?.table?.number || order?.tableNumber || 0);

  if (tableNumber) {
    return `Mesa ${tableNumber}`;
  }

  if (order?.type === "MESA" && order?.tableId) {
    return `Mesa ${order.tableId}`;
  }

  return null;
}

export default function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const isStaff = useMemo(
    () => ["ADMIN", "FUNCIONARIO", "SUPER_ADMIN"].includes(user?.role),
    [user?.role],
  );

  useEffect(() => {
    let mounted = true;

    async function loadOrders() {
      try {
        setLoading(true);
        const data = isStaff
          ? await ordersService.listRestaurantOrders()
          : await ordersService.listMyOrders();

        if (mounted) {
          setOrders(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        toast.error(err?.response?.data?.error || "Erro ao carregar pedidos");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadOrders();

    return () => {
      mounted = false;
    };
  }, [isStaff]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      return undefined;
    }

    const socket = connectSocket(token);

    const onNewOrder = (order) => {
      setOrders((prev) => {
        const exists = prev.some((item) => item.id === order.id);
        if (exists) {
          return prev;
        }
        return [order, ...prev];
      });
    };

    const onStatusChanged = (order) => {
      setOrders((prev) =>
        prev.map((item) => (item.id === order.id ? order : item)),
      );
    };

    socket.on("new-order", onNewOrder);
    socket.on("order:status-changed", onStatusChanged);

    return () => {
      socket.off("new-order", onNewOrder);
      socket.off("order:status-changed", onStatusChanged);
      disconnectSocket();
    };
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <h2>Pedidos</h2>
        <button onClick={() => window.location.reload()}>Atualizar</button>
      </div>

      {loading && <p>Carregando pedidos...</p>}

      {!loading && orders.length === 0 && <p>Nenhum pedido encontrado.</p>}

      {!loading && orders.length > 0 && (
        <div style={{ display: "grid", gap: 12 }}>
          {orders.map((order) => (
            <div
              key={order.id}
              style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <strong>Pedido #{order.id}</strong>
                <span>{statusLabel(order.status)}</span>
              </div>
              <p style={{ margin: "8px 0" }}>
                Tipo: {order.type} | Total: R${" "}
                {Number(order.total || 0).toFixed(2)}
              </p>
              {getTableLabel(order) && (
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "0.35rem 0.7rem",
                    borderRadius: 999,
                    background: "rgba(234, 179, 8, 0.12)",
                    color: "#92400e",
                    fontWeight: 800,
                    fontSize: 13,
                    marginBottom: 8,
                  }}
                >
                  {getTableLabel(order)}
                </div>
              )}
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {(order.items || []).map((item) => (
                  <li key={item.id || `${item.productId}-${item.quantity}`}>
                    {item.quantity}x {item?.product?.name || "Produto"}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
