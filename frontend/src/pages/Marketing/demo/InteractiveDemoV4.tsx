import {
  ArrowLeft,
  ArrowRight,
  BellRing,
  Bike,
  Check,
  CheckCircle2,
  ChefHat,
  ClipboardList,
  Clock3,
  CreditCard,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Mail,
  PackageCheck,
  Plus,
  QrCode,
  RefreshCw,
  Settings2,
  ShoppingBag,
  Store,
  Users,
  WalletCards,
} from 'lucide-react';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { TenantBrandHero } from '../../Login/components/TenantBrandHero';
import * as LoginS from '../../Login/styles';
import * as S from './DemoExperienceV2.styles';
import {
  DEMO_DEFAULT_PASSWORD,
  DEMO_STORAGE_KEY,
  addDemoCartItem,
  authenticateDemoAccount,
  changeDemoCartQuantity,
  createDemoOrder,
  createInitialDemoState,
  createManualDemoOrder,
  deleteDemoCall,
  demoRoleDescriptions,
  demoRoleLabels,
  getDemoAccountByRole,
  getDemoCartTotal,
  getDemoSessionAccount,
  sanitizeDemoState,
  selectDemoAccount,
  toggleDemoOrderPaid,
  toggleDemoTable,
  updateDemoCallStatus,
  updateDemoOrderStatus,
  type DemoAccount,
  type DemoOrder,
  type DemoOrderChannel,
  type DemoOrderStatus,
  type DemoPaymentMethod,
  type DemoRole,
  type DemoState,
} from './demoDomain';

type DemoPortal = 'customer' | 'staff' | 'admin';
type OpsView = string;
type MetricConfig = { label: string; value: string | number; icon: ReactNode };

const staffRoles: DemoRole[] = ['ATENDENTE', 'GARCOM', 'COZINHA', 'MOTOQUEIRO'];
const products = [
  { id: 'burger-classic', name: 'Burger Clássico', description: 'Pão brioche, carne 160g, queijo e molho da casa.', price: 32.9, monogram: 'BG', category: 'Burgers' },
  { id: 'combo-nexa', name: 'Combo Nexa', description: 'Burger especial, batata crocante e refrigerante.', price: 44.9, monogram: 'NX', category: 'Combos' },
  { id: 'pizza-house', name: 'Pizza da Casa', description: 'Massa artesanal, molho da casa e muçarela.', price: 59.9, monogram: 'PZ', category: 'Pizzas' },
  { id: 'fries', name: 'Batata crocante', description: 'Batata sequinha com páprica e molho especial.', price: 16.9, monogram: 'BT', category: 'Acompanhamentos' },
  { id: 'soda', name: 'Refrigerante', description: 'Lata 350ml gelada.', price: 8.9, monogram: 'RF', category: 'Bebidas' },
  { id: 'dessert', name: 'Brownie da casa', description: 'Brownie de chocolate com calda cremosa.', price: 18.9, monogram: 'BR', category: 'Sobremesas' },
];

const statusLabels: Record<DemoOrderStatus, string> = {
  PENDENTE: 'Pendente', PREPARANDO: 'Em preparo', PRONTO: 'Pronto',
  SAIU_PARA_ENTREGA: 'Em rota', ENTREGUE: 'Entregue', CANCELADO: 'Cancelado',
};

const loginTheme = {
  ...LoginS.lightTheme,
  primary: '#d64d08', primaryHover: '#b83e04', primaryText: '#ffffff',
  primaryReadable: '#a83904', categoryAccent: '#f28a54',
  categoryAccentText: '#191816', categoryDeep: '#263d34',
};

