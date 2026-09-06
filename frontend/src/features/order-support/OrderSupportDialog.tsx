import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  CreditCard,
  MapPin,
  MessageCircle,
  PackageSearch,
  Send,
  ShoppingBag,
  X,
} from 'lucide-react';
import styled from 'styled-components';
import ordersService from '../../Services/ordersService';

export type OrderSupportOrder = {
  id: number;
  status?: string;
  total?: number;
  createdAt?: string;
  summary?: string;
};

type OrderSupportMessage = {
  id?: number | string;
  senderType?: string;
  senderName?: string;
  message: string;
  sentAt?: string;
};

type OrderSupportThread = {
  orderId: number;
  isResolved: boolean;
  messages: OrderSupportMessage[];
};

type Props = {
  open: boolean;
  onClose: () => void;
  orders: OrderSupportOrder[];
  initialOrderId?: number | null;
  visitor?: boolean;
};

const CATEGORIES = [
  { id: 'delay', label: 'Pedido atrasado', icon: Clock3 },
  { id: 'items', label: 'Item errado ou faltando', icon: ShoppingBag },
  { id: 'payment', label: 'Problema com pagamento', icon: CreditCard },
  { id: 'address', label: 'Alterar endereço', icon: MapPin },
  { id: 'cancel', label: 'Cancelamento', icon: AlertCircle },
  { id: 'other', label: 'Outro assunto', icon: MessageCircle },
] as const;

function displayStatus(value?: string) {
  const labels: Record<string, string> = {
    PENDENTE: 'Recebido',
    PREPARANDO: 'Em preparo',
    PRONTO: 'Pronto',
    SAIU_PARA_ENTREGA: 'Em entrega',
    ENTREGUE: 'Entregue',
    CANCELADO: 'Cancelado',
  };
  const normalized = String(value || '').toUpperCase();
  return labels[normalized] || value || 'Pedido';
}

