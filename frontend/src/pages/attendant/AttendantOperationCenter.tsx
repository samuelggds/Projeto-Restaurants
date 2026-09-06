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
  Plus,
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
import { type FormEvent, useEffect, useMemo, useState } from 'react';
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
type Product = { id: number; name: string; price: number; stock: number | null };
type Cart = Record<number, number>;
type SupportSummary = { orderId: number; customer: string; lastMessage: string; resolved: boolean };

type SupportMessage = { id?: string | number; senderType?: string; senderName?: string; message: string; sentAt?: string };
type SupportThread = { orderId: number; customerName: string; orderStatus: string; isResolved: boolean; messages: SupportMessage[] };

const viewMeta: Record<AttendantView, { label: string; title: string; subtitle: string; icon: LucideIcon }> = {
  overview: { label: 'Visão geral', title: 'Central de atendimento', subtitle: 'Veja primeiro o que precisa da sua atenção agora.', icon: LayoutDashboard },
  orders: { label: 'Pedidos', title: 'Pedidos em andamento', subtitle: 'Acompanhe a fila e abra qualquer pedido para entender a situação completa.', icon: ClipboardList },
  create: { label: 'Novo pedido', title: 'Registrar novo pedido', subtitle: 'Use para pedidos recebidos por telefone, WhatsApp ou balcão.', icon: PackagePlus },
  support: { label: 'Atendimento', title: 'Atendimento ao cliente', subtitle: 'Responda dúvidas e problemas sem misturar o suporte com a cozinha.', icon: Headphones },
  deliveries: { label: 'Entregas', title: 'Acompanhar deliveries', subtitle: 'Veja quais entregas estão preparando ou prontas para seguir viagem.', icon: Truck },
  tables: { label: 'Mesas', title: 'Mesas em operação', subtitle: 'Entenda rapidamente quais mesas têm pedidos, chamados ou conta solicitada.', icon: Armchair },
  calls: { label: 'Chamados', title: 'Chamados do salão', subtitle: 'Assuma uma solicitação para que a equipe saiba quem está cuidando dela.', icon: BellRing },
};

