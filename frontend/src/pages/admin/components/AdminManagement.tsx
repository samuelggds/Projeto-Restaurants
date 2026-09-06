import { lazy, Suspense } from 'react';
import type {
  AdminCategory,
  AdminIngredient,
  AdminOrder,
  AdminProduct,
  AdminSection,
} from '../types';
import { AdminOverview } from './AdminOverview';
import { AdminOrders } from './AdminOrders';
import { AdminCatalog } from './AdminCatalog';
import { AdminOrderSupportInbox } from './AdminOrderSupportInbox';

const AdminCustomers = lazy(() =>
  import('./AdminCustomers').then((module) => ({ default: module.AdminCustomers })),
);

type Props = {
  area: Exclude<AdminSection, 'settings' | 'employees' | 'subscriptions'>;
  orders: AdminOrder[];
  products: AdminProduct[];
  categories: AdminCategory[];
  ingredients: AdminIngredient[];
  restaurantName: string;
  onNavigate: (area: 'orders' | 'catalog' | 'customers') => void;
  onUpdateOrderStatus: (id: number, status: string) => Promise<void>;
  onConfirmOrderPayment: (id: number) => Promise<void>;
  onCancelOrder: (id: number) => Promise<void>;
  onEditProduct: (product: AdminProduct) => void;
  onDeleteProduct: (id: string) => Promise<void>;
  onNewProduct: () => void;
  onCreateCategory: (name: string) => Promise<void>;
  onUpdateCategory: (id: number, name: string) => Promise<void>;
  onDeleteCategory: (id: number) => Promise<void>;
  onCreateIngredient: (ingredient: Omit<AdminIngredient, 'id'>) => Promise<AdminIngredient | void>;
  onUpdateIngredient: (ingredient: AdminIngredient, imageUpdate?: string | null) => Promise<void>;
  onDeleteIngredient: (id: number) => Promise<void>;
  catalogImportOpen: boolean;
  onCloseCatalogImport: () => void;
  onCatalogImportComplete: () => void | Promise<void>;
};

export function AdminManagement(props: Props) {
  const money = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  if (props.area === 'overview')
    return (
      <AdminOverview
        orders={props.orders}
        products={props.products}
        restaurantName={props.restaurantName}
        money={money}
        onNavigate={props.onNavigate}
      />
    );
  if (props.area === 'orders')
    return (
      <>
        <AdminOrderSupportInbox />
        <AdminOrders
          orders={props.orders}
          restaurantName={props.restaurantName}
          money={money}
          onConfirmPayment={props.onConfirmOrderPayment}
          onCancelOrder={props.onCancelOrder}
        />
      </>
    );
  if (props.area === 'catalog')
    return (
      <AdminCatalog
        products={props.products}
        categories={props.categories}
        ingredients={props.ingredients}
        money={money}
        onEditProduct={props.onEditProduct}
        onDeleteProduct={props.onDeleteProduct}
        onNewProduct={props.onNewProduct}
        onCreateCategory={props.onCreateCategory}
        onUpdateCategory={props.onUpdateCategory}
        onDeleteCategory={props.onDeleteCategory}
        onCreateIngredient={props.onCreateIngredient}
        onUpdateIngredient={props.onUpdateIngredient}
        onDeleteIngredient={props.onDeleteIngredient}
        importOpen={props.catalogImportOpen}
        onCloseImport={props.onCloseCatalogImport}
        onImportComplete={props.onCatalogImportComplete}
      />
    );
  return (
    <Suspense fallback={<p role="status">Carregando clientes...</p>}>
      <AdminCustomers orders={props.orders} money={money} />
    </Suspense>
  );
}
