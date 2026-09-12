import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/authContext';
import { getSystemBlockState } from '../../Services/systemBlock';
import SystemMaintenancePage from '../SystemMaintenance/SystemMaintenance';
import BillingRestrictedAdmin from '../admin/restricted/BillingRestrictedAdmin';

export default function SystemBlockedPage() {
  const { user } = useAuth();
  const role = String(user?.role || '').toUpperCase();
  const block = getSystemBlockState();
  if (role === 'SUPER_ADMIN') return <Navigate to="/super_admin" replace />;
  if (!block) return <Navigate to={role === 'ADMIN' ? '/admin' : '/profile'} replace />;
  if (role === 'ADMIN' && block.reason === 'BILLING') return <BillingRestrictedAdmin />;
  const audience =
    role === 'ADMIN'
      ? 'admin'
      : ['ATENDENTE', 'GARCOM', 'COZINHA', 'MOTOQUEIRO'].includes(role)
        ? 'staff'
        : 'customer';
  return <SystemMaintenancePage mode="tenant" audience={audience} />;
}