function record(value: unknown): Raw {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Raw) : {};
}
function money(value: unknown) {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—';
}
function elapsed(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60 ? `${minutes % 60}min` : ''}`.trim();
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

function PriorityCards({ snapshot, onGo }: { snapshot: AttendantWorkspaceSnapshot; onGo: (view: AttendantView) => void }) {
  const overdue = snapshot.orders.filter((order) => order.status !== 'PRONTO' && Date.now() - new Date(order.createdAt).getTime() >= 35 * 60000).length;
  const ready = snapshot.orders.filter((order) => order.status === 'PRONTO').length;
  const calls = snapshot.calls.filter((call) => call.status === 'WAITING').length;
  const closing = snapshot.tables.filter((table) => table.status === 'CLOSING_REQUESTED').length;
  const cards = [
    { icon: AlertTriangle, label: 'Pedidos demorando', value: overdue, text: overdue ? 'Confira estes pedidos primeiro.' : 'Nenhum pedido acima do tempo de atenção.', tone: 'danger', view: 'orders' as const },
    { icon: PackageCheck, label: 'Prontos agora', value: ready, text: ready ? 'Aguardam retirada, mesa ou entrega.' : 'A cozinha ainda não liberou pedidos.', tone: 'success', view: 'orders' as const },
    { icon: BellRing, label: 'Chamados aguardando', value: calls, text: calls ? 'Assuma o mais antigo para evitar espera.' : 'Nenhuma mesa esperando atendimento.', tone: 'warning', view: 'calls' as const },
    { icon: Armchair, label: 'Contas solicitadas', value: closing, text: closing ? 'Essas mesas pediram fechamento da conta.' : 'Nenhuma conta solicitada agora.', tone: 'info', view: 'tables' as const },
  ];
  return <PriorityGrid>{cards.map(({ icon: Icon, label, value, text, tone, view }) => <PriorityCard key={label} $tone={tone} type="button" onClick={() => onGo(view)}><span className="icon"><Icon /></span><span className="copy"><small>{label}</small><strong>{value}</strong><p>{text}</p></span><ChevronRight /></PriorityCard>)}</PriorityGrid>;
}

function Overview({ snapshot, onGo }: { snapshot: AttendantWorkspaceSnapshot; onGo: (view: AttendantView) => void }) {
  const oldestCalls = snapshot.calls.filter((call) => call.status !== 'RESOLVED').sort((a, b) => a.requestedAt.localeCompare(b.requestedAt)).slice(0, 3);
  const ready = snapshot.orders.filter((order) => order.status === 'PRONTO').slice(0, 4);
  return <>
    <SectionTitle><div><h2>Precisa da sua atenção agora</h2><p>Os cards abaixo já estão organizados pelo que normalmente exige ação do atendente.</p></div></SectionTitle>
    <PriorityCards snapshot={snapshot} onGo={onGo} />
    <Guide><CircleHelp /><div><strong>Como usar esta tela</strong><p>Comece por pedidos demorando e chamados aguardando. Depois confira os pedidos prontos para evitar cliente esperando no balcão ou delivery parado.</p></div></Guide>
    <TwoCols>
      <Panel><PanelHead><div><BellRing /><span><strong>Chamados prioritários</strong><small>Mais antigos aparecem primeiro</small></span></div><TextButton onClick={() => onGo('calls')}>Ver todos <ChevronRight /></TextButton></PanelHead>{oldestCalls.length ? oldestCalls.map((call) => <MiniRow key={call.id}><span className="badge">Mesa {String(call.tableNumber).padStart(2, '0')}</span><span><b>{call.type === 'BILL' ? 'Fechamento de conta' : 'Atendimento no salão'}</b><small>{call.status === 'IN_PROGRESS' ? `Em atendimento por ${call.assignedToName || 'equipe'}` : 'Aguardando alguém assumir'}</small></span><time>{elapsed(call.requestedAt)}</time></MiniRow>) : <Empty><CheckCircle2 /><b>Salão sem chamados</b><span>Nenhuma solicitação aguarda atendimento.</span></Empty>}</Panel>
      <Panel><PanelHead><div><PackageCheck /><span><strong>Pedidos prontos</strong><small>Evite deixar pedido pronto parado</small></span></div><TextButton onClick={() => onGo('orders')}>Ver fila <ChevronRight /></TextButton></PanelHead>{ready.length ? ready.map((order) => <MiniRow key={order.id}><span className="badge">{order.code}</span><span><b>{order.customerName || orderPlace(order)}</b><small>{orderPlace(order)} · {order.items.length} item(ns)</small></span><time>{elapsed(order.readyAt || order.createdAt)}</time></MiniRow>) : <Empty><Clock3 /><b>Nenhum pedido pronto</b><span>Quando a cozinha liberar, ele aparece aqui.</span></Empty>}</Panel>
    </TwoCols>
  </>;
}

function OrderDrawer({ orderId, onClose, onCompleted, fallback }: { orderId: number; onClose: () => void; onCompleted: () => void; fallback: AttendantOrder | null }) {
  const [data, setData] = useState<Raw | null>(null);
  const [loading, setLoading] = useState(true);
  const [finishing, setFinishing] = useState(false);
  useEffect(() => { let active = true; attendantApi.getOrder(orderId).then((value) => active && setData(value)).catch(() => toast.error('Não foi possível carregar os detalhes do pedido.')).finally(() => active && setLoading(false)); return () => { active = false; }; }, [orderId]);
  const order = data || {};
  const rawItems = Array.isArray(order.items) ? order.items : [];
  const currentType = String(order.type || fallback?.type || '');
  const currentStatus = String(order.status || fallback?.status || '');
  const paid = Boolean(order.paid);
  const customer = record(order.user);
  const canFinishPickup = currentType === 'RETIRADA' && currentStatus === 'PRONTO';
  async function finishPickup() {
    setFinishing(true);
    try { await attendantApi.completePickup(orderId); toast.success({ title: 'Retirada concluída', message: 'O pedido foi entregue ao cliente.' }); onCompleted(); onClose(); }
    catch (error) { toast.error(errorMessage(error, 'Não foi possível concluir a retirada.')); }
    finally { setFinishing(false); }
  }
  return <DrawerBackdrop onMouseDown={(event) => event.target === event.currentTarget && onClose()}><Drawer role="dialog" aria-modal="true" aria-label="Detalhes do pedido"><DrawerHead><div><small>Pedido</small><strong>{fallback?.code || `#${orderId}`}</strong><span>{statusText(currentStatus)}</span></div><button onClick={onClose} aria-label="Fechar detalhes"><X /></button></DrawerHead>{loading ? <Empty><RefreshCw className="spin" /><b>Carregando pedido...</b></Empty> : <DrawerBody><InfoGrid><Info><small>Cliente</small><b>{String(customer.name || fallback?.customerName || 'Cliente')}</b><span>{String(customer.phone || 'Telefone não informado')}</span></Info><Info><small>Canal</small><b>{currentType === 'DELIVERY' ? 'Delivery' : currentType === 'MESA' ? 'Mesa' : 'Retirada'}</b><span>{paid ? 'Pagamento confirmado' : 'Pagamento pendente'}</span></Info></InfoGrid>{currentType === 'DELIVERY' && <Info><small>Endereço</small><b><MapPin /> {String(order.address || 'Endereço não informado')}, {String(order.number || '')}</b><span>{[order.district, order.city, order.state].filter(Boolean).join(' · ')}</span></Info>}<div><Subhead>Itens do pedido</Subhead><ItemList>{rawItems.length ? rawItems.map((item, index) => { const itemData = record(item); const product = record(itemData.product); return <li key={index}><b>{Number(itemData.quantity || 1)}× {String(product.name || itemData.productName || 'Item')}</b><span>{String(itemData.observation || '')}</span></li>; }) : fallback?.items.map((item) => <li key={item.productName}><b>{item.quantity}× {item.productName}</b></li>)}</ItemList></div><InfoGrid><Info><small>Total</small><b>{money(order.total)}</b></Info><Info><small>Próximo passo</small><b>{canFinishPickup ? (paid ? 'Entregar ao cliente' : 'Confirmar pagamento') : currentStatus === 'PRONTO' ? 'Encaminhar para o responsável' : 'Acompanhar preparo'}</b></Info></InfoGrid>{canFinishPickup && <ActionBox $warning={!paid}><strong>{paid ? 'Pedido pronto para retirada' : 'Pagamento ainda não confirmado'}</strong><p>{paid ? 'Depois de entregar o pedido ao cliente, conclua a retirada para retirar este pedido da fila ativa.' : 'Por segurança, o sistema só permite concluir a retirada depois que o pagamento estiver confirmado.'}</p><button type="button" disabled={!paid || finishing} onClick={() => void finishPickup()}><CheckCircle2 /> {finishing ? 'Concluindo...' : 'Confirmar retirada entregue'}</button></ActionBox>}</DrawerBody>}</Drawer></DrawerBackdrop>;
}

function Orders({ snapshot, onOpen }: { snapshot: AttendantWorkspaceSnapshot; onOpen: (order: AttendantOrder) => void }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('ALL');
  const visible = snapshot.orders.filter((order) => {
    const matchesStatus = filter === 'ALL' || (filter === 'ATRASADO' ? order.status !== 'PRONTO' && Date.now() - new Date(order.createdAt).getTime() >= 35 * 60000 : order.status === filter);
    const haystack = `${order.code} ${order.customerName || ''} ${orderPlace(order)} ${order.items.map((item) => item.productName).join(' ')}`.toLowerCase();
    return matchesStatus && haystack.includes(query.trim().toLowerCase());
  });
  return <><Toolbar><SearchBox><Search /><input aria-label="Buscar pedidos" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar pedido, cliente, mesa ou item" /></SearchBox><Filters>{[['ALL','Todos'],['PENDENTE','Novos'],['PREPARANDO','Em preparo'],['PRONTO','Prontos'],['ATRASADO','Atrasados']].map(([value,label]) => <button key={value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{label}</button>)}</Filters></Toolbar><OrderList>{visible.map((order) => { const delayed = order.status !== 'PRONTO' && Date.now() - new Date(order.createdAt).getTime() >= 35 * 60000; return <OrderCard key={order.id} $attention={delayed}><div className="status"><span>{order.code}</span><em>{delayed ? 'Precisa de atenção' : statusText(order.status)}</em></div><div className="main"><strong>{order.customerName || orderPlace(order)}</strong><small>{orderPlace(order)} · {order.items.map((item) => `${item.quantity}× ${item.productName}`).join(' · ') || 'Itens não informados'}</small></div><div className="time"><Clock3 /><span>{elapsed(order.createdAt)}</span></div><button onClick={() => onOpen(order)}>Ver detalhes <ChevronRight /></button></OrderCard>; })}{!visible.length && <Empty><Search /><b>Nenhum pedido encontrado</b><span>Tente remover algum filtro ou buscar outro termo.</span></Empty>}</OrderList></>;
}

