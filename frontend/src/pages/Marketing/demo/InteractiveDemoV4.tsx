import {
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardList,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Mail,
  RefreshCw,
  ShoppingBag,
  ChefHat,
  Bike,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { lazy, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { TenantBrandHero } from '../../Login/components/TenantBrandHero';
import * as LoginS from '../../Login/styles';
import * as S from './DemoExperienceV2.styles';
import { DemoCustomerHome } from './DemoCustomerHome';
import { DemoControls } from './DemoControls';
const DemoKitchen = lazy(() =>
  import('./DemoKitchenWaiter').then((module) => ({ default: module.DemoKitchen })),
);
const DemoWaiter = lazy(() =>
  import('./DemoKitchenWaiter').then((module) => ({ default: module.DemoWaiter })),
);
const DemoCourier = lazy(() =>
  import('./DemoCourier').then((module) => ({ default: module.DemoCourier })),
);
const DemoAttendant = lazy(() =>
  import('./DemoAttendant').then((module) => ({ default: module.DemoAttendant })),
);
const DemoAdmin = lazy(() =>
  import('./DemoAdmin').then((module) => ({ default: module.DemoAdmin })),
);
import { useDemoCustomerView, type DemoCustomerView } from './useDemoCustomerView';
import { useDemoScenario } from './useDemoScenario';
import { DEMO_ADMIN_STORAGE_KEY } from './demoAdminData';
import {
  DEMO_DEFAULT_PASSWORD,
  authenticateDemoAccount,
  createInitialDemoState,
  demoRoleLabels,
  getDemoSessionAccount,
  selectDemoAccount,
  type DemoAccount,
  type DemoOrder,
  type DemoOrderStatus,
  type DemoRole,
  type DemoState,
} from './demoDomain';

type DemoPortal = 'customer' | 'staff' | 'admin';

const staffRoles: DemoRole[] = ['ATENDENTE', 'GARCOM', 'COZINHA', 'MOTOQUEIRO'];

const statusLabels: Record<DemoOrderStatus, string> = {
  PENDENTE: 'Pendente',
  PREPARANDO: 'Em preparo',
  PRONTO: 'Pronto',
  SAIU_PARA_ENTREGA: 'Em rota',
  ENTREGUE: 'Entregue',
  CANCELADO: 'Cancelado',
};

const loginTheme = {
  ...LoginS.lightTheme,
  primary: '#d64d08',
  primaryHover: '#b83e04',
  primaryText: '#ffffff',
  primaryReadable: '#a83904',
  categoryAccent: '#f28a54',
  categoryAccentText: '#191816',
  categoryDeep: '#263d34',
};

const demoBranding = {
  name: 'GastroNexa Burger',
  description: 'Restaurante demonstrativo do GastroNexa.',
  logoUrl: '',
  primaryColor: '#d64d08',
  category: 'RESTAURANTE' as const,
};

function money(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function statusTone(status: DemoOrderStatus) {
  if (status === 'ENTREGUE' || status === 'PRONTO') return 'success' as const;
  if (status === 'PREPARANDO' || status === 'SAIU_PARA_ENTREGA') return 'info' as const;
  if (status === 'CANCELADO') return 'danger' as const;
  return 'warning' as const;
}

function channelLabel(order: DemoOrder) {
  if (order.channel === 'TABLE') return `Mesa ${order.tableNumber ?? '?'}`;
  if (order.channel === 'PICKUP') return 'Retirada';
  return 'Delivery';
}

function DemoHeader({
  onHome,
  onReset,
  onExit,
  loggedIn,
}: {
  onHome: () => void;
  onReset: () => void;
  onExit: () => void;
  loggedIn: boolean;
}) {
  return (
    <S.DemoTopbar>
      <S.DemoTopbarInner>
        <S.BrandButton type="button" onClick={onHome} aria-label="Início da demonstração">
          <img
            src="/gastronexa-logo.png"
            alt=""
            width="42"
            height="36"
            style={{ objectFit: 'contain' }}
          />
          <span>
            <b>GastroNexa</b>
            <small>Demonstração</small>
          </span>
        </S.BrandButton>
        <S.TopActions>
          <S.SoftButton type="button" onClick={onReset}>
            <RefreshCw size={15} />
            <span className="wide-label">Reiniciar cenário</span>
          </S.SoftButton>
          <S.SoftButton type="button" onClick={onExit}>
            {loggedIn ? <LogOut size={15} /> : <ArrowLeft size={15} />}
            <span className="wide-label">{loggedIn ? 'Sair da conta' : 'Voltar'}</span>
          </S.SoftButton>
        </S.TopActions>
      </S.DemoTopbarInner>
    </S.DemoTopbar>
  );
}

function PortalSelection({
  onOpen,
}: {
  onOpen: (portal: DemoPortal, view?: DemoCustomerView) => void;
}) {
  const cards = [
    {
      id: 'customer' as const,
      icon: <ShoppingBag size={23} />,
      title: 'Cliente',
      text: 'Teste o cardápio, carrinho, checkout e acompanhe pedidos.',
      points: ['Cardápio e produtos', 'Carrinho e checkout', 'Pedidos do cliente'],
    },
    {
      id: 'staff' as const,
      icon: <Users size={23} />,
      title: 'Funcionários',
      text: 'Entre na área operacional de cada função do restaurante.',
      points: ['Atendente e garçom', 'Cozinha', 'Motoqueiro'],
    },
    {
      id: 'admin' as const,
      icon: <LayoutDashboard size={23} />,
      title: 'Administrador',
      text: 'Conheça o painel que centraliza a gestão da operação.',
      points: ['Indicadores e pedidos', 'Clientes e equipe', 'Planos e configurações'],
    },
  ];
  return (
    <S.PortalPage>
      <S.PortalHero>
        <span className="eyebrow">CONHEÇA A GASTRONEXA NA PRÁTICA</span>
        <h1>
          Um restaurante inteiro.
          <br />
          <span>Pronto para você explorar.</span>
        </h1>
        <p>
          Escolha por onde começar. Faça um pedido como cliente e acompanhe cada etapa pela visão da
          equipe. As contas já estão preparadas para você.
        </p>
        <small className="demo-note">Dados fictícios · Pedidos e pagamentos simulados</small>
      </S.PortalHero>
      <S.PortalGrid>
        {cards.map((card) => (
          <S.PortalCard key={card.id} data-portal={card.id}>
            <div className="card-top">
              <span className="icon">{card.icon}</span>
              <span className="area-label">
                {card.id === 'customer'
                  ? '01 · A experiência'
                  : card.id === 'staff'
                    ? '02 · A operação'
                    : '03 · A gestão'}
              </span>
            </div>
            <h2>{card.title}</h2>
            <p>{card.text}</p>
            <ul>
              {card.points.map((point) => (
                <li key={point}>
                  <Check size={14} />
                  {point}
                </li>
              ))}
            </ul>
            <div className="portal-actions">
              <S.PrimaryButton type="button" onClick={() => onOpen(card.id)}>
                Entrar nesta área <ArrowRight size={15} />
              </S.PrimaryButton>
              {card.id === 'customer' && (
                <S.SoftButton type="button" onClick={() => onOpen('customer', 'QR')}>
                  Cardápio da mesa (QR Code)
                </S.SoftButton>
              )}
            </div>
          </S.PortalCard>
        ))}
      </S.PortalGrid>
      <S.PortalJourney aria-label="Como experimentar a demonstração">
        <div className="journey-copy">
          <b>Experimente o caminho de um pedido</b>
          <p>Troque de perfil pelo menu Demonstração para acompanhar o mesmo cenário.</p>
        </div>
        <ol>
          <li>
            <ShoppingBag size={18} />
            <span>Faça o pedido</span>
          </li>
          <li>
            <ChefHat size={18} />
            <span>Prepare na cozinha</span>
          </li>
          <li>
            <Bike size={18} />
            <span>Entregue ou sirva</span>
          </li>
        </ol>
      </S.PortalJourney>
      <p className="safe-note">
        <ShieldCheck size={16} aria-hidden="true" /> Produtos, contas e pagamentos fictícios. Você
        pode reiniciar o cenário quando quiser.
      </p>
    </S.PortalPage>
  );
}

function rolesForPortal(portal: DemoPortal) {
  if (portal === 'customer') return ['CLIENTE'] as DemoRole[];
  if (portal === 'admin') return ['ADMIN'] as DemoRole[];
  return staffRoles;
}

function portalText(portal: DemoPortal) {
  if (portal === 'customer')
    return {
      badge: 'Acesso do cliente',
      title: 'Bem-vindo de volta!',
      subtitle: 'Entre com a conta preparada para continuar no GastroNexa Burger.',
      hero: 'Entre para navegar no cardápio e fazer um pedido completo.',
    };
  if (portal === 'admin')
    return {
      badge: 'ADMIN',
      title: 'ADMIN',
      subtitle: 'Entre com a conta administrativa preparada para esta demonstração.',
      hero: 'Acesso administrativo privado deste restaurante demonstrativo.',
    };
  return {
    badge: 'Acesso da equipe',
    title: 'Acesso da equipe',
    subtitle: 'Use uma das contas preparadas de atendente, garçom, cozinha ou motoqueiro.',
    hero: 'Sua função direciona automaticamente para o painel operacional correspondente.',
  };
}

function PortalLogin({
  state,
  portal,
  onState,
  onSuccess,
}: {
  state: DemoState;
  portal: DemoPortal;
  onState: (state: DemoState) => void;
  onSuccess: () => void;
}) {
  const allowedRoles = rolesForPortal(portal);
  const accounts = state.accounts.filter((account) => allowedRoles.includes(account.role));
  const first = accounts[0];
  const [email, setEmail] = useState(first?.email || '');
  const [password, setPassword] = useState(DEMO_DEFAULT_PASSWORD);
  const [selectedId, setSelectedId] = useState(first?.id || '');
  const [error, setError] = useState('');
  const copy = portalText(portal);

  const chooseAccount = (account: DemoAccount) => {
    setEmail(account.email);
    setPassword(DEMO_DEFAULT_PASSWORD);
    setSelectedId(account.id);
    setError('');
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      const result = authenticateDemoAccount(state, email, password);
      if (!allowedRoles.includes(result.account.role))
        throw new Error('Use uma conta preparada para esta área da demonstração.');
      onState(result.state);
      onSuccess();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível entrar.');
    }
  };

  return (
    <ThemeProvider theme={loginTheme}>
      <LoginS.Container data-testid="demo-login-layout">
        <LoginS.LoginBannerSection $hasLogo={false} data-has-cover="false">
          <TenantBrandHero
            branding={demoBranding}
            mode="login"
            contextLabel={copy.badge}
            overrideText={copy.hero}
          />
        </LoginS.LoginBannerSection>
        <LoginS.LoginFormSection>
          <LoginS.LoginFormWrapper>
            <LoginS.LoginAccessBadge>
              <LockKeyhole aria-hidden="true" />
              <span>{copy.badge}</span>
            </LoginS.LoginAccessBadge>
            <LoginS.WelcomeText>{copy.title}</LoginS.WelcomeText>
            <LoginS.FormSubtitle>{copy.subtitle}</LoginS.FormSubtitle>
            <LoginS.Form onSubmit={submit} autoComplete="off">
              <LoginS.InputGroup>
                <LoginS.Label htmlFor="demo-email">E-mail</LoginS.Label>
                <LoginS.LoginInputField>
                  <LoginS.LoginInputIcon aria-hidden="true">
                    <Mail />
                  </LoginS.LoginInputIcon>
                  <LoginS.Input
                    id="demo-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </LoginS.LoginInputField>
              </LoginS.InputGroup>
              <LoginS.InputGroup>
                <LoginS.Label htmlFor="demo-password">Senha</LoginS.Label>
                <LoginS.LoginInputField data-password="true">
                  <LoginS.LoginInputIcon aria-hidden="true">
                    <LockKeyhole />
                  </LoginS.LoginInputIcon>
                  <LoginS.Input
                    id="demo-password"
                    type="text"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                </LoginS.LoginInputField>
              </LoginS.InputGroup>
              {error && (
                <p role="alert" style={{ margin: 0, color: '#b42318', fontSize: 13 }}>
                  {error}
                </p>
              )}
              <LoginS.LoginSubmitButton type="submit">
                <span>Entrar na demonstração</span>
                <ArrowRight aria-hidden="true" />
              </LoginS.LoginSubmitButton>
            </LoginS.Form>
            <S.CredentialAside>
              <strong>{accounts.length === 1 ? 'Conta preparada' : 'Contas preparadas'}</strong>
              <small>
                Clique em uma conta para preencher o login. A senha de todas é{' '}
                {DEMO_DEFAULT_PASSWORD}.
              </small>
              <S.CredentialList>
                {accounts.map((account) => (
                  <S.CredentialButton
                    key={account.id}
                    type="button"
                    $active={selectedId === account.id}
                    onClick={() => chooseAccount(account)}
                  >
                    <span>
                      <b>{demoRoleLabels[account.role]}</b>
                      <small>{account.email}</small>
                    </span>
                    <code>{DEMO_DEFAULT_PASSWORD}</code>
                  </S.CredentialButton>
                ))}
              </S.CredentialList>
            </S.CredentialAside>
          </LoginS.LoginFormWrapper>
        </LoginS.LoginFormSection>
      </LoginS.Container>
    </ThemeProvider>
  );
}

function OrdersPanel({
  orders,
  title,
  subtitle,
  actions,
}: {
  orders: DemoOrder[];
  title: string;
  subtitle: string;
  actions?: (order: DemoOrder) => ReactNode;
}) {
  return (
    <S.Panel>
      <S.PanelHeader>
        <div>
          <h2>{title}</h2>
          <small>{subtitle}</small>
        </div>
        <ClipboardList size={18} />
      </S.PanelHeader>
      {orders.length ? (
        <S.OrderList>
          {orders.map((order) => (
            <S.OrderRow key={order.id}>
              <b>{order.publicId}</b>
              <span className="customer">
                <b>{order.customerName}</b>
                <small>
                  {order.items.map((item) => `${item.quantity}x ${item.name}`).join(' • ')}
                </small>
              </span>
              <span className="channel">{channelLabel(order)}</span>
              <span className="value">
                <b>{money(order.total)}</b>
                <small>{order.paid ? 'Pago' : 'A receber'}</small>
              </span>
              <span>
                <S.Status $tone={statusTone(order.status)}>{statusLabels[order.status]}</S.Status>
                {actions?.(order)}
              </span>
            </S.OrderRow>
          ))}
        </S.OrderList>
      ) : (
        <S.Empty>
          <ClipboardList size={25} />
          <b>Nenhum pedido nesta etapa</b>
          <span>Crie ou movimente um pedido para atualizar o cenário.</span>
        </S.Empty>
      )}
    </S.Panel>
  );
}

export default function InteractiveDemoV4() {
  const navigate = useNavigate();
  const { state, update: setState, storageUnavailable } = useDemoScenario();
  const [screen, setScreen] = useState<'portals' | 'login' | 'workspace'>(() =>
    getDemoSessionAccount(state) ? 'workspace' : 'portals',
  );
  const [customerView, setCustomerView] = useDemoCustomerView();
  const [portal, setPortal] = useState<DemoPortal>('customer');
  const account = getDemoSessionAccount(state);
  useEffect(() => {
    document.title = 'Demonstração | GastroNexa';
  }, []);
  const reset = () => {
    try {
      localStorage.removeItem(DEMO_ADMIN_STORAGE_KEY);
    } catch {
      /* Keep reset usable without storage. */
    }
    setCustomerView('HOME');
    const fresh = createInitialDemoState();
    setState(fresh);
    setPortal('customer');
    setScreen('portals');
  };
  const logout = () => {
    setState(selectDemoAccount(state, null));
    setScreen('portals');
  };
  const goHome = () => {
    if (screen === 'workspace') setState(selectDemoAccount(state, null));
    setScreen('portals');
  };
  const exit = () => {
    if (screen === 'portals') navigate('/');
    else if (screen === 'workspace') logout();
    else setScreen('portals');
  };
  return (
    <S.Root>
      {screen !== 'workspace' && (
        <DemoHeader onHome={goHome} onReset={reset} onExit={exit} loggedIn={false} />
      )}
      {screen === 'portals' && (
        <PortalSelection
          onOpen={(selected, view = 'HOME') => {
            setCustomerView(view);
            setPortal(selected);
            setScreen('login');
          }}
        />
      )}
      {screen === 'login' && (
        <PortalLogin
          state={state}
          portal={portal}
          onState={setState}
          onSuccess={() => setScreen('workspace')}
        />
      )}
      {screen === 'workspace' && account?.role === 'CLIENTE' && (
        <DemoCustomerHome
          key={customerView}
          tableMenu={customerView === 'QR'}
          state={state}
          onState={setState}
          onLogout={logout}
          ordersPanel={
            <OrdersPanel
              orders={state.orders.filter((order) => order.customerEmail === account.email)}
              title="Meus pedidos"
              subtitle="Acompanhe o preparo e a entrega"
            />
          }
        />
      )}
      {screen === 'workspace' && account?.role === 'COZINHA' && (
        <DemoKitchen state={state} onState={setState} onLogout={logout} />
      )}
      {screen === 'workspace' && account?.role === 'GARCOM' && (
        <DemoWaiter state={state} onState={setState} onLogout={logout} />
      )}
      {screen === 'workspace' && account?.role === 'MOTOQUEIRO' && (
        <DemoCourier state={state} onState={setState} onLogout={logout} />
      )}
      {screen === 'workspace' && account?.role === 'ATENDENTE' && (
        <DemoAttendant state={state} onState={setState} onLogout={logout} />
      )}
      {screen === 'workspace' && account?.role === 'ADMIN' && (
        <DemoAdmin
          state={state}
          onState={setState}
          onLogout={logout}
          onViewStore={() => {
            setCustomerView('HOME');
            setState(selectDemoAccount(state, 'demo-cliente'));
          }}
        />
      )}
      {screen === 'workspace' && account ? (
        <DemoControls
          role={account.role}
          customerView={customerView}
          storageUnavailable={storageUnavailable}
          onRole={(role) => {
            if (role === 'CLIENTE' || role === 'CLIENTE_QR')
              setCustomerView(role === 'CLIENTE_QR' ? 'QR' : 'HOME');
            const next = state.accounts.find(
              (item) => item.role === (role === 'CLIENTE_QR' ? 'CLIENTE' : role),
            );
            if (next) setState(selectDemoAccount(state, next.id));
          }}
          onReset={reset}
          onExit={logout}
        />
      ) : screen === 'login' ? (
        <S.DemoRibbon>
          Ambiente demonstrativo · dados fictícios armazenados somente neste navegador
        </S.DemoRibbon>
      ) : null}
    </S.Root>
  );
}
