import type { AdminCategory, AdminOrder, AdminProduct, AdminSection } from '../types';
import { AdminOverview } from './AdminOverview';
import { AdminOrders } from './AdminOrders';
import { AdminCatalog } from './AdminCatalog';
import { AdminCustomers } from './AdminCustomers';

type Props = {
  area: Exclude<AdminSection, 'settings' | 'employees' | 'subscriptions'>;
  orders: AdminOrder[];
  products: AdminProduct[];
  categories: AdminCategory[];
  onUpdateOrderStatus: (id: number, status: string) => Promise<void>;
  onConfirmOrderPayment: (id: number) => Promise<void>;
  onCancelOrder: (id: number) => Promise<void>;
  onEditProduct: (product: AdminProduct) => void;
  onDeleteProduct: (id: string) => Promise<void>;
  onNewProduct: () => void;
  onCreateCategory: (name: string) => Promise<void>;
  onUpdateCategory: (id: number, name: string) => Promise<void>;
  onDeleteCategory: (id: number) => Promise<void>;
};

export function AdminManagement(props: Props) {
  const money = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  if (props.area === 'overview')
    return <AdminOverview orders={props.orders} products={props.products} money={money} />;
  if (props.area === 'orders')
    return (
      <AdminOrders
        orders={props.orders}
        money={money}
        onConfirmPayment={props.onConfirmOrderPayment}
        onCancelOrder={props.onCancelOrder}
      />
    );
  if (props.area === 'catalog')
    return (
      <AdminCatalog
        products={props.products}
        categories={props.categories}
        money={money}
        onEditProduct={props.onEditProduct}
        onDeleteProduct={props.onDeleteProduct}
        onNewProduct={props.onNewProduct}
        onCreateCategory={props.onCreateCategory}
        onUpdateCategory={props.onUpdateCategory}
        onDeleteCategory={props.onDeleteCategory}
      />
    );
  return <AdminCustomers orders={props.orders} money={money} />;
}