function CreateOrder({ restaurantId, onCreated }: { restaurantId: number; onCreated: () => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Cart>({});
  const [type, setType] = useState<'RETIRADA' | 'DELIVERY'>('RETIRADA');
  const [customerName, setCustomerName] = useState('');
  const [customerCpf, setCustomerCpf] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [address, setAddress] = useState({ address: '', number: '', district: '', city: '', state: '', zipCode: '', complement: '' });
  const [payment, setPayment] = useState<'CARTAO' | 'PIX'>('CARTAO');
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => { productsService.listProducts(restaurantId).then((values) => setProducts((Array.isArray(values) ? values : []).flatMap((value: unknown) => { const item = record(value); const id = Number(item.id); const price = Number(item.price); if (!Number.isInteger(id) || id <= 0 || !String(item.name || '').trim()) return []; return [{ id, name: String(item.name), price: Number.isFinite(price) ? price : 0, stock: item.stock == null ? null : Number(item.stock) }]; }))).catch(() => toast.error('Não foi possível carregar o cardápio.')); }, [restaurantId]);
  const selected = products.filter((product) => (cart[product.id] || 0) > 0);
  const total = selected.reduce((sum, product) => sum + product.price * (cart[product.id] || 0), 0);
  function changeQty(id: number, delta: number) { setCart((current) => ({ ...current, [id]: Math.max(0, (current[id] || 0) + delta) })); }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (customerName.trim().length < 2) return toast.warning('Informe o nome do cliente.');
    if (customerCpf.replace(/\D/g, '').length !== 11) return toast.warning('Informe o CPF do cliente com 11 dígitos.');
    if (customerPhone.replace(/\D/g, '').length < 10) return toast.warning('Informe um telefone com DDD.');
    if (!selected.length) return toast.warning('Adicione pelo menos um item ao pedido.');
    if (type === 'DELIVERY' && (!address.address.trim() || !address.number.trim() || !address.district.trim() || !address.city.trim() || address.state.trim().length !== 2 || address.zipCode.replace(/\D/g, '').length !== 8)) return toast.warning('Preencha o endereço completo do delivery.');
    setSubmitting(true);
    try {
      await attendantApi.createOrder({ restaurantId, type, customerName: customerName.trim(), customerCpf: customerCpf.replace(/\D/g, ''), customerPhone: customerPhone.trim(), items: selected.map((product) => ({ productId: product.id, quantity: cart[product.id] })), ...(type === 'DELIVERY' ? { ...address, paymentMethod: payment, payOnDelivery: true, payOnDeliveryMethod: payment } : { payOnDelivery: false }) });
      toast.success({ title: 'Pedido registrado', message: 'O pedido entrou na operação e já pode ser acompanhado.' });
      setCart({}); setCustomerName(''); setCustomerCpf(''); setCustomerPhone(''); setAddress({ address: '', number: '', district: '', city: '', state: '', zipCode: '', complement: '' }); onCreated();
    } catch (error) { toast.error(errorMessage(error, 'Não foi possível registrar o pedido.')); }
    finally { setSubmitting(false); }
  }
  return <Form onSubmit={submit}><Guide><CircleHelp /><div><strong>Quando usar?</strong><p>Registre aqui pedidos recebidos por telefone, WhatsApp ou balcão. Pedido de mesa continua sendo feito pela sessão/QR da mesa para não perder o vínculo com quem está sentado.</p></div></Guide><Step><span>1</span><div><h3>Como o cliente vai receber?</h3><p>Escolha retirada ou delivery.</p><ChoiceRow><button type="button" className={type === 'RETIRADA' ? 'active' : ''} onClick={() => setType('RETIRADA')}><Store /> Retirada no balcão</button><button type="button" className={type === 'DELIVERY' ? 'active' : ''} onClick={() => setType('DELIVERY')}><Truck /> Delivery</button></ChoiceRow></div></Step><Step><span>2</span><div><h3>Quem é o cliente?</h3><p>Esses dados ajudam a identificar o pedido e manter o histórico correto.</p><FieldGrid><label>Nome<input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Ex.: Samuel Gomes" /></label><label>Telefone<input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="(85) 99999-9999" /></label><label>CPF<input value={customerCpf} onChange={(e) => setCustomerCpf(e.target.value)} placeholder="000.000.000-00" /></label></FieldGrid></div></Step>{type === 'DELIVERY' && <Step><span>3</span><div><h3>Para onde vai o pedido?</h3><p>Revise o endereço com o cliente antes de confirmar.</p><FieldGrid><label>Rua<input value={address.address} onChange={(e) => setAddress({ ...address, address: e.target.value })} /></label><label>Número<input value={address.number} onChange={(e) => setAddress({ ...address, number: e.target.value })} /></label><label>Bairro<input value={address.district} onChange={(e) => setAddress({ ...address, district: e.target.value })} /></label><label>Cidade<input value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} /></label><label>UF<input maxLength={2} value={address.state} onChange={(e) => setAddress({ ...address, state: e.target.value.toUpperCase() })} /></label><label>CEP<input value={address.zipCode} onChange={(e) => setAddress({ ...address, zipCode: e.target.value })} /></label><label className="wide">Complemento<input value={address.complement} onChange={(e) => setAddress({ ...address, complement: e.target.value })} /></label></FieldGrid><ChoiceRow><button type="button" className={payment === 'CARTAO' ? 'active' : ''} onClick={() => setPayment('CARTAO')}>Cartão na entrega</button><button type="button" className={payment === 'PIX' ? 'active' : ''} onClick={() => setPayment('PIX')}>Pix na entrega</button></ChoiceRow></div></Step>}<Step><span>{type === 'DELIVERY' ? '4' : '3'}</span><div><h3>Monte o pedido</h3><p>Use + e − para ajustar a quantidade. Produtos sem estoque ficam bloqueados.</p><Products>{products.map((product) => { const quantity = cart[product.id] || 0; const unavailable = product.stock === 0; return <ProductRow key={product.id} $disabled={unavailable}><span><b>{product.name}</b><small>{money(product.price)}{unavailable ? ' · Indisponível' : ''}</small></span><div><button type="button" disabled={!quantity} onClick={() => changeQty(product.id, -1)}>−</button><strong>{quantity}</strong><button type="button" disabled={unavailable} onClick={() => changeQty(product.id, 1)}>+</button></div></ProductRow>; })}</Products></div></Step><Review><span><small>Total estimado</small><strong>{money(total)}</strong><p>{selected.length} produto(s) selecionado(s)</p></span><button type="submit" disabled={submitting || !selected.length}><CheckCircle2 /> {submitting ? 'Registrando...' : 'Confirmar pedido'}</button></Review></Form>;
}

