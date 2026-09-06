import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronRight,
  Headphones,
  Inbox,
  MessageCircle,
  RefreshCw,
  Send,
  X,
} from 'lucide-react';
import styled from 'styled-components';
import { toast } from 'react-toastify';
import ordersService from '../../../Services/ordersService';

type RawOrder = Record<string, unknown>;
type Message = {
  id?: string | number;
  senderType?: string;
  senderName?: string;
  message: string;
  sentAt?: string;
};
type Thread = {
  orderId: number;
  isResolved: boolean;
  customerName?: string;
  orderStatus?: string;
  total?: number;
  messages: Message[];
};

type ConversationSummary = {
  orderId: number;
  customerName: string;
  status: string;
  isResolved: boolean;
  lastMessage: string;
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function orderThread(order: RawOrder): ConversationSummary | null {
  const issueThread = record(order.issueThread);
  if (!Object.keys(issueThread).length) return null;
  const messages = Array.isArray(issueThread.messages) ? issueThread.messages : [];
  const lastMessage = messages.length ? record(messages[messages.length - 1]) : {};
  const orderId = Number(order.id || issueThread.orderId || 0);
  if (!Number.isInteger(orderId) || orderId <= 0) return null;

  return {
    orderId,
    customerName: String(record(order.user).name || issueThread.customerName || 'Cliente'),
    status: String(order.status || issueThread.orderStatus || ''),
    isResolved: Boolean(issueThread.isResolved),
    lastMessage: String(lastMessage.message || ''),
  };
}

export function AdminOrderSupportInbox() {
  const [orders, setOrders] = useState<RawOrder[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [thread, setThread] = useState<Thread | null>(null);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState<'open' | 'all'>('open');

  const loadOrders = useCallback(async () => {
    try {
      const data = await ordersService.listRestaurantOrders();
      setOrders(Array.isArray(data) ? (data as RawOrder[]) : []);
    } catch {
      // O restante do painel segue disponível caso o suporte esteja temporariamente indisponível.
    }
  }, []);

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => void loadOrders(), 0);
    const interval = window.setInterval(() => void loadOrders(), 12_000);
    return () => {
      window.clearTimeout(initialRefresh);
      window.clearInterval(interval);
    };
  }, [loadOrders]);

  const conversations = useMemo(
    () =>
      orders
        .map(orderThread)
        .filter((item): item is ConversationSummary => Boolean(item)),
    [orders],
  );
  const openCount = conversations.filter((item) => !item.isResolved).length;
  const visible =
    filter === 'open' ? conversations.filter((item) => !item.isResolved) : conversations;

  useEffect(() => {
    if (!open || !selectedId) return undefined;
    let active = true;

    const loadThread = async (quiet = false) => {
      if (!quiet) setLoading(true);
      try {
        const data = await ordersService.getIssueThread(selectedId);
        if (!active) return;
        setThread({
          orderId: Number(data?.orderId || selectedId),
          isResolved: Boolean(data?.isResolved),
          customerName: String(data?.customerName || ''),
          orderStatus: String(data?.orderStatus || ''),
          total: Number(data?.total || 0),
          messages: Array.isArray(data?.messages) ? data.messages : [],
        });
      } catch {
        if (active) toast.error('Não foi possível carregar este atendimento.');
      } finally {
        if (active && !quiet) setLoading(false);
      }
    };

    const initialRefresh = window.setTimeout(() => void loadThread(), 0);
    const interval = window.setInterval(() => void loadThread(true), 10_000);
    return () => {
      active = false;
      window.clearTimeout(initialRefresh);
      window.clearInterval(interval);
    };
  }, [open, selectedId]);

  const closeDialog = () => {
    setOpen(false);
    setSelectedId(null);
    setThread(null);
    setDraft('');
  };

  async function send(event: FormEvent) {
    event.preventDefault();
    if (!selectedId || !draft.trim() || sending || thread?.isResolved) return;
    setSending(true);
    try {
      const data = await ordersService.replyIssue(selectedId, draft.trim());
      setThread((current) => ({
        orderId: Number(data?.orderId || selectedId),
        isResolved: Boolean(data?.isResolved),
        customerName: String(data?.customerName || current?.customerName || ''),
        orderStatus: String(data?.orderStatus || current?.orderStatus || ''),
        total: Number(data?.total || current?.total || 0),
        messages: Array.isArray(data?.messages) ? data.messages : [],
      }));
      setDraft('');
      await loadOrders();
    } catch (error) {
      toast.error(
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ||
          'Não foi possível responder ao cliente.',
      );
    } finally {
      setSending(false);
    }
  }

  async function resolve() {
    if (!selectedId || thread?.isResolved) return;
    try {
      await ordersService.resolveIssue(selectedId);
      setThread((current) => (current ? { ...current, isResolved: true } : current));
      await loadOrders();
      toast.success(`Atendimento do pedido #${selectedId} encerrado.`);
    } catch {
      toast.error('Não foi possível encerrar este atendimento.');
    }
  }

  return (
    <>
      <Summary>
        <span className="icon"><Headphones /></span>
        <span className="copy">
          <small>Atendimento ao cliente</small>
          <strong>Suporte dos pedidos</strong>
          <p>Converse com clientes e visitantes sem misturar o atendimento com a operação do pedido.</p>
        </span>
        <span className="count">
          <b>{openCount}</b>
          <small>{openCount === 1 ? 'caso aberto' : 'casos abertos'}</small>
        </span>
        <button type="button" onClick={() => setOpen(true)}>
          Abrir atendimentos <ChevronRight />
        </button>
      </Summary>

      {open && (
        <Backdrop
          role="presentation"
          onMouseDown={(event) => event.target === event.currentTarget && closeDialog()}
        >
          <Dialog role="dialog" aria-modal="true" aria-label="Suporte dos pedidos">
            <Header>
              <span>
                <Inbox />
                <span>
                  <b>Suporte dos pedidos</b>
                  <small>{openCount} aguardando atendimento</small>
                </span>
              </span>
              <button type="button" onClick={closeDialog} aria-label="Fechar suporte"><X /></button>
            </Header>

            <Layout>
              <Sidebar $hidden={Boolean(selectedId)}>
                <Filters>
                  <button
                    type="button"
                    className={filter === 'open' ? 'active' : ''}
                    onClick={() => setFilter('open')}
                  >
                    Abertos <b>{openCount}</b>
                  </button>
                  <button
                    type="button"
                    className={filter === 'all' ? 'active' : ''}
                    onClick={() => setFilter('all')}
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    className="refresh"
                    aria-label="Atualizar atendimentos"
                    onClick={() => void loadOrders()}
                  >
                    <RefreshCw />
                  </button>
                </Filters>
                <List>
                  {visible.map((item) => (
                    <button
                      key={item.orderId}
                      type="button"
                      onClick={() => setSelectedId(item.orderId)}
                    >
                      <span>
                        <b>Pedido #{item.orderId}</b>
                        <small>{item.customerName}</small>
                        <p>{item.lastMessage || 'Atendimento iniciado'}</p>
                      </span>
                      <em className={item.isResolved ? 'resolved' : ''}>
                        {item.isResolved ? 'Resolvido' : 'Aberto'}
                      </em>
                    </button>
                  ))}
                  {!visible.length && (
                    <Empty>
                      <CheckCircle2 />
                      <b>Nenhum atendimento pendente</b>
                      <span>Novas mensagens aparecerão aqui automaticamente.</span>
                    </Empty>
                  )}
                </List>
              </Sidebar>

              <Conversation $visible={Boolean(selectedId)}>
                {selectedId ? (
                  <ConversationHeader>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedId(null);
                        setThread(null);
                        setDraft('');
                      }}
                      aria-label="Voltar à lista"
                    >
                      ‹
                    </button>
                    <span>
                      <b>Pedido #{selectedId}</b>
                      <small>
                        {thread?.customerName || 'Cliente'}
                        {thread?.orderStatus ? ` • ${thread.orderStatus}` : ''}
                      </small>
                    </span>
                    {!thread?.isResolved && (
                      <button className="resolve" type="button" onClick={() => void resolve()}>
                        <CheckCircle2 /> Resolver
                      </button>
                    )}
                  </ConversationHeader>
                ) : null}

                <Messages>
                  {loading ? (
                    <Empty><MessageCircle /><b>Carregando conversa...</b></Empty>
                  ) : (
                    thread?.messages.map((message, index) => {
                      const admin = String(message.senderType || '').toUpperCase() === 'ADMIN';
                      return (
                        <Bubble key={String(message.id || `${message.sentAt}-${index}`)} $admin={admin}>
                          <b>{admin ? 'Restaurante' : message.senderName || 'Cliente'}</b>
                          <p>{message.message}</p>
                          {message.sentAt ? <time>{new Date(message.sentAt).toLocaleString('pt-BR')}</time> : null}
                        </Bubble>
                      );
                    })
                  )}
                  {thread?.isResolved && (
                    <Resolved><CheckCircle2 /> Atendimento encerrado</Resolved>
                  )}
                </Messages>

                {selectedId && !thread?.isResolved && (
                  <Composer onSubmit={send}>
                    <textarea
                      value={draft}
                      onChange={(event) => setDraft(event.target.value.slice(0, 600))}
                      placeholder="Responda ao cliente..."
                      aria-label="Resposta do restaurante"
                      rows={2}
                    />
                    <button type="submit" disabled={!draft.trim() || sending} aria-label="Enviar resposta">
                      <Send />
                    </button>
                  </Composer>
                )}
              </Conversation>
            </Layout>
          </Dialog>
        </Backdrop>
      )}
    </>
  );
}

