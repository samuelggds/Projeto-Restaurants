import { LayoutDashboard, PackageCheck, ShoppingBag, Users, ReceiptText } from 'lucide-react';
import { settingItems, sectionTitle } from '../config/adminNavigation';
import type { SettingsSection } from '../types';

export type GuideSection = {
  title: string;
  icon: typeof LayoutDashboard;
  area: string;
  path: string;
  helper: string;
  preview: string;
  steps: string[];
};

const settingsSteps: Record<SettingsSection, string[]> = {
  brand: [
    'Personalize logotipo, capa, nome, descrição e cor principal. As imagens enviadas aparecem na prévia.',
    'Salve as alterações e use Ver loja para conferir a identidade na Home.',
  ],
  business: [
    'Preencha os dados do negócio e os contatos comerciais que serão exibidos ao cliente.',
    'Revise documento, telefone e e-mail antes de salvar. Na demonstração, use apenas dados fictícios.',
  ],
  address: [
    'Preencha CEP, rua, número, bairro, cidade e estado do restaurante.',
    'Revise o endereço de origem das entregas e retirada. Salve as alterações antes de conferir na loja.',
  ],
  hours: [
    'Ative os dias em que o restaurante funciona e defina os horários de abertura e fechamento.',
    'Revise dias fechados e horários antes de salvar. Confira o estado de abertura apresentado na Home.',
  ],
  orders: [
    'Defina aceite automático, notificação sonora, tempo de preparo e limite de pedidos simultâneos.',
    'Revise as opções de acesso ao acompanhamento e salve. A cozinha usa a capacidade configurada nos indicadores.',
  ],
  promotions: [
    'Escolha entre descontos de produtos, cupons e fidelidade; cada opção possui sua própria configuração.',
    'Defina valor, validade e condições da oferta. Salve e confira quais clientes e produtos atendem às regras.',
  ],
  delivery: [
    'Ative delivery e retirada conforme sua operação. Defina taxa, área atendida e pedido mínimo.',
    'Revise as condições de frete grátis e salve. As opções habilitadas aparecem ao finalizar a compra.',
  ],
  table: [
    'Cadastre as mesas e confira a identificação de cada uma.',
    'Use a prévia e as opções de QR Code da mesa. O QR Code é fixo: o garçom abre e fecha o atendimento sem gerar outro código.',
  ],
  'table-account': [
    'Configure divisão da conta, formas de pagamento, taxa de serviço e regras para novos pedidos após pedir a conta.',
    'Em Quando o cliente precisa pagar na hora, defina um limite em reais ou deixe vazio. A regra soma saldo em aberto e novo pedido: só exige antecipação se ultrapassar o limite. Limite zero exige pagamento de qualquer pedido com valor positivo.',
    'Adicione dias e horários se quiser exigir antecipação nesses períodos, independentemente do valor. O fim pode ser no dia seguinte. Confira o fuso e mantenha o pagamento online disponível para o cliente concluir o pedido.',
    'Consulte as sessões de mesa e confira saldo, pagamentos e participantes. Confirme recebimentos manuais somente após conferir o valor.',
    'Revise qualquer estorno ou fechamento excepcional antes de confirmar a ação.',
  ],
  whatsapp: [
    'Configure o número, identidade, mensagem inicial e atualizações que deseja oferecer ao cliente.',
    'O painel Exemplo de mensagens usa links gastronexa.com.br e não envia mensagens. O botão de contato da loja fica fixo no canto inferior direito.',
    'Na operação real, o envio automático depende da conexão configurada. Na demonstração, não há conexão nem envio real.',
  ],
  printing: [
    'Configure impressão automática, momento de impressão, largura do papel e de 1 a 5 cópias por pedido. Você pode apagar o número e digitar outro antes de salvar.',
    'Confira dispositivo, conexão e fila de trabalhos. Faça a impressão de teste antes do atendimento real.',
    'Na demonstração, os trabalhos são simulados e não acionam impressoras físicas.',
  ],
  'employee-payments': [
    'Escolha o funcionário e configure a regra de remuneração correspondente.',
    'Registre turnos e ajustes com período, valor e justificativa. Revise os registros antes de aprovar.',
    'Confira o resumo e os acertos. Um registro no sistema não substitui a conferência do pagamento.',
  ],
  'courier-payments': [
    'Em Ganhos e acertos, escolha a regra padrão por entrega, distância ou faixa.',
    'Configure exceções individuais quando necessário e confira as entregas pendentes.',
    'Selecione as entregas para um acerto, confira valor e forma de pagamento e acompanhe a confirmação do motoqueiro.',
  ],
  payments: [
    'Escolha as formas de pagamento aceitas e o provedor que será usado pelo restaurante.',
    'No ambiente real, conecte a conta do provedor e valide uma transação antes de oferecer o pagamento.',
    'Na demonstração, Pix e cartão são fictícios. Não informe chaves, credenciais ou dados de cartão reais.',
  ],
  social: [
    'Informe os links completos dos perfis oficiais do restaurante.',
    'Salve e confira os atalhos no rodapé da loja.',
  ],
  appearance: [
    'Ajuste tipografia, título, descrição e imagem de compartilhamento da loja.',
    'Salve e confira a Home em computador e celular.',
  ],
  security: [
    'Revise as permissões e os acessos oferecidos à equipe.',
    'Use Funcionários para cadastrar, desativar ou reativar contas. Cada função acessa seu painel operacional.',
  ],
};

