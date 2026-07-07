import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import QRCode from "react-qr-code";
import {
  Utensils,
  Sun,
  Moon,
  Home,
  User,
  FolderPlus,
  ChevronLeft,
  ChevronRight,
  Menu,
  ChevronDown,
  ChevronUp,
  PlusCircle,
  Table2,
  ClipboardList,
  Users,
  Clock,
  Package,
  CreditCard,
  Image as ImageIcon,
  UserPlus,
  Pencil,
  Trash2,
  Loader2,
  Check,
  Eye,
  EyeOff,
  X,
  Bike,
  LogOut,
} from "lucide-react";
import { toast } from "react-toastify";
import ordersService from "../../Services/ordersService";
import categoriesService from "../../Services/categoriesService";
import productsService from "../../Services/productsService";
import employeesService from "../../Services/employeesService";
import tablesService from "../../Services/tablesService";
import restaurantSettingsService from "../../Services/restaurantSettingsService";
import { connectSocket, disconnectSocket } from "../../Services/socketService";
import { buildPixPayload } from "../../config/pixPayload";
import { resolveCategoryIcon } from "../../config/categoryIconMap";
import { useAuth } from "../../contexts/authContext";
import * as S from "./styles";

const ORDER_STATUSES = [
  "PENDENTE",
  "PREPARANDO",
  "PRONTO",
  "SAIU_PARA_ENTREGA",
  "ENTREGUE",
  "CANCELADO",
];
const ORDER_STATUS_FILTERS = ["TODOS", ...ORDER_STATUSES];
const STATUS_FILTER_TONE_BY_STATUS = {
  TODOS: "default",
  PENDENTE: "warning",
  PREPARANDO: "info",
  PRONTO: "violet",
  SAIU_PARA_ENTREGA: "cyan",
  ENTREGUE: "success",
  CANCELADO: "danger",
};
const CLOSABLE_ORDER_STATUSES = ["ENTREGUE", "CANCELADO"];
const CLOSABLE_PICKUP_ORDER_STATUSES = ["ENTREGUE"];
const CLOSED_DELIVERED_ORDERS_STORAGE_KEY =
  "@PecaJaFood:adminClosedDeliveredOrders";
const DELIVERY_PENDING_DIGITAL_METHODS = new Set([
  "PIX",
  "CARTAO",
  "CARTAO_DEBITO",
  "CARTAO_CREDITO",
]);
const PAYMENT_PIN_TOOLS_ENABLED = false;
const ORDER_STATUS_META = {
  PENDENTE: { label: "Pendente", color: "#f97316" },
  PREPARANDO: { label: "Preparando", color: "#0ea5e9" },
  PRONTO: { label: "Pronto", color: "#f59e0b" },
  SAIU_PARA_ENTREGA: { label: "Em entrega", color: "#3b82f6" },
  ENTREGUE: { label: "Entregue", color: "#22c55e" },
  CANCELADO: { label: "Cancelado", color: "#ef4444" },
};
const EMPLOYEE_FIELD_LABELS = {
  name: "Nome",
  email: "Email",
  password: "Senha",
  confirmPassword: "Confirmacao de senha",
  phone: "Telefone",
  cpf: "CPF",
  role: "Cargo",
};

function createInitialProductForm(categoryId = "") {
  return {
    name: "",
    description: "",
    image: "",
    price: "",
    categoryId,
    preparationTime: "",
    stock: "",
    featured: false,
    active: true,
  };
}

function getAvailableStatusesByOrderType(orderType) {
  const normalizedType = String(orderType || "").toUpperCase();

  if (normalizedType === "RETIRADA") {
    return ORDER_STATUSES.filter((status) => status !== "SAIU_PARA_ENTREGA");
  }

  return ORDER_STATUSES;
}

function canCloseOrder(order) {
  const normalizedType = String(order?.type || "").toUpperCase();
  const normalizedStatus = String(order?.status || "").toUpperCase();

  if (normalizedType === "RETIRADA") {
    return CLOSABLE_PICKUP_ORDER_STATUSES.includes(normalizedStatus);
  }

  return CLOSABLE_ORDER_STATUSES.includes(normalizedStatus);
}

function matchesOrderTypeFilter(order, orderTypeFilter) {
  if (orderTypeFilter === "TODOS") {
    return true;
  }

  const type = String(order?.type || "").toUpperCase();

  if (orderTypeFilter === "MESA") {
    return type === "MESA";
  }

  if (orderTypeFilter === "DELIVERY") {
    return type.includes("DELIVERY");
  }

  if (orderTypeFilter === "RETIRADA") {
    return type === "RETIRADA";
  }

  return true;
}

function matchesStatusFilter(order, statusFilter) {
  if (statusFilter === "TODOS") {
    return true;
  }

  const status = String(order?.status || "").toUpperCase();
  return status === statusFilter;
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function isValidCpf(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!/^\d{11}$/.test(digits)) {
    return false;
  }

  if (/^(\d)\1{10}$/.test(digits)) {
    return false;
  }

  const calculateCheckDigit = (baseDigits, factorStart) => {
    let total = 0;

    for (let i = 0; i < baseDigits.length; i += 1) {
      total += Number(baseDigits[i]) * (factorStart - i);
    }

    const remainder = (total * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  const firstCheckDigit = calculateCheckDigit(digits.slice(0, 9), 10);
  const secondCheckDigit = calculateCheckDigit(digits.slice(0, 10), 11);

  return (
    firstCheckDigit === Number(digits[9]) &&
    secondCheckDigit === Number(digits[10])
  );
}

function isValidBrazilPhonePixKey(value) {
  const digits = String(value || "").replace(/\D/g, "");

  if (/^55\d{10,11}$/.test(digits)) {
    return true;
  }

  if (/^\d{10}$/.test(digits)) {
    return true;
  }

  if (/^\d{11}$/.test(digits) && digits[2] === "9") {
    return true;
  }

  return false;
}

function getPixKeyType(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "EMPTY";
  }

  if (isValidEmail(raw)) {
    return "EMAIL";
  }

  if (isValidCpf(raw)) {
    return "CPF";
  }

  if (isValidBrazilPhonePixKey(raw)) {
    return "PHONE";
  }

  return "INVALID";
}

function formatCpfMask(value) {
  const digits = String(value || "")
    .replace(/\D/g, "")
    .slice(0, 11);

  if (digits.length <= 3) {
    return digits;
  }

  if (digits.length <= 6) {
    return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  }

  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  }

  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function formatBrazilPhoneMask(value) {
  let digits = String(value || "").replace(/\D/g, "");

  if (
    digits.startsWith("55") &&
    (digits.length === 12 || digits.length === 13)
  ) {
    digits = digits.slice(2);
  }

  digits = digits.slice(0, 11);

  if (digits.length <= 2) {
    return digits;
  }

  const ddd = digits.slice(0, 2);
  const local = digits.slice(2);

  if (local.length <= 4) {
    return `(${ddd}) ${local}`;
  }

  if (local.length <= 8) {
    return `(${ddd}) ${local.slice(0, 4)}-${local.slice(4)}`;
  }

  return `(${ddd}) ${local.slice(0, 5)}-${local.slice(5, 9)}`;
}

function normalizePixKeyForInput(value) {
  const raw = String(value || "").trim();

  if (!raw) {
    return "";
  }

  if (raw.includes("@")) {
    return raw.toLowerCase();
  }

  const keyType = getPixKeyType(raw);

  if (keyType === "CPF") {
    return formatCpfMask(raw);
  }

  if (keyType === "PHONE") {
    return formatBrazilPhoneMask(raw);
  }

  return raw;
}

function formatBrazilPhoneInput(value) {
  let digits = String(value || "").replace(/\D/g, "");

  if (
    digits.startsWith("55") &&
    (digits.length === 12 || digits.length === 13)
  ) {
    digits = digits.slice(2);
  }

  digits = digits.slice(0, 11);

  if (digits.length <= 2) {
    return digits;
  }

  const ddd = digits.slice(0, 2);
  const local = digits.slice(2);

  if (local.length <= 4) {
    return `(${ddd}) ${local}`;
  }

  if (local.length <= 8) {
    return `(${ddd}) ${local.slice(0, 4)}-${local.slice(4)}`;
  }

  return `(${ddd}) ${local.slice(0, 5)}-${local.slice(5, 9)}`;
}

function fileToDataUrl(file) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    reader.readAsDataURL(file);
  });
}

function loadImage(source) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error("Não foi possível processar a imagem."));
    image.src = source;
  });
}

async function compressImageFile(
  file,
  { maxWidth, maxHeight, quality = 0.82 },
) {
  const source = await fileToDataUrl(file);
  const image = await loadImage(source);

  const widthRatio = maxWidth / image.width;
  const heightRatio = maxHeight / image.height;
  const ratio = Math.min(widthRatio, heightRatio, 1);

  const targetWidth = Math.max(1, Math.round(image.width * ratio));
  const targetHeight = Math.max(1, Math.round(image.height * ratio));

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Não foi possível preparar o upload da imagem.");
  }

  context.drawImage(image, 0, 0, targetWidth, targetHeight);

  return canvas.toDataURL("image/jpeg", quality);
}

function isValidBrazilPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");

  if (/^55\d{10,11}$/.test(digits)) {
    return true;
  }

  if (/^\d{10}$/.test(digits)) {
    return true;
  }

  if (/^\d{11}$/.test(digits)) {
    return true;
  }

  return false;
}

function parseEmployeeCreationErrorMessages(rawError) {
  if (!rawError) {
    return [];
  }

  if (Array.isArray(rawError)) {
    return rawError.map((item) => String(item)).filter(Boolean);
  }

  const text = String(rawError).trim();

  if (!text.startsWith("[") || !text.endsWith("]")) {
    return [text];
  }

  try {
    const issues = JSON.parse(text);

    if (!Array.isArray(issues)) {
      return [text];
    }

    return issues
      .map((issue) => {
        const field = issue?.path?.[0];
        const label = EMPLOYEE_FIELD_LABELS[field] || null;
        const message = issue?.message ? String(issue.message) : null;

        if (!message) {
          return null;
        }

        return label ? `${label}: ${message}` : message;
      })
      .filter(Boolean);
  } catch {
    return [text];
  }
}

function getEmployeeCreationErrorFeedback(err) {
  const backendError = err?.response?.data?.error;
  const parsedMessages = parseEmployeeCreationErrorMessages(backendError);

  if (parsedMessages.length > 1) {
    return {
      title: "Nao foi possivel cadastrar. Confira os dados:",
      details: parsedMessages,
    };
  }

  if (parsedMessages.length === 1) {
    return {
      title: "Nao foi possivel cadastrar funcionario/motoqueiro",
      details: parsedMessages,
    };
  }

  return {
    title: "Erro ao cadastrar funcionario/motoqueiro",
    details: ["Verifique os campos e tente novamente."],
  };
}

function getInitialClosedDeliveredOrders() {
  const raw = localStorage.getItem(CLOSED_DELIVERED_ORDERS_STORAGE_KEY);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((value) => Number(value))
      .filter((value, index, array) =>
        Number.isInteger(value) && value > 0
          ? array.indexOf(value) === index
          : false,
      );
  } catch {
    return [];
  }
}

function resolveMenuBaseUrl() {
  if (typeof window === "undefined") {
    return null;
  }

  const explicitBase = String(import.meta.env.VITE_QR_BASE_URL || "").trim();
  if (explicitBase) {
    return explicitBase.replace(/\/$/, "");
  }

  const origin = window.location.origin;
  const hostname = window.location.hostname;
  const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";

  if (!isLocalhost) {
    return origin;
  }

  const apiUrl = String(import.meta.env.VITE_API_URL || "").trim();
  if (!apiUrl) {
    return origin;
  }

  try {
    const api = new URL(apiUrl);
    const apiHostIsLocal =
      api.hostname === "localhost" || api.hostname === "127.0.0.1";

    if (apiHostIsLocal) {
      return origin;
    }

    return `${window.location.protocol}//${api.hostname}:${window.location.port}`;
  } catch {
    return origin;
  }
}

function getTableQrValue(table) {
  const tableNumber = Number(table?.number) || 0;
  const tableId = Number(table?.id) || 0;
  const restaurantId = Number(table?.restaurantId) || 0;

  if (
    !tableNumber ||
    !tableId ||
    !restaurantId ||
    typeof window === "undefined"
  ) {
    return `MESA:${tableNumber || tableId || ""}`;
  }

  const menuBaseUrl = resolveMenuBaseUrl() || window.location.origin;

  return `${menuBaseUrl}/mesa/${tableNumber}?tableId=${tableId}&restaurantId=${restaurantId}`;
}

function getQrFileName(tableNumber) {
  const paddedNumber = String(Number(tableNumber) || 0).padStart(2, "0");
  return `mesa-${paddedNumber}-qr.svg`;
}

function getOrderTableLabel(order) {
  const tableNumber = Number(order?.table?.number || order?.tableNumber || 0);

  if (tableNumber > 0) {
    return `Mesa ${tableNumber}`;
  }

  if (order?.type === "MESA" && Number(order?.tableId || 0) > 0) {
    return `Mesa ${Number(order.tableId)}`;
  }

  return null;
}

function getDeliveryAddressLabel(order) {
  const parts = [
    String(order?.address || "").trim(),
    String(order?.number || "").trim(),
    String(order?.district || "").trim(),
    [String(order?.city || "").trim(), String(order?.state || "").trim()]
      .filter(Boolean)
      .join("/"),
    String(order?.zipCode || "").trim(),
  ].filter(Boolean);

  if (!parts.length) {
    return null;
  }

  const base = parts.join(" | ");
  const complement = String(order?.complement || "").trim();
  return complement ? `${base} | Compl.: ${complement}` : base;
}

function isPendingDigitalPayment(order) {
  const orderType = String(order?.type || "").toUpperCase();
  const paymentMethod = String(order?.paymentMethod || "").toUpperCase();
  const isDigital = DELIVERY_PENDING_DIGITAL_METHODS.has(paymentMethod);
  const isDelivery = orderType === "DELIVERY";
  return isDelivery && isDigital && order?.paid !== true;
}

function isDeliveryBlockedUntilPaid(order) {
  return isPendingDigitalPayment(order);
}

function getPaymentSummaryLabel(_order?: any) {
  return "PIX";
}

