import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  BarChart3,
  Boxes,
  ChefHat,
  CircleUserRound,
  ClipboardList,
  MessageCircleMore,
  Settings,
  ShoppingBag,
  Sparkles,
  Users,
} from 'lucide-react';
import * as S from './GastroNexaMarketing.styles';

const contactUrl = String(import.meta.env.VITE_SALES_CONTACT_URL || '').trim();

type DemoSection = 'overview' | 'orders' | 'catalog' | 'customers' | 'team' | 'settings';

const demoOrders = [
  { id: '#1054', customer: 'Ana Martins', type: 'Delivery', total: 'R$ 74,90', status: 'Em preparo' },
  { id: '#1053', customer: 'Mesa 08', type: 'Mesa', total: 'R$ 98,00', status: 'Pronto' },
  { id: '#1052', customer: 'Carlos Souza', type: 'Retirada', total: 'R$ 45,50', status: 'Entregue' },
  { id: '#1051', customer: 'Mesa 03', type: 'Mesa', total: 'R$ 63,20', status: 'Confirmado' },
  { id: '#1050', customer: 'Marina Lima', type: 'Delivery', total: 'R$ 89,90', status: 'Em preparo' },
];

const sectionCopy: Record<DemoSection, { title: string; subtitle: string }> = {
  overview: {
    title: 'Visão geral',
    subtitle: 'Indicadores e movimento recente da operação.',
  },
  orders: {
    title: 'Pedidos',
    subtitle: 'Acompanhe mesa, retirada e delivery em uma fila centralizada.',
  },
  catalog: {
    title: 'Cardápio',
    subtitle: 'Organize categorias, produtos, preços e disponibilidade.',
  },
  customers: {
    title: 'Clientes',
    subtitle: 'Consulte a base de clientes vinculada ao restaurante.',
  },
  team: {
    title: 'Equipe',
    subtitle: 'Separe acessos de administração, cozinha e atendimento.',
  },
  settings: {
    title: 'Configurações',
    subtitle: 'Centralize dados do restaurante e preferências operacionais.',
  },
};

export default function GastroNexaDemo() {
  const [section, setSection] = useState<DemoSection>('overview');
  const salesHref = contactUrl || '/#contato';
  const copy = useMemo(() => sectionCopy[section], [section]);

  useEffect(() => {
    document.title = 'Demonstração | GastroNexa';
  }, []);

  return (
    <S.DemoPage>
      <S.Header>
        <S.HeaderInner>
          <S.Brand as={Link} to="/" aria-label="Voltar para GastroNexa">
            <span aria-hidden="true">G</span>
            <span>GastroNexa</span>
          </S.Brand>
          <S.HeaderActions>
            <S.Button as={Link} to="/" $secondary $compact>
              <ArrowLeft size={16} /> Voltar ao site
            </S.Button>
            <S.Button href={salesHref} $compact>
              Falar com a equipe <MessageCircleMore size={16} />
            </S.Button>
          </S.HeaderActions>
        </S.HeaderInner>
      </S.Header>

      <S.DemoShell>
        <S.DemoIntro>
          <div>
            <S.Eyebrow>
              <Sparkles size={15} /> Demonstração visual
            </S.Eyebrow>
            <h1>Conheça a experiência do administrador.</h1>
            <p>
              Esta área usa dados totalmente fictícios. Ela existe para mostrar a organização do painel
              e não executa ações em restaurantes reais.
            </p>
          </div>
          <S.Button href={salesHref}>
            Quero conhecer a GastroNexa <MessageCircleMore size={18} />
          </S.Button>
        </S.DemoIntro>

        <S.DemoAdmin>
          <S.DemoSidebar>
            <strong>
              <ChefHat size={20} /> GastroNexa Burger
            </strong>
            <nav aria-label="Navegação da demonstração">
              <button type="button" data-active={section === 'overview'} onClick={() => setSection('overview')}>
                <BarChart3 size={18} /> Visão geral
              </button>
              <button type="button" data-active={section === 'orders'} onClick={() => setSection('orders')}>
                <ClipboardList size={18} /> Pedidos
              </button>
              <button type="button" data-active={section === 'catalog'} onClick={() => setSection('catalog')}>
                <Boxes size={18} /> Cardápio
              </button>
              <button type="button" data-active={section === 'customers'} onClick={() => setSection('customers')}>
                <Users size={18} /> Clientes
              </button>
              <button type="button" data-active={section === 'team'} onClick={() => setSection('team')}>
                <CircleUserRound size={18} /> Equipe
              </button>
              <button type="button" data-active={section === 'settings'} onClick={() => setSection('settings')}>
                <Settings size={18} /> Configurações
              </button>
            </nav>
          </S.DemoSidebar>

          <S.DemoWorkspace>
            <S.DemoWorkspaceHeader>
              <div>
                <h2>{copy.title}</h2>
                <small>{copy.subtitle}</small>
              </div>
              <span>● Demo segura</span>
            </S.DemoWorkspaceHeader>

            <S.DemoMetrics>
              <S.DemoMetric>
                <small>Vendas hoje</small>
                <strong>R$ 4.580,90</strong>
                <em>Operação demonstrativa</em>
              </S.DemoMetric>
              <S.DemoMetric>
                <small>Pedidos hoje</small>
                <strong>87</strong>
                <em>5 em preparo agora</em>
              </S.DemoMetric>
              <S.DemoMetric>
                <small>Ticket médio</small>
                <strong>R$ 52,65</strong>
                <em>Base fictícia</em>
              </S.DemoMetric>
              <S.DemoMetric>
                <small>Clientes</small>
                <strong>412</strong>
                <em>Somente demonstração</em>
              </S.DemoMetric>
            </S.DemoMetrics>

            <S.DemoTable>
              <header>
                <div>
                  <strong>{section === 'catalog' ? 'Produtos recentes' : section === 'customers' ? 'Clientes recentes' : 'Pedidos recentes'}</strong>
                  <small> · conteúdo ilustrativo</small>
                </div>
                <ShoppingBag size={18} />
              </header>
              {demoOrders.map((order) => (
                <S.DemoTableRow key={order.id}>
                  <strong>{order.id}</strong>
                  <span>{order.customer}</span>
                  <span>{order.type} · {order.total}</span>
                  <span>{order.status}</span>
                </S.DemoTableRow>
              ))}
            </S.DemoTable>

            <S.DemoCallout>
              <div>
                <span>
                  <Sparkles size={15} /> Você está vendo uma demonstração
                </span>
                <p>Gostou da organização do painel? Converse com a GastroNexa sobre o seu restaurante.</p>
              </div>
              <S.Button href={salesHref}>
                Entrar em contato <MessageCircleMore size={17} />
              </S.Button>
            </S.DemoCallout>
          </S.DemoWorkspace>
        </S.DemoAdmin>
      </S.DemoShell>
    </S.DemoPage>
  );
}
