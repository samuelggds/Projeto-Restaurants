import axios from "axios";
import { setSystemBlockState } from "./systemBlock";

const LOCAL_HOSTS = ["localhost", "127.0.0.1", "::1"];

function normalizeBaseUrl(url) {
  return String(url || "")
    .trim()
    .replace(/\/+$/, "");
}

function getRuntimeBaseUrl() {
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
  const alternateProtocol = protocol === "https:" ? "http:" : "https:";

  return [`${protocol}//${host}:3000`, `${alternateProtocol}//${host}:3000`];
}

function getApiBaseUrls() {
  const configuredUrl = normalizeBaseUrl(import.meta.env.VITE_API_URL);
  const runtimeHost = getRuntimeHost();
  const runtimeCandidates =
    getHostCandidates(runtimeHost).map(normalizeBaseUrl);
  const runtimeUrl = normalizeBaseUrl(getRuntimeBaseUrl());
  const defaultLocalUrl = "http://localhost:3000";
  const urls = new Set();

  if (configuredUrl) {
    urls.add(configuredUrl);
  }

  if (runtimeUrl) {
    urls.add(runtimeUrl);
  }

  for (const candidate of runtimeCandidates) {
    if (candidate) {
      urls.add(candidate);
    }
  }

  if (LOCAL_HOSTS.includes(runtimeHost)) {
    urls.add(defaultLocalUrl);
  }

  return urls.size ? [...urls] : [defaultLocalUrl];
}

const API_BASE_URLS = getApiBaseUrls();

const api = axios.create({
  baseURL: API_BASE_URLS[0],
});

// Add auth token to all requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const tableSessionRaw = localStorage.getItem("tableSession");

    if (tableSessionRaw) {
      try {
        const tableSession = JSON.parse(tableSessionRaw);
        const sessionToken =
          localStorage.getItem("tableSessionToken") ||
          tableSession?.sessionToken ||
          null;

        if (sessionToken) {
          config.headers["x-session-token"] = sessionToken;
        }
      } catch {
        // Ignora sessão inválida e continua a requisição.
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const originalConfig = error?.config;
    const hasHttpResponse = Boolean(error?.response);

    // Retry across known base URLs when mobile/web is pointing to a stale host or protocol.
    if (!hasHttpResponse && originalConfig) {
      const currentBase = normalizeBaseUrl(
        originalConfig.baseURL || api.defaults.baseURL,
      );
      const tried = new Set(
        (originalConfig.__triedBaseUrls || []).map(normalizeBaseUrl),
      );
      if (currentBase) {
        tried.add(currentBase);
      }

      const fallbackBase = API_BASE_URLS.find(
        (url) => !tried.has(normalizeBaseUrl(url)),
      );

      if (fallbackBase) {
        api.defaults.baseURL = fallbackBase;
        originalConfig.baseURL = fallbackBase;
        originalConfig.__triedBaseUrls = [
          ...tried,
          normalizeBaseUrl(fallbackBase),
        ];
        return api(originalConfig);
      }
    }

    const status = error?.response?.status;
    const data = error?.response?.data;
    const currentUser = (() => {
      try {
        return JSON.parse(localStorage.getItem("user") || "null");
      } catch {
        return null;
      }
    })();
    const role = currentUser?.role || null;
    const blockedByBilling =
      status === 403 &&
      (data?.code === "BILLING_BLOCKED" ||
        String(data?.error || "")
          .toLowerCase()
          .includes("bloqueado por inadimpl"));

    if (blockedByBilling) {
      if (role === "SUPER_ADMIN") {
        return Promise.reject(error);
      }

      setSystemBlockState({
        message: data?.error || "Sistema bloqueado por inadimplência",
        paymentLink: data?.paymentLink || null,
        invoiceId: data?.invoiceId || null,
        dueDate: data?.dueDate || null,
      });

      const currentPath = window.location.pathname;
      const targetPath =
        role === "ADMIN" ? "/system-blocked" : "/system-maintenance";
      const allowedPaths = [
        "/billing",
        "/system-blocked",
        "/system-maintenance",
        "/login",
      ];

      if (!allowedPaths.includes(currentPath)) {
        window.location.href = targetPath;
      }
    }

    return Promise.reject(error);
  },
);

export default api;
