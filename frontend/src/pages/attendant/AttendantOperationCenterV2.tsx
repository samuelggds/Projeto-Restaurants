import {
  AlertTriangle,
  Armchair,
  BellRing,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  Clock3,
  Headphones,
  ImageOff,
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
import styled from 'styled-components';
import { toast } from 'react-toastify';
import ordersService from '../../Services/ordersService';
import productsService from '../../Services/productsService';
import attendantApi from './attendantApi';
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
type Product = {
  id: number;
  name: string;
  price: number;
  stock: number | null;
  category: string;
  image: string | null;
};
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

const PAGE_SIZE = 10;

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
    subtitle: 'Pesquise, filtre e acompanhe a fila sem perder pendências antigas.',
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

function asRecord(value: unknown): Raw {
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

function pendingDays(value: string, referenceTime: number) {
  const source = new Date(value);
  const reference = new Date(referenceTime);
  if (!Number.isFinite(source.getTime()) || !Number.isFinite(reference.getTime())) return 0;
  const sourceDay = new Date(source.getFullYear(), source.getMonth(), source.getDate()).getTime();
  const referenceDay = new Date(
    reference.getFullYear(),
    reference.getMonth(),
    reference.getDate(),
  ).getTime();
  return Math.max(0, Math.floor((referenceDay - sourceDay) / 86_400_000));
}

function ageLabel(value: string, referenceTime: number) {
  const days = pendingDays(value, referenceTime);
  if (days === 0) return 'Hoje';
  if (days === 1) return 'Desde ontem';
  return `Há ${days} dias`;
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
    <Empty>
      <Icon />
      <b>{title}</b>
      <span>{text}</span>
    </Empty>
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
  const oldOrders = snapshot.orders.filter((order) => pendingDays(order.createdAt, now) > 0).length;
  const oldCalls = snapshot.calls.filter(
    (call) => call.status !== 'RESOLVED' && pendingDays(call.requestedAt, now) > 0,
  ).length;
  const oldTables = snapshot.tables.filter((table) => pendingDays(table.openedAt, now) > 0).length;
  const overdue = snapshot.orders.filter((order) => isDelayed(order, now)).length;
  const ready = snapshot.orders.filter((order) => order.status === 'PRONTO').length;
  const waitingCalls = snapshot.calls.filter((call) => call.status === 'WAITING').length;
  const cards = [
    {
      icon: AlertTriangle,
      label: 'Pendências antigas',
      value: oldOrders + oldCalls + oldTables,
      text: 'Itens de dias anteriores que ainda precisam ser resolvidos.',
      view: 'orders' as AttendantView,
    },
    {
      icon: Clock3,
      label: 'Pedidos demorando',
      value: overdue,
      text: 'Pedidos acima do tempo de atenção.',
      view: 'orders' as AttendantView,
    },
    {
      icon: PackageCheck,
      label: 'Prontos agora',
      value: ready,
      text: 'Pedidos aguardando a próxima etapa.',
      view: 'orders' as AttendantView,
    },
    {
      icon: BellRing,
      label: 'Chamados aguardando',
      value: waitingCalls,
      text: 'Mesas aguardando alguém assumir o chamado.',
      view: 'calls' as AttendantView,
    },
  ];
  const priorityOrders = [...snapshot.orders]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .slice(0, 5);

  return (
    <>
      <SectionTitle>
        <h2>Precisa da sua atenção agora</h2>
        <p>Pendências antigas aparecem primeiro para nada sumir quando virar o dia.</p>
      </SectionTitle>
      <PriorityGrid>
        {cards.map(({ icon: Icon, label, value, text, view }) => (
          <PriorityCard key={label} type="button" onClick={() => onGo(view)}>
            <span className="icon"><Icon /></span>
            <span><small>{label}</small><strong>{value}</strong><p>{text}</p></span>
            <ChevronRight />
          </PriorityCard>
        ))}
      </PriorityGrid>
      <Guide>
        <CircleHelp />
        <div>
          <strong>Ordem sugerida de trabalho</strong>
          <p>Comece pelas pendências anteriores, depois pedidos demorando, chamados e pedidos prontos.</p>
        </div>
      </Guide>
      <Panel>
        <PanelHead>
          <div><ClipboardList /><span><strong>Fila prioritária</strong><small>Mais antigos primeiro</small></span></div>
          <TextButton type="button" onClick={() => onGo('orders')}>Ver todos <ChevronRight /></TextButton>
        </PanelHead>
        {priorityOrders.length ? priorityOrders.map((order) => (
          <MiniRow key={order.id}>
            <span className="badge">{order.code}</span>
            <span><b>{order.customerName || orderPlace(order)}</b><small>{orderPlace(order)} · {ageLabel(order.createdAt, now)}</small></span>
            <time>{elapsed(order.createdAt, now)}</time>
          </MiniRow>
        )) : <EmptyState icon={CheckCircle2} title="Fila tranquila" text="Nenhum pedido ativo agora." />}
      </Panel>
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
    attendantApi
      .getOrder(orderId)
      .then((value) => { if (active) setData(value); })
      .catch(() => toast.error('Não foi possível carregar os detalhes do pedido.'))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [orderId]);

  const order = data || {};
  const customer = asRecord(order.user);
  const items = Array.isArray(order.items) ? order.items : [];
  const type = String(order.type || fallback.type);
  const status = String(order.status || fallback.status);
  const paid = Boolean(order.paid);
  const canFinishPickup = type === 'RETIRADA' && status === 'PRONTO';

  async function finishPickup() {
    setFinishing(true);
    try {
      await attendantApi.completePickup(orderId);
      toast.success('Retirada concluída.');
      onCompleted();
      onClose();
    } catch (error) {
      toast.error(errorMessage(error, 'Não foi possível concluir a retirada.'));
    } finally {
      setFinishing(false);
    }
  }

  return (
    <DrawerBackdrop onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <Drawer role="dialog" aria-modal="true" aria-label="Detalhes do pedido">
        <DrawerHead>
          <div><small>Pedido</small><strong>{fallback.code}</strong><em>{statusText(status)}</em></div>
          <button type="button" aria-label="Fechar detalhes" onClick={onClose}><X /></button>
        </DrawerHead>
        {loading ? (
          <EmptyState icon={RefreshCw} title="Carregando pedido..." text="Buscando os dados completos." />
        ) : (
          <DrawerBody>
            <InfoGrid>
              <Info><small>Cliente</small><b>{String(customer.name || fallback.customerName || 'Cliente')}</b><span>{String(customer.phone || 'Telefone não informado')}</span></Info>
              <Info><small>Canal</small><b>{type === 'DELIVERY' ? 'Delivery' : type === 'MESA' ? 'Mesa' : 'Retirada'}</b><span>{paid ? 'Pagamento confirmado' : 'Pagamento pendente'}</span></Info>
            </InfoGrid>
            {type === 'DELIVERY' && (
              <Info><small>Endereço</small><b><MapPin /> {String(order.address || 'Endereço não informado')}, {String(order.number || '')}</b><span>{[order.district, order.city, order.state].filter(Boolean).join(' · ')}</span></Info>
            )}
            <ItemBox>
              <h3>Itens do pedido</h3>
              {items.length ? items.map((item, index) => {
                const itemData = asRecord(item);
                const product = asRecord(itemData.product);
                return (
                  <div key={String(itemData.id || index)}>
                    <b>{Number(itemData.quantity || 1)}× {String(product.name || itemData.productName || 'Item')}</b>
                    {itemData.observation ? <span>{String(itemData.observation)}</span> : null}
                  </div>
                );
              }) : fallback.items.map((item) => <div key={item.productName}><b>{item.quantity}× {item.productName}</b></div>)}
            </ItemBox>
            <InfoGrid>
              <Info><small>Total</small><b className="total">{money(order.total)}</b></Info>
              <Info><small>Próximo passo</small><b>{canFinishPickup ? paid ? 'Entregar ao cliente' : 'Confirmar pagamento' : status === 'PRONTO' ? 'Encaminhar ao responsável' : 'Acompanhar preparo'}</b></Info>
            </InfoGrid>
            {canFinishPickup && (
              <ActionBox $warning={!paid}>
                <strong>{paid ? 'Pedido pronto para retirada' : 'Pagamento ainda não confirmado'}</strong>
                <p>{paid ? 'Entregue ao cliente e conclua a retirada.' : 'A retirada só pode ser concluída depois da confirmação do pagamento.'}</p>
                <button type="button" disabled={!paid || finishing} onClick={() => void finishPickup()}>
                  <CheckCircle2 /> {finishing ? 'Concluindo...' : 'Confirmar retirada entregue'}
                </button>
              </ActionBox>
            )}
          </DrawerBody>
        )}
      </Drawer>
    </DrawerBackdrop>
  );
}

function Orders({
  snapshot,
  onOpen,
}: {
  snapshot: AttendantWorkspaceSnapshot;
  onOpen: (order: AttendantOrder) => void;
}) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dayFilter, setDayFilter] = useState<'ALL' | 'TODAY' | 'OLD'>('ALL');
  const [page, setPage] = useState(0);
  const now = snapshotTime(snapshot);
  const normalizedQuery = query.trim().toLowerCase().replace(/^#/, '');

  const filtered = snapshot.orders
    .filter((order) => {
      const delayed = isDelayed(order, now);
      const statusMatch =
        statusFilter === 'ALL' ||
        (statusFilter === 'ATRASADO' ? delayed : order.status === statusFilter);
      const old = pendingDays(order.createdAt, now) > 0;
      const dayMatch = dayFilter === 'ALL' || (dayFilter === 'OLD' ? old : !old);
      const haystack = [
        order.code.replace(/^#/, ''),
        order.code,
        order.customerName,
        orderPlace(order),
        ...order.items.map((item) => item.productName),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return statusMatch && dayMatch && (!normalizedQuery || haystack.includes(normalizedQuery));
    })
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);
  const filters = [
    ['ALL', 'Todos'],
    ['PENDENTE', 'Novos'],
    ['PREPARANDO', 'Em preparo'],
    ['PRONTO', 'Prontos'],
    ['ATRASADO', 'Atrasados'],
  ];

  return (
    <>
      <Toolbar>
        <SearchBox>
          <Search />
          <input
            aria-label="Buscar pedidos"
            value={query}
            onChange={(event) => { setQuery(event.target.value); setPage(0); }}
            placeholder="Buscar por nº do pedido, cliente, mesa ou item"
          />
        </SearchBox>
        <Filters>
          {filters.map(([value, label]) => (
            <button
              type="button"
              key={value}
              className={statusFilter === value ? 'active' : ''}
              onClick={() => { setStatusFilter(value); setPage(0); }}
            >
              {label}
            </button>
          ))}
        </Filters>
      </Toolbar>
      <DayFilters>
        <button type="button" className={dayFilter === 'ALL' ? 'active' : ''} onClick={() => { setDayFilter('ALL'); setPage(0); }}>Todos os dias</button>
        <button type="button" className={dayFilter === 'TODAY' ? 'active' : ''} onClick={() => { setDayFilter('TODAY'); setPage(0); }}>Hoje</button>
        <button type="button" className={dayFilter === 'OLD' ? 'active old' : ''} onClick={() => { setDayFilter('OLD'); setPage(0); }}>Pendências anteriores</button>
        <span>{filtered.length} resultado(s)</span>
      </DayFilters>
      <List>
        {visible.map((order) => {
          const delayed = isDelayed(order, now);
          const old = pendingDays(order.createdAt, now) > 0;
          return (
            <OrderCard key={order.id} $attention={delayed || old}>
              <div className="status"><strong>{order.code}</strong><em className={old ? 'old' : ''}>{old ? ageLabel(order.createdAt, now) : delayed ? 'Precisa de atenção' : statusText(order.status)}</em></div>
              <div className="copy"><b>{order.customerName || orderPlace(order)}</b><small>{orderPlace(order)} · {order.items.map((item) => `${item.quantity}× ${item.productName}`).join(' · ') || 'Itens não informados'}</small></div>
              <div className="time"><Clock3 /> {elapsed(order.createdAt, now)}</div>
              <button type="button" onClick={() => onOpen(order)}>Ver detalhes <ChevronRight /></button>
            </OrderCard>
          );
        })}
        {!visible.length && <EmptyState icon={Search} title="Nenhum pedido encontrado" text="Tente outro número, termo ou filtro." />}
      </List>
      {filtered.length > PAGE_SIZE && (
        <Pagination>
          <button type="button" disabled={safePage === 0} onClick={() => setPage((current) => Math.max(0, current - 1))}><ChevronLeft /> Voltar 10</button>
          <span>Mostrando {safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} de {filtered.length}</span>
          <button type="button" disabled={safePage >= pageCount - 1} onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}>Próximos 10 <ChevronRight /></button>
        </Pagination>
      )}
    </>
  );
}

function CreateOrder({ restaurantId, onCreated }: { restaurantId: number; onCreated: () => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Record<number, number>>({});
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
    productsService
      .listProducts(restaurantId)
      .then((values) => {
        if (!active) return;
        const normalized = (Array.isArray(values) ? values : []).flatMap((value: unknown) => {
          const item = asRecord(value);
          const category = asRecord(item.category);
          const id = Number(item.id);
          const name = String(item.name || '').trim();
          if (!Number.isSafeInteger(id) || id <= 0 || !name) return [];
          const price = Number(item.price);
          const image = String(item.image || item.imageUrl || '').trim();
          return [{
            id,
            name,
            price: Number.isFinite(price) ? price : 0,
            stock: item.stock == null ? null : Number(item.stock),
            category: String(category.name || item.categoryName || 'Outros').trim() || 'Outros',
            image: image || null,
          }];
        });
        setProducts(normalized);
      })
      .catch(() => toast.error('Não foi possível carregar o cardápio.'));
    return () => { active = false; };
  }, [restaurantId]);

  const selected = products.filter((product) => (cart[product.id] || 0) > 0);
  const total = selected.reduce((sum, product) => sum + product.price * (cart[product.id] || 0), 0);
  const grouped = useMemo(() => {
    const groups = new Map<string, Product[]>();
    for (const product of products) {
      groups.set(product.category, [...(groups.get(product.category) || []), product]);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b, 'pt-BR'));
  }, [products]);

  function changeQuantity(id: number, delta: number) {
    setCart((current) => ({ ...current, [id]: Math.max(0, (current[id] || 0) + delta) }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (customerName.trim().length < 2) return void toast.warning('Informe o nome do cliente.');
    if (customerCpf.replace(/\D/g, '').length !== 11) return void toast.warning('Informe o CPF do cliente com 11 dígitos.');
    if (customerPhone.replace(/\D/g, '').length < 10) return void toast.warning('Informe um telefone com DDD.');
    if (!selected.length) return void toast.warning('Adicione pelo menos um item ao pedido.');
    if (
      type === 'DELIVERY' &&
      (!address.address.trim() ||
        !address.number.trim() ||
        !address.district.trim() ||
        !address.city.trim() ||
        address.state.trim().length !== 2 ||
        address.zipCode.replace(/\D/g, '').length !== 8)
    ) return void toast.warning('Preencha o endereço completo do delivery.');

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
    <CreateForm onSubmit={submit}>
      <Guide><CircleHelp /><div><strong>Quando usar?</strong><p>Pedidos por telefone, WhatsApp ou balcão. Pedido de mesa continua pela sessão/QR.</p></div></Guide>
      <Step><span>1</span><div><h3>Como o cliente vai receber?</h3><p>Escolha retirada ou delivery.</p><ChoiceRow><button type="button" className={type === 'RETIRADA' ? 'active' : ''} onClick={() => setType('RETIRADA')}><Store /> Retirada no balcão</button><button type="button" className={type === 'DELIVERY' ? 'active' : ''} onClick={() => setType('DELIVERY')}><Truck /> Delivery</button></ChoiceRow></div></Step>
      <Step><span>2</span><div><h3>Quem é o cliente?</h3><p>Esses dados identificam corretamente o pedido.</p><FieldGrid><label>Nome<input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Ex.: Samuel Gomes" /></label><label>Telefone<input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} placeholder="(85) 99999-9999" /></label><label>CPF<input value={customerCpf} onChange={(event) => setCustomerCpf(event.target.value)} placeholder="000.000.000-00" /></label></FieldGrid></div></Step>
      {type === 'DELIVERY' && (
        <Step><span>3</span><div><h3>Para onde vai o pedido?</h3><p>Revise o endereço antes de confirmar.</p><FieldGrid><label>Rua<input value={address.address} onChange={(event) => setAddress({ ...address, address: event.target.value })} /></label><label>Número<input value={address.number} onChange={(event) => setAddress({ ...address, number: event.target.value })} /></label><label>Bairro<input value={address.district} onChange={(event) => setAddress({ ...address, district: event.target.value })} /></label><label>Cidade<input value={address.city} onChange={(event) => setAddress({ ...address, city: event.target.value })} /></label><label>UF<input maxLength={2} value={address.state} onChange={(event) => setAddress({ ...address, state: event.target.value.toUpperCase() })} /></label><label>CEP<input value={address.zipCode} onChange={(event) => setAddress({ ...address, zipCode: event.target.value })} /></label><label className="wide">Complemento<input value={address.complement} onChange={(event) => setAddress({ ...address, complement: event.target.value })} /></label></FieldGrid><PaymentRow><button type="button" className={payment === 'CARTAO' ? 'active' : ''} onClick={() => setPayment('CARTAO')}>Cartão na entrega</button><button type="button" className={payment === 'PIX' ? 'active' : ''} onClick={() => setPayment('PIX')}>Pix na entrega</button></PaymentRow></div></Step>
      )}
      <Step><span>{type === 'DELIVERY' ? '4' : '3'}</span><div><h3>Monte o pedido</h3><p>Produtos organizados por categoria para encontrar mais rápido.</p><CategoryList>{grouped.map(([category, categoryProducts]) => (
        <Category key={category}><CategoryHeader><strong>{category}</strong><small>{categoryProducts.length} produto(s)</small></CategoryHeader><ProductGrid>{categoryProducts.map((product) => {
          const quantity = cart[product.id] || 0;
          const unavailable = product.stock === 0;
          return (
            <ProductCard key={product.id} $disabled={unavailable}>
              <ProductImage>{product.image ? <img src={product.image} alt={product.name} loading="lazy" /> : <ImageOff />}</ProductImage>
              <div className="copy"><b>{product.name}</b><small>{money(product.price)}{unavailable ? ' · Indisponível' : ''}</small>{product.stock != null && !unavailable ? <em>{product.stock} em estoque</em> : null}</div>
              <Quantity><button type="button" aria-label={`Remover ${product.name}`} disabled={!quantity} onClick={() => changeQuantity(product.id, -1)}>−</button><strong>{quantity}</strong><button type="button" aria-label={`Adicionar ${product.name}`} disabled={unavailable} onClick={() => changeQuantity(product.id, 1)}>+</button></Quantity>
            </ProductCard>
          );
        })}</ProductGrid></Category>
      ))}</CategoryList></div></Step>
      <Review><span><small>Total estimado</small><strong>{money(total)}</strong><p>{selected.reduce((sum, product) => sum + (cart[product.id] || 0), 0)} item(ns) no pedido</p></span><button type="submit" disabled={submitting || !selected.length}><CheckCircle2 /> {submitting ? 'Registrando...' : 'Confirmar pedido'}</button></Review>
    </CreateForm>
  );
}

function Calls({
  calls,
  attendantId,
  onChanged,
}: {
  calls: AttendantCall[];
  attendantId: number;
  onChanged: () => void;
}) {
  const [mode, setMode] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');
  const visible = calls
    .filter((call) => (mode === 'ACTIVE' ? call.status !== 'RESOLVED' : call.status === 'RESOLVED'))
    .sort((a, b) => a.requestedAt.localeCompare(b.requestedAt));

  async function update(call: AttendantCall, status: 'IN_PROGRESS' | 'RESOLVED') {
    try {
      await attendantApi.updateCallStatus(call.id, status);
      toast.success(status === 'IN_PROGRESS' ? 'Chamado assumido.' : 'Chamado resolvido.');
      onChanged();
    } catch (error) {
      toast.error(errorMessage(error, 'Não foi possível atualizar o chamado.'));
    }
  }

  return (
    <>
      <Toolbar><Filters><button type="button" className={mode === 'ACTIVE' ? 'active' : ''} onClick={() => setMode('ACTIVE')}>Aguardando / em atendimento</button><button type="button" className={mode === 'HISTORY' ? 'active' : ''} onClick={() => setMode('HISTORY')}>Resolvidos hoje</button></Filters></Toolbar>
      <List>{visible.map((call) => {
        const mine = call.assignedToId === attendantId;
        return (
          <CallCard key={call.id}>
            <span className="table">Mesa {String(call.tableNumber).padStart(2, '0')}</span>
            <div><strong>{call.type === 'BILL' ? 'Fechamento de conta' : 'Atendimento no salão'}</strong><small>{call.status === 'WAITING' ? 'Ninguém assumiu ainda.' : call.status === 'IN_PROGRESS' ? `Em atendimento por ${call.assignedToName || 'equipe'}.` : `Resolvido por ${call.assignedToName || 'equipe'}.`}</small></div>
            <time>{call.status === 'RESOLVED' ? 'Resolvido' : 'Ativo'}</time>
            {call.status === 'WAITING' && <button type="button" onClick={() => void update(call, 'IN_PROGRESS')}>Assumir chamado</button>}
            {call.status === 'IN_PROGRESS' && mine && <button type="button" className="success" onClick={() => void update(call, 'RESOLVED')}>Marcar como resolvido</button>}
          </CallCard>
        );
      })}{!visible.length && <EmptyState icon={CheckCircle2} title="Nenhum chamado nesta lista" text="Quando uma mesa pedir ajuda, o chamado aparece aqui." />}</List>
    </>
  );
}

function Tables({ snapshot }: { snapshot: AttendantWorkspaceSnapshot }) {
  const now = snapshotTime(snapshot);
  if (!snapshot.tables.length) {
    return <EmptyState icon={Armchair} title="Nenhuma mesa em operação" text="As mesas abertas aparecerão aqui." />;
  }
  return (
    <TableGrid>
      {snapshot.tables.map((table) => {
        const old = pendingDays(table.openedAt, now) > 0;
        const attention = table.status === 'CLOSING_REQUESTED' || table.activeCallCount > 0 || old;
        return (
          <TableCard key={table.id} $attention={attention}>
            <header><span><small>Mesa</small><strong>{String(table.tableNumber).padStart(2, '0')}</strong></span><em>{old ? ageLabel(table.openedAt, now) : table.status === 'CLOSING_REQUESTED' ? 'Conta solicitada' : table.activeCallCount ? 'Precisa de atenção' : 'Ocupada'}</em></header>
            <div><span><Users /> <b>{table.participantCount}</b> pessoas</span><span><ShoppingBag /> <b>{table.activeOrderCount}</b> pedidos</span><span><BellRing /> <b>{table.activeCallCount}</b> chamados</span></div>
            <p>{attention ? 'Esta mesa merece atenção operacional.' : 'Mesa sem pendências sinalizadas agora.'}</p>
          </TableCard>
        );
      })}
    </TableGrid>
  );
}

function Deliveries({ snapshot, onOpen }: { snapshot: AttendantWorkspaceSnapshot; onOpen: (order: AttendantOrder) => void }) {
  const now = snapshotTime(snapshot);
  const deliveries = snapshot.orders.filter((order) => order.type === 'DELIVERY');
  return (
    <>
      <Guide><Truck /><div><strong>O que acompanhar aqui</strong><p>A cozinha controla o preparo e o motoqueiro controla a entrega. O atendente acompanha e orienta o cliente.</p></div></Guide>
      <List>{deliveries.map((order) => (
        <OrderCard key={order.id} $attention={order.status === 'PRONTO' || pendingDays(order.createdAt, now) > 0}>
          <div className="status"><strong>{order.code}</strong><em>{pendingDays(order.createdAt, now) > 0 ? ageLabel(order.createdAt, now) : statusText(order.status)}</em></div>
          <div className="copy"><b>{order.customerName || 'Cliente'}</b><small>{order.status === 'PRONTO' ? 'Pronto para seguir para a etapa de entrega.' : 'Acompanhe o preparo sem prometer horário sem confirmação.'}</small></div>
          <div className="time"><Clock3 /> {elapsed(order.createdAt, now)}</div>
          <button type="button" onClick={() => onOpen(order)}>Ver pedido <ChevronRight /></button>
        </OrderCard>
      ))}{!deliveries.length && <EmptyState icon={Truck} title="Nenhum delivery ativo" text="Pedidos de entrega aparecem aqui enquanto estiverem na operação." />}</List>
    </>
  );
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

  useEffect(() => { queueMicrotask(() => void load()); }, []);

  const conversations = useMemo(() => orders.flatMap((order) => {
    const issue = asRecord(order.issueThread);
    if (!Object.keys(issue).length) return [];
    const messages = Array.isArray(issue.messages) ? issue.messages : [];
    const last = messages.length ? asRecord(messages[messages.length - 1]) : {};
    const orderId = Number(order.id || issue.orderId);
    if (!Number.isSafeInteger(orderId) || orderId <= 0) return [];
    return [{
      orderId,
      customer: String(asRecord(order.user).name || issue.customerName || 'Cliente'),
      lastMessage: String(last.message || 'Atendimento iniciado'),
      resolved: Boolean(issue.isResolved),
    }];
  }), [orders]);

  async function open(orderId: number) {
    setSelected(orderId);
    setLoading(true);
    try {
      const data = await ordersService.getIssueThread(orderId);
      setThread({
        orderId,
        customerName: String(data?.customerName || 'Cliente'),
        orderStatus: String(data?.orderStatus || ''),
        isResolved: Boolean(data?.isResolved),
        messages: Array.isArray(data?.messages) ? data.messages : [],
      });
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

  return (
    <SupportLayout>
      <Panel>
        <PanelHead><div><Headphones /><span><strong>Conversas dos pedidos</strong><small>{conversations.filter((item) => !item.resolved).length} aguardando solução</small></span></div><TextButton type="button" onClick={() => void load()}><RefreshCw /> Atualizar</TextButton></PanelHead>
        <SupportList>{conversations.map((item) => <button type="button" key={item.orderId} className={selected === item.orderId ? 'active' : ''} onClick={() => void open(item.orderId)}><span><b>Pedido #{item.orderId} · {item.customer}</b><small>{item.lastMessage}</small></span><em>{item.resolved ? 'Resolvido' : 'Aberto'}</em></button>)}{!conversations.length && <EmptyState icon={CheckCircle2} title="Nenhum atendimento aberto" text="Quando um cliente pedir ajuda pelo pedido, a conversa aparece aqui." />}</SupportList>
      </Panel>
      <Panel>
        {selected ? <><PanelHead><div><Headphones /><span><strong>Pedido #{selected}</strong><small>{thread?.customerName || 'Cliente'} · {thread?.orderStatus ? statusText(thread.orderStatus) : 'Carregando'}</small></span></div>{thread && !thread.isResolved && <TextButton type="button" onClick={() => void resolve()}><CheckCircle2 /> Resolver</TextButton>}</PanelHead><Chat>{loading ? <EmptyState icon={RefreshCw} title="Carregando conversa..." text="Buscando as mensagens." /> : <>{thread?.messages.map((message, index) => { const staff = String(message.senderType || '').toUpperCase() === 'ADMIN'; return <Bubble key={String(message.id || index)} $staff={staff}><b>{staff ? 'Restaurante' : message.senderName || 'Cliente'}</b><p>{message.message}</p>{message.sentAt ? <time>{new Date(message.sentAt).toLocaleString('pt-BR')}</time> : null}</Bubble>; })}{thread?.isResolved && <Resolved><CheckCircle2 /> Atendimento resolvido</Resolved>}</>}</Chat>{thread && !thread.isResolved && <Composer onSubmit={send}><textarea aria-label="Responder cliente" value={draft} onChange={(event) => setDraft(event.target.value.slice(0, 600))} placeholder="Escreva uma resposta curta e clara..." /><button type="submit" disabled={!draft.trim()} aria-label="Enviar resposta"><Send /></button></Composer>}</> : <EmptyState icon={Headphones} title="Escolha um atendimento" text="Você verá a conversa e a situação do pedido deste lado." />}
      </Panel>
    </SupportLayout>
  );
}

export function AttendantOperationCenterV2({
  attendantId,
  attendantName,
  restaurantId,
  restaurant,
  snapshot,
  workspaceState,
  onRefresh,
  onLogout,
}: Props) {
  const [view, setView] = useState<AttendantView>('overview');
  const [selectedOrder, setSelectedOrder] = useState<AttendantOrder | null>(null);
  const meta = viewMeta[view];
  const initials = attendantName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'AT';
  const shellStyle = { '--brand': restaurant.primaryColor } as CSSProperties;

  return (
    <Shell style={shellStyle}>
      <Sidebar>
        <Brand><span>{restaurant.monogram}</span><div><strong>{restaurant.name}</strong><small>Central do atendente</small></div></Brand>
        <Nav aria-label="Navegação do atendente">
          {(Object.keys(viewMeta) as AttendantView[]).map((id) => {
            const Icon = viewMeta[id].icon;
            return <button type="button" key={id} className={view === id ? 'active' : ''} onClick={() => setView(id)}><Icon /><span>{viewMeta[id].label}</span></button>;
          })}
        </Nav>
        <Profile><span>{initials}</span><div><b>{attendantName}</b><small>Atendente</small></div><button type="button" onClick={onLogout} aria-label="Sair"><LogOut /></button></Profile>
      </Sidebar>
      <Main>
        <Topbar><div><span className="eyebrow">Operação em tempo real</span><h1>{meta.title}</h1><p>{meta.subtitle}</p></div><div className="sync"><span className={workspaceState.error ? 'offline' : 'online'}>{workspaceState.error ? 'Dados preservados' : 'Operação atualizada'}</span><button type="button" onClick={() => void onRefresh()} disabled={workspaceState.refreshing}><RefreshCw /> Atualizar</button></div></Topbar>
        {workspaceState.error && <ErrorBanner><AlertTriangle /><div><b>Não conseguimos atualizar agora</b><span>{workspaceState.error}</span></div></ErrorBanner>}
        <Content>
          {workspaceState.loading ? <EmptyState icon={RefreshCw} title="Carregando a operação..." text="Buscando pedidos, mesas e chamados." /> : view === 'overview' ? <Overview snapshot={snapshot} onGo={setView} /> : view === 'orders' ? <Orders snapshot={snapshot} onOpen={setSelectedOrder} /> : view === 'create' ? <CreateOrder restaurantId={restaurantId} onCreated={() => { void onRefresh(); setView('orders'); }} /> : view === 'support' ? <Support /> : view === 'deliveries' ? <Deliveries snapshot={snapshot} onOpen={setSelectedOrder} /> : view === 'tables' ? <Tables snapshot={snapshot} /> : <Calls calls={snapshot.calls} attendantId={attendantId} onChanged={() => void onRefresh()} />}
        </Content>
      </Main>
      {selectedOrder && <OrderDrawer orderId={selectedOrder.orderId} fallback={selectedOrder} onClose={() => setSelectedOrder(null)} onCompleted={() => void onRefresh()} />}
    </Shell>
  );
}

const Shell = styled.div`
  --brand: #e16a3d;
  min-height: 100dvh;
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  background: #f5f7f8;
  color: #18231d;
  font-family: Inter, system-ui, sans-serif;
  @media (max-width: 900px) { grid-template-columns: 1fr; padding-bottom: 84px; }
`;
const Sidebar = styled.aside`
  position: sticky; top: 0; height: 100dvh; padding: 28px 20px; display: flex; flex-direction: column;
  background: #153729; color: #fff; z-index: 20;
  @media (max-width: 900px) { position: fixed; inset: auto 0 0; width: 100%; height: 78px; padding: 8px 6px; display: block; }
`;
const Brand = styled.div`
  display: flex; align-items: center; gap: 12px; padding: 2px 6px 24px; border-bottom: 1px solid rgba(255,255,255,.1);
  > span { width: 44px; height: 44px; display: grid; place-items: center; border-radius: 13px; background: var(--brand); font-size: 16px; font-weight: 900; }
  strong, small { display: block; } strong { font-size: 15px; } small { margin-top: 3px; font-size: 11px; opacity: .68; }
  @media (max-width: 900px) { display: none; }
`;
const Nav = styled.nav`
  display: grid; gap: 8px; margin-top: 24px;
  button { min-height: 52px; padding: 0 15px; display: flex; align-items: center; gap: 12px; border: 0; border-radius: 13px; background: transparent; color: rgba(255,255,255,.72); font-size: 13.5px; font-weight: 800; cursor: pointer; text-align: left; }
  button svg { width: 20px; } button:hover, button.active { background: rgba(255,255,255,.1); color: #fff; } button.active { box-shadow: inset 3px 0 var(--brand); }
  @media (max-width: 900px) { display: flex; gap: 4px; height: 62px; margin: 0; overflow-x: auto; button { min-width: 82px; min-height: 60px; padding: 4px 7px; flex: 1; flex-direction: column; justify-content: center; gap: 4px; font-size: 10px; } button.active { box-shadow: inset 0 3px var(--brand); } }
`;
const Profile = styled.div`
  margin-top: auto; padding: 18px 6px 0; display: grid; grid-template-columns: 40px minmax(0,1fr) 36px; gap: 10px; align-items: center; border-top: 1px solid rgba(255,255,255,.1);
  > span { width: 40px; height: 40px; display: grid; place-items: center; border-radius: 50%; background: rgba(255,255,255,.12); font-size: 12px; font-weight: 900; }
  b, small { display: block; } b { overflow: hidden; font-size: 12px; white-space: nowrap; text-overflow: ellipsis; } small { font-size: 10px; opacity: .6; } button { border: 0; background: transparent; color: #fff; cursor: pointer; }
  @media (max-width: 900px) { display: none; }
`;
const Main = styled.main`min-width: 0;`;
const Topbar = styled.header`
  padding: 32px clamp(24px, 3vw, 56px) 24px; display: flex; justify-content: space-between; gap: 28px; align-items: flex-end; background: #fff; border-bottom: 1px solid #e8ece9;
  .eyebrow { font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: #6f7e75; font-weight: 900; } h1 { margin: 6px 0; font-size: clamp(32px, 2.5vw, 42px); letter-spacing: -.04em; } p { margin: 0; color: #69776f; font-size: 14px; }
  .sync { display: flex; align-items: center; gap: 12px; } .sync > span { font-size: 12px; font-weight: 800; } .online { color: #2f7a4c; } .offline { color: #ad6b17; } .sync button { min-height: 46px; padding: 0 16px; display: flex; align-items: center; gap: 7px; border: 1px solid #dce4df; border-radius: 12px; background: #fff; font-size: 12px; font-weight: 800; cursor: pointer; }
  @media (max-width: 700px) { padding: 22px 18px 18px; align-items: flex-start; flex-direction: column; gap: 16px; h1 { font-size: 30px; } .sync { width: 100%; justify-content: space-between; } }
`;
const Content = styled.div`width: 100%; max-width: none; padding: 28px clamp(20px, 3vw, 56px) 64px; @media (max-width: 700px) { padding: 20px 16px 42px; }`;
const ErrorBanner = styled.div`margin: 18px clamp(20px,3vw,56px) 0; padding: 14px 16px; display: flex; gap: 11px; border: 1px solid #f1d9ad; border-radius: 14px; background: #fff7e8; color: #79501d; b,span{display:block} b{font-size:14px} span{margin-top:3px;font-size:12px}`;
const SectionTitle = styled.div`margin-bottom: 16px; h2{margin:0;font-size:24px} p{margin:5px 0 0;color:#718078;font-size:14px}`;
const PriorityGrid = styled.div`display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;@media(max-width:1200px){grid-template-columns:repeat(2,1fr)}@media(max-width:560px){grid-template-columns:1fr}`;
const PriorityCard = styled.button`padding:20px;display:grid;grid-template-columns:48px 1fr 20px;gap:13px;align-items:start;border:1px solid #dfe6e1;border-radius:20px;background:#fff;box-shadow:0 8px 24px rgba(32,55,43,.05);text-align:left;cursor:pointer;.icon{width:48px;height:48px;display:grid;place-items:center;border-radius:14px;background:#f3f8f5}.icon svg{width:22px}small,strong{display:block}small{font-size:11px;font-weight:900;text-transform:uppercase;color:#738078}strong{font-size:30px;margin:2px 0}p{margin:0;color:#6d7972;font-size:13px;line-height:1.45}>svg{width:18px;margin-top:13px;color:#9aa59f}`;
const Guide = styled.div`margin:18px 0 22px;padding:16px 18px;display:flex;gap:12px;align-items:flex-start;border:1px solid #dfe8e2;border-radius:16px;background:linear-gradient(135deg,#f4faf6,#fff);>svg{width:21px;flex:none;color:#357553}strong{display:block;font-size:14px}p{margin:4px 0 0;color:#66766c;font-size:13px;line-height:1.5}`;
const Panel = styled.section`min-width:0;padding:18px;border:1px solid #e1e7e3;border-radius:18px;background:#fff;box-shadow:0 7px 24px rgba(30,50,40,.04)`;
const PanelHead = styled.header`margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;gap:12px;>div{display:flex;align-items:center;gap:10px}>div>svg{width:20px;color:#3b7354}strong,small{display:block}strong{font-size:14px}small{margin-top:2px;color:#79867e;font-size:11px}`;
const TextButton = styled.button`display:flex;align-items:center;gap:5px;border:0;background:transparent;color:#376e50;font-size:12px;font-weight:850;cursor:pointer`;
const MiniRow = styled.div`padding:13px 5px;display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:center;border-top:1px solid #edf0ee;.badge{padding:7px 9px;border-radius:9px;background:#eef4f0;font-size:11px;font-weight:900}b,small{display:block}b{font-size:13px}small{margin-top:2px;color:#76837b;font-size:11px}time{color:#8a958f;font-size:11px}`;
const Empty = styled.div`min-height:170px;padding:28px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#7d8a82;text-align:center;svg{width:28px;margin-bottom:9px;color:#8fa096}b{color:#536159;font-size:15px}span{max-width:360px;margin-top:5px;font-size:12px;line-height:1.5}`;
const Toolbar = styled.div`margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap`;
const SearchBox = styled.label`min-width:320px;min-height:48px;padding:0 14px;flex:1;display:flex;align-items:center;gap:9px;border:1px solid #dce4df;border-radius:13px;background:#fff;svg{width:18px;color:#7c8981}input{flex:1;border:0;outline:0;background:transparent;font-size:14px}@media(max-width:600px){min-width:100%;input{font-size:16px}}`;
const Filters = styled.div`display:flex;gap:7px;flex-wrap:wrap;button{min-height:44px;padding:0 14px;border:1px solid #dfe5e1;border-radius:11px;background:#fff;color:#66736c;font-size:12px;font-weight:850;cursor:pointer}button.active{border-color:#244d38;background:#244d38;color:#fff}`;
const DayFilters = styled.div`margin:0 0 16px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;button{min-height:38px;padding:0 12px;border:1px solid #dfe5e1;border-radius:999px;background:#fff;font-size:11px;font-weight:800;cursor:pointer}button.active{background:#edf8f1;border-color:#79a98b;color:#265f3e}button.active.old{background:#fff3df;border-color:#e4bd78;color:#8b5b13}span{margin-left:auto;color:#748179;font-size:12px}@media(max-width:600px){span{width:100%;margin-left:0}}`;
const List = styled.div`display:grid;gap:11px`;
const OrderCard = styled.article<{ $attention?: boolean }>`padding:16px 18px;display:grid;grid-template-columns:130px minmax(0,1fr) 100px auto;gap:14px;align-items:center;border:1px solid ${({$attention})=>$attention?'#e8c69a':'#e1e7e3'};border-radius:16px;background:#fff;.status strong,.status em,.copy b,.copy small{display:block}.status strong{font-size:16px}.status em{margin-top:3px;color:#4f785e;font-size:11px;font-style:normal}.status em.old{color:#a06417}.copy b{font-size:14px}.copy small{margin-top:4px;overflow:hidden;color:#77847c;font-size:12px;white-space:nowrap;text-overflow:ellipsis}.time{display:flex;align-items:center;gap:6px;color:#7d8982;font-size:12px}>button{min-height:42px;padding:0 13px;display:flex;align-items:center;gap:5px;border:1px solid #d8e2dc;border-radius:11px;background:#f8fbf9;color:#315e45;font-size:12px;font-weight:850;cursor:pointer}@media(max-width:760px){grid-template-columns:90px 1fr;padding:15px;.time{display:none}.copy small{white-space:normal}>button{grid-column:1/-1;justify-content:center}}`;
const Pagination = styled.div`margin-top:16px;display:flex;align-items:center;justify-content:space-between;gap:12px;button{min-height:42px;padding:0 14px;display:flex;align-items:center;gap:6px;border:1px solid #d8e2dc;border-radius:11px;background:#fff;font-size:12px;font-weight:800;cursor:pointer}button:disabled{opacity:.4;cursor:not-allowed}span{font-size:12px;color:#68766e}@media(max-width:560px){flex-direction:column;button{width:100%;justify-content:center}}`;
const DrawerBackdrop = styled.div`position:fixed;inset:0;display:flex;justify-content:flex-end;background:rgba(15,28,21,.5);backdrop-filter:blur(4px);z-index:120`;
const Drawer = styled.aside`width:min(580px,100%);height:100%;display:flex;flex-direction:column;background:#f8faf9;box-shadow:-30px 0 80px rgba(15,30,22,.2)`;
const DrawerHead = styled.header`padding:24px 24px 20px;display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid #e2e8e4;background:#fff;small,strong,em{display:block}small{color:#7b8980;font-size:11px;text-transform:uppercase}strong{font-size:30px}em{width:max-content;margin-top:6px;padding:6px 9px;border-radius:999px;background:#edf8f1;color:#34704d;font-size:11px;font-style:normal;font-weight:850}button{width:44px;height:44px;border:0;border-radius:12px;background:#f3f6f4;cursor:pointer}`;
const DrawerBody = styled.div`padding:20px;display:grid;gap:16px;overflow:auto`;
const InfoGrid = styled.div`display:grid;grid-template-columns:1fr 1fr;gap:12px;@media(max-width:520px){grid-template-columns:1fr}`;
const Info = styled.div`padding:15px;border:1px solid #e2e8e4;border-radius:14px;background:#fff;small,b,span{display:block}small{color:#7c8981;font-size:10px;font-weight:850;text-transform:uppercase}b{margin-top:5px;font-size:14px}b.total{font-size:21px}b svg{width:16px;vertical-align:middle}span{margin-top:4px;color:#76837b;font-size:11px}`;
const ItemBox = styled.div`overflow:hidden;border:1px solid #e2e8e4;border-radius:14px;background:#fff;h3{margin:0;padding:14px 15px;border-bottom:1px solid #edf1ee;font-size:14px}>div{padding:12px 15px;border-bottom:1px solid #edf1ee}>div:last-child{border-bottom:0}b,span{display:block}b{font-size:13px}span{margin-top:3px;color:#77847c;font-size:11px}`;
const ActionBox = styled.div<{ $warning?: boolean }>`padding:16px;border:1px solid ${({$warning})=>$warning?'#efd3a2':'#cce4d4'};border-radius:15px;background:${({$warning})=>$warning?'#fff8e9':'#f0faf3'};strong{font-size:14px}p{color:#6d786f;font-size:12px;line-height:1.5}button{width:100%;min-height:46px;display:flex;align-items:center;justify-content:center;gap:7px;border:0;border-radius:11px;background:#2f6f4a;color:#fff;font-size:12px;font-weight:850;cursor:pointer}button:disabled{opacity:.45;cursor:not-allowed}`;
const CreateForm = styled.form`display:grid;gap:16px;width:100%;max-width:none`;
const Step = styled.section`padding:20px;display:grid;grid-template-columns:40px minmax(0,1fr);gap:15px;border:1px solid #e1e7e3;border-radius:18px;background:#fff;>span{width:36px;height:36px;display:grid;place-items:center;border-radius:11px;background:#234d38;color:#fff;font-size:13px;font-weight:900}h3{margin:0;font-size:17px}p{margin:4px 0 14px;color:#75827a;font-size:12px}@media(max-width:520px){grid-template-columns:1fr;>span{width:34px;height:34px}}`;
const ChoiceRow = styled.div`display:flex;gap:10px;flex-wrap:wrap;button{min-height:46px;padding:0 15px;display:flex;align-items:center;gap:7px;border:1px solid #dbe3de;border-radius:12px;background:#fff;font-size:12px;font-weight:800;cursor:pointer}button.active{border-color:#79a98b;background:#eef8f1;color:#265f3e}`;
const FieldGrid = styled.div`display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;label{color:#647169;font-size:11px;font-weight:800}input{width:100%;height:46px;margin-top:5px;padding:0 12px;border:1px solid #dce4df;border-radius:10px;outline:0;font-size:13px}.wide{grid-column:span 2}@media(max-width:800px){grid-template-columns:1fr 1fr}@media(max-width:520px){grid-template-columns:1fr;.wide{grid-column:auto}input{font-size:16px}}`;
const PaymentRow = styled(ChoiceRow)`margin-top:20px;@media(max-width:520px){margin-top:18px}`;
const CategoryList = styled.div`display:grid;gap:22px`;
const Category = styled.div``;
const CategoryHeader = styled.div`margin-bottom:10px;strong,small{display:block}strong{font-size:15px}small{margin-top:2px;color:#78857d;font-size:11px}`;
const ProductGrid = styled.div`display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;@media(max-width:1250px){grid-template-columns:repeat(2,minmax(0,1fr))}@media(max-width:680px){grid-template-columns:1fr}`;
const ProductCard = styled.div<{ $disabled?: boolean }>`min-height:108px;padding:10px;display:grid;grid-template-columns:82px minmax(0,1fr) auto;gap:12px;align-items:center;border:1px solid #e1e7e3;border-radius:14px;background:#fff;opacity:${({$disabled})=>$disabled?0.55:1};.copy b,.copy small,.copy em{display:block}.copy b{font-size:13px}.copy small{margin-top:3px;color:#66746c;font-size:11px}.copy em{margin-top:5px;color:#4f785e;font-size:10px;font-style:normal}@media(max-width:420px){grid-template-columns:70px minmax(0,1fr);>div:last-child{grid-column:1/-1;justify-self:end}}`;
const ProductImage = styled.div`width:82px;height:82px;overflow:hidden;display:grid;place-items:center;border-radius:12px;background:#f0f4f1;color:#93a098;img{width:100%;height:100%;object-fit:cover}svg{width:24px}@media(max-width:420px){width:70px;height:70px}`;
const Quantity = styled.div`display:flex;align-items:center;gap:8px;button{width:36px;height:36px;border:1px solid #d8e2dc;border-radius:10px;background:#f8fbf9;font-size:18px;font-weight:900;cursor:pointer}button:disabled{opacity:.35}strong{min-width:18px;font-size:13px;text-align:center}`;
const Review = styled.div`position:sticky;bottom:12px;padding:16px 18px;display:flex;justify-content:space-between;align-items:center;gap:14px;border-radius:17px;background:#153729;color:#fff;box-shadow:0 18px 45px rgba(21,55,41,.24);small,strong,p{display:block}small{font-size:10px;opacity:.7}strong{font-size:22px}p{margin:3px 0 0;font-size:10px;opacity:.7}button{min-height:46px;padding:0 17px;display:flex;align-items:center;gap:7px;border:0;border-radius:12px;background:var(--brand);color:#fff;font-size:12px;font-weight:900;cursor:pointer}button:disabled{opacity:.45}@media(max-width:520px){align-items:stretch;flex-direction:column;button{justify-content:center}}`;
const CallCard = styled.article`padding:16px;display:grid;grid-template-columns:110px 1fr 80px auto;gap:13px;align-items:center;border:1px solid #e1e7e3;border-radius:15px;background:#fff;.table{padding:9px;border-radius:10px;background:#eef4f0;font-size:12px;font-weight:900;text-align:center}strong,small{display:block}strong{font-size:13px}small{margin-top:3px;color:#76837b;font-size:11px}time{color:#849088;font-size:11px}button{min-height:40px;padding:0 12px;border:0;border-radius:10px;background:#244d38;color:#fff;font-size:11px;font-weight:850;cursor:pointer}button.success{background:#2f7850}@media(max-width:760px){grid-template-columns:90px 1fr;time{display:none}button{grid-column:1/-1}}`;
const TableGrid = styled.div`display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;@media(max-width:1100px){grid-template-columns:repeat(2,1fr)}@media(max-width:600px){grid-template-columns:1fr}`;
const TableCard = styled.article<{ $attention?: boolean }>`padding:18px;border:1px solid ${({$attention})=>$attention?'#e9c999':'#e1e7e3'};border-radius:17px;background:#fff;header{display:flex;justify-content:space-between;align-items:center}header small,header strong{display:block}header small{color:#77847c;font-size:10px;text-transform:uppercase}header strong{font-size:28px}header em{padding:7px 9px;border-radius:9px;background:#fff4df;color:#956015;font-size:10px;font-style:normal;font-weight:850}>div{margin:14px 0;display:flex;gap:14px;flex-wrap:wrap}>div span{display:flex;align-items:center;gap:5px;color:#6e7b73;font-size:11px}p{margin:0;color:#748179;font-size:11px;line-height:1.5}`;
const SupportLayout = styled.div`min-height:620px;display:grid;grid-template-columns:minmax(320px,420px) minmax(0,1fr);gap:14px;@media(max-width:900px){grid-template-columns:1fr}`;
const SupportList = styled.div`display:grid;gap:8px;button{padding:12px;display:flex;justify-content:space-between;gap:9px;border:1px solid #e2e8e4;border-radius:12px;background:#fff;text-align:left;cursor:pointer}button.active{border-color:#78a98a;background:#f1f9f3}b,small{display:block}b{font-size:12px}small{max-width:260px;margin-top:3px;overflow:hidden;color:#75827a;font-size:11px;white-space:nowrap;text-overflow:ellipsis}em{color:#4f785e;font-size:10px;font-style:normal}`;
const Chat = styled.div`height:430px;padding:10px;display:flex;flex-direction:column;gap:8px;overflow:auto;border-radius:13px;background:#f6f8f7`;
const Bubble = styled.div<{ $staff?: boolean }>`max-width:82%;align-self:${({$staff})=>$staff?'flex-end':'flex-start'};padding:10px 12px;border:1px solid ${({$staff})=>$staff?'#c2dfcb':'#e1e7e3'};border-radius:13px;background:${({$staff})=>$staff?'#dff2e5':'#fff'};b{color:#66756c;font-size:10px}p{margin:4px 0;font-size:12px;line-height:1.5}time{color:#849087;font-size:9px}`;
const Resolved = styled.div`padding:8px 11px;align-self:center;display:flex;align-items:center;gap:6px;border-radius:20px;background:#e8f5ec;color:#397351;font-size:11px`;
const Composer = styled.form`margin-top:10px;display:grid;grid-template-columns:1fr 46px;gap:8px;textarea{min-height:70px;padding:10px;resize:none;border:1px solid #dce4df;border-radius:12px;outline:0;font:inherit;font-size:13px}button{border:0;border-radius:12px;background:#244d38;color:#fff;cursor:pointer}button:disabled{opacity:.4}`;