function money(value?: number) {
  if (!Number.isFinite(Number(value))) return '';
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function OrderSupportDialog({
  open,
  onClose,
  orders,
  initialOrderId = null,
  visitor = false,
}: Props) {
  const defaultOrderId = initialOrderId || (orders.length === 1 ? orders[0]?.id : null) || null;
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(defaultOrderId);
  const [category, setCategory] = useState('');
  const [thread, setThread] = useState<OrderSupportThread | null>(null);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const selectedOrder = useMemo(
    () => orders.find((item) => item.id === selectedOrderId) || null,
    [orders, selectedOrderId],
  );

  useEffect(() => {
    if (!open || !selectedOrderId) return undefined;
    let active = true;

    const load = async (quiet = false) => {
      if (!quiet) setLoading(true);
      try {
        const data = await ordersService.getIssueThread(selectedOrderId);
        if (!active) return;
        setThread({
          orderId: Number(data?.orderId || selectedOrderId),
          isResolved: Boolean(data?.isResolved),
          messages: Array.isArray(data?.messages) ? data.messages : [],
        });
        setError('');
      } catch (err) {
        if (!active) return;
        setThread(null);
        setError(
          (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
            'Não foi possível carregar o atendimento deste pedido.',
        );
      } finally {
        if (active && !quiet) setLoading(false);
      }
    };

    const kickoff = window.setTimeout(() => void load(), 0);
    const interval = window.setInterval(() => void load(true), 12_000);
    return () => {
      active = false;
      window.clearTimeout(kickoff);
      window.clearInterval(interval);
    };
  }, [open, selectedOrderId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [thread?.messages.length]);

  const closeAndReset = () => {
    setSelectedOrderId(defaultOrderId);
    setCategory('');
    setThread(null);
    setDraft('');
    setError('');
    onClose();
  };

  const chooseOrder = (orderId: number) => {
    setSelectedOrderId(orderId);
    setCategory('');
    setThread(null);
    setDraft('');
    setError('');
  };

  const goBack = () => {
    if (orders.length > 1 && !initialOrderId) {
      setSelectedOrderId(null);
      setThread(null);
      setCategory('');
      setDraft('');
      setError('');
      return;
    }
    closeAndReset();
  };

  if (!open) return null;

  const hasConversation = Boolean(thread?.messages.length);
  const canCompose = Boolean(
    selectedOrderId && !thread?.isResolved && (hasConversation || category),
  );

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!selectedOrderId || !canCompose || sending) return;
    const clean = draft.replace(/\s+/g, ' ').trim();
    if (!clean) return;
    const categoryLabel = CATEGORIES.find((item) => item.id === category)?.label;
    const outgoing = hasConversation || !categoryLabel ? clean : `${categoryLabel} — ${clean}`;

    setSending(true);
    setError('');
    try {
      const data = await ordersService.reportIssue(selectedOrderId, outgoing);
      setThread({
        orderId: Number(data?.orderId || selectedOrderId),
        isResolved: Boolean(data?.isResolved),
        messages: Array.isArray(data?.messages) ? data.messages : [],
      });
      setDraft('');
    } catch (err) {
      setError(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
          'Não foi possível enviar sua mensagem. Tente novamente.',
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <Backdrop
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && closeAndReset()}
    >
      <Dialog role="dialog" aria-modal="true" aria-label="Central de suporte do pedido">
        <Header>
          <div>
            <span className="icon"><MessageCircle /></span>
            <span>
              <strong>Central de ajuda</strong>
              <small>
                {visitor ? 'Suporte seguro para seu pedido' : 'Fale com o restaurante sobre um pedido'}
              </small>
            </span>
          </div>
          <button type="button" onClick={closeAndReset} aria-label="Fechar central de ajuda"><X /></button>
        </Header>

        <Body>
          <OrderRail $hidden={Boolean(selectedOrderId)}>
            <RailIntro>
              <PackageSearch />
              <strong>Sobre qual pedido precisa de ajuda?</strong>
              <span>Escolha o pedido para falar diretamente com a equipe responsável.</span>
            </RailIntro>
            <OrderList>
              {orders.map((order) => (
                <OrderButton key={order.id} type="button" onClick={() => chooseOrder(order.id)}>
                  <span>
                    <b>Pedido #{order.id}</b>
                    <small>{order.summary || displayStatus(order.status)}</small>
                  </span>
                  <span className="meta">
                    <em>{displayStatus(order.status)}</em>
                    <b>{money(order.total)}</b>
                  </span>
                </OrderButton>
              ))}
            </OrderList>
          </OrderRail>

          <Conversation $visible={Boolean(selectedOrderId)}>
            {selectedOrder ? (
              <ConversationHeader>
                <button type="button" onClick={goBack} aria-label="Voltar"><ArrowLeft /></button>
                <span>
                  <strong>Pedido #{selectedOrder.id}</strong>
                  <small>
                    {displayStatus(selectedOrder.status)}
                    {money(selectedOrder.total) ? ` • ${money(selectedOrder.total)}` : ''}
                  </small>
                </span>
              </ConversationHeader>
            ) : null}

            <ConversationMain>
              {loading ? (
                <State><MessageCircle /><strong>Carregando atendimento...</strong></State>
              ) : error && !thread ? (
                <State $error>
                  <AlertCircle />
                  <strong>{error}</strong>
                  <span>Confira se este pedido pertence a você e tente novamente.</span>
                </State>
              ) : !hasConversation ? (
                <StartSupport>
                  <div className="intro">
                    <span>Como podemos ajudar?</span>
                    <strong>Escolha o assunto</strong>
                    <p>Isso ajuda o restaurante a entender sua necessidade antes mesmo de responder.</p>
                  </div>
                  <CategoryGrid>
                    {CATEGORIES.map(({ id, label, icon: Icon }) => (
                      <button
                        key={id}
                        type="button"
                        className={category === id ? 'active' : ''}
                        aria-pressed={category === id}
                        onClick={() => setCategory(id)}
                      >
                        <Icon /> <span>{label}</span>
                      </button>
                    ))}
                  </CategoryGrid>
                  {category ? (
                    <Hint>
                      Conte em poucas palavras o que aconteceu. O número do pedido será enviado automaticamente.
                    </Hint>
                  ) : null}
                </StartSupport>
              ) : (
                <Messages aria-live="polite">
                  <SystemNote>
                    <CheckCircle2 /> Atendimento vinculado ao Pedido #{selectedOrderId}. Não é necessário informar seus dados novamente.
                  </SystemNote>
                  {thread?.messages.map((message, index) => {
                    const client = String(message.senderType || '').toUpperCase() === 'CLIENT';
                    return (
                      <Bubble key={String(message.id || `${message.sentAt}-${index}`)} $client={client}>
                        <b>{client ? 'Você' : message.senderName || 'Restaurante'}</b>
                        <p>{message.message}</p>
                        {message.sentAt ? (
                          <time>
                            {new Date(message.sentAt).toLocaleString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit',
                              day: '2-digit',
                              month: '2-digit',
                            })}
                          </time>
                        ) : null}
                      </Bubble>
                    );
                  })}
                  <div ref={endRef} />
                </Messages>
              )}
            </ConversationMain>

            {thread?.isResolved ? (
              <Resolved>
                <CheckCircle2 />
                <span><b>Atendimento resolvido</b><small>Esta conversa está disponível para consulta.</small></span>
              </Resolved>
            ) : selectedOrderId ? (
              <ComposerArea>
                {error && thread ? <ErrorText role="alert">{error}</ErrorText> : null}
                <Composer onSubmit={submit}>
                  <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value.slice(0, 600))}
                    placeholder={category || hasConversation ? 'Digite sua mensagem...' : 'Escolha um assunto acima para começar'}
                    disabled={!canCompose || sending}
                    aria-label="Mensagem para o suporte do restaurante"
                    rows={2}
                  />
                  <button
                    type="submit"
                    disabled={!canCompose || !draft.trim() || sending}
                    aria-label="Enviar mensagem"
                  >
                    <Send />
                  </button>
                </Composer>
                <small>
                  {visitor
                    ? 'Seu acesso é protegido pelo comprovante seguro deste pedido.'
                    : 'A equipe verá automaticamente o número e os dados deste pedido.'}
                </small>
              </ComposerArea>
            ) : null}
          </Conversation>
        </Body>
      </Dialog>
    </Backdrop>
  );
}

