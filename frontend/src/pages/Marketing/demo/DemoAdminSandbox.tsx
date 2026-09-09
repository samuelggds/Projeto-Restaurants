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

let scenario = createInitialDemoState();
let adminData = createDemoAdminData();
const send = (type: string, value: Record<string, unknown> = {}) =>
  window.parent.postMessage({ type, ...value }, location.origin);
const changeScenario = (next: DemoState) => {
  scenario = next;
  window.dispatchEvent(new Event('demo-scenario'));
  send('demo-admin:state', { state: next });
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
    window.addEventListener('message', receive);
    window.addEventListener('demo-scenario', sync);
    send('demo-admin:ready');
    return () => {
      window.removeEventListener('message', receive);
      window.removeEventListener('demo-scenario', sync);
    };
  }, []);
  const save = (patch: Partial<DemoAdminData>) => {
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
      initialIngredients={data.ingredients}
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
        const next = { ...product, id: product.id || `demo-product-${Date.now()}` };
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
        const next = { ...ingredient, id: Date.now() };
        save({ ingredients: [...data.ingredients, next] });
        return next;
      }}
      onUpdateIngredient={async (ingredient) =>
        save({
          ingredients: data.ingredients.map((item) =>
            item.id === ingredient.id ? ingredient : item,
          ),
        })
      }
      onDeleteIngredient={async (id) =>
        save({ ingredients: data.ingredients.filter((item) => item.id !== id) })
      }
      onReloadCatalog={async () => undefined}
      onReloadPromotions={async () => undefined}
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
        save({ employees: [...data.employees, next] });
        return next;
      }}
      onUpdateEmployee={async (employee) => {
        const { password: _password, confirmPassword: _confirmation, ...next } = employee;
        void _password;
        void _confirmation;
        save({ employees: data.employees.map((item) => (item.id === next.id ? next : item)) });
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
      onReportSupport={async () => {
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
