import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import { useEffect, useState } from "react";

import Login from "../pages/Login/Login";
import AdminDashboard from "../pages/AdminDashboard/AdminDashboard";
import Register from "../pages/Register/Register";
import UserProfile from "../pages/Profile/Profile";
import MyOrders from "../pages/MyOrders/MyOrders";
import EmployeesDashboard from "../pages/Employees/EmployeesDashboard";
import CourierDashboard from "../pages/Courier/CourierDashboard";
import SuperAdminDashboard from "../pages/SuperAdmin/SuperAdminDashboard";
import Cart from "../pages/Cart/Cart";
import BillingPage from "../pages/Billing/BillingPage";
import SystemBlockedPage from "../pages/SystemBlocked/SystemBlocked";
import SystemMaintenancePage from "../pages/SystemMaintenance/SystemMaintenance";
import Home from "../pages/Home/Home";
import DigitalMenu from "../pages/DigitalMenu/DigitalMenu";
import api from "../Services/api";
import { useAuth } from "../contexts/authContext";
import {
  clearSystemBlockState,
  getSystemBlockState,
  setSystemBlockState,
} from "../Services/systemBlock";

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
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<Home />} />
        <Route path="/menu" element={<Home />} />
        <Route path="/cardapio" element={<Home />} />
        <Route path="/mesa/:tableNumber" element={<DigitalMenu />} />
        <Route path="/cart" element={<Cart />} />

        <Route element={<RequireAuth />}>
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

            <Route element={<RequireRole roles={["ADMIN", "MOTOQUEIRO"]} />}>
              <Route path="/courier" element={<CourierDashboard />} />
            </Route>

            <Route element={<RequireRole roles={["ADMIN", "FUNCIONARIO"]} />}>
              <Route path="/employees" element={<EmployeesDashboard />} />
            </Route>
          </Route>

          <Route element={<RequireRole roles={["SUPER_ADMIN"]} />}>
            <Route path="/super_admin" element={<SuperAdminDashboard />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
