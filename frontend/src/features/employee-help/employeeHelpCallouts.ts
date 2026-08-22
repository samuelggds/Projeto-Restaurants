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
      label: 'Canal do pedido',
      description:
        'Tabs Mesa, Retirada e Delivery — escolha o canal para mostrar apenas os pedidos daquele tipo.',
    },
    {
      label: 'Filtro de status',
      description:
        'Filtro Todos os status — restrinja a fila a Pendente, Preparando ou Pronto quando precisar acompanhar um estágio.',
    },
    {
      label: 'Atualização ao vivo',
      description:
        'Atualização em tempo real — informa que novos pedidos e mudanças de status aparecem automaticamente no painel.',
    },
    {
      label: 'Métrica Pendentes',
      description:
        'Métrica Pendentes — mostra a quantidade aguardando início do preparo; use para definir prioridade.',
    },
    {
      label: 'Métrica Preparando',
      description:
        'Métrica Preparando — mostra os pedidos que a cozinha já assumiu e que precisam avançar.',
    },
    {
      label: 'Métrica Prontos',
      description: 'Métrica Prontos — mostra pedidos finalizados e aguardando retirada ou entrega.',
    },
    {
      label: 'Métrica Tempo médio',
      description:
        'Métrica Tempo médio — acompanha o tempo de preparo do turno; no molde, o traço indica ausência de dados reais.',
    },
    {
      label: 'Coluna PENDENTE',
      description:
        'Coluna PENDENTE — os pedidos entram aqui antes do preparo; confira itens e observações antes de iniciar.',
    },
    {
      label: 'Coluna PREPARANDO',
      description:
        'Coluna PREPARANDO — acompanha pedidos em produção; mantenha o status atualizado conforme o trabalho avança.',
    },
    {
      label: 'Coluna PRONTO',
      description:
        'Coluna PRONTO — reúne pedidos concluídos; confira todos os itens antes de liberar para retirada.',
    },
    shared.admin('faltar informação, houver item indisponível ou o status não puder ser alterado'),
  ],
  'kitchen-ready': [
    shared.menu('os pedidos Prontos'),
    shared.title('controla a expedição dos pedidos já finalizados.'),
    {
      label: 'Canal do pedido',
      description:
        'Tabs Mesa, Retirada e Delivery — escolha o canal para conferir apenas os pedidos prontos daquele fluxo.',
    },
    {
      label: 'Atualização ao vivo',
      description:
        'Atualização em tempo real — informa que novos pedidos prontos e retiradas aparecem automaticamente.',
    },
    {
      label: 'Métrica Prontos',
      description:
        'Métrica Prontos — mostra quantos pedidos finalizados aguardam retirada no canal selecionado; o traço no molde não representa dado real.',
    },
    {
      label: 'Métrica Maior espera',
      description:
        'Métrica Maior espera — mostra há quanto tempo o pedido pronto mais antigo aguarda; o traço no molde indica ausência de dados reais.',
    },
    {
      label: 'Aguardando retirada',
      description:
        'Seção Aguardando retirada — confira itens, complementos e o canal antes de entregar; esta tela não altera o status do pedido.',
    },
    {
      label: 'Estado vazio',
      description:
        'Estado vazio — confirma que não há pedido pronto no canal escolhido; aguarde a atualização ao vivo ou selecione outro canal.',
    },
    {
      label: 'Confirmação',
      description:
        'Ícone de confirmação — identifica a área de expedição como etapa concluída pela cozinha, pronta para retirada.',
    },
    shared.admin(
      'houver divergência de itens, retirada incorreta ou um status pronto que não atualizar',
    ),
  ],
  'kitchen-history': [
    shared.menu('o Histórico da cozinha'),
    shared.title('permite consultar pedidos que já saíram do fluxo atual.'),
    {
      label: 'Canal do pedido',
      description:
        'Tabs Mesa, Retirada e Delivery — escolha o canal antes de consultar os pedidos finalizados ou cancelados.',
    },
    {
      label: 'Busca no histórico',
      description:
        'Campo Buscar no histórico — informe o número do pedido para localizar o registro correto no canal selecionado.',
    },
    {
      label: 'Métrica Concluídos hoje',
      description:
        'Métrica Concluídos hoje — mostra o total entregue no canal durante o turno; o traço do molde não representa dado real.',
    },
    {
      label: 'Métrica Cancelados',
      description:
        'Métrica Cancelados — mostra pedidos cancelados no canal; o traço é apenas um placeholder ilustrativo.',
    },
    {
      label: 'Métrica Tempo médio',
      description:
        'Métrica Tempo médio — acompanha a duração média do fluxo; o traço indica que este é um molde sem dados reais.',
    },
    {
      label: 'Histórico do turno',
      description:
        'Seção Histórico do turno — reúne somente pedidos finalizados e cancelados para conferência, sem alterar o fluxo atual.',
    },
    {
      label: 'Cabeçalho da tabela',
      description:
        'Cabeçalhos Pedido, Canal, Horário, Status e Total — definem quais dados devem ser conferidos em cada registro listado.',
    },
    {
      label: 'Estado vazio',
      description:
        'Estado vazio — confirma que nenhum pedido foi encontrado para o canal ou busca selecionados.',
    },
    {
      label: 'Ícone do histórico',
      description:
        'Ícone de histórico — identifica visualmente a área de consulta de registros concluídos.',
    },
    shared.admin(
      'o pedido não aparecer, os dados estiverem divergentes ou for necessária correção, reabertura ou estorno',
    ),
  ],
  'waiter-overview': [
    shared.menu('a Visão geral do salão'),
    shared.title('reúne tarefas urgentes do atendimento presencial.'),
    {
      label: 'Métrica Prontos para entregar',
      description:
        'Métrica Prontos para entregar — mostra quantos pedidos finalizados pela cozinha precisam ser levados às mesas; o traço no molde não é dado real.',
    },
    {
      label: 'Métrica Chamados aguardando',
      description:
        'Métrica Chamados aguardando — indica clientes que solicitaram atendimento; priorize o chamado mais antigo.',
    },
    {
      label: 'Métrica Mesas ocupadas',
      description:
        'Métrica Mesas ocupadas — mostra quantas mesas estão em atendimento no turno; o traço é apenas ilustrativo.',
    },
    {
      label: 'Painel Prontos para entregar',
      description:
        'Painel Prontos para entregar — reúne pedidos liberados pela cozinha; confira mesa e itens antes de sair para o salão.',
    },
    {
      label: 'Estado vazio de pedidos',
      description:
        'Estado vazio de pedidos — confirma que não há pedido pronto; aguarde a atualização da cozinha.',
    },
    {
      label: 'Painel Chamados do salão',
      description:
        'Painel Chamados do salão — mostra solicitações dos clientes; atenda primeiro a mais antiga quando houver itens.',
    },
    {
      label: 'Estado vazio de chamados',
      description:
        'Estado vazio de chamados — confirma que nenhum cliente aguarda atendimento no momento.',
    },
    {
      label: 'Painel Códigos solicitados',
      description:
        'Painel Códigos solicitados — concentra pedidos de código depois que o cliente escaneia o QR da mesa.',
    },
    {
      label: 'Estado vazio de códigos',
      description:
        'Estado vazio de códigos — confirma que não há código para informar ou copiar no momento.',
    },
    shared.admin(
      'os totais estiverem incorretos ou uma tarefa permanecer pendente após confirmação',
    ),
  ],
  'waiter-deliveries': [
    shared.menu('Para entregar'),
    shared.title('lista pedidos prontos que precisam chegar à mesa correta.'),
    {
      label: 'Busca',
      description:
        'Campo Buscar número da mesa ou pedido — localize rapidamente a entrega que precisa levar ao salão.',
    },
    {
      label: 'Filtro de mesas',
      description:
        'Seletor Todas as mesas — escolha uma mesa para mostrar somente os pedidos prontos daquele atendimento.',
    },
    {
      label: 'Atualização ao vivo',
      description:
        'Atualização em tempo real — informa que pedidos liberados pela cozinha aparecem automaticamente.',
    },
    {
      label: 'Métrica Prontos para entregar',
      description:
        'Métrica Prontos para entregar — mostra quantos pedidos aguardam entrega; o traço é um placeholder do molde.',
    },
    {
      label: 'Métrica Maior espera',
      description:
        'Métrica Maior espera — mostra o tempo do pedido pronto mais antigo; o traço não é dado real.',
    },
    {
      label: 'Métrica Mesas ocupadas',
      description:
        'Métrica Mesas ocupadas — acompanha mesas em atendimento; o traço é apenas ilustrativo.',
    },
    {
      label: 'Painel Prontos para entregar',
      description:
        'Painel Prontos para entregar — permite conferir pedidos liberados pela cozinha, em modo somente leitura.',
    },
    {
      label: 'Estado vazio',
      description:
        'Estado vazio — confirma que nenhum pedido pronto corresponde aos filtros selecionados.',
    },
    shared.admin(
      'a mesa estiver incorreta, faltar item ou a atualização não refletir a situação da cozinha',
    ),
  ],
  'waiter-tables': [
    shared.menu('Mesas e códigos'),
    shared.title('garante o acesso do cliente ao cardápio da mesa correta.'),
    {
      label: 'Busca',
      description:
        'Campo Buscar número da mesa — localize rapidamente a mesa que precisa de atendimento.',
    },
    {
      label: 'Filtro de status',
      description:
        'Seletor Todos os status — separe mesas livres, ocupadas ou aguardando código conforme a necessidade.',
    },
    {
      label: 'Imprimir QR Codes',
      description:
        'Botão Imprimir QR Codes — use para gerar os códigos físicos das mesas quando a operação precisar repor ou distribuir identificações.',
    },
    {
      label: 'Métrica Mesas',
      description:
        'Métrica Mesas — mostra o total de mesas cadastradas; o traço no molde não representa dado real.',
    },
    {
      label: 'Métrica Ocupadas',
      description: 'Métrica Ocupadas — mostra mesas em atendimento; o traço é apenas ilustrativo.',
    },
    {
      label: 'Métrica Livres',
      description:
        'Métrica Livres — mostra mesas disponíveis para receber clientes; o traço é um placeholder.',
    },
    {
      label: 'Métrica Aguardando código',
      description:
        'Métrica Aguardando código — mostra mesas cujo cliente solicitou acesso; o traço não é dado real.',
    },
    {
      label: 'Painel Mesas e QR Codes',
      description:
        'Painel Mesas e QR Codes — exibe os resultados da busca, com situação da mesa e ações de acesso quando existirem.',
    },
    {
      label: 'Estado vazio',
      description: 'Estado vazio — confirma que nenhuma mesa corresponde aos filtros selecionados.',
    },
    shared.admin(
      'o QR Code falhar, apontar outra mesa ou a mesa precisar ser criada ou substituída',
    ),
  ],
  'waiter-calls': [
    shared.menu('Chamados'),
    shared.title('organiza pedidos de ajuda enviados pelas mesas.'),
    {
      label: 'Busca',
      description:
        'Campo Buscar mesa — localize chamados pelo número da mesa que precisa de atendimento.',
    },
    {
      label: 'Filtro de status',
      description:
        'Seletor Todos os status — escolha Aguardando, Em atendimento ou Concluídos para concentrar o acompanhamento.',
    },
    {
      label: 'Atualização ao vivo',
      description:
        'Atualização em tempo real — informa que novos chamados e mudanças de situação chegam automaticamente.',
    },
    {
      label: 'Métrica Aguardando',
      description:
        'Métrica Aguardando — mostra quantos clientes ainda precisam de atendimento; o traço do molde não é dado real.',
    },
    {
      label: 'Métrica Em atendimento',
      description:
        'Métrica Em atendimento — mostra chamados já assumidos por garçons; o traço é apenas ilustrativo.',
    },
    {
      label: 'Métrica Tempo médio',
      description:
        'Métrica Tempo médio — acompanha o tempo de resposta; o traço indica que este é um mock sem dados reais.',
    },
    {
      label: 'Métrica Atendidos hoje',
      description:
        'Métrica Atendidos hoje — mostra chamados resolvidos no turno; o traço é um placeholder.',
    },
    {
      label: 'Painel Aguardando atendimento',
      description:
        'Painel Aguardando atendimento — ordena os chamados pelo maior tempo de espera para orientar a prioridade.',
    },
    {
      label: 'Estado vazio aguardando',
      description:
        'Estado vazio aguardando — confirma que não há cliente aguardando atendimento no momento.',
    },
    {
      label: 'Painel Em atendimento',
      description:
        'Painel Em atendimento — acompanha chamados que já foram assumidos pelos garçons.',
    },
    {
      label: 'Estado vazio em atendimento',
      description:
        'Estado vazio em atendimento — confirma que nenhum chamado está em atendimento agora.',
    },
    shared.admin('o chamado vier sem mesa, estiver duplicado ou não puder ser concluído'),
  ],
  'courier-overview': [
    shared.menu('a Visão geral do motoqueiro'),
    shared.title('resume tarefas e valores do turno.'),
    {
      label: 'Localização para o cliente',
      description:
        'Aviso de localização — ative o compartilhamento somente quando estiver em uma entrega para o cliente acompanhar o percurso.',
    },
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
    {
      label: 'Localização para o cliente',
      description:
        'Aviso de localização — ative somente durante uma entrega para permitir o acompanhamento.',
    },
    { label: 'Busca', description: 'Busca — localize a retirada pelo número do pedido.' },
    shared.action('Atualizar', 'que a lista de pedidos prontos está atualizada'),
    {
      label: 'Pedido e status',
      description:
        'Pedido e status — confirme que o pedido está pronto para retirada antes de assumir a coleta.',
    },
    {
      label: 'Cliente',
      description: 'Cliente — confira o nome associado ao pedido antes de sair.',
    },
    {
      label: 'Pagamento',
      description: 'Pagamento — verifique a forma e a situação de cobrança indicada.',
    },
    {
      label: 'Endereço',
      description: 'Endereço — confira o destino e a referência antes de iniciar a rota.',
    },
    {
      label: 'Orientação de retirada',
      description:
        'Orientação — só confirme a retirada quando o pedido estiver fisicamente com você.',
    },
    shared.action(
      'Retirar e iniciar entrega',
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
      label: 'Localização para o cliente',
      description:
        'Aviso de localização — mantenha o compartilhamento ativo durante a rota quando autorizado.',
    },
    {
      label: 'Busca',
      description: 'Busca — localize a entrega pelo número antes de consultar ou concluir.',
    },
    {
      label: 'Atualizar',
      description: 'Atualizar — recarrega as entregas atribuídas a você.',
    },
    {
      label: 'Pedido em rota',
      description:
        'Pedido em rota — confira o status e o valor ilustrativo da entrega antes de concluir.',
    },
    {
      label: 'Cliente e pagamento',
      description: 'Cliente e pagamento — confira o contato e a cobrança indicada.',
    },
    {
      label: 'Endereço',
      description: 'Endereço — confira o destino antes de finalizar a entrega.',
    },
    {
      label: 'Confirmação do cliente',
      description:
        'Confirmação — solicite os 4 últimos dígitos do celular somente ao concluir a entrega presencialmente.',
    },
    shared.action('Marcar como Entregue', 'que o pedido entrou no Histórico depois da confirmação'),
    shared.admin(
      'não localizar cliente ou endereço, houver recusa, problema de pagamento ou falha ao concluir',
    ),
  ],
  'courier-route': [
    shared.menu('Minha rota'),
    shared.title('compartilha sua posição durante uma entrega em andamento.'),
    {
      label: 'Localização necessária',
      description:
        'Aviso Localização necessária durante a rota — confirma que o compartilhamento precisa ser ativado para o cliente acompanhar a entrega.',
    },
    {
      label: 'Ativar localização',
      description:
        'Botão Ativar localização — peça a permissão do aparelho antes de iniciar a rota; não use a tela enquanto estiver dirigindo.',
    },
    {
      label: 'Estado sem rota ativa',
      description:
        'Estado sem rota ativa — o mapa e os detalhes da rota aparecerão quando uma entrega for iniciada.',
    },
    shared.admin('a permissão estiver bloqueada ou a localização parar de atualizar'),
  ],
  'courier-history': [
    shared.menu('o Histórico de entregas'),
    shared.title('permite conferir tarefas já concluídas no turno.'),
    {
      label: 'Localização para o cliente',
      description:
        'Aviso de localização — informa que o compartilhamento é usado durante entregas ativas.',
    },
    { label: 'Busca', description: 'Busca — localize uma entrega pelo número do pedido.' },
    {
      label: 'Atualizar',
      description: 'Atualizar — recarrega o histórico exibido.',
    },
    {
      label: 'Cartão de entrega concluída',
      description:
        'Cartão de entrega concluída — confira pedido, status, cliente, cobrança e destino registrados.',
    },
    {
      label: 'Status entregue',
      description:
        'Status entregue — confirma que a entrega foi concluída e permanece somente para consulta.',
    },
    {
      label: 'Pagamento',
      description: 'Pagamento — confira a forma e a confirmação exibida no histórico.',
    },
    {
      label: 'Endereço',
      description: 'Endereço — permite conferir o destino registrado para a entrega concluída.',
    },
    shared.admin('o registro não aparecer ou houver divergência de horário ou valor'),
  ],
  'courier-profile': [
    shared.menu('Meu perfil'),
    shared.title('mantém seus dados corretos para identificação e contato pela operação.'),
    {
      label: 'Identificação e função',
      description: 'Identificação e função — confira o nome e a função atribuída à sua conta.',
    },
    {
      label: 'Editar perfil',
      description: 'Editar perfil — abre a edição dos dados permitidos da sua conta.',
    },
    { label: 'E-mail', description: 'E-mail — confira o endereço usado para entrar na conta.' },
    {
      label: 'Telefone',
      description: 'Campo Telefone — mantenha um número válido para contato durante a entrega.',
    },
    {
      label: 'CPF',
      description:
        'CPF — confira o documento cadastrado; solicite correção ao administrador quando necessário.',
    },
    { label: 'Cargo', description: 'Cargo — identifica a função operacional da conta.' },
    shared.admin('um dado estiver incorreto, bloqueado ou não for salvo após a edição'),
  ],
};