export const adminHelpGuides: GuideSection[] = [
  {
    title: 'Visão geral',
    icon: LayoutDashboard,
    area: 'Visão geral',
    path: 'Visão geral',
    preview: 'admin-overview',
    helper: 'Resumo da operação e atalhos.',
    steps: [
      'Abra Visão geral no menu lateral. No celular, abra o menu de navegação.',
      'Confira o resumo da operação, vendas, pedidos, ticket médio e clientes ativos.',
      'Use os atalhos para abrir pedidos e cardápio. As buscas e filtros das listas ajudam a localizar os registros.',
    ],
  },
  {
    title: 'Pedidos',
    icon: PackageCheck,
    area: 'Pedidos',
    path: 'Pedidos',
    preview: 'admin-orders',
    helper: 'Filas, filtros e acompanhamento.',
    steps: [
      'Abra Pedidos e escolha a fila de atendimento: ativos, pagamento, em andamento ou histórico.',
      'Pesquise pelo número ou nome do cliente e combine os filtros disponíveis.',
      'Abra o pedido para revisar itens, cobrança e ocorrências antes de mudar o status.',
      'Use Carregar mais pedidos quando houver outra página. Confirmar pagamento, cancelar e estornar são ações distintas.',
    ],
  },
  {
    title: 'Cardápio',
    icon: ShoppingBag,
    area: 'Cardápio',
    path: 'Cardápio',
    preview: 'admin-catalog',
    helper: 'Produtos, categorias e ingredientes.',
    steps: [
      'Abra Cardápio e navegue pelas abas Produtos, Categorias e Ingredientes.',
      'Em Ingredientes, clique em Novo ingrediente: informe nome, escolha uma imagem ou continue sem foto, selecione a categoria e defina o adicional.',
      'Em Novo produto, preencha os dados e escolha a forma de venda. Composição define o que vem no produto; grupos de opções definem as escolhas do cliente.',
      'Confira preço, estoque e disponibilidade. Salve e use Ver loja para testar o produto no cardápio.',
    ],
  },
  {
    title: 'Clientes',
    icon: Users,
    area: 'Clientes',
    path: 'Clientes',
    preview: 'admin-customers',
    helper: 'Histórico e relacionamento.',
    steps: [
      'Abra Clientes para consultar os indicadores e o Histórico por cliente.',
      'Busque por nome ou e-mail e escolha a ordenação da lista.',
      'Confira quantidade de pedidos, valores e última compra. Use Mostrar mais clientes quando houver outros resultados.',
    ],
  },
  {
    title: 'Funcionários',
    icon: Users,
    area: 'Funcionários',
    path: 'Funcionários',
    preview: 'admin-employees',
    helper: 'Equipe e acessos.',
    steps: [
      'Abra Funcionários e selecione Novo funcionário.',
      'Informe os dados e escolha a função: atendente, cozinha, garçom ou motoqueiro.',
      'Revise permissões e salve. Use as ações da lista para editar, desativar ou reativar o acesso.',
      'As regras de pagamento ficam em Configurações > Pagamento dos funcionários ou Pagamento dos motoqueiros.',
    ],
  },
  {
    title: 'Cobranças e assinaturas',
    icon: ReceiptText,
    area: 'Cobranças e assinaturas',
    path: 'Cobranças e assinaturas',
    preview: 'admin-subscriptions',
    helper: 'Plano e faturas da plataforma.',
    steps: [
      'Abra Cobranças e assinaturas para consultar plano, situação e faturas.',
      'Confira as condições apresentadas antes de escolher outro plano ou pagar uma mensalidade.',
      'Acompanhe a confirmação da fatura. Na demonstração, a assinatura é fictícia e não gera cobrança real.',
    ],
  },
  ...settingItems.map(([key, label, icon]): GuideSection => ({
    title: sectionTitle[key],
    icon,
    area: 'Configurações',
    path: label,
    preview: `settings-${key}`,
    helper: `Configurações de ${label.toLocaleLowerCase('pt-BR')}.`,
    steps: [
      `Abra Configurações > ${label}. Use Buscar configuração para encontrar a seção.`,
      ...settingsSteps[key],
    ],
  })),
];
