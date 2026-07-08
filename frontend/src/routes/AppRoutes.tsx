import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";
import { lazy, Suspense, useEffect, useState } from "react";

const Login = lazy(() => import("../pages/Login/Login"));
const RecoverPassword = lazy(
  () => import("../pages/RecoverPassword/RecoverPassword"),
);
const AdminDashboard = lazy(
  () => import("../pages/AdminDashboard/AdminDashboard"),
);
const Register = lazy(() => import("../pages/Register/Register"));
const UserProfile = lazy(() => import("../pages/Profile/Profile"));
const MyOrders = lazy(() => import("../pages/MyOrders/MyOrders"));
const EmployeesDashboard = lazy(
  () => import("../pages/Employees/EmployeesDashboard"),
);
const CourierDashboard = lazy(
  () => import("../pages/Courier/CourierDashboard"),
);
const SuperAdminDashboard = lazy(
  () => import("../pages/SuperAdmin/SuperAdminDashboard"),
);
const SuperAdminCreateRestaurant = lazy(
  () => import("../pages/SuperAdmin/SuperAdminCreateRestaurant"),
);
const Cart = lazy(() => import("../pages/Cart/Cart"));
const BillingPage = lazy(() => import("../pages/Billing/BillingPage"));
const SystemBlockedPage = lazy(
  () => import("../pages/SystemBlocked/SystemBlocked"),
);
const SystemMaintenancePage = lazy(
  () => import("../pages/SystemMaintenance/SystemMaintenance"),
);
const Home = lazy(() => import("../pages/Home/Home"));
const DigitalMenu = lazy(() => import("../pages/DigitalMenu/DigitalMenu"));
import api from "../Services/api";
import { useAuth } from "../contexts/authContext";
import {
  clearSystemBlockState,
  getSystemBlockState,
  setSystemBlockState,
} from "../Services/systemBlock";
import GlobalAiAssistant from "../components/GlobalAiAssistant/GlobalAiAssistant";

const ROLE_HOME = {
  CLIENTE: "/",
  FUNCIONARIO: "/employees",
  MOTOQUEIRO: "/courier",
  ADMIN: "/admin",
  SUPER_ADMIN: "/super_admin",
};

function getRoleHome(role) {
  return ROLE_HOME[role] || "/login";
}

function RequireAuth() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

function RequireRole({ roles }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!user || !roles.includes(user.role)) {
    return <Navigate to={getRoleHome(user?.role)} replace />;
  }

  return <Outlet />;
}

function SuperAdminScopeGuard() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return null;
  }

  if (
    user?.role === "SUPER_ADMIN" &&
    !location.pathname.startsWith("/super_admin")
  ) {
    return <Navigate to="/super_admin" replace />;
  }

  if (
    user?.role &&
    user.role !== "SUPER_ADMIN" &&
    location.pathname.startsWith("/super_admin")
  ) {
    return <Navigate to={getRoleHome(user.role)} replace />;
  }

  return <Outlet />;
}

function BillingGate() {
  const { user, isLoading } = useAuth();
  const [blockState, setBlockState] = useState(() => getSystemBlockState());
  const [isCheckingBilling, setIsCheckingBilling] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const syncBlockState = () => {
      if (!cancelled) {
        setBlockState(getSystemBlockState());
      }
    };

    const validateBillingBlock = async () => {
      if (isLoading) {
        setIsCheckingBilling(true);
        return;
      }

      const token = localStorage.getItem("token");

      if (!token) {
        clearSystemBlockState();
        syncBlockState();
        setIsCheckingBilling(false);
        return;
      }

      if (user?.role === "SUPER_ADMIN") {
        clearSystemBlockState();
        syncBlockState();
        setIsCheckingBilling(false);
        return;
      }

      const isAdminUser = user?.role === "ADMIN";

      if (!isAdminUser) {
        setIsCheckingBilling(false);
        return;
      }

      try {
        const response = await api.get("/billing/invoices");
        const overdueInvoices = response.data.filter(
          (invoice) => invoice.status === "ATRASADO",
        );

        const overdueInvoice =
          overdueInvoices.find((invoice) => Boolean(invoice.paymentLink)) ||
          overdueInvoices[0] ||
          null;

        if (overdueInvoice) {
          setSystemBlockState({
            message: "Sistema bloqueado por inadimplência",
            paymentLink: overdueInvoice.paymentLink || null,
            invoiceId: overdueInvoice.id,
            dueDate: overdueInvoice.dueDate,
          });
        } else {
          clearSystemBlockState();
        }
      } catch {
        // O interceptor já trata bloqueio 403 e estado local.
      } finally {
        syncBlockState();
        if (!cancelled) {
          setIsCheckingBilling(false);
        }
      }
    };

    validateBillingBlock();

    return () => {
      cancelled = true;
    };
  }, [user, isLoading]);

  if (isLoading || isCheckingBilling) {
    return null;
  }

  if (blockState?.blocked) {
    if (user?.role === "SUPER_ADMIN") {
      return <Outlet />;
    }

    if (["CLIENTE", "FUNCIONARIO", "MOTOQUEIRO"].includes(user?.role)) {
      return <Navigate to="/system-maintenance" replace />;
    }

    return <Navigate to="/system-blocked" replace />;
  }

  return <Outlet />;
}

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Suspense fallback={null}>
        <Routes>
          <Route element={<SuperAdminScopeGuard />}>
            <Route path="/login" element={<Login />} />
            <Route path="/recover-password" element={<RecoverPassword />} />
            <Route path="/register" element={<Register />} />
            <Route path="/mesa/:tableNumber" element={<DigitalMenu />} />

            <Route element={<RequireAuth />}>
              <Route path="/" element={<Home />} />
              <Route path="/menu" element={<Home />} />
              <Route path="/cardapio" element={<Home />} />
              <Route path="/cart" element={<Cart />} />

              <Route path="/system-blocked" element={<SystemBlockedPage />} />
              <Route
                path="/system-maintenance"
                element={<SystemMaintenancePage />}
              />

              <Route element={<BillingGate />}>
                <Route element={<RequireRole roles={["CLIENTE", "ADMIN"]} />}>
                  <Route path="/profile" element={<UserProfile />} />
                  <Route path="/profile/orders" element={<MyOrders />} />
                </Route>

                <Route element={<RequireRole roles={["ADMIN"]} />}>
                  <Route path="/billing" element={<BillingPage />} />
                  <Route path="/admin" element={<AdminDashboard />} />
                </Route>

                <Route
                  element={<RequireRole roles={["ADMIN", "MOTOQUEIRO"]} />}
                >
                  <Route path="/courier" element={<CourierDashboard />} />
                </Route>

                <Route
                  element={<RequireRole roles={["ADMIN", "FUNCIONARIO"]} />}
                >
                  <Route path="/employees" element={<EmployeesDashboard />} />
                </Route>
              </Route>
            </Route>
          </Route>

          <Route element={<RequireAuth />}>
            <Route element={<RequireRole roles={["SUPER_ADMIN"]} />}>
              <Route path="/super_admin" element={<SuperAdminDashboard />} />
              <Route
                path="/super_admin/cadastro"
                element={<SuperAdminCreateRestaurant />}
              />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <GlobalAiAssistant />
    </BrowserRouter>
  );
}
