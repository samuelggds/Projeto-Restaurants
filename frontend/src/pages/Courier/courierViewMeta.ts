import { Bike, History, PackageCheck, type LucideIcon } from 'lucide-react';

export type CourierView = 'overview' | 'ready' | 'route' | 'map' | 'history' | 'profile' | 'help';

export const COURIER_VIEW_TITLES: Record<CourierView, readonly [string, string]> = {
  overview: ['Visão geral', 'Acompanhe seu turno e as próximas entregas'],
  ready: ['Prontos para retirada', 'Assuma um pedido quando ele estiver com você'],
  route: ['Entregas em andamento', 'Pedidos atribuídos a você e em rota'],
  history: ['Histórico', 'Entregas concluídas por você'],
  map: ['Minha rota', 'Acompanhe seu percurso e sua posição atual'],
  profile: ['Meu perfil', 'Dados da sua conta de motoqueiro'],
  help: ['Central de ajuda', 'Manual visual da operação de entrega'],
};

type ListViewMeta = {
  eyebrow: string;
  heading: string;
  description: string;
  count: number;
  countLabel: string;
  tone: 'pickup' | 'route' | 'history';
  icon: LucideIcon;
};

export function getCourierListViewMeta(
  view: 'ready' | 'route' | 'history',
  counts: { ready: number; route: number; history: number },
): ListViewMeta {
  if (view === 'ready') {
    return {
      eyebrow: 'Fila de retirada',
      heading: 'Pedidos liberados pela cozinha',
      description: 'Confira endereço, pagamento e ganho antes de assumir uma entrega.',
      count: counts.ready,
      countLabel: counts.ready === 1 ? 'pedido aguardando' : 'pedidos aguardando',
      tone: 'pickup',
      icon: PackageCheck,
    };
  }

  if (view === 'route') {
    return {
      eyebrow: 'Em deslocamento',
      heading: 'Entregas sob sua responsabilidade',
      description: 'Mantenha o GPS ativo e confirme a entrega somente com o código do cliente.',
      count: counts.route,
      countLabel: counts.route === 1 ? 'entrega ativa' : 'entregas ativas',
      tone: 'route',
      icon: Bike,
    };
  }

  return {
    eyebrow: 'Turno atual',
    heading: 'Entregas finalizadas',
    description: 'Consulte pedidos concluídos e os respectivos estados de pagamento.',
    count: counts.history,
    countLabel: counts.history === 1 ? 'entrega concluída' : 'entregas concluídas',
    tone: 'history',
    icon: History,
  };
}
