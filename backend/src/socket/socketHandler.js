export function socketHandler(socket) {
  console.log("🔌 conectado:", socket.id);

  if (socket.authType === "table-session") {
    const { id, tableId, restaurantId } = socket.tableSession;

    socket.join(`restaurant:${restaurantId}`);
    socket.join(`table:${tableId}`);
    socket.join(`table-session:${id}`);

    socket.on("disconnect", () => {
      console.log("❌ desconectado:", socket.id);
    });

    return;
  }

  const { id, role, restaurantId } = socket.user;

  socket.join(`restaurant:${restaurantId}`);
  socket.join(`user:${id}`);

  if (role === "FUNCIONARIO") {
    socket.join("kitchen");
  }

  if (role === "MOTOQUEIRO") {
    socket.join("courier");
  }

  if (role === "ADMIN" || role === "SUPER_ADMIN") {
    socket.join("admin");
  }

  socket.on("disconnect", () => {
    console.log("❌ desconectado:", socket.id);
  });
}
