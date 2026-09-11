/* eslint-disable react-refresh/only-export-components -- isolated read-only document */
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { GlobalStyles } from '../../../GlobalStyles/globalStyles';
import { AppDialogProvider } from '../../components/AppDialog/AppDialogProvider';
import api from '../../Services/api';
import { AdminPage } from '../../pages/admin/AdminPage';
import type { AdminSection } from '../../pages/admin/types';
import { settingItems } from '../../pages/admin/config/adminNavigation';
import { createDemoAdminData } from '../../pages/Marketing/demo/demoAdminData';
import { createInitialDemoState } from '../../pages/Marketing/demo/demoDomain';
import { createDemoAdminApi, demoApiOrders } from '../../pages/Marketing/demo/demoAdminApi';
import { mapAdminOrder } from '../../pages/admin/domain/adminOrderMapper';
import { DemoKitchen, DemoWaiter } from '../../pages/Marketing/demo/DemoKitchenWaiter';
import { DemoCourier } from '../../pages/Marketing/demo/DemoCourier';
import { installReadOnlyHelpPreview } from './readOnlyHelpPreview';

const state = createInitialDemoState();
const data = createDemoAdminData();
const noop = () => undefined;
api.defaults.adapter = createDemoAdminApi(() => state, noop);
const area = new URLSearchParams(location.search).get('area') ?? 'admin-overview';
const settings = area.startsWith('settings-') ? area.slice(9) : '';
if (settingItems.some(([key]) => key === settings)) {
  const url = new URL(location.href);
  url.searchParams.set('settings', settings);
  history.replaceState(null, '', url);
}

function Preview() {
  const props = { state, onState: noop, onLogout: noop };
  if (area.startsWith('kitchen-')) {
    const view = area.slice(8);
    return (
      <DemoKitchen
        {...props}
        initialKitchenView={
          view === 'queue' || view === 'ready' || view === 'history' ? view : 'overview'
        }
      />
    );
  }
  if (area.startsWith('waiter-')) {
    const view = area.slice(7);
    return (
      <DemoWaiter
        {...props}
        initialWaiterView={
          view === 'deliveries' || view === 'tables' || view === 'calls' || view === 'payments'
            ? view
            : 'overview'
        }
      />
    );
  }
  if (area.startsWith('courier-')) {
    const views = {
      overview: 'overview',
      pickup: 'ready',
      delivery: 'route',
      route: 'map',
      history: 'history',
      profile: 'profile',
    } as const;
    return (
      <DemoCourier
        {...props}
        initialView={views[area.slice(8) as keyof typeof views] ?? 'overview'}
      />
    );
  }
  const requested = area.slice(6);
  const adminAreas: Array<Exclude<AdminSection, 'help'>> = [
    'overview',
    'orders',
    'catalog',
    'customers',
    'employees',
    'subscriptions',
    'settings',
  ];
  const initialArea = adminAreas.find((item) => item === requested) ?? 'overview';
  return (
    <AdminPage
      initialArea={initialArea}
      initialSettings={data.settings}
      initialProducts={data.products}
      initialCategories={data.categories}
      initialIngredients={data.ingredients}
      initialEmployees={data.employees}
      initialCoupons={data.coupons}
      initialOrders={demoApiOrders(state).map(mapAdminOrder)}
    />
  );
}

const root = document.getElementById('root')!;
// Guard before React attaches handlers; native scrolling stays available.
installReadOnlyHelpPreview(root);
createRoot(root).render(
  <BrowserRouter>
    <AppDialogProvider>
      <GlobalStyles />
      <Preview />
    </AppDialogProvider>
  </BrowserRouter>,
);
