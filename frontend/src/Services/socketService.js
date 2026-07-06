import { io } from "socket.io-client";

let socket = null;
let tableSessionSocket = null;

function getSocketBaseUrl() {
  return import.meta.env.VITE_API_URL || "http://localhost:3000";
}

export function connectSocket(token) {
  const baseUrl = getSocketBaseUrl();

  if (socket?.connected) {
    return socket;
  }

  socket = io(baseUrl, {
    transports: ["websocket", "polling"],
    auth: {
      token,
    },
  });

  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function connectTableSessionSocket(sessionToken) {
  const baseUrl = getSocketBaseUrl();

  if (!sessionToken) {
    return null;
  }

  if (tableSessionSocket?.connected) {
    return tableSessionSocket;
  }

  tableSessionSocket = io(baseUrl, {
    transports: ["websocket", "polling"],
    auth: {
      sessionToken,
    },
  });

  return tableSessionSocket;
}

export function disconnectTableSessionSocket() {
  if (tableSessionSocket) {
    tableSessionSocket.disconnect();
    tableSessionSocket = null;
  }
}
