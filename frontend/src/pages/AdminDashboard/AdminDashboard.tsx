import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import {
  Utensils,
  Home,
  DollarSign,
  User,
  FolderPlus,
  ChevronLeft,
  ChevronRight,
  Menu,
  PlusCircle,
  Table2,
  ClipboardList,
  Users,
  Clock,
  Package,
  CreditCard,
  Image as ImageIcon,
  Check,
  X,
  Bike,
  LogOut,
  AlertTriangle,
  Minimize2,
  Maximize2,
  KeyRound,
} from "lucide-react";
import { toast } from "react-toastify";
import api from "../../Services/api";
import ordersService from "../../Services/ordersService.js";
import categoriesService from "../../Services/categoriesService";
import productsService from "../../Services/productsService";
import employeesService from "../../Services/employeesService";
import tablesService from "../../Services/tablesService";
import restaurantSettingsService from "../../Services/restaurantSettingsService";
import { connectSocket, disconnectSocket } from "../../Services/socketService";
import { buildPixPayload } from "../../config/pixPayload";
import { useAuth } from "../../contexts/authContext";
import * as S from "./styles";

const PixAndDeliverySettingsTab = lazy(
  () => import("./components/PixAndDeliverySettingsTab"),
);
const DigitalMenuSettingsTab = lazy(
  () => import("./components/DigitalMenuSettingsTab"),
);
const OrdersTab = lazy(() => import("./components/OrdersTab"));
const OperationalTabs = lazy(() => import("./components/OperationalTabs"));

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
  SAIU_PARA_ENTREGA: { label: "A caminho", color: "#3b82f6" },
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

function _getAvailableStatusesByOrderType(_orderType) {
  return ORDER_STATUSES;
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

function formatCnpjMask(value) {
  const digits = String(value || "")
    .replace(/\D/g, "")
    .slice(0, 14);

  if (digits.length <= 2) {
    return digits;
  }

  if (digits.length <= 5) {
    return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  }

  if (digits.length <= 8) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  }

  if (digits.length <= 12) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  }

  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

