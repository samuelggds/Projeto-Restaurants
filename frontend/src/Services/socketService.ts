import { io } from "socket.io-client";

let socket = null;
let tableSessionSocket = null;
let socketAuthToken = "";
let tableSessionAuthToken = "";
let socketBaseUrl = "";
let tableSessionBaseUrl = "";
let socketContextName = "unknown";
let tableSessionContextName = "unknown";

const LOCAL_HOSTS = ["localhost", "127.0.0.1", "::1"];
const SOCKET_DEBUG_ENABLED =
  import.meta.env.DEV ||
  (typeof window !== "undefined" &&
    localStorage.getItem("@PecaJaFood:socketDebug") === "true");

function normalizeBaseUrl(url) {
  return String(url || "")
    .trim()
    .replace(/\/+$/, "");
}

function getRuntimeSocketUrl() {
  if (typeof window === "undefined") {
    return "";
  }

  const protocol = window.location.protocol === "https:" ? "https:" : "http:";
  const host = window.location.hostname;

  if (!host) {
    return "";
  }

  return `${protocol}//${host}:3000`;
}

function getRuntimeHost() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.location.hostname || "";
}

function getHostCandidates(host) {
  if (!host) {
    return [];
  }

  const protocol =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "https:"
      : "http:";
  const candidates = [`${protocol}//${host}:3000`];

  // Never try insecure HTTP fallbacks when the app is served over HTTPS.
  if (protocol !== "https:") {
    candidates.push(`https://${host}:3000`);
  }

  return candidates;
}

function getSocketBaseUrls() {
  const configuredUrl = normalizeBaseUrl(import.meta.env.VITE_API_URL);
  const runtimeHost = getRuntimeHost();
  const runtimeCandidates =
    getHostCandidates(runtimeHost).map(normalizeBaseUrl);
  const runtimeUrl = normalizeBaseUrl(getRuntimeSocketUrl());
  const sameOriginUrl =
    typeof window !== "undefined"
      ? normalizeBaseUrl(window.location.origin)
      : "";
  const defaultLoopbackUrl = "http://127.0.0.1:3000";
  const defaultLocalUrl = "http://localhost:3000";
  const urls = new Set<string>();
  const isLocalRuntimeHost = LOCAL_HOSTS.includes(runtimeHost);

  // Keep the socket pinned to the same local backend preference used by axios.
  if (isLocalRuntimeHost) {
    urls.add(defaultLoopbackUrl);
    urls.add(defaultLocalUrl);
  }

  // In production-like hosts, never fall back to host:3000.
  if (!isLocalRuntimeHost) {
    if (configuredUrl) {
      urls.add(configuredUrl);
    }

    if (sameOriginUrl) {
      urls.add(sameOriginUrl);
    }

    return Array.from(urls);
  }

  if (runtimeUrl) {
    urls.add(runtimeUrl);
  }

  for (const candidate of runtimeCandidates) {
    if (candidate) {
      urls.add(candidate);
    }
  }

  if (configuredUrl) {
    urls.add(configuredUrl);
  }

  return urls.size ? Array.from(urls) : [defaultLoopbackUrl, defaultLocalUrl];
}

function getSocketBaseUrl() {
  const baseUrls = getSocketBaseUrls();
  if (baseUrls[0]) {
    return baseUrls[0];
  }

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return "http://127.0.0.1:3000";
}

function normalizeAuthValue(value) {
  return String(value || "").trim();
}

function getTokenSuffix(value) {
  const normalized = normalizeAuthValue(value);

  if (!normalized) {
    return "none";
  }

  return `${normalized.length}ch::${normalized.slice(-4)}`;
}

function debugSocket(message, data) {
  if (!SOCKET_DEBUG_ENABLED) {
    return;
  }

  if (data !== undefined) {
    console.info(`[socket-debug] ${message}`, data);
    return;
  }

  console.info(`[socket-debug] ${message}`);
}

