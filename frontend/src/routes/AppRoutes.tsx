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
const Home = lazy(() => import('../pages/Home/Home'));
const DigitalMenu = lazy(() => import('../pages/digital-menu/DigitalMenuEntryPage'));
const KitchenPage = lazy(() => import('../pages/kitchen/KitchenPage'));
const WaiterPage = lazy(() => import('../pages/waiter/WaiterPage'));
import api from '../Services/api';
import { useAuth } from '../contexts/authContext';
import { getAccessToken } from '../modules/auth/session/authSession';
import {
  clearSystemBlockState,
  findBlockingInvoice,
  getSystemBlockState,
  setSystemBlockState,
  subscribeSystemBlockState,
} from '../Services/systemBlock';
import { authorizeRoute } from './routeAuthorization';
import SystemAvailabilityGate from './SystemAvailabilityGate';
import SystemMaintenancePage from '../pages/SystemMaintenance/SystemMaintenance';
import { buildLoginUrl, getSafeNextPath } from '../shared/navigation/authNavigation';

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

  return <Navigate to={buildLoginUrl({ pathname: `/${normalizedSlug}` })} replace />;
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

export function RequireAuth() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <RouteLoading />;
  }

  if (!user) {
    return <Navigate to={buildLoginUrl(location)} replace />;
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

export function RouteAuthorizationGuard() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <RouteLoading />;

  const decision = authorizeRoute(location.pathname, user);
  if ('redirectTo' in decision) {
    const customerNextPath =
      user?.role === 'CLIENTE' && user.mustChangePassword !== true && location.pathname === '/login'
        ? getSafeNextPath(new URLSearchParams(location.search).get('next'))
        : '';
    const redirectTo = customerNextPath
      ? customerNextPath
      : !user && decision.redirectTo === '/login'
        ? buildLoginUrl(location)
        : decision.redirectTo;
    return <Navigate to={redirectTo} replace />;
  }
  return <Outlet />;
}

function BillingGate() {
  const { user, isLoading } = useAuth();
  const [blockState, setBlockState] = useState(() => getSystemBlockState());
  const [isCheckingBilling, setIsCheckingBilling] = useState(true);
  const role = String(user?.role || '').toUpperCase();

  useEffect(() => subscribeSystemBlockState(() => setBlockState(getSystemBlockState())), []);

  useEffect(() => {
    let active = true;

    const validateBillingBlock = async () => {
      if (isLoading) return;

      const token = getAccessToken();
      if (!token || role === 'SUPER_ADMIN') {
        clearSystemBlockState();
      } else if (role === 'ADMIN') {
        try {
          const response = await api.get('/billing/invoices');
          const invoiceList = Array.isArray(response?.data)
            ? response.data
            : Array.isArray(response?.data?.invoices)
              ? response.data.invoices
              : [];
          const blockingInvoice = findBlockingInvoice(invoiceList);
          if (blockingInvoice) {
            setSystemBlockState({
              reason: 'BILLING',
              message: 'Sistema bloqueado por inadimplência',
              paymentLink: blockingInvoice.paymentLink || null,
              invoiceId: blockingInvoice.id ?? null,
              dueDate: blockingInvoice.dueDate ? String(blockingInvoice.dueDate) : null,
            });
          } else {
            clearSystemBlockState();
          }
        } catch {
          // O interceptor persiste respostas de bloqueio retornadas pelo backend.
        }
      }

      if (active) {
        setBlockState(getSystemBlockState());
        setIsCheckingBilling(false);
      }
    };

    void validateBillingBlock();
    const timer = window.setInterval(() => void validateBillingBlock(), 30_000);
    const onFocus = () => void validateBillingBlock();
    window.addEventListener('focus', onFocus);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [isLoading, role]);

  if (isLoading || isCheckingBilling) {
    return <RouteLoading />;
  }

  if (blockState?.blocked) {
    // SystemAvailabilityGate observa o mesmo estado e substitui toda a árvore
    // pela manutenção ou pelo painel financeiro restrito.
    return <RouteLoading />;
  }

  return <Outlet />;
}

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteLoading />}>
        <SystemAvailabilityGate>
          <Routes>
            <Route element={<PageTransition />}>
              <Route path="/super_admin/login" element={<Login />} />
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

                  <Route element={<BillingGate />}>
                    <Route path="/billing" element={<BillingPage />} />
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
        </SystemAvailabilityGate>
      </Suspense>
    </BrowserRouter>
  );
}
