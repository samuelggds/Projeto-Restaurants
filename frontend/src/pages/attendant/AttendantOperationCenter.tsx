import {
  AlertTriangle,
  Armchair,
  BellRing,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  Clock3,
  Headphones,
  LayoutDashboard,
  LogOut,
  MapPin,
  PackageCheck,
  PackagePlus,
  RefreshCw,
  Search,
  Send,
  ShoppingBag,
  Store,
  Truck,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { type CSSProperties, type FormEvent, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import ordersService from '../../Services/ordersService';
import productsService from '../../Services/productsService';
import attendantApi from './attendantApi';
import * as S from './AttendantOperationCenter.styles';
import type {
  AttendantCall,
  AttendantOrder,
  AttendantRestaurantBrand,
  AttendantView,
  AttendantWorkspaceSnapshot,
  AttendantWorkspaceState,
} from './types';

type Props = {
  attendantId: number;
  attendantName: string;
  restaurantId: number;
  restaurant: AttendantRestaurantBrand;
  snapshot: AttendantWorkspaceSnapshot;
  workspaceState: AttendantWorkspaceState;
  onRefresh: () => void | Promise<void>;
  onLogout: () => void;
};

type Raw = Record<string, unknown>;
type Product = { id: number; name: string; price: number; stock: number | null };
type Cart = Record<number, number>;
type SupportMessage = {
  id?: string | number;
  senderType?: string;
  senderName?: string;
  message: string;
  sentAt?: string;
};
type SupportThread = {
  orderId: number;
  customerName: string;
  orderStatus: string;
  isResolved: boolean;
  messages: SupportMessage[];
};

type SupportSummary = {
  orderId: number;
  customer: string;
  lastMessage: string;
  resolved: boolean;
};

const viewMeta: Record<
  AttendantView,
  { label: string; title: string; subtitle: string; icon: LucideIcon }
> = {
  overview: {
    label: 'Visão geral',
    title: 'Central de atendimento',
    subtitle: 'Veja primeiro o que precisa da sua atenção agora.',
    icon: LayoutDashboard,
  },
  orders: {
    label: 'Pedidos',
    title: 'Pedidos em andamento',
    subtitle: 'Acompanhe a fila e abra o pedido para entender a situação completa.',
    icon: ClipboardList,
  },
  create: {
    label: 'Novo pedido',
    title: 'Registrar novo pedido',
    subtitle: 'Use para pedidos recebidos por telefone, WhatsApp ou balcão.',
    icon: PackagePlus,
  },
  support: {
    label: 'Atendimento',
    title: 'Atendimento ao cliente',
    subtitle: 'Responda dúvidas e problemas sem misturar suporte com cozinha.',
    icon: Headphones,
  },
  deliveries: {
    label: 'Entregas',
    title: 'Acompanhar deliveries',
    subtitle: 'Acompanhe a situação sem assumir etapas do motoqueiro.',
    icon: Truck,
  },
  tables: {
    label: 'Mesas',
    title: 'Mesas em operação',
    subtitle: 'Veja rapidamente mesas com pedidos, chamados ou conta solicitada.',
    icon: Armchair,
  },
  calls: {
    label: 'Chamados',
    title: 'Chamados do salão',
    subtitle: 'Assuma uma solicitação para a equipe saber quem está cuidando dela.',
    icon: BellRing,
  },
};

function record(value: unknown): Raw {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Raw) : {};
}

function money(value: unknown) {
  const amount = Number(value || 0);
  return Number.isFinite(amount)
    ? amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : '—';
}

function snapshotTime(snapshot: AttendantWorkspaceSnapshot) {
  const parsed = new Date(snapshot.generatedAt).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function elapsed(value: string, referenceTime: number) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp) || !referenceTime) return 'agora';
  const minutes = Math.max(0, Math.floor((referenceTime - timestamp) / 60_000));
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}min` : `${hours}h`;
}

function isDelayed(order: AttendantOrder, referenceTime: number) {
  const created = new Date(order.createdAt).getTime();
  return (
    order.status !== 'PRONTO' &&
    Number.isFinite(created) &&
    referenceTime > 0 &&
    referenceTime - created >= 35 * 60_000
  );
}

function orderPlace(order: AttendantOrder) {
  if (order.type === 'MESA') return `Mesa ${order.tableNumber ?? '?'}`;
  if (order.type === 'DELIVERY') return 'Delivery';
  return 'Retirada';
}

function statusText(status: string) {
  if (status === 'PREPARANDO') return 'Em preparo';
  if (status === 'PRONTO') return 'Pronto';
  if (status === 'SAIU_PARA_ENTREGA') return 'Em rota';
  if (status === 'ENTREGUE') return 'Concluído';
  return 'Pendente';
}

function errorMessage(error: unknown, fallback: string) {
  return (error as { response?: { data?: { error?: string } } })?.response?.data?.error || fallback;
}

function EmptyState({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <S.Empty>
      <Icon />
      <b>{title}</b>
      <span>{text}</span>
    </S.Empty>
  );
}

function Overview({
  snapshot,
  onGo,
}: {
  snapshot: AttendantWorkspaceSnapshot;
  onGo: (view: AttendantView) => void;
}) {
  const now = snapshotTime(snapshot);
  const overdue = snapshot.orders.filter((order) => isDelayed(order, now)).length;
  const ready = snapshot.orders.filter((order) => order.status === 'PRONTO').length;
  const waitingCalls = snapshot.calls.filter((call) => call.status === 'WAITING').length;
  const closingTables = snapshot.tables.filter(
    (table) => table.status === 'CLOSING_REQUESTED',
  ).length;

  const cards: Array<{
    icon: LucideIcon;
    label: string;
    value: number;
    text: string;
    tone: 'danger' | 'warning' | 'success' | 'info';
    view: AttendantView;
  }> = [
    {
      icon: AlertTriangle,
      label: 'Pedidos demorando',
      value: overdue,
      text: overdue ? 'Confira estes pedidos primeiro.' : 'Nenhum pedido acima do tempo de atenção.',
      tone: 'danger',
      view: 'orders',
    },
    {
      icon: PackageCheck,
      label: 'Prontos agora',
      value: ready,
      text: ready ? 'Aguardam retirada, mesa ou entrega.' : 'A cozinha ainda não liberou pedidos.',
      tone: 'success',
      view: 'orders',
    },
    {
      icon: BellRing,
      label: 'Chamados aguardando',
      value: waitingCalls,
      text: waitingCalls ? 'Assuma o mais antigo para evitar espera.' : 'Nenhuma mesa esperando atendimento.',
      tone: 'warning',
      view: 'calls',
    },
    {
      icon: Armchair,
      label: 'Contas solicitadas',
      value: closingTables,
      text: closingTables ? 'Essas mesas pediram fechamento da conta.' : 'Nenhuma conta solicitada agora.',
      tone: 'info',
      view: 'tables',
    },
  ];

  const priorityCalls = snapshot.calls
    .filter((call) => call.status !== 'RESOLVED')
    .sort((a, b) => a.requestedAt.localeCompare(b.requestedAt))
    .slice(0, 3);
  const readyOrders = snapshot.orders.filter((order) => order.status === 'PRONTO').slice(0, 4);

  return (
    <>
      <S.SectionTitle>
        <h2>Precisa da sua atenção agora</h2>
        <p>Comece pelo que pode estar fazendo um cliente esperar.</p>
      </S.SectionTitle>
      <S.PriorityGrid>
        {cards.map(({ icon: Icon, label, value, text, tone, view }) => (
          <S.PriorityCard key={label} $tone={tone} type="button" onClick={() => onGo(view)}>
            <span className="icon"><Icon /></span>
            <span><small>{label}</small><strong>{value}</strong><p>{text}</p></span>
            <ChevronRight />
          </S.PriorityCard>
        ))}
      </S.PriorityGrid>
      <S.Guide>
        <CircleHelp />
        <div>
          <strong>Ordem sugerida de trabalho</strong>
          <p>
            Confira pedidos demorando, assuma chamados antigos e depois libere pedidos prontos.
            Assim a tela já ajuda o funcionário a decidir o próximo passo.
          </p>
        </div>
      </S.Guide>
      <S.TwoCols>
        <S.Panel>
          <S.PanelHead>
            <div><BellRing /><span><strong>Chamados prioritários</strong><small>Mais antigos primeiro</small></span></div>
            <S.TextButton type="button" onClick={() => onGo('calls')}>Ver todos <ChevronRight /></S.TextButton>
          </S.PanelHead>
          {priorityCalls.length ? priorityCalls.map((call) => (
            <S.MiniRow key={call.id}>
              <span className="badge">Mesa {String(call.tableNumber).padStart(2, '0')}</span>
              <span>
                <b>{call.type === 'BILL' ? 'Fechamento de conta' : 'Atendimento no salão'}</b>
                <small>{call.status === 'IN_PROGRESS' ? `Com ${call.assignedToName || 'equipe'}` : 'Aguardando alguém assumir'}</small>
              </span>
              <time>{elapsed(call.requestedAt, now)}</time>
            </S.MiniRow>
          )) : (
            <EmptyState icon={CheckCircle2} title="Salão sem chamados" text="Nenhuma solicitação aguarda atendimento." />
          )}
        </S.Panel>
        <S.Panel>
          <S.PanelHead>
            <div><PackageCheck /><span><strong>Pedidos prontos</strong><small>Evite deixar pedido parado</small></span></div>
            <S.TextButton type="button" onClick={() => onGo('orders')}>Ver fila <ChevronRight /></S.TextButton>
          </S.PanelHead>
          {readyOrders.length ? readyOrders.map((order) => (
            <S.MiniRow key={order.id}>
              <span className="badge">{order.code}</span>
              <span><b>{order.customerName || orderPlace(order)}</b><small>{orderPlace(order)} · {order.items.length} item(ns)</small></span>
              <time>{elapsed(order.readyAt || order.createdAt, now)}</time>
            </S.MiniRow>
          )) : (
            <EmptyState icon={Clock3} title="Nenhum pedido pronto" text="Quando a cozinha liberar, ele aparece aqui." />
          )}
        </S.Panel>
      </S.TwoCols>
    </>
  );
}

function OrderDrawer({
  orderId,
  fallback,
  onClose,
  onCompleted,
}: {
  orderId: number;
  fallback: AttendantOrder;
  onClose: () => void;
  onCompleted: () => void;
}) {
  const [data, setData] = useState<Raw | null>(null);
  const [loading, setLoading] = useState(true);
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    let active = true;
    attendantApi.getOrder(orderId)
      .then((value) => {
        if (active) setData(value);
      })
      .catch(() => toast.error('Não foi possível carregar os detalhes do pedido.'))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [orderId]);

  const order = data || {};
  const customer = record(order.user);
  const items = Array.isArray(order.items) ? order.items : [];
  const type = String(order.type || fallback.type);
  const status = String(order.status || fallback.status);
  const paid = Boolean(order.paid);
  const canFinishPickup = type === 'RETIRADA' && status === 'PRONTO';

  async function finishPickup() {
    setFinishing(true);
    try {
      await attendantApi.completePickup(orderId);
      toast.success('Retirada concluída. O pedido foi entregue ao cliente.');
      onCompleted();
      onClose();
    } catch (error) {
      toast.error(errorMessage(error, 'Não foi possível concluir a retirada.'));
    } finally {
      setFinishing(false);
    }
  }

  return (
    <S.DrawerBackdrop onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <S.Drawer role="dialog" aria-modal="true" aria-label="Detalhes do pedido">
        <S.DrawerHead>
          <div><small>Pedido</small><strong>{fallback.code}</strong><span>{statusText(status)}</span></div>
          <button type="button" aria-label="Fechar detalhes" onClick={onClose}><X /></button>
        </S.DrawerHead>
        {loading ? (
          <EmptyState icon={RefreshCw} title="Carregando pedido..." text="Buscando os dados completos." />
        ) : (
          <S.DrawerBody>
            <S.InfoGrid>
              <S.Info><small>Cliente</small><b>{String(customer.name || fallback.customerName || 'Cliente')}</b><span>{String(customer.phone || 'Telefone não informado')}</span></S.Info>
              <S.Info><small>Canal</small><b>{type === 'DELIVERY' ? 'Delivery' : type === 'MESA' ? 'Mesa' : 'Retirada'}</b><span>{paid ? 'Pagamento confirmado' : 'Pagamento pendente'}</span></S.Info>
            </S.InfoGrid>
            {type === 'DELIVERY' && (
              <S.Info><small>Endereço</small><b><MapPin /> {String(order.address || 'Endereço não informado')}, {String(order.number || '')}</b><span>{[order.district, order.city, order.state].filter(Boolean).join(' · ')}</span></S.Info>
            )}
            <div>
              <S.Subhead>Itens do pedido</S.Subhead>
              <S.ItemList>
                {items.length ? items.map((item, index) => {
                  const itemData = record(item);
                  const product = record(itemData.product);
                  return (
                    <li key={String(itemData.id || index)}>
                      <b>{Number(itemData.quantity || 1)}× {String(product.name || itemData.productName || 'Item')}</b>
                      {itemData.observation ? <span>{String(itemData.observation)}</span> : null}
                    </li>
                  );
                }) : fallback.items.map((item) => (
                  <li key={item.productName}><b>{item.quantity}× {item.productName}</b></li>
                ))}
              </S.ItemList>
            </div>
            <S.InfoGrid>
              <S.Info><small>Total</small><b>{money(order.total)}</b></S.Info>
              <S.Info><small>Próximo passo</small><b>{canFinishPickup ? paid ? 'Entregar ao cliente' : 'Confirmar pagamento' : status === 'PRONTO' ? 'Encaminhar ao responsável' : 'Acompanhar preparo'}</b></S.Info>
            </S.InfoGrid>
            {canFinishPickup && (
              <S.ActionBox $warning={!paid}>
                <strong>{paid ? 'Pedido pronto para retirada' : 'Pagamento ainda não confirmado'}</strong>
                <p>{paid ? 'Depois de entregar ao cliente, conclua a retirada para remover o pedido da fila ativa.' : 'A retirada só pode ser concluída depois que o pagamento estiver confirmado.'}</p>
                <button type="button" disabled={!paid || finishing} onClick={() => void finishPickup()}><CheckCircle2 /> {finishing ? 'Concluindo...' : 'Confirmar retirada entregue'}</button>
              </S.ActionBox>
            )}
          </S.DrawerBody>
        )}
      </S.Drawer>
    </S.DrawerBackdrop>
  );
}

function Orders({ snapshot, onOpen }: { snapshot: AttendantWorkspaceSnapshot; onOpen: (order: AttendantOrder) => void }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('ALL');
  const now = snapshotTime(snapshot);
  const visible = snapshot.orders.filter((order) => {
    const delayed = isDelayed(order, now);
    const statusMatch = filter === 'ALL' || (filter === 'ATRASADO' ? delayed : order.status === filter);
    const haystack = [order.code, order.customerName, orderPlace(order), ...order.items.map((item) => item.productName)]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return statusMatch && haystack.includes(query.trim().toLowerCase());
  });

  const filters = [
    ['ALL', 'Todos'],
    ['PENDENTE', 'Novos'],
    ['PREPARANDO', 'Em preparo'],
    ['PRONTO', 'Prontos'],
    ['ATRASADO', 'Atrasados'],
  ];

  return (
    <>
      <S.Toolbar>
        <S.SearchBox><Search /><input aria-label="Buscar pedidos" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar pedido, cliente, mesa ou item" /></S.SearchBox>
        <S.Filters>
          {filters.map(([value, label]) => (
            <button type="button" key={value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{label}</button>
          ))}
        </S.Filters>
      </S.Toolbar>
      <S.OrderList>
        {visible.map((order) => {
          const delayed = isDelayed(order, now);
          return (
            <S.OrderCard key={order.id} $attention={delayed}>
              <div className="status"><span>{order.code}</span><em>{delayed ? 'Precisa de atenção' : statusText(order.status)}</em></div>
              <div className="main"><strong>{order.customerName || orderPlace(order)}</strong><small>{orderPlace(order)} · {order.items.map((item) => `${item.quantity}× ${item.productName}`).join(' · ') || 'Itens não informados'}</small></div>
              <div className="time"><Clock3 /><span>{elapsed(order.createdAt, now)}</span></div>
              <button type="button" onClick={() => onOpen(order)}>Ver detalhes <ChevronRight /></button>
            </S.OrderCard>
          );
        })}
        {!visible.length && <EmptyState icon={Search} title="Nenhum pedido encontrado" text="Tente remover algum filtro ou buscar outro termo." />}
      </S.OrderList>
    </>
  );
}

function CreateOrder({ restaurantId, onCreated }: { restaurantId: number; onCreated: () => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Cart>({});
  const [type, setType] = useState<'RETIRADA' | 'DELIVERY'>('RETIRADA');
  const [customerName, setCustomerName] = useState('');
  const [customerCpf, setCustomerCpf] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [payment, setPayment] = useState<'CARTAO' | 'PIX'>('CARTAO');
  const [submitting, setSubmitting] = useState(false);
  const [address, setAddress] = useState({
    address: '', number: '', district: '', city: '', state: '', zipCode: '', complement: '',
  });

  useEffect(() => {
    let active = true;
    productsService.listProducts(restaurantId)
      .then((values) => {
        if (!active) return;
        const normalized = (Array.isArray(values) ? values : []).flatMap((value: unknown) => {
          const item = record(value);
          const id = Number(item.id);
          const name = String(item.name || '').trim();
          if (!Number.isSafeInteger(id) || id <= 0 || !name) return [];
          const price = Number(item.price);
          return [{ id, name, price: Number.isFinite(price) ? price : 0, stock: item.stock == null ? null : Number(item.stock) }];
        });
        setProducts(normalized);
      })
      .catch(() => toast.error('Não foi possível carregar o cardápio.'));
    return () => { active = false; };
  }, [restaurantId]);

  const selected = products.filter((product) => (cart[product.id] || 0) > 0);
  const total = selected.reduce((sum, product) => sum + product.price * (cart[product.id] || 0), 0);

  function changeQuantity(id: number, delta: number) {
    setCart((current) => ({ ...current, [id]: Math.max(0, (current[id] || 0) + delta) }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (customerName.trim().length < 2) return void toast.warning('Informe o nome do cliente.');
    if (customerCpf.replace(/\D/g, '').length !== 11) return void toast.warning('Informe o CPF do cliente com 11 dígitos.');
    if (customerPhone.replace(/\D/g, '').length < 10) return void toast.warning('Informe um telefone com DDD.');
    if (!selected.length) return void toast.warning('Adicione pelo menos um item ao pedido.');
    if (type === 'DELIVERY' && (!address.address.trim() || !address.number.trim() || !address.district.trim() || !address.city.trim() || address.state.trim().length !== 2 || address.zipCode.replace(/\D/g, '').length !== 8)) {
      return void toast.warning('Preencha o endereço completo do delivery.');
    }

    setSubmitting(true);
    try {
      const payload: Raw = {
        restaurantId,
        type,
        customerName: customerName.trim(),
        customerCpf: customerCpf.replace(/\D/g, ''),
        customerPhone: customerPhone.trim(),
        items: selected.map((product) => ({ productId: product.id, quantity: cart[product.id] })),
        payOnDelivery: type === 'DELIVERY',
      };
      if (type === 'DELIVERY') {
        Object.assign(payload, address, { paymentMethod: payment, payOnDeliveryMethod: payment });
      }
      await attendantApi.createOrder(payload);
      toast.success('Pedido registrado. Ele já entrou na operação.');
      onCreated();
    } catch (error) {
      toast.error(errorMessage(error, 'Não foi possível registrar o pedido.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <S.Form onSubmit={submit}>
      <S.Guide><CircleHelp /><div><strong>Quando usar?</strong><p>Pedidos por telefone, WhatsApp ou balcão. Pedido de mesa continua pela sessão/QR para preservar o vínculo da mesa.</p></div></S.Guide>
      <S.Step>
        <span>1</span>
        <div><h3>Como o cliente vai receber?</h3><p>Escolha retirada ou delivery.</p><S.ChoiceRow><button type="button" className={type === 'RETIRADA' ? 'active' : ''} onClick={() => setType('RETIRADA')}><Store /> Retirada no balcão</button><button type="button" className={type === 'DELIVERY' ? 'active' : ''} onClick={() => setType('DELIVERY')}><Truck /> Delivery</button></S.ChoiceRow></div>
      </S.Step>
      <S.Step>
        <span>2</span>
        <div><h3>Quem é o cliente?</h3><p>Esses dados identificam corretamente o pedido.</p><S.FieldGrid><label>Nome<input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Ex.: Samuel Gomes" /></label><label>Telefone<input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} placeholder="(85) 99999-9999" /></label><label>CPF<input value={customerCpf} onChange={(event) => setCustomerCpf(event.target.value)} placeholder="000.000.000-00" /></label></S.FieldGrid></div>
      </S.Step>
      {type === 'DELIVERY' && (
        <S.Step>
          <span>3</span>
          <div><h3>Para onde vai o pedido?</h3><p>Revise o endereço antes de confirmar.</p><S.FieldGrid><label>Rua<input value={address.address} onChange={(event) => setAddress({ ...address, address: event.target.value })} /></label><label>Número<input value={address.number} onChange={(event) => setAddress({ ...address, number: event.target.value })} /></label><label>Bairro<input value={address.district} onChange={(event) => setAddress({ ...address, district: event.target.value })} /></label><label>Cidade<input value={address.city} onChange={(event) => setAddress({ ...address, city: event.target.value })} /></label><label>UF<input maxLength={2} value={address.state} onChange={(event) => setAddress({ ...address, state: event.target.value.toUpperCase() })} /></label><label>CEP<input value={address.zipCode} onChange={(event) => setAddress({ ...address, zipCode: event.target.value })} /></label><label className="wide">Complemento<input value={address.complement} onChange={(event) => setAddress({ ...address, complement: event.target.value })} /></label></S.FieldGrid><S.ChoiceRow><button type="button" className={payment === 'CARTAO' ? 'active' : ''} onClick={() => setPayment('CARTAO')}>Cartão na entrega</button><button type="button" className={payment === 'PIX' ? 'active' : ''} onClick={() => setPayment('PIX')}>Pix na entrega</button></S.ChoiceRow></div>
        </S.Step>
      )}
      <S.Step>
        <span>{type === 'DELIVERY' ? '4' : '3'}</span>
        <div><h3>Monte o pedido</h3><p>Use + e − para ajustar a quantidade.</p><S.Products>{products.map((product) => { const quantity = cart[product.id] || 0; const unavailable = product.stock === 0; return <S.ProductRow key={product.id} $disabled={unavailable}><span><b>{product.name}</b><small>{money(product.price)}{unavailable ? ' · Indisponível' : ''}</small></span><div><button type="button" aria-label={`Remover ${product.name}`} disabled={!quantity} onClick={() => changeQuantity(product.id, -1)}>−</button><strong>{quantity}</strong><button type="button" aria-label={`Adicionar ${product.name}`} disabled={unavailable} onClick={() => changeQuantity(product.id, 1)}>+</button></div></S.ProductRow>; })}</S.Products></div>
      </S.Step>
      <S.Review><span><small>Total estimado</small><strong>{money(total)}</strong><p>{selected.length} produto(s) selecionado(s)</p></span><button type="submit" disabled={submitting || !selected.length}><CheckCircle2 /> {submitting ? 'Registrando...' : 'Confirmar pedido'}</button></S.Review>
    </S.Form>
  );
}

function Calls({ calls, attendantId, onChanged }: { calls: AttendantCall[]; attendantId: number; onChanged: () => void }) {
  const [mode, setMode] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');
  const visible = calls.filter((call) => mode === 'ACTIVE' ? call.status !== 'RESOLVED' : call.status === 'RESOLVED').sort((a, b) => a.requestedAt.localeCompare(b.requestedAt));

  async function update(call: AttendantCall, status: 'IN_PROGRESS' | 'RESOLVED') {
    try {
      await attendantApi.updateCallStatus(call.id, status);
      toast.success(status === 'IN_PROGRESS' ? 'Chamado assumido. A equipe sabe que você está cuidando dele.' : 'Chamado resolvido.');
      onChanged();
    } catch (error) {
      toast.error(errorMessage(error, 'Não foi possível atualizar o chamado.'));
    }
  }

  return (
    <><S.Toolbar><S.Filters><button type="button" className={mode === 'ACTIVE' ? 'active' : ''} onClick={() => setMode('ACTIVE')}>Aguardando / em atendimento</button><button type="button" className={mode === 'HISTORY' ? 'active' : ''} onClick={() => setMode('HISTORY')}>Resolvidos hoje</button></S.Filters></S.Toolbar><S.OrderList>{visible.map((call) => { const mine = call.assignedToId === attendantId; return <S.CallCard key={call.id}><span className="table">Mesa {String(call.tableNumber).padStart(2, '0')}</span><div><strong>{call.type === 'BILL' ? 'Fechamento de conta' : 'Atendimento no salão'}</strong><small>{call.status === 'WAITING' ? 'Ninguém assumiu ainda.' : call.status === 'IN_PROGRESS' ? `Em atendimento por ${call.assignedToName || 'equipe'}.` : `Resolvido por ${call.assignedToName || 'equipe'}.`}</small></div><time>{call.status === 'RESOLVED' ? 'Resolvido' : 'Ativo'}</time>{call.status === 'WAITING' && <button type="button" onClick={() => void update(call, 'IN_PROGRESS')}>Assumir chamado</button>}{call.status === 'IN_PROGRESS' && mine && <button type="button" className="success" onClick={() => void update(call, 'RESOLVED')}>Marcar como resolvido</button>}</S.CallCard>; })}{!visible.length && <EmptyState icon={CheckCircle2} title="Nenhum chamado nesta lista" text="Quando uma mesa pedir ajuda, o chamado aparece aqui." />}</S.OrderList></>
  );
}

function Tables({ snapshot }: { snapshot: AttendantWorkspaceSnapshot }) {
  if (!snapshot.tables.length) return <EmptyState icon={Armchair} title="Nenhuma mesa em operação" text="As mesas abertas aparecerão aqui." />;
  return <S.TableGrid>{snapshot.tables.map((table) => { const attention = table.status === 'CLOSING_REQUESTED' || table.activeCallCount > 0; return <S.TableCard key={table.id} $attention={attention}><header><span><small>Mesa</small><strong>{String(table.tableNumber).padStart(2, '0')}</strong></span><em>{table.status === 'CLOSING_REQUESTED' ? 'Conta solicitada' : table.activeCallCount ? 'Precisa de atenção' : 'Ocupada'}</em></header><div><span><Users /> <b>{table.participantCount}</b> pessoas</span><span><ShoppingBag /> <b>{table.activeOrderCount}</b> pedidos</span><span><BellRing /> <b>{table.activeCallCount}</b> chamados</span></div><p>{table.status === 'CLOSING_REQUESTED' ? 'A mesa pediu o fechamento da conta. Priorize o atendimento.' : table.activeCallCount ? 'Existe uma solicitação aberta para esta mesa.' : 'Mesa sem pendências sinalizadas agora.'}</p></S.TableCard>; })}</S.TableGrid>;
}

function Deliveries({ snapshot, onOpen }: { snapshot: AttendantWorkspaceSnapshot; onOpen: (order: AttendantOrder) => void }) {
  const now = snapshotTime(snapshot);
  const deliveries = snapshot.orders.filter((order) => order.type === 'DELIVERY');
  return <><S.Guide><Truck /><div><strong>O que acompanhar aqui</strong><p>A cozinha controla o preparo e o motoqueiro controla a entrega. O atendente acompanha e orienta o cliente sem avançar etapas de outros papéis.</p></div></S.Guide><S.OrderList>{deliveries.map((order) => <S.OrderCard key={order.id} $attention={order.status === 'PRONTO'}><div className="status"><span>{order.code}</span><em>{statusText(order.status)}</em></div><div className="main"><strong>{order.customerName || 'Cliente'}</strong><small>{order.status === 'PRONTO' ? 'Pronto para seguir para a etapa de entrega.' : 'Acompanhe o preparo sem prometer horário sem confirmação.'}</small></div><div className="time"><Clock3 /><span>{elapsed(order.createdAt, now)}</span></div><button type="button" onClick={() => onOpen(order)}>Ver pedido <ChevronRight /></button></S.OrderCard>)}{!deliveries.length && <EmptyState icon={Truck} title="Nenhum delivery ativo" text="Pedidos de entrega aparecem aqui enquanto estiverem na operação." />}</S.OrderList></>;
}

function Support() {
  const [orders, setOrders] = useState<Raw[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [thread, setThread] = useState<SupportThread | null>(null);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);

  async function load() {
    try {
      const data = await ordersService.listRestaurantOrders();
      setOrders(Array.isArray(data) ? (data as Raw[]) : []);
    } catch {
      toast.error('Não foi possível atualizar os atendimentos.');
    }
  }

  useEffect(() => {
    queueMicrotask(() => void load());
  }, []);

  const conversations = useMemo(() => orders.flatMap((order): SupportSummary[] => {
    const issue = record(order.issueThread);
    if (!Object.keys(issue).length) return [];
    const messages = Array.isArray(issue.messages) ? issue.messages : [];
    const last = messages.length ? record(messages[messages.length - 1]) : {};
    const orderId = Number(order.id || issue.orderId);
    if (!Number.isSafeInteger(orderId) || orderId <= 0) return [];
    return [{ orderId, customer: String(record(order.user).name || issue.customerName || 'Cliente'), lastMessage: String(last.message || 'Atendimento iniciado'), resolved: Boolean(issue.isResolved) }];
  }), [orders]);

  async function open(orderId: number) {
    setSelected(orderId);
    setLoading(true);
    try {
      const data = await ordersService.getIssueThread(orderId);
      setThread({ orderId, customerName: String(data?.customerName || 'Cliente'), orderStatus: String(data?.orderStatus || ''), isResolved: Boolean(data?.isResolved), messages: Array.isArray(data?.messages) ? data.messages : [] });
    } catch (error) {
      toast.error(errorMessage(error, 'Não foi possível abrir este atendimento.'));
    } finally {
      setLoading(false);
    }
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    if (!selected || !draft.trim()) return;
    try {
      const data = await ordersService.replyIssue(selected, draft.trim());
      setDraft('');
      setThread((current) => current ? { ...current, messages: Array.isArray(data?.messages) ? data.messages : current.messages } : current);
      await load();
    } catch (error) {
      toast.error(errorMessage(error, 'Não foi possível responder.'));
    }
  }

  async function resolve() {
    if (!selected) return;
    try {
      await ordersService.resolveIssue(selected);
      setThread((current) => current ? { ...current, isResolved: true } : current);
      toast.success('Atendimento encerrado.');
      await load();
    } catch (error) {
      toast.error(errorMessage(error, 'Não foi possível encerrar o atendimento.'));
    }
  }

  return <S.SupportLayout><S.Panel><S.PanelHead><div><Headphones /><span><strong>Conversas dos pedidos</strong><small>{conversations.filter((item) => !item.resolved).length} aguardando solução</small></span></div><S.TextButton type="button" onClick={() => void load()}><RefreshCw /> Atualizar</S.TextButton></S.PanelHead><S.SupportList>{conversations.map((item) => <button type="button" key={item.orderId} className={selected === item.orderId ? 'active' : ''} onClick={() => void open(item.orderId)}><span><b>Pedido #{item.orderId} · {item.customer}</b><small>{item.lastMessage}</small></span><em>{item.resolved ? 'Resolvido' : 'Aberto'}</em></button>)}{!conversations.length && <EmptyState icon={CheckCircle2} title="Nenhum atendimento aberto" text="Quando um cliente pedir ajuda pelo pedido, a conversa aparece aqui." />}</S.SupportList></S.Panel><S.Panel>{selected ? <><S.PanelHead><div><Headphones /><span><strong>Pedido #{selected}</strong><small>{thread?.customerName || 'Cliente'} · {thread?.orderStatus ? statusText(thread.orderStatus) : 'Carregando'}</small></span></div>{thread && !thread.isResolved && <S.TextButton type="button" onClick={() => void resolve()}><CheckCircle2 /> Resolver</S.TextButton>}</S.PanelHead><S.Chat>{loading ? <EmptyState icon={RefreshCw} title="Carregando conversa..." text="Buscando as mensagens." /> : <>{thread?.messages.map((message, index) => { const staff = String(message.senderType || '').toUpperCase() === 'ADMIN'; return <S.Bubble key={String(message.id || index)} $staff={staff}><b>{staff ? 'Restaurante' : message.senderName || 'Cliente'}</b><p>{message.message}</p>{message.sentAt ? <time>{new Date(message.sentAt).toLocaleString('pt-BR')}</time> : null}</S.Bubble>; })}{thread?.isResolved && <S.Resolved><CheckCircle2 /> Atendimento resolvido</S.Resolved>}</>}</S.Chat>{thread && !thread.isResolved && <S.Composer onSubmit={send}><textarea aria-label="Responder cliente" value={draft} onChange={(event) => setDraft(event.target.value.slice(0, 600))} placeholder="Escreva uma resposta curta e clara..." /><button type="submit" disabled={!draft.trim()} aria-label="Enviar resposta"><Send /></button></S.Composer>}</> : <EmptyState icon={Headphones} title="Escolha um atendimento" text="Você verá a conversa e a situação do pedido deste lado." />}</S.Panel></S.SupportLayout>;
}

export function AttendantOperationCenter({ attendantId, attendantName, restaurantId, restaurant, snapshot, workspaceState, onRefresh, onLogout }: Props) {
  const [view, setView] = useState<AttendantView>('overview');
  const [selectedOrder, setSelectedOrder] = useState<AttendantOrder | null>(null);
  const meta = viewMeta[view];
  const initials = attendantName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'AT';
  const shellStyle = { '--brand': restaurant.primaryColor } as CSSProperties;

  return (
    <S.Shell style={shellStyle}>
      <S.Sidebar><S.Brand><span>{restaurant.monogram}</span><div><strong>{restaurant.name}</strong><small>Central do atendente</small></div></S.Brand><S.Nav aria-label="Navegação do atendente">{(Object.keys(viewMeta) as AttendantView[]).map((id) => { const Icon = viewMeta[id].icon; return <button type="button" key={id} className={view === id ? 'active' : ''} onClick={() => setView(id)}><Icon /><span>{viewMeta[id].label}</span></button>; })}</S.Nav><S.Profile><span>{initials}</span><div><b>{attendantName}</b><small>Atendente</small></div><button type="button" onClick={onLogout} aria-label="Sair"><LogOut /></button></S.Profile></S.Sidebar>
      <S.Main><S.Topbar><div><span className="eyebrow">Operação em tempo real</span><h1>{meta.title}</h1><p>{meta.subtitle}</p></div><div className="sync"><span className={workspaceState.error ? 'offline' : 'online'}>{workspaceState.error ? 'Dados preservados' : 'Operação atualizada'}</span><button type="button" onClick={() => void onRefresh()} disabled={workspaceState.refreshing}><RefreshCw /> Atualizar</button></div></S.Topbar>{workspaceState.error && <S.ErrorBanner><AlertTriangle /><div><b>Não conseguimos atualizar agora</b><span>{workspaceState.error}</span></div></S.ErrorBanner>}<S.Content>{workspaceState.loading ? <EmptyState icon={RefreshCw} title="Carregando a operação..." text="Buscando pedidos, mesas e chamados." /> : view === 'overview' ? <Overview snapshot={snapshot} onGo={setView} /> : view === 'orders' ? <Orders snapshot={snapshot} onOpen={setSelectedOrder} /> : view === 'create' ? <CreateOrder restaurantId={restaurantId} onCreated={() => { void onRefresh(); setView('orders'); }} /> : view === 'support' ? <Support /> : view === 'deliveries' ? <Deliveries snapshot={snapshot} onOpen={setSelectedOrder} /> : view === 'tables' ? <Tables snapshot={snapshot} /> : <Calls calls={snapshot.calls} attendantId={attendantId} onChanged={() => void onRefresh()} />}</S.Content></S.Main>
      {selectedOrder && <OrderDrawer orderId={selectedOrder.orderId} fallback={selectedOrder} onClose={() => setSelectedOrder(null)} onCompleted={() => void onRefresh()} />}
    </S.Shell>
  );
}