const Backdrop = styled.div`
  position: fixed; inset: 0; z-index: 3200; display: grid; place-items: center; padding: 24px;
  background: rgba(15, 23, 42, .52); backdrop-filter: blur(7px);
  @media (max-width: 720px) { padding: 0; place-items: stretch; }
`;
const Dialog = styled.section`
  width: min(940px, 100%); height: min(700px, calc(100dvh - 48px)); overflow: hidden;
  display: grid; grid-template-rows: auto minmax(0,1fr); background: #fff; border: 1px solid #e2e8f0;
  border-radius: 22px; box-shadow: 0 30px 100px rgba(15,23,42,.28); color: #172033;
  @media (max-width: 720px) { width: 100vw; height: 100dvh; border: 0; border-radius: 0; }
`;
const Header = styled.header`
  min-height: 74px; padding: 14px 18px; display: flex; align-items: center; justify-content: space-between;
  border-bottom: 1px solid #e7edf5;
  > div { display:flex; align-items:center; gap:11px; min-width:0; }
  .icon { width:42px;height:42px;display:grid;place-items:center;border-radius:13px;background:#fff2ed;color:#d65632; }
  .icon svg{width:21px;} strong,small{display:block;} strong{font-size:17px;} small{color:#718096;font-size:11px;margin-top:2px;}
  > button{width:40px;height:40px;display:grid;place-items:center;border:1px solid #dce4ef;border-radius:11px;background:#fff;cursor:pointer;}
  > button svg{width:18px;}
  @media(max-width:720px){padding-top:max(12px,env(safe-area-inset-top));min-height:68px;.icon{width:38px;height:38px;}strong{font-size:15px;}}
`;
const Body = styled.div`
  min-height:0;display:grid;grid-template-columns:minmax(280px,330px) minmax(0,1fr);
  @media(max-width:720px){grid-template-columns:1fr;}
`;
const OrderRail = styled.aside<{ $hidden:boolean }>`
  min-height:0;overflow:auto;padding:16px;background:#f8fafc;border-right:1px solid #e7edf5;
  @media(max-width:720px){display:${(props)=>props.$hidden?'none':'block'};border-right:0;}
`;
const RailIntro = styled.div`
  padding:8px 4px 16px;display:grid;gap:5px;svg{width:25px;color:#d65632;}strong{font-size:14px;}span{font-size:11px;color:#64748b;line-height:1.45;}
`;
const OrderList = styled.div`display:grid;gap:8px;`;
const OrderButton = styled.button`
  width:100%;padding:12px;display:flex;justify-content:space-between;gap:10px;text-align:left;border:1px solid #e2e8f0;border-radius:13px;background:#fff;cursor:pointer;transition:.16s;
  span{min-width:0;}b,small{display:block;}b{font-size:12px;}small{margin-top:3px;color:#64748b;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}.meta{text-align:right;flex:0 0 auto;}.meta em{display:block;color:#27804b;font-size:9px;font-style:normal;font-weight:800;margin-bottom:4px;}.meta b{font-size:11px;}&:hover{border-color:#edb9a7;box-shadow:0 8px 20px rgba(15,23,42,.06);}
`;
const Conversation = styled.section<{ $visible:boolean }>`
  min-height:0;min-width:0;display:grid;grid-template-rows:auto minmax(0,1fr) auto;background:#fff;
  @media(max-width:720px){display:${(props)=>props.$visible?'grid':'none'};}
`;
const ConversationHeader = styled.header`
  min-height:62px;padding:10px 14px;display:flex;align-items:center;gap:10px;border-bottom:1px solid #e7edf5;
  button{width:38px;height:38px;display:grid;place-items:center;border:1px solid #dce4ef;border-radius:10px;background:#fff;cursor:pointer;}button svg{width:18px;}span{min-width:0;}strong,small{display:block;}strong{font-size:13px;}small{margin-top:2px;color:#64748b;font-size:10px;}
`;
const ConversationMain = styled.div`min-height:0;min-width:0;overflow:auto;background:#f8fafc;`;
const State = styled.div<{ $error?:boolean }>`
  height:100%;min-height:240px;padding:28px;display:grid;place-items:center;align-content:center;gap:7px;text-align:center;color:${(props)=>props.$error?'#b42318':'#64748b'};svg{width:28px;}strong{font-size:13px;}span{max-width:330px;font-size:11px;line-height:1.45;}
`;
const StartSupport = styled.div`
  padding:22px;display:grid;gap:18px;.intro span{font-size:10px;color:#d65632;font-weight:900;text-transform:uppercase;letter-spacing:.06em;}.intro strong{display:block;margin-top:4px;font-size:19px;}.intro p{margin:5px 0 0;color:#64748b;font-size:11px;line-height:1.5;}@media(max-width:480px){padding:16px;.intro strong{font-size:17px;}}
`;
const CategoryGrid = styled.div`
  display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;button{min-height:62px;padding:10px;display:flex;align-items:center;gap:9px;border:1px solid #dde5ef;border-radius:13px;background:#fff;color:#334155;text-align:left;font-size:11px;font-weight:800;cursor:pointer;}button svg{width:19px;flex:0 0 auto;color:#d65632;}button.active{border-color:#df7656;background:#fff5f1;box-shadow:0 0 0 2px rgba(214,86,50,.08);}@media(max-width:380px){grid-template-columns:1fr;button{min-height:52px;}}
`;
const Hint = styled.div`padding:10px 12px;border-radius:11px;background:#fff7ed;color:#9a4b1d;font-size:10px;line-height:1.45;`;
const Messages = styled.div`min-height:100%;padding:16px;display:flex;flex-direction:column;gap:9px;overflow-wrap:anywhere;@media(max-width:480px){padding:12px;}`;
const SystemNote = styled.div`align-self:center;max-width:90%;padding:7px 10px;display:flex;align-items:center;gap:6px;border:1px solid #cce5d5;border-radius:12px;background:#f0fdf4;color:#267044;font-size:9px;font-weight:700;text-align:center;svg{width:14px;flex:0 0 auto;}`;
const Bubble = styled.div<{ $client:boolean }>`
  align-self:${(props)=>props.$client?'flex-end':'flex-start'};max-width:min(78%,480px);padding:9px 11px;border:1px solid ${(props)=>props.$client?'#f1c7b8':'#e2e8f0'};border-radius:${(props)=>props.$client?'14px 14px 4px 14px':'14px 14px 14px 4px'};background:${(props)=>props.$client?'#fff5f1':'#fff'};b{display:block;margin-bottom:3px;font-size:9px;color:#64748b;}p{margin:0;font-size:12px;line-height:1.45;white-space:pre-wrap;}time{display:block;margin-top:4px;text-align:right;color:#94a3b8;font-size:8px;}@media(max-width:480px){max-width:88%;}
`;
const ComposerArea = styled.footer`padding:10px 12px max(10px,env(safe-area-inset-bottom));border-top:1px solid #e7edf5;background:#fff;>small{display:block;margin-top:6px;color:#7c8799;font-size:8px;}`;
const Composer = styled.form`
  display:grid;grid-template-columns:minmax(0,1fr) 44px;gap:8px;textarea{width:100%;min-width:0;max-height:100px;resize:none;padding:10px 11px;border:1px solid #cfd8e5;border-radius:12px;font:inherit;font-size:13px;outline:0;}textarea:focus{border-color:#d65632;box-shadow:0 0 0 3px rgba(214,86,50,.10);}button{border:0;border-radius:12px;background:#d65632;color:#fff;display:grid;place-items:center;cursor:pointer;}button:disabled{opacity:.45;cursor:not-allowed;}button svg{width:18px;}@media(max-width:720px){textarea{font-size:16px;}}
`;
const ErrorText = styled.div`margin-bottom:7px;color:#b42318;font-size:10px;`;
const Resolved = styled.footer`padding:12px 14px max(12px,env(safe-area-inset-bottom));display:flex;align-items:center;justify-content:center;gap:8px;border-top:1px solid #dbe5df;background:#f0fdf4;color:#267044;svg{width:18px;}b,small{display:block;}b{font-size:11px;}small{font-size:9px;margin-top:2px;}`;
