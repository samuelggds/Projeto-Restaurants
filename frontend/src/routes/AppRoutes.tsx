import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
  useParams,
} from 'react-router-dom';
import { lazy, Suspense, useEffect, useState } from 'react';

const Login = lazy(() => import('../pages/Login/Login'));
const RecoverPassword = lazy(() => import('../pages/RecoverPassword/RecoverPassword'));
const ChangePasswordPage = lazy(() => import('../pages/ChangePassword/ChangePasswordPage'));
const AdminDashboard = lazy(() => import('../pages/admin/Admin'));
const Register = lazy(() => import('../pages/Register/Register'));
const UserProfile = lazy(() => import('../pages/Profile/Profile'));
const CourierDashboard = lazy(() => import('../pages/Courier/CourierWorkspace'));
const DeliveryTrackingPage = lazy(() => import('../pages/tracking/DeliveryTrackingPage'));
const SuperAdminPage = lazy(() => import('../pages/super_admin/SuperAdminPage'));
const BillingPage = lazy(() => import('../pages/Billing/BillingPage'));
const SystemBlockedPage = lazy(() => import('../pages/SystemBlocked/SystemBlocked'));
const SystemMaintenancePage = lazy(() => import('../pages/SystemMaintenance/SystemMaintenance'));
const Home = lazy(() => import('../pages/Home/Home'));
const DigitalMenu = lazy(() => import('../pages/digital-menu/DigitalMenuEntryPage'));
const KitchenPage = lazy(() => import('../pages/kitchen/KitchenPage'));
const WaiterPage = lazy(() => import('../pages/waiter/WaiterPage'));
import api from '../Services/api';
import { useAuth } from '../contexts/authContext';
import { getAccessToken } from '../modules/auth/session/authSession';
import {
  clearSystemBlockState,
  getSystemBlockState,
  setSystemBlockState,
} from '../Services/systemBlock';
import { authorizeRoute } from './routeAuthorization';

function RouteLoading() {
  return (
    <main className="app-route-loading" aria-busy="true" aria-live="polite">
      <span role="status">Carregando página…</span>
    </main>
  );
}

function RestaurantLoginRedirect() {
  const { restaurantSlug } = useParams();

  const normalizedSlug = String(restaurantSlug || '')
    .trim()
    .toLowerCase();

  if (!normalizedSlug) {
    return <Navigate to="/login" replace />;
  }

  const next = encodeURIComponent(`/${normalizedSlug}`);

  return <Navigate to={`/login?next=${next}`} replace />;
}

function RestaurantMenuGate() {
  const { restaurantSlug } = useParams();

  const normalizedSlug = String(restaurantSlug || '')
    .trim()
    .toLowerCase();

  if (!normalizedSlug) {
    return <Navigate to="/" replace />;
  }

  return <Home />;
}

function RequireAuth() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <RouteLoading />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

function PageTransition() {
  const location = useLocation();

  return (
    <div className="app-page-transition" key={location.pathname}>
      <Outlet />
    </div>
  );
}

function RouteAuthorizationGuard() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <RouteLoading />;

  const decision = authorizeRoute(location.pathname, user);
  if ('redirectTo' in decision) {
    return <Navigate to={decision.redirectTo} replace />;
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

      const token = getAccessToken();

      if (!token) {
        clearSystemBlockState();
        syncBlockState();
        setIsCheckingBilling(false);
        return;
      }

      if (user?.role === 'SUPER_ADMIN') {
        clearSystemBlockState();
        syncBlockState();
        setIsCheckingBilling(false);
        return;
      }

      const isAdminUser = user?.role === 'ADMIN';

      if (!isAdminUser) {
        setIsCheckingBilling(false);
        return;
      }

      try {
        const response = await api.get('/billing/invoices');
        const invoiceList = Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response?.data?.invoices)
            ? response.data.invoices
            : [];
        const overdueInvoices = invoiceList.filter((invoice) => invoice.status === 'ATRASADO');

        const overdueInvoice =
          overdueInvoices.find((invoice) => Boolean(invoice.paymentLink)) ||
          overdueInvoices[0] ||
          null;

        if (overdueInvoice) {
          setSystemBlockState({
            message: 'Sistema bloqueado por inadimplência',
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
    return <RouteLoading />;
  }

  if (blockState?.blocked) {
    if (user?.role === 'SUPER_ADMIN') {
      return <Outlet />;
    }

    if (['CLIENTE', 'FUNCIONARIO', 'MOTOQUEIRO'].includes(user?.role)) {
      return <Navigate to="/system-maintenance" replace />;
    }

    return <Navigate to="/system-blocked" replace />;
  }

  return <Outlet />;
}

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteLoading />}>
        <Routes>
          <Route element={<PageTransition />}>
            <Route element={<RouteAuthorizationGuard />}>
              <Route path="/login" element={<Login />} />
              <Route path="/:restaurantSlug/login" element={<RestaurantLoginRedirect />} />
              <Route path="/recover-password" element={<RecoverPassword />} />
              <Route path="/register" element={<Register />} />
              <Route path="/system-maintenance" element={<SystemMaintenancePage />} />
              <Route path="/mesa/:tableNumber" element={<DigitalMenu />} />
              <Route path="/:restaurantSlug" element={<RestaurantMenuGate />} />
              <Route path="/:restaurantSlug/mesa/:tableNumber" element={<DigitalMenu />} />

              <Route path="/" element={<Home />} />

              <Route element={<RequireAuth />}>
                <Route path="/change-password" element={<ChangePasswordPage />} />
                <Route path="/system-blocked" element={<SystemBlockedPage />} />
                <Route path="/billing" element={<BillingPage />} />

                <Route element={<BillingGate />}>
                  <Route path="/profile" element={<UserProfile />} />
                  <Route path="/orders/:id/tracking" element={<DeliveryTrackingPage />} />

                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route
                    path="/admin/configuracoes"
                    element={<Navigate to="/admin?settings=brand" replace />}
                  />

                  <Route path="/courier" element={<CourierDashboard />} />

                  <Route path="/kitchen" element={<KitchenPage />} />

                  <Route path="/waiter" element={<WaiterPage />} />
                </Route>
              </Route>

              <Route element={<RequireAuth />}>
                <Route path="/super_admin" element={<SuperAdminPage />} />
                <Route path="/super_admin/*" element={<SuperAdminPage />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
