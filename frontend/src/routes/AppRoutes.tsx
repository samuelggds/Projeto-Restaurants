import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
  useParams,
} from "react-router-dom";
import { lazy, Suspense, useEffect, useState } from "react";

const Login = lazy(() => import("../pages/Login/Login"));
const RecoverPassword = lazy(
  () => import("../pages/RecoverPassword/RecoverPassword"),
);
const AdminDashboard = lazy(() => import("../pages/admin/Admin"));
const Register = lazy(() => import("../pages/Register/Register"));
const UserProfile = lazy(() => import("../pages/profile/Profile"));
const CourierDashboard = lazy(
  () => import("../pages/Courier/CourierDashboard"),
);
const SuperAdminPage = lazy(
  () => import("../pages/super_admin/SuperAdminPage"),
);
const BillingPage = lazy(() => import("../pages/Billing/BillingPage"));
const SystemBlockedPage = lazy(
  () => import("../pages/SystemBlocked/SystemBlocked"),
);
const SystemMaintenancePage = lazy(
  () => import("../pages/SystemMaintenance/SystemMaintenance"),
);
const Home = lazy(() => import("../pages/home/Home"));
const DigitalMenu = lazy(
  () => import("../pages/digital-menu/DigitalMenuEntryPage"),
);
const KitchenPage = lazy(() => import("../pages/kitchen/KitchenPage"));
const WaiterPage = lazy(() => import("../pages/waiter/WaiterPage"));
const SettingsPage = lazy(() =>
  import("../modules/settings/pages/SettingsPage").then((m) => ({
    default: m.SettingsPage,
  })),
);
import api from "../Services/api";
import { useAuth } from "../contexts/authContext";
import {
  clearSystemBlockState,
  getSystemBlockState,
  setSystemBlockState,
} from "../Services/systemBlock";

const ROLE_HOME = {
  CLIENTE: "/",
  MOTOQUEIRO: "/courier",
  ADMIN: "/admin",
  SUPER_ADMIN: "/super_admin",
};

function getRoleHome(role?: string, subRole?: string) {
  if (role === "FUNCIONARIO") {
    if (subRole === "COZINHA") return "/kitchen";
    if (subRole === "GARCOM") return "/waiter";
    return "/login";
  }
  return ROLE_HOME[role ?? ""] || "/login";
}

function RestaurantLoginRedirect() {
  const { restaurantSlug } = useParams();

  const normalizedSlug = String(restaurantSlug || "")
    .trim()
    .toLowerCase();

  if (!normalizedSlug) {
    return <Navigate to="/login" replace />;
  }

  const next = encodeURIComponent(`/${normalizedSlug}`);

  return <Navigate to={`/login?next=${next}`} replace />;
}

function RestaurantMenuGate() {
  const { user, isLoading } = useAuth();
  const { restaurantSlug } = useParams();

  const normalizedSlug = String(restaurantSlug || "")
    .trim()
    .toLowerCase();

  if (isLoading) {
    return null;
  }

  if (!normalizedSlug) {
    return <Navigate to="/login" replace />;
  }

  if (!user) {
    return <Navigate to={`/${normalizedSlug}/login`} replace />;
  }

  return <Home />;
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
    return (
      <Navigate to={getRoleHome(user?.role, user?.subRole as string)} replace />
    );
  }

  return <Outlet />;
}

function RequireSubRole({ subRole }: { subRole: string }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!user || user.role !== "FUNCIONARIO" || user.subRole !== subRole) {
    return (
      <Navigate to={getRoleHome(user?.role, user?.subRole as string)} replace />
    );
  }

  return <Outlet />;
}

function SuperAdminScopeGuard() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    // Keep public routes visible while auth bootstrap is in progress.
    return <Outlet />;
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
    return (
      <Navigate to={getRoleHome(user.role, user.subRole as string)} replace />
    );
  }

  return <Outlet />;
}

// Impede FUNCIONARIO de acessar qualquer rota fora da sua área designada
function FuncionarioScopeGuard() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading || user?.role !== "FUNCIONARIO") return <Outlet />;

  const home = getRoleHome("FUNCIONARIO", user.subRole as string);

  const allowed = ["/login", "/system-blocked", "/system-maintenance"];
  if (allowed.some((p) => location.pathname.startsWith(p))) return <Outlet />;

  if (home === "/login" || !location.pathname.startsWith(home)) {
    return <Navigate to={home === "/login" ? "/login" : home} replace />;
  }

  return <Outlet />;
}

// Impede CLIENTE de acessar qualquer rota além de / e /profile
function ClienteScopeGuard() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading || user?.role !== "CLIENTE") return <Outlet />;

  const allowed = [
    "/",
    "/profile",
    "/login",
    "/system-blocked",
    "/system-maintenance",
  ];
  if (
    allowed.some((p) =>
      p === "/" ? location.pathname === "/" : location.pathname.startsWith(p),
    )
  ) {
    return <Outlet />;
  }

  return <Navigate to="/" replace />;
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
        const invoiceList = Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response?.data?.invoices)
            ? response.data.invoices
            : [];
        const overdueInvoices = invoiceList.filter(
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
          <Route element={<ClienteScopeGuard />}>
            <Route element={<FuncionarioScopeGuard />}>
              <Route element={<SuperAdminScopeGuard />}>
                <Route path="/login" element={<Login />} />
                <Route
                  path="/:restaurantSlug/login"
                  element={<RestaurantLoginRedirect />}
                />
                <Route path="/recover-password" element={<RecoverPassword />} />
                <Route path="/register" element={<Register />} />
                <Route path="/mesa/:tableNumber" element={<DigitalMenu />} />
                <Route
                  path="/:restaurantSlug"
                  element={<RestaurantMenuGate />}
                />
                <Route
                  path="/:restaurantSlug/mesa/:tableNumber"
                  element={<DigitalMenu />}
                />

                {/* rota pública da loja */}
                <Route path="/" element={<Home />} />

                <Route element={<RequireAuth />}>
                  <Route
                    path="/system-blocked"
                    element={<SystemBlockedPage />}
                  />
                  <Route
                    path="/system-maintenance"
                    element={<SystemMaintenancePage />}
                  />

                  <Route element={<BillingGate />}>
                    <Route element={<RequireRole roles={["CLIENTE"]} />}>
                      <Route path="/profile" element={<UserProfile />} />
                    </Route>

                    <Route element={<RequireRole roles={["ADMIN"]} />}>
                      <Route path="/billing" element={<BillingPage />} />
                      <Route path="/admin" element={<AdminDashboard />} />
                      <Route
                        path="/admin/configuracoes"
                        element={<SettingsPage />}
                      />
                    </Route>

                    <Route element={<RequireRole roles={["MOTOQUEIRO"]} />}>
                      <Route path="/courier" element={<CourierDashboard />} />
                    </Route>

                    <Route element={<RequireSubRole subRole="COZINHA" />}>
                      <Route path="/kitchen" element={<KitchenPage />} />
                    </Route>

                    <Route element={<RequireSubRole subRole="GARCOM" />}>
                      <Route path="/waiter" element={<WaiterPage />} />
                    </Route>
                  </Route>
                </Route>
              </Route>

              <Route element={<RequireAuth />}>
                <Route element={<RequireRole roles={["SUPER_ADMIN"]} />}>
                  <Route path="/super_admin" element={<SuperAdminPage />} />
                  <Route path="/super_admin/*" element={<SuperAdminPage />} />
                </Route>
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
