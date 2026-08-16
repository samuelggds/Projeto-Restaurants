import type { LucideIcon } from 'lucide-react';
import {
  Bike,
  ChefHat,
  ClipboardList,
  History,
  LayoutGrid,
  MapPinned,
  QrCode,
  ShoppingBag,
} from 'lucide-react';

export type EmployeeHelpRole = 'kitchen' | 'waiter' | 'courier';

export type EmployeeHelpGuide = {
  id: string;
  title: string;
  area: string;
  helper: string;
  action: string;
  icon: LucideIcon;
  steps: string[];
  sidebarItems: string[];
};

const guides: Record<EmployeeHelpRole, EmployeeHelpGuide[]> = {
  kitchen: [
    {
      id: 'overview',
      title: 'Visão geral',
      area: 'Resumo do turno',
      helper: 'Veja os pedidos que exigem atenção na cozinha.',
      action: 'Abrir fila de pedidos',
      icon: LayoutGrid,
      sidebarItems: ['Visão geral', 'Fila de pedidos', 'Prontos', 'Histórico'],
      steps: [
        'No menu lateral, selecione Visão geral.',
        'Confira os totais de pendentes, em preparo e prontos.',
        'Clique em um pedido prioritário para abrir exatamente esse pedido na fila.',
      ],
    },
    {
      id: 'queue',
      title: 'Fila de pedidos',
      area: 'Preparação',
      helper: 'Organize o preparo na ordem correta e mantenha o cliente informado.',
      action: 'Iniciar preparo',
      icon: ChefHat,
      sidebarItems: ['Visão geral', 'Fila de pedidos', 'Prontos', 'Histórico'],
      steps: [
        'Abra Fila de pedidos no menu lateral.',
        'Use a busca e os filtros para localizar o pedido.',
        'Clique em Iniciar preparo e, ao finalizar, marque o pedido como pronto.',
      ],
    },
    {
      id: 'ready',
      title: 'Pedidos prontos',
      area: 'Expedição',
      helper: 'Confira os pedidos finalizados antes da retirada ou entrega.',
      action: 'Ver pedidos prontos',
      icon: ShoppingBag,
      sidebarItems: ['Visão geral', 'Fila de pedidos', 'Prontos', 'Histórico'],
      steps: [
        'Acesse a aba Prontos.',
        'Confirme os itens e o tipo de retirada do pedido.',
        'Aguarde o garçom ou motoqueiro assumir o pedido.',
      ],
    },
    {
      id: 'history',
      title: 'Histórico',
      area: 'Concluídos',
      helper: 'Consulte os pedidos que já saíram da operação da cozinha.',
      action: 'Consultar histórico',
      icon: History,
      sidebarItems: ['Visão geral', 'Fila de pedidos', 'Prontos', 'Histórico'],
      steps: [
        'Abra Histórico.',
        'Pesquise pelo número do pedido quando necessário.',
        'Use a consulta apenas para conferência; os status são atualizados pela operação.',
      ],
    },
  ],
  waiter: [
    {
      id: 'overview',
      title: 'Visão geral',
      area: 'Resumo do salão',
      helper: 'Acompanhe pedidos prontos, mesas e chamados do turno.',
      action: 'Ver entregas',
      icon: LayoutGrid,
      sidebarItems: ['Visão geral', 'Para entregar', 'Mesas e códigos', 'Chamados'],
      steps: [
        'Clique em Visão geral no menu lateral.',
        'Confira os pedidos aguardando entrega nas mesas.',
        'Use os atalhos para seguir para a tarefa pendente.',
      ],
    },
    {
      id: 'deliveries',
      title: 'Para entregar',
      area: 'Entrega na mesa',
      helper: 'Leve os pedidos prontos à mesa correta.',
      action: 'Abrir pedidos prontos',
      icon: ShoppingBag,
      sidebarItems: ['Visão geral', 'Para entregar', 'Mesas e códigos', 'Chamados'],
      steps: [
        'Abra Para entregar.',
        'Confirme mesa, itens e observações antes de sair.',
        'Marque a entrega somente depois de entregar o pedido na mesa.',
      ],
    },
    {
      id: 'tables',
      title: 'Mesas e códigos',
      area: 'Cardápio digital',
      helper: 'Gerencie o acesso dos clientes pelo QR Code da mesa.',
      action: 'Gerenciar mesas',
      icon: QrCode,
      sidebarItems: ['Visão geral', 'Para entregar', 'Mesas e códigos', 'Chamados'],
      steps: [
        'Acesse Mesas e códigos.',
        'Localize a mesa que precisa de atendimento.',
        'Use o QR Code para orientar o cliente a abrir o cardápio digital.',
      ],
    },
    {
      id: 'calls',
      title: 'Chamados',
      area: 'Atendimento',
      helper: 'Responda aos pedidos de ajuda vindos das mesas.',
      action: 'Ver chamados',
      icon: ClipboardList,
      sidebarItems: ['Visão geral', 'Para entregar', 'Mesas e códigos', 'Chamados'],
      steps: [
        'Abra Chamados.',
        'Priorize os chamados mais antigos.',
        'Conclua o chamado depois de atender o cliente.',
      ],
    },
  ],
  courier: [
    {
      id: 'pickup',
      title: 'Para retirar',
      area: 'Coleta do pedido',
      helper: 'Veja os pedidos prontos para retirada no restaurante.',
      action: 'Ver retiradas',
      icon: ShoppingBag,
      sidebarItems: [
        'Visão geral',
        'Para retirar',
        'Em entrega',
        'Minha rota',
        'Histórico',
        'Meu perfil',
      ],
      steps: [
        'Abra Para retirar.',
        'Confira o número do pedido, endereço e forma de pagamento.',
        'Retire o pedido e marque a saída somente quando iniciar a entrega.',
      ],
    },
    {
      id: 'delivery',
      title: 'Em entrega',
      area: 'Pedidos em rota',
      helper: 'Conclua cada entrega usando a confirmação correta.',
      action: 'Ver entregas',
      icon: Bike,
      sidebarItems: [
        'Visão geral',
        'Para retirar',
        'Em entrega',
        'Minha rota',
        'Histórico',
        'Meu perfil',
      ],
      steps: [
        'Acesse Em entrega.',
        'Mantenha a localização ativada enquanto estiver na rota.',
        'Após validar a entrega, marque o pedido como entregue.',
      ],
    },
    {
      id: 'route',
      title: 'Minha rota',
      area: 'Localização',
      helper: 'Compartilhe sua posição para o cliente acompanhar o pedido.',
      action: 'Abrir mapa',
      icon: MapPinned,
      sidebarItems: [
        'Visão geral',
        'Para retirar',
        'Em entrega',
        'Minha rota',
        'Histórico',
        'Meu perfil',
      ],
      steps: [
        'Abra Minha rota.',
        'Toque em Ativar localização e permita o acesso no navegador.',
        'Confirme se o indicador de localização ativa aparece antes de iniciar a rota.',
      ],
    },
    {
      id: 'history',
      title: 'Histórico',
      area: 'Entregas concluídas',
      helper: 'Consulte entregas anteriores do seu turno.',
      action: 'Consultar histórico',
      icon: History,
      sidebarItems: [
        'Visão geral',
        'Para retirar',
        'Em entrega',
        'Minha rota',
        'Histórico',
        'Meu perfil',
      ],
      steps: [
        'Abra Histórico.',
        'Pesquise pelo número do pedido, se necessário.',
        'Use a lista para conferir entregas já concluídas.',
      ],
    },
  ],
};

export function getEmployeeHelpGuides(role: EmployeeHelpRole) {
  return guides[role];
}

export function getEmployeeHelpTitle(role: EmployeeHelpRole) {
  return role === 'kitchen'
    ? 'Manual da cozinha'
    : role === 'waiter'
      ? 'Manual do garçom'
      : 'Manual do motoqueiro';
}
