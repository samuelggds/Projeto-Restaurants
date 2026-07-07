import type { Socket } from "socket.io";

type SocketUser = {
  id: number | string;
  role: string;
  restaurantId: number | string;
};

type SocketTableSession = {
  id: number | string;
  tableId: number | string;
  restaurantId: number | string;
};

type AppSocket = Socket & {
  user?: SocketUser;
  authType?: "user" | "table-session";
  tableSession?: SocketTableSession;
};

export function socketHandler(socket: AppSocket) {
  console.log("🔌 conectado:", socket.id);

  if (socket.authType === "table-session" && socket.tableSession) {
    const { id, tableId, restaurantId } = socket.tableSession;

    socket.join(`restaurant:${restaurantId}`);
    socket.join(`table:${tableId}`);
    socket.join(`table-session:${id}`);

    socket.on("disconnect", () => {
      console.log("❌ desconectado:", socket.id);
    });

    return;
  }

  const user = socket.user;
  if (!user) {
    socket.disconnect(true);
    return;
  }

  const { id, role, restaurantId } = user;

  socket.join(`restaurant:${restaurantId}`);
  socket.join(`user:${id}`);

  if (role === "FUNCIONARIO") {
    socket.join("kitchen");
    socket.join(`restaurant:${restaurantId}:kitchen`);
  }

  if (role === "MOTOQUEIRO") {
    socket.join("courier");
    socket.join(`restaurant:${restaurantId}:courier`);
  }

  if (role === "ADMIN" || role === "SUPER_ADMIN") {
    socket.join("admin");
    socket.join(`restaurant:${restaurantId}:admin`);
  }

  socket.on("disconnect", () => {
    console.log("❌ desconectado:", socket.id);
  });
}