export function connectSocket(token, contextName = "unknown") {
  const baseUrl = getSocketBaseUrl();
  const normalizedToken = normalizeAuthValue(token);
  const normalizedContext = normalizeAuthValue(contextName) || "unknown";

  if (
    socket?.connected &&
    socketAuthToken === normalizedToken &&
    socketBaseUrl === baseUrl
  ) {
    debugSocket(`reuse user socket (${normalizedContext})`, {
      socketId: socket.id,
      baseUrl,
      token: getTokenSuffix(normalizedToken),
      previousContext: socketContextName,
    });
    socketContextName = normalizedContext;
    return socket;
  }

  if (socket) {
    socket.disconnect();
    socket = null;
  }

  socket = io(baseUrl, {
    transports: ["websocket", "polling"],
    auth: {
      token: normalizedToken,
    },
  });

  socketAuthToken = normalizedToken;
  socketBaseUrl = baseUrl;
  socketContextName = normalizedContext;

  socket.on("connect", () => {
    debugSocket(`connected user socket (${socketContextName})`, {
      socketId: socket?.id,
      baseUrl: socketBaseUrl,
      token: getTokenSuffix(socketAuthToken),
      transport: socket?.io?.engine?.transport?.name,
    });
  });

  socket.on("disconnect", (reason) => {
    debugSocket(`disconnected user socket (${socketContextName})`, {
      socketId: socket?.id,
      reason,
    });
  });

  socket.on("connect_error", (error) => {
    debugSocket(`connect_error user socket (${socketContextName})`, {
      message: error?.message,
      baseUrl: socketBaseUrl,
      token: getTokenSuffix(socketAuthToken),
    });
  });

  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    debugSocket(`manual disconnect user socket (${socketContextName})`, {
      socketId: socket.id,
    });
    socket.disconnect();
    socket = null;
  }

  socketAuthToken = "";
  socketBaseUrl = "";
  socketContextName = "unknown";
}

export function connectTableSessionSocket(
  sessionToken,
  contextName = "unknown",
) {
  const baseUrl = getSocketBaseUrl();
  const normalizedSessionToken = normalizeAuthValue(sessionToken);
  const normalizedContext = normalizeAuthValue(contextName) || "unknown";

  if (!normalizedSessionToken) {
    return null;
  }

  if (
    tableSessionSocket?.connected &&
    tableSessionAuthToken === normalizedSessionToken &&
    tableSessionBaseUrl === baseUrl
  ) {
    debugSocket(`reuse table-session socket (${normalizedContext})`, {
      socketId: tableSessionSocket.id,
      baseUrl,
      sessionToken: getTokenSuffix(normalizedSessionToken),
      previousContext: tableSessionContextName,
    });
    tableSessionContextName = normalizedContext;
    return tableSessionSocket;
  }

  if (tableSessionSocket) {
    tableSessionSocket.disconnect();
    tableSessionSocket = null;
  }

  tableSessionSocket = io(baseUrl, {
    transports: ["websocket", "polling"],
    auth: {
      sessionToken: normalizedSessionToken,
    },
  });

  tableSessionAuthToken = normalizedSessionToken;
  tableSessionBaseUrl = baseUrl;
  tableSessionContextName = normalizedContext;

  tableSessionSocket.on("connect", () => {
    debugSocket(`connected table-session socket (${tableSessionContextName})`, {
      socketId: tableSessionSocket?.id,
      baseUrl: tableSessionBaseUrl,
      sessionToken: getTokenSuffix(tableSessionAuthToken),
      transport: tableSessionSocket?.io?.engine?.transport?.name,
    });
  });

  tableSessionSocket.on("disconnect", (reason) => {
    debugSocket(
      `disconnected table-session socket (${tableSessionContextName})`,
      {
        socketId: tableSessionSocket?.id,
        reason,
      },
    );
  });

  tableSessionSocket.on("connect_error", (error) => {
    debugSocket(
      `connect_error table-session socket (${tableSessionContextName})`,
      {
        message: error?.message,
        baseUrl: tableSessionBaseUrl,
        sessionToken: getTokenSuffix(tableSessionAuthToken),
      },
    );
  });

  return tableSessionSocket;
}

export function disconnectTableSessionSocket() {
  if (tableSessionSocket) {
    debugSocket(
      `manual disconnect table-session socket (${tableSessionContextName})`,
      {
        socketId: tableSessionSocket.id,
      },
    );
    tableSessionSocket.disconnect();
    tableSessionSocket = null;
  }

  tableSessionAuthToken = "";
  tableSessionBaseUrl = "";
  tableSessionContextName = "unknown";
}