function getStatusValueIcon(status) {
  const normalized = String(status || "").toUpperCase();

  if (normalized === "PENDENTE" || normalized === "PREPARANDO") {
    return <Clock size={13} />;
  }

  if (normalized === "PRONTO") {
    return <Package size={13} />;
  }

  if (normalized === "SAIU_PARA_ENTREGA") {
    return <Bike size={13} />;
  }

  if (normalized === "ENTREGUE") {
    return <Check size={13} />;
  }

  if (normalized === "CANCELADO") {
    return <X size={13} />;
  }

  return <Clock size={13} />;
}

function canGeneratePin(order) {
  const status = String(order?.status || "").toUpperCase();
  return (
    PAYMENT_PIN_TOOLS_ENABLED &&
    isPendingDigitalPayment(order) &&
    status === "SAIU_PARA_ENTREGA"
  );
}

function formatRequestTime(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function playPinRequestedSound() {
  if (typeof window === "undefined") {
    return;
  }

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    return;
  }

  try {
    const audioContext = new AudioContextClass();
    const gainNode = audioContext.createGain();
    gainNode.gain.value = 0.0001;
    gainNode.connect(audioContext.destination);

    const now = audioContext.currentTime;
    const triggerBeep = (startAt, frequency, duration) => {
      const oscillator = audioContext.createOscillator();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, startAt);
      oscillator.connect(gainNode);

      gainNode.gain.setValueAtTime(0.0001, startAt);
      gainNode.gain.exponentialRampToValueAtTime(0.13, startAt + 0.015);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

      oscillator.start(startAt);
      oscillator.stop(startAt + duration + 0.02);
    };

    triggerBeep(now, 880, 0.12);
    triggerBeep(now + 0.18, 1175, 0.14);

    setTimeout(() => {
      audioContext.close().catch(() => {});
    }, 550);
  } catch {
    // Some browsers block audio autoplay before user interaction.
  }
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState("orders");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(
    () => typeof window !== "undefined" && window.innerWidth <= 768,
  );
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [orders, setOrders] = useState([]);
  const [orderTypeFilter, setOrderTypeFilter] = useState("TODOS");
  const [statusFilter, setStatusFilter] = useState("TODOS");
  const [closingOrderIds, setClosingOrderIds] = useState([]);
  const [generatingPinOrderIds, setGeneratingPinOrderIds] = useState([]);
  const [requestingPaymentPinOrderIds, setRequestingPaymentPinOrderIds] =
    useState([]);
  const [confirmingPaymentPinOrderIds, setConfirmingPaymentPinOrderIds] =
    useState([]);
  const [paymentPinInputByOrderId, setPaymentPinInputByOrderId] = useState({});
  const [expandedOrderIds, setExpandedOrderIds] = useState({});
  const [paymentPinByOrderId, setPaymentPinByOrderId] = useState({});
  const [pinRequestByOrderId, setPinRequestByOrderId] = useState({});
  const [sidebarPinOrderId, setSidebarPinOrderId] = useState("");
  const [isSidebarGeneratingPin, setIsSidebarGeneratingPin] = useState(false);
  const [sidebarGeneratedPin, setSidebarGeneratedPin] = useState(null);
  const pinToastDedupRef = useRef({});
  const [closedDeliveredOrderIds, setClosedDeliveredOrderIds] = useState(
    getInitialClosedDeliveredOrders,
  );
  const [employees, setEmployees] = useState([]);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [tables, setTables] = useState([]);
  const [settingsForm, setSettingsForm] = useState({
    id: null,
    restaurantName: "",
    restaurantLogo: "",
    restaurantCoverImage: "",
    deliveryFee: "",
    minimumOrder: "",
    pixProvider: "MERCADO_PAGO",
    pixKey: "",
    whatsapp: "",
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [brandingUploadState, setBrandingUploadState] = useState({
    restaurantLogo: false,
    restaurantCoverImage: false,
  });

  const [productForm, setProductForm] = useState(createInitialProductForm());
  const [editingProductId, setEditingProductId] = useState(null);
  const [deletingProductId, setDeletingProductId] = useState(null);
  const [productSearchTerm, setProductSearchTerm] = useState("");

  const [employeeData, setEmployeeData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    cpf: "",
    role: "FUNCIONARIO",
  });
  const [categoryName, setCategoryName] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [deletingCategoryId, setDeletingCategoryId] = useState(null);
  const [tableNumber, setTableNumber] = useState("");
  const qrCardRefs = useRef({});

  useEffect(() => {
    function handleResize() {
      setIsMobileViewport(window.innerWidth <= 768);
      if (window.innerWidth > 768) {
        setIsMobileSidebarOpen(false);
      }
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      try {
        const [ordersResult, categoriesResult, employeesResult, tablesResult] =
          await Promise.allSettled([
            ordersService.listRestaurantOrders(),
            categoriesService.listCategories(),
            employeesService.listEmployees(),
            tablesService.listTables(),
          ]);

        if (!mounted) {
          return;
        }

        const ordersData =
          ordersResult.status === "fulfilled" ? ordersResult.value : [];
        const categoriesData =
          categoriesResult.status === "fulfilled" ? categoriesResult.value : [];
        const employeesData =
          employeesResult.status === "fulfilled" ? employeesResult.value : [];
        const tablesData =
          tablesResult.status === "fulfilled" ? tablesResult.value : [];

        setOrders(Array.isArray(ordersData) ? ordersData : []);
        setCategories(Array.isArray(categoriesData) ? categoriesData : []);
        setEmployees(Array.isArray(employeesData) ? employeesData : []);
        setTables(Array.isArray(tablesData) ? tablesData : []);
      } catch (err) {
        toast.error(err?.response?.data?.error || "Erro ao carregar dashboard");
      }
    }

    bootstrap();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadSettings() {
      try {
        const settings = await restaurantSettingsService.getMySettings();

        if (!mounted || !settings) {
          return;
        }

        setSettingsForm({
          id: settings.id || null,
          restaurantName: String(settings?.restaurant?.name || ""),
          restaurantLogo: String(settings?.restaurant?.logo || ""),
          restaurantCoverImage: String(settings?.restaurant?.coverImage || ""),
          deliveryFee:
            settings.deliveryFee !== undefined && settings.deliveryFee !== null
              ? String(settings.deliveryFee)
              : "",
          minimumOrder:
            settings.minimumOrder !== undefined &&
            settings.minimumOrder !== null
              ? String(settings.minimumOrder)
              : "",
          pixProvider: String(settings.pixProvider || "MERCADO_PAGO")
            .trim()
            .toUpperCase(),
          pixKey: String(settings.pixKey || ""),
          whatsapp: formatBrazilPhoneInput(String(settings.whatsapp || "")),
        });
      } catch {
        // Se ainda não houver configurações, o admin pode criar pelo formulário.
      }
    }

    loadSettings();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(
      CLOSED_DELIVERED_ORDERS_STORAGE_KEY,
      JSON.stringify(closedDeliveredOrderIds),
    );
  }, [closedDeliveredOrderIds]);

  useEffect(() => {
    let mounted = true;

    async function refreshProductsTabData() {
      if (activeTab !== "products" && activeTab !== "products-manage") {
        return;
      }

      try {
        const categoriesData = await categoriesService.listCategories();

        if (!mounted) {
          return;
        }

        const nextCategories = Array.isArray(categoriesData)
          ? categoriesData
          : [];

        setCategories(nextCategories);

        setProductForm((prev) => {
          const hasSelectedCategory = nextCategories.some(
            (category) => String(category.id) === String(prev.categoryId || ""),
          );

          return hasSelectedCategory
            ? prev
            : {
                ...prev,
                categoryId: "",
              };
        });
      } catch (err) {
        if (!mounted) {
          return;
        }

        toast.error(
          err?.response?.data?.error ||
            err?.response?.data?.message ||
            "Erro ao atualizar categorias",
        );

        return;
      }

      if (activeTab === "products-manage") {
        try {
          const productsData = await productsService.listProducts();

          if (!mounted) {
            return;
          }

          const nextProducts = Array.isArray(productsData) ? productsData : [];
          setProducts(nextProducts);
        } catch (err) {
          if (!mounted) {
            return;
          }

          toast.error(
            err?.response?.data?.error ||
              err?.response?.data?.message ||
              "Erro ao atualizar produtos",
          );
        }
      }
    }

    refreshProductsTabData();

    return () => {
      mounted = false;
    };
  }, [activeTab]);

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
      if (!canCloseOrder(order)) {
        setClosedDeliveredOrderIds((prev) =>
          prev.filter((id) => id !== order.id),
        );
      }

      setOrders((prev) =>
        prev.map((item) => (item.id === order.id ? order : item)),
      );

      if (order?.paid === true) {
        setPinRequestByOrderId((prev) => {
          const next = { ...prev };
          delete next[order.id];
          return next;
        });

        setPaymentPinInputByOrderId((prev) => {
          const next = { ...prev };
          delete next[order.id];
          return next;
        });
      }
    };

    const onPaymentPinRequested = (payload) => {
      if (!PAYMENT_PIN_TOOLS_ENABLED) {
        return;
      }

      const targetOrderId = Number(payload?.orderId);
      if (!Number.isInteger(targetOrderId) || targetOrderId <= 0) {
        return;
      }

      const requestedAt = payload?.requestedAt || new Date().toISOString();
      const requestedByRole = String(
        payload?.requestedByRole || "",
      ).toUpperCase();
      const requesterLabel =
        requestedByRole === "ADMIN" ? "Admin" : "Motoqueiro";

      setPinRequestByOrderId((prev) => ({
        ...prev,
        [targetOrderId]: {
          requestedAt,
        },
      }));
      playPinRequestedSound();
      toast.info(
        `${requesterLabel} solicitou PIN para o pedido #${targetOrderId}.`,
      );
    };

    const onPaymentPinGenerated = (payload) => {
      if (!PAYMENT_PIN_TOOLS_ENABLED) {
        return;
      }

      const targetOrderId = Number(payload?.orderId);
      if (!Number.isInteger(targetOrderId) || targetOrderId <= 0) {
        return;
      }

      const pinFromEvent = String(payload?.pin || "").trim();
      if (/^\d{4}$/.test(pinFromEvent)) {
        registerGeneratedPin(targetOrderId, {
          pin: pinFromEvent,
          expiresAt: payload?.expiresAt,
        });
      }

      setPinRequestByOrderId((prev) => {
        const next = { ...prev };
        delete next[targetOrderId];
        return next;
      });
    };

    socket.on("new-order", onNewOrder);
    socket.on("order:status-changed", onStatusChanged);
    socket.on("order:payment-pin-requested", onPaymentPinRequested);
    socket.on("order:payment-pin-generated", onPaymentPinGenerated);

    return () => {
      socket.off("new-order", onNewOrder);
      socket.off("order:status-changed", onStatusChanged);
      socket.off("order:payment-pin-requested", onPaymentPinRequested);
      socket.off("order:payment-pin-generated", onPaymentPinGenerated);
      disconnectSocket();
    };
  }, []);

  const handleProductInputChange = (event) => {
    const { name, value, type, checked } = event.target;
    setProductForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const resetProductForm = (categoryId = "") => {
    setEditingProductId(null);
    setProductForm(createInitialProductForm(categoryId));
  };

  const handleStartEditProduct = (product) => {
    setEditingProductId(product.id);
    setProductForm({
      name: String(product?.name || ""),
      description: String(product?.description || ""),
      image: String(product?.image || ""),
      price:
        product?.price !== undefined && product?.price !== null
          ? String(product.price)
          : "",
      categoryId:
        product?.categoryId !== undefined && product?.categoryId !== null
          ? String(product.categoryId)
          : "",
      preparationTime:
        product?.preparationTime !== undefined &&
        product?.preparationTime !== null
          ? String(product.preparationTime)
          : "",
      stock:
        product?.stock !== undefined && product?.stock !== null
          ? String(product.stock)
          : "",
      featured: Boolean(product?.featured),
      active: Boolean(product?.active),
    });
  };

  const handleCancelEditProduct = () => {
    const selectedCategoryId = String(productForm.categoryId || "");
    resetProductForm(selectedCategoryId);
  };

  const handleCreateProduct = async (event) => {
    event.preventDefault();

    if (deletingProductId !== null) {
      return;
    }

    const selectedCategoryId = productForm.categoryId;
    const payload = {
      name: productForm.name,
      description: productForm.description || undefined,
      image: productForm.image || undefined,
      price: Number(productForm.price),
      categoryId: Number(productForm.categoryId),
      preparationTime: productForm.preparationTime
        ? Number(productForm.preparationTime)
        : undefined,
      stock: productForm.stock ? Number(productForm.stock) : undefined,
      featured: productForm.featured,
      active: productForm.active,
    };

    try {
      await productsService.createProduct(payload);

      const productsData = await productsService.listProducts();
      setProducts(Array.isArray(productsData) ? productsData : []);

      toast.success("Produto criado com sucesso!");
      resetProductForm(selectedCategoryId);
    } catch (err) {
      toast.error(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          "Erro ao criar produto",
      );
    }
  };

  const handleSubmitProduct = async (event) => {
    event.preventDefault();

    if (deletingProductId !== null) {
      return;
    }

    if (!editingProductId) {
      toast.error("Selecione um produto da lista para editar.");
      return;
    }

    const selectedCategoryId = productForm.categoryId;
    const payload = {
      name: productForm.name,
      description: productForm.description || undefined,
      image: productForm.image || undefined,
      price: Number(productForm.price),
      categoryId: Number(productForm.categoryId),
      preparationTime: productForm.preparationTime
        ? Number(productForm.preparationTime)
        : undefined,
      stock: productForm.stock ? Number(productForm.stock) : undefined,
      featured: productForm.featured,
      active: productForm.active,
    };

    try {
      await productsService.updateProduct(editingProductId, payload);

      const productsData = await productsService.listProducts();
      setProducts(Array.isArray(productsData) ? productsData : []);

      toast.success("Produto atualizado com sucesso!");
      resetProductForm(selectedCategoryId);
    } catch (err) {
      toast.error(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          "Erro ao atualizar produto",
      );
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (deletingProductId !== null) {
      return;
    }

    const product = products.find(
      (item) => Number(item.id) === Number(productId),
    );

    const confirmed = window.confirm(
      `Deseja realmente excluir o produto "${product?.name || ""}"?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingProductId(productId);
      await productsService.deleteProduct(productId);

      const productsData = await productsService.listProducts();
      setProducts(Array.isArray(productsData) ? productsData : []);

      if (Number(editingProductId) === Number(productId)) {
        resetProductForm(String(productForm.categoryId || ""));
      }

      toast.success("Produto excluido com sucesso!");
    } catch (err) {
      toast.error(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          "Erro ao excluir produto",
      );
    } finally {
      setDeletingProductId(null);
    }
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      const updated = await ordersService.updateStatus(orderId, newStatus);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));

      if (!CLOSABLE_ORDER_STATUSES.includes(newStatus)) {
        setClosedDeliveredOrderIds((prev) =>
          prev.filter((id) => id !== orderId),
        );
      }

      toast.info(`Pedido #${orderId} alterado para ${newStatus}`);
    } catch (err) {
      const message = err?.response?.data?.error || "Erro ao atualizar status";
      const friendlyMessage =
        message.includes("pagamento PIX/CARTAO") ||
        message.includes("ainda não foi confirmado")
          ? "Pagamento pendente: a confirmação por PIN fica apenas no fluxo do motoqueiro."
          : message;
      toast.error(friendlyMessage);
    }
  };

  const handleCloseDeliveredOrder = (orderId) => {
    const targetOrder = orders.find((order) => order.id === orderId);

    if (!targetOrder || !canCloseOrder(targetOrder)) {
      return;
    }

    setClosingOrderIds((prev) =>
      prev.includes(orderId) ? prev : [...prev, orderId],
    );

    setTimeout(() => {
      setClosedDeliveredOrderIds((prev) =>
        prev.includes(orderId) ? prev : [...prev, orderId],
      );
      setOrders((prev) => prev.filter((order) => order.id !== orderId));
      setClosingOrderIds((prev) => prev.filter((id) => id !== orderId));
    }, 320);
  };

  const toggleOrderExpanded = (orderId) => {
    setExpandedOrderIds((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  };

  function registerGeneratedPin(orderId, result) {
    const nextPin = String(result?.pin || "").trim();
    const expiresAt = result?.expiresAt || null;

    setPaymentPinByOrderId((prev) => ({
      ...prev,
      [orderId]: {
        pin: nextPin,
        expiresAt,
      },
    }));

    setPinRequestByOrderId((prev) => {
      const next = { ...prev };
      delete next[orderId];
      return next;
    });

    setSidebarGeneratedPin({
      orderId,
      pin: nextPin,
      expiresAt,
    });

    return { nextPin, expiresAt };
  }

  function showPinGeneratedToast(orderId, pin) {
    const normalizedOrderId = Number(orderId);
    const normalizedPin = String(pin || "").trim();

    if (!Number.isInteger(normalizedOrderId) || normalizedOrderId <= 0) {
      return;
    }

    if (!/^\d{4}$/.test(normalizedPin)) {
      return;
    }

    const dedupKey = `${normalizedOrderId}:${normalizedPin}`;
    const now = Date.now();
    const lastShownAt = Number(pinToastDedupRef.current[dedupKey] || 0);

    if (now - lastShownAt < 1500) {
      return;
    }

    pinToastDedupRef.current[dedupKey] = now;
    toast.success(`PIN do pedido #${normalizedOrderId}: ${normalizedPin}`);
  }

  const handleGeneratePaymentPin = async (order) => {
    if (!order || !isPendingDigitalPayment(order)) {
      return;
    }

    setGeneratingPinOrderIds((prev) =>
      prev.includes(order.id) ? prev : [...prev, order.id],
    );

    try {
      const result = await ordersService.generatePaymentConfirmationPin(
        order.id,
      );
      const { nextPin } = registerGeneratedPin(order.id, result);

      showPinGeneratedToast(order.id, nextPin);
    } catch (err) {
      toast.error(err?.response?.data?.error || "Erro ao gerar PIN");
    } finally {
      setGeneratingPinOrderIds((prev) => prev.filter((id) => id !== order.id));
    }
  };

  const handleRequestPaymentPin = async (order) => {
    const orderId = Number(order?.id);

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return;
    }

    setRequestingPaymentPinOrderIds((prev) =>
      prev.includes(orderId) ? prev : [...prev, orderId],
    );

    try {
      await ordersService.requestPaymentConfirmationPin(orderId);
      toast.success(`PIN solicitado para o pedido #${orderId}`);
    } catch (err) {
      toast.error(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          "Erro ao solicitar PIN",
      );
    } finally {
      setRequestingPaymentPinOrderIds((prev) =>
        prev.filter((id) => id !== orderId),
      );
    }
  };

  const handleConfirmPaymentWithPin = async (order) => {
    const orderId = Number(order?.id);
    const pinValue = String(paymentPinInputByOrderId[orderId] || "").trim();

    if (!Number.isInteger(orderId) || orderId <= 0 || !pinValue) {
      return;
    }

    setConfirmingPaymentPinOrderIds((prev) =>
      prev.includes(orderId) ? prev : [...prev, orderId],
    );

    try {
      const updated = await ordersService.confirmPaymentWithPin(
        orderId,
        pinValue,
      );
      const updatedOrder = updated?.order || updated;

      setOrders((prev) =>
        prev.map((item) => (item.id === orderId ? updatedOrder : item)),
      );

      setPaymentPinInputByOrderId((prev) => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });

      setPinRequestByOrderId((prev) => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });

      toast.success(`Pagamento confirmado no pedido #${orderId}`);
    } catch (err) {
      toast.error(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          "Erro ao confirmar pagamento com PIN",
      );
    } finally {
      setConfirmingPaymentPinOrderIds((prev) =>
        prev.filter((id) => id !== orderId),
      );
    }
  };

  const handleGeneratePaymentPinByOrderId = async (event) => {
    event.preventDefault();

    const orderId = Number(sidebarPinOrderId);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      toast.error("Informe um ID de entrega válido.");
      return;
    }

    setIsSidebarGeneratingPin(true);

    try {
      const result =
        await ordersService.generatePaymentConfirmationPin(orderId);
      const { nextPin } = registerGeneratedPin(orderId, result);
      showPinGeneratedToast(orderId, nextPin);
    } catch (err) {
      toast.error(err?.response?.data?.error || "Erro ao gerar PIN pelo ID");
    } finally {
      setIsSidebarGeneratingPin(false);
    }
  };

  const handleCopySidebarPin = async () => {
    const pin = String(sidebarGeneratedPin?.pin || "").trim();

    if (!/^\d{4}$/.test(pin)) {
      toast.error("Nenhum PIN válido para copiar.");
      return;
    }

    try {
      if (!navigator?.clipboard?.writeText) {
        throw new Error("Clipboard indisponível neste navegador.");
      }

      await navigator.clipboard.writeText(pin);
      toast.success(`PIN ${pin} copiado!`);
    } catch {
      toast.error("Não foi possível copiar o PIN automaticamente.");
    }
  };

  const unarchivedOrders = orders.filter(
    (order) =>
      !(canCloseOrder(order) && closedDeliveredOrderIds.includes(order.id)),
  );

  const orderTypeCounters = {
    TODOS: unarchivedOrders.length,
    DELIVERY: unarchivedOrders.filter((order) =>
      matchesOrderTypeFilter(order, "DELIVERY"),
    ).length,
    MESA: unarchivedOrders.filter((order) =>
      matchesOrderTypeFilter(order, "MESA"),
    ).length,
    RETIRADA: unarchivedOrders.filter((order) =>
      matchesOrderTypeFilter(order, "RETIRADA"),
    ).length,
  };

  const ordersBySelectedType = unarchivedOrders.filter((order) =>
    matchesOrderTypeFilter(order, orderTypeFilter),
  );

  const statusCounters = ORDER_STATUS_FILTERS.reduce<Record<string, number>>(
    (acc, status) => {
      acc[status] = ordersBySelectedType.filter((order) =>
        matchesStatusFilter(order, status),
      ).length;

      return acc;
    },
    {},
  );

  const visibleOrders = ordersBySelectedType.filter((order) =>
    matchesStatusFilter(order, statusFilter),
  );

  const handleCreateEmployee = async (event) => {
    event.preventDefault();

    try {
      await employeesService.createEmployee({
        name: employeeData.name,
        email: employeeData.email,
        password: employeeData.password,
        confirmPassword: employeeData.confirmPassword,
        phone: employeeData.phone,
        cpf: employeeData.cpf || undefined,
        role: employeeData.role,
      });

      const employeesData = await employeesService.listEmployees();
      setEmployees(Array.isArray(employeesData) ? employeesData : []);

      toast.success(`Funcionário ${employeeData.name} cadastrado!`);
      setEmployeeData({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
        phone: "",
        cpf: "",
        role: "FUNCIONARIO",
      });
    } catch (err) {
      const feedback = getEmployeeCreationErrorFeedback(err);

      toast.error(
        <div>
          <strong style={{ display: "block", marginBottom: "0.35rem" }}>
            {feedback.title}
          </strong>
          <div
            style={{
              display: "grid",
              gap: "0.2rem",
              fontSize: "0.9rem",
              lineHeight: 1.35,
            }}
          >
            {feedback.details.map((detail) => (
              <span key={detail}>• {detail}</span>
            ))}
          </div>
        </div>,
        {
          autoClose: 6000,
          closeOnClick: true,
          pauseOnHover: true,
        },
      );
    }
  };

  const handleCreateCategory = async (event) => {
    event.preventDefault();

    if (deletingCategoryId !== null) {
      return;
    }

    const normalizedCategoryName = String(categoryName || "").trim();

    if (!normalizedCategoryName) {
      toast.error("Informe o nome da categoria.");
      return;
    }

    const categoryAlreadyExists = categories.some(
      (category) =>
        String(category?.name || "")
          .trim()
          .toLowerCase() === normalizedCategoryName.toLowerCase(),
    );

    if (categoryAlreadyExists) {
      toast.error("Já existe uma categoria com esse nome.");
      return;
    }

    try {
      const response = await categoriesService.createCategory({
        name: normalizedCategoryName,
      });

      if (response?.category) {
        setCategories((prev) => [...prev, response.category]);
      }

      toast.success("Categoria criada!");
      setCategoryName("");
    } catch (err) {
      toast.error(err?.response?.data?.error || "Erro ao criar categoria");
    }
  };

  const handleStartEditCategory = (category) => {
    setEditingCategoryId(category.id);
    setEditingCategoryName(String(category?.name || ""));
  };

  const handleCancelEditCategory = () => {
    setEditingCategoryId(null);
    setEditingCategoryName("");
  };

  const handleSaveEditCategory = async (categoryId) => {
    const normalizedCategoryName = String(editingCategoryName || "").trim();

    if (!normalizedCategoryName) {
      toast.error("Informe o nome da categoria.");
      return;
    }

    const categoryAlreadyExists = categories.some(
      (category) =>
        Number(category?.id) !== Number(categoryId) &&
        String(category?.name || "")
          .trim()
          .toLowerCase() === normalizedCategoryName.toLowerCase(),
    );

    if (categoryAlreadyExists) {
      toast.error("Já existe uma categoria com esse nome.");
      return;
    }

    try {
      await categoriesService.updateCategory(categoryId, {
        name: normalizedCategoryName,
      });

      setCategories((prev) =>
        prev.map((category) =>
          Number(category.id) === Number(categoryId)
            ? {
                ...category,
                name: normalizedCategoryName,
              }
            : category,
        ),
      );

      toast.success("Categoria atualizada!");
      handleCancelEditCategory();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Erro ao atualizar categoria");
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    if (deletingCategoryId !== null) {
      return;
    }

    const category = categories.find(
      (item) => Number(item.id) === Number(categoryId),
    );

    const confirmed = window.confirm(
      `Deseja realmente excluir a categoria "${category?.name || ""}"?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingCategoryId(categoryId);
      await categoriesService.deleteCategory(categoryId);

      setCategories((prev) =>
        prev.filter(
          (categoryItem) => Number(categoryItem.id) !== Number(categoryId),
        ),
      );

      setProductForm((prev) => {
        if (Number(prev.categoryId) !== Number(categoryId)) {
          return prev;
        }

        return {
          ...prev,
          categoryId: "",
        };
      });

      if (Number(editingCategoryId) === Number(categoryId)) {
        handleCancelEditCategory();
      }

      toast.success("Categoria excluida com sucesso!");
    } catch (err) {
      toast.error(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          "Erro ao excluir categoria",
      );
    } finally {
      setDeletingCategoryId(null);
    }
  };

  const handleCreateTable = async (event) => {
    event.preventDefault();

    try {
      const createdTable = await tablesService.createTable({
        number: Number(tableNumber),
      });

      setTables((prev) => [...prev, createdTable]);
      setTableNumber("");
      toast.success(`Mesa ${createdTable.number} cadastrada!`);
    } catch (err) {
      toast.error(err?.response?.data?.error || "Erro ao cadastrar mesa");
    }
  };

  const handleSettingsFieldChange = (event) => {
    const { name, value } = event.target;
    let nextValue = value;
    if (name === "pixKey") {
      nextValue = normalizePixKeyForInput(value);
    }

    if (name === "whatsapp") {
      nextValue = formatBrazilPhoneInput(value);
    }

    setSettingsForm((prev) => ({
      ...prev,
      [name]: nextValue,
    }));
  };

  const handleBrandingFileChange = async (fieldName, event) => {
    const file = event?.target?.files?.[0];

    if (!file) {
      return;
    }

    const validMimeTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!validMimeTypes.includes(file.type)) {
      toast.error("Use apenas imagens JPG, PNG ou WEBP.");
      event.target.value = "";
      return;
    }

    const maxFileSizeBytes = 7 * 1024 * 1024;

    if (file.size > maxFileSizeBytes) {
      toast.error("A imagem deve ter no máximo 7MB.");
      event.target.value = "";
      return;
    }

    try {
      setBrandingUploadState((prev) => ({
        ...prev,
        [fieldName]: true,
      }));

      const dataUrl = await compressImageFile(file, {
        maxWidth: fieldName === "restaurantCoverImage" ? 1700 : 720,
        maxHeight: fieldName === "restaurantCoverImage" ? 900 : 720,
        quality: 0.84,
      });

      setSettingsForm((prev) => ({
        ...prev,
        [fieldName]: dataUrl,
      }));

      toast.success("Imagem carregada com sucesso.");
    } catch (error) {
      toast.error(error?.message || "Falha ao processar imagem.");
    } finally {
      setBrandingUploadState((prev) => ({
        ...prev,
        [fieldName]: false,
      }));
      event.target.value = "";
    }
  };

  const persistRestaurantSettings = async ({ payload, successMessage }) => {
    const saved = settingsForm.id
      ? await restaurantSettingsService.updateSettings(settingsForm.id, payload)
      : await restaurantSettingsService.createSettings(payload);

    setSettingsForm((prev) => ({
      ...prev,
      id: saved.id || prev.id,
      restaurantName:
        saved.restaurantName ?? payload.restaurantName ?? prev.restaurantName,
      restaurantLogo:
        saved.restaurantLogo ?? payload.restaurantLogo ?? prev.restaurantLogo,
      restaurantCoverImage:
        saved.restaurantCoverImage ??
        payload.restaurantCoverImage ??
        prev.restaurantCoverImage,
      deliveryFee:
        saved.deliveryFee !== undefined && saved.deliveryFee !== null
          ? String(saved.deliveryFee)
          : prev.deliveryFee,
      minimumOrder:
        saved.minimumOrder !== undefined && saved.minimumOrder !== null
          ? String(saved.minimumOrder)
          : prev.minimumOrder,
      pixProvider: String(
        saved.pixProvider || prev.pixProvider || "MERCADO_PAGO",
      )
        .trim()
        .toUpperCase(),
      pixKey: String(saved.pixKey || ""),
      whatsapp: formatBrazilPhoneInput(
        String(saved.whatsapp || prev.whatsapp || ""),
      ),
    }));

    toast.success(successMessage);
  };

  const handleSaveDigitalMenuSettings = async (event) => {
    event.preventDefault();

    if (isSavingSettings || isBrandingUploadInProgress) {
      return;
    }

    try {
      setIsSavingSettings(true);

      const payload = {
        restaurantName:
          String(settingsForm.restaurantName || "").trim() || undefined,
        restaurantLogo:
          String(settingsForm.restaurantLogo || "").trim() || null,
        restaurantCoverImage:
          String(settingsForm.restaurantCoverImage || "").trim() || null,
      };

      await persistRestaurantSettings({
        payload,
        successMessage: "Cardápio digital atualizado com sucesso!",
      });
    } catch (err) {
      toast.error(
        err?.response?.data?.error ||
          err?.message ||
          "Erro ao salvar identidade do cardápio digital",
      );
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleSavePixAndDeliverySettings = async (event) => {
    event.preventDefault();

    if (isSavingSettings) {
      return;
    }

    try {
      setIsSavingSettings(true);

      const payload = {
        deliveryFee:
          settingsForm.deliveryFee === ""
            ? 0
            : Number(settingsForm.deliveryFee),
        minimumOrder:
          settingsForm.minimumOrder === ""
            ? 0
            : Number(settingsForm.minimumOrder),
        pixProvider: String(settingsForm.pixProvider || "MERCADO_PAGO")
          .trim()
          .toUpperCase(),
        pixKey: String(settingsForm.pixKey || "").trim() || null,
        whatsapp: String(settingsForm.whatsapp || "").trim() || null,
      };

      if (
        Number.isNaN(payload.deliveryFee) ||
        Number.isNaN(payload.minimumOrder)
      ) {
        throw new Error(
          "Informe valores numéricos válidos para taxa e pedido mínimo.",
        );
      }

      const pixKeyType = getPixKeyType(payload.pixKey || "");
      if (payload.pixKey && pixKeyType === "INVALID") {
        throw new Error(
          "Chave PIX inválida. Informe uma chave no formato CPF, e-mail ou celular.",
        );
      }

      if (payload.whatsapp && !isValidBrazilPhone(payload.whatsapp)) {
        throw new Error(
          "WhatsApp do restaurante inválido. Informe um celular com DDD.",
        );
      }

      await persistRestaurantSettings({
        payload,
        successMessage: "Configurações de PIX e delivery salvas com sucesso!",
      });
    } catch (err) {
      toast.error(
        err?.response?.data?.error ||
          err?.message ||
          "Erro ao salvar configurações de PIX e delivery",
      );
    } finally {
      setIsSavingSettings(false);
    }
  };

  const getQrSvgMarkup = (tableId) => {
    const cardRef = qrCardRefs.current[tableId];
    const svg = cardRef?.querySelector("svg");

    if (!svg) {
      throw new Error("QR code ainda não foi renderizado.");
    }

    const clonedSvg = svg.cloneNode(true);
    clonedSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clonedSvg.setAttribute("width", "512");
    clonedSvg.setAttribute("height", "512");

    return new XMLSerializer().serializeToString(clonedSvg);
  };

  const handleDownloadTableQr = (table) => {
    try {
      const svgMarkup = getQrSvgMarkup(table.id);
      const blob = new Blob([svgMarkup], {
        type: "image/svg+xml;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = getQrFileName(table.number);
      link.click();

      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error?.message || "Erro ao baixar QR da mesa");
    }
  };

  const handlePrintTableQr = (table) => {
    try {
      const svgMarkup = getQrSvgMarkup(table.id);
      const printWindow = window.open("", "_blank", "width=1240,height=1754");

      if (!printWindow) {
        throw new Error("Não foi possível abrir a janela de impressão.");
      }

      printWindow.document.open();
      printWindow.document.write(`
        <!doctype html>
        <html>
          <head>
            <title>Mesa ${table.number}</title>
            <style>
              * { box-sizing: border-box; }
              body {
                margin: 0;
                width: 210mm;
                height: 297mm;
                min-height: 297mm;
                display: grid;
                place-items: center;
                font-family: Arial, sans-serif;
                background: #f8fafc;
                color: #0f172a;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .sheet {
                width: 100%;
                max-width: 170mm;
                padding: 20mm;
                text-align: center;
              }
              .brand {
                display: inline-flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 18px;
                padding: 10px 16px;
                border-radius: 999px;
                background: rgba(249, 115, 22, 0.12);
                color: #ea580c;
                font-size: 14px;
                font-weight: 800;
                letter-spacing: 0.04em;
                text-transform: uppercase;
              }
              .brand-mark {
                width: 32px;
                height: 32px;
                border-radius: 50%;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                background: linear-gradient(135deg, #f97316, #facc15);
                color: #0f172a;
                font-weight: 900;
              }
              .title {
                font-size: 32px;
                font-weight: 800;
                margin: 0 0 8px;
              }
              .subtitle {
                font-size: 18px;
                margin: 0 0 24px;
                color: #475569;
              }
              .qr-box {
                background: #fff;
                border: 1px solid #e2e8f0;
                border-radius: 24px;
                padding: 28px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 14px 32px rgba(15, 23, 42, 0.08);
              }
              .footer-note {
                margin-top: 22px;
                font-size: 13px;
                color: #64748b;
              }
              svg {
                width: 90mm;
                height: 90mm;
                display: block;
              }
              @page {
                size: A4;
                margin: 0;
              }
            </style>
          </head>
          <body>
            <div class="sheet">
              <div class="brand">
                <span class="brand-mark">PJ</span>
                <span>Peça já food</span>
              </div>
              <h1 class="title">Mesa ${table.number}</h1>
              <p class="subtitle">Escaneie o QR para abrir o cardápio digital e informar o PIN da mesa.</p>
              <div class="qr-box">${svgMarkup}</div>
              <div class="footer-note">Cardápio digital exclusivo desta mesa.</div>
            </div>
            <script>
              window.onload = function () {
                window.focus();
                window.print();
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (error) {
      toast.error(error?.message || "Erro ao imprimir QR da mesa");
    }
  };

  const handlePreviewTableQr = (table) => {
    try {
      const svgMarkup = getQrSvgMarkup(table.id);
      const previewWindow = window.open("", "_blank", "width=1240,height=1754");

      if (!previewWindow) {
        throw new Error("Não foi possível abrir a pré-visualização.");
      }

      previewWindow.document.open();
      previewWindow.document.write(`
        <!doctype html>
        <html>
          <head>
            <title>Prévia da Mesa ${table.number}</title>
            <style>
              * { box-sizing: border-box; }
              body {
                margin: 0;
                width: 210mm;
                height: 297mm;
                min-height: 297mm;
                display: grid;
                place-items: center;
                font-family: Arial, sans-serif;
                background: linear-gradient(180deg, #0f172a, #1e293b);
                color: #f8fafc;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .sheet {
                width: 100%;
                max-width: 170mm;
                padding: 20mm;
                text-align: center;
              }
              .brand {
                display: inline-flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 18px;
                padding: 10px 16px;
                border-radius: 999px;
                background: rgba(255, 255, 255, 0.08);
                color: #f8fafc;
                font-size: 14px;
                font-weight: 800;
                letter-spacing: 0.04em;
                text-transform: uppercase;
              }
              .brand-mark {
                width: 32px;
                height: 32px;
                border-radius: 50%;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                background: linear-gradient(135deg, #f97316, #facc15);
                color: #0f172a;
                font-weight: 900;
              }
              .title {
                font-size: 32px;
                font-weight: 800;
                margin: 0 0 8px;
              }
              .subtitle {
                font-size: 18px;
                margin: 0 0 24px;
                color: #cbd5e1;
              }
              .qr-box {
                background: #ffffff;
                border-radius: 24px;
                padding: 28px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 20px 50px rgba(15, 23, 42, 0.35);
              }
              .footer-note {
                margin-top: 22px;
                font-size: 13px;
                color: #cbd5e1;
              }
              svg {
                width: 90mm;
                height: 90mm;
                display: block;
              }
              .hint {
                margin-top: 18px;
                font-size: 14px;
                color: #94a3b8;
              }
              @page {
                size: A4;
                margin: 0;
              }
            </style>
          </head>
          <body>
            <div class="sheet">
              <div class="brand">
                <span class="brand-mark">PJ</span>
                <span>Peça já food</span>
              </div>
              <h1 class="title">Mesa ${table.number}</h1>
              <p class="subtitle">Esta é a pré-visualização do QR para impressão.</p>
              <div class="qr-box">${svgMarkup}</div>
              <div class="hint">Use os botões abaixo para baixar ou imprimir a versão final.</div>
              <div class="footer-note">Cardápio digital exclusivo desta mesa.</div>
            </div>
          </body>
        </html>
      `);
      previewWindow.document.close();
    } catch (error) {
      toast.error(error?.message || "Erro ao abrir pré-visualização");
    }
  };

  const currentPixKey = String(settingsForm.pixKey || "").trim();
  const currentPixKeyType = getPixKeyType(currentPixKey);
  const hasPixKey = currentPixKey.length > 0;
  const isPixKeyInvalid = currentPixKeyType === "INVALID";
  const isBrandingUploadInProgress =
    brandingUploadState.restaurantLogo ||
    brandingUploadState.restaurantCoverImage;

  const pixKeyTypeLabel =
    currentPixKeyType === "EMAIL"
      ? "Chave detectada: e-mail"
      : currentPixKeyType === "CPF"
        ? "Chave detectada: CPF"
        : currentPixKeyType === "PHONE"
          ? "Chave detectada: celular"
          : "";

  const pixPreviewPayload = buildPixPayload({
    pixKey: isPixKeyInvalid ? "" : currentPixKey,
    merchantName: "RESTAURANTE",
    merchantCity: "SAO PAULO",
    txid: "PREVIEW",
  });

  const tabBreadcrumbMap = {
    orders: { section: "Operação", label: "Pedidos Real-Time" },
    categories: { section: "Cardápio", label: "Criar Categoria" },
    products: { section: "Cardápio", label: "Criar Produto" },
    "products-manage": { section: "Cardápio", label: "Gerenciar Produtos" },
    tables: { section: "Atendimento", label: "Criar Mesa" },
    employees: { section: "Gestão", label: "Equipe / Funcionários" },
    settings: { section: "Configurações da Marca", label: "PIX e Delivery" },
    "digital-menu": {
      section: "Configurações da Marca",
      label: "Editar Cardápio Digital",
    },
  };

  const activeTabBreadcrumb = tabBreadcrumbMap[activeTab] || {
    section: "Admin",
    label: "Painel",
  };

  const handleCopyTableQrLink = async (table) => {
    try {
      const qrValue = getTableQrValue(table);

      if (!navigator?.clipboard?.writeText) {
        throw new Error("Seu navegador não permite copiar automaticamente.");
      }

      await navigator.clipboard.writeText(qrValue);
      toast.success(`Link da mesa ${table.number} copiado!`);
    } catch (error) {
      toast.error(error?.message || "Erro ao copiar link da mesa");
    }
  };

  const handleDeactivateEmployee = async (employeeId) => {
    try {
      await employeesService.deactivateEmployee(employeeId);
      setEmployees((prev) =>
        prev.filter((employee) => employee.id !== employeeId),
      );
      toast.info("Funcionário desativado.");
    } catch (err) {
      toast.error(err?.response?.data?.error || "Erro ao remover funcionário");
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <ThemeProvider theme={isDarkMode ? S.darkTheme : S.lightTheme}>
      <S.AdminLayout>
        {isMobileViewport && !isMobileSidebarOpen && (
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(true)}
            style={{
              position: "fixed",
              top: "max(12px, env(safe-area-inset-top))",
              left: "max(10px, env(safe-area-inset-left))",
              zIndex: 45,
              width: "clamp(36px, 10vw, 40px)",
              height: "clamp(36px, 10vw, 40px)",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.32)",
              background: "linear-gradient(160deg, #ea1d2c 0%, #b8141f 100%)",
              color: "#fff",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 10px 24px rgba(15, 23, 42, 0.28)",
            }}
            aria-label="Abrir menu lateral"
            title="Abrir menu"
          >
            <Menu size={18} />
          </button>
        )}

        {isMobileSidebarOpen && (
          <div
            onClick={() => setIsMobileSidebarOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(2, 6, 23, 0.45)",
              zIndex: 35,
            }}
          />
        )}

        <S.Sidebar
          $collapsed={isSidebarCollapsed}
          $mobileOpen={isMobileSidebarOpen}
        >
          <S.Brand $collapsed={isSidebarCollapsed}>
            <div className="brand-logo">
              <Utensils size={22} strokeWidth={2.5} />
              {!isSidebarCollapsed && (
                <div className="brand-text">
                  <h1>Peça já food</h1>
                  <span>Painel Admin</span>
                </div>
              )}
            </div>
            <button
              className="toggle-btn"
              onClick={() => {
                if (isMobileViewport) {
                  setIsMobileSidebarOpen(false);
                  return;
                }

                setIsSidebarCollapsed(!isSidebarCollapsed);
              }}
            >
              {isMobileViewport ? (
                <X size={16} />
              ) : isSidebarCollapsed ? (
                <ChevronRight size={16} />
              ) : (
                <ChevronLeft size={16} />
              )}
            </button>
          </S.Brand>

          {!isSidebarCollapsed && (
            <div
              style={{
                margin: "0 0.25rem",
                display: "grid",
                gap: "14px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  color: "#ffffff",
                }}
              >
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 14,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    background: "rgba(255, 255, 255, 0.15)",
                    color: "#ffffff",
                  }}
                >
                  <User size={26} />
                </div>
                <div>
                  <div
                    style={{
                      margin: 0,
                      fontSize: 18,
                      fontWeight: 700,
                    }}
                  >
                    Olá, Admin
                  </div>
                  <small
                    style={{
                      fontSize: 12,
                      opacity: 0.75,
                      marginTop: 2,
                      display: "block",
                    }}
                  >
                    Painel operacional
                  </small>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  background: "rgba(255, 255, 255, 0.1)",
                  borderRadius: 14,
                  padding: 14,
                  color: "#ffffff",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "10px",
                      fontSize: 11,
                      opacity: 0.75,
                    }}
                  >
                    <Package size={18} style={{ opacity: 0.85 }} /> Prontos
                  </span>
                  <strong
                    style={{
                      marginLeft: "auto",
                      fontSize: 20,
                      fontWeight: 700,
                      lineHeight: 1,
                    }}
                  >
                    {statusCounters.PRONTO || 0}
                  </strong>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "10px",
                      fontSize: 11,
                      opacity: 0.75,
                    }}
                  >
                    <Clock size={18} style={{ opacity: 0.85 }} /> Em rota
                  </span>
                  <strong
                    style={{
                      marginLeft: "auto",
                      fontSize: 20,
                      fontWeight: 700,
                      lineHeight: 1,
                    }}
                  >
                    {statusCounters.SAIU_PARA_ENTREGA || 0}
                  </strong>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "10px",
                      fontSize: 11,
                      opacity: 0.75,
                    }}
                  >
                    <Check size={18} style={{ opacity: 0.85 }} /> Entregues
                  </span>
                  <strong
                    style={{
                      marginLeft: "auto",
                      fontSize: 20,
                      fontWeight: 700,
                      lineHeight: 1,
                    }}
                  >
                    {statusCounters.ENTREGUE || 0}
                  </strong>
                </div>
              </div>
            </div>
          )}

          <S.NavigationList>
            <S.NavButton onClick={() => navigate("/")}>
              <Home size={20} />
              {!isSidebarCollapsed && <span>Ir para Home</span>}
            </S.NavButton>

            <S.NavButton onClick={() => navigate("/employees")}>
              <ClipboardList size={20} />
              {!isSidebarCollapsed && <span>Ir para Funcionarios</span>}
            </S.NavButton>

            <S.NavButton onClick={() => navigate("/courier")}>
              <Bike size={20} />
              {!isSidebarCollapsed && <span>Ir para Motoqueiro</span>}
            </S.NavButton>

            <S.NavButton onClick={() => navigate("/profile")}>
              <User size={20} />
              {!isSidebarCollapsed && <span>Ir para Perfil</span>}
            </S.NavButton>

            <div
              style={{
                margin: "0.85rem 0 0.35rem",
                fontSize: "0.72rem",
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#ffe4e6",
                display: "flex",
                alignItems: "center",
                gap: "0.55rem",
              }}
            >
              {!isSidebarCollapsed && (
                <>
                  <span
                    style={{
                      flex: 1,
                      height: 1,
                      background: "rgba(255, 255, 255, 0.34)",
                    }}
                  />
                  <span>Ferramentas do Admin</span>
                  <span
                    style={{
                      flex: 1,
                      height: 1,
                      background: "rgba(255, 255, 255, 0.34)",
                    }}
                  />
                </>
              )}
            </div>

            <S.NavButton
              $active={activeTab === "orders"}
              onClick={() => setActiveTab("orders")}
            >
              <ClipboardList size={20} />
              {!isSidebarCollapsed && <span>Pedidos Real-Time</span>}
            </S.NavButton>

            <S.NavButton
              $active={activeTab === "categories"}
              onClick={() => setActiveTab("categories")}
            >
              <FolderPlus size={20} />
              {!isSidebarCollapsed && <span>Criar Categoria</span>}
            </S.NavButton>

            <S.NavButton
              $active={activeTab === "products"}
              onClick={() => {
                setActiveTab("products");
                setEditingProductId(null);
                setProductForm((prev) =>
                  createInitialProductForm(String(prev.categoryId || "")),
                );
              }}
            >
              <PlusCircle size={20} />
              {!isSidebarCollapsed && <span>Criar Produto</span>}
            </S.NavButton>

            <S.NavButton
              $active={activeTab === "products-manage"}
              onClick={() => {
                setActiveTab("products-manage");
                setProductSearchTerm("");
              }}
            >
              <Package size={20} />
              {!isSidebarCollapsed && <span>Gerenciar Produtos</span>}
            </S.NavButton>

            <S.NavButton
              $active={activeTab === "tables"}
              onClick={() => setActiveTab("tables")}
            >
              <Table2 size={20} />
              {!isSidebarCollapsed && <span>Criar Mesa</span>}
            </S.NavButton>

            <S.NavButton
              $active={activeTab === "employees"}
              onClick={() => setActiveTab("employees")}
            >
              <Users size={20} />
              {!isSidebarCollapsed && <span>Equipe / Funcionários</span>}
            </S.NavButton>

            <div
              style={{
                margin: "1.05rem 0 0.35rem",
                fontSize: "0.72rem",
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#ffe4e6",
                display: "flex",
                alignItems: "center",
                gap: "0.55rem",
              }}
            >
              {!isSidebarCollapsed && (
                <>
                  <span
                    style={{
                      flex: 1,
                      height: 1,
                      background: "rgba(255, 255, 255, 0.34)",
                    }}
                  />
                  <span>Configurações da Marca</span>
                  <span
                    style={{
                      flex: 1,
                      height: 1,
                      background: "rgba(255, 255, 255, 0.34)",
                    }}
                  />
                </>
              )}
            </div>

            <S.NavButton
              $active={activeTab === "digital-menu"}
              onClick={() => setActiveTab("digital-menu")}
            >
              <ImageIcon size={20} />
              {!isSidebarCollapsed && <span>Editar Cardápio Digital</span>}
            </S.NavButton>

            <S.NavButton
              $active={activeTab === "settings"}
              onClick={() => setActiveTab("settings")}
            >
              <CreditCard size={20} />
              {!isSidebarCollapsed && <span>PIX e Delivery</span>}
            </S.NavButton>
          </S.NavigationList>

          <S.SidebarFooter>
            {!isSidebarCollapsed && PAYMENT_PIN_TOOLS_ENABLED && (
              <form
                onSubmit={handleGeneratePaymentPinByOrderId}
                style={{
                  border: "1px solid rgba(249, 115, 22, 0.28)",
                  borderRadius: 10,
                  padding: "0.7rem",
                  marginBottom: "0.8rem",
                  background: isDarkMode
                    ? "rgba(249, 115, 22, 0.08)"
                    : "rgba(249, 115, 22, 0.12)",
                  display: "grid",
                  gap: "0.45rem",
                }}
              >
                <strong
                  style={{
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    color: isDarkMode ? "#fdba74" : "#9a3412",
                  }}
                >
                  Gerador de PIN por ID
                </strong>

                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={sidebarPinOrderId}
                  onChange={(event) =>
                    setSidebarPinOrderId(
                      event.target.value.replace(/\D/g, "").slice(0, 10),
                    )
                  }
                  placeholder="ID da entrega"
                  style={{
                    width: "100%",
                    minHeight: 36,
                    borderRadius: 8,
                    border: "1px solid rgba(148, 163, 184, 0.4)",
                    padding: "0 0.65rem",
                    background: isDarkMode ? "#0f172a" : "#d8e2ed",
                    color: isDarkMode ? "#e2e8f0" : "#0f172a",
                    fontWeight: 700,
                  }}
                />

                <button
                  type="submit"
                  disabled={isSidebarGeneratingPin}
                  style={{
                    width: "100%",
                    minHeight: 36,
                    borderRadius: 8,
                    border: "1px solid rgba(249, 115, 22, 0.45)",
                    background: "linear-gradient(135deg, #fb923c, #ea580c)",
                    color: "#111827",
                    fontWeight: 800,
                    cursor: isSidebarGeneratingPin ? "not-allowed" : "pointer",
                    opacity: isSidebarGeneratingPin ? 0.65 : 1,
                  }}
                >
                  {isSidebarGeneratingPin ? "Gerando..." : "Gerar PIN"}
                </button>

                {sidebarGeneratedPin?.pin ? (
                  <>
                    <small
                      style={{
                        color: isDarkMode ? "#fed7aa" : "#7c2d12",
                        lineHeight: 1.4,
                      }}
                    >
                      Pedido #{sidebarGeneratedPin.orderId}: PIN{" "}
                      {sidebarGeneratedPin.pin}
                      {sidebarGeneratedPin.expiresAt
                        ? ` (expira ${formatRequestTime(sidebarGeneratedPin.expiresAt)})`
                        : ""}
                    </small>

                    <button
                      type="button"
                      onClick={handleCopySidebarPin}
                      style={{
                        width: "100%",
                        minHeight: 34,
                        borderRadius: 8,
                        border: "1px solid rgba(234, 29, 44, 0.45)",
                        background: "linear-gradient(135deg, #ea1d2c, #b8141f)",
                        color: "#ffffff",
                        fontWeight: 800,
                        cursor: "pointer",
                      }}
                    >
                      Copiar PIN
                    </button>
                  </>
                ) : null}
              </form>
            )}

            <S.ThemeToggle onClick={() => setIsDarkMode(!isDarkMode)}>
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
              {!isSidebarCollapsed && (
                <span>{isDarkMode ? "Modo Claro" : "Modo Escuro"}</span>
              )}
            </S.ThemeToggle>

            <S.NavButton
              style={{ marginTop: "0.5rem", color: "#ef4444" }}
              onClick={handleLogout}
            >
              <LogOut size={20} />
              {!isSidebarCollapsed && <span>Sair</span>}
            </S.NavButton>
          </S.SidebarFooter>
        </S.Sidebar>

        <S.MainContent>
          <div
            style={{
              marginBottom: "1rem",
              padding: "0.58rem 0.78rem",
              borderRadius: 10,
              border: "1px solid rgba(148, 163, 184, 0.26)",
              background: isDarkMode
                ? "rgba(15, 23, 42, 0.36)"
                : "rgba(207, 217, 228, 0.92)",
              color: isDarkMode ? "#cbd5e1" : "#475569",
              fontSize: "0.83rem",
              fontWeight: 600,
              letterSpacing: "0.01em",
            }}
          >
            <span style={{ opacity: 0.9 }}>Painel Admin</span>
            <span style={{ opacity: 0.7 }}>
              {" "}
              / {activeTabBreadcrumb.section}
            </span>
            <span style={{ color: isDarkMode ? "#f8fafc" : "#0f172a" }}>
              {" "}
              / {activeTabBreadcrumb.label}
            </span>
          </div>

          {activeTab === "orders" && (
            <div>
              <S.PageHeader>
                <h2
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.55rem",
                  }}
                >
                  Pedidos em Tempo Real
                  <span
                    style={{
                      fontSize: "0.76rem",
                      fontWeight: 800,
                      padding: "0.22rem 0.55rem",
                      borderRadius: 999,
                      background: "rgba(234, 29, 44, 0.16)",
                      color: isDarkMode ? "#fecdd3" : "#9f1239",
                    }}
                  >
                    {visibleOrders.length}
                  </span>
                </h2>
                <p>
                  Painel no estilo motoqueiro com filtros avançados do admin.
                </p>
              </S.PageHeader>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                  gap: "0.7rem",
                  marginBottom: "1rem",
                }}
              >
                <S.FormCard
                  style={{ padding: "0.9rem 1rem", maxWidth: "none" }}
                >
                  <small style={{ opacity: 0.72 }}>Prontos</small>
                  <div
                    style={{
                      marginTop: "0.2rem",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.45rem",
                      fontSize: "1.28rem",
                      fontWeight: 800,
                      color: "#ea1d2c",
                    }}
                  >
                    <Package size={18} /> {statusCounters.PRONTO || 0}
                  </div>
                </S.FormCard>
                <S.FormCard
                  style={{ padding: "0.9rem 1rem", maxWidth: "none" }}
                >
                  <small style={{ opacity: 0.72 }}>Em rota</small>
                  <div
                    style={{
                      marginTop: "0.2rem",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.45rem",
                      fontSize: "1.28rem",
                      fontWeight: 800,
                      color: "#ea1d2c",
                    }}
                  >
                    <Bike size={18} /> {statusCounters.SAIU_PARA_ENTREGA || 0}
                  </div>
                </S.FormCard>
                <S.FormCard
                  style={{ padding: "0.9rem 1rem", maxWidth: "none" }}
                >
                  <small style={{ opacity: 0.72 }}>Concluídos</small>
                  <div
                    style={{
                      marginTop: "0.2rem",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.45rem",
                      fontSize: "1.28rem",
                      fontWeight: 800,
                      color: "#22c55e",
                    }}
                  >
                    <Check size={18} /> {statusCounters.ENTREGUE || 0}
                  </div>
                </S.FormCard>
              </div>

              <S.OrdersFilterBar>
                <S.OrderTypeFilterButton
                  type="button"
                  $active={orderTypeFilter === "TODOS"}
                  onClick={() => setOrderTypeFilter("TODOS")}
                >
                  Todos ({orderTypeCounters.TODOS})
                </S.OrderTypeFilterButton>

                <S.OrderTypeFilterButton
                  type="button"
                  $active={orderTypeFilter === "DELIVERY"}
                  onClick={() => setOrderTypeFilter("DELIVERY")}
                >
                  Delivery ({orderTypeCounters.DELIVERY})
                </S.OrderTypeFilterButton>

                <S.OrderTypeFilterButton
                  type="button"
                  $active={orderTypeFilter === "MESA"}
                  onClick={() => setOrderTypeFilter("MESA")}
                >
                  Mesa ({orderTypeCounters.MESA})
                </S.OrderTypeFilterButton>

                <S.OrderTypeFilterButton
                  type="button"
                  $active={orderTypeFilter === "RETIRADA"}
                  onClick={() => setOrderTypeFilter("RETIRADA")}
                >
                  Retirada ({orderTypeCounters.RETIRADA})
                </S.OrderTypeFilterButton>
              </S.OrdersFilterBar>

              <S.OrdersFilterBar>
                {ORDER_STATUS_FILTERS.map((status) => {
                  const isAll = status === "TODOS";
                  const label = isAll
                    ? "Todos"
                    : String(status).replace(/_/g, " ");
                  const tone =
                    STATUS_FILTER_TONE_BY_STATUS[status] || "default";

                  return (
                    <S.OrderTypeFilterButton
                      key={status}
                      type="button"
                      $tone={tone}
                      $active={statusFilter === status}
                      onClick={() => setStatusFilter(status)}
                    >
                      {label} ({statusCounters[status] || 0})
                    </S.OrderTypeFilterButton>
                  );
                })}
              </S.OrdersFilterBar>

              <S.OrdersGrid>
                {visibleOrders.map((order) => {
                  const isDelivery = String(order?.type || "")
                    .toUpperCase()
                    .includes("DELIVERY");
                  const deliveryCustomerName = "Admin Pizza IA";
                  const paymentSummaryLabel = getPaymentSummaryLabel(order);
                  const deliveryAddressLabel = getDeliveryAddressLabel(order);
                  const pendingDigitalPayment =
                    PAYMENT_PIN_TOOLS_ENABLED && isPendingDigitalPayment(order);
                  const deliveryBlockedUntilPaid =
                    isDeliveryBlockedUntilPaid(order);
                  const canGenerateOrderPin = canGeneratePin(order);
                  const isGeneratingPin = generatingPinOrderIds.includes(
                    order.id,
                  );
                  const pinEntry = paymentPinByOrderId[order.id] || null;
                  const pinRequestEntry = pinRequestByOrderId[order.id] || null;
                  const hasPinRequest = Boolean(pinRequestEntry);
                  const pinRequestedAtLabel = formatRequestTime(
                    pinRequestEntry?.requestedAt,
                  );
                  const paymentPinInput = String(
                    paymentPinInputByOrderId[order.id] || "",
                  );
                  const isRequestingPaymentPin =
                    requestingPaymentPinOrderIds.includes(order.id);
                  const isConfirmingPaymentPin =
                    confirmingPaymentPinOrderIds.includes(order.id);
                  const isExpanded = Boolean(expandedOrderIds[order.id]);
                  const statusLabel =
                    ORDER_STATUS_META[String(order?.status || "")]?.label ||
                    String(order.status).replace(/_/g, " ");
                  const tableLabel = getOrderTableLabel(order);
                  const infoChipStyle = {
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 12,
                    color: "#475569",
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: 6,
                    padding: "3px 8px",
                  };

                  return (
                    <S.OrderCard
                      key={order.id}
                      $isClosing={closingOrderIds.includes(order.id)}
                      $hasPinSection={
                        PAYMENT_PIN_TOOLS_ENABLED &&
                        (pendingDigitalPayment ||
                          hasPinRequest ||
                          Boolean(pinEntry?.pin))
                      }
                    >
                      {/** badge de mesa para facilitar identificação de pedidos presenciais */}
                      <div className="card-header">
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => toggleOrderExpanded(order.id)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              toggleOrderExpanded(order.id);
                            }
                          }}
                          style={{ cursor: "pointer" }}
                        >
                          <h3>Pedido #{order.id}</h3>
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: "0.5rem",
                              marginTop: "0.35rem",
                            }}
                          >
                            <span style={infoChipStyle}>
                              {getStatusValueIcon(order.status)}
                              Status: {statusLabel}
                            </span>
                            <span style={infoChipStyle}>
                              {String(order.type || "")
                                .toUpperCase()
                                .includes("DELIVERY") ? (
                                <Bike size={13} />
                              ) : String(order.type || "")
                                  .toUpperCase()
                                  .includes("MESA") ? (
                                <Table2 size={13} />
                              ) : (
                                <Package size={13} />
                              )}
                              {String(order.type || "").toUpperCase() ===
                              "DELIVERY"
                                ? "ENTREGA"
                                : order.type}
                            </span>
                            {tableLabel ? (
                              <span style={infoChipStyle}>
                                <Table2 size={13} />
                                {tableLabel}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <S.CardHeaderActions>
                          <span className="price">
                            R$ {Number(order.total || 0).toFixed(2)}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleOrderExpanded(order.id)}
                            style={{
                              border: "none",
                              background: "transparent",
                              color: isDarkMode ? "#cbd5e1" : "#334155",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              marginRight: "0.1rem",
                            }}
                            title={isExpanded ? "Recolher" : "Expandir"}
                            aria-label={
                              isExpanded ? "Recolher pedido" : "Expandir pedido"
                            }
                          >
                            {isExpanded ? (
                              <ChevronUp size={16} />
                            ) : (
                              <ChevronDown size={16} />
                            )}
                          </button>

                          {canCloseOrder(order) && (
                            <S.CloseDeliveredButton
                              type="button"
                              onClick={() =>
                                handleCloseDeliveredOrder(order.id)
                              }
                              aria-label={`Fechar pedido ${order.id}`}
                              title={`Fechar pedido ${String(order.status).toLowerCase()}`}
                            >
                              <X size={14} />
                            </S.CloseDeliveredButton>
                          )}
                        </S.CardHeaderActions>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "0.5rem",
                          marginBottom: "0.5rem",
                        }}
                      >
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            fontSize: 12,
                            color: "#475569",
                            background: "#f8fafc",
                            border: "1px solid #e2e8f0",
                            borderRadius: 6,
                            padding: "3px 8px",
                          }}
                        >
                          <User size={13} />
                          {deliveryCustomerName}
                        </span>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            fontSize: 12,
                            color: "#475569",
                            background: "#f8fafc",
                            border: "1px solid #e2e8f0",
                            borderRadius: 6,
                            padding: "3px 8px",
                          }}
                        >
                          <CreditCard size={13} />
                          {paymentSummaryLabel}
                          {order.paid ? " | Confirmado" : ""}
                        </span>
                      </div>

                      <div
                        className="items-list"
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "0.5rem",
                          marginBottom: "0.55rem",
                        }}
                      >
                        {(order.items || []).map((item, index) => (
                          <span
                            key={`${order.id}-${String(item?.product?.name || "item")}-${index}`}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              fontSize: 12,
                              color: "#475569",
                              background: "#f8fafc",
                              border: "1px solid #e2e8f0",
                              borderRadius: 6,
                              padding: "3px 8px",
                            }}
                          >
                            <Package size={13} />
                            {`${item.quantity}x ${item?.product?.name || "Produto"}`}
                          </span>
                        ))}
                      </div>

                      {isExpanded && isDelivery ? (
                        <div
                          style={{
                            marginTop: "0.25rem",
                            marginBottom: "0.55rem",
                            fontSize: "0.88rem",
                            color: isDarkMode ? "#cbd5e1" : "#334155",
                            lineHeight: 1.45,
                          }}
                        >
                          <div>
                            <strong>Cliente:</strong> {deliveryCustomerName}
                          </div>
                          <div>
                            <strong>Entrega:</strong>{" "}
                            {deliveryAddressLabel ||
                              "Endereço não informado no pedido."}
                          </div>
                        </div>
                      ) : null}

                      {pendingDigitalPayment ? (
                        <div
                          style={{
                            display: "grid",
                            gap: "0.45rem",
                            marginTop: "-0.2rem",
                          }}
                        >
                          {hasPinRequest ? (
                            <div
                              style={{
                                border: "1px solid rgba(251, 191, 36, 0.45)",
                                borderRadius: 10,
                                background: "rgba(251, 191, 36, 0.13)",
                                padding: "0.5rem 0.65rem",
                                color: isDarkMode ? "#fef3c7" : "#78350f",
                                fontSize: "0.8rem",
                                fontWeight: 700,
                                textTransform: "uppercase",
                                letterSpacing: "0.03em",
                              }}
                            >
                              PIN solicitado para este pedido
                              {pinRequestedAtLabel
                                ? ` em ${pinRequestedAtLabel}`
                                : " agora"}
                            </div>
                          ) : null}

                          {canGenerateOrderPin ? (
                            <button
                              type="button"
                              onClick={() => handleGeneratePaymentPin(order)}
                              disabled={isGeneratingPin}
                              style={{
                                width: "100%",
                                minHeight: 40,
                                borderRadius: 10,
                                border: "1px solid rgba(217, 119, 6, 0.45)",
                                background:
                                  "linear-gradient(135deg, #f59e0b, #d97706)",
                                color: "#111827",
                                fontWeight: 800,
                                cursor: isGeneratingPin
                                  ? "not-allowed"
                                  : "pointer",
                                opacity: isGeneratingPin ? 0.65 : 1,
                              }}
                            >
                              {isGeneratingPin
                                ? "Gerando PIN..."
                                : "Gerar PIN (4 dígitos) para motoqueiro"}
                            </button>
                          ) : null}

                          {canGenerateOrderPin ? (
                            <button
                              type="button"
                              onClick={() => handleRequestPaymentPin(order)}
                              disabled={
                                isRequestingPaymentPin || isConfirmingPaymentPin
                              }
                              style={{
                                width: "100%",
                                minHeight: 38,
                                borderRadius: 10,
                                border: "1px solid rgba(234, 29, 44, 0.45)",
                                background: "rgba(234, 29, 44, 0.18)",
                                color: isDarkMode ? "#fecdd3" : "#9f1239",
                                fontWeight: 700,
                                cursor:
                                  isRequestingPaymentPin ||
                                  isConfirmingPaymentPin
                                    ? "not-allowed"
                                    : "pointer",
                                opacity:
                                  isRequestingPaymentPin ||
                                  isConfirmingPaymentPin
                                    ? 0.7
                                    : 1,
                              }}
                            >
                              {isRequestingPaymentPin
                                ? "Solicitando PIN..."
                                : "Solicitar PIN de Pagamento"}
                            </button>
                          ) : null}

                          {canGenerateOrderPin ? (
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns: "1fr auto",
                                gap: "0.45rem",
                              }}
                            >
                              <input
                                type="text"
                                value={paymentPinInput}
                                placeholder="Digite o PIN"
                                maxLength={8}
                                onChange={(event) => {
                                  const value = event.target.value;
                                  setPaymentPinInputByOrderId((prev) => ({
                                    ...prev,
                                    [order.id]: value,
                                  }));
                                }}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter") {
                                    event.preventDefault();
                                    handleConfirmPaymentWithPin(order);
                                  }
                                }}
                                style={{
                                  width: "100%",
                                  minHeight: 38,
                                  borderRadius: 8,
                                  border: "1px solid rgba(148, 163, 184, 0.5)",
                                  padding: "0 0.65rem",
                                  background: isDarkMode
                                    ? "#0f172a"
                                    : "#ffffff",
                                  color: isDarkMode ? "#f8fafc" : "#0f172a",
                                }}
                              />

                              <button
                                type="button"
                                onClick={() =>
                                  handleConfirmPaymentWithPin(order)
                                }
                                disabled={
                                  isConfirmingPaymentPin ||
                                  isRequestingPaymentPin ||
                                  paymentPinInput.trim().length === 0
                                }
                                style={{
                                  minHeight: 38,
                                  borderRadius: 8,
                                  border: "1px solid rgba(34, 197, 94, 0.45)",
                                  background: "rgba(34, 197, 94, 0.2)",
                                  color: isDarkMode ? "#dcfce7" : "#166534",
                                  fontWeight: 700,
                                  whiteSpace: "nowrap",
                                  padding: "0 0.82rem",
                                  cursor:
                                    isConfirmingPaymentPin ||
                                    isRequestingPaymentPin ||
                                    paymentPinInput.trim().length === 0
                                      ? "not-allowed"
                                      : "pointer",
                                  opacity:
                                    isConfirmingPaymentPin ||
                                    isRequestingPaymentPin ||
                                    paymentPinInput.trim().length === 0
                                      ? 0.7
                                      : 1,
                                }}
                              >
                                {isConfirmingPaymentPin
                                  ? "..."
                                  : "Confirmar PIN"}
                              </button>
                            </div>
                          ) : null}

                          {pinEntry?.pin ? (
                            <div
                              style={{
                                border: "1px solid rgba(14, 165, 233, 0.35)",
                                borderRadius: 10,
                                background: "rgba(234, 29, 44, 0.12)",
                                padding: "0.55rem 0.65rem",
                                color: isDarkMode ? "#e2e8f0" : "#0f172a",
                                display: "grid",
                                gap: "0.2rem",
                              }}
                            >
                              <strong style={{ letterSpacing: "0.12em" }}>
                                PIN: {pinEntry.pin}
                              </strong>
                              <small>
                                {pinEntry.expiresAt
                                  ? `Expira em ${new Date(
                                      pinEntry.expiresAt,
                                    ).toLocaleTimeString("pt-BR", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}`
                                  : "Compartilhe este PIN com o motoqueiro."}
                              </small>
                            </div>
                          ) : null}
                        </div>
                      ) : null}

                      <S.StatusBox>
                        <h4>
                          Status Atual:{" "}
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              fontSize: 12,
                              color: "#475569",
                              background: "#f8fafc",
                              border: "1px solid #e2e8f0",
                              borderRadius: 6,
                              padding: "3px 8px",
                              textTransform: "none",
                              marginLeft: 4,
                            }}
                          >
                            {getStatusValueIcon(order.status)}
                            {String(order.status).replace(/_/g, " ")}
                          </span>
                        </h4>

                        <S.ButtonGroup>
                          {getAvailableStatusesByOrderType(order.type).map(
                            (status) => (
                              <button
                                key={status}
                                className={`btn ${order.status === status ? `active-${String(status).toLowerCase()}` : ""}`}
                                disabled={
                                  String(status).toUpperCase() === "ENTREGUE" &&
                                  deliveryBlockedUntilPaid
                                }
                                title={
                                  String(status).toUpperCase() === "ENTREGUE" &&
                                  deliveryBlockedUntilPaid
                                    ? "Confirme o pagamento antes de marcar como entregue"
                                    : ""
                                }
                                onClick={() =>
                                  handleUpdateStatus(order.id, status)
                                }
                              >
                                {String(status).replace(/_/g, " ")}
                              </button>
                            ),
                          )}
                        </S.ButtonGroup>
                      </S.StatusBox>
                    </S.OrderCard>
                  );
                })}
              </S.OrdersGrid>
            </div>
          )}

          {activeTab === "categories" && (
            <S.FormCard>
              <S.PageHeader>
                <h2>Nova Categoria</h2>
                <p>
                  O icone da categoria e definido automaticamente com base no
                  nome cadastrado.
                </p>
              </S.PageHeader>
              <form onSubmit={handleCreateCategory}>
                <S.FormGroup>
                  <label>Nome da Categoria</label>
                  <input
                    type="text"
                    placeholder="Ex: Hambúrgueres Artesanais, Bebidas, Pizzas..."
                    value={categoryName}
                    disabled={deletingCategoryId !== null}
                    onChange={(event) => setCategoryName(event.target.value)}
                    required
                  />
                </S.FormGroup>
                <S.SubmitBtn
                  type="submit"
                  style={{ marginTop: "1.5rem" }}
                  disabled={deletingCategoryId !== null}
                >
                  Salvar Categoria
                </S.SubmitBtn>
              </form>

              <div
                style={{ marginTop: "1.5rem", display: "grid", gap: "0.5rem" }}
              >
                {categories.map((category) => {
                  const Icon = resolveCategoryIcon(category?.name);
                  const isDeletingAnyCategory = deletingCategoryId !== null;
                  const isEditing =
                    Number(editingCategoryId) === Number(category.id);
                  const isDeleting =
                    Number(deletingCategoryId) === Number(category.id);

                  return (
                    <S.CategoryListItem key={category.id}>
                      {isEditing ? (
                        <S.CategoryInlineEditor>
                          <input
                            type="text"
                            disabled={isDeletingAnyCategory}
                            value={editingCategoryName}
                            onChange={(event) =>
                              setEditingCategoryName(event.target.value)
                            }
                            placeholder="Nome da categoria"
                          />
                          <S.CategoryActionButton
                            type="button"
                            disabled={isDeletingAnyCategory}
                            onClick={() => handleSaveEditCategory(category.id)}
                            title="Salvar"
                          >
                            <Check size={15} />
                          </S.CategoryActionButton>
                          <S.CategoryActionButton
                            type="button"
                            disabled={isDeletingAnyCategory}
                            onClick={handleCancelEditCategory}
                            title="Cancelar"
                          >
                            <X size={15} />
                          </S.CategoryActionButton>
                        </S.CategoryInlineEditor>
                      ) : (
                        <>
                          <S.SlugBadge>
                            <Icon size={15} />
                            {category.name}
                          </S.SlugBadge>
                          <S.CategoryActions>
                            <S.CategoryActionButton
                              type="button"
                              disabled={isDeletingAnyCategory}
                              onClick={() => handleStartEditCategory(category)}
                              title="Editar categoria"
                            >
                              <Pencil size={15} />
                            </S.CategoryActionButton>
                            <S.CategoryActionButton
                              type="button"
                              onClick={() => handleDeleteCategory(category.id)}
                              title="Excluir categoria"
                              disabled={isDeletingAnyCategory}
                            >
                              {isDeleting ? (
                                <Loader2 size={15} className="loading-icon" />
                              ) : (
                                <Trash2 size={15} />
                              )}
                            </S.CategoryActionButton>
                          </S.CategoryActions>
                        </>
                      )}
                    </S.CategoryListItem>
                  );
                })}
              </div>
            </S.FormCard>
          )}

          {activeTab === "products" && (
            <S.FormCard>
              <S.PageHeader>
                <h2>Novo Produto do Cardápio</h2>
              </S.PageHeader>

              <form onSubmit={handleCreateProduct}>
                <S.FormRow>
                  <S.FormGroup style={{ flex: 2 }}>
                    <label>Nome do Produto *</label>
                    <input
                      type="text"
                      name="name"
                      placeholder="Ex: Burger Duplo Bacon Cheddar"
                      value={productForm.name}
                      disabled={deletingProductId !== null}
                      onChange={handleProductInputChange}
                      required
                    />
                  </S.FormGroup>
                  <S.FormGroup style={{ flex: 1 }}>
                    <label>Categoria *</label>
                    <select
                      name="categoryId"
                      value={productForm.categoryId}
                      disabled={deletingProductId !== null}
                      onChange={handleProductInputChange}
                      required
                    >
                      <option value="">Selecione a categoria...</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </S.FormGroup>
                </S.FormRow>

                <S.FormRow style={{ marginTop: "1rem" }}>
                  <S.FormGroup>
                    <label>Preço *</label>
                    <input
                      type="number"
                      step="0.01"
                      name="price"
                      placeholder="0,00"
                      value={productForm.price}
                      disabled={deletingProductId !== null}
                      onChange={handleProductInputChange}
                      required
                    />
                  </S.FormGroup>
                  <S.FormGroup>
                    <label>
                      <Clock size={14} /> Preparo (Min)
                    </label>
                    <input
                      type="number"
                      name="preparationTime"
                      placeholder="Ex: 15"
                      value={productForm.preparationTime}
                      disabled={deletingProductId !== null}
                      onChange={handleProductInputChange}
                    />
                  </S.FormGroup>
                  <S.FormGroup>
                    <label>
                      <Package size={14} /> Estoque
                    </label>
                    <input
                      type="number"
                      name="stock"
                      placeholder="Ex: 50"
                      value={productForm.stock}
                      disabled={deletingProductId !== null}
                      onChange={handleProductInputChange}
                    />
                  </S.FormGroup>
                </S.FormRow>

                <S.FormGroup style={{ marginTop: "1rem" }}>
                  <label>
                    <ImageIcon size={14} /> URL da Imagem
                  </label>
                  <input
                    type="url"
                    name="image"
                    placeholder="https://exemplo.com/imagem.jpg"
                    value={productForm.image}
                    disabled={deletingProductId !== null}
                    onChange={handleProductInputChange}
                  />
                </S.FormGroup>

                <S.FormGroup style={{ marginTop: "1rem" }}>
                  <label>Descrição</label>
                  <input
                    type="text"
                    name="description"
                    placeholder="Descrição do produto"
                    value={productForm.description}
                    disabled={deletingProductId !== null}
                    onChange={handleProductInputChange}
                  />
                </S.FormGroup>

                <S.CheckboxContainerRow
                  style={{ marginTop: "1.5rem", marginBottom: "1.5rem" }}
                >
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="featured"
                      checked={productForm.featured}
                      disabled={deletingProductId !== null}
                      onChange={handleProductInputChange}
                    />
                    <span>🌟 Destacar Produto</span>
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="active"
                      checked={productForm.active}
                      disabled={deletingProductId !== null}
                      onChange={handleProductInputChange}
                    />
                    <span>🟢 Produto Ativo</span>
                  </label>
                </S.CheckboxContainerRow>

                <S.FormRow>
                  <S.SubmitBtn
                    type="submit"
                    style={{ flex: 1 }}
                    disabled={deletingProductId !== null}
                  >
                    Publicar Produto
                  </S.SubmitBtn>
                </S.FormRow>
              </form>
            </S.FormCard>
          )}

          {activeTab === "products-manage" && (
            <S.FormCard>
              <S.PageHeader>
                <h2>Gerenciar Produtos</h2>
                <p>Edite ou exclua produtos já cadastrados.</p>
              </S.PageHeader>

              <form onSubmit={handleSubmitProduct}>
                <S.FormRow>
                  <S.FormGroup style={{ flex: 2 }}>
                    <label>Nome do Produto *</label>
                    <input
                      type="text"
                      name="name"
                      placeholder="Selecione um produto para editar"
                      value={productForm.name}
                      disabled={deletingProductId !== null}
                      onChange={handleProductInputChange}
                      required
                    />
                  </S.FormGroup>
                  <S.FormGroup style={{ flex: 1 }}>
                    <label>Categoria *</label>
                    <select
                      name="categoryId"
                      value={productForm.categoryId}
                      disabled={deletingProductId !== null}
                      onChange={handleProductInputChange}
                      required
                    >
                      <option value="">Selecione a categoria...</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </S.FormGroup>
                </S.FormRow>

                <S.FormRow style={{ marginTop: "1rem" }}>
                  <S.FormGroup>
                    <label>Preço *</label>
                    <input
                      type="number"
                      step="0.01"
                      name="price"
                      placeholder="0,00"
                      value={productForm.price}
                      disabled={deletingProductId !== null}
                      onChange={handleProductInputChange}
                      required
                    />
                  </S.FormGroup>
                  <S.FormGroup>
                    <label>
                      <Clock size={14} /> Preparo (Min)
                    </label>
                    <input
                      type="number"
                      name="preparationTime"
                      placeholder="Ex: 15"
                      value={productForm.preparationTime}
                      disabled={deletingProductId !== null}
                      onChange={handleProductInputChange}
                    />
                  </S.FormGroup>
                  <S.FormGroup>
                    <label>
                      <Package size={14} /> Estoque
                    </label>
                    <input
                      type="number"
                      name="stock"
                      placeholder="Ex: 50"
                      value={productForm.stock}
                      disabled={deletingProductId !== null}
                      onChange={handleProductInputChange}
                    />
                  </S.FormGroup>
                </S.FormRow>

                <S.FormGroup style={{ marginTop: "1rem" }}>
                  <label>
                    <ImageIcon size={14} /> URL da Imagem
                  </label>
                  <input
                    type="url"
                    name="image"
                    placeholder="https://exemplo.com/imagem.jpg"
                    value={productForm.image}
                    disabled={deletingProductId !== null}
                    onChange={handleProductInputChange}
                  />
                </S.FormGroup>

                <S.FormGroup style={{ marginTop: "1rem" }}>
                  <label>Descrição</label>
                  <input
                    type="text"
                    name="description"
                    placeholder="Descrição do produto"
                    value={productForm.description}
                    disabled={deletingProductId !== null}
                    onChange={handleProductInputChange}
                  />
                </S.FormGroup>

                <S.CheckboxContainerRow
                  style={{ marginTop: "1.5rem", marginBottom: "1.5rem" }}
                >
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="featured"
                      checked={productForm.featured}
                      disabled={deletingProductId !== null}
                      onChange={handleProductInputChange}
                    />
                    <span>🌟 Destacar Produto</span>
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="active"
                      checked={productForm.active}
                      disabled={deletingProductId !== null}
                      onChange={handleProductInputChange}
                    />
                    <span>🟢 Produto Ativo</span>
                  </label>
                </S.CheckboxContainerRow>

                <S.FormRow>
                  <S.SubmitBtn
                    type="submit"
                    style={{ flex: 1 }}
                    disabled={deletingProductId !== null || !editingProductId}
                  >
                    Salvar Alteracoes
                  </S.SubmitBtn>
                  <S.CancelBtn
                    type="button"
                    style={{ flex: 1 }}
                    disabled={deletingProductId !== null}
                    onClick={handleCancelEditProduct}
                  >
                    Limpar Edicao
                  </S.CancelBtn>
                </S.FormRow>
              </form>

              <S.FormGroup style={{ marginTop: "1.5rem" }}>
                <label>Buscar Produto</label>
                <input
                  type="text"
                  placeholder="Digite nome ou categoria"
                  value={productSearchTerm}
                  onChange={(event) => setProductSearchTerm(event.target.value)}
                />
              </S.FormGroup>

              <div
                style={{ marginTop: "1.5rem", display: "grid", gap: "0.5rem" }}
              >
                {products.filter((product) => {
                  const term = String(productSearchTerm || "")
                    .trim()
                    .toLowerCase();

                  if (!term) {
                    return true;
                  }

                  const productName = String(product?.name || "").toLowerCase();
                  const categoryName = String(
                    product?.category?.name || "",
                  ).toLowerCase();

                  return (
                    productName.includes(term) || categoryName.includes(term)
                  );
                }).length === 0 ? (
                  <div style={{ opacity: 0.7 }}>Nenhum produto cadastrado.</div>
                ) : (
                  products
                    .filter((product) => {
                      const term = String(productSearchTerm || "")
                        .trim()
                        .toLowerCase();

                      if (!term) {
                        return true;
                      }

                      const productName = String(
                        product?.name || "",
                      ).toLowerCase();
                      const categoryName = String(
                        product?.category?.name || "",
                      ).toLowerCase();

                      return (
                        productName.includes(term) ||
                        categoryName.includes(term)
                      );
                    })
                    .map((product) => {
                      const isDeleting =
                        Number(deletingProductId) === Number(product.id);
                      const isDeletingAnyProduct = deletingProductId !== null;

                      return (
                        <S.ProductListItem key={product.id}>
                          <S.ProductMeta>
                            <strong>{product.name}</strong>
                            <small>
                              {(product?.category?.name || "Sem categoria") +
                                " • R$ " +
                                Number(product?.price || 0).toFixed(2)}
                            </small>
                          </S.ProductMeta>

                          <S.ProductActions>
                            <S.CategoryActionButton
                              type="button"
                              disabled={isDeletingAnyProduct}
                              onClick={() => handleStartEditProduct(product)}
                              title="Editar produto"
                            >
                              <Pencil size={15} />
                            </S.CategoryActionButton>

                            <S.CategoryActionButton
                              type="button"
                              disabled={isDeletingAnyProduct}
                              onClick={() => handleDeleteProduct(product.id)}
                              title="Excluir produto"
                            >
                              {isDeleting ? (
                                <Loader2 size={15} className="loading-icon" />
                              ) : (
                                <Trash2 size={15} />
                              )}
                            </S.CategoryActionButton>
                          </S.ProductActions>
                        </S.ProductListItem>
                      );
                    })
                )}
              </div>
            </S.FormCard>
          )}

          {activeTab === "tables" && (
            <S.FormCard>
              <S.PageHeader>
                <h2>Nova Mesa</h2>
              </S.PageHeader>

              <form onSubmit={handleCreateTable}>
                <S.FormRow>
                  <S.FormGroup style={{ flex: 1 }}>
                    <label>Número da Mesa *</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="Ex: 1"
                      value={tableNumber}
                      onChange={(event) => setTableNumber(event.target.value)}
                      required
                    />
                  </S.FormGroup>
                </S.FormRow>

                <S.SubmitBtn type="submit" style={{ marginTop: "1.5rem" }}>
                  Cadastrar Mesa
                </S.SubmitBtn>
              </form>

              <div style={{ marginTop: "1.5rem" }}>
                {tables.length === 0 ? (
                  <div style={{ opacity: 0.7 }}>Nenhuma mesa cadastrada.</div>
                ) : (
                  <S.TableQrGrid>
                    {tables.map((table) => {
                      const qrValue = getTableQrValue(table);

                      return (
                        <S.TableQrCard
                          key={table.id}
                          ref={(node) => {
                            if (node) {
                              qrCardRefs.current[table.id] = node;
                            }
                          }}
                        >
                          <S.TableQrCodeBox>
                            <QRCode
                              value={qrValue}
                              size={160}
                              bgColor="#ffffff"
                              fgColor="#111827"
                              level="M"
                            />
                          </S.TableQrCodeBox>
                          <S.TableQrMeta>
                            <S.SlugBadge>Mesa {table.number}</S.SlugBadge>
                            <small>Abre o cardápio da mesa</small>
                            <S.TableQrActions>
                              <S.TableQrActionButton
                                type="button"
                                onClick={() => handlePreviewTableQr(table)}
                              >
                                Ver
                              </S.TableQrActionButton>
                              <S.TableQrActionButton
                                type="button"
                                onClick={() => handleCopyTableQrLink(table)}
                              >
                                Copiar
                              </S.TableQrActionButton>
                              <S.TableQrActionButton
                                type="button"
                                onClick={() => handleDownloadTableQr(table)}
                              >
                                Baixar
                              </S.TableQrActionButton>
                              <S.TableQrActionButton
                                type="button"
                                onClick={() => handlePrintTableQr(table)}
                              >
                                Imprimir
                              </S.TableQrActionButton>
                            </S.TableQrActions>
                          </S.TableQrMeta>
                        </S.TableQrCard>
                      );
                    })}
                  </S.TableQrGrid>
                )}
              </div>
            </S.FormCard>
          )}

          {activeTab === "employees" && (
            <S.FlexDashboardLayout>
              <S.FormCard>
                <S.FormSectionTitle>
                  <UserPlus size={18} style={{ marginRight: "0.5rem" }} />{" "}
                  Adicionar à Equipe
                </S.FormSectionTitle>
                <form onSubmit={handleCreateEmployee}>
                  <S.FormRow>
                    <S.FormGroup>
                      <label>Nome</label>
                      <input
                        type="text"
                        placeholder="Nome completo"
                        value={employeeData.name}
                        onChange={(event) =>
                          setEmployeeData({
                            ...employeeData,
                            name: event.target.value,
                          })
                        }
                        required
                      />
                    </S.FormGroup>
                    <S.FormGroup>
                      <label>Telefone</label>
                      <input
                        type="text"
                        placeholder="(11) 99999-9999"
                        value={employeeData.phone}
                        onChange={(event) =>
                          setEmployeeData({
                            ...employeeData,
                            phone: event.target.value,
                          })
                        }
                        required
                      />
                    </S.FormGroup>
                  </S.FormRow>

                  <S.FormRow style={{ marginTop: "1rem" }}>
                    <S.FormGroup style={{ flex: 1 }}>
                      <label>
                        CPF{" "}
                        <span
                          style={{
                            fontWeight: 400,
                            color: "#94a3b8",
                            fontSize: "12px",
                          }}
                        >
                          (opcional)
                        </span>
                      </label>
                      <input
                        type="text"
                        placeholder="000.000.000-00"
                        value={employeeData.cpf}
                        maxLength={14}
                        onChange={(event) => {
                          const digits = event.target.value
                            .replace(/\D/g, "")
                            .slice(0, 11);
                          const masked = digits
                            .replace(/(\d{3})(\d)/, "$1.$2")
                            .replace(/(\d{3})(\d)/, "$1.$2")
                            .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
                          setEmployeeData({ ...employeeData, cpf: masked });
                        }}
                      />
                    </S.FormGroup>
                  </S.FormRow>

                  <S.FormRow style={{ marginTop: "1rem" }}>
                    <S.FormGroup style={{ flex: 1.5 }}>
                      <label>E-mail</label>
                      <input
                        type="email"
                        placeholder="exemplo@restaurante.com"
                        value={employeeData.email}
                        onChange={(event) =>
                          setEmployeeData({
                            ...employeeData,
                            email: event.target.value,
                          })
                        }
                        required
                      />
                    </S.FormGroup>
                    <S.FormGroup style={{ flex: 1 }}>
                      <label>Perfil</label>
                      <select
                        value={employeeData.role}
                        onChange={(event) =>
                          setEmployeeData({
                            ...employeeData,
                            role: event.target.value,
                          })
                        }
                      >
                        <option value="FUNCIONARIO">Funcionário</option>
                        <option value="MOTOQUEIRO">Motoqueiro</option>
                      </select>
                    </S.FormGroup>
                  </S.FormRow>

                  <S.FormRow style={{ marginTop: "1rem" }}>
                    <S.FormGroup style={{ flex: 1 }}>
                      <label>Senha</label>
                      <S.PasswordInputWrapper>
                        <input
                          type={showPassword ? "text" : "password"}
                          placeholder="Digite uma senha"
                          value={employeeData.password}
                          onChange={(event) =>
                            setEmployeeData({
                              ...employeeData,
                              password: event.target.value,
                            })
                          }
                          required
                        />
                        <button
                          type="button"
                          className="toggle-password"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff size={16} />
                          ) : (
                            <Eye size={16} />
                          )}
                        </button>
                      </S.PasswordInputWrapper>
                    </S.FormGroup>

                    <S.FormGroup style={{ flex: 1 }}>
                      <label>Confirmar Senha</label>
                      <S.PasswordInputWrapper>
                        <input
                          type={showPassword ? "text" : "password"}
                          placeholder="Confirme a senha"
                          value={employeeData.confirmPassword}
                          onChange={(event) =>
                            setEmployeeData({
                              ...employeeData,
                              confirmPassword: event.target.value,
                            })
                          }
                          required
                        />
                        <button
                          type="button"
                          className="toggle-password"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff size={16} />
                          ) : (
                            <Eye size={16} />
                          )}
                        </button>
                      </S.PasswordInputWrapper>
                    </S.FormGroup>
                  </S.FormRow>
                  <S.SubmitBtn type="submit" style={{ marginTop: "1.5rem" }}>
                    Cadastrar
                  </S.SubmitBtn>
                </form>
              </S.FormCard>

              <S.TableContainer>
                <S.Table>
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>E-mail</th>
                      <th>Telefone</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((emp) => (
                      <tr key={emp.id}>
                        <td>
                          <strong>{emp.name}</strong>
                        </td>
                        <td>{emp.email}</td>
                        <td>{emp.phone || "-"}</td>
                        <td>
                          <button
                            style={{
                              background: "transparent",
                              border: "none",
                              color: "#ef4444",
                              cursor: "pointer",
                              fontWeight: "bold",
                            }}
                            onClick={() => handleDeactivateEmployee(emp.id)}
                          >
                            Remover
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </S.Table>
              </S.TableContainer>
            </S.FlexDashboardLayout>
          )}

          {activeTab === "settings" && (
            <S.FormCard>
              <S.PageHeader>
                <h2>Configurações de PIX e Delivery</h2>
                <p>
                  Configure a cobrança do checkout e os parâmetros de entrega.
                </p>
              </S.PageHeader>

              <form onSubmit={handleSavePixAndDeliverySettings}>
                <S.FormRow>
                  <S.FormGroup>
                    <label>Taxa de Entrega (R$)</label>
                    <input
                      type="number"
                      name="deliveryFee"
                      step="0.01"
                      min="0"
                      placeholder="Ex: 8.50"
                      value={settingsForm.deliveryFee}
                      onChange={handleSettingsFieldChange}
                    />
                  </S.FormGroup>

                  <S.FormGroup>
                    <label>Pedido Mínimo (R$)</label>
                    <input
                      type="number"
                      name="minimumOrder"
                      step="0.01"
                      min="0"
                      placeholder="Ex: 20.00"
                      value={settingsForm.minimumOrder}
                      onChange={handleSettingsFieldChange}
                    />
                  </S.FormGroup>
                </S.FormRow>

                <S.FormGroup style={{ marginTop: "1rem" }}>
                  <label>WhatsApp do Restaurante</label>
                  <input
                    type="text"
                    name="whatsapp"
                    placeholder="Ex: (85) 99999-9999"
                    value={settingsForm.whatsapp}
                    onChange={handleSettingsFieldChange}
                  />
                  <small style={{ opacity: 0.8, lineHeight: 1.4 }}>
                    Esse número será usado como remetente da confirmação de
                    pagamento para o cliente.
                  </small>
                </S.FormGroup>

                <S.FormGroup style={{ marginTop: "1rem" }}>
                  <label>Provedor PIX</label>
                  <select
                    name="pixProvider"
                    value={settingsForm.pixProvider}
                    onChange={handleSettingsFieldChange}
                  >
                    <option value="MERCADO_PAGO">Mercado Pago</option>
                    <option value="NUBANK">Nubank</option>
                    <option value="PICPAY">PicPay</option>
                  </select>
                </S.FormGroup>

                <S.FormGroup style={{ marginTop: "1rem" }}>
                  <label>Chave PIX</label>
                  <input
                    type="text"
                    name="pixKey"
                    placeholder="Ex: email@dominio.com, CPF ou celular com DDD"
                    value={settingsForm.pixKey}
                    onChange={handleSettingsFieldChange}
                  />
                  {hasPixKey && isPixKeyInvalid ? (
                    <small
                      style={{
                        display: "block",
                        marginTop: "0.45rem",
                        color: "#dc2626",
                        fontWeight: 600,
                      }}
                    >
                      Formato inválido. Use apenas CPF, e-mail ou celular.
                    </small>
                  ) : hasPixKey ? (
                    <small
                      style={{
                        display: "block",
                        marginTop: "0.45rem",
                        color: "#16a34a",
                        fontWeight: 600,
                      }}
                    >
                      {pixKeyTypeLabel}
                    </small>
                  ) : null}
                </S.FormGroup>

                <S.SubmitBtn
                  type="submit"
                  style={{ marginTop: "1.25rem" }}
                  disabled={isSavingSettings || isPixKeyInvalid}
                >
                  {isSavingSettings ? "Salvando..." : "Salvar PIX e Delivery"}
                </S.SubmitBtn>
              </form>

              <div style={{ marginTop: "1.75rem" }}>
                <h3 style={{ marginBottom: "0.5rem" }}>
                  Pré-visualização do QR PIX
                </h3>
                {hasPixKey && !isPixKeyInvalid ? (
                  <div
                    style={{
                      border: "1px solid rgba(148, 163, 184, 0.35)",
                      borderRadius: "16px",
                      padding: "1rem",
                      display: "grid",
                      gap: "0.75rem",
                      justifyItems: "start",
                      maxWidth: "360px",
                    }}
                  >
                    <div
                      style={{
                        background: isDarkMode ? "#0f172a" : "#d8e2ed",
                        borderRadius: "12px",
                        padding: "0.75rem",
                      }}
                    >
                      <QRCode
                        value={pixPreviewPayload}
                        size={160}
                        bgColor="#ffffff"
                        fgColor="#111827"
                        level="M"
                      />
                    </div>
                    <small style={{ opacity: 0.85, lineHeight: 1.4 }}>
                      Esse QR é gerado automaticamente a partir da chave PIX do
                      provedor selecionado e será exibido para o cliente no
                      checkout delivery.
                    </small>
                  </div>
                ) : (
                  <small style={{ opacity: 0.75 }}>
                    Informe uma chave PIX válida (CPF, e-mail ou celular) para
                    visualizar e habilitar o QR Code.
                  </small>
                )}
              </div>
            </S.FormCard>
          )}

          {activeTab === "digital-menu" && (
            <S.FormCard>
              <S.PageHeader>
                <h2>Editar Cardápio Digital</h2>
                <p>
                  Personalize a identidade visual que aparece no cardápio do
                  cliente: nome, logo e banner.
                </p>
              </S.PageHeader>

              <form onSubmit={handleSaveDigitalMenuSettings}>
                <S.FormGroup>
                  <label>Nome do Restaurante</label>
                  <input
                    type="text"
                    name="restaurantName"
                    placeholder="Ex: Pizzaria Mesa"
                    value={settingsForm.restaurantName}
                    onChange={handleSettingsFieldChange}
                  />
                </S.FormGroup>

                <S.FormRow style={{ marginTop: "1rem" }}>
                  <S.FormGroup>
                    <label>URL da Logo</label>
                    <input
                      type="url"
                      name="restaurantLogo"
                      placeholder="https://..."
                      value={settingsForm.restaurantLogo}
                      onChange={handleSettingsFieldChange}
                    />
                    <div
                      style={{
                        marginTop: "0.55rem",
                        display: "flex",
                        gap: "0.5rem",
                        alignItems: "center",
                        flexWrap: "wrap",
                      }}
                    >
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(event) =>
                          handleBrandingFileChange("restaurantLogo", event)
                        }
                      />
                      {brandingUploadState.restaurantLogo ? (
                        <small style={{ opacity: 0.85 }}>
                          Processando imagem...
                        </small>
                      ) : null}
                    </div>
                    {settingsForm.restaurantLogo ? (
                      <div
                        style={{
                          marginTop: "0.6rem",
                          width: 76,
                          height: 76,
                          borderRadius: 999,
                          border: "1px solid rgba(148, 163, 184, 0.35)",
                          background: `url(${settingsForm.restaurantLogo}) center / cover`,
                        }}
                      />
                    ) : null}
                  </S.FormGroup>

                  <S.FormGroup>
                    <label>URL do Banner</label>
                    <input
                      type="url"
                      name="restaurantCoverImage"
                      placeholder="https://..."
                      value={settingsForm.restaurantCoverImage}
                      onChange={handleSettingsFieldChange}
                    />
                    <div
                      style={{
                        marginTop: "0.55rem",
                        display: "flex",
                        gap: "0.5rem",
                        alignItems: "center",
                        flexWrap: "wrap",
                      }}
                    >
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(event) =>
                          handleBrandingFileChange(
                            "restaurantCoverImage",
                            event,
                          )
                        }
                      />
                      {brandingUploadState.restaurantCoverImage ? (
                        <small style={{ opacity: 0.85 }}>
                          Processando imagem...
                        </small>
                      ) : null}
                    </div>
                    {settingsForm.restaurantCoverImage ? (
                      <div
                        style={{
                          marginTop: "0.6rem",
                          width: "100%",
                          maxWidth: 260,
                          height: 84,
                          borderRadius: 12,
                          border: "1px solid rgba(148, 163, 184, 0.35)",
                          background: `url(${settingsForm.restaurantCoverImage}) center / cover`,
                        }}
                      />
                    ) : null}
                  </S.FormGroup>
                </S.FormRow>

                <S.SubmitBtn
                  type="submit"
                  style={{ marginTop: "1.25rem" }}
                  disabled={isSavingSettings || isBrandingUploadInProgress}
                >
                  {isSavingSettings ? "Salvando..." : "Salvar Cardápio Digital"}
                </S.SubmitBtn>
              </form>
            </S.FormCard>
          )}
        </S.MainContent>
      </S.AdminLayout>
    </ThemeProvider>
  );
}