function formatCpfOrCnpjMask(value) {
  const digits = String(value || "").replace(/\D/g, "");

  if (digits.length <= 11) {
    return formatCpfMask(digits);
  }

  return formatCnpjMask(digits);
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

function getPaymentSummaryLabel(order?: unknown) {
  const paymentMethod = String(
    (order as { paymentMethod?: unknown } | undefined)?.paymentMethod || "",
  )
    .trim()
    .toUpperCase();

  if (paymentMethod === "DINHEIRO") {
    return "DINHEIRO";
  }

  if (
    paymentMethod === "CARTAO" ||
    paymentMethod === "CARTAO_DEBITO" ||
    paymentMethod === "CARTAO_CREDITO"
  ) {
    return "CARTAO";
  }

  if (paymentMethod === "PIX") {
    return "PIX";
  }

  return "NAO INFORMADO";
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
  const { user, login, logout } = useAuth();
  const [isDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState("orders");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(
    () => typeof window !== "undefined" && window.innerWidth <= 768,
  );
  const [isVerySmallViewport, setIsVerySmallViewport] = useState(
    () => typeof window !== "undefined" && window.innerWidth <= 360,
  );
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [orders, setOrders] = useState([]);
  const [orderTypeFilter, setOrderTypeFilter] = useState("TODOS");
  const [statusFilter, setStatusFilter] = useState("TODOS");
  const [closingOrderIds, _setClosingOrderIds] = useState([]);
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
    legalDocumentType: "",
    companyDocument: "",
    companyLegalName: "",
    companyTradeName: "",
    companyAddress: "",
    companyCnae: "",
    monthlyRevenue: "",
    ownerFullName: "",
    ownerCpf: "",
    ownerBirthDate: "",
    ownerEmail: "",
    ownerPhone: "",
    ownerAddress: "",
    bankName: "",
    bankCode: "",
    bankAccountType: "",
    bankBranch: "",
    bankAccount: "",
    bankHolderDocument: "",
    cardGateway: "",
    gatewayMerchantId: "",
    pagbankEmail: "",
    pagbankToken: "",
    pagbankEnvironment: "production",
    ownerDocumentFileUrl: "",
    bankProofFileUrl: "",
    companyContractFileUrl: "",
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
  const [billingWarningState, setBillingWarningState] = useState(null);
  const [isBillingWarningMinimized, setIsBillingWarningMinimized] =
    useState(false);
  const [
    isPasswordRotationModalMinimized,
    setIsPasswordRotationModalMinimized,
  ] = useState(false);
  const [passwordRotationForm, setPasswordRotationForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isSavingPasswordRotation, setIsSavingPasswordRotation] =
    useState(false);
  const qrCardRefs = useRef({});

  const shouldForcePasswordRotation =
    user?.role === "ADMIN" && user?.mustChangePassword === true;

  function addBusinessDays(baseDate, businessDays) {
    const date = new Date(baseDate);
    let remaining = Number(businessDays || 0);

    while (remaining > 0) {
      date.setDate(date.getDate() + 1);
      const day = date.getDay();

      if (day !== 0 && day !== 6) {
        remaining -= 1;
      }
    }

    return date;
  }

  function formatDatePtBr(value) {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(value));
  }

  function countBusinessDaysLeft(fromDate, untilDate) {
    const start = new Date(fromDate);
    const end = new Date(untilDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return 0;
    }

    if (start > end) {
      return 0;
    }

    let count = 0;
    const cursor = new Date(start);
    cursor.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    while (cursor <= end) {
      const day = cursor.getDay();
      if (day !== 0 && day !== 6) {
        count += 1;
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    return count;
  }

  useEffect(() => {
    function handleResize() {
      setIsMobileViewport(window.innerWidth <= 768);
      setIsVerySmallViewport(window.innerWidth <= 360);
      if (window.innerWidth > 768) {
        setIsMobileSidebarOpen(false);
      }
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadBillingWarning() {
      try {
        const response = await api.get("/billing/invoices");

        if (!mounted) {
          return;
        }

        const pendingInvoices = (
          Array.isArray(response.data) ? response.data : []
        )
          .filter((invoice) => invoice.status === "PENDENTE")
          .sort(
            (a, b) =>
              new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
          );

        const now = new Date();
        const invoiceInGracePeriod = pendingInvoices.find((invoice) => {
          const dueDate = new Date(invoice.dueDate);
          if (Number.isNaN(dueDate.getTime())) {
            return false;
          }

          const graceLimitDate = addBusinessDays(dueDate, 5);
          return now >= dueDate && now <= graceLimitDate;
        });

        if (!invoiceInGracePeriod) {
          setBillingWarningState(null);
          setIsBillingWarningMinimized(false);
          return;
        }

        const dueDate = new Date(invoiceInGracePeriod.dueDate);
        const graceLimitDate = addBusinessDays(dueDate, 5);
        const businessDaysLeft = countBusinessDaysLeft(now, graceLimitDate);
        const hasPreviousPaidInvoice = (
          Array.isArray(response.data) ? response.data : []
        ).some(
          (invoice) =>
            invoice.status === "PAGO" &&
            Number(invoice.id) < Number(invoiceInGracePeriod.id),
        );

        setBillingWarningState({
          invoiceId: invoiceInGracePeriod.id,
          paymentLink: String(invoiceInGracePeriod.paymentLink || "").trim(),
          dueDate,
          graceLimitDate,
          businessDaysLeft,
          isPostTrial: !hasPreviousPaidInvoice,
        });
        setIsBillingWarningMinimized(false);
      } catch {
        if (mounted) {
          setBillingWarningState(null);
          setIsBillingWarningMinimized(false);
        }
      }
    }

    loadBillingWarning();

    return () => {
      mounted = false;
    };
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
          legalDocumentType: String(settings.legalDocumentType || "")
            .trim()
            .toUpperCase(),
          companyDocument: String(settings.companyDocument || ""),
          companyLegalName: String(settings.companyLegalName || ""),
          companyTradeName: String(settings.companyTradeName || ""),
          companyAddress: String(settings.companyAddress || ""),
          companyCnae: String(settings.companyCnae || ""),
          monthlyRevenue:
            settings.monthlyRevenue !== undefined &&
            settings.monthlyRevenue !== null
              ? String(settings.monthlyRevenue)
              : "",
          ownerFullName: String(settings.ownerFullName || ""),
          ownerCpf: String(settings.ownerCpf || ""),
          ownerBirthDate: String(settings.ownerBirthDate || "").slice(0, 10),
          ownerEmail: String(settings.ownerEmail || ""),
          ownerPhone: formatBrazilPhoneInput(String(settings.ownerPhone || "")),
          ownerAddress: String(settings.ownerAddress || ""),
          bankName: String(settings.bankName || ""),
          bankCode: String(settings.bankCode || ""),
          bankAccountType: String(settings.bankAccountType || "")
            .trim()
            .toUpperCase(),
          bankBranch: String(settings.bankBranch || ""),
          bankAccount: String(settings.bankAccount || ""),
          bankHolderDocument: String(settings.bankHolderDocument || ""),
          cardGateway: String(settings.cardGateway || "")
            .trim()
            .toUpperCase(),
          gatewayMerchantId: String(settings.gatewayMerchantId || ""),
          pagbankEmail: String(settings.pagbankEmail || ""),
          pagbankToken: "",
          pagbankEnvironment: "production",
          ownerDocumentFileUrl: String(settings.ownerDocumentFileUrl || ""),
          bankProofFileUrl: String(settings.bankProofFileUrl || ""),
          companyContractFileUrl: String(settings.companyContractFileUrl || ""),
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

    const socket = connectSocket(token, "admin-dashboard");

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

  const _handleUpdateStatus = async (orderId, newStatus) => {
    const nextStatusNormalized = String(newStatus || "").toUpperCase();
    const targetOrder = orders.find(
      (order) => Number(order?.id) === Number(orderId),
    );
    const normalizedOrderType = String(targetOrder?.type || "").toUpperCase();
    const isMesaOrRetiradaOrder =
      normalizedOrderType === "MESA" || normalizedOrderType === "RETIRADA";
    const shouldAutoAdvanceFlow =
      nextStatusNormalized === "PRONTO" && isMesaOrRetiradaOrder;

    if (
      nextStatusNormalized === "ENTREGUE" &&
      targetOrder &&
      isDeliveryBlockedUntilPaid(targetOrder)
    ) {
      toast.error(
        "Pagamento pendente: a confirmação por PIN fica apenas no fluxo do motoqueiro.",
      );
      return;
    }

    try {
      const updated = await ordersService.updateStatus(orderId, newStatus);
      const finalUpdated = shouldAutoAdvanceFlow
        ? await ordersService.updateStatus(orderId, "SAIU_PARA_ENTREGA")
        : updated;
      const nextStatusLabel = String(
        finalUpdated?.status ||
          (shouldAutoAdvanceFlow ? "SAIU_PARA_ENTREGA" : newStatus),
      );

      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? finalUpdated : o)),
      );

      toast.info(`Pedido #${orderId} alterado para ${nextStatusLabel}`);
    } catch (err) {
      const message = err?.response?.data?.error || "Erro ao atualizar status";
      const shouldShowPaymentPendingHint =
        nextStatusNormalized === "ENTREGUE" &&
        targetOrder &&
        isDeliveryBlockedUntilPaid(targetOrder) &&
        (message.includes("pagamento PIX/CARTAO") ||
          message.includes("ainda não foi confirmado"));
      const friendlyMessage = shouldShowPaymentPendingHint
        ? "Pagamento pendente: a confirmação por PIN fica apenas no fluxo do motoqueiro."
        : message;
      toast.error(friendlyMessage);
    }
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

  const unarchivedOrders = orders;

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

    if (name === "ownerPhone") {
      nextValue = formatBrazilPhoneInput(value);
    }

    if (name === "ownerCpf") {
      nextValue = formatCpfMask(value);
    }

    if (name === "companyDocument") {
      const documentType = String(settingsForm.legalDocumentType || "")
        .trim()
        .toUpperCase();

      nextValue =
        documentType === "CNPJ"
          ? formatCnpjMask(value)
          : documentType === "CPF"
            ? formatCpfMask(value)
            : formatCpfOrCnpjMask(value);
    }

    if (name === "bankHolderDocument") {
      nextValue = formatCpfOrCnpjMask(value);
    }

    if (name === "bankCode") {
      nextValue = String(value || "")
        .replace(/\D/g, "")
        .slice(0, 6);
    }

    if (name === "companyCnae") {
      nextValue = String(value || "")
        .replace(/[^\d.-]/g, "")
        .slice(0, 16);
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
      legalDocumentType: String(saved.legalDocumentType || "")
        .trim()
        .toUpperCase(),
      companyDocument: String(saved.companyDocument || ""),
      companyLegalName: String(saved.companyLegalName || ""),
      companyTradeName: String(saved.companyTradeName || ""),
      companyAddress: String(saved.companyAddress || ""),
      companyCnae: String(saved.companyCnae || ""),
      monthlyRevenue:
        saved.monthlyRevenue !== undefined && saved.monthlyRevenue !== null
          ? String(saved.monthlyRevenue)
          : "",
      ownerFullName: String(saved.ownerFullName || ""),
      ownerCpf: String(saved.ownerCpf || ""),
      ownerBirthDate: String(saved.ownerBirthDate || "").slice(0, 10),
      ownerEmail: String(saved.ownerEmail || ""),
      ownerPhone: formatBrazilPhoneInput(String(saved.ownerPhone || "")),
      ownerAddress: String(saved.ownerAddress || ""),
      bankName: String(saved.bankName || ""),
      bankCode: String(saved.bankCode || ""),
      bankAccountType: String(saved.bankAccountType || "")
        .trim()
        .toUpperCase(),
      bankBranch: String(saved.bankBranch || ""),
      bankAccount: String(saved.bankAccount || ""),
      bankHolderDocument: String(saved.bankHolderDocument || ""),
      cardGateway: String(saved.cardGateway || "")
        .trim()
        .toUpperCase(),
      gatewayMerchantId: String(saved.gatewayMerchantId || ""),
      pagbankEmail: String(saved.pagbankEmail || ""),
      pagbankToken: "",
      pagbankEnvironment: "production",
      ownerDocumentFileUrl: String(saved.ownerDocumentFileUrl || ""),
      bankProofFileUrl: String(saved.bankProofFileUrl || ""),
      companyContractFileUrl: String(saved.companyContractFileUrl || ""),
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
        successMessage: "Configurações de PIX salvas com sucesso!",
      });
    } catch (err) {
      toast.error(
        err?.response?.data?.error ||
          err?.message ||
          "Erro ao salvar configurações de PIX",
      );
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleSaveCardAndKybSettings = async (event) => {
    event.preventDefault();

    if (isSavingSettings) {
      return;
    }

    try {
      setIsSavingSettings(true);

      const legalDocumentType = String(settingsForm.legalDocumentType || "")
        .trim()
        .toUpperCase();
      const companyDocument = String(
        settingsForm.companyDocument || "",
      ).replace(/\D/g, "");
      const bankHolderDocument = String(
        settingsForm.bankHolderDocument || "",
      ).replace(/\D/g, "");
      const ownerCpf = String(settingsForm.ownerCpf || "").replace(/\D/g, "");
      const normalizedPagBankEmail = String(
        settingsForm.pagbankEmail || "",
      ).trim();
      const normalizedPagBankToken = String(
        settingsForm.pagbankToken || "",
      ).trim();
      const normalizedPagBankEnvironment = "production";

      if (
        legalDocumentType === "CNPJ" &&
        companyDocument &&
        companyDocument.length !== 14
      ) {
        throw new Error("CNPJ inválido. Informe 14 dígitos.");
      }

      if (
        legalDocumentType === "CPF" &&
        companyDocument &&
        companyDocument.length !== 11
      ) {
        throw new Error("CPF inválido. Informe 11 dígitos.");
      }

      if (ownerCpf && ownerCpf.length !== 11) {
        throw new Error("CPF do representante inválido.");
      }

      if (
        companyDocument &&
        bankHolderDocument &&
        companyDocument !== bankHolderDocument
      ) {
        throw new Error(
          "A titularidade bancária deve ser igual ao CPF/CNPJ cadastrado.",
        );
      }

      const normalizedCardGateway = String(settingsForm.cardGateway || "")
        .trim()
        .toUpperCase();

      if (normalizedCardGateway === "PAGBANK" && !normalizedPagBankEmail) {
        throw new Error("Informe o e-mail da conta PagBank.");
      }

      const payload = {
        legalDocumentType: legalDocumentType || null,
        companyDocument: companyDocument || null,
        companyLegalName:
          String(settingsForm.companyLegalName || "").trim() || null,
        companyTradeName:
          String(settingsForm.companyTradeName || "").trim() || null,
        companyAddress:
          String(settingsForm.companyAddress || "").trim() || null,
        companyCnae: String(settingsForm.companyCnae || "").trim() || null,
        monthlyRevenue:
          settingsForm.monthlyRevenue === ""
            ? null
            : Number(settingsForm.monthlyRevenue),
        ownerFullName: String(settingsForm.ownerFullName || "").trim() || null,
        ownerCpf: ownerCpf || null,
        ownerBirthDate:
          String(settingsForm.ownerBirthDate || "").trim() || null,
        ownerEmail: String(settingsForm.ownerEmail || "").trim() || null,
        ownerPhone:
          String(settingsForm.ownerPhone || "").replace(/\D/g, "") || null,
        ownerAddress: String(settingsForm.ownerAddress || "").trim() || null,
        bankName: String(settingsForm.bankName || "").trim() || null,
        bankCode: String(settingsForm.bankCode || "").trim() || null,
        bankAccountType:
          String(settingsForm.bankAccountType || "")
            .trim()
            .toUpperCase() || null,
        bankBranch: String(settingsForm.bankBranch || "").trim() || null,
        bankAccount: String(settingsForm.bankAccount || "").trim() || null,
        bankHolderDocument: bankHolderDocument || null,
        cardGateway: normalizedCardGateway || null,
        gatewayMerchantId:
          String(settingsForm.gatewayMerchantId || "").trim() || null,
        pagbankEmail: normalizedPagBankEmail || null,
        pagbankEnvironment: normalizedPagBankEnvironment || null,
        ...(normalizedPagBankToken
          ? { pagbankToken: normalizedPagBankToken }
          : {}),
        ownerDocumentFileUrl:
          String(settingsForm.ownerDocumentFileUrl || "").trim() || null,
        bankProofFileUrl:
          String(settingsForm.bankProofFileUrl || "").trim() || null,
        companyContractFileUrl:
          String(settingsForm.companyContractFileUrl || "").trim() || null,
      };

      if (
        payload.monthlyRevenue !== null &&
        Number.isNaN(payload.monthlyRevenue)
      ) {
        throw new Error("Faturamento mensal deve ser um número válido.");
      }

      await persistRestaurantSettings({
        payload,
        successMessage: "Cadastro de Cartão/Banco (KYB) salvo com sucesso!",
      });
    } catch (err) {
      toast.error(
        err?.response?.data?.error ||
          err?.message ||
          "Erro ao salvar cadastro de Cartão/Banco (KYB)",
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
    settings: {
      section: "Configurações da Marca",
      label: "PIX, banco e gateway",
    },
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

  const handlePasswordRotationFieldChange =
    (field: "oldPassword" | "newPassword" | "confirmPassword") =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;

      setPasswordRotationForm((current) => ({
        ...current,
        [field]: value,
      }));
    };

  const handleSubmitPasswordRotation = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!passwordRotationForm.oldPassword.trim()) {
      toast.error("Informe a senha atual recebida do Super Admin.");
      return;
    }

    if (passwordRotationForm.newPassword.length < 6) {
      toast.error("A nova senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    if (
      passwordRotationForm.newPassword !== passwordRotationForm.confirmPassword
    ) {
      toast.error(
        "As senhas novas não conferem. Confere para mim e tenta de novo.",
      );
      return;
    }

    try {
      setIsSavingPasswordRotation(true);

      await api.put("/auth/password", {
        oldPassword: passwordRotationForm.oldPassword,
        newPassword: passwordRotationForm.newPassword,
      });

      const token = localStorage.getItem("token");

      if (token && user) {
        login(
          {
            ...user,
            mustChangePassword: false,
          },
          token,
        );
      }

      setPasswordRotationForm({
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setIsPasswordRotationModalMinimized(false);
      toast.success(
        "Perfeito! Sua senha foi atualizada e sua conta está liberada.",
      );
    } catch (error: unknown) {
      const message =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { error?: string } } }).response
          ?.data?.error === "string"
          ? (error as { response?: { data?: { error?: string } } }).response
              ?.data?.error
          : "Não consegui atualizar sua senha agora. Tenta novamente em instantes.";

      toast.error(message);
    } finally {
      setIsSavingPasswordRotation(false);
    }
  };

  const billingBusinessDaysTotal = 5;
  const billingBusinessDaysLeft = Math.max(
    0,
    Number(billingWarningState?.businessDaysLeft || 0),
  );
  const billingBusinessDaysElapsed = Math.max(
    0,
    billingBusinessDaysTotal - billingBusinessDaysLeft,
  );
  const billingProgressPercent = Math.min(
    100,
    Math.round((billingBusinessDaysElapsed / billingBusinessDaysTotal) * 100),
  );
  const billingIsCritical = billingBusinessDaysLeft <= 2;

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
              {!isSidebarCollapsed && <span>PIX, Banco e Gateway</span>}
            </S.NavButton>

            <S.NavButton
              onClick={() => navigate("/billing")}
              style={
                billingWarningState
                  ? {
                      background: "rgba(249, 115, 22, 0.24)",
                      border: "1px solid rgba(251, 146, 60, 0.55)",
                      color: "#ffffff",
                      boxShadow: "0 8px 18px rgba(15, 23, 42, 0.2)",
                    }
                  : undefined
              }
              title={
                billingWarningState
                  ? "Existe aviso de faturamento pendente"
                  : "Abrir faturamento e planos"
              }
            >
              <DollarSign size={20} />
              {!isSidebarCollapsed && <span>Faturamento e Planos</span>}
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
              position: "sticky",
              top: "0.25rem",
              zIndex: 26,
              padding: "0.58rem 0.78rem",
              borderRadius: 10,
              border: "1px solid rgba(148, 163, 184, 0.26)",
              background: isDarkMode
                ? "rgba(15, 23, 42, 0.36)"
                : "rgba(207, 217, 228, 0.92)",
              backdropFilter: "blur(6px)",
              boxShadow: "0 10px 22px rgba(15, 23, 42, 0.08)",
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

          {billingWarningState && !isBillingWarningMinimized && (
            <div
              style={{
                marginBottom: "1rem",
                position: "sticky",
                top: "3.35rem",
                zIndex: 24,
                borderRadius: 16,
                border: billingIsCritical
                  ? "2px solid rgba(220, 38, 38, 0.52)"
                  : "2px solid rgba(249, 115, 22, 0.45)",
                background:
                  "radial-gradient(circle at top right, rgba(254, 240, 138, 0.35) 0%, rgba(255, 255, 255, 0) 42%), linear-gradient(145deg, rgba(255, 247, 237, 0.98) 0%, rgba(255, 237, 213, 0.98) 100%)",
                color: "#7c2d12",
                padding: "1rem 1rem 0.9rem",
                boxShadow: billingIsCritical
                  ? "0 16px 34px rgba(185, 28, 28, 0.2)"
                  : "0 16px 34px rgba(194, 65, 12, 0.16)",
                backdropFilter: "blur(6px)",
                display: "grid",
                gap: "0.65rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "0.6rem",
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.6rem",
                  }}
                >
                  <span
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: billingIsCritical
                        ? "linear-gradient(135deg, #ef4444, #b91c1c)"
                        : "linear-gradient(135deg, #f59e0b, #ea580c)",
                      color: "#fff",
                      boxShadow: "0 10px 20px rgba(127, 29, 29, 0.22)",
                    }}
                  >
                    <AlertTriangle size={18} />
                  </span>

                  <div style={{ display: "grid", gap: "0.1rem" }}>
                    <strong
                      style={{
                        fontSize: "0.95rem",
                        letterSpacing: "0.01em",
                      }}
                    >
                      {billingWarningState.isPostTrial
                        ? "Fatura do pos-trial gerada"
                        : "Fatura mensal de renovacao gerada"}
                    </strong>
                    <small style={{ fontSize: "0.76rem", opacity: 0.86 }}>
                      {billingWarningState.isPostTrial
                        ? "Pagamento necessario para manter o sistema ativo"
                        : "Renovacao pendente para manter a operacao ativa"}
                    </small>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsBillingWarningMinimized(true)}
                  aria-label="Minimizar aviso de faturamento"
                  title="Minimizar"
                  style={{
                    width: isMobileViewport ? 44 : 34,
                    height: isMobileViewport ? 44 : 34,
                    borderRadius: 10,
                    border: "1px solid rgba(194, 65, 12, 0.35)",
                    background: "rgba(255, 255, 255, 0.85)",
                    color: "#9a3412",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <Minimize2 size={16} />
                </button>

                <span
                  style={{
                    borderRadius: 999,
                    border: billingIsCritical
                      ? "1px solid rgba(185, 28, 28, 0.55)"
                      : "1px solid rgba(194, 65, 12, 0.5)",
                    padding: "0.24rem 0.66rem",
                    fontSize: "0.78rem",
                    fontWeight: 800,
                    background: billingIsCritical
                      ? "rgba(254, 202, 202, 0.72)"
                      : "rgba(254, 215, 170, 0.76)",
                  }}
                >
                  Prazo final:{" "}
                  {formatDatePtBr(billingWarningState.graceLimitDate)}
                </span>
              </div>

              <div
                style={{
                  borderRadius: 12,
                  border: "1px solid rgba(194, 65, 12, 0.24)",
                  background: "rgba(255, 255, 255, 0.62)",
                  padding: "0.62rem 0.72rem",
                  display: "grid",
                  gap: "0.5rem",
                }}
              >
                <span style={{ fontSize: "0.84rem", lineHeight: 1.45 }}>
                  {billingWarningState.isPostTrial
                    ? "Seu periodo gratis de 30 dias terminou e a fatura #"
                    : "Sua renovacao mensal esta pendente e a fatura #"}
                  {billingWarningState.invoiceId}
                  {billingWarningState.isPostTrial
                    ? " ja foi gerada. Pague ate "
                    : " esta em aberto. Regularize ate "}
                  {formatDatePtBr(billingWarningState.graceLimitDate)}
                  {billingWarningState.isPostTrial
                    ? " para evitar bloqueio automatico do sistema."
                    : " para evitar bloqueio automatico do sistema."}
                </span>

                <div style={{ display: "grid", gap: "0.28rem" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "0.5rem",
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <small style={{ fontWeight: 800 }}>
                      Janela de tolerancia: {billingBusinessDaysTotal} dias
                      uteis
                    </small>
                    <small style={{ fontWeight: 800 }}>
                      Restantes: {billingBusinessDaysLeft}
                    </small>
                  </div>

                  <div
                    style={{
                      width: "100%",
                      height: 8,
                      borderRadius: 999,
                      overflow: "hidden",
                      background: "rgba(125, 53, 15, 0.14)",
                    }}
                  >
                    <div
                      style={{
                        width: `${billingProgressPercent}%`,
                        height: "100%",
                        borderRadius: 999,
                        background: billingIsCritical
                          ? "linear-gradient(90deg, #f97316 0%, #dc2626 100%)"
                          : "linear-gradient(90deg, #f59e0b 0%, #ea580c 100%)",
                        transition: "width 220ms ease",
                      }}
                    />
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "0.65rem",
                  flexWrap: "wrap",
                }}
              >
                <small style={{ fontWeight: 700, opacity: 0.9 }}>
                  Apos o prazo, o sistema bloqueia automaticamente ate a
                  confirmacao do pagamento.
                </small>

                <div
                  style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}
                >
                  <button
                    type="button"
                    onClick={() => navigate("/billing")}
                    style={{
                      border: "1px solid rgba(194, 65, 12, 0.42)",
                      background: "rgba(255, 255, 255, 0.84)",
                      color: "#9a3412",
                      borderRadius: 8,
                      minHeight: 34,
                      padding: "0 0.85rem",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    Ver fatura
                  </button>

                  {billingWarningState.paymentLink ? (
                    <button
                      type="button"
                      onClick={() =>
                        window.open(
                          billingWarningState.paymentLink,
                          "_blank",
                          "noopener,noreferrer",
                        )
                      }
                      style={{
                        border: billingIsCritical
                          ? "1px solid rgba(185, 28, 28, 0.65)"
                          : "1px solid rgba(194, 65, 12, 0.56)",
                        background:
                          "linear-gradient(135deg, #f97316 0%, #dc2626 100%)",
                        color: "#fff",
                        borderRadius: 8,
                        minHeight: 34,
                        padding: "0 0.92rem",
                        fontWeight: 800,
                        cursor: "pointer",
                        boxShadow: "0 10px 18px rgba(185, 28, 28, 0.22)",
                      }}
                    >
                      Pagar agora
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          )}

          {billingWarningState && isBillingWarningMinimized && (
            <div
              style={{
                position: "fixed",
                left: isMobileViewport
                  ? "env(safe-area-inset-left)"
                  : "max(12px, env(safe-area-inset-left))",
                right: isMobileViewport
                  ? "env(safe-area-inset-right)"
                  : "max(12px, env(safe-area-inset-right))",
                bottom: "max(12px, env(safe-area-inset-bottom))",
                zIndex: 50,
                borderRadius: isMobileViewport ? 10 : 12,
                border: billingIsCritical
                  ? "1px solid rgba(220, 38, 38, 0.5)"
                  : "1px solid rgba(249, 115, 22, 0.45)",
                background:
                  "linear-gradient(135deg, rgba(255,247,237,0.97) 0%, rgba(255,237,213,0.97) 100%)",
                color: "#7c2d12",
                boxShadow: "0 12px 28px rgba(15, 23, 42, 0.18)",
                backdropFilter: "blur(6px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: isVerySmallViewport
                  ? "0.35rem"
                  : isMobileViewport
                    ? "0.5rem"
                    : "0.75rem",
                padding: isMobileViewport
                  ? "0.5rem max(8px, env(safe-area-inset-left))"
                  : "0.62rem 0.75rem",
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  minWidth: 0,
                }}
              >
                <span
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 8,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: billingIsCritical
                      ? "linear-gradient(135deg, #ef4444, #b91c1c)"
                      : "linear-gradient(135deg, #f59e0b, #ea580c)",
                    color: "#fff",
                  }}
                >
                  <AlertTriangle size={14} />
                </span>
                <small
                  style={{
                    fontWeight: 800,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    fontSize: isVerySmallViewport
                      ? "0.68rem"
                      : isMobileViewport
                        ? "0.72rem"
                        : "0.78rem",
                    maxWidth: isMobileViewport ? "68vw" : "none",
                  }}
                >
                  {isMobileViewport
                    ? "Aviso de vencimento"
                    : "Aviso de faturamento ativo. Prazo: "}
                  {!isMobileViewport
                    ? formatDatePtBr(billingWarningState.graceLimitDate)
                    : ""}
                </small>
              </div>

              <button
                type="button"
                onClick={() => setIsBillingWarningMinimized(false)}
                aria-label="Expandir aviso de faturamento"
                title="Expandir"
                style={{
                  minHeight: isMobileViewport ? 44 : 32,
                  minWidth: isMobileViewport ? 44 : "auto",
                  borderRadius: 8,
                  border: "1px solid rgba(194, 65, 12, 0.45)",
                  background: "rgba(255, 255, 255, 0.88)",
                  color: "#9a3412",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  justifyContent: "center",
                  padding: isMobileViewport ? "0" : "0 0.68rem",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                <Maximize2 size={14} />
                {!isMobileViewport ? "Expandir" : null}
              </button>
            </div>
          )}

          {activeTab === "orders" && (
            <Suspense fallback={null}>
              <OrdersTab
                isDarkMode={isDarkMode}
                visibleOrders={visibleOrders}
                statusCounters={statusCounters}
                orderTypeFilter={orderTypeFilter}
                orderTypeCounters={orderTypeCounters}
                statusFilter={statusFilter}
                orderStatusFilters={ORDER_STATUS_FILTERS}
                statusFilterToneByStatus={STATUS_FILTER_TONE_BY_STATUS}
                expandedOrderIds={expandedOrderIds}
                closingOrderIds={closingOrderIds}
                generatingPinOrderIds={generatingPinOrderIds}
                paymentPinByOrderId={paymentPinByOrderId}
                pinRequestByOrderId={pinRequestByOrderId}
                paymentPinInputByOrderId={paymentPinInputByOrderId}
                requestingPaymentPinOrderIds={requestingPaymentPinOrderIds}
                confirmingPaymentPinOrderIds={confirmingPaymentPinOrderIds}
                paymentPinToolsEnabled={PAYMENT_PIN_TOOLS_ENABLED}
                orderStatusMeta={ORDER_STATUS_META}
                onSetOrderTypeFilter={setOrderTypeFilter}
                onSetStatusFilter={setStatusFilter}
                onToggleOrderExpanded={toggleOrderExpanded}
                onGeneratePaymentPin={handleGeneratePaymentPin}
                onRequestPaymentPin={handleRequestPaymentPin}
                onSetPaymentPinInputByOrderId={setPaymentPinInputByOrderId}
                onConfirmPaymentWithPin={handleConfirmPaymentWithPin}
                getStatusValueIcon={getStatusValueIcon}
                getPaymentSummaryLabel={getPaymentSummaryLabel}
                getDeliveryAddressLabel={getDeliveryAddressLabel}
                isPendingDigitalPayment={isPendingDigitalPayment}
                canGeneratePin={canGeneratePin}
                formatRequestTime={formatRequestTime}
                getOrderTableLabel={getOrderTableLabel}
              />
            </Suspense>
          )}

          {(activeTab === "categories" ||
            activeTab === "products" ||
            activeTab === "products-manage" ||
            activeTab === "tables" ||
            activeTab === "employees") && (
            <Suspense fallback={null}>
              <OperationalTabs
                activeTab={activeTab}
                categories={categories}
                deletingCategoryId={deletingCategoryId}
                categoryName={categoryName}
                setCategoryName={setCategoryName}
                handleCreateCategory={handleCreateCategory}
                editingCategoryId={editingCategoryId}
                editingCategoryName={editingCategoryName}
                setEditingCategoryName={setEditingCategoryName}
                handleSaveEditCategory={handleSaveEditCategory}
                handleCancelEditCategory={handleCancelEditCategory}
                handleStartEditCategory={handleStartEditCategory}
                handleDeleteCategory={handleDeleteCategory}
                handleCreateProduct={handleCreateProduct}
                handleSubmitProduct={handleSubmitProduct}
                productForm={productForm}
                deletingProductId={deletingProductId}
                handleProductInputChange={handleProductInputChange}
                productSearchTerm={productSearchTerm}
                setProductSearchTerm={setProductSearchTerm}
                products={products}
                handleStartEditProduct={handleStartEditProduct}
                handleDeleteProduct={handleDeleteProduct}
                editingProductId={editingProductId}
                handleCancelEditProduct={handleCancelEditProduct}
                handleCreateTable={handleCreateTable}
                tableNumber={tableNumber}
                setTableNumber={setTableNumber}
                tables={tables}
                getTableQrValue={getTableQrValue}
                qrCardRefs={qrCardRefs}
                handlePreviewTableQr={handlePreviewTableQr}
                handleCopyTableQrLink={handleCopyTableQrLink}
                handleDownloadTableQr={handleDownloadTableQr}
                handlePrintTableQr={handlePrintTableQr}
                handleCreateEmployee={handleCreateEmployee}
                employeeData={employeeData}
                setEmployeeData={setEmployeeData}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
                employees={employees}
                handleDeactivateEmployee={handleDeactivateEmployee}
              />
            </Suspense>
          )}

          {activeTab === "settings" && (
            <Suspense fallback={null}>
              <PixAndDeliverySettingsTab
                settingsForm={settingsForm}
                isSavingSettings={isSavingSettings}
                isPixKeyInvalid={isPixKeyInvalid}
                hasPixKey={hasPixKey}
                pixKeyTypeLabel={pixKeyTypeLabel}
                pixPreviewPayload={pixPreviewPayload}
                isDarkMode={isDarkMode}
                onSubmitPixSettings={handleSavePixAndDeliverySettings}
                onSubmitCardBankSettings={handleSaveCardAndKybSettings}
                onFieldChange={handleSettingsFieldChange}
              />
            </Suspense>
          )}

          {activeTab === "digital-menu" && (
            <Suspense fallback={null}>
              <DigitalMenuSettingsTab
                settingsForm={settingsForm}
                brandingUploadState={brandingUploadState}
                isSavingSettings={isSavingSettings}
                isBrandingUploadInProgress={isBrandingUploadInProgress}
                onSubmit={handleSaveDigitalMenuSettings}
                onFieldChange={handleSettingsFieldChange}
                onBrandingFileChange={handleBrandingFileChange}
              />
            </Suspense>
          )}

          {shouldForcePasswordRotation && isPasswordRotationModalMinimized && (
            <div
              style={{
                position: "fixed",
                right: "max(14px, env(safe-area-inset-right))",
                bottom: "max(14px, env(safe-area-inset-bottom))",
                zIndex: 70,
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                borderRadius: 999,
                padding: "0.5rem 0.72rem",
                background: "linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)",
                border: "1px solid rgba(234, 88, 12, 0.35)",
                boxShadow: "0 12px 24px rgba(15, 23, 42, 0.18)",
                color: "#9a3412",
              }}
            >
              <KeyRound size={14} />
              <small style={{ fontWeight: 800 }}>Troca de senha pendente</small>
              <button
                type="button"
                onClick={() => setIsPasswordRotationModalMinimized(false)}
                style={{
                  minHeight: 30,
                  borderRadius: 999,
                  border: "1px solid rgba(194, 65, 12, 0.45)",
                  background: "rgba(255,255,255,0.9)",
                  color: "#9a3412",
                  fontWeight: 800,
                  padding: "0 0.72rem",
                  cursor: "pointer",
                }}
              >
                Abrir
              </button>
            </div>
          )}

          {shouldForcePasswordRotation && !isPasswordRotationModalMinimized && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 80,
                background:
                  "radial-gradient(circle at top right, rgba(251, 146, 60, 0.25), rgba(2, 6, 23, 0.62) 55%)",
                backdropFilter: "blur(6px)",
                display: "grid",
                placeItems: "center",
                padding: "1rem",
              }}
            >
              <form
                onSubmit={handleSubmitPasswordRotation}
                style={{
                  width: "min(520px, 100%)",
                  borderRadius: 22,
                  overflow: "hidden",
                  border: "1px solid rgba(251, 146, 60, 0.32)",
                  boxShadow: "0 26px 58px rgba(15, 23, 42, 0.38)",
                  background:
                    "linear-gradient(160deg, #fff7ed 0%, #ffffff 38%, #f8fafc 100%)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "0.7rem",
                    padding: "0.95rem 1rem",
                    borderBottom: "1px solid rgba(148, 163, 184, 0.24)",
                    background:
                      "linear-gradient(135deg, rgba(251, 146, 60, 0.22) 0%, rgba(234, 88, 12, 0.12) 100%)",
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <span
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#ffffff",
                        background: "linear-gradient(135deg, #ea580c, #c2410c)",
                      }}
                    >
                      <KeyRound size={18} />
                    </span>
                    <div>
                      <strong
                        style={{
                          display: "block",
                          color: "#7c2d12",
                          fontSize: "1rem",
                          letterSpacing: "0.01em",
                        }}
                      >
                        Segurança da conta ADMIN
                      </strong>
                      <small style={{ color: "#9a3412", opacity: 0.92 }}>
                        Primeiro acesso detectado. Troque sua senha para
                        continuar.
                      </small>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsPasswordRotationModalMinimized(true)}
                    aria-label="Minimizar modal de troca de senha"
                    title="Minimizar"
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      border: "1px solid rgba(194, 65, 12, 0.3)",
                      background: "rgba(255,255,255,0.82)",
                      color: "#9a3412",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                    }}
                  >
                    <Minimize2 size={16} />
                  </button>
                </div>

                <div
                  style={{ padding: "1rem", display: "grid", gap: "0.85rem" }}
                >
                  <label style={{ display: "grid", gap: "0.38rem" }}>
                    <span
                      style={{
                        fontSize: "0.8rem",
                        fontWeight: 700,
                        color: "#9a3412",
                      }}
                    >
                      Senha atual
                    </span>
                    <input
                      type="password"
                      autoComplete="current-password"
                      value={passwordRotationForm.oldPassword}
                      onChange={handlePasswordRotationFieldChange(
                        "oldPassword",
                      )}
                      placeholder="Senha recebida do Super Admin"
                      required
                      style={{
                        minHeight: 42,
                        borderRadius: 12,
                        border: "1px solid rgba(148, 163, 184, 0.45)",
                        padding: "0 0.85rem",
                        background: "rgba(255,255,255,0.95)",
                        color: "#0f172a",
                      }}
                    />
                  </label>

                  <label style={{ display: "grid", gap: "0.38rem" }}>
                    <span
                      style={{
                        fontSize: "0.8rem",
                        fontWeight: 700,
                        color: "#9a3412",
                      }}
                    >
                      Nova senha
                    </span>
                    <input
                      type="password"
                      autoComplete="new-password"
                      minLength={6}
                      value={passwordRotationForm.newPassword}
                      onChange={handlePasswordRotationFieldChange(
                        "newPassword",
                      )}
                      placeholder="Crie uma senha forte"
                      required
                      style={{
                        minHeight: 42,
                        borderRadius: 12,
                        border: "1px solid rgba(148, 163, 184, 0.45)",
                        padding: "0 0.85rem",
                        background: "rgba(255,255,255,0.95)",
                        color: "#0f172a",
                      }}
                    />
                  </label>

                  <label style={{ display: "grid", gap: "0.38rem" }}>
                    <span
                      style={{
                        fontSize: "0.8rem",
                        fontWeight: 700,
                        color: "#9a3412",
                      }}
                    >
                      Confirmar nova senha
                    </span>
                    <input
                      type="password"
                      autoComplete="new-password"
                      minLength={6}
                      value={passwordRotationForm.confirmPassword}
                      onChange={handlePasswordRotationFieldChange(
                        "confirmPassword",
                      )}
                      placeholder="Repita a nova senha"
                      required
                      style={{
                        minHeight: 42,
                        borderRadius: 12,
                        border: "1px solid rgba(148, 163, 184, 0.45)",
                        padding: "0 0.85rem",
                        background: "rgba(255,255,255,0.95)",
                        color: "#0f172a",
                      }}
                    />
                  </label>
                </div>

                <div
                  style={{
                    padding: "0.9rem 1rem 1rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "0.75rem",
                    flexWrap: "wrap",
                  }}
                >
                  <small style={{ color: "#9a3412", fontWeight: 600 }}>
                    Você pode minimizar agora e concluir depois pelo atalho
                    flutuante.
                  </small>

                  <button
                    type="submit"
                    disabled={isSavingPasswordRotation}
                    style={{
                      minHeight: 40,
                      borderRadius: 12,
                      border: "1px solid rgba(194, 65, 12, 0.5)",
                      padding: "0 1rem",
                      color: "#ffffff",
                      fontWeight: 800,
                      background:
                        "linear-gradient(135deg, #ea580c 0%, #c2410c 100%)",
                      cursor: isSavingPasswordRotation ? "wait" : "pointer",
                      opacity: isSavingPasswordRotation ? 0.72 : 1,
                    }}
                  >
                    {isSavingPasswordRotation
                      ? "Atualizando..."
                      : "Salvar nova senha"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </S.MainContent>
      </S.AdminLayout>
    </ThemeProvider>
  );
}
