/**
 * Explicitly approved, public product information, curated from GastroNexa's
 * published marketing/FAQ and documented customer-facing flows.
 *
 * NEVER import repository internals, customer/employee/admin records, payment
 * credentials or operational configuration into this knowledge base.
 * Availability/prices per plan always come from the live public plan catalog.
 */
type Topic = {
  title: string;
  keywords: readonly string[];
  facts: readonly string[];
};

const PRODUCT_TOPICS: readonly Topic[] = [
  {
    title: 'Visão geral',
    keywords: ['o que e', 'conhecer', 'funciona', 'gastronexa', 'plataforma', 'sistema', 'solucao'],
    facts: [
      'A GastroNexa é uma plataforma para organizar o cardápio, os pedidos e a operação de restaurantes.',
      'O restaurante tem sua identidade visual e canais digitais para clientes; o cardápio pode ser acessado pelo navegador sem instalar aplicativo.',
      'Atende cenários de delivery, retirada e consumo no estabelecimento, conforme os módulos disponíveis no plano.',
    ],
  },
  {
    title: 'Cardápio digital',
    keywords: ['cardapio', 'produto', 'foto', 'categoria', 'adicional', 'combo', 'banner', 'personalizacao', 'personalizar'],
    facts: [
      'O cardápio digital apresenta produtos, categorias, fotos, adicionais e combos, com experiência adequada ao celular.',
      'O restaurante pode apresentar seu cardápio por link e QR Code, com identidade visual própria.',
      'A gestão de produtos e alterações do cardápio depende do plano e dos serviços de implantação contratados.',
    ],
  },
  {
    title: 'Delivery e retirada',
    keywords: ['delivery', 'entrega', 'retirada', 'motoboy', 'endereco', 'carrinho', 'acompanhar', 'rastrear'],
    facts: [
      'A plataforma oferece experiência de cardápio, carrinho, pedido e acompanhamento de pedidos de delivery e retirada.',
      'O estabelecimento acompanha os pedidos na operação e administra as etapas do atendimento.',
      'Logística terceirizada, parceiros, cobertura e taxas específicas não podem ser prometidos sem confirmação comercial.',
    ],
  },
  {
    title: 'Mesas e QR Code',
    keywords: ['mesa', 'mesas', 'qrcode', 'qr code', 'salao', 'comanda', 'garcom', 'autoatendimento'],
    facts: [
      'O QR Code de mesa permite acesso ao cardápio no salão pelo celular do cliente.',
      'A gestão operacional reúne pedidos de mesas e outros canais, conforme plano e configuração contratados.',
      'Regras específicas de pagamento e fechamento de comandas dependem do módulo habilitado e das condições comerciais.',
    ],
  },
  {
    title: 'NFC e comandas',
    keywords: ['nfc', 'cartao', 'cartoes', 'aproximacao', 'cashless', 'comanda individual'],
    facts: [
      'O plano Avançado anuncia cartões NFC com comandas individuais, sujeitos à homologação financeira.',
      'A proposta é apoiar o atendimento presencial com cartão de aproximação e controle da comanda.',
      'Não se deve prometer ativação imediata, homologação concluída, meios de pagamento específicos ou condições não publicadas.',
    ],
  },
  {
    title: 'Pedidos, cozinha e equipe',
    keywords: ['pedido', 'pedidos', 'cozinha', 'preparo', 'atendente', 'equipe', 'funcionario', 'funcionarios', 'impressao', 'impressora'],
    facts: [
      'O painel de pedidos organiza o fluxo de atendimento e as etapas de preparo para delivery, retirada e mesas.',
      'A plataforma oferece organização da operação da cozinha e dos acessos de equipe, sem expor contas ou permissões específicas.',
      'Há referência pública a impressão de comandas por impressora compatível; oferta de impressora térmica depende de condições comerciais.',
    ],
  },
  {
    title: 'Gestão, financeiro e desempenho',
    keywords: ['gestao', 'financeiro', 'relatorio', 'vendas', 'faturamento', 'indicador', 'ticket medio', 'administracao', 'administrativo'],
    facts: [
      'A gestão reúne acompanhamento operacional de pedidos, informações de vendas e indicadores de desempenho.',
      'A apresentação pública mostra exemplos de visão geral, relatórios e acompanhamento de pedidos; seus números são ilustrativos.',
      'Nenhum dado real de faturamento, cliente ou restaurante é compartilhado pelo atendimento comercial.',
    ],
  },
  {
    title: 'Promoções, cupons e fidelidade',
    keywords: ['cupom', 'cupons', 'promocao', 'desconto', 'fidelidade', 'pontos', 'campanha', 'cliente recorrente'],
    facts: [
      'A plataforma apresenta recursos de cupons e fidelidade para ações promocionais e relacionamento com clientes.',
      'Regras e disponibilidade comercial desses módulos dependem do plano e das configurações contratadas.',
      'A IA não cria cupons, não concede descontos nem modifica contas.',
    ],
  },
  {
    title: 'Implantação e suporte',
    keywords: ['implantacao', 'configurar', 'configuracao', 'suporte', 'ajuda', 'treinamento', 'comecar', 'cadastro inicial', 'assistida'],
    facts: [
      'A GastroNexa oferece implantação inicial assistida, com escopo definido no plano contratado.',
      'O plano Entrada prevê implantação inicial e depois gestão do cardápio pelo próprio administrador; o Avançado anuncia gestão assistida contínua sob solicitação.',
      'O atendimento humano segue o horário cadastrado; a IA comercial responde dúvidas públicas 24 horas.',
    ],
  },
  {
    title: 'Identidade, domínio e presença digital',
    keywords: ['dominio', 'site', 'pagina', 'marca', 'logo', 'slug', 'subdominio', 'identidade', 'link'],
    facts: [
      'O restaurante pode ter cardápio digital com identidade visual e endereço público dentro da GastroNexa.',
      'O plano Avançado anuncia opções de domínio próprio, página personalizada e subdomínio, conforme contratação.',
      'Configurações de infraestrutura, domínios de terceiros e detalhes internos de publicação não são compartilhados pelo agente.',
    ],
  },
  {
    title: 'Planos e contratação',
    keywords: ['plano', 'planos', 'preco', 'valor', 'mensalidade', 'assinatura', 'contratar', 'teste gratis', 'trial', 'cancelamento', 'reajuste', 'unidades'],
    facts: [
      'Nomes, preços, períodos de teste, disponibilidade e recursos dos planos devem ser retirados exclusivamente do catálogo público ativo do banco a cada resposta.',
      'A escolha do plano depende dos canais de venda, recursos desejados e necessidade de implantação ou acompanhamento.',
      'Contratação de várias unidades, descontos especiais, condições de pagamento e cancelamento precisam de confirmação comercial quando não constarem do catálogo.',
    ],
  },
  {
    title: 'Pagamento, Pix e segurança',
    keywords: ['pix', 'pagamento', 'pagar', 'cartao de credito', 'cobranca', 'seguranca', 'privacidade', 'dados pessoais'],
    facts: [
      'A experiência de pedidos possui etapas de pagamento e pode incluir Pix conforme os recursos disponíveis e a configuração comercial.',
      'O atendimento por IA fornece apenas explicações públicas; não consulta pedidos reais, transações, contas ou dados pessoais.',
      'Não são divulgados detalhes de autenticação, credenciais, infraestrutura, procedimentos internos ou informações de segurança.',
    ],
  },
];

function normalize(value: string) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/gu, '').toLowerCase();
}

/** Select no more than four relevant areas plus a short public topic menu. */
export function selectPublicCommercialProductKnowledge(question: string) {
  const normalized = normalize(question).slice(0, 1800);
  const ranked = PRODUCT_TOPICS.map((topic) => ({
    topic,
    score: topic.keywords.filter((keyword) => normalized.includes(keyword)).length,
  }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(({ topic }) => topic);

  const relevant = ranked.length ? ranked : PRODUCT_TOPICS.slice(0, 2);
  return {
    assuntosPublicos: PRODUCT_TOPICS.map((topic) => topic.title),
    orientacoes: relevant.map(({ title, facts }) => ({ assunto: title, fatosConfirmados: facts })),
  };
}
