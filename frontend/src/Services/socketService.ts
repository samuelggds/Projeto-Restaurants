import { io } from 'socket.io-client';

let socket = null;
let tableSessionSocket = null;
let tableWaitingSocket = null;
let socketAuthToken = '';
let tableSessionAuthToken = '';
let tableWaitingAuthKey = '';
let socketBaseUrl = '';
let tableSessionBaseUrl = '';
let tableWaitingBaseUrl = '';
let socketContextName = 'unknown';
let tableSessionContextName = 'unknown';
let tableWaitingContextName = 'unknown';

const LOCAL_HOSTS = ['localhost', '127.0.0.1', '::1'];
const SOCKET_DEBUG_ENABLED =
  import.meta.env.DEV ||
  (typeof window !== 'undefined' && localStorage.getItem('@PecaJaFood:socketDebug') === 'true');

function normalizeBaseUrl(url) {
  return String(url || '')
    .trim()
    .replace(/\/+$/, '');
}

function normalizeSocketOrigin(url) {
  const normalized = normalizeBaseUrl(url);
  if (!normalized) return '';
  try {
    const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
    return new URL(normalized, base).origin;
  } catch {
    return normalized;
  }
}

function getSocketPath() {
  const configured = String(import.meta.env.VITE_SOCKET_PATH || '/socket.io').trim();
  const withLeadingSlash = configured.startsWith('/') ? configured : `/${configured}`;
  return withLeadingSlash.replace(/\/+$/, '') || '/socket.io';
}

function getRuntimeSocketUrl() {
  if (typeof window === 'undefined') {
    return '';
  }

  const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
  const host = window.location.hostname;

  if (!host) {
    return '';
  }

  return `${protocol}//${host}:3000`;
}

function getRuntimeHost() {
  if (typeof window === 'undefined') {
    return '';
  }

  return window.location.hostname || '';
}

function getHostCandidates(host) {
  if (!host) {
    return [];
  }

  const protocol =
    typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'https:' : 'http:';
  const candidates = [`${protocol}//${host}:3000`];

  // Never try insecure HTTP fallbacks when the app is served over HTTPS.
  if (protocol !== 'https:') {
    candidates.push(`https://${host}:3000`);
  }

  return candidates;
}

