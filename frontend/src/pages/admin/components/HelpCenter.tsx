import { FormEvent, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import {
  BookOpenCheck,
  Building2,
  ChevronDown,
  CircleHelp,
  Clock3,
  CreditCard,
  Headphones,
  LayoutDashboard,
  LayoutGrid,
  MapPin,
  MessageCircle,
  PackageCheck,
  QrCode,
  ReceiptText,
  Send,
  Settings2,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Store,
  Truck,
  Users,
} from 'lucide-react';
import * as S from './HelpCenter.styles';
import { FaithfulGuidePreview } from './HelpCenterPreviews';
import supportChatService from '../../../Services/supportChatService';
import { acquireSocket } from '../../../Services/socketService';
import { getAccessToken } from '../../../modules/auth/session/authSession';
import { useAppDialog } from '../../../components/AppDialog/context';

type HelpCenterProps = {
  onReport: (payload: { subject: string; message: string }) => Promise<void>;
};
type EmployeeIssue = {
  id: string;
  senderLabel: string;
  message: string;
  issueStatus: 'OPEN' | 'IN_PROGRESS' | 'CLOSED';
  issueResponse?: string | null;
  sentAt: string | null;
};
type PlatformSupportMessage = {
  id: string;
  senderRole: 'ADMIN' | 'SUPER_ADMIN';
  senderLabel: string;
  message: string;
  issueStatus?: string | null;
  sentAt: string | null;
};
type GuideSection = {
  title: string;
  icon: typeof Store;
  area: string;
  path: string;
  helper: string;
  fields: Array<{ label: string; value: string }>;
  action: string;
  steps: string[];
};

const guideSections: GuideSection[] = [
  {
    title: 'Visão geral',
    icon: LayoutDashboard,
    area: 'Visão geral',
    path: 'Indicadores da operação',
    helper: 'Acompanhe os dados atuais antes de tomar decisões.',
    fields: [
      { label: 'Vendas de hoje', value: 'Valor recebido no dia' },
      { label: 'Pedidos', value: 'Pedidos em preparo' },
      { label: 'Produtos disponíveis', value: 'Estoque disponível' },
    ],
    action: 'Abrir pedidos',
    steps: [
      'Clique em Visão geral no menu escuro à esquerda.',
      'Confira vendas, pedidos, ticket médio e clientes ativos.',
      'Use a busca dos cards para encontrar pedidos e produtos rapidamente.',
    ],
  },
  {
    title: 'Pedidos',
    icon: PackageCheck,
    area: 'Pedidos',
    path: 'Lista e acompanhamento',
    helper: 'Pesquise, acompanhe e cancele pedidos quando necessário.',
    fields: [
      { label: 'Buscar pedido ou cliente', value: 'Número ou nome' },
      { label: 'Todos os status', value: 'Filtrar a operação' },
      { label: 'Ações do pedido', value: 'Ver ou cancelar' },
    ],
    action: 'Aplicar filtros',
    steps: [
      'Abra Pedidos no menu principal.',
      'Digite o ID ou nome do cliente e escolha um status, se precisar.',
      'Abra o pedido para conferir dados; só cancele ou estorne pagamentos já recebidos quando necessário.',
    ],
  },
  {
    title: 'Cardápio',
    icon: ShoppingBag,
    area: 'Cardápio',
    path: 'Produtos, categorias e estoque',
    helper: 'Crie itens organizados e mantenha o estoque correto.',
    fields: [
      { label: 'Buscar produto', value: 'Nome do produto' },
      { label: 'Todas as categorias', value: 'Filtre a lista' },
      { label: 'Novo produto', value: 'Foto, preço e estoque' },
    ],
    action: 'Salvar produto',
    steps: [
      'Abra Cardápio e crie as categorias antes dos produtos.',
      'Clique em Novo produto e informe nome, descrição, foto, categoria, preço e estoque.',
      'Use os três pontos em cada card para editar; estoque zero deixa o produto indisponível automaticamente.',
    ],
  },
  {
    title: 'Clientes',
    icon: Users,
    area: 'Clientes',
    path: 'Cadastro e histórico',
    helper: 'Consulte clientes e os pedidos vinculados a cada conta.',
    fields: [
      { label: 'Buscar cliente', value: 'Nome ou e-mail' },
      { label: 'Pedidos', value: 'Histórico do cliente' },
      { label: 'Endereços', value: 'Locais salvos' },
    ],
    action: 'Ver cliente',
    steps: [
      'Abra Clientes no menu principal.',
      'Pesquise pelo nome ou e-mail para localizar o cadastro.',
      'Abra o cliente para consultar pedidos, endereços e dados vinculados.',
    ],
  },
  {
    title: 'Funcionários',
    icon: Users,
    area: 'Funcionários',
    path: 'Equipe e permissões',
    helper: 'Cada função recebe somente o painel necessário.',
    fields: [
      { label: 'Novo funcionário', value: 'Nome e e-mail' },
      { label: 'Função', value: 'Cozinha, garçom ou motoqueiro' },
      { label: 'Situação', value: 'Ativo ou inativo' },
    ],
    action: 'Salvar funcionário',
    steps: [
      'Abra Funcionários e clique em Novo funcionário.',
      'Escolha a função correta: cozinha, garçom ou motoqueiro.',
      'Use o menu de ações para desativar e reativar sem apagar o histórico do usuário.',
    ],
  },
  {
    title: 'Cobranças e assinaturas',
    icon: ReceiptText,
    area: 'Cobranças e assinaturas',
    path: 'Plano e faturas',
    helper: 'Consulte seu plano, vencimento e o Pix da mensalidade.',
    fields: [
      { label: 'Plano atual', value: 'Básico ou Premium' },
      { label: 'Vencimento', value: 'Tolerância de 5 dias úteis' },
      { label: 'QR Code Pix', value: 'Pagamento da mensalidade' },
    ],
    action: 'Gerar Pix',
    steps: [
      'Abra Cobranças e assinaturas no menu principal.',
      'Confira plano, vencimento e período de tolerância exibidos na fatura.',
      'Depois de pagar a fatura, escolha manter ou trocar o plano para o próximo ciclo.',
    ],
  },
  {
    title: 'Marca e identidade',
    icon: Store,
    area: 'Configurações',
    path: 'Marca e identidade',
    helper: 'Defina a aparência exibida na loja e nos acessos.',
    fields: [
      { label: 'Nome do restaurante', value: 'Nome mostrado ao cliente' },
      { label: 'Cor principal', value: 'Cor dos botões' },
      { label: 'Logotipo e imagem de capa', value: 'Arquivos da marca' },
    ],
    action: 'Salvar alterações',
    steps: [
      'Abra Configurações > Marca e identidade.',
      'Preencha nome, descrição e cor principal; troque logotipo e imagem de capa quando necessário.',
      'Clique em Salvar alterações e depois em Ver loja para conferir o resultado.',
    ],
  },
  {
    title: 'Dados do negócio',
    icon: Building2,
    area: 'Configurações',
    path: 'Dados do negócio',
    helper: 'Informações de contato exibidas no rodapé da loja.',
    fields: [
      { label: 'Razão social', value: 'Nome legal do negócio' },
      { label: 'CPF ou CNPJ', value: 'Documento cadastrado' },
      { label: 'Telefone e e-mail comercial', value: 'Contato público' },
    ],
    action: 'Salvar alterações',
    steps: [
      'Abra Configurações > Dados do negócio.',
      'Informe razão social e apenas um documento: CPF ou CNPJ.',
      'Preencha telefone e e-mail comercial; esses contatos serão mostrados no rodapé da Home.',
    ],
  },
  {
    title: 'Endereço',
    icon: MapPin,
    area: 'Configurações',
    path: 'Endereço',
    helper: 'Origem das entregas e local da retirada.',
    fields: [
      { label: 'CEP', value: '00000-000' },
      { label: 'Rua e número', value: 'Endereço do estabelecimento' },
      { label: 'Bairro e cidade', value: 'Localização do restaurante' },
    ],
    action: 'Salvar alterações',
    steps: [
      'Abra Configurações > Endereço.',
      'Informe o CEP e revise rua, número, bairro e cidade preenchidos.',
      'Salve para atualizar a origem das entregas e o endereço no rodapé da loja.',
    ],
  },
  {
    title: 'Horários',
    icon: Clock3,
    area: 'Configurações',
    path: 'Horários',
    helper: 'Controle abertura, fechamento e dias de folga.',
    fields: [
      { label: 'Dia da semana', value: 'Ativo ou fechado' },
      { label: 'Abertura', value: 'Horário inicial' },
      { label: 'Fechamento', value: 'Horário final' },
    ],
    action: 'Salvar horários',
    steps: [
      'Abra Configurações > Horários.',
      'Ative os dias de funcionamento e informe abertura e fechamento de cada um.',
      'Desative o dia de folga; com a loja fechada, novos pedidos e pagamentos ficam bloqueados.',
    ],
  },
  {
    title: 'Configurações de pedidos',
    icon: PackageCheck,
    area: 'Configurações',
    path: 'Pedidos',
    helper: 'Defina como a operação recebe e avisa sobre novos pedidos.',
    fields: [
      { label: 'Aceitar automaticamente', value: 'Enviar direto para preparo' },
      { label: 'Tempo médio', value: 'Estimativa ao cliente' },
      { label: 'Limite simultâneo', value: 'Máximo de pedidos' },
    ],
    action: 'Salvar pedidos',
    steps: [
      'Abra Configurações > Pedidos.',
      'Defina aceite automático, login para rastreamento e notificação sonora.',
      'Informe tempo médio e limite simultâneo para evitar pedidos acima da capacidade.',
    ],
  },
  {
    title: 'Delivery e retirada',
    icon: Truck,
    area: 'Configurações',
    path: 'Delivery e retirada',
    helper: 'Escolha os canais disponíveis para os clientes.',
    fields: [
      { label: 'Delivery', value: 'Ativar entregas' },
      { label: 'Retirada', value: 'Ativar retirada no local' },
      { label: 'Taxa e área', value: 'Regras de entrega' },
    ],
    action: 'Salvar canais',
    steps: [
      'Abra Configurações > Delivery e retirada.',
      'Ative somente os canais que sua operação atende.',
      'Revise taxa, raio e instruções antes de salvar e conferir na loja.',
    ],
  },
  {
    title: 'Cardápio de mesa',
    icon: QrCode,
    area: 'Configurações',
    path: 'Cardápio de mesa',
    helper: 'Crie mesas e gere QR Codes para atendimento presencial.',
    fields: [
      { label: 'Número da mesa', value: 'Identificação da mesa' },
      { label: 'QR Code', value: 'Código para escanear' },
      { label: 'Situação', value: 'Mesa ativa ou inativa' },
    ],
    action: 'Gerar QR Code',
    steps: [
      'Abra Configurações > Cardápio de mesa.',
      'Cadastre cada mesa com sua identificação.',
      'Gere e imprima o QR Code para que o cliente abra o cardápio correto.',
    ],
  },
  {
    title: 'WhatsApp',
    icon: MessageCircle,
    area: 'Configurações',
    path: 'WhatsApp',
    helper: 'Use um canal de contato direto com seus clientes.',
    fields: [
      { label: 'Número do WhatsApp', value: 'DDD + número' },
      { label: 'Mensagem inicial', value: 'Texto de atendimento' },
      { label: 'Ativar contato', value: 'Exibir na loja' },
    ],
    action: 'Salvar WhatsApp',
    steps: [
      'Abra Configurações > WhatsApp.',
      'Informe o número com DDD e escreva uma mensagem inicial objetiva.',
      'Ative a exibição e salve antes de testar o botão na Home.',
    ],
  },
  {
    title: 'Pagamentos',
    icon: CreditCard,
    area: 'Configurações',
    path: 'Pagamentos',
    helper: 'Configure Pix e cartão do restaurante com segurança.',
    fields: [
      { label: 'Provedor Pix', value: 'Mercado Pago, Asaas ou PagBank' },
      { label: 'Chave Pix', value: 'Chave do restaurante' },
      { label: 'Gateway de cartão', value: 'Conta conectada' },
    ],
    action: 'Salvar pagamentos',
    steps: [
      'Abra Configurações > Pagamentos.',
      'Escolha o provedor e conecte a conta oficial do restaurante.',
      'Nunca cole credenciais de clientes em locais públicos; conclua a autorização no ambiente do provedor.',
    ],
  },
  {
    title: 'Redes sociais',
    icon: Share2,
    area: 'Configurações',
    path: 'Redes sociais',
    helper: 'Exiba links oficiais no rodapé da sua loja.',
    fields: [
      { label: 'Instagram', value: 'Link do perfil' },
      { label: 'Facebook', value: 'Link da página' },
      { label: 'WhatsApp', value: 'Link de conversa' },
    ],
    action: 'Salvar redes',
    steps: [
      'Abra Configurações > Redes sociais.',
      'Cole os links completos dos perfis oficiais.',
      'Salve e confira os ícones no rodapé da Home.',
    ],
  },
  {
    title: 'Aparência e SEO',
    icon: LayoutGrid,
    area: 'Configurações',
    path: 'Aparência e SEO',
    helper: 'Melhore a apresentação e a busca pela sua loja.',
    fields: [
      { label: 'Título da página', value: 'Nome para buscadores' },
      { label: 'Descrição', value: 'Resumo da loja' },
      { label: 'Imagem de compartilhamento', value: 'Prévia nas redes' },
    ],
    action: 'Salvar aparência',
    steps: [
      'Abra Configurações > Aparência e SEO.',
      'Escreva título e descrição claros, usando nome e especialidade do restaurante.',
      'Envie uma imagem horizontal bem definida e salve antes de compartilhar o link.',
    ],
  },
  {
    title: 'Equipe e segurança',
    icon: ShieldCheck,
    area: 'Configurações',
    path: 'Equipe e segurança',
    helper: 'Proteja contas administrativas e permissões do restaurante.',
    fields: [
      { label: 'Administradores', value: 'Pessoas com acesso' },
      { label: 'Permissões', value: 'Função de cada usuário' },
      { label: 'Segurança', value: 'Acessos e senhas' },
    ],
    action: 'Salvar segurança',
    steps: [
      'Abra Configurações > Equipe e segurança.',
      'Mantenha somente pessoas autorizadas com acesso administrativo.',
      'Revise permissões e remova acessos que não façam mais parte da operação.',
    ],
  },
];

const primaryMenuItems = [
  'Visão geral',
  'Pedidos',
  'Cardápio',
  'Clientes',
  'Funcionários',
  'Cobranças e assinaturas',
  'Configurações',
];
const primaryGuideSections = guideSections.filter((section) => section.area !== 'Configurações');
const settingsGuideSections = guideSections.filter((section) => section.area === 'Configurações');

function getDetailedSteps({ area, path, fields, action }: GuideSection) {
  if (area === 'Visão geral') {
    return [
      'No menu lateral escuro, clique em “Visão geral”, exatamente como indicado no número 1.',
      'Confirme no cabeçalho que a tela aberta é “Visão geral”; ela concentra os dados gerais do restaurante.',
      'Leia os quatro cartões superiores: vendas de hoje, pedidos, ticket médio e clientes ativos. Eles são apenas indicadores, não precisam ser preenchidos.',
      'Em “Pedidos recentes”, use o campo de busca para localizar pelo ID ou pelo nome do cliente e use o seletor para filtrar pelo status.',
      'Em “Produtos disponíveis”, pesquise pelo nome ou ID do produto e altere o filtro de disponibilidade quando necessário.',
      'Use “Voltar 5” e “Próximos 5” no fim de cada lista para navegar pelos resultados sem sair da tela.',
    ];
  }

  return [
    `No menu lateral escuro, clique em “${area}”.`,
    `Confira no topo se a tela “${path}” foi aberta antes de continuar.`,
    ...fields.map((field) => `No campo “${field.label}”, informe ou selecione: ${field.value}.`),
    `Para concluir, clique em “${action}” e aguarde a confirmação de salvamento.`,
  ];
}

function LegacyGuidePreview({
  title,
  icon: Icon,
  area,
  path,
  helper,
  fields,
  action,
}: GuideSection) {
  if (area === 'Visão geral') {
    return (
      <S.Preview aria-label="Guia visual detalhado: Visão geral">
        <div className="overview-preview">
          <aside className="overview-sidebar">
            <strong>NP</strong>
            <b>North Pizza</b>
            <small>PAINEL ADMINISTRATIVO</small>
            {primaryMenuItems.map((item) => (
              <span key={item} className={item === 'Visão geral' ? 'selected' : ''}>
                {item === 'Visão geral' && <em>1</em>}
                {item}
              </span>
            ))}
          </aside>
          <div className="overview-page">
            <header>
              <small>PAINEL / OVERVIEW</small>
              <h4>Visão geral</h4>
              <p>Acompanhe e gerencie a operação em um só lugar.</p>
              <strong className="marker title-marker">2</strong>
            </header>
            <div className="overview-metrics">
              <b>
                Vendas de hoje<strong className="marker">3</strong>
                <span>R$ 158,51</span>
                <small>Dados reais de hoje</small>
              </b>
              <b>
                Pedidos<span>3</span>
                <small>1 em preparo</small>
              </b>
              <b>
                Ticket médio<span>R$ 52,84</span>
                <small>Hoje</small>
              </b>
              <b>
                Clientes ativos<span>1</span>
                <small>Com pedidos registrados</small>
              </b>
            </div>
            <div className="overview-lists">
              <section>
                <h5>
                  Pedidos recentes<strong className="marker">4</strong>
                </h5>
                <div className="mini-filters">
                  <span>⌕ Buscar por ID ou cliente</span>
                  <span>Todos os status</span>
                </div>
                <p>
                  #58 · Samuel Gomes <b>R$ 81,13</b>
                </p>
                <p>
                  #57 · Samuel Gomes <b>R$ 49,68</b>
                </p>
                <footer>
                  <small>1–5 de 11</small>
                  <strong className="marker">6</strong>
                  <button>‹ Voltar 5</button>
                  <button>Próximos 5 ›</button>
                </footer>
              </section>
              <section>
                <h5>
                  Produtos disponíveis<strong className="marker">5</strong>
                </h5>
                <div className="mini-filters">
                  <span>⌕ Buscar por ID ou produto</span>
                  <span>Disponíveis</span>
                </div>
                <p>
                  Coca Zero <b>R$ 9,90</b>
                </p>
                <p>
                  Fanta Uva <b>R$ 8,90</b>
                </p>
                <footer>
                  <small>1–5 de 6</small>
                  <button>‹ Voltar 5</button>
                  <button>Próximos 5 ›</button>
                </footer>
              </section>
            </div>
          </div>
        </div>
        <figcaption>
          <b>Leia os números na ordem:</b> 1. abra a Visão geral; 2. confirme a tela; 3. acompanhe
          os indicadores; 4 e 5. filtre as listas; 6. navegue entre os resultados.
        </figcaption>
      </S.Preview>
    );
  }

  return (
    <S.Preview aria-label={`Guia visual detalhado: ${title}`}>
      <div className="preview-topbar">
        <span>PAINEL ADMINISTRATIVO</span>
        <b>{area}</b>
      </div>
      <div className="preview-content">
        <aside className="preview-sidebar">
          <span className="brand">
            NP
            <br />
            North Pizza
          </span>
          {primaryMenuItems.map((item) => (
            <span key={item} className={item === area ? 'selected' : ''}>
              {item === area && <em>1</em>}
              {item}
            </span>
          ))}
        </aside>
        <div className="preview-page">
          <header className="preview-title">
            <Icon />
            <div>
              <small>PAINEL / {area.toUpperCase()}</small>
              <b>{path}</b>
              <p>{helper}</p>
            </div>
            <strong className="marker title-marker">2</strong>
          </header>
          <div className="preview-form" aria-label="Campos demonstrados">
            {fields.map((field, index) => (
              <label key={field.label}>
                <span>
                  {field.label}
                  <strong className="marker">{index + 3}</strong>
                </span>
                <b>{field.value}</b>
              </label>
            ))}
          </div>
          <button type="button" className="preview-action">
            <strong className="marker">{fields.length + 3}</strong>
            {action}
          </button>
        </div>
      </div>
      <figcaption>
        <b>Leia os números na ordem:</b> 1. abra a aba; 2. confirme a tela; 3 a {fields.length + 2}.
        preencha ou escolha os itens identificados; {fields.length + 3}. salve ou conclua a ação.
      </figcaption>
    </S.Preview>
  );
}

function GuidePreview(props: GuideSection) {
  if (!props.area) return <LegacyGuidePreview {...props} />;
  return <FaithfulGuidePreview {...props} />;
}

type GuideItemProps = {
  section: GuideSection;
  isOpen: boolean;
  isSubtitle?: boolean;
  onToggle: () => void;
};

function GuideItem({ section, isOpen, isSubtitle = false, onToggle }: GuideItemProps) {
  const { title, icon: Icon, steps } = section;
  const detailedSteps = getDetailedSteps(section);

  return (
    <article className={`${isOpen ? 'open' : ''}${isSubtitle ? ' settings-guide-item' : ''}`}>
      <button type="button" aria-expanded={isOpen} onClick={onToggle}>
        <i>
          <Icon />
        </i>
        <span>
          <b>{title}</b>
          <small>
            {isSubtitle
              ? `${steps.length} passos detalhados`
              : `${section.area} · ${steps.length} passos detalhados`}
          </small>
        </span>
        <ChevronDown />
      </button>
      {isOpen && (
        <div className="guide-details">
          <ol>
            {detailedSteps.map((step, index) => (
              <li key={`${title}-${index}`}>{step}</li>
            ))}
          </ol>
          <GuidePreview {...section} />
        </div>
      )}
    </article>
  );
}

export function HelpCenter({ onReport }: HelpCenterProps) {
  const { confirmDialog } = useAppDialog();
  const [openSection, setOpenSection] = useState<string | null>('Visão geral');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [subject, setSubject] = useState('Dúvida sobre o sistema');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [employeeIssues, setEmployeeIssues] = useState<EmployeeIssue[]>([]);
  const [issuesState, setIssuesState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [platformMessages, setPlatformMessages] = useState<PlatformSupportMessage[]>([]);
  const [platformState, setPlatformState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [showIssueHistory, setShowIssueHistory] = useState(false);
  const loadEmployeeIssues = async () => {
    setIssuesState('loading');
    try {
      const result = await supportChatService.getMessages({ limit: 100, channel: 'internal' });
      setEmployeeIssues(
        (result?.messages || []).filter(
          (item: { issueStatus?: string | null }) => item.issueStatus,
        ),
      );
      setIssuesState('ready');
    } catch {
      setIssuesState('error');
    }
  };
  const loadPlatformConversation = async () => {
    setPlatformState('loading');
    try {
      const result = await supportChatService.getMessages({ limit: 100, channel: 'platform' });
      setPlatformMessages(
        (result?.messages || []).filter((item: { senderRole?: string }) =>
          ['ADMIN', 'SUPER_ADMIN'].includes(String(item.senderRole || '')),
        ),
      );
      setPlatformState('ready');
    } catch {
      setPlatformState('error');
    }
  };
  useEffect(() => {
    const loadOnMount = window.setTimeout(() => {
      void loadEmployeeIssues();
      void loadPlatformConversation();
    }, 0);
    return () => window.clearTimeout(loadOnMount);
  }, []);
  useEffect(() => {
    const token = getAccessToken();
    if (!token) return undefined;

    const { socket, release } = acquireSocket(token, 'admin-help-issues');
    const refresh = () => void loadEmployeeIssues();
    const onNewIssue = (issue: {
      issueStatus?: string | null;
      senderRole?: string;
      senderLabel?: string;
    }) => {
      if (issue.issueStatus === 'OPEN') {
        toast.info(`Novo relato da equipe: ${issue.senderLabel || 'funcionário'}.`);
        refresh();
        return;
      }
      if (issue.senderRole === 'ADMIN' || issue.senderRole === 'SUPER_ADMIN') {
        if (issue.senderRole === 'SUPER_ADMIN') {
          toast.info('Nova resposta do suporte da plataforma.');
        }
        void loadPlatformConversation();
      }
    };
    const onUpdatedIssue = () => {
      toast.info('Um relato da equipe foi atualizado.');
      refresh();
    };
    const onDeletedIssue = () => refresh();

    socket.on('support:chat-message', onNewIssue);
    socket.on('support:issue-updated', onUpdatedIssue);
    socket.on('support:issue-deleted', onDeletedIssue);
    return () => {
      socket.off('support:chat-message', onNewIssue);
      socket.off('support:issue-updated', onUpdatedIssue);
      socket.off('support:issue-deleted', onDeletedIssue);
      release();
    };
  }, []);
  const updateEmployeeIssue = async (
    id: string,
    issueStatus: EmployeeIssue['issueStatus'],
    response?: string,
  ) => {
    try {
      await supportChatService.updateIssue(id, issueStatus, response?.trim());
      if (response?.trim()) setReplyDrafts((drafts) => ({ ...drafts, [id]: '' }));
      await loadEmployeeIssues();
    } catch {
      setIssuesState('error');
    }
  };
  const deleteEmployeeIssue = async (id: string) => {
    const confirmed = await confirmDialog({
      title: 'Excluir relato encerrado?',
      description: 'O relato será removido permanentemente do histórico.',
      confirmLabel: 'Excluir relato',
      tone: 'danger',
    });
    if (!confirmed) return;
    try {
      await supportChatService.deleteIssue(id);
      await loadEmployeeIssues();
      toast.success('Relato excluído.');
    } catch {
      setIssuesState('error');
    }
  };
  const visibleEmployeeIssues = employeeIssues.filter((issue) =>
    showIssueHistory ? issue.issueStatus === 'CLOSED' : issue.issueStatus !== 'CLOSED',
  );
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (message.trim().length < 10 || status === 'sending') return;
    setStatus('sending');
    setErrorMessage('');
    try {
      await onReport({ subject, message: message.trim() });
      setMessage('');
      setStatus('success');
      await loadPlatformConversation();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Não foi possível enviar agora. Tente novamente.',
      );
      setStatus('error');
    }
  };
  return (
    <S.Root>
      <S.Hero>
        <span>
          <CircleHelp /> Central de ajuda
        </span>
        <h2>Manual visual do seu restaurante</h2>
        <p>
          Cada guia reproduz os campos e ações do painel. Abra uma aba, siga os números da imagem e
          finalize no botão indicado.
        </p>
      </S.Hero>
      <S.Guide aria-label="Manual completo do painel administrativo">
        {primaryGuideSections.map((section) => (
          <GuideItem
            key={section.title}
            section={section}
            isOpen={openSection === section.title}
            onToggle={() => setOpenSection(openSection === section.title ? null : section.title)}
          />
        ))}
        <S.SettingsGroup className={isSettingsOpen ? 'open' : ''}>
          <button
            type="button"
            aria-expanded={isSettingsOpen}
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
          >
            <i>
              <Settings2 />
            </i>
            <span>
              <b>Configurações</b>
              <small>{settingsGuideSections.length} subtítulos para personalizar a operação</small>
            </span>
            <ChevronDown />
          </button>
          {isSettingsOpen && (
            <div className="settings-guides">
              <p className="settings-guides-intro">
                Abra o subtítulo correspondente à configuração que deseja alterar. Cada guia mostra
                a tela e o passo a passo específico.
              </p>
              {settingsGuideSections.map((section) => (
                <GuideItem
                  key={section.title}
                  section={section}
                  isSubtitle
                  isOpen={openSection === section.title}
                  onToggle={() =>
                    setOpenSection(openSection === section.title ? null : section.title)
                  }
                />
              ))}
            </div>
          )}
        </S.SettingsGroup>
      </S.Guide>
      <S.ReportCard>
        <div className="heading">
          <i>
            <Headphones />
          </i>
          <div>
            <h2>Relatos da equipe</h2>
            <p>Mensagens de cozinha, salão e entregas enviadas pela Central de Ajuda.</p>
          </div>
          <button
            type="button"
            className="refresh-issues"
            onClick={() => void loadEmployeeIssues()}
          >
            Atualizar relatos
          </button>
          <button
            type="button"
            className="refresh-issues"
            onClick={() => setShowIssueHistory((visible) => !visible)}
          >
            {showIssueHistory
              ? 'Ver ativos'
              : `Histórico (${employeeIssues.filter((issue) => issue.issueStatus === 'CLOSED').length})`}
          </button>
        </div>
        {issuesState === 'loading' && <p>Carregando relatos...</p>}
        {issuesState === 'error' && (
          <p className="error">
            Não foi possível carregar ou atualizar os relatos. Tente novamente.
          </p>
        )}
        {issuesState === 'ready' && !visibleEmployeeIssues.length && (
          <p>
            {showIssueHistory
              ? 'Nenhum relato encerrado no histórico.'
              : 'Nenhum relato ativo no momento.'}
          </p>
        )}
        {visibleEmployeeIssues.map((issue) => (
          <div className="employee-issue" key={issue.id}>
            <b>
              {issue.senderLabel} ·{' '}
              {issue.issueStatus === 'OPEN'
                ? 'Aberto'
                : issue.issueStatus === 'IN_PROGRESS'
                  ? 'Em atendimento'
                  : 'Encerrado'}
            </b>
            <pre>{issue.message}</pre>
            {issue.issueResponse && (
              <p className="issue-response">
                <strong>Resposta registrada:</strong> {issue.issueResponse}
              </p>
            )}
            {issue.issueStatus !== 'CLOSED' && (
              <label className="issue-reply">
                Responder ao funcionário
                <textarea
                  value={replyDrafts[issue.id] || ''}
                  onChange={(event) =>
                    setReplyDrafts((drafts) => ({ ...drafts, [issue.id]: event.target.value }))
                  }
                  placeholder="Informe a orientação ou a solução adotada."
                  maxLength={1200}
                />
              </label>
            )}
            <footer>
              {issue.issueStatus === 'OPEN' && (
                <button
                  type="button"
                  onClick={() => void updateEmployeeIssue(issue.id, 'IN_PROGRESS')}
                >
                  Assumir
                </button>
              )}
              {issue.issueStatus !== 'CLOSED' && (
                <button
                  type="button"
                  disabled={
                    (replyDrafts[issue.id] || '').trim().length > 0 &&
                    (replyDrafts[issue.id] || '').trim().length < 3
                  }
                  onClick={() =>
                    void updateEmployeeIssue(issue.id, issue.issueStatus, replyDrafts[issue.id])
                  }
                >
                  Registrar resposta
                </button>
              )}
              {issue.issueStatus !== 'CLOSED' && (
                <button type="button" onClick={() => void updateEmployeeIssue(issue.id, 'CLOSED')}>
                  Encerrar
                </button>
              )}
              <button
                type="button"
                className="delete-issue"
                disabled={issue.issueStatus !== 'CLOSED'}
                title={
                  issue.issueStatus === 'CLOSED'
                    ? 'Excluir relato permanentemente'
                    : 'Encerre o relato antes de excluir'
                }
                onClick={() => void deleteEmployeeIssue(issue.id)}
              >
                Excluir
              </button>
            </footer>
          </div>
        ))}
      </S.ReportCard>
      <S.ReportCard>
        <div className="heading">
          <i>
            <Headphones />
          </i>
          <div>
            <h2>Suporte da plataforma</h2>
            <p>Canal exclusivo entre o administrador responsável e o Super Admin da plataforma.</p>
          </div>
          <button
            type="button"
            className="refresh-issues"
            onClick={() => void loadPlatformConversation()}
          >
            Atualizar conversa
          </button>
        </div>
        <div className="platform-conversation" aria-live="polite">
          {platformState === 'loading' && <p>Carregando conversa com a plataforma...</p>}
          {platformState === 'error' && (
            <p className="error">Não foi possível carregar a conversa. Tente novamente.</p>
          )}
          {platformState === 'ready' && !platformMessages.length && (
            <div className="platform-empty">
              <MessageCircle />
              <span>
                <b>Nenhuma mensagem enviada ainda</b>
                <small>Descreva abaixo o que precisa e aguarde o retorno do Super Admin.</small>
              </span>
            </div>
          )}
          {platformMessages.map((item) => (
            <article
              key={item.id}
              className={item.senderRole === 'ADMIN' ? 'from-admin' : 'from-platform'}
            >
              <header>
                <b>{item.senderRole === 'SUPER_ADMIN' ? 'Suporte da plataforma' : 'Você'}</b>
                <time>
                  {item.sentAt
                    ? new Intl.DateTimeFormat('pt-BR', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      }).format(new Date(item.sentAt))
                    : 'Agora'}
                </time>
              </header>
              <p>{item.message}</p>
              {item.issueStatus === 'CLOSED' ? (
                <small className="conversation-status">Atendimento encerrado</small>
              ) : null}
            </article>
          ))}
        </div>
        <form onSubmit={submit}>
          <label>
            Assunto
            <select value={subject} onChange={(event) => setSubject(event.target.value)}>
              <option>Dúvida sobre o sistema</option>
              <option>Problema em pedido</option>
              <option>Problema em pagamento</option>
              <option>Problema técnico</option>
              <option>Outro assunto</option>
            </select>
          </label>
          <label>
            Descreva o que aconteceu
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              minLength={10}
              maxLength={1100}
              placeholder="Inclua o número do pedido, se houver, e os passos que levaram ao problema."
              required
            />
          </label>
          <footer>
            {status === 'success' && (
              <span className="success">Relato enviado ao Super Admin.</span>
            )}
            {status === 'error' && <span className="error">{errorMessage}</span>}
            <button type="submit" disabled={status === 'sending' || message.trim().length < 10}>
              <Send /> {status === 'sending' ? 'Enviando...' : 'Reportar ao Super Admin'}
            </button>
          </footer>
        </form>
      </S.ReportCard>
      <S.Tip>
        <BookOpenCheck /> Dica: use o botão Ver loja depois de salvar para conferir cada mudança
        como o cliente verá.
      </S.Tip>
    </S.Root>
  );
}
