import {
  Armchair,
  BellRing,
  ClipboardList,
  Headphones,
  LayoutDashboard,
  PackagePlus,
  Truck,
  type LucideIcon,
} from 'lucide-react';
import type { AttendantView } from '../types';

export type DayFilter = 'ALL' | 'TODAY' | 'OLD';
export type OrderFilter = 'ALL' | 'PENDENTE' | 'PREPARANDO' | 'PRONTO' | 'ATRASADO';
export type CallFilter = 'ACTIVE' | 'WAITING' | 'HISTORY';
export type OperationDestination =
  | { view: Exclude<AttendantView, 'orders' | 'calls' | 'tables'> }
  | { view: 'orders'; status?: OrderFilter; day?: DayFilter }
  | { view: 'calls'; mode?: CallFilter; day?: DayFilter }
  | { view: 'tables'; day?: DayFilter };

export const viewMeta: Record<
  AttendantView,
  { label: string; title: string; subtitle: string; icon: LucideIcon }
> = {
  overview: {
    label: 'Visão geral',
    title: 'Central de atendimento',
    subtitle: 'Veja primeiro o que precisa da sua atenção agora.',
    icon: LayoutDashboard,
  },
  orders: {
    label: 'Pedidos',
    title: 'Pedidos em andamento',
    subtitle: 'Pesquise, filtre e acompanhe a fila sem perder pendências antigas.',
    icon: ClipboardList,
  },
  create: {
    label: 'Novo pedido',
    title: 'Registrar novo pedido',
    subtitle: 'Use para pedidos recebidos por telefone, WhatsApp ou balcão.',
    icon: PackagePlus,
  },
  support: {
    label: 'Atendimento',
    title: 'Atendimento ao cliente',
    subtitle: 'Responda dúvidas e problemas sem misturar suporte com cozinha.',
    icon: Headphones,
  },
  deliveries: {
    label: 'Entregas',
    title: 'Acompanhar deliveries',
    subtitle: 'Acompanhe a situação sem assumir etapas do motoqueiro.',
    icon: Truck,
  },
  tables: {
    label: 'Mesas',
    title: 'Mesas em operação',
    subtitle: 'Veja rapidamente mesas com pedidos, chamados ou conta solicitada.',
    icon: Armchair,
  },
  calls: {
    label: 'Chamados',
    title: 'Chamados do salão',
    subtitle: 'Assuma uma solicitação para a equipe saber quem está cuidando dela.',
    icon: BellRing,
  },
};