const Summary = styled.section`
  margin:0 0 18px;padding:16px 18px;display:grid;grid-template-columns:44px minmax(0,1fr) auto auto;align-items:center;gap:12px;
  border:1px solid #dfe8e2;border-radius:16px;background:linear-gradient(135deg,#f4fbf6,#fff);
  .icon{width:44px;height:44px;display:grid;place-items:center;border-radius:13px;background:#e8f6ec;color:#267044}.icon svg{width:21px}
  .copy small,.copy strong{display:block}.copy small{font-size:9px;text-transform:uppercase;color:#4d8060;font-weight:900}.copy strong{font-size:15px;margin-top:2px}.copy p{margin:3px 0 0;font-size:10px;color:#657468}
  .count{text-align:center;padding:0 12px}.count b,.count small{display:block}.count b{font-size:20px;color:#267044}.count small{font-size:8px;color:#718079;white-space:nowrap}
  >button{min-height:40px;padding:0 13px;border:0;border-radius:11px;background:#244d38;color:#fff;font-weight:800;font-size:10px;display:flex;align-items:center;gap:6px;cursor:pointer}>button svg{width:15px}
  @media(max-width:760px){grid-template-columns:40px 1fr auto;.count{padding:0}.copy p{display:none}>button{grid-column:1/-1;justify-content:center;width:100%}}
`;
const Backdrop = styled.div`
  position:fixed;inset:0;z-index:3300;display:grid;place-items:center;padding:22px;background:rgba(15,23,42,.55);backdrop-filter:blur(7px);
  @media(max-width:720px){padding:0;place-items:stretch}
`;
const Dialog = styled.section`
  width:min(1040px,100%);height:min(720px,calc(100dvh - 44px));display:grid;grid-template-rows:auto minmax(0,1fr);overflow:hidden;border-radius:20px;background:#fff;box-shadow:0 32px 100px rgba(15,23,42,.28);
  @media(max-width:720px){width:100vw;height:100dvh;border-radius:0}
`;
const Header = styled.header`
  min-height:70px;padding:13px 16px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e4eaf0;
  >span{display:flex;align-items:center;gap:10px}>span>svg{width:22px;color:#267044}b,small{display:block}b{font-size:15px}small{font-size:9px;color:#718096;margin-top:2px}
  >button{width:38px;height:38px;border:1px solid #dce3eb;border-radius:10px;background:#fff;display:grid;place-items:center;cursor:pointer}>button svg{width:17px}
  @media(max-width:720px){padding-top:max(12px,env(safe-area-inset-top))}
`;
const Layout = styled.div`min-height:0;display:grid;grid-template-columns:minmax(290px,340px) minmax(0,1fr);@media(max-width:720px){grid-template-columns:1fr}`;
const Sidebar = styled.aside<{ $hidden:boolean }>`min-height:0;overflow:auto;border-right:1px solid #e6ebf1;background:#f8fafc;@media(max-width:720px){display:${(props)=>props.$hidden?'none':'block'};border-right:0}`;
const Filters = styled.div`
  position:sticky;top:0;z-index:2;padding:11px;display:flex;gap:6px;background:rgba(248,250,252,.96);border-bottom:1px solid #e7ecf1;
  button{padding:7px 9px;border:1px solid #dce3eb;border-radius:9px;background:#fff;font-size:9px;font-weight:800;cursor:pointer}.active{background:#e8f6ec;border-color:#bcd8c5;color:#267044}.refresh{margin-left:auto;width:32px;padding:0;display:grid;place-items:center}.refresh svg{width:14px}
`;
const List = styled.div`
  padding:10px;display:grid;gap:7px;>button{width:100%;padding:11px;display:flex;justify-content:space-between;gap:8px;border:1px solid #e0e7ef;border-radius:12px;background:#fff;text-align:left;cursor:pointer}>button span{min-width:0}>button b,>button small{display:block}>button b{font-size:11px}>button small{font-size:9px;color:#64748b;margin-top:2px}>button p{margin:5px 0 0;font-size:9px;color:#7c8798;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}>button em{font-style:normal;font-size:8px;font-weight:900;color:#c2410c;background:#fff2e8;padding:4px 6px;border-radius:999px;height:max-content}.resolved{color:#267044!important;background:#ecf8ef!important}
`;
const Empty = styled.div`min-height:150px;display:grid;place-items:center;align-content:center;text-align:center;gap:5px;padding:20px;color:#718096;svg{width:25px}b{font-size:11px}span{font-size:9px}`;
const Conversation = styled.section<{ $visible:boolean }>`min-width:0;min-height:0;display:grid;grid-template-rows:auto minmax(0,1fr) auto;@media(max-width:720px){display:${(props)=>props.$visible?'grid':'none'}}`;
const ConversationHeader = styled.header`
  min-height:62px;padding:9px 12px;display:grid;grid-template-columns:38px minmax(0,1fr) auto;align-items:center;gap:8px;border-bottom:1px solid #e6ebf1;
  >button{width:36px;height:36px;border:1px solid #dce3eb;border-radius:10px;background:#fff;cursor:pointer;font-size:20px}span b,span small{display:block}span b{font-size:12px}span small{font-size:9px;color:#718096;margin-top:2px}.resolve{width:auto;padding:0 10px;display:flex;align-items:center;gap:5px;font-size:9px;color:#267044;border-color:#bad5c2}.resolve svg{width:14px}
`;
const Messages = styled.div`min-height:0;overflow:auto;padding:15px;background:#f8fafc;display:flex;flex-direction:column;gap:8px;@media(max-width:480px){padding:11px}`;
const Bubble = styled.div<{ $admin:boolean }>`
  align-self:${(props)=>props.$admin?'flex-end':'flex-start'};max-width:min(76%,500px);padding:9px 11px;border:1px solid ${(props)=>props.$admin?'#c5dfcd':'#e0e7ef'};border-radius:${(props)=>props.$admin?'14px 14px 4px 14px':'14px 14px 14px 4px'};background:${(props)=>props.$admin?'#eef9f1':'#fff'};overflow-wrap:anywhere;
  b{font-size:8px;color:#6b7b72}p{margin:3px 0 0;font-size:11px;line-height:1.45}time{display:block;margin-top:4px;font-size:7px;color:#94a3b8;text-align:right}@media(max-width:480px){max-width:88%}
`;
const Resolved = styled.div`align-self:center;margin:8px;padding:7px 10px;border-radius:999px;background:#eaf7ee;color:#267044;font-size:9px;font-weight:800;display:flex;align-items:center;gap:5px;svg{width:14px}`;
const Composer = styled.form`
  padding:10px 12px max(10px,env(safe-area-inset-bottom));display:grid;grid-template-columns:minmax(0,1fr) 44px;gap:8px;border-top:1px solid #e6ebf1;background:#fff;
  textarea{min-width:0;resize:none;padding:9px 10px;border:1px solid #ccd7e3;border-radius:11px;font:inherit;font-size:12px;outline:0}textarea:focus{border-color:#629776;box-shadow:0 0 0 3px rgba(38,112,68,.1)}button{border:0;border-radius:11px;background:#267044;color:#fff;display:grid;place-items:center;cursor:pointer}button:disabled{opacity:.45}button svg{width:17px}@media(max-width:720px){textarea{font-size:16px}}
`;
