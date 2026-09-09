import {
  ArrowLeft,
  ArrowRight,
  BellRing,
  Bike,
  ChefHat,
  CheckCircle2,
  CircleUserRound,
  ClipboardList,
  Clock3,
  CreditCard,
  LayoutDashboard,
  LogIn,
  LogOut,
  PackageCheck,
  Plus,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  Store,
  UserPlus,
  Users,
  UtensilsCrossed,
  WalletCards,
} from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import * as S from './InteractiveDemo.styles';
import {
  DEMO_DEFAULT_PASSWORD,
  DEMO_STORAGE_KEY,
  addDemoCartItem,
  authenticateDemoAccount,
  changeDemoCartQuantity,
  createDemoOrder,
  createInitialDemoState,
  createManualDemoOrder,
  demoRoleDescriptions,
  demoRoleLabels,
  getDemoCartTotal,
  getDemoSessionAccount,
  registerDemoAccount,
  sanitizeDemoState,
  selectDemoAccount,
  toggleDemoOrderPaid,
  toggleDemoTable,
  updateDemoCallStatus,
  updateDemoOrderStatus,
  type DemoOrder,
  type DemoOrderChannel,
  type DemoOrderStatus,
  type DemoPaymentMethod,
  type DemoRole,
  type DemoState,
} from './demoDomain';

const roleOrder: DemoRole[] = ['CLIENTE', 'ADMIN', 'ATENDENTE', 'COZINHA', 'GARCOM', 'MOTOQUEIRO'];

const products = [
  {
    id: 'burger-classic',
    name: 'Burger Clássico',
    description: 'Pão brioche, carne 160g, queijo, alface, tomate e molho da casa.',
    price: 32.9,
    monogram: 'BG',
  },
  {
    id: 'combo-nexa',
    name: 'Combo Nexa',
    description: 'Burger especial, batata crocante e refrigerante.',
    price: 44.9,
    monogram: 'NX',
  },
  {
    id: 'pizza-house',
    name: 'Pizza da Casa',
    description: 'Massa artesanal, molho da casa, muçarela e ingredientes selecionados.',
    price: 59.9,
    monogram: 'PZ',
  },
  {
    id: 'fries',
    name: 'Batata crocante',
    description: 'Batata sequinha com páprica e molho especial.',
    price: 16.9,
    monogram: 'BT',
  },
  {
    id: 'soda',
    name: 'Refrigerante',
    description: 'Lata 350ml gelada.',
    price: 8.9,
    monogram: 'RF',
  },
  {
    id: 'dessert',
    name: 'Brownie da casa',
    description: 'Brownie de chocolate com calda cremosa.',
    price: 18.9,
    monogram: 'BR',
  },
];

