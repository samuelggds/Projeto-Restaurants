/* eslint-disable react-refresh/only-export-components -- standalone isolated HTML entry point. */
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import api from '../../../Services/api';
import { AdminPage } from '../../admin/AdminPage';
import { AppDialogProvider } from '../../../components/AppDialog/AppDialogProvider';
import { NoticeViewport } from '../../../components/AppNotice/NoticeViewport';
import { GlobalStyles } from '../../../../GlobalStyles/globalStyles';
import { toast } from 'react-toastify';
import { createDemoAdminApi, demoApiOrders } from './demoAdminApi';
import { createDemoAdminData, discardDemoCredentials, type DemoAdminData } from './demoAdminData';
import {
  createInitialDemoState,
  sanitizeDemoState,
  toggleDemoOrderPaid,
  updateDemoOrderStatus,
  type DemoState,
} from './demoDomain';
import { mapAdminOrder } from '../../admin/domain/adminOrderMapper';

import { syncDemoEmployees } from './demoEmployees';
import { addDemoSupportMessage } from './demoSupport';
import { resolveDemoIngredientImage } from './demoIngredients';

let scenario = createInitialDemoState();
let adminData = createDemoAdminData();
const send = (type: string, value: Record<string, unknown> = {}) =>
  window.parent.postMessage({ type, ...value }, location.origin);
const changeScenario = (next: DemoState) => {
  scenario = next;
  window.dispatchEvent(new Event('demo-scenario'));
  send('demo-admin:state', { state: next });
};
const changeAdminData = (patch: Partial<DemoAdminData>) => {
  adminData = { ...adminData, ...patch };
  window.dispatchEvent(new Event('demo-catalog'));
  send('demo-admin:data', { data: adminData });
};
function configureAdapter() {
  api.defaults.adapter = createDemoAdminApi(
    () => scenario,
    changeScenario,
    adminData.runtime,
    (runtime) => {
      adminData = { ...adminData, runtime };
      send('demo-admin:data', { data: adminData });
    },
    () => adminData.employees,
    () => adminData.settings,
    { get: () => adminData, save: changeAdminData },
  );
}
configureAdapter();