function getSocketBaseUrls() {
  const configuredUrl = normalizeSocketOrigin(
    import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL,
  );
  const runtimeHost = getRuntimeHost();
  const runtimeCandidates = getHostCandidates(runtimeHost).map(normalizeBaseUrl);
  const runtimeUrl = normalizeBaseUrl(getRuntimeSocketUrl());
  const sameOriginUrl =
    typeof window !== 'undefined' ? normalizeBaseUrl(window.location.origin) : '';
  const developmentProxyUrl = import.meta.env.DEV ? sameOriginUrl : '';
  const defaultLoopbackUrl = 'http://127.0.0.1:3000';
  const defaultLocalUrl = 'http://localhost:3000';
  const urls = new Set<string>();
  const isLocalRuntimeHost = LOCAL_HOSTS.includes(runtimeHost);

  // Keep the socket pinned to the same local backend preference used by axios.
  if (isLocalRuntimeHost) {
    urls.add(defaultLoopbackUrl);
    urls.add(defaultLocalUrl);
  }

  // In production-like hosts, never fall back to host:3000.
  if (!isLocalRuntimeHost) {
    if (developmentProxyUrl) {
      urls.add(developmentProxyUrl);
    }

    if (configuredUrl) {
      urls.add(configuredUrl);
    }

    if (!developmentProxyUrl && sameOriginUrl) {
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

  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  return 'http://127.0.0.1:3000';
}

function normalizeAuthValue(value) {
  return String(value || '').trim();
}

function getTokenSuffix(value) {
  const normalized = normalizeAuthValue(value);

  if (!normalized) {
    return 'none';
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

export function connectSocket(token, contextName = 'unknown') {
  const baseUrl = getSocketBaseUrl();
  const normalizedToken = normalizeAuthValue(token);
  const normalizedContext = normalizeAuthValue(contextName) || 'unknown';

  // Multiple concerns on the same page share the authenticated user socket. Reuse
  // it while Socket.IO is still handshaking too; replacing a connecting socket
  // drops every listener registered by the first consumer.
  if (socket && socketAuthToken === normalizedToken && socketBaseUrl === baseUrl) {
    debugSocket(`reuse user socket (${normalizedContext})`, {
      socketId: socket.id,
      baseUrl,
      token: getTokenSuffix(normalizedToken),
      previousContext: socketContextName,
    });
    socketContextName = normalizedContext;
    if (!socket.connected && !socket.active) {
      socket.connect();
    }
    return socket;
  }

  if (socket) {
    socket.disconnect();
    socket = null;
  }

  socket = io(baseUrl, {
    path: getSocketPath(),
    transports: ['websocket', 'polling'],
    auth: {
      token: normalizedToken,
    },
  });

  socketAuthToken = normalizedToken;
  socketBaseUrl = baseUrl;
  socketContextName = normalizedContext;

  socket.on('connect', () => {
    debugSocket(`connected user socket (${socketContextName})`, {
      socketId: socket?.id,
      baseUrl: socketBaseUrl,
      token: getTokenSuffix(socketAuthToken),
      transport: socket?.io?.engine?.transport?.name,
    });
  });

  socket.on('disconnect', (reason) => {
    debugSocket(`disconnected user socket (${socketContextName})`, {
      socketId: socket?.id,
      reason,
    });
  });

  socket.on('connect_error', (error) => {
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

export function waitForSocketConnection(timeoutMs = 6000) {
  return new Promise((resolve, reject) => {
    const activeSocket = socket;

    if (!activeSocket) {
      reject(new Error('Socket indisponível.'));
      return;
    }

    if (activeSocket.connected) {
      resolve(activeSocket);
      return;
    }

    let settled = false;

    const cleanup = () => {
      activeSocket.off('connect', handleConnect);
      activeSocket.off('connect_error', handleConnectError);
      activeSocket.off('disconnect', handleDisconnect);
      clearTimeout(timerId);
    };

    const settleResolve = () => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      resolve(activeSocket);
    };

    const settleReject = (message: string) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      reject(new Error(message));
    };

    const handleConnect = () => {
      settleResolve();
    };

    const handleConnectError = (error) => {
      const message = String(error?.message || 'Falha na conexão do socket.');
      settleReject(message);
    };

    const handleDisconnect = () => {
      settleReject('Socket desconectado antes de concluir a conexão.');
    };

    const timerId = setTimeout(() => {
      settleReject('Tempo esgotado para conectar socket.');
    }, timeoutMs);

    activeSocket.once('connect', handleConnect);
    activeSocket.once('connect_error', handleConnectError);
    activeSocket.once('disconnect', handleDisconnect);

    if (!activeSocket.active) {
      activeSocket.connect();
    }
  });
}

export function disconnectSocket() {
  if (socket) {
    debugSocket(`manual disconnect user socket (${socketContextName})`, {
      socketId: socket.id,
    });
    socket.disconnect();
    socket = null;
  }

  socketAuthToken = '';
  socketBaseUrl = '';
  socketContextName = 'unknown';
}

export function connectTableSessionSocket(sessionToken, contextName = 'unknown') {
  const baseUrl = getSocketBaseUrl();
  const normalizedSessionToken = normalizeAuthValue(sessionToken);
  const normalizedContext = normalizeAuthValue(contextName) || 'unknown';

  if (!normalizedSessionToken) {
    return null;
  }

  if (
    tableSessionSocket &&
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
    if (!tableSessionSocket.connected && !tableSessionSocket.active) {
      tableSessionSocket.connect();
    }
    return tableSessionSocket;
  }

  if (tableSessionSocket) {
    tableSessionSocket.disconnect();
    tableSessionSocket = null;
  }

  tableSessionSocket = io(baseUrl, {
    path: getSocketPath(),
    transports: ['websocket', 'polling'],
    auth: {
      sessionToken: normalizedSessionToken,
    },
  });

  tableSessionAuthToken = normalizedSessionToken;
  tableSessionBaseUrl = baseUrl;
  tableSessionContextName = normalizedContext;

  tableSessionSocket.on('connect', () => {
    debugSocket(`connected table-session socket (${tableSessionContextName})`, {
      socketId: tableSessionSocket?.id,
      baseUrl: tableSessionBaseUrl,
      sessionToken: getTokenSuffix(tableSessionAuthToken),
      transport: tableSessionSocket?.io?.engine?.transport?.name,
    });
  });

  tableSessionSocket.on('disconnect', (reason) => {
    debugSocket(`disconnected table-session socket (${tableSessionContextName})`, {
      socketId: tableSessionSocket?.id,
      reason,
    });
  });

  tableSessionSocket.on('connect_error', (error) => {
    debugSocket(`connect_error table-session socket (${tableSessionContextName})`, {
      message: error?.message,
      baseUrl: tableSessionBaseUrl,
      sessionToken: getTokenSuffix(tableSessionAuthToken),
    });
  });

  return tableSessionSocket;
}

export function disconnectTableSessionSocket() {
  if (tableSessionSocket) {
    debugSocket(`manual disconnect table-session socket (${tableSessionContextName})`, {
      socketId: tableSessionSocket.id,
    });
    tableSessionSocket.disconnect();
    tableSessionSocket = null;
  }

  tableSessionAuthToken = '';
  tableSessionBaseUrl = '';
  tableSessionContextName = 'unknown';
}

export function connectTableWaitingSocket(
  { tableToken, tableNumber, restaurantId, restaurantSlug },
  contextName = 'unknown',
) {
  const baseUrl = getSocketBaseUrl();
  const normalizedTableToken = normalizeAuthValue(tableToken).toLowerCase();
  const normalizedTableNumber = Number(tableNumber);
  const normalizedRestaurantId = Number(restaurantId) || null;
  const normalizedRestaurantSlug = normalizeAuthValue(restaurantSlug).toLowerCase();
  const normalizedContext = normalizeAuthValue(contextName) || 'unknown';
  const authKey = [
    normalizedTableToken,
    normalizedTableNumber,
    normalizedRestaurantId || '',
    normalizedRestaurantSlug,
  ].join(':');

  if (
    !normalizedTableToken ||
    !Number.isInteger(normalizedTableNumber) ||
    normalizedTableNumber <= 0 ||
    (!normalizedRestaurantId && !normalizedRestaurantSlug)
  ) {
    return null;
  }

  if (tableWaitingSocket && tableWaitingAuthKey === authKey && tableWaitingBaseUrl === baseUrl) {
    tableWaitingContextName = normalizedContext;
    if (!tableWaitingSocket.connected && !tableWaitingSocket.active) {
      tableWaitingSocket.connect();
    }
    return tableWaitingSocket;
  }

  if (tableWaitingSocket) {
    tableWaitingSocket.disconnect();
  }

  tableWaitingSocket = io(baseUrl, {
    path: getSocketPath(),
    transports: ['websocket', 'polling'],
    auth: {
      tableToken: normalizedTableToken,
      tableNumber: normalizedTableNumber,
      ...(normalizedRestaurantId ? { restaurantId: normalizedRestaurantId } : {}),
      ...(normalizedRestaurantSlug ? { restaurantSlug: normalizedRestaurantSlug } : {}),
    },
  });
  tableWaitingAuthKey = authKey;
  tableWaitingBaseUrl = baseUrl;
  tableWaitingContextName = normalizedContext;

  tableWaitingSocket.on('connect', () => {
    debugSocket(`connected table-waiting socket (${tableWaitingContextName})`, {
      socketId: tableWaitingSocket?.id,
      baseUrl: tableWaitingBaseUrl,
      tableToken: getTokenSuffix(normalizedTableToken),
      transport: tableWaitingSocket?.io?.engine?.transport?.name,
    });
  });
  tableWaitingSocket.on('connect_error', (error) => {
    debugSocket(`connect_error table-waiting socket (${tableWaitingContextName})`, {
      message: error?.message,
      baseUrl: tableWaitingBaseUrl,
      tableToken: getTokenSuffix(normalizedTableToken),
    });
  });

  return tableWaitingSocket;
}

export function disconnectTableWaitingSocket() {
  if (tableWaitingSocket) {
    tableWaitingSocket.disconnect();
    tableWaitingSocket = null;
  }

  tableWaitingAuthKey = '';
  tableWaitingBaseUrl = '';
  tableWaitingContextName = 'unknown';
}