const statusCopy: Record<DemoOrderStatus, string> = {
  PENDENTE: 'Pendente',
  PREPARANDO: 'Em preparo',
  PRONTO: 'Pronto',
  SAIU_PARA_ENTREGA: 'Em rota',
  ENTREGUE: 'Entregue',
  CANCELADO: 'Cancelado',
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

function roleIcon(role: DemoRole) {
  if (role === 'ADMIN') return <LayoutDashboard size={18} />;
  if (role === 'COZINHA') return <ChefHat size={18} />;
  if (role === 'GARCOM') return <UtensilsCrossed size={18} />;
  if (role === 'MOTOQUEIRO') return <Bike size={18} />;
  if (role === 'ATENDENTE') return <CircleUserRound size={18} />;
  return <ShoppingBag size={18} />;
}

function loadInitialState() {
  try {
    const raw = localStorage.getItem(DEMO_STORAGE_KEY);
    return raw ? sanitizeDemoState(JSON.parse(raw)) : createInitialDemoState();
  } catch {
    return createInitialDemoState();
  }
}

function DemoTopbar({
  onBack,
  onReset,
  showReset = true,
}: {
  onBack: () => void;
  onReset: () => void;
  showReset?: boolean;
}) {
  return (
    <S.Topbar>
      <S.TopbarInner>
        <S.Brand type="button" onClick={onBack} aria-label="Voltar para o início da demonstração">
          <span aria-hidden="true">G</span>
          <span>
            <b>GastroNexa</b>
            <small>Demonstração interativa</small>
          </span>
        </S.Brand>
        <S.TopbarActions>
          {showReset && (
            <S.SoftButton type="button" onClick={onReset}>
              <RefreshCw size={16} /> <span className="desktop-label">Reiniciar demo</span>
            </S.SoftButton>
          )}
          <S.SoftButton type="button" onClick={onBack}>
            <ArrowLeft size={16} /> <span className="desktop-label">Voltar</span>
          </S.SoftButton>
        </S.TopbarActions>
      </S.TopbarInner>
    </S.Topbar>
  );
}

function RoleSelector({ activeRole, onSelect }: { activeRole: DemoRole; onSelect: (role: DemoRole) => void }) {
  return (
    <S.RoleGrid>
      {roleOrder.map((role) => (
        <S.RolePill key={role} type="button" $active={activeRole === role} onClick={() => onSelect(role)}>
          {roleIcon(role)}
          <span>
            <b>{demoRoleLabels[role]}</b>
            <small>{demoRoleDescriptions[role]}</small>
          </span>
        </S.RolePill>
      ))}
    </S.RoleGrid>
  );
}

function Intro({
  state,
  selectedRole,
  onSelectRole,
  onOpenAuth,
  onQuickAccess,
}: {
  state: DemoState;
  selectedRole: DemoRole;
  onSelectRole: (role: DemoRole) => void;
  onOpenAuth: (mode: 'login' | 'register') => void;
  onQuickAccess: (role: DemoRole) => void;
}) {
  const selectedDemoAccount = state.accounts.find(
    (account) => account.role === selectedRole && account.id.startsWith('demo-'),
  );

  return (
    <S.PublicPage>
      <S.Hero>
        <S.HeroCopy>
          <span className="eyebrow">
            <Sparkles size={15} /> Restaurante demonstração GastroNexa
          </span>
          <h1>
            Entre em cada função e <span>viva o fluxo completo</span> do restaurante.
          </h1>
          <p>
            Crie uma conta de demonstração ou use os acessos prontos para simular cliente,
            administração, atendimento, cozinha, garçom e motoqueiro. Os pedidos criados em uma área
            aparecem nas outras áreas do mesmo navegador, como acontece na operação real.
          </p>
          <S.IntroActions>
            <S.PrimaryButton type="button" onClick={() => onOpenAuth('register')}>
              <UserPlus size={18} /> Criar conta de demonstração
            </S.PrimaryButton>
            <S.SoftButton type="button" onClick={() => onOpenAuth('login')}>
              <LogIn size={18} /> Entrar com uma conta
            </S.SoftButton>
          </S.IntroActions>
        </S.HeroCopy>

        <S.HeroPanel>
          <div>
            <small>Escolha a área que quer experimentar</small>
            <h2>{demoRoleLabels[selectedRole]}</h2>
            <p>{demoRoleDescriptions[selectedRole]}</p>
          </div>
          <RoleSelector activeRole={selectedRole} onSelect={onSelectRole} />
          <S.PrimaryButton type="button" onClick={() => onQuickAccess(selectedRole)} disabled={!selectedDemoAccount}>
            Entrar como {demoRoleLabels[selectedRole]} <ArrowRight size={17} />
          </S.PrimaryButton>
        </S.HeroPanel>
      </S.Hero>

      <S.InfoStrip>
        <div>
          <b>Dados isolados</b>
          <span>Nada nesta demonstração altera clientes, restaurantes ou pedidos reais.</span>
        </div>
        <div>
          <b>Fluxo compartilhado</b>
          <span>Crie um pedido como cliente e acompanhe a evolução na cozinha e nas outras funções.</span>
        </div>
        <div>
          <b>Visual do projeto</b>
          <span>A experiência usa a mesma direção visual do Projeto-Restaurants: tons quentes, cards e navegação operacional.</span>
        </div>
      </S.InfoStrip>
    </S.PublicPage>
  );
}

function AuthScreen({
  state,
  selectedRole,
  initialMode,
  onState,
  onSuccess,
}: {
  state: DemoState;
  selectedRole: DemoRole;
  initialMode: 'login' | 'register';
  onState: (next: DemoState) => void;
  onSuccess: () => void;
}) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [role, setRole] = useState<DemoRole>(selectedRole);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const demoAccounts = state.accounts.filter((account) => account.id.startsWith('demo-'));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      const result =
        mode === 'login'
          ? authenticateDemoAccount(state, email, password)
          : registerDemoAccount(state, { name, email, password, role });
      onState(result.state);
      onSuccess();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Não foi possível entrar na demonstração.');
    }
  };

  const useDemoAccount = (accountId: string) => {
    onState(selectDemoAccount(state, accountId));
    onSuccess();
  };

  return (
    <S.PublicPage>
      <S.AuthCard>
        <h1>{mode === 'login' ? 'Entrar na demonstração' : 'Criar conta de demonstração'}</h1>
        <p>
          Esta conta existe apenas neste navegador e serve para experimentar o GastroNexa. Ela não é uma conta real da plataforma.
        </p>

        <S.AuthTabs>
          <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>
            Entrar
          </button>
          <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>
            Criar conta
          </button>
        </S.AuthTabs>

        <S.Form onSubmit={submit}>
          {mode === 'register' && (
            <>
              <label>
                Seu nome
                <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: João da Silva" />
              </label>
              <label>
                Área que deseja testar
                <select value={role} onChange={(event) => setRole(event.target.value as DemoRole)}>
                  {roleOrder.map((item) => (
                    <option key={item} value={item}>
                      {demoRoleLabels[item]}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
          <label>
            E-mail
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@exemplo.com" />
          </label>
          <label>
            Senha
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo de 6 caracteres" />
          </label>
          {error && <S.ErrorBox role="alert">{error}</S.ErrorBox>}
          <S.PrimaryButton type="submit">
            {mode === 'login' ? <LogIn size={17} /> : <UserPlus size={17} />}
            {mode === 'login' ? 'Entrar na área' : 'Criar conta e entrar'}
          </S.PrimaryButton>
        </S.Form>

        <S.DemoAccounts>
          <b>Acessos prontos</b>
          <small>Senha de todos: {DEMO_DEFAULT_PASSWORD}</small>
          <S.AccountList>
            {demoAccounts.map((account) => (
              <S.AccountButton key={account.id} type="button" onClick={() => useDemoAccount(account.id)}>
                <span className="avatar">{account.name.slice(0, 1)}</span>
                <span>
                  <b>{demoRoleLabels[account.role]}</b>
                  <small>{account.email}</small>
                </span>
                <ArrowRight size={17} />
              </S.AccountButton>
            ))}
          </S.AccountList>
        </S.DemoAccounts>
      </S.AuthCard>
    </S.PublicPage>
  );
}

function OrdersPanel({
  orders,
  actions,
  title = 'Pedidos da operação',
}: {
  orders: DemoOrder[];
  title?: string;
  actions?: (order: DemoOrder) => React.ReactNode;
}) {
  return (
    <S.Panel>
      <S.PanelHeader>
        <div>
          <h2>{title}</h2>
          <small>{orders.length} pedidos visíveis nesta demonstração</small>
        </div>
        <ClipboardList size={19} />
      </S.PanelHeader>
      {orders.length ? (
        <S.OrderList>
          {orders.map((order) => (
            <S.OrderRow key={order.id}>
              <b>{order.publicId}</b>
              <span className="customer">
                <b>{order.customerName}</b>
                <small>{order.items.map((item) => `${item.quantity}x ${item.name}`).join(' • ')}</small>
              </span>
              <small className="order-channel">{channelLabel(order)}</small>
              <span className="order-total">
                <b>{money(order.total)}</b>
                <small>{order.paid ? 'Pago' : 'Pagamento pendente'}</small>
              </span>
              <span>
                <S.Status $tone={statusTone(order.status)}>{statusCopy[order.status]}</S.Status>
                {actions?.(order)}
              </span>
            </S.OrderRow>
          ))}
        </S.OrderList>
      ) : (
        <S.Empty>
          <ClipboardList size={28} />
          <b>Nenhum pedido nesta etapa</b>
          <span>Troque de perfil ou crie um pedido como cliente para movimentar a demonstração.</span>
        </S.Empty>
      )}
    </S.Panel>
  );
}

function CustomerWorkspace({ state, onState }: { state: DemoState; onState: (next: DemoState) => void }) {
  const account = getDemoSessionAccount(state);
  const [channel, setChannel] = useState<DemoOrderChannel>('DELIVERY');
  const [payment, setPayment] = useState<DemoPaymentMethod>('PIX');
  const [lastOrderId, setLastOrderId] = useState<number | null>(null);
  const ownOrders = state.orders.filter((order) => order.customerEmail === account?.email);
  const total = getDemoCartTotal(state);

  const sendOrder = () => {
    try {
      const result = createDemoOrder(state, {
        channel,
        paymentMethod: payment,
        tableNumber: channel === 'TABLE' ? 8 : undefined,
      });
      onState(result.state);
      setLastOrderId(result.order.id);
    } catch {
      return;
    }
  };

  return (
    <>
      {lastOrderId && (
        <S.Notice>
          <CheckCircle2 size={18} /> Pedido #{lastOrderId} criado. Entre como cozinha, atendente, garçom ou motoqueiro para continuar o fluxo.
        </S.Notice>
      )}
      <S.Grid>
        <S.Panel $span={8}>
          <S.PanelHeader>
            <div>
              <h2>Cardápio do restaurante demo</h2>
              <small>Adicione produtos exatamente como um cliente faria.</small>
            </div>
            <ShoppingBag size={19} />
          </S.PanelHeader>
          <S.ProductGrid>
            {products.map((product) => (
              <S.ProductCard key={product.id}>
                <div className="image">{product.monogram}</div>
                <div className="body">
                  <h3>{product.name}</h3>
                  <p>{product.description}</p>
                  <footer>
                    <b>{money(product.price)}</b>
                    <S.PrimaryButton type="button" onClick={() => onState(addDemoCartItem(state, product))}>
                      <Plus size={15} /> Adicionar
                    </S.PrimaryButton>
                  </footer>
                </div>
              </S.ProductCard>
            ))}
          </S.ProductGrid>
        </S.Panel>
        <div style={{ gridColumn: 'span 4', minWidth: 0 }}>
          <S.Cart>
            <h2>Seu pedido</h2>
            {state.cart.length ? (
              state.cart.map((line) => (
                <S.CartLine key={line.productId}>
                  <span>
                    <b>{line.name}</b>
                    <small>{money(line.unitPrice)} cada</small>
                  </span>
                  <span className="quantity">
                    <button type="button" onClick={() => onState(changeDemoCartQuantity(state, line.productId, line.quantity - 1))}>−</button>
                    <b>{line.quantity}</b>
                    <button type="button" onClick={() => onState(changeDemoCartQuantity(state, line.productId, line.quantity + 1))}>+</button>
                  </span>
                </S.CartLine>
              ))
            ) : (
              <S.Empty>
                <ShoppingBag size={25} />
                <b>Carrinho vazio</b>
                <span>Adicione algum item do cardápio.</span>
              </S.Empty>
            )}
            <S.CartSummary>
              <label>
                Tipo de pedido
                <select value={channel} onChange={(event) => setChannel(event.target.value as DemoOrderChannel)}>
                  <option value="DELIVERY">Delivery</option>
                  <option value="PICKUP">Retirada</option>
                  <option value="TABLE">Mesa 08</option>
                </select>
              </label>
              <label>
                Pagamento
                <select value={payment} onChange={(event) => setPayment(event.target.value as DemoPaymentMethod)}>
                  <option value="PIX">PIX</option>
                  <option value="CARD">Cartão</option>
                  <option value="CASH">Dinheiro</option>
                </select>
              </label>
              <div>
                <span>Total</span>
                <strong>{money(total)}</strong>
              </div>
              <S.PrimaryButton type="button" disabled={!state.cart.length} onClick={sendOrder}>
                Enviar pedido <ArrowRight size={16} />
              </S.PrimaryButton>
            </S.CartSummary>
          </S.Cart>
        </div>
        <div style={{ gridColumn: 'span 12', minWidth: 0 }}>
          <OrdersPanel title="Meus pedidos na demonstração" orders={ownOrders} />
        </div>
      </S.Grid>
    </>
  );
}

function AdminWorkspace({ state, onState }: { state: DemoState; onState: (next: DemoState) => void }) {
  const completed = state.orders.filter((order) => order.status === 'ENTREGUE').length;
  const preparing = state.orders.filter((order) => order.status === 'PREPARANDO').length;
  const sales = state.orders.filter((order) => order.status !== 'CANCELADO').reduce((sum, order) => sum + order.total, 0);
  const customers = new Set(state.orders.map((order) => order.customerEmail)).size;
  return (
    <>
      <S.MetricGrid>
        <S.Metric><span><WalletCards size={17} /></span><small>Vendas da demo</small><strong>{money(sales)}</strong></S.Metric>
        <S.Metric><span><ShoppingBag size={17} /></span><small>Pedidos</small><strong>{state.orders.length}</strong></S.Metric>
        <S.Metric><span><Clock3 size={17} /></span><small>Em preparo</small><strong>{preparing}</strong></S.Metric>
        <S.Metric><span><Users size={17} /></span><small>Clientes</small><strong>{customers}</strong></S.Metric>
      </S.MetricGrid>
      <S.Grid>
        <div style={{ gridColumn: 'span 12', minWidth: 0 }}>
          <OrdersPanel
            orders={state.orders}
            actions={(order) => (
              <S.ActionGroup>
                {!order.paid && order.status !== 'CANCELADO' && (
                  <button type="button" onClick={() => onState(toggleDemoOrderPaid(state, order.id, true))}>Confirmar pagamento</button>
                )}
                {!['ENTREGUE', 'CANCELADO'].includes(order.status) && (
                  <button type="button" onClick={() => onState(updateDemoOrderStatus(state, order.id, 'CANCELADO'))}>Cancelar</button>
                )}
              </S.ActionGroup>
            )}
          />
        </div>
        <S.Panel $span={6}>
          <S.PanelHeader><div><h2>Equipe demonstrativa</h2><small>Perfis disponíveis no fluxo.</small></div><Users size={18} /></S.PanelHeader>
          <S.CallList>
            {roleOrder.filter((role) => role !== 'CLIENTE').map((role) => (
              <S.CallCard key={role}>
                <span><b>{demoRoleLabels[role]}</b><small>{demoRoleDescriptions[role]}</small></span>
                {roleIcon(role)}
              </S.CallCard>
            ))}
          </S.CallList>
        </S.Panel>
        <S.Panel $span={6}>
          <S.PanelHeader><div><h2>Resumo operacional</h2><small>Indicadores gerados com os dados da demo.</small></div><LayoutDashboard size={18} /></S.PanelHeader>
          <S.CallList>
            <S.CallCard><span><b>{completed} pedidos concluídos</b><small>Pedidos já entregues no cenário atual.</small></span><CheckCircle2 size={18} /></S.CallCard>
            <S.CallCard><span><b>{state.calls.filter((call) => call.status !== 'RESOLVED').length} chamados abertos</b><small>Solicitações de mesas aguardando ação.</small></span><BellRing size={18} /></S.CallCard>
            <S.CallCard><span><b>{state.tables.filter((table) => table.occupied).length} mesas ocupadas</b><small>Mesas em operação agora.</small></span><UtensilsCrossed size={18} /></S.CallCard>
          </S.CallList>
        </S.Panel>
      </S.Grid>
    </>
  );
}

function KitchenWorkspace({ state, onState }: { state: DemoState; onState: (next: DemoState) => void }) {
  const kitchenOrders = state.orders.filter((order) => ['PENDENTE', 'PREPARANDO', 'PRONTO'].includes(order.status));
  return (
    <OrdersPanel
      title="Fila da cozinha"
      orders={kitchenOrders}
      actions={(order) => (
        <S.ActionGroup>
          {order.status === 'PENDENTE' && <button className="primary" type="button" onClick={() => onState(updateDemoOrderStatus(state, order.id, 'PREPARANDO'))}>Iniciar preparo</button>}
          {order.status === 'PREPARANDO' && <button className="primary" type="button" onClick={() => onState(updateDemoOrderStatus(state, order.id, 'PRONTO'))}>Marcar pronto</button>}
        </S.ActionGroup>
      )}
    />
  );
}

function AttendantWorkspace({ state, onState }: { state: DemoState; onState: (next: DemoState) => void }) {
  return (
    <S.Grid>
      <S.Panel $span={8}>
        <S.PanelHeader><div><h2>Central do atendente</h2><small>Pedidos e pendências visíveis em um só lugar.</small></div><CircleUserRound size={18} /></S.PanelHeader>
        <S.OrderList>
          {state.orders.map((order) => (
            <S.OrderRow key={order.id}>
              <b>{order.publicId}</b>
              <span className="customer"><b>{order.customerName}</b><small>{channelLabel(order)}</small></span>
              <small className="order-channel">{order.paid ? 'Pago' : 'A receber'}</small>
              <span className="order-total"><b>{money(order.total)}</b></span>
              <span><S.Status $tone={statusTone(order.status)}>{statusCopy[order.status]}</S.Status></span>
            </S.OrderRow>
          ))}
        </S.OrderList>
      </S.Panel>
      <S.Panel $span={4}>
        <S.PanelHeader><div><h2>Ações rápidas</h2><small>Simule um pedido recebido no balcão.</small></div><Plus size={18} /></S.PanelHeader>
        <div style={{ padding: 16, display: 'grid', gap: 10 }}>
          <S.PrimaryButton type="button" onClick={() => onState(createManualDemoOrder(state))}><Plus size={16} /> Criar pedido de balcão</S.PrimaryButton>
          <small style={{ color: '#716d68', lineHeight: 1.5 }}>O novo pedido aparecerá imediatamente na fila da cozinha e no painel administrativo.</small>
        </div>
      </S.Panel>
    </S.Grid>
  );
}

function WaiterWorkspace({ state, onState }: { state: DemoState; onState: (next: DemoState) => void }) {
  const tableReadyOrders = state.orders.filter((order) => order.channel === 'TABLE' && order.status === 'PRONTO');
  return (
    <S.Grid>
      <S.Panel $span={7}>
        <S.PanelHeader><div><h2>Mesas e salão</h2><small>Abra, acompanhe e encerre mesas do restaurante demo.</small></div><UtensilsCrossed size={18} /></S.PanelHeader>
        <S.TableGrid>
          {state.tables.map((table) => (
            <S.TableCard key={table.id}>
              <header><span><b>Mesa {table.number}</b><small>{table.occupied ? `${table.guests} pessoas • ${money(table.total)}` : 'Disponível'}</small></span><S.Status $tone={table.occupied ? 'info' : 'success'}>{table.occupied ? 'Ocupada' : 'Livre'}</S.Status></header>
              <S.ActionGroup><button type="button" onClick={() => onState(toggleDemoTable(state, table.id))}>{table.occupied ? 'Fechar mesa' : 'Abrir mesa'}</button></S.ActionGroup>
            </S.TableCard>
          ))}
        </S.TableGrid>
      </S.Panel>
      <S.Panel $span={5}>
        <S.PanelHeader><div><h2>Chamados</h2><small>Solicitações do salão.</small></div><BellRing size={18} /></S.PanelHeader>
        <S.CallList>
          {state.calls.map((call) => (
            <S.CallCard key={call.id}>
              <span><b>Mesa {call.tableNumber} • {call.type === 'BILL' ? 'Conta' : 'Garçom'}</b><small>{call.status === 'WAITING' ? 'Aguardando atendimento' : call.status === 'IN_PROGRESS' ? 'Em atendimento' : 'Resolvido'}</small></span>
              <S.ActionGroup>
                {call.status === 'WAITING' && <button className="primary" type="button" onClick={() => onState(updateDemoCallStatus(state, call.id, 'IN_PROGRESS'))}>Assumir</button>}
                {call.status === 'IN_PROGRESS' && <button className="primary" type="button" onClick={() => onState(updateDemoCallStatus(state, call.id, 'RESOLVED'))}>Resolver</button>}
              </S.ActionGroup>
            </S.CallCard>
          ))}
        </S.CallList>
      </S.Panel>
      <div style={{ gridColumn: 'span 12', minWidth: 0 }}>
        <OrdersPanel
          title="Pedidos prontos para o salão"
          orders={tableReadyOrders}
          actions={(order) => (
            <S.ActionGroup><button className="primary" type="button" onClick={() => onState(updateDemoOrderStatus(state, order.id, 'ENTREGUE'))}>Entregar na mesa</button></S.ActionGroup>
          )}
        />
      </div>
    </S.Grid>
  );
}

function CourierWorkspace({ state, onState }: { state: DemoState; onState: (next: DemoState) => void }) {
  const deliveries = state.orders.filter((order) => order.channel === 'DELIVERY' && ['PRONTO', 'SAIU_PARA_ENTREGA', 'ENTREGUE'].includes(order.status));
  return (
    <OrdersPanel
      title="Entregas do motoqueiro"
      orders={deliveries}
      actions={(order) => (
        <S.ActionGroup>
          {order.status === 'PRONTO' && <button className="primary" type="button" onClick={() => onState(updateDemoOrderStatus(state, order.id, 'SAIU_PARA_ENTREGA'))}>Retirar pedido</button>}
          {order.status === 'SAIU_PARA_ENTREGA' && <button className="primary" type="button" onClick={() => onState(updateDemoOrderStatus(state, order.id, 'ENTREGUE'))}>Concluir entrega</button>}
        </S.ActionGroup>
      )}
    />
  );
}

function WorkspaceShell({ state, onState, onLogout }: { state: DemoState; onState: (next: DemoState) => void; onLogout: () => void }) {
  const account = getDemoSessionAccount(state);
  const role = account?.role ?? 'CLIENTE';
  const [section, setSection] = useState('workspace');
  const nav = useMemo(
    () => [
      { id: 'workspace', label: role === 'CLIENTE' ? 'Fazer pedido' : 'Visão operacional', icon: role === 'CLIENTE' ? ShoppingBag : LayoutDashboard },
      { id: 'orders', label: 'Todos os pedidos', icon: ClipboardList },
      { id: 'profiles', label: 'Trocar perfil', icon: Users },
    ],
    [role],
  );

  const roleWorkspace = () => {
    if (section === 'orders') return <OrdersPanel orders={state.orders} />;
    if (section === 'profiles') {
      return (
        <S.Panel>
          <S.PanelHeader><div><h2>Trocar perfil de demonstração</h2><small>Use outra função sem perder os pedidos criados.</small></div><Users size={18} /></S.PanelHeader>
          <S.CallList>
            {state.accounts.map((candidate) => (
              <S.CallCard key={candidate.id}>
                <span><b>{candidate.name}</b><small>{demoRoleLabels[candidate.role]} • {candidate.email}</small></span>
                <S.SoftButton type="button" onClick={() => { onState(selectDemoAccount(state, candidate.id)); setSection('workspace'); }}>Entrar</S.SoftButton>
              </S.CallCard>
            ))}
          </S.CallList>
        </S.Panel>
      );
    }
    if (role === 'ADMIN') return <AdminWorkspace state={state} onState={onState} />;
    if (role === 'COZINHA') return <KitchenWorkspace state={state} onState={onState} />;
    if (role === 'GARCOM') return <WaiterWorkspace state={state} onState={onState} />;
    if (role === 'MOTOQUEIRO') return <CourierWorkspace state={state} onState={onState} />;
    if (role === 'ATENDENTE') return <AttendantWorkspace state={state} onState={onState} />;
    return <CustomerWorkspace state={state} onState={onState} />;
  };

  return (
    <S.Workspace>
      <S.Sidebar>
        <S.RestaurantBrand>
          <span className="mark">GN</span>
          <span><b>GastroNexa Burger</b><small>{demoRoleLabels[role]}</small></span>
        </S.RestaurantBrand>
        <S.Nav>
          {nav.map((item) => (
            <button key={item.id} type="button" className={section === item.id ? 'active' : ''} onClick={() => setSection(item.id)}>
              <item.icon size={18} /> {item.label}
            </button>
          ))}
        </S.Nav>
        <S.SidebarFooter>
          <span><b>{account?.name}</b><small>{account?.email}</small></span>
          <button type="button" onClick={onLogout}><LogOut size={16} /> Sair desta conta</button>
        </S.SidebarFooter>
      </S.Sidebar>
      <S.Main>
        <S.PageHeader>
          <div>
            <h1>{section === 'profiles' ? 'Trocar perfil' : section === 'orders' ? 'Pedidos da demonstração' : demoRoleLabels[role]}</h1>
            <p>{section === 'workspace' ? demoRoleDescriptions[role] : 'Os dados continuam compartilhados dentro desta demonstração.'}</p>
          </div>
          <S.DemoBadge>● Ambiente de demonstração</S.DemoBadge>
        </S.PageHeader>
        {roleWorkspace()}
      </S.Main>
    </S.Workspace>
  );
}

export default function InteractiveDemo() {
  const navigate = useNavigate();
  const [state, setState] = useState<DemoState>(loadInitialState);
  const [screen, setScreen] = useState<'intro' | 'auth' | 'workspace'>(() =>
    getDemoSessionAccount(loadInitialState()) ? 'workspace' : 'intro',
  );
  const [selectedRole, setSelectedRole] = useState<DemoRole>('ADMIN');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  useEffect(() => {
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    document.title = 'Demonstração interativa | GastroNexa';
  }, []);

  const resetDemo = () => {
    const fresh = createInitialDemoState();
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(fresh));
    setState(fresh);
    setScreen('intro');
    setSelectedRole('ADMIN');
  };

  const quickAccess = (role: DemoRole) => {
    const account = state.accounts.find((candidate) => candidate.role === role && candidate.id.startsWith('demo-'));
    if (!account) return;
    setState(selectDemoAccount(state, account.id));
    setScreen('workspace');
  };

  const goBack = () => {
    if (screen === 'intro') {
      navigate('/');
      return;
    }
    if (screen === 'workspace') {
      setState(selectDemoAccount(state, null));
    }
    setScreen('intro');
  };

  const logout = () => {
    setState(selectDemoAccount(state, null));
    setScreen('intro');
  };

  return (
    <S.Root>
      <DemoTopbar onBack={goBack} onReset={resetDemo} />
      {screen === 'intro' && (
        <Intro
          state={state}
          selectedRole={selectedRole}
          onSelectRole={setSelectedRole}
          onQuickAccess={quickAccess}
          onOpenAuth={(mode) => {
            setAuthMode(mode);
            setScreen('auth');
          }}
        />
      )}
      {screen === 'auth' && (
        <AuthScreen
          state={state}
          selectedRole={selectedRole}
          initialMode={authMode}
          onState={setState}
          onSuccess={() => setScreen('workspace')}
        />
      )}
      {screen === 'workspace' && (
        <WorkspaceShell state={state} onState={setState} onLogout={logout} />
      )}
    </S.Root>
  );
}
