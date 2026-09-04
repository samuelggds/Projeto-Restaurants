import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/authContext';
import superAdminService from '../../Services/superAdminService';
import { mapSupportMessages } from './adapters/superAdminDataAdapter';
import { CreateRestaurantDialog } from './components/CreateRestaurantDialog';
import { LoadState } from './components/Shared';
import { superAdminPath, viewFromPath } from './domain/superAdminDomain';
import { useSuperAdminDashboard } from './hooks/useSuperAdminDashboard';
import { SuperAdminModule } from './SuperAdminModule';
import type { SuperAdminActions, SuperAdminUser, SuperAdminView } from './types';

export default function SuperAdminPage() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { data, error, loading, refreshing, refresh } = useSuperAdminDashboard();
  const [createRestaurantOpen, setCreateRestaurantOpen] = useState(false);
  const currentView = viewFromPath(location.pathname);

  useEffect(() => {
    const expectedPath = superAdminPath(currentView);
    const normalizedPath = location.pathname.replace(/\/+$/, '');
    if (normalizedPath !== expectedPath) {
      navigate(
        { pathname: expectedPath, search: location.search, hash: location.hash },
        { replace: true },
      );
    }
  }, [currentView, location.hash, location.pathname, location.search, navigate]);

  const mutateAndRefresh = useCallback(
    async (mutation: () => Promise<unknown>) => {
      await mutation();
      await refresh();
    },
    [refresh],
  );

  const actions = useMemo<SuperAdminActions>(
    () => ({
      refresh,
      updateSettings: async (settings) => {
        await mutateAndRefresh(() => superAdminService.updateSettings(settings));
      },
      updatePlan: async (code, input) => {
        await mutateAndRefresh(() => superAdminService.updatePlan(code, input));
      },
      updateRestaurantAccess: async (id, input) => {
        await mutateAndRefresh(() => superAdminService.updateRestaurantAccess(id, input));
      },
      updateSubscription: async (id, input) => {
        await mutateAndRefresh(() => superAdminService.updateRestaurantSubscription(id, input));
      },
      createAdministrator: async (restaurantId, input) => {
        await mutateAndRefresh(() => superAdminService.createAdministrator(restaurantId, input));
      },
      rotateAdminPortalKey: async (restaurantId) => {
        const result = await superAdminService.rotateAdminPortalKey(restaurantId);
        await refresh();
        return result;
      },
      revokeAdminPortalKey: async (restaurantId) => {
        await mutateAndRefresh(() => superAdminService.revokeAdminPortalKey(restaurantId));
      },
      updateAdministratorAccess: async (id, input) => {
        await mutateAndRefresh(() => superAdminService.updateAdministratorAccess(id, input));
      },
      getSupportMessages: async (restaurantId) =>
        mapSupportMessages(await superAdminService.getSupportMessages(restaurantId)),
      sendSupportMessage: async (restaurantId, message, closeConversation = false) => {
        await mutateAndRefresh(() =>
          superAdminService.sendSupportMessage(restaurantId, message, closeConversation),
        );
      },
    }),
    [mutateAndRefresh, refresh],
  );

  const currentUser: SuperAdminUser = {
    id: String(user?.id ?? ''),
    name: String(user?.name ?? 'Super Admin'),
    email: String(user?.email ?? ''),
    role: String(user?.role ?? '').toUpperCase(),
  };

  const changeView = (view: SuperAdminView) => {
    navigate(superAdminPath(view));
  };

  if (!data) {
    return <LoadState loading={loading} error={error} onRetry={() => void refresh()} />;
  }

  return (
    <>
      <SuperAdminModule
        currentUser={currentUser}
        data={data}
        currentView={currentView}
        onViewChange={changeView}
        actions={actions}
        onCreateRestaurant={() => setCreateRestaurantOpen(true)}
        onLogout={() => {
          logout();
          navigate('/super_admin/login', { replace: true });
        }}
        refreshing={refreshing}
        loadError={error}
      />
      {createRestaurantOpen ? (
        <CreateRestaurantDialog
          plans={data.plans}
          onClose={() => setCreateRestaurantOpen(false)}
          onCreated={refresh}
        />
      ) : null}
    </>
  );
}
