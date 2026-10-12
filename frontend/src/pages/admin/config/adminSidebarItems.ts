import { CalendarDays, Handshake, Headphones, LayoutGrid, Menu, ReceiptText, Settings2, ShoppingBag, Users, type LucideIcon } from 'lucide-react';
import type { AdminSection } from '../types';

export type AdminNavigationItem = {
  area: AdminSection;
  label: string;
  mobileLabel: string;
  icon: LucideIcon;
};

export const operationNavigationItems: AdminNavigationItem[] = [
  {
    area: 'overview',
    label: 'Visão geral',
    mobileLabel: 'Início',
    icon: LayoutGrid,
  },
  {
    area: 'orders',
    label: 'Pedidos',
    mobileLabel: 'Pedidos',
    icon: ShoppingBag,
  },
  {
    area: 'support',
    label: 'Suporte dos pedidos',
    mobileLabel: 'Suporte',
    icon: Headphones,
  },
  {
    area: 'catalog',
    label: 'Cardápio',
    mobileLabel: 'Cardápio',
    icon: Menu,
  },
  {
    area: 'customers',
    label: 'Clientes',
    mobileLabel: 'Clientes',
    icon: Users,
  },
];

export const managementNavigationItems: AdminNavigationItem[] = [
  { area: 'reservations', label: 'Reservas', mobileLabel: 'Reservas', icon: CalendarDays },
  {
    area: 'employees',
    label: 'Funcionários',
    mobileLabel: 'Equipe',
    icon: Users,
  },
  {
    area: 'subscriptions',
    label: 'Cobranças e assinaturas',
    mobileLabel: 'Cobranças',
    icon: ReceiptText,
  },
  {
    area: 'managed-service',
    label: 'Gestão assistida',
    mobileLabel: 'Assistida',
    icon: Handshake,
  },
  {
    area: 'settings',
    label: 'Configurações',
    mobileLabel: 'Ajustes',
    icon: Settings2,
  },
];

// The mobile bar keeps support visible; Customers is reachable through "Mais".
export const mobilePrimaryNavigationItems = operationNavigationItems.filter(
  (item) => item.area !== 'customers',
);
export const mobileMoreNavigationItems = [
  ...operationNavigationItems.filter((item) => item.area === 'customers'),
  ...managementNavigationItems,
];
