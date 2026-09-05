import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Bike, MessageCircle, Send, Store, UserRound } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import deliveryChatService, {
  type DeliveryChatMessage,
  type DeliveryChatSnapshot,
} from '../../Services/deliveryChatService';
import { acquireSocket } from '../../Services/socketService';
import { getAccessToken } from '../../modules/auth/session/authSession';
import { useAuth } from '../../contexts/authContext';
import * as S from './DeliveryChat.styles';

const POLL_INTERVAL_MS = 5_000;

function mergeMessage(list: DeliveryChatMessage[], incoming: DeliveryChatMessage) {
  if (list.some((item) => item.id === incoming.id)) return list;
  return [...list, incoming].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

export default function DeliveryChatPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const orderId = Number(id || 0);
  const hasInvalidOrderId = !Number.isInteger(orderId) || orderId <= 0;
  const [snapshot, setSnapshot] = useState<DeliveryChatSnapshot | null>(null);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(!hasInvalidOrderId);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const snapshotRef = useRef<DeliveryChatSnapshot | null>(null);
  const actorRole = String(user?.role || 'CLIENTE').toUpperCase();

  useEffect(() => {
    if (hasInvalidOrderId) return;

    let active = true;
    let inFlight = false;
    const refresh = async (silent = false) => {
      if (inFlight) return;
      inFlight = true;
      if (!silent) setLoading(true);
      try {
        const data = await deliveryChatService.get(orderId);
        if (!active) return;
        setSnapshot((current) => {
          const next = current
            ? {
                ...data,
                messages: data.messages.reduce(
                  (messages, message) => mergeMessage(messages, message),
                  current.messages,
                ),
              }
            : data;
          snapshotRef.current = next;
          return next;
        });
        setError('');
      } catch (err) {
        if (!active) return;
        const message =
          (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
          (err as Error)?.message ||
          'Não foi possível abrir a conversa.';
        if (!snapshotRef.current) setError(message);
      } finally {
        inFlight = false;
        if (active) setLoading(false);
      }
    };

    void refresh();
    const poll = window.setInterval(() => void refresh(true), POLL_INTERVAL_MS);
    const token = getAccessToken();
    if (!token) {
      return () => {
        active = false;
        window.clearInterval(poll);
      };
    }

    const { socket, release } = acquireSocket(token, `delivery-chat-${orderId}`);
    const onMessage = (event: unknown) => {
      const payload = event as { orderId?: number; message?: DeliveryChatMessage };
      if (Number(payload?.orderId || 0) !== orderId || !payload?.message) return;
      setSnapshot((current) => {
        if (!current) return current;
        const next = {
          ...current,
          messages: mergeMessage(current.messages, payload.message as DeliveryChatMessage),
        };
        snapshotRef.current = next;
        return next;
      });
    };
    const onStatus = (event: unknown) => {
      const raw = event as { id?: number; order?: { id?: number } };
      const eventOrderId = Number(raw?.order?.id || raw?.id || 0);
      if (eventOrderId === orderId) void refresh(true);
    };
    socket.on('delivery:chat-message', onMessage);
    socket.on('order:status-changed', onStatus);

    return () => {
      active = false;
      window.clearInterval(poll);
      socket.off('delivery:chat-message', onMessage);
      socket.off('order:status-changed', onStatus);
      release();
    };
  }, [hasInvalidOrderId, orderId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [snapshot?.messages.length]);

  const myMessageRole = useMemo(
    () => (actorRole === 'MOTOQUEIRO' ? 'COURIER' : 'CUSTOMER'),
    [actorRole],
  );

  async function submit(event: FormEvent) {
    event.preventDefault();
    const message = draft.replace(/\s+/g, ' ').trim();
    if (!message || !snapshot || snapshot.thread.readOnly || sending) return;
    setSending(true);
    setError('');
    try {
      const result = await deliveryChatService.send(orderId, message);
      const sent = result?.message as DeliveryChatMessage | undefined;
      if (sent) {
        setSnapshot((current) => {
          if (!current) return current;
          const next = { ...current, messages: mergeMessage(current.messages, sent) };
          snapshotRef.current = next;
          return next;
        });
      }
      setDraft('');
    } catch (err) {
      setError(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
          'Não foi possível enviar a mensagem.',
      );
    } finally {
      setSending(false);
    }
  }

  if (hasInvalidOrderId) {
    return (
      <S.State role="alert">
        <div><MessageCircle /><h1>Pedido inválido</h1><p>Volte ao pedido e abra a conversa novamente.</p></div>
      </S.State>
    );
  }

  if (loading && !snapshot) {
    return (
      <S.State role="status">
        <div><MessageCircle /><h1>Abrindo conversa...</h1><p>Carregando os dados do pedido e as mensagens.</p></div>
      </S.State>
    );
  }

  if (error && !snapshot) {
    return (
      <S.State role="alert">
        <div><MessageCircle /><h1>Conversa indisponível</h1><p>{error}</p></div>
      </S.State>
    );
  }

  if (!snapshot) return null;

  return (
    <S.Page>
      <S.Shell>
        <div>
          <S.Header>
            <button type="button" onClick={() => navigate(-1)} aria-label="Voltar">
              <ArrowLeft />
            </button>
            <div className="identity">
              <strong>
                {actorRole === 'MOTOQUEIRO'
                  ? `${snapshot.order.customerName} · Pedido #${snapshot.order.id}`
                  : `${snapshot.order.courierName} · Pedido #${snapshot.order.id}`}
              </strong>
              <span>{snapshot.order.restaurantName}</span>
            </div>
            <span className="live">Tempo real</span>
          </S.Header>
          <S.Context aria-label="Informações da conversa">
            <span><Store size={13} />{snapshot.order.restaurantName}</span>
            <span><UserRound size={13} />{snapshot.order.customerName}</span>
            {snapshot.order.customerPhone ? (
              <span><MessageCircle size={13} />{snapshot.order.customerPhone}</span>
            ) : null}
            <span><Bike size={13} />{snapshot.order.courierName}</span>
          </S.Context>
        </div>

        <S.Messages aria-live="polite">
          {snapshot.messages.length === 0 ? (
            <S.Empty>
              <MessageCircle />
              <strong>Conversa do pedido #{snapshot.order.id}</strong>
              <p>
                Use este chat somente para combinar detalhes desta entrega. A conversa fica vinculada
                ao pedido e é encerrada quando a entrega termina.
              </p>
            </S.Empty>
          ) : (
            snapshot.messages.map((message) => (
              <S.Message key={message.id} $mine={message.senderRole === myMessageRole}>
                <b>{message.senderName}</b>
                <p>{message.message}</p>
                <time dateTime={message.createdAt}>
                  {new Date(message.createdAt).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </time>
              </S.Message>
            ))
          )}
          <div ref={messagesEndRef} />
        </S.Messages>

        <div>
          {error ? <div role="alert" style={{ padding: '8px 16px', color: '#b42318', fontSize: 12 }}>{error}</div> : null}
          <S.Composer onSubmit={submit}>
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value.slice(0, 500))}
              disabled={snapshot.thread.readOnly || sending}
              placeholder={snapshot.thread.readOnly ? 'Conversa encerrada' : 'Digite uma mensagem...'}
              aria-label="Mensagem para a entrega"
            />
            <button
              type="submit"
              disabled={snapshot.thread.readOnly || sending || !draft.trim()}
              aria-label="Enviar mensagem"
            >
              <Send size={18} />
            </button>
          </S.Composer>
        </div>
      </S.Shell>
    </S.Page>
  );
}
