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
  PlusCircle,
  Table2,
  ClipboardList,
  Users,
  Clock,
  Package,
  Image as ImageIcon,
  UserPlus,
  Eye,
  EyeOff,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import ordersService from "../../Services/ordersService";
import categoriesService from "../../Services/categoriesService";
import productsService from "../../Services/productsService";
import employeesService from "../../Services/employeesService";
import tablesService from "../../Services/tablesService";
import { connectSocket, disconnectSocket } from "../../Services/socketService";
import * as S from "./styles";

const ORDER_STATUSES = [
  "PENDENTE",
  "PREPARANDO",
  "PRONTO",
  "SAIU_PARA_ENTREGA",
  "ENTREGUE",
  "CANCELADO",
];
const CLOSABLE_ORDER_STATUSES = ["ENTREGUE", "CANCELADO"];
const CLOSABLE_PICKUP_ORDER_STATUSES = ["ENTREGUE"];
const CLOSED_DELIVERED_ORDERS_STORAGE_KEY =
  "@PecaJaFood:adminClosedDeliveredOrders";
const EMPLOYEE_FIELD_LABELS = {
  name: "Nome",
  email: "Email",
  password: "Senha",
  confirmPassword: "Confirmacao de senha",
  phone: "Telefone",
  role: "Cargo",
};

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

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState("orders");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [orders, setOrders] = useState([]);
  const [closingOrderIds, setClosingOrderIds] = useState([]);
  const [closedDeliveredOrderIds, setClosedDeliveredOrderIds] = useState(
    getInitialClosedDeliveredOrders,
  );
  const [employees, setEmployees] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tables, setTables] = useState([]);

  const [productForm, setProductForm] = useState({
    name: "",
    description: "",
    image: "",
    price: "",
    categoryId: "",
    preparationTime: "",
    stock: "",
    featured: false,
    active: true,
  });

  const [employeeData, setEmployeeData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    role: "FUNCIONARIO",
  });
  const [categoryName, setCategoryName] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const qrCardRefs = useRef({});

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      try {
        const [ordersData, categoriesData, employeesData, tablesData] =
          await Promise.all([
            ordersService.listRestaurantOrders(),
            categoriesService.listCategories(),
            employeesService.listEmployees(),
            tablesService.listTables(),
          ]);

        if (!mounted) {
          return;
        }

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
    localStorage.setItem(
      CLOSED_DELIVERED_ORDERS_STORAGE_KEY,
      JSON.stringify(closedDeliveredOrderIds),
    );
  }, [closedDeliveredOrderIds]);

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
    };

    socket.on("new-order", onNewOrder);
    socket.on("order:status-changed", onStatusChanged);

    return () => {
      socket.off("new-order", onNewOrder);
      socket.off("order:status-changed", onStatusChanged);
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

  const handleCreateProduct = async (event) => {
    event.preventDefault();

    try {
      await productsService.createProduct({
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
      });

      toast.success("Produto criado com sucesso!");
      setProductForm({
        name: "",
        description: "",
        image: "",
        price: "",
        categoryId: "",
        preparationTime: "",
        stock: "",
        featured: false,
        active: true,
      });
    } catch (err) {
      toast.error(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          "Erro ao criar produto",
      );
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
      toast.error(err?.response?.data?.error || "Erro ao atualizar status");
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

  const visibleOrders = orders.filter(
    (order) =>
      !(canCloseOrder(order) && closedDeliveredOrderIds.includes(order.id)),
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

    try {
      const response = await categoriesService.createCategory({
        name: categoryName,
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

  return (
    <ThemeProvider theme={isDarkMode ? S.darkTheme : S.lightTheme}>
      <S.AdminLayout>
        <S.Sidebar $collapsed={isSidebarCollapsed}>
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
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            >
              {isSidebarCollapsed ? (
                <ChevronRight size={16} />
              ) : (
                <ChevronLeft size={16} />
              )}
            </button>
          </S.Brand>

          <S.NavigationList>
            <S.NavButton onClick={() => navigate("/")}>
              <Home size={20} />
              {!isSidebarCollapsed && <span>Ir para Home</span>}
            </S.NavButton>

            <S.NavButton onClick={() => navigate("/orders")}>
              <ClipboardList size={20} />
              {!isSidebarCollapsed && <span>Ir para Orders</span>}
            </S.NavButton>

            <S.NavButton onClick={() => navigate("/profile")}>
              <User size={20} />
              {!isSidebarCollapsed && <span>Ir para Perfil</span>}
            </S.NavButton>

            <div
              style={{
                margin: "0.75rem 0 0.25rem",
                padding: "0 0.35rem",
                fontSize: "0.72rem",
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#94a3b8",
              }}
            >
              {!isSidebarCollapsed && <span>Ferramentas do Admin</span>}
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
              onClick={() => setActiveTab("products")}
            >
              <PlusCircle size={20} />
              {!isSidebarCollapsed && <span>Criar Produto</span>}
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
          </S.NavigationList>

          <S.SidebarFooter>
            <S.ThemeToggle onClick={() => setIsDarkMode(!isDarkMode)}>
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
              {!isSidebarCollapsed && (
                <span>{isDarkMode ? "Modo Claro" : "Modo Escuro"}</span>
              )}
            </S.ThemeToggle>
          </S.SidebarFooter>
        </S.Sidebar>

        <S.MainContent>
          {activeTab === "orders" && (
            <div>
              <S.PageHeader>
                <h2>Pedidos em Tempo Real</h2>
                <p>Monitore e altere o status dos pedidos instantaneamente.</p>
              </S.PageHeader>

              <S.OrdersGrid>
                {visibleOrders.map((order) => {
                  const orderTypeClass = String(
                    order?.type || "",
                  ).toLowerCase();
                  const isDelivery = String(order?.type || "")
                    .toUpperCase()
                    .includes("DELIVERY");
                  const deliveryCustomerName =
                    order?.user?.name || "Cliente não identificado";
                  const deliveryAddressLabel = getDeliveryAddressLabel(order);

                  return (
                    <S.OrderCard
                      key={order.id}
                      $isClosing={closingOrderIds.includes(order.id)}
                    >
                      {/** badge de mesa para facilitar identificação de pedidos presenciais */}
                      <div className="card-header">
                        <div>
                          <h3>Pedido #{order.id}</h3>
                          <div className="badges">
                            <span
                              className={`badge type type-${orderTypeClass}`}
                            >
                              {order.type}
                            </span>
                            {getOrderTableLabel(order) ? (
                              <span className="badge payment">
                                {getOrderTableLabel(order)}
                              </span>
                            ) : null}
                            <span className="badge payment">
                              {order.paymentMethod || "N/A"}
                            </span>
                          </div>
                        </div>
                        <S.CardHeaderActions>
                          <span className="price">
                            R$ {Number(order.total || 0).toFixed(2)}
                          </span>

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

                      <p className="items-list">
                        {(order.items || [])
                          .map(
                            (item) =>
                              `${item.quantity}x ${item?.product?.name || "Produto"}`,
                          )
                          .join(", ")}
                      </p>

                      {isDelivery ? (
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

                      <S.StatusBox>
                        <h4>
                          Status Atual:{" "}
                          <span
                            className={`status-${String(order.status).toLowerCase()}`}
                          >
                            {String(order.status).replace(/_/g, " ")}
                          </span>
                        </h4>

                        <S.ButtonGroup>
                          {getAvailableStatusesByOrderType(order.type).map(
                            (status) => (
                              <button
                                key={status}
                                className={`btn ${order.status === status ? `active-${String(status).toLowerCase()}` : ""}`}
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
              </S.PageHeader>
              <form onSubmit={handleCreateCategory}>
                <S.FormGroup>
                  <label>Nome da Categoria</label>
                  <input
                    type="text"
                    placeholder="Ex: Hambúrgueres Artesanais, Bebidas, Pizzas..."
                    value={categoryName}
                    onChange={(event) => setCategoryName(event.target.value)}
                    required
                  />
                </S.FormGroup>
                <S.SubmitBtn type="submit" style={{ marginTop: "1.5rem" }}>
                  Salvar Categoria
                </S.SubmitBtn>
              </form>

              <div
                style={{ marginTop: "1.5rem", display: "grid", gap: "0.5rem" }}
              >
                {categories.map((category) => (
                  <S.SlugBadge key={category.id}>{category.name}</S.SlugBadge>
                ))}
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
                      onChange={handleProductInputChange}
                      required
                    />
                  </S.FormGroup>
                  <S.FormGroup style={{ flex: 1 }}>
                    <label>Categoria *</label>
                    <select
                      name="categoryId"
                      value={productForm.categoryId}
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
                      onChange={handleProductInputChange}
                    />
                    <span>🌟 Destacar Produto</span>
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="active"
                      checked={productForm.active}
                      onChange={handleProductInputChange}
                    />
                    <span>🟢 Produto Ativo</span>
                  </label>
                </S.CheckboxContainerRow>

                <S.SubmitBtn type="submit">Publicar Produto</S.SubmitBtn>
              </form>
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
        </S.MainContent>
      </S.AdminLayout>
    </ThemeProvider>
  );
}