function Calls({ calls, attendantId, onChanged }: { calls: AttendantCall[]; attendantId: number; onChanged: () => void }) {
  const [mode, setMode] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');
  const visible = calls.filter((call) => mode === 'ACTIVE' ? call.status !== 'RESOLVED' : call.status === 'RESOLVED').sort((a, b) => a.requestedAt.localeCompare(b.requestedAt));
  async function update(call: AttendantCall, status: 'IN_PROGRESS' | 'RESOLVED') { try { await attendantApi.updateCallStatus(call.id, status); toast.success(status === 'IN_PROGRESS' ? 'Chamado assumido. A equipe agora sabe que você está cuidando dele.' : 'Chamado resolvido.'); onChanged(); } catch (error) { toast.error(errorMessage(error, 'Não foi possível atualizar o chamado.')); } }
  return <><Toolbar><Filters><button className={mode === 'ACTIVE' ? 'active' : ''} onClick={() => setMode('ACTIVE')}>Aguardando / em atendimento</button><button className={mode === 'HISTORY' ? 'active' : ''} onClick={() => setMode('HISTORY')}>Resolvidos hoje</button></Filters></Toolbar><OrderList>{visible.map((call) => { const mine = call.assignedToId === attendantId; return <CallCard key={call.id}><span className="table">Mesa {String(call.tableNumber).padStart(2, '0')}</span><div><strong>{call.type === 'BILL' ? 'Fechamento de conta' : 'Atendimento no salão'}</strong><small>{call.status === 'WAITING' ? 'Ninguém assumiu ainda. Se você for atender, clique em “Assumir”.' : call.status === 'IN_PROGRESS' ? `Em atendimento por ${call.assignedToName || 'equipe'}.` : `Resolvido por ${call.assignedToName || 'equipe'}.`}</small></div><time>{elapsed(call.requestedAt)}</time>{call.status === 'WAITING' && <button onClick={() => void update(call, 'IN_PROGRESS')}>Assumir chamado</button>}{call.status === 'IN_PROGRESS' && mine && <button className="success" onClick={() => void update(call, 'RESOLVED')}>Marcar como resolvido</button>}</CallCard>)}{!visible.length && <Empty><CheckCircle2 /><b>Nenhum chamado nesta lista</b><span>Quando uma mesa pedir ajuda, o chamado aparecerá aqui automaticamente.</span></Empty>}</OrderList></>;
}

function Tables({ snapshot }: { snapshot: AttendantWorkspaceSnapshot }) {
  return <TableGrid>{snapshot.tables.map((table) => <TableCard key={table.id} $attention={table.status === 'CLOSING_REQUESTED' || table.activeCallCount > 0}><header><span><small>Mesa</small><strong>{String(table.tableNumber).padStart(2, '0')}</strong></span><em>{table.status === 'CLOSING_REQUESTED' ? 'Conta solicitada' : table.activeCallCount ? 'Precisa de atenção' : 'Ocupada'}</em></header><div><span><Users /> <b>{table.participantCount}</b> pessoas</span><span><ShoppingBag /> <b>{table.activeOrderCount}</b> pedidos</span><span><BellRing /> <b>{table.activeCallCount}</b> chamados</span></div><p>{table.status === 'CLOSING_REQUESTED' ? 'A mesa pediu o fechamento da conta. Priorize o atendimento.' : table.activeCallCount ? 'Existe uma solicitação aberta para esta mesa.' : 'Mesa sem pendências sinalizadas agora.'}</p></TableCard>)}{!snapshot.tables.length && <Empty><Armchair /><b>Nenhuma mesa em operação</b><span>As mesas abertas aparecerão aqui.</span></Empty>}</TableGrid>;
}

function Deliveries({ snapshot, onOpen }: { snapshot: AttendantWorkspaceSnapshot; onOpen: (order: AttendantOrder) => void }) {
  const deliveries = snapshot.orders.filter((order) => order.type === 'DELIVERY');
  return <><Guide><Truck /><div><strong>O que acompanhar aqui</strong><p>Pedidos em preparo ainda dependem da cozinha. Quando ficarem prontos, confira os dados e acompanhe o encaminhamento para entrega sem alterar etapas do motoqueiro.</p></div></Guide><OrderList>{deliveries.map((order) => <OrderCard key={order.id} $attention={order.status === 'PRONTO'}><div className="status"><span>{order.code}</span><em>{statusText(order.status)}</em></div><div className="main"><strong>{order.customerName || 'Cliente'}</strong><small>{order.status === 'PRONTO' ? 'Pronto para seguir para a etapa de entrega.' : 'Acompanhe o preparo e evite prometer horário sem confirmação.'}</small></div><div className="time"><Clock3 /><span>{elapsed(order.createdAt)}</span></div><button onClick={() => onOpen(order)}>Ver pedido <ChevronRight /></button></OrderCard>)}{!deliveries.length && <Empty><Truck /><b>Nenhum delivery ativo</b><span>Pedidos de entrega aparecerão aqui enquanto estiverem na operação.</span></Empty>}</OrderList></>;
}

function Support() {
  const [orders, setOrders] = useState<Raw[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [thread, setThread] = useState<SupportThread | null>(null);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  async function load() { try { const data = await ordersService.listRestaurantOrders(); setOrders(Array.isArray(data) ? data as Raw[] : []); } catch { toast.error('Não foi possível atualizar os atendimentos.'); } }
  useEffect(() => { void load(); }, []);
  const conversations = useMemo(() => orders.flatMap((order): SupportSummary[] => { const issue = record(order.issueThread); if (!Object.keys(issue).length) return []; const messages = Array.isArray(issue.messages) ? issue.messages : []; const last = messages.length ? record(messages[messages.length - 1]) : {}; const orderId = Number(order.id || issue.orderId); if (!Number.isInteger(orderId)) return []; return [{ orderId, customer: String(record(order.user).name || issue.customerName || 'Cliente'), lastMessage: String(last.message || 'Atendimento iniciado'), resolved: Boolean(issue.isResolved) }]; }), [orders]);
  async function open(orderId: number) { setSelected(orderId); setLoading(true); try { const data = await ordersService.getIssueThread(orderId); setThread({ orderId, customerName: String(data?.customerName || 'Cliente'), orderStatus: String(data?.orderStatus || ''), isResolved: Boolean(data?.isResolved), messages: Array.isArray(data?.messages) ? data.messages : [] }); } catch (error) { toast.error(errorMessage(error, 'Não foi possível abrir este atendimento.')); } finally { setLoading(false); } }
  async function send(event: FormEvent) { event.preventDefault(); if (!selected || !draft.trim()) return; try { const data = await ordersService.replyIssue(selected, draft.trim()); setDraft(''); setThread((current) => current ? { ...current, messages: Array.isArray(data?.messages) ? data.messages : current.messages } : current); await load(); } catch (error) { toast.error(errorMessage(error, 'Não foi possível responder.')); } }
  async function resolve() { if (!selected) return; try { await ordersService.resolveIssue(selected); setThread((current) => current ? { ...current, isResolved: true } : current); toast.success('Atendimento encerrado.'); await load(); } catch (error) { toast.error(errorMessage(error, 'Não foi possível encerrar o atendimento.')); } }
  return <SupportLayout><Panel><PanelHead><div><Headphones /><span><strong>Conversas dos pedidos</strong><small>{conversations.filter((item) => !item.resolved).length} aguardando solução</small></span></div><TextButton onClick={() => void load()}><RefreshCw /> Atualizar</TextButton></PanelHead><SupportList>{conversations.map((item) => <button key={item.orderId} className={selected === item.orderId ? 'active' : ''} onClick={() => void open(item.orderId)}><span><b>Pedido #{item.orderId} · {item.customer}</b><small>{item.lastMessage}</small></span><em>{item.resolved ? 'Resolvido' : 'Aberto'}</em></button>)}{!conversations.length && <Empty><CheckCircle2 /><b>Nenhum atendimento aberto</b><span>Quando um cliente pedir ajuda pelo pedido, a conversa aparece aqui.</span></Empty>}</SupportList></Panel><Panel>{selected ? <><PanelHead><div><Headphones /><span><strong>Pedido #{selected}</strong><small>{thread?.customerName || 'Cliente'} · {thread?.orderStatus ? statusText(thread.orderStatus) : 'Carregando'}</small></span></div>{thread && !thread.isResolved && <TextButton onClick={() => void resolve()}><CheckCircle2 /> Resolver</TextButton>}</PanelHead><Chat>{loading ? <Empty><RefreshCw /><b>Carregando conversa...</b></Empty> : thread?.messages.map((message, index) => { const staff = String(message.senderType || '').toUpperCase() === 'ADMIN'; return <Bubble key={String(message.id || index)} $staff={staff}><b>{staff ? 'Restaurante' : message.senderName || 'Cliente'}</b><p>{message.message}</p>{message.sentAt && <time>{new Date(message.sentAt).toLocaleString('pt-BR')}</time>}</Bubble>; })}{thread?.isResolved && <Resolved><CheckCircle2 /> Atendimento resolvido</Resolved>}</Chat>{thread && !thread.isResolved && <Composer onSubmit={send}><textarea aria-label="Responder cliente" value={draft} onChange={(e) => setDraft(e.target.value.slice(0,600))} placeholder="Escreva uma resposta curta e clara para o cliente..." /><button disabled={!draft.trim()}><Send /></button></Composer>}</> : <Empty><Headphones /><b>Escolha um atendimento</b><span>Você verá a conversa e o status do pedido deste lado.</span></Empty>}</Panel></SupportLayout>;
}

export function AttendantOperationCenter({ attendantId, attendantName, restaurantId, restaurant, snapshot, workspaceState, onRefresh, onLogout }: Props) {
  const [view, setView] = useState<AttendantView>('overview');
  const [selectedOrder, setSelectedOrder] = useState<AttendantOrder | null>(null);
  const meta = viewMeta[view];
  return <Shell style={{ '--brand': restaurant.primaryColor } as React.CSSProperties}><Sidebar><Brand><span>{restaurant.monogram}</span><div><strong>{restaurant.name}</strong><small>Central do atendente</small></div></Brand><Nav>{(Object.keys(viewMeta) as AttendantView[]).map((id) => { const Icon = viewMeta[id].icon; return <button key={id} className={view === id ? 'active' : ''} onClick={() => setView(id)}><Icon /><span>{viewMeta[id].label}</span></button>; })}</Nav><Profile><span>{attendantName.split(/\s+/).slice(0,2).map((part) => part[0]).join('').toUpperCase()}</span><div><b>{attendantName}</b><small>Atendente</small></div><button onClick={onLogout} aria-label="Sair"><LogOut /></button></Profile></Sidebar><Main><Topbar><div><span className="eyebrow">Operação em tempo real</span><h1>{meta.title}</h1><p>{meta.subtitle}</p></div><div className="sync"><span className={workspaceState.error ? 'offline' : 'online'}>{workspaceState.error ? 'Dados preservados' : 'Operação atualizada'}</span><button onClick={() => void onRefresh()} disabled={workspaceState.refreshing}><RefreshCw className={workspaceState.refreshing ? 'spin' : ''} /> Atualizar</button></div></Topbar>{workspaceState.error && <ErrorBanner><AlertTriangle /><div><b>Não conseguimos atualizar agora</b><span>{workspaceState.error}</span></div></ErrorBanner>}<Content>{workspaceState.loading ? <Empty><RefreshCw className="spin" /><b>Carregando a operação...</b><span>Buscando pedidos, mesas e chamados.</span></Empty> : view === 'overview' ? <Overview snapshot={snapshot} onGo={setView} /> : view === 'orders' ? <Orders snapshot={snapshot} onOpen={setSelectedOrder} /> : view === 'create' ? <CreateOrder restaurantId={restaurantId} onCreated={() => { void onRefresh(); setView('orders'); }} /> : view === 'support' ? <Support /> : view === 'deliveries' ? <Deliveries snapshot={snapshot} onOpen={setSelectedOrder} /> : view === 'tables' ? <Tables snapshot={snapshot} /> : <Calls calls={snapshot.calls} attendantId={attendantId} onChanged={() => void onRefresh()} />}</Content></Main>{selectedOrder && <OrderDrawer orderId={selectedOrder.orderId} fallback={selectedOrder} onClose={() => setSelectedOrder(null)} onCompleted={() => void onRefresh()} />}</Shell>;
}

const Shell = styled.div`--brand:#e16a3d;min-height:100dvh;background:#f5f7f8;color:#18231d;display:grid;grid-template-columns:230px minmax(0,1fr);font-family:Inter,system-ui,sans-serif;@media(max-width:900px){grid-template-columns:1fr;padding-bottom:72px}`;
const Sidebar = styled.aside`position:sticky;top:0;height:100dvh;background:#153729;color:#fff;padding:20px 14px;display:flex;flex-direction:column;z-index:20;@media(max-width:900px){position:fixed;bottom:0;top:auto;width:100%;height:68px;padding:7px 8px;background:#153729;display:block}`;
const Brand = styled.div`display:flex;gap:10px;align-items:center;padding:3px 7px 22px;border-bottom:1px solid rgba(255,255,255,.1);>span{width:38px;height:38px;border-radius:12px;display:grid;place-items:center;background:var(--brand);font-weight:900}>div strong,>div small{display:block}>div strong{font-size:13px}>div small{font-size:9px;opacity:.65;margin-top:2px}@media(max-width:900px){display:none}`;
const Nav = styled.nav`display:grid;gap:5px;margin-top:18px;button{border:0;background:transparent;color:rgba(255,255,255,.68);min-height:43px;border-radius:11px;padding:0 11px;display:flex;align-items:center;gap:10px;text-align:left;font-size:11px;font-weight:750;cursor:pointer}button svg{width:17px}button:hover,button.active{background:rgba(255,255,255,.1);color:#fff}button.active{box-shadow:inset 3px 0 var(--brand)}@media(max-width:900px){display:flex;margin:0;overflow-x:auto;gap:2px;height:54px;button{min-width:68px;flex:1;min-height:54px;padding:4px;justify-content:center;flex-direction:column;gap:2px;font-size:7px}button svg{width:16px}button.active{box-shadow:inset 0 3px var(--brand)}}`;
const Profile = styled.div`margin-top:auto;border-top:1px solid rgba(255,255,255,.1);padding:15px 6px 0;display:grid;grid-template-columns:34px minmax(0,1fr) 30px;align-items:center;gap:8px;>span{width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.12);display:grid;place-items:center;font-size:10px;font-weight:900}b,small{display:block}b{font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}small{font-size:8px;opacity:.55}button{background:none;border:0;color:rgba(255,255,255,.7);cursor:pointer}button svg{width:16px}@media(max-width:900px){display:none}`;
const Main = styled.main`min-width:0;`;
const Topbar = styled.header`padding:25px clamp(18px,3vw,42px) 18px;background:#fff;border-bottom:1px solid #e8ece9;display:flex;justify-content:space-between;gap:20px;align-items:flex-end;.eyebrow{font-size:8px;letter-spacing:.12em;text-transform:uppercase;color:#6f7e75;font-weight:900}h1{font-size:clamp(23px,3vw,34px);margin:4px 0 4px;letter-spacing:-.04em}p{margin:0;color:#69776f;font-size:11px}.sync{display:flex;align-items:center;gap:10px}.sync>span{font-size:9px;font-weight:800}.online{color:#2f7a4c}.offline{color:#ad6b17}.sync button{height:38px;border:1px solid #dce4df;border-radius:11px;background:#fff;padding:0 12px;display:flex;align-items:center;gap:6px;font-weight:800;font-size:9px;cursor:pointer}.sync button svg{width:14px}@media(max-width:700px){align-items:flex-start;flex-direction:column;.sync{width:100%;justify-content:space-between}}`;
const Content = styled.div`padding:22px clamp(16px,3vw,42px) 50px;max-width:1500px;margin:auto;`;
const ErrorBanner = styled.div`margin:16px clamp(16px,3vw,42px) 0;padding:12px 15px;background:#fff7e8;border:1px solid #f1d9ad;border-radius:13px;display:flex;gap:10px;color:#79501d;svg{width:19px}b,span{display:block}b{font-size:11px}span{font-size:9px;margin-top:2px}`;
const SectionTitle = styled.div`display:flex;justify-content:space-between;align-items:end;margin-bottom:12px;h2{font-size:16px;margin:0}p{font-size:10px;color:#718078;margin:4px 0 0}`;
const PriorityGrid = styled.div`display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:11px;@media(max-width:1100px){grid-template-columns:repeat(2,1fr)}@media(max-width:560px){grid-template-columns:1fr}`;
const PriorityCard = styled.button<{ $tone:string }>`border:1px solid ${p=>p.$tone==='danger'?'#f0c9c4':p.$tone==='warning'?'#edd7a8':p.$tone==='success'?'#c9e5d3':'#caddea'};background:#fff;border-radius:17px;padding:15px;text-align:left;display:grid;grid-template-columns:38px 1fr 18px;gap:10px;align-items:start;cursor:pointer;box-shadow:0 7px 22px rgba(32,55,43,.05);.icon{width:38px;height:38px;border-radius:12px;display:grid;place-items:center;background:${p=>p.$tone==='danger'?'#fff0ee':p.$tone==='warning'?'#fff7e6':p.$tone==='success'?'#edf9f1':'#eff7fc'};color:${p=>p.$tone==='danger'?'#b84b3e':p.$tone==='warning'?'#9b6a16':p.$tone==='success'?'#367b50':'#3f718c'}}.icon svg{width:18px}.copy small,.copy strong{display:block}.copy small{font-size:8px;text-transform:uppercase;font-weight:900;color:#738078}.copy strong{font-size:25px;margin:1px 0}.copy p{font-size:9px;color:#6d7972;margin:0;line-height:1.4}>svg{width:16px;color:#9aa59f;margin-top:10px}`;
const Guide = styled.div`margin:14px 0 18px;padding:13px 15px;border:1px solid #dfe8e2;border-radius:14px;background:linear-gradient(135deg,#f4faf6,#fff);display:flex;gap:10px;align-items:flex-start;>svg{width:18px;color:#357553;flex:none}strong{display:block;font-size:10px}p{font-size:9px;color:#66766c;line-height:1.5;margin:3px 0 0}`;
const TwoCols = styled.div`display:grid;grid-template-columns:1fr 1fr;gap:14px;@media(max-width:900px){grid-template-columns:1fr}`;
const Panel = styled.section`background:#fff;border:1px solid #e1e7e3;border-radius:17px;padding:14px;box-shadow:0 7px 24px rgba(30,50,40,.04);min-width:0;`;
const PanelHead = styled.header`display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px;>div{display:flex;align-items:center;gap:9px}>div>svg{width:18px;color:#3b7354}strong,small{display:block}strong{font-size:11px}small{font-size:8px;color:#79867e;margin-top:2px}`;
const TextButton = styled.button`border:0;background:transparent;color:#376e50;font-size:9px;font-weight:850;display:flex;align-items:center;gap:4px;cursor:pointer;svg{width:13px}`;
const MiniRow = styled.div`display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:9px;padding:10px 4px;border-top:1px solid #edf0ee;.badge{font-size:8px;font-weight:900;background:#eef4f0;padding:6px 8px;border-radius:8px}b,small{display:block}b{font-size:10px}small{font-size:8px;color:#76837b;margin-top:2px}time{font-size:8px;color:#8a958f}`;
const Empty = styled.div`min-height:150px;display:flex;align-items:center;justify-content:center;flex-direction:column;text-align:center;color:#7d8a82;padding:24px;svg{width:25px;margin-bottom:8px;color:#8fa096}b{font-size:11px;color:#536159}span{font-size:9px;margin-top:4px;max-width:310px;line-height:1.45}`;
const Toolbar = styled.div`display:flex;gap:10px;align-items:center;justify-content:space-between;margin-bottom:13px;flex-wrap:wrap;`;
const SearchBox = styled.label`min-width:260px;flex:1;height:42px;border:1px solid #dce4df;background:#fff;border-radius:12px;display:flex;align-items:center;padding:0 12px;gap:8px;svg{width:16px;color:#7c8981}input{border:0;outline:0;flex:1;font-size:10px;background:transparent}@media(max-width:600px){min-width:100%}`;
const Filters = styled.div`display:flex;gap:5px;flex-wrap:wrap;button{border:1px solid #dfe5e1;background:#fff;border-radius:10px;padding:9px 11px;font-size:8px;font-weight:850;color:#66736c;cursor:pointer}button.active{background:#244d38;color:#fff;border-color:#244d38}`;
const OrderList = styled.div`display:grid;gap:9px;`;
const OrderCard = styled.article<{ $attention:boolean }>`background:#fff;border:1px solid ${p=>p.$attention?'#e8c69a':'#e1e7e3'};border-radius:15px;padding:12px 14px;display:grid;grid-template-columns:110px minmax(0,1fr) 90px auto;gap:12px;align-items:center;box-shadow:0 5px 18px rgba(30,50,40,.035);.status span,.status em{display:block}.status span{font-weight:900;font-size:12px}.status em{font-style:normal;font-size:8px;color:${p=>p.$attention?'#a06417':'#4f785e'};margin-top:3px}.main strong,.main small{display:block}.main strong{font-size:11px}.main small{font-size:8px;color:#77847c;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.time{display:flex;gap:5px;align-items:center;color:#7d8982;font-size:8px}.time svg{width:13px}>button{height:34px;border:1px solid #d8e2dc;border-radius:10px;background:#f8fbf9;color:#315e45;font-size:8px;font-weight:850;padding:0 10px;display:flex;align-items:center;gap:4px;cursor:pointer}>button svg{width:12px}@media(max-width:760px){grid-template-columns:80px 1fr;.time{display:none}>button{grid-column:1/-1;justify-content:center}.main small{white-space:normal}}`;
const DrawerBackdrop = styled.div`position:fixed;inset:0;background:rgba(15,28,21,.48);backdrop-filter:blur(4px);z-index:120;display:flex;justify-content:flex-end;`;
const Drawer = styled.aside`height:100%;width:min(480px,100%);background:#f8faf9;box-shadow:-30px 0 80px rgba(15,30,22,.2);display:flex;flex-direction:column;`;
const DrawerHead = styled.header`padding:19px 20px;background:#fff;border-bottom:1px solid #e2e8e4;display:flex;justify-content:space-between;align-items:start;small,strong,span{display:block}small{font-size:8px;text-transform:uppercase;color:#7b8980}strong{font-size:22px}span{font-size:9px;color:#3b7654;margin-top:3px}button{border:0;background:#f3f6f4;width:34px;height:34px;border-radius:10px;cursor:pointer}button svg{width:16px}`;
const DrawerBody = styled.div`padding:16px;overflow:auto;display:grid;gap:13px;`;
const InfoGrid = styled.div`display:grid;grid-template-columns:1fr 1fr;gap:10px;@media(max-width:430px){grid-template-columns:1fr}`;
const Info = styled.div`background:#fff;border:1px solid #e2e8e4;border-radius:13px;padding:12px;small,b,span{display:block}small{font-size:8px;color:#7c8981;text-transform:uppercase;font-weight:850}b{font-size:10px;margin-top:4px}b svg{width:13px;vertical-align:middle}span{font-size:8px;color:#76837b;margin-top:3px}`;
const Subhead = styled.h3`font-size:11px;margin:2px 0 7px;`;
const ItemList = styled.ul`list-style:none;padding:0;margin:0;background:#fff;border:1px solid #e2e8e4;border-radius:13px;overflow:hidden;li{padding:10px 12px;border-bottom:1px solid #edf1ee}li:last-child{border-bottom:0}b,span{display:block}b{font-size:9px}span{font-size:8px;color:#77847c;margin-top:2px}`;
const ActionBox = styled.div<{ $warning:boolean }>`padding:13px;border:1px solid ${p=>p.$warning?'#efd3a2':'#cce4d4'};background:${p=>p.$warning?'#fff8e9':'#f0faf3'};border-radius:14px;strong{font-size:10px}p{font-size:8px;line-height:1.5;color:#6d786f}button{height:38px;width:100%;border:0;border-radius:10px;background:#2f6f4a;color:#fff;font-weight:850;font-size:9px;display:flex;align-items:center;justify-content:center;gap:6px;cursor:pointer}button:disabled{opacity:.45;cursor:not-allowed}button svg{width:15px}`;
const Form = styled.form`display:grid;gap:12px;max-width:1050px;`;
const Step = styled.section`background:#fff;border:1px solid #e1e7e3;border-radius:16px;padding:16px;display:grid;grid-template-columns:34px 1fr;gap:12px;>span{width:30px;height:30px;border-radius:10px;background:#234d38;color:#fff;display:grid;place-items:center;font-size:10px;font-weight:900}h3{font-size:13px;margin:0}p{font-size:9px;color:#75827a;margin:3px 0 12px}`;
const ChoiceRow = styled.div`display:flex;gap:8px;flex-wrap:wrap;button{min-height:40px;border:1px solid #dbe3de;border-radius:11px;background:#fff;padding:0 13px;font-size:9px;font-weight:800;display:flex;align-items:center;gap:6px;cursor:pointer}button svg{width:15px}button.active{background:#eef8f1;border-color:#79a98b;color:#265f3e}`;
const FieldGrid = styled.div`display:grid;grid-template-columns:repeat(3,1fr);gap:9px;label{font-size:8px;font-weight:800;color:#647169}input{width:100%;height:39px;border:1px solid #dce4df;border-radius:9px;margin-top:4px;padding:0 10px;outline:0;font-size:9px}.wide{grid-column:span 2}@media(max-width:700px){grid-template-columns:1fr 1fr}@media(max-width:480px){grid-template-columns:1fr;.wide{grid-column:auto}}`;
const Products = styled.div`display:grid;grid-template-columns:1fr 1fr;gap:7px;@media(max-width:700px){grid-template-columns:1fr}`;
const ProductRow = styled.div<{ $disabled:boolean }>`border:1px solid #e1e7e3;border-radius:11px;padding:10px;display:flex;justify-content:space-between;align-items:center;gap:10px;opacity:${p=>p.$disabled?.55:1};b,small{display:block}b{font-size:9px}small{font-size:8px;color:#77847c;margin-top:2px}>div{display:flex;align-items:center;gap:8px}>div button{width:29px;height:29px;border:1px solid #d8e2dc;background:#f8fbf9;border-radius:8px;font-weight:900;cursor:pointer}>div button:disabled{opacity:.35}>div strong{font-size:10px;min-width:15px;text-align:center}`;
const Review = styled.div`position:sticky;bottom:12px;background:#153729;color:#fff;border-radius:16px;padding:14px 16px;display:flex;justify-content:space-between;align-items:center;gap:12px;box-shadow:0 18px 45px rgba(21,55,41,.24);small,strong,p{display:block}small{font-size:8px;opacity:.65}strong{font-size:18px}p{font-size:8px;margin:2px 0 0;opacity:.65}button{min-height:42px;border:0;border-radius:11px;background:var(--brand);color:#fff;padding:0 16px;font-size:9px;font-weight:900;display:flex;align-items:center;gap:6px;cursor:pointer}button:disabled{opacity:.45}button svg{width:15px}`;
const CallCard = styled.article`background:#fff;border:1px solid #e1e7e3;border-radius:14px;padding:12px;display:grid;grid-template-columns:90px 1fr 70px auto;gap:11px;align-items:center;.table{font-size:9px;font-weight:900;background:#eef4f0;border-radius:9px;padding:8px;text-align:center}strong,small{display:block}strong{font-size:10px}small{font-size:8px;color:#76837b;margin-top:3px}time{font-size:8px;color:#849088}button{height:34px;border:0;border-radius:9px;background:#244d38;color:#fff;padding:0 11px;font-size:8px;font-weight:850;cursor:pointer}button.success{background:#2f7850}@media(max-width:700px){grid-template-columns:80px 1fr;time{display:none}button{grid-column:1/-1}}`;
const TableGrid = styled.div`display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:11px;@media(max-width:1000px){grid-template-columns:repeat(2,1fr)}@media(max-width:600px){grid-template-columns:1fr}`;
const TableCard = styled.article<{ $attention:boolean }>`background:#fff;border:1px solid ${p=>p.$attention?'#e9c999':'#e1e7e3'};border-radius:16px;padding:14px;header{display:flex;justify-content:space-between;align-items:center}header small,header strong{display:block}header small{font-size:7px;text-transform:uppercase;color:#77847c}header strong{font-size:22px}header em{font-style:normal;font-size:8px;font-weight:850;background:${p=>p.$attention?'#fff4df':'#edf8f1'};color:${p=>p.$attention?'#956015':'#36734f'};padding:6px 8px;border-radius:8px}>div{display:flex;gap:12px;flex-wrap:wrap;margin:12px 0}>div span{font-size:8px;color:#6e7b73;display:flex;align-items:center;gap:4px}>div svg{width:13px}p{font-size:8px;color:#748179;margin:0;line-height:1.45}`;
const SupportLayout = styled.div`display:grid;grid-template-columns:380px 1fr;gap:12px;min-height:570px;@media(max-width:850px){grid-template-columns:1fr}`;
const SupportList = styled.div`display:grid;gap:6px;button{border:1px solid #e2e8e4;background:#fff;border-radius:11px;padding:10px;text-align:left;display:flex;justify-content:space-between;gap:8px;cursor:pointer}button.active{border-color:#78a98a;background:#f1f9f3}b,small{display:block}b{font-size:9px}small{font-size:8px;color:#75827a;margin-top:3px;max-width:230px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}em{font-style:normal;font-size:7px;color:#4f785e}`;
const Chat = styled.div`height:410px;overflow:auto;padding:8px;background:#f6f8f7;border-radius:12px;display:flex;flex-direction:column;gap:7px;`;
const Bubble = styled.div<{ $staff:boolean }>`max-width:82%;align-self:${p=>p.$staff?'flex-end':'flex-start'};background:${p=>p.$staff?'#dff2e5':'#fff'};border:1px solid ${p=>p.$staff?'#c2dfcb':'#e1e7e3'};border-radius:12px;padding:9px 10px;b{font-size:7px;color:#66756c}p{font-size:9px;line-height:1.45;margin:3px 0}time{font-size:7px;color:#849087}`;
const Resolved = styled.div`align-self:center;display:flex;gap:5px;align-items:center;font-size:8px;color:#397351;padding:7px 10px;background:#e8f5ec;border-radius:20px;svg{width:13px}`;
const Composer = styled.form`display:grid;grid-template-columns:1fr 42px;gap:7px;margin-top:9px;textarea{resize:none;min-height:55px;border:1px solid #dce4df;border-radius:11px;padding:9px;font:inherit;font-size:9px;outline:0}button{border:0;border-radius:11px;background:#244d38;color:#fff;cursor:pointer}button:disabled{opacity:.4}button svg{width:16px}`;
