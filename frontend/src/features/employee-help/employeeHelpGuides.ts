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

export type EmployeeHelpPreview =
  | 'kitchen-overview'
  | 'kitchen-queue'
  | 'kitchen-ready'
  | 'kitchen-history'
  | 'waiter-overview'
  | 'waiter-deliveries'
  | 'waiter-tables'
  | 'waiter-calls'
  | 'courier-overview'
  | 'courier-pickup'
  | 'courier-delivery'
  | 'courier-route'
  | 'courier-history'
  | 'courier-profile';

export type EmployeeHelpGuide = {
  id: string;
  title: string;
  area: string;
  helper: string;
  action: string;
  icon: LucideIcon;
  steps: string[];
  sidebarItems: string[];
  preview: EmployeeHelpPreview;
  sidebarActiveItem?: string;
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
      preview: 'kitchen-overview',
      sidebarItems: ['Visão geral', 'Fila de pedidos', 'Prontos', 'Histórico'],
      steps: [
        'Objetivo: use a Visão geral para entender rapidamente a carga de trabalho e identificar pedidos que precisam de atenção.',
        'No menu lateral, selecione Visão geral e confira se os indicadores do turno foram carregados.',
        'Compare os totais de pedidos pendentes, em preparo e prontos; uma fila antiga ou acumulada deve ser priorizada.',
        'Abra um pedido prioritário para consultar itens, quantidade, canal de venda e observações antes de iniciar o preparo.',
        'Depois de agir, volte ao resumo e confirme se o pedido avançou de coluna e se os totais foram atualizados.',
        'Acione o administrador se os números não atualizarem, um pedido aparecer duplicado ou houver divergência entre o resumo e a fila.',
      ],
    },
    {
      id: 'queue',
      title: 'Fila de pedidos',
      area: 'Preparação',
      helper: 'Organize o preparo na ordem correta e mantenha o cliente informado.',
      action: 'Iniciar preparo',
      icon: ChefHat,
      preview: 'kitchen-queue',
      sidebarItems: ['Visão geral', 'Fila de pedidos', 'Prontos', 'Histórico'],
      steps: [
        'Objetivo: organize a produção na ordem correta e mantenha o status do pedido compatível com o trabalho da cozinha.',
        'Abra Fila de pedidos e use a busca ou os filtros para localizar um número, mesa, canal ou status específico.',
        'Antes de começar, confira itens, quantidades, adicionais, observações do cliente e horário de entrada.',
        'Clique em Iniciar preparo somente quando a equipe realmente assumir o pedido, evitando alterar vários pedidos antecipadamente.',
        'Ao terminar e conferir todos os itens, marque como pronto e confirme que o pedido saiu de Preparando e apareceu em Prontos.',
        'Acione o administrador se faltar informação, o status não puder ser alterado, o pedido estiver duplicado ou houver item indisponível sem orientação.',
      ],
    },
    {
      id: 'ready',
      title: 'Pedidos prontos',
      area: 'Expedição',
      helper: 'Confira os pedidos finalizados antes da retirada ou entrega.',
      action: 'Ver pedidos prontos',
      icon: ShoppingBag,
      preview: 'kitchen-ready',
      sidebarActiveItem: 'Prontos',
      sidebarItems: ['Visão geral', 'Fila de pedidos', 'Prontos', 'Histórico'],
      steps: [
        'Objetivo: manter os pedidos finalizados organizados até a retirada correta, sem trocar embalagens, mesas ou entregadores.',
        'Acesse Prontos e localize o pedido pelo número, mesa ou canal de atendimento.',
        'Confira todos os itens, complementos, bebidas, embalagem, observações e o tipo de retirada antes de liberar.',
        'Deixe o pedido identificado e aguarde o garçom, cliente ou motoqueiro correto assumir a retirada.',
        'Confirme que o pedido desapareceu da lista de prontos ou mudou para o próximo status depois da retirada registrada.',
        'Acione o administrador se ninguém puder assumir o pedido, houver divergência nos itens ou o status permanecer parado após a retirada.',
      ],
    },
    {
      id: 'history',
      title: 'Histórico',
      area: 'Concluídos',
      helper: 'Consulte os pedidos que já saíram da operação da cozinha.',
      action: 'Consultar histórico',
      icon: History,
      preview: 'kitchen-history',
      sidebarItems: ['Visão geral', 'Fila de pedidos', 'Prontos', 'Histórico'],
      steps: [
        'Objetivo: consultar pedidos que já deixaram a operação da cozinha e esclarecer dúvidas do turno sem alterar o fluxo atual.',
        'Abra Histórico e escolha o período adequado antes de pesquisar.',
        'Busque pelo número do pedido e confira horário, itens, canal e sequência de status para localizar o registro correto.',
        'Compare o histórico com a dúvida apresentada pelo salão, cliente ou entrega; não refaça um pedido sem autorização.',
        'Confirme o resultado pela situação final e pelos horários registrados na linha do pedido.',
        'Acione o administrador quando um pedido não aparecer, os dados estiverem divergentes ou for necessária correção, estorno ou reabertura.',
      ],
    },
  ],
  waiter: [
    {
      id: 'overview',
      title: 'Visão geral',
      area: 'Resumo do salão',
      helper: 'Acompanhe pedidos prontos, mesas abertas e chamados do turno.',
      action: 'Ver entregas',
      icon: LayoutGrid,
      preview: 'waiter-overview',
      sidebarItems: ['Visão geral', 'Para entregar', 'Mesas e QR Codes', 'Chamados'],
      steps: [
        'Objetivo: acompanhar em um só lugar pedidos prontos, mesas abertas pelo garçom e chamados pendentes do salão.',
        'Clique em Visão geral e confira se os indicadores do turno e os três blocos de atividade foram carregados.',
        'Priorize pedidos prontos há mais tempo e chamados antigos, verificando sempre o número da mesa antes de agir.',
        'Use o atalho do bloco correspondente para abrir a tarefa e consultar seus detalhes.',
        'Após atender, retorne ao resumo e confirme que o total diminuiu ou que o item deixou de aparecer como pendente.',
        'Acione o administrador se os totais estiverem incorretos, uma mesa não aparecer ou a tarefa continuar pendente depois da confirmação.',
      ],
    },
    {
      id: 'deliveries',
      title: 'Para entregar',
      area: 'Entrega na mesa',
      helper: 'Leve os pedidos prontos à mesa correta.',
      action: 'Abrir pedidos prontos',
      icon: ShoppingBag,
      preview: 'waiter-deliveries',
      sidebarItems: ['Visão geral', 'Para entregar', 'Mesas e QR Codes', 'Chamados'],
      steps: [
        'Objetivo: retirar o pedido correto na expedição e entregá-lo à mesa certa com todos os itens e observações atendidos.',
        'Abra Para entregar e localize o pedido pelo número ou pela mesa, priorizando os que aguardam há mais tempo.',
        'Antes de sair, confira mesa, itens, bebidas, complementos e observações junto à identificação do pedido.',
        'Entregue na mesa informada e valide com o cliente se o pedido pertence à comanda correta.',
        'Marque como entregue somente depois da entrega física e confirme que o pedido saiu da lista pendente.',
        'Acione o administrador se a mesa estiver incorreta, faltar item, houver pedido duplicado ou a confirmação não atualizar o painel.',
      ],
    },
    {
      id: 'tables',
      title: 'Mesas e QR Codes',
      area: 'Controle de mesas',
      helper: 'Abra e feche mesas; cada QR Code fixo é administrado pelo restaurante.',
      action: 'Gerenciar mesas',
      icon: QrCode,
      preview: 'waiter-tables',
      sidebarItems: ['Visão geral', 'Para entregar', 'Mesas e QR Codes', 'Chamados'],
      steps: [
        'Objetivo: controlar o atendimento das mesas cadastradas pelo administrador; cada mesa já possui seu próprio QR Code fixo vinculado ao número correto.',
        'Acesse Mesas e QR Codes, use a busca ou o filtro e confira o número físico e o status antes de qualquer ação.',
        'Quando os clientes se sentarem, selecione Abrir mesa na identificação correspondente; somente a mesa aberta poderá receber novos pedidos pelo QR Code.',
        'Oriente o cliente a escanear o QR Code físico daquela mesa e confirmar o número mostrado no cardápio; o garçom não gera, visualiza, imprime nem substitui códigos.',
        'Depois que os clientes terminarem, confirme que o pagamento foi concluído, que não existem pedidos ativos e que a mesa está vazia; então selecione Fechar mesa e confira o status Livre.',
        'Acione o administrador se a mesa não estiver cadastrada, o QR Code estiver ilegível ou abrir outra mesa, ou se for necessário criar, imprimir, substituir ou corrigir o vínculo do código.',
      ],
    },
    {
      id: 'calls',
      title: 'Chamados',
      area: 'Atendimento',
      helper: 'Responda aos pedidos de ajuda vindos das mesas.',
      action: 'Ver chamados',
      icon: ClipboardList,
      preview: 'waiter-calls',
      sidebarItems: ['Visão geral', 'Para entregar', 'Mesas e QR Codes', 'Chamados'],
      steps: [
        'Objetivo: responder aos pedidos de ajuda do salão com rapidez e impedir que um chamado atendido permaneça pendente.',
        'Abra Chamados, confira mesa, horário e motivo e priorize os registros mais antigos ou urgentes.',
        'Vá à mesa correta, confirme com o cliente o que ele precisa e resolva a solicitação antes de alterar o status.',
        'Se depender de outra área, avise o cliente e encaminhe a demanda mantendo o acompanhamento.',
        'Conclua o chamado somente após o atendimento e confirme que ele saiu da lista de pendentes.',
        'Acione o administrador se o chamado estiver duplicado, vier sem mesa, não puder ser concluído ou envolver cancelamento, cobrança ou falha do sistema.',
      ],
    },
  ],
  courier: [
    {
      id: 'overview',
      title: 'Visão geral',
      area: 'Resumo do turno',
      helper: 'Acompanhe retiradas, entregas e seus ganhos em um só lugar.',
      action: 'Atualizar painel',
      icon: LayoutGrid,
      preview: 'courier-overview',
      sidebarItems: [
        'Visão geral',
        'Para retirar',
        'Em entrega',
        'Minha rota',
        'Histórico',
        'Meu perfil',
      ],
      steps: [
        'Objetivo: acompanhar as tarefas e os ganhos do turno, identificando rapidamente a próxima retirada ou entrega.',
        'Abra Visão geral e confira se os totais de pedidos para retirar, em rota e entregues foram carregados.',
        'Revise o resumo financeiro e lembre que os valores dependem das entregas corretamente concluídas no sistema.',
        'Use os atalhos para abrir a próxima tarefa, priorizando pedidos já prontos e rotas em andamento.',
        'Depois de atualizar uma entrega, volte ao painel e confirme a mudança nos totais e no resumo correspondente.',
        'Acione o administrador se houver pedido ou valor divergente, tarefa duplicada ou painel sem atualização após recarregar.',
      ],
    },
    {
      id: 'pickup',
      title: 'Para retirar',
      area: 'Coleta do pedido',
      helper: 'Veja os pedidos prontos para retirada no restaurante.',
      action: 'Ver retiradas',
      icon: ShoppingBag,
      preview: 'courier-pickup',
      sidebarItems: [
        'Visão geral',
        'Para retirar',
        'Em entrega',
        'Minha rota',
        'Histórico',
        'Meu perfil',
      ],
      steps: [
        'Objetivo: retirar no restaurante o pedido correto, completo e pronto para seguir ao endereço do cliente.',
        'Abra Para retirar e localize a tarefa pelo número do pedido, observando há quanto tempo ela está disponível.',
        'Confira número, volumes, nome do cliente, endereço, observações e forma de pagamento antes de aceitar a saída.',
        'Valide a identificação com a equipe do restaurante e acomode o pedido com segurança antes de iniciar a rota.',
        'Marque a retirada somente quando estiver com o pedido e confirme que ele passou de Para retirar para Em entrega.',
        'Acione o administrador se faltar volume, o endereço ou pagamento estiver divergente, outra pessoa tiver retirado ou o status não avançar.',
      ],
    },
    {
      id: 'delivery',
      title: 'Em entrega',
      area: 'Pedidos em rota',
      helper: 'Conclua cada entrega usando a confirmação correta.',
      action: 'Ver entregas',
      icon: Bike,
      preview: 'courier-delivery',
      sidebarItems: [
        'Visão geral',
        'Para retirar',
        'Em entrega',
        'Minha rota',
        'Histórico',
        'Meu perfil',
      ],
      steps: [
        'Objetivo: acompanhar os pedidos que estão sob sua responsabilidade até a entrega confirmada ao destinatário correto.',
        'Acesse Em entrega e confira cliente, endereço, referência, contato, pagamento e observações antes de seguir.',
        'Mantenha a localização ativada e use Minha rota para acompanhar o deslocamento sem manusear o celular enquanto dirige.',
        'Ao chegar, confirme o destinatário e, quando aplicável, receba ou valide o pagamento antes de finalizar.',
        'Marque como entregue somente após a entrega física e confirme que o pedido saiu da lista e entrou no Histórico.',
        'Acione o administrador se não localizar o endereço ou cliente, houver problema de pagamento, recusa, acidente ou impossibilidade de concluir o status.',
      ],
    },
    {
      id: 'route',
      title: 'Minha rota',
      area: 'Localização',
      helper: 'Compartilhe sua posição para o cliente acompanhar o pedido.',
      action: 'Abrir mapa',
      icon: MapPinned,
      preview: 'courier-route',
      sidebarItems: [
        'Visão geral',
        'Para retirar',
        'Em entrega',
        'Minha rota',
        'Histórico',
        'Meu perfil',
      ],
      steps: [
        'Objetivo: compartilhar sua posição durante a entrega para apoiar a navegação e permitir o acompanhamento operacional.',
        'Abra Minha rota, toque em Ativar localização e permita o acesso solicitado pelo navegador ou dispositivo.',
        'Confira se o mapa encontrou sua posição e se o indicador Localização ativa aparece antes de iniciar o deslocamento.',
        'Mantenha a página e a localização disponíveis durante a rota; use um suporte adequado e não opere a tela enquanto dirige.',
        'Confirme periodicamente que o ponto continua atualizando e encerre o compartilhamento quando não houver entrega em andamento.',
        'Acione o administrador se a permissão estiver bloqueada, o ponto não atualizar, a rota mostrar local incorreto ou o compartilhamento cair repetidamente.',
      ],
    },
    {
      id: 'history',
      title: 'Histórico',
      area: 'Entregas concluídas',
      helper: 'Consulte entregas anteriores do seu turno.',
      action: 'Consultar histórico',
      icon: History,
      preview: 'courier-history',
      sidebarItems: [
        'Visão geral',
        'Para retirar',
        'Em entrega',
        'Minha rota',
        'Histórico',
        'Meu perfil',
      ],
      steps: [
        'Objetivo: consultar entregas finalizadas e conferir horários, pedidos e registros do seu turno.',
        'Abra Histórico, selecione o período correto e pesquise pelo número do pedido quando precisar localizar uma entrega.',
        'Confira cliente, destino, horário e situação final para garantir que está consultando o registro correto.',
        'Use os dados para esclarecer dúvidas operacionais; não repita uma entrega ou cobrança com base apenas na consulta.',
        'Confirme que uma entrega recém-finalizada aparece na lista após atualizar a tela.',
        'Acione o administrador se o pedido não aparecer, houver divergência de horário ou valor, ou for necessária correção do registro.',
      ],
    },
    {
      id: 'profile',
      title: 'Meu perfil',
      area: 'Dados do motoqueiro',
      helper: 'Mantenha seus dados de contato atualizados para a operação.',
      action: 'Salvar alterações',
      icon: ClipboardList,
      preview: 'courier-profile',
      sidebarItems: [
        'Visão geral',
        'Para retirar',
        'Em entrega',
        'Minha rota',
        'Histórico',
        'Meu perfil',
      ],
      steps: [
        'Objetivo: manter seus dados de contato e disponibilidade corretos para que a operação consiga identificar e acionar você.',
        'Abra Meu perfil e revise nome, telefone, e-mail e situação de disponibilidade antes de iniciar o turno.',
        'Corrija apenas os dados que pertencem a você e confira com atenção telefone e e-mail antes de salvar.',
        'Atualize a disponibilidade conforme sua condição real para não receber tarefas quando estiver fora da operação.',
        'Clique em Salvar alterações, aguarde a confirmação e reabra a tela para verificar se os novos dados permaneceram.',
        'Acione o administrador se algum campo estiver bloqueado, os dados não forem salvos, sua conta estiver incorreta ou você não conseguir alterar a disponibilidade.',
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
