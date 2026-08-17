import type { EmployeeHelpPreview } from './employeeHelpGuides';

export type EmployeeHelpCallout = { label: string; description: string };

const shared = {
  menu: (screen: string): EmployeeHelpCallout => ({
    label: 'Menu lateral',
    description: `Menu lateral — abre ${screen}; confirme que o item destacado corresponde à tela que deseja operar.`,
  }),
  title: (objective: string): EmployeeHelpCallout => ({
    label: 'Título e objetivo',
    description: `Título e objetivo — ${objective}`,
  }),
  action: (label: string, result: string): EmployeeHelpCallout => ({
    label,
    description: `${label} — use somente depois das conferências indicadas e confirme ${result}.`,
  }),
  admin: (reason: string): EmployeeHelpCallout => ({
    label: 'Ajuda do administrador',
    description: `Ajuda do administrador — acione o responsável quando ${reason}.`,
  }),
};

export const employeeHelpCallouts: Record<EmployeeHelpPreview, EmployeeHelpCallout[]> = {
  'kitchen-overview': [
    shared.menu('a Visão geral da cozinha'),
    shared.title('resume a carga do turno e aponta o que exige atenção primeiro.'),
    {
      label: 'Pedidos ativos',
      description: 'Pedidos ativos — mostra todo pedido ainda presente na operação da cozinha.',
    },
    {
      label: 'Pendentes',
      description:
        'Pendentes — confira quantos pedidos ainda não tiveram o preparo iniciado e priorize os mais antigos.',
    },
    {
      label: 'Preparando',
      description:
        'Preparando — mostra o trabalho assumido pela equipe; confira se nenhum pedido ficou parado.',
    },
    {
      label: 'Prontos',
      description:
        'Prontos — indica pedidos finalizados que aguardam retirada pela pessoa correta.',
    },
    {
      label: 'Prioridades',
      description:
        'Prioridade da cozinha — abra o pedido indicado para conferir itens, horário e observações antes de agir.',
    },
    {
      label: 'Canais',
      description:
        'Resumo por canal — compara Mesa, Retirada e Delivery para organizar embalagem e expedição.',
    },
    shared.action('Abrir fila de pedidos', 'que o pedido aparece na coluna correspondente'),
    shared.admin(
      'os totais divergirem da fila, um pedido estiver duplicado ou os indicadores não atualizarem',
    ),
  ],
  'kitchen-queue': [
    shared.menu('a Fila de pedidos'),
    shared.title('organiza o preparo e mantém o status informado ao restante da operação.'),
    {
      label: 'Busca',
      description: 'Busca — localize por pedido ou mesa quando a fila estiver grande.',
    },
    {
      label: 'Filtro de status',
      description: 'Filtro de status — restrinja a fila ao estágio que precisa acompanhar.',
    },
    {
      label: 'Pendente',
      description:
        'Card Pendente — confira horário, itens e observações antes de assumir o preparo.',
    },
    {
      label: 'Preparando',
      description: 'Card Preparando — reúne pedidos já assumidos; evite deixá-los sem avanço.',
    },
    {
      label: 'Pronto',
      description: 'Card Pronto — confira todos os itens antes de liberar para retirada.',
    },
    shared.action('Iniciar preparo', 'que o pedido saiu de Pendente e entrou em Preparando'),
    shared.admin('faltar informação, houver item indisponível ou o status não puder ser alterado'),
  ],
  'kitchen-ready': [
    shared.menu('os pedidos Prontos'),
    shared.title('controla a expedição dos pedidos já finalizados.'),
    {
      label: 'Busca',
      description: 'Busca — localize o pedido pronto pelo número antes da retirada.',
    },
    {
      label: 'Filtro de canal',
      description: 'Filtro de canal — separe Mesa, Retirada ou Delivery para evitar trocas.',
    },
    {
      label: 'Pedidos prontos',
      description:
        'Card Pedidos prontos — confira itens, complementos, embalagem e identificação de quem retirará.',
    },
    shared.action('Ver pedidos prontos', 'que o pedido correto deixou a lista depois da retirada'),
    shared.admin('houver divergência de itens, retirada incorreta ou status parado'),
  ],
  'kitchen-history': [
    shared.menu('o Histórico da cozinha'),
    shared.title('permite consultar pedidos que já saíram do fluxo atual.'),
    {
      label: 'Busca',
      description: 'Busca — informe o número do pedido para encontrar o registro correto.',
    },
    {
      label: 'Período',
      description: 'Filtro de período — delimite quando o pedido foi processado.',
    },
    {
      label: 'Histórico',
      description:
        'Lista do histórico — confira itens, canal, horários e situação final sem refazer a operação.',
    },
    shared.action('Consultar histórico', 'os horários e o status final registrados'),
    shared.admin('o pedido não aparecer ou for necessária correção, reabertura ou estorno'),
  ],
  'waiter-overview': [
    shared.menu('a Visão geral do salão'),
    shared.title('reúne tarefas urgentes do atendimento presencial.'),
    {
      label: 'Pedidos prontos',
      description: 'Métrica Pedidos prontos — priorize os que aguardam há mais tempo.',
    },
    {
      label: 'Mesas ativas',
      description: 'Métrica Mesas ativas — confira quantas mesas estão em atendimento no turno.',
    },
    {
      label: 'Chamados',
      description:
        'Métrica Chamados — indica clientes aguardando ajuda; trate primeiro os mais antigos.',
    },
    {
      label: 'Entregas',
      description: 'Card Pedidos prontos — abre o trabalho de levar o pedido à mesa correta.',
    },
    {
      label: 'Mesas',
      description: 'Card Mesas em atendimento — consulte a situação das mesas e seus códigos.',
    },
    {
      label: 'Salão',
      description: 'Card Chamados do salão — mostra solicitações ainda não concluídas.',
    },
    shared.action('Ver entregas', 'que a tarefa atendida deixou o resumo'),
    shared.admin('os totais estiverem incorretos ou a tarefa permanecer pendente após confirmação'),
  ],
  'waiter-deliveries': [
    shared.menu('Para entregar'),
    shared.title('lista pedidos prontos que precisam chegar à mesa correta.'),
    { label: 'Busca', description: 'Busca — localize o pedido pelo número ou pela mesa.' },
    {
      label: 'Filtro de tipo',
      description: 'Filtro de tipo — mostre apenas o tipo de atendimento necessário.',
    },
    {
      label: 'Pedidos para entrega',
      description:
        'Card Pedidos para entrega — confira mesa, itens, bebidas e observações antes de sair.',
    },
    shared.action(
      'Abrir pedidos prontos',
      'que o pedido saiu da lista somente depois da entrega física',
    ),
    shared.admin('a mesa estiver incorreta, faltar item ou a confirmação não atualizar'),
  ],
  'waiter-tables': [
    shared.menu('Mesas e códigos'),
    shared.title('garante o acesso do cliente ao cardápio da mesa correta.'),
    {
      label: 'Busca',
      description: 'Busca — localize rapidamente a mesa que precisa de atendimento.',
    },
    {
      label: 'Filtro de status',
      description: 'Filtro de status — separe mesas ativas e situações que exigem atenção.',
    },
    {
      label: 'Mesa',
      description: 'Campo Mesa — confira o número físico antes de orientar o cliente.',
    },
    { label: 'Status', description: 'Campo Status — verifique se a mesa está disponível e ativa.' },
    {
      label: 'Código QR',
      description:
        'Campo Código QR — mostre o código e confirme que abriu o cardápio da mesa correta.',
    },
    {
      label: 'Ação',
      description: 'Campo Ação — use o comando disponível apenas na mesa conferida.',
    },
    shared.action('Gerenciar mesas', 'que o código abriu e identificou a mesa correta'),
    shared.admin(
      'o QR Code falhar, apontar outra mesa ou a mesa precisar ser criada ou substituída',
    ),
  ],
  'waiter-calls': [
    shared.menu('Chamados'),
    shared.title('organiza pedidos de ajuda enviados pelas mesas.'),
    { label: 'Busca', description: 'Busca — localize um chamado pelo conteúdo ou número da mesa.' },
    {
      label: 'Chamados do salão',
      description:
        'Card Chamados do salão — confira mesa, horário e motivo e priorize os mais antigos.',
    },
    shared.action('Ver chamados', 'que o chamado saiu da lista somente após atender o cliente'),
    shared.admin('o chamado vier sem mesa, estiver duplicado ou não puder ser concluído'),
  ],
  'courier-overview': [
    shared.menu('a Visão geral do motoqueiro'),
    shared.title('resume tarefas e valores do turno.'),
    {
      label: 'Para retirar',
      description: 'Card Para retirar — mostra pedidos prontos que ainda precisam ser coletados.',
    },
    {
      label: 'Em rota',
      description: 'Card Em rota — indica entregas atualmente sob sua responsabilidade.',
    },
    {
      label: 'Entregues',
      description: 'Card Entregues — confirma quantas tarefas foram finalizadas no turno.',
    },
    { label: 'Hoje', description: 'Card Hoje — confira o valor relacionado às entregas do dia.' },
    { label: 'Semana', description: 'Card Semana — acompanha o acumulado semanal.' },
    { label: 'Mês', description: 'Card Mês — acompanha o acumulado mensal.' },
    {
      label: 'A receber',
      description: 'Card A receber — confira o valor ainda pendente de repasse.',
    },
    {
      label: 'Pedidos aguardando',
      description: 'Seção Pedidos aguardando você — abra a próxima retirada disponível.',
    },
    shared.action('Atualizar painel', 'que tarefas e valores correspondem às entregas registradas'),
    shared.admin('houver pedido ou valor divergente, duplicidade ou ausência de atualização'),
  ],
  'courier-pickup': [
    shared.menu('Para retirar'),
    shared.title('lista pedidos prontos para coleta no restaurante.'),
    { label: 'Busca', description: 'Busca — localize a retirada pelo número do pedido.' },
    {
      label: 'Pedidos para retirar',
      description:
        'Card Pedidos para retirar — confira volumes, cliente, endereço, pagamento e observações.',
    },
    shared.action(
      'Ver retiradas',
      'que o pedido passou para Em entrega somente quando estiver com você',
    ),
    shared.admin(
      'faltar volume, houver divergência de endereço ou pagamento, ou o status não avançar',
    ),
  ],
  'courier-delivery': [
    shared.menu('Em entrega'),
    shared.title('acompanha pedidos sob sua responsabilidade até a confirmação final.'),
    {
      label: 'Busca',
      description: 'Busca — localize a entrega pelo número antes de consultar ou concluir.',
    },
    {
      label: 'Entregas em andamento',
      description:
        'Card Entregas em andamento — confira cliente, endereço, contato, referência e pagamento.',
    },
    shared.action('Ver entregas', 'que o pedido entrou no Histórico depois da entrega física'),
    shared.admin(
      'não localizar cliente ou endereço, houver recusa, problema de pagamento ou falha ao concluir',
    ),
  ],
  'courier-route': [
    shared.menu('Minha rota'),
    shared.title('compartilha sua posição durante uma entrega em andamento.'),
    {
      label: 'Localização ativa',
      description:
        'Status Localização ativa — confirme a permissão e o envio da posição antes de sair.',
    },
    {
      label: 'Mapa da rota',
      description:
        'Mapa da rota — confira se o ponto corresponde à posição atual; não manuseie a tela enquanto dirige.',
    },
    shared.action('Abrir mapa', 'que a posição continua atualizando durante o percurso'),
    shared.admin('a permissão estiver bloqueada, o ponto estiver incorreto ou parar de atualizar'),
  ],
  'courier-history': [
    shared.menu('o Histórico de entregas'),
    shared.title('permite conferir tarefas já concluídas no turno.'),
    { label: 'Busca', description: 'Busca — localize uma entrega pelo número do pedido.' },
    {
      label: 'Período',
      description: 'Filtro de período — escolha o intervalo em que a entrega ocorreu.',
    },
    {
      label: 'Histórico',
      description:
        'Lista Histórico de entregas — confira cliente, destino, horário e situação final.',
    },
    shared.action(
      'Consultar histórico',
      'que uma entrega recém-finalizada aparece com os dados corretos',
    ),
    shared.admin('o registro não aparecer ou houver divergência de horário ou valor'),
  ],
  'courier-profile': [
    shared.menu('Meu perfil'),
    shared.title('mantém seus dados corretos para identificação e contato pela operação.'),
    { label: 'Nome', description: 'Campo Nome — confira sua identificação antes de salvar.' },
    {
      label: 'Telefone',
      description: 'Campo Telefone — mantenha um número válido para contato durante a entrega.',
    },
    { label: 'E-mail', description: 'Campo E-mail — revise o endereço usado na conta.' },
    {
      label: 'Disponibilidade',
      description: 'Campo Disponibilidade — informe sua condição real para receber novas tarefas.',
    },
    shared.action(
      'Salvar alterações',
      'a mensagem de sucesso e a permanência dos novos dados ao reabrir',
    ),
    shared.admin(
      'um campo estiver bloqueado, os dados não forem salvos ou a conta estiver incorreta',
    ),
  ],
};