function Sandbox() {
  const [state, setState] = useState(scenario);
  const [data, setData] = useState<DemoAdminData>(createDemoAdminData);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.source !== window.parent || event.origin !== location.origin) return;
      if (event.data?.type === 'demo-admin:init') {
        scenario = sanitizeDemoState(event.data.state);
        setState(scenario);
        adminData = event.data.data ?? createDemoAdminData();
        setData(adminData);
        configureAdapter();
        setReady(true);
      }
      if (event.data?.type === 'demo-admin:state') {
        scenario = sanitizeDemoState(event.data.state);
        setState(scenario);
      }
    };
    const sync = () => setState(scenario);
    const syncCatalog = () => setData(adminData);
    window.addEventListener('message', receive);
    window.addEventListener('demo-scenario', sync);
    window.addEventListener('demo-catalog', syncCatalog);
    send('demo-admin:ready');
    return () => {
      window.removeEventListener('message', receive);
      window.removeEventListener('demo-scenario', sync);
      window.removeEventListener('demo-catalog', syncCatalog);
    };
  }, []);
  const save = (patch: Partial<DemoAdminData>, passwords: Record<string, string> = {}) => {
    if (patch.employees)
      changeScenario(syncDemoEmployees(scenario, patch.employees, adminData.employees, passwords));
    const next = { ...adminData, ...patch };
    adminData = next;
    setData(next);
    send('demo-admin:data', { data: next });
  };
  const simulated = async () => {
    toast.success('Configuração simulada. Nenhum serviço real foi conectado.');
  };
  if (!ready) return <p role="status">Carregando cenário demonstrativo...</p>;
  return (
    <AdminPage
      initialSettings={data.settings}
      initialProducts={data.products}
      initialCategories={data.categories}
      initialIngredients={adminData.ingredients}
      initialEmployees={data.employees}
      initialCoupons={data.coupons}
      initialOrders={demoApiOrders(state).map(mapAdminOrder)}
      onSaveSettings={async (settings) => {
        save({ settings: discardDemoCredentials(settings) });
      }}
      onUpdateOrderStatus={async (id, status) => {
        const allowed = [
          'PENDENTE',
          'PREPARANDO',
          'PRONTO',
          'SAIU_PARA_ENTREGA',
          'ENTREGUE',
          'CANCELADO',
        ] as const;
        const next = allowed.find((item) => item === status);
        if (next) changeScenario(updateDemoOrderStatus(scenario, id, next));
      }}
      onConfirmOrderPayment={async (id) => changeScenario(toggleDemoOrderPaid(scenario, id))}
      onCancelOrder={async (id) => changeScenario(updateDemoOrderStatus(scenario, id, 'CANCELADO'))}
      onSaveProduct={async (product) => {
        const previous = adminData.products.find((item) => item.id === product.id);
        const next = {
          ...product,
          id: product.id || `demo-product-${Date.now()}`,
          configurationVersion: (previous?.configurationVersion ?? 0) + 1,
        };
        save({
          products: data.products.some((item) => item.id === next.id)
            ? data.products.map((item) => (item.id === next.id ? next : item))
            : [...data.products, next],
        });
      }}
      onDeleteProduct={async (id) =>
        save({ products: data.products.filter((item) => item.id !== id) })
      }
      onCreateCategory={async (name) =>
        save({ categories: [...data.categories, { id: Date.now(), name }] })
      }
      onUpdateCategory={async (id, name) =>
        save({
          categories: data.categories.map((item) => (item.id === id ? { ...item, name } : item)),
        })
      }
      onDeleteCategory={async (id) =>
        save({ categories: data.categories.filter((item) => item.id !== id) })
      }
      onCreateIngredient={async (ingredient) => {
        const next = { ...resolveDemoIngredientImage(ingredient), id: Date.now() };
        save({ ingredients: [...adminData.ingredients, next] });
        return next;
      }}
      onUpdateIngredient={async (ingredient, imageSelection) =>
        save({
          ingredients: adminData.ingredients.map((item) =>
            item.id === ingredient.id
              ? resolveDemoIngredientImage({
                  ...ingredient,
                  ...(imageSelection !== undefined ? { image: imageSelection } : {}),
                })
              : item,
          ),
        })
      }
      onDeleteIngredient={async (id) =>
        save({ ingredients: adminData.ingredients.filter((item) => item.id !== id) })
      }
      onReloadCatalog={async () => setData({ ...adminData })}
      onReloadPromotions={async () => setData({ ...adminData })}
      onApplyProductDiscount={async (id, discount) =>
        save({
          products: data.products.map((item) => (item.id === id ? { ...item, discount } : item)),
        })
      }
      onDeleteProductDiscount={async (id) =>
        save({
          products: data.products.map((item) =>
            item.id === id ? { ...item, discount: undefined } : item,
          ),
        })
      }
      onCreateCoupon={async (coupon) =>
        save({ coupons: [...data.coupons, { ...coupon, id: String(Date.now()) }] })
      }
      onUpdateCoupon={async (id, coupon) =>
        save({
          coupons: data.coupons.map((item) => (item.id === id ? { ...item, ...coupon } : item)),
        })
      }
      onDeleteCoupon={async (id) =>
        save({ coupons: data.coupons.filter((item) => item.id !== id) })
      }
      onCreateEmployee={async (employee) => {
        const { password: _password, confirmPassword: _confirmation, ...profile } = employee;
        void _password;
        void _confirmation;
        const next = { ...profile, id: String(Date.now()) };
        save({ employees: [...data.employees, next] }, _password ? { [next.id]: _password } : {});
        return next;
      }}
      onUpdateEmployee={async (employee) => {
        const { password: _password, confirmPassword: _confirmation, ...next } = employee;
        void _password;
        void _confirmation;
        save(
          { employees: data.employees.map((item) => (item.id === next.id ? next : item)) },
          _password ? { [next.id]: _password } : {},
        );
        return next;
      }}
      onDeactivateEmployee={async (id) =>
        save({
          employees: data.employees.map((item) =>
            item.id === id ? { ...item, active: false } : item,
          ),
        })
      }
      onReactivateEmployee={async (id) =>
        save({
          employees: data.employees.map((item) =>
            item.id === id ? { ...item, active: true } : item,
          ),
        })
      }
      onConnectMercadoPago={simulated}
      onConnectPagBank={simulated}
      onOnboardAsaas={simulated}
      onReportSupport={async (payload) => {
        changeScenario(addDemoSupportMessage(scenario, payload));
        toast.success('Solicitação registrada na demonstração.');
      }}
      onViewStore={() => send('demo-admin:store')}
      onLogout={() => send('demo-admin:exit')}
    />
  );
}

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <AppDialogProvider>
      <GlobalStyles />
      <NoticeViewport />
      <Sandbox />
    </AppDialogProvider>
  </BrowserRouter>,
);