const demoBranding = {
  name: 'GastroNexa Burger',
  description: 'Restaurante demonstrativo do GastroNexa.',
  logoUrl: '', primaryColor: '#d64d08', category: 'RESTAURANTE' as const,
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

function loadDemoState() {
  try {
    const raw = window.localStorage.getItem(DEMO_STORAGE_KEY);
    return raw ? sanitizeDemoState(JSON.parse(raw)) : createInitialDemoState();
  } catch {
    return createInitialDemoState();
  }
}

function DemoHeader({ onHome, onReset, onExit, loggedIn }: { onHome: () => void; onReset: () => void; onExit: () => void; loggedIn: boolean }) {
  return <S.DemoTopbar><S.DemoTopbarInner>
    <S.BrandButton type="button" onClick={onHome} aria-label="Início da demonstração"><span className="g" aria-hidden="true">G</span><span><b>GastroNexa</b><small>Demonstração</small></span></S.BrandButton>
    <S.TopActions><S.SoftButton type="button" onClick={onReset}><RefreshCw size={15} /><span className="wide-label">Reiniciar cenário</span></S.SoftButton><S.SoftButton type="button" onClick={onExit}>{loggedIn ? <LogOut size={15} /> : <ArrowLeft size={15} />}<span className="wide-label">{loggedIn ? 'Sair da conta' : 'Voltar'}</span></S.SoftButton></S.TopActions>
  </S.DemoTopbarInner></S.DemoTopbar>;
}

function PortalSelection({ onOpen }: { onOpen: (portal: DemoPortal) => void }) {
  const cards = [
    { id: 'customer' as const, icon: <ShoppingBag size={23} />, title: 'Cliente', text: 'Teste o cardápio, carrinho, checkout e acompanhe pedidos.', points: ['Cardápio e produtos', 'Carrinho e checkout', 'Pedidos do cliente'] },
    { id: 'staff' as const, icon: <Users size={23} />, title: 'Funcionários', text: 'Entre na área operacional de cada função do restaurante.', points: ['Atendente e garçom', 'Cozinha', 'Motoqueiro'] },
    { id: 'admin' as const, icon: <LayoutDashboard size={23} />, title: 'Administrador', text: 'Conheça o painel que centraliza a gestão da operação.', points: ['Indicadores e pedidos', 'Clientes e equipe', 'Planos e configurações'] },
  ];
  return <S.PortalPage><S.PortalHero><span className="eyebrow">Restaurante demonstração GastroNexa</span><h1>Escolha uma área e <span>experimente o produto.</span></h1><p>As contas já estão prontas. Faça login, movimente pedidos e veja o mesmo cenário pelas diferentes telas do restaurante.</p></S.PortalHero><S.PortalGrid>{cards.map((card) => <S.PortalCard key={card.id}><span className="icon">{card.icon}</span><h2>{card.title}</h2><p>{card.text}</p><ul>{card.points.map((point) => <li key={point}><Check size={14} />{point}</li>)}</ul><S.PrimaryButton type="button" onClick={() => onOpen(card.id)}>Entrar nesta área <ArrowRight size={15} /></S.PrimaryButton></S.PortalCard>)}</S.PortalGrid></S.PortalPage>;
}

function rolesForPortal(portal: DemoPortal) {
  if (portal === 'customer') return ['CLIENTE'] as DemoRole[];
  if (portal === 'admin') return ['ADMIN'] as DemoRole[];
  return staffRoles;
}

function portalText(portal: DemoPortal) {
  if (portal === 'customer') return { badge: 'Acesso do cliente', title: 'Bem-vindo de volta!', subtitle: 'Entre com a conta preparada para continuar no GastroNexa Burger.', hero: 'Entre para navegar no cardápio e fazer um pedido completo.' };
  if (portal === 'admin') return { badge: 'ADMIN', title: 'ADMIN', subtitle: 'Entre com a conta administrativa preparada para esta demonstração.', hero: 'Acesso administrativo privado deste restaurante demonstrativo.' };
  return { badge: 'Acesso da equipe', title: 'Acesso da equipe', subtitle: 'Use uma das contas preparadas de atendente, garçom, cozinha ou motoqueiro.', hero: 'Sua função direciona automaticamente para o painel operacional correspondente.' };
}

function PortalLogin({ state, portal, onState, onSuccess }: { state: DemoState; portal: DemoPortal; onState: (state: DemoState) => void; onSuccess: () => void }) {
  const allowedRoles = rolesForPortal(portal);
  const accounts = state.accounts.filter((account) => allowedRoles.includes(account.role));
  const first = accounts[0];
  const [email, setEmail] = useState(first?.email || '');
  const [password, setPassword] = useState(DEMO_DEFAULT_PASSWORD);
  const [selectedId, setSelectedId] = useState(first?.id || '');
  const [error, setError] = useState('');
  const copy = portalText(portal);

  const chooseAccount = (account: DemoAccount) => {
    setEmail(account.email); setPassword(DEMO_DEFAULT_PASSWORD); setSelectedId(account.id); setError('');
  };
  const submit = (event: FormEvent) => {
    event.preventDefault(); setError('');
    try {
      const result = authenticateDemoAccount(state, email, password);
      if (!allowedRoles.includes(result.account.role)) throw new Error('Use uma conta preparada para esta área da demonstração.');
      onState(result.state); onSuccess();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível entrar.');
    }
  };

  return <ThemeProvider theme={loginTheme}><LoginS.Container data-testid="demo-login-layout">
    <LoginS.LoginBannerSection $hasLogo={false} data-has-cover="false"><TenantBrandHero branding={demoBranding} mode="login" contextLabel={copy.badge} overrideText={copy.hero} /></LoginS.LoginBannerSection>
    <LoginS.LoginFormSection><LoginS.LoginFormWrapper>
      <LoginS.LoginAccessBadge><LockKeyhole aria-hidden="true" /><span>{copy.badge}</span></LoginS.LoginAccessBadge><LoginS.WelcomeText>{copy.title}</LoginS.WelcomeText><LoginS.FormSubtitle>{copy.subtitle}</LoginS.FormSubtitle>
      <LoginS.Form onSubmit={submit} autoComplete="off"><LoginS.InputGroup><LoginS.Label htmlFor="demo-email">E-mail</LoginS.Label><LoginS.LoginInputField><LoginS.LoginInputIcon aria-hidden="true"><Mail /></LoginS.LoginInputIcon><LoginS.Input id="demo-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></LoginS.LoginInputField></LoginS.InputGroup><LoginS.InputGroup><LoginS.Label htmlFor="demo-password">Senha</LoginS.Label><LoginS.LoginInputField data-password="true"><LoginS.LoginInputIcon aria-hidden="true"><LockKeyhole /></LoginS.LoginInputIcon><LoginS.Input id="demo-password" type="text" value={password} onChange={(event) => setPassword(event.target.value)} required /></LoginS.LoginInputField></LoginS.InputGroup>{error && <p role="alert" style={{ margin: 0, color: '#b42318', fontSize: 13 }}>{error}</p>}<LoginS.LoginSubmitButton type="submit"><span>Entrar na demonstração</span><ArrowRight aria-hidden="true" /></LoginS.LoginSubmitButton></LoginS.Form>
      <S.CredentialAside><strong>{accounts.length === 1 ? 'Conta preparada' : 'Contas preparadas'}</strong><small>Clique em uma conta para preencher o login. A senha de todas é {DEMO_DEFAULT_PASSWORD}.</small><S.CredentialList>{accounts.map((account) => <S.CredentialButton key={account.id} type="button" $active={selectedId === account.id} onClick={() => chooseAccount(account)}><span><b>{demoRoleLabels[account.role]}</b><small>{account.email}</small></span><code>{DEMO_DEFAULT_PASSWORD}</code></S.CredentialButton>)}</S.CredentialList></S.CredentialAside>
    </LoginS.LoginFormWrapper></LoginS.LoginFormSection>
  </LoginS.Container></ThemeProvider>;
}

function OrdersPanel({ orders, title, subtitle, actions }: { orders: DemoOrder[]; title: string; subtitle: string; actions?: (order: DemoOrder) => ReactNode }) {
  return <S.Panel><S.PanelHeader><div><h2>{title}</h2><small>{subtitle}</small></div><ClipboardList size={18} /></S.PanelHeader>{orders.length ? <S.OrderList>{orders.map((order) => <S.OrderRow key={order.id}><b>{order.publicId}</b><span className="customer"><b>{order.customerName}</b><small>{order.items.map((item) => `${item.quantity}x ${item.name}`).join(' • ')}</small></span><span className="channel">{channelLabel(order)}</span><span className="value"><b>{money(order.total)}</b><small>{order.paid ? 'Pago' : 'A receber'}</small></span><span><S.Status $tone={statusTone(order.status)}>{statusLabels[order.status]}</S.Status>{actions?.(order)}</span></S.OrderRow>)}</S.OrderList> : <S.Empty><ClipboardList size={25} /><b>Nenhum pedido nesta etapa</b><span>Crie ou movimente um pedido para atualizar o cenário.</span></S.Empty>}</S.Panel>;
}

function CustomerWorkspace({ state, onState }: { state: DemoState; onState: (state: DemoState) => void }) {
  const account = getDemoSessionAccount(state);
  const [category, setCategory] = useState('Todos');
  const [cartOpen, setCartOpen] = useState(false);
  const [channel, setChannel] = useState<DemoOrderChannel>('DELIVERY');
  const [payment, setPayment] = useState<DemoPaymentMethod>('PIX');
  const [notice, setNotice] = useState('');
  const categories = ['Todos', ...new Set(products.map((product) => product.category))];
  const visibleProducts = category === 'Todos' ? products : products.filter((product) => product.category === category);
  const cartCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  const ownOrders = state.orders.filter((order) => order.customerEmail === account?.email);
  const checkout = () => {
    if (!state.cart.length) return;
    const result = createDemoOrder(state, { channel, paymentMethod: payment, tableNumber: 8 });
    onState(result.state); setCartOpen(false); setNotice(`Pedido ${result.order.publicId} enviado. Agora ele pode ser visto pelas outras áreas.`);
  };
  return <S.CustomerRoot><S.CustomerHeader><div className="brand"><span className="mark">GB</span><span><b>GastroNexa Burger</b><small>Cardápio digital</small></span></div><span className="user">Olá, {account?.name}</span><button className="cart" type="button" onClick={() => setCartOpen(true)} aria-label="Abrir carrinho"><ShoppingBag size={17} />{cartCount || ''}</button></S.CustomerHeader><S.CustomerMain>{notice && <S.Toast><CheckCircle2 size={16} />{notice}</S.Toast>}<S.CustomerHero><div><span>GastroNexa Burger</span><h1>Sabor feito para o seu momento.</h1><p>Escolha seus favoritos, monte o pedido e acompanhe cada etapa como um cliente do restaurante.</p></div></S.CustomerHero><S.CategoryRow>{categories.map((item) => <button key={item} type="button" className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{item}</button>)}</S.CategoryRow><S.Products>{visibleProducts.map((product) => <S.ProductCard key={product.id}><div className="image">{product.monogram}</div><div className="body"><h3>{product.name}</h3><p>{product.description}</p><footer><strong>{money(product.price)}</strong><button type="button" aria-label={`Adicionar ${product.name}`} onClick={() => { onState(addDemoCartItem(state, product)); setCartOpen(true); }}><Plus size={16} /></button></footer></div></S.ProductCard>)}</S.Products><div style={{ marginTop: 24 }}><OrdersPanel orders={ownOrders} title="Meus pedidos" subtitle="Pedidos feitos com esta conta demonstrativa" /></div></S.CustomerMain><S.CartOverlay type="button" $open={cartOpen} onClick={() => setCartOpen(false)} aria-label="Fechar carrinho" /><S.CartDrawer $open={cartOpen} aria-hidden={!cartOpen}><header><h2>Seu pedido</h2><S.SoftButton type="button" onClick={() => setCartOpen(false)}>Fechar</S.SoftButton></header><S.CartLines>{state.cart.length ? state.cart.map((line) => <S.CartLine key={line.productId}><span><b>{line.name}</b><small>{money(line.unitPrice)} cada</small></span><span className="qty"><button type="button" onClick={() => onState(changeDemoCartQuantity(state, line.productId, line.quantity - 1))}>−</button><b>{line.quantity}</b><button type="button" onClick={() => onState(changeDemoCartQuantity(state, line.productId, line.quantity + 1))}>+</button></span></S.CartLine>) : <S.Empty><ShoppingBag size={24} /><b>Carrinho vazio</b><span>Adicione itens do cardápio.</span></S.Empty>}</S.CartLines><S.Checkout><label>Tipo de pedido<select value={channel} onChange={(event) => setChannel(event.target.value as DemoOrderChannel)}><option value="DELIVERY">Delivery</option><option value="PICKUP">Retirada</option><option value="TABLE">Mesa 08</option></select></label><label>Pagamento<select value={payment} onChange={(event) => setPayment(event.target.value as DemoPaymentMethod)}><option value="PIX">PIX</option><option value="CARD">Cartão</option><option value="CASH">Dinheiro</option></select></label><div className="total"><span>Total</span><strong>{money(getDemoCartTotal(state))}</strong></div><S.PrimaryButton type="button" disabled={!state.cart.length} onClick={checkout}>Enviar pedido <ArrowRight size={15} /></S.PrimaryButton></S.Checkout></S.CartDrawer></S.CustomerRoot>;
}

function navForRole(role: DemoRole) {
  if (role === 'ADMIN') return [['overview', 'Visão geral', LayoutDashboard], ['orders', 'Pedidos', ShoppingBag], ['customers', 'Clientes', Users], ['employees', 'Funcionários', Users], ['plans', 'Cobranças e assinaturas', CreditCard], ['settings', 'Configurações', Settings2]] as const;
  if (role === 'COZINHA') return [['overview', 'Visão geral', LayoutDashboard], ['queue', 'Fila de pedidos', ChefHat], ['ready', 'Prontos', PackageCheck], ['history', 'Histórico', ClipboardList]] as const;
  if (role === 'GARCOM') return [['overview', 'Visão geral', LayoutDashboard], ['deliveries', 'Para entregar', ShoppingBag], ['tables', 'Mesas e QR Codes', QrCode], ['calls', 'Chamados', BellRing], ['payments', 'Pagamentos', CreditCard]] as const;
  if (role === 'MOTOQUEIRO') return [['ready', 'Prontos para retirada', PackageCheck], ['route', 'Em entrega', Bike], ['delivered', 'Entregues', CheckCircle2]] as const;
  return [['overview', 'Visão geral', LayoutDashboard], ['orders', 'Pedidos', ClipboardList], ['create', 'Novo pedido', Plus], ['deliveries', 'Entregas', Bike], ['tables', 'Mesas', Store], ['calls', 'Chamados', BellRing]] as const;
}

function firstView(role: DemoRole) { return role === 'MOTOQUEIRO' ? 'ready' : 'overview'; }

function metricConfigs(state: DemoState, role: DemoRole): MetricConfig[] {
  if (role === 'COZINHA') return [
    { label: 'Na fila', value: state.orders.filter((order) => ['PENDENTE', 'PREPARANDO'].includes(order.status)).length, icon: <ChefHat size={18} /> },
    { label: 'Em preparo', value: state.orders.filter((order) => order.status === 'PREPARANDO').length, icon: <Clock3 size={18} /> },
    { label: 'Prontos', value: state.orders.filter((order) => order.status === 'PRONTO').length, icon: <PackageCheck size={18} /> },
    { label: 'Concluídos', value: state.orders.filter((order) => order.status === 'ENTREGUE').length, icon: <CheckCircle2 size={18} /> },
  ];
  if (role === 'MOTOQUEIRO') return [
    { label: 'Prontos', value: state.orders.filter((order) => order.channel === 'DELIVERY' && order.status === 'PRONTO').length, icon: <PackageCheck size={18} /> },
    { label: 'Em rota', value: state.orders.filter((order) => order.channel === 'DELIVERY' && order.status === 'SAIU_PARA_ENTREGA').length, icon: <Bike size={18} /> },
    { label: 'Entregues', value: state.orders.filter((order) => order.channel === 'DELIVERY' && order.status === 'ENTREGUE').length, icon: <CheckCircle2 size={18} /> },
    { label: 'Delivery', value: state.orders.filter((order) => order.channel === 'DELIVERY').length, icon: <ShoppingBag size={18} /> },
  ];
  if (role === 'GARCOM') return [
    { label: 'Mesas ocupadas', value: state.tables.filter((table) => table.occupied).length, icon: <Store size={18} /> },
    { label: 'Para entregar', value: state.orders.filter((order) => order.channel === 'TABLE' && order.status === 'PRONTO').length, icon: <ShoppingBag size={18} /> },
    { label: 'Chamados', value: state.calls.filter((call) => call.status === 'WAITING').length, icon: <BellRing size={18} /> },
    { label: 'Contas abertas', value: state.tables.filter((table) => table.occupied).length, icon: <CreditCard size={18} /> },
  ];
  if (role === 'ATENDENTE') return [
    { label: 'Pedidos ativos', value: state.orders.filter((order) => !['ENTREGUE', 'CANCELADO'].includes(order.status)).length, icon: <ClipboardList size={18} /> },
    { label: 'Prontos agora', value: state.orders.filter((order) => order.status === 'PRONTO').length, icon: <PackageCheck size={18} /> },
    { label: 'Chamados', value: state.calls.filter((call) => call.status !== 'RESOLVED').length, icon: <BellRing size={18} /> },
    { label: 'Mesas ocupadas', value: state.tables.filter((table) => table.occupied).length, icon: <Store size={18} /> },
  ];
  const sales = state.orders.filter((order) => order.status !== 'CANCELADO').reduce((sum, order) => sum + order.total, 0);
  return [
    { label: 'Vendas da demo', value: money(sales), icon: <WalletCards size={18} /> },
    { label: 'Pedidos', value: state.orders.length, icon: <ShoppingBag size={18} /> },
    { label: 'Em preparo', value: state.orders.filter((order) => order.status === 'PREPARANDO').length, icon: <Clock3 size={18} /> },
    { label: 'Clientes', value: new Set(state.orders.map((order) => order.customerEmail)).size, icon: <Users size={18} /> },
  ];
}

function MetricsBlock({ state, role }: { state: DemoState; role: DemoRole }) {
  return <S.Metrics>{metricConfigs(state, role).map((metric) => <S.Metric key={metric.label}><span className="icon">{metric.icon}</span><span><small>{metric.label}</small><b>{metric.value}</b></span></S.Metric>)}</S.Metrics>;
}

function TablesPanel({ state, onState, editable }: { state: DemoState; onState: (state: DemoState) => void; editable: boolean }) {
  return <S.Panel><S.PanelHeader><div><h2>Mesas e QR Codes</h2><small>Visão do salão demonstrativo</small></div><QrCode size={18} /></S.PanelHeader><S.TableGrid>{state.tables.map((table) => <S.TableCard key={table.id}><header><span><b>Mesa {String(table.number).padStart(2, '0')}</b><small>{table.occupied ? `${table.guests} pessoas • ${money(table.total)}` : 'Disponível'}</small></span><S.Status $tone={table.occupied ? 'info' : 'success'}>{table.occupied ? 'Ocupada' : 'Livre'}</S.Status></header>{editable && <S.Actions><button type="button" onClick={() => onState(toggleDemoTable(state, table.id))}>{table.occupied ? 'Fechar mesa' : 'Abrir mesa'}</button></S.Actions>}</S.TableCard>)}</S.TableGrid></S.Panel>;
}

function CallsPanel({ state, onState, editable }: { state: DemoState; onState: (state: DemoState) => void; editable: boolean }) {
  return <S.Panel><S.PanelHeader><div><h2>Chamados do salão</h2><small>Solicitações das mesas</small></div><BellRing size={18} /></S.PanelHeader><S.CallList>{state.calls.map((call) => <S.CallCard key={call.id}><span><b>Mesa {call.tableNumber} • {call.type === 'BILL' ? 'Conta' : 'Atendimento'}</b><small>{call.status === 'WAITING' ? 'Aguardando' : call.status === 'IN_PROGRESS' ? 'Em atendimento' : 'Resolvido'}</small></span>{editable ? <S.Actions>{call.status === 'WAITING' && <button className="primary" type="button" onClick={() => onState(updateDemoCallStatus(state, call.id, 'IN_PROGRESS'))}>Assumir</button>}{call.status === 'IN_PROGRESS' && <button className="primary" type="button" onClick={() => onState(updateDemoCallStatus(state, call.id, 'RESOLVED'))}>Resolver</button>}{call.status === 'RESOLVED' && <button type="button" onClick={() => onState(deleteDemoCall(state, call.id))}>Arquivar</button>}</S.Actions> : <S.Status $tone={call.status === 'RESOLVED' ? 'success' : 'warning'}>{call.status === 'RESOLVED' ? 'Resolvido' : 'Aberto'}</S.Status>}</S.CallCard>)}</S.CallList></S.Panel>;
}

function RoleContent({ role, view, state, onState }: { role: DemoRole; view: OpsView; state: DemoState; onState: (state: DemoState) => void }) {
  if (view === 'overview') return <><MetricsBlock state={state} role={role} /><OrdersPanel orders={state.orders.slice(0, 6)} title="Movimento recente" subtitle="Últimos pedidos do restaurante demonstrativo" /></>;
  if (role === 'ADMIN') {
    if (view === 'orders') return <OrdersPanel orders={state.orders} title="Pedidos" subtitle="Mesa, retirada e delivery" actions={(order) => <S.Actions>{!order.paid && order.status !== 'CANCELADO' && <button type="button" onClick={() => onState(toggleDemoOrderPaid(state, order.id, true))}>Confirmar pagamento</button>}{!['ENTREGUE', 'CANCELADO'].includes(order.status) && <button type="button" onClick={() => onState(updateDemoOrderStatus(state, order.id, 'CANCELADO'))}>Cancelar</button>}</S.Actions>} />;
    if (view === 'customers') { const clients = [...new Map(state.orders.map((order) => [order.customerEmail, order.customerName])).entries()]; return <S.Panel><S.PanelHeader><div><h2>Clientes</h2><small>Base fictícia</small></div><Users size={18} /></S.PanelHeader><S.CallList>{clients.map(([email, name]) => <S.CallCard key={email}><span><b>{name}</b><small>{email}</small></span><span>{state.orders.filter((order) => order.customerEmail === email).length} pedidos</span></S.CallCard>)}</S.CallList></S.Panel>; }
    if (view === 'employees') return <S.Panel><S.PanelHeader><div><h2>Funcionários</h2><small>Equipe do cenário</small></div><Users size={18} /></S.PanelHeader><S.CallList>{staffRoles.map((employeeRole) => { const user = getDemoAccountByRole(state, employeeRole); return <S.CallCard key={employeeRole}><span><b>{user?.name}</b><small>{demoRoleLabels[employeeRole]} • {user?.email}</small></span><CheckCircle2 size={17} /></S.CallCard>; })}</S.CallList></S.Panel>;
    if (view === 'plans') return <S.ContentGrid><S.Panel $span={6}><S.PanelHeader><div><h2>Básico</h2><small>30 dias de teste</small></div><CreditCard size={18} /></S.PanelHeader><S.CallList><S.CallCard><span><b>R$ 149,90 / mês</b><small>Sistema de delivery</small></span><CheckCircle2 size={17} /></S.CallCard><S.CallCard><span><b>Suporte padrão</b><small>Recursos essenciais</small></span><CheckCircle2 size={17} /></S.CallCard></S.CallList></S.Panel><S.Panel $span={6}><S.PanelHeader><div><h2>Premium</h2><small>30 dias de teste</small></div><CreditCard size={18} /></S.PanelHeader><S.CallList><S.CallCard><span><b>R$ 249,90 / mês</b><small>Sistema de delivery</small></span><CheckCircle2 size={17} /></S.CallCard><S.CallCard><span><b>Cardápio digital com QR Code</b><small>Suporte prioritário</small></span><QrCode size={17} /></S.CallCard></S.CallList></S.Panel></S.ContentGrid>;
    return <S.Panel><S.PanelHeader><div><h2>Configurações</h2><small>Preferências do restaurante</small></div><Settings2 size={18} /></S.PanelHeader><S.CallList><S.CallCard><span><b>GastroNexa Burger</b><small>Mesa, retirada e delivery ativos</small></span><CheckCircle2 size={17} /></S.CallCard></S.CallList></S.Panel>;
  }
  if (role === 'COZINHA') { const selected = view === 'queue' ? state.orders.filter((order) => ['PENDENTE', 'PREPARANDO'].includes(order.status)) : view === 'ready' ? state.orders.filter((order) => order.status === 'PRONTO') : state.orders.filter((order) => ['SAIU_PARA_ENTREGA', 'ENTREGUE'].includes(order.status)); return <OrdersPanel orders={selected} title={view === 'queue' ? 'Fila da cozinha' : view === 'ready' ? 'Pedidos prontos' : 'Histórico'} subtitle="Área operacional da cozinha" actions={(order) => <S.Actions>{order.status === 'PENDENTE' && <button className="primary" type="button" onClick={() => onState(updateDemoOrderStatus(state, order.id, 'PREPARANDO'))}>Iniciar preparo</button>}{order.status === 'PREPARANDO' && <button className="primary" type="button" onClick={() => onState(updateDemoOrderStatus(state, order.id, 'PRONTO'))}>Marcar pronto</button>}</S.Actions>} />; }
  if (role === 'GARCOM') { if (view === 'tables') return <TablesPanel state={state} onState={onState} editable />; if (view === 'calls') return <CallsPanel state={state} onState={onState} editable />; if (view === 'payments') return <S.Panel><S.PanelHeader><div><h2>Pagamentos</h2><small>Contas do salão</small></div><CreditCard size={18} /></S.PanelHeader><S.CallList>{state.tables.filter((table) => table.occupied).map((table) => <S.CallCard key={table.id}><span><b>Mesa {table.number}</b><small>Saldo atual</small></span><b>{money(table.total)}</b></S.CallCard>)}</S.CallList></S.Panel>; return <OrdersPanel orders={state.orders.filter((order) => order.channel === 'TABLE' && order.status === 'PRONTO')} title="Pedidos para entregar" subtitle="Leve pedidos prontos até a mesa" actions={(order) => <S.Actions><button className="primary" type="button" onClick={() => onState(updateDemoOrderStatus(state, order.id, 'ENTREGUE'))}>Entregar na mesa</button></S.Actions>} />; }
  if (role === 'MOTOQUEIRO') { const delivery = state.orders.filter((order) => order.channel === 'DELIVERY' && (view === 'ready' ? order.status === 'PRONTO' : view === 'route' ? order.status === 'SAIU_PARA_ENTREGA' : order.status === 'ENTREGUE')); return <><MetricsBlock state={state} role={role} /><OrdersPanel orders={delivery} title={view === 'ready' ? 'Prontos para retirada' : view === 'route' ? 'Em entrega' : 'Entregues'} subtitle="Área operacional do motoqueiro" actions={(order) => <S.Actions>{order.status === 'PRONTO' && <button className="primary" type="button" onClick={() => onState(updateDemoOrderStatus(state, order.id, 'SAIU_PARA_ENTREGA'))}>Retirar e iniciar entrega</button>}{order.status === 'SAIU_PARA_ENTREGA' && <button className="primary" type="button" onClick={() => onState(updateDemoOrderStatus(state, order.id, 'ENTREGUE'))}>Concluir entrega</button>}</S.Actions>} /></>; }
  if (view === 'create') return <S.Panel><S.PanelHeader><div><h2>Registrar novo pedido</h2><small>Telefone, WhatsApp ou balcão</small></div><Plus size={18} /></S.PanelHeader><S.CallList><S.CallCard><span><b>Combo Nexa</b><small>Pedido rápido • {money(44.9)}</small></span><S.PrimaryButton type="button" onClick={() => onState(createManualDemoOrder(state))}><Plus size={14} />Criar pedido</S.PrimaryButton></S.CallCard></S.CallList></S.Panel>;
  if (view === 'tables') return <TablesPanel state={state} onState={onState} editable={false} />;
  if (view === 'calls') return <CallsPanel state={state} onState={onState} editable={false} />;
  if (view === 'deliveries') return <OrdersPanel orders={state.orders.filter((order) => order.channel === 'DELIVERY')} title="Acompanhar deliveries" subtitle="Situação das entregas" />;
  return <OrdersPanel orders={state.orders} title="Pedidos em andamento" subtitle="Central de atendimento" />;
}

function OpsWorkspace({ state, onState, onLogout }: { state: DemoState; onState: (state: DemoState) => void; onLogout: () => void }) {
  const account = getDemoSessionAccount(state);
  const role = account?.role ?? 'ADMIN';
  const nav = navForRole(role);
  const [view, setView] = useState<OpsView>(() => firstView(role));
  const active = nav.find(([id]) => id === view) ?? nav[0];
  const title = active[1];
  return <S.OpsShell><S.Sidebar><S.SidebarBrand><span className="mark">GB</span><b>GastroNexa Burger</b><small>{role === 'ADMIN' ? 'Painel administrativo' : `Área do ${demoRoleLabels[role].toLowerCase()}`}</small></S.SidebarBrand><S.SideNav>{nav.map(([id, label, Icon]) => <button key={id} type="button" className={view === id ? 'active' : ''} onClick={() => setView(id)}><Icon />{label}</button>)}</S.SideNav><S.SideFooter><div className="user"><span className="avatar">{account?.name.slice(0, 2).toUpperCase()}</span><span><b>{account?.name}</b><small>{account?.email}</small></span></div><button type="button" onClick={onLogout}><LogOut size={15} />Sair da conta</button></S.SideFooter></S.Sidebar><S.OpsMain><S.OpsHeader><div><span className="crumb">{demoRoleLabels[role]} / {title}</span><h1>{title}</h1><p>{demoRoleDescriptions[role]}</p></div><span className="status">● Operação demonstrativa</span></S.OpsHeader><S.OpsContent><RoleContent role={role} view={view} state={state} onState={onState} /></S.OpsContent></S.OpsMain></S.OpsShell>;
}

export default function InteractiveDemoV4() {
  const navigate = useNavigate();
  const [state, setState] = useState<DemoState>(loadDemoState);
  const [screen, setScreen] = useState<'portals' | 'login' | 'workspace'>(() => getDemoSessionAccount(loadDemoState()) ? 'workspace' : 'portals');
  const [portal, setPortal] = useState<DemoPortal>('customer');
  const account = getDemoSessionAccount(state);
  useEffect(() => { window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(state)); }, [state]);
  useEffect(() => { document.title = 'Demonstração | GastroNexa'; }, []);
  const reset = () => { const fresh = createInitialDemoState(); window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(fresh)); setState(fresh); setPortal('customer'); setScreen('portals'); };
  const logout = () => { setState(selectDemoAccount(state, null)); setScreen('portals'); };
  const goHome = () => { if (screen === 'workspace') setState(selectDemoAccount(state, null)); setScreen('portals'); };
  const exit = () => { if (screen === 'portals') navigate('/'); else if (screen === 'workspace') logout(); else setScreen('portals'); };
  return <S.Root><DemoHeader onHome={goHome} onReset={reset} onExit={exit} loggedIn={screen === 'workspace'} />{screen === 'portals' && <PortalSelection onOpen={(selected) => { setPortal(selected); setScreen('login'); }} />}{screen === 'login' && <PortalLogin state={state} portal={portal} onState={setState} onSuccess={() => setScreen('workspace')} />}{screen === 'workspace' && account?.role === 'CLIENTE' && <CustomerWorkspace state={state} onState={setState} />}{screen === 'workspace' && account && account.role !== 'CLIENTE' && <OpsWorkspace state={state} onState={setState} onLogout={logout} />}<S.DemoRibbon>Ambiente demonstrativo · dados fictícios armazenados somente neste navegador</S.DemoRibbon></S.Root>;
}
