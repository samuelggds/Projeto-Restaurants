import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, MessageCircle, Send, X } from 'lucide-react';
import styled, { css, keyframes } from 'styled-components';
import { useAuth } from '../../../contexts/authContext';
import deliveryChatService, {
  type CourierChatConversation,
  type DeliveryChatMessage,
  type DeliveryChatSnapshot,
} from '../../../Services/deliveryChatService';
import { getAccessToken } from '../../../modules/auth/session/authSession';
import { acquireSocket } from '../../../Services/socketService';
import { useDraggableFloatingActions } from '../../Home/hooks/useDraggableFloatingActions';

const QUICK_REPLIES = [
  'Estou a caminho.',
  'Cheguei ao endereço.',
  'Estou na portaria.',
  'Não encontrei o endereço.',
  'Pode me encontrar na entrada?',
  'Tive um imprevisto, chegarei em alguns minutos.',
] as const;

type DeliveryChatRealtimeEvent = {
  orderId?: number;
  restaurantId?: number;
  courierId?: number | null;
  customerName?: string;
  message?: DeliveryChatMessage;
};

type MessagePreviewState = {
  orderId: number;
  customerName: string;
  message: string;
} | null;

function mergeMessage(list: DeliveryChatMessage[], incoming: DeliveryChatMessage) {
  const existing = list.find((item) => item.id === incoming.id);
  if (existing) {
    return list.map((item) => (item.id === incoming.id ? { ...item, ...incoming } : item));
  }
  return [...list, incoming].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

function playSingleBeep() {
  try {
    const AudioContextCtor =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;
    const context = new AudioContextCtor();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.18);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.2);
    oscillator.addEventListener('ended', () => void context.close().catch(() => {}), { once: true });
  } catch {
    // O aviso visual continua disponível quando o navegador bloqueia áudio.
  }
}

function vibrateOnce() {
  try {
    navigator.vibrate?.(180);
  } catch {
    // Vibração não é suportada em todos os aparelhos.
  }
}

export function CourierChatNotifications() {
  const { user } = useAuth();
  const courierId = Number(user?.id || 0);
  const restaurantId = Number(user?.restaurantId || 0);
  const [open, setOpen] = useState(false);
  const [conversations, setConversations] = useState<CourierChatConversation[]>([]);
  const [activeOrderId, setActiveOrderId] = useState<number | null>(null);
  const [snapshot, setSnapshot] = useState<DeliveryChatSnapshot | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const [error, setError] = useState('');
  const [messagePreview, setMessagePreview] = useState<MessagePreviewState>(null);
  const seenMessageIdsRef = useRef(new Set<string>());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const previewTimeoutRef = useRef<number | null>(null);
  const {
    elementRef,
    style,
    dragging,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onClickCapture,
  } = useDraggableFloatingActions('@PecaJaFood:courierChatLauncherPosition');

  const totalUnread = useMemo(
    () => conversations.reduce((sum, conversation) => sum + Number(conversation.unreadCount || 0), 0),
    [conversations],
  );

  const refreshInbox = useCallback(async () => {
    if (!courierId || !restaurantId) return;
    try {
      const next = await deliveryChatService.courierInbox();
      setConversations(next);
    } catch {
      // O socket continua avisando novas mensagens; a próxima atualização tenta novamente.
    }
  }, [courierId, restaurantId]);

  async function openConversation(orderId: number) {
    setActiveOrderId(orderId);
    setLoadingThread(true);
    setError('');
    setMessagePreview(null);
    if (previewTimeoutRef.current !== null) {
      window.clearTimeout(previewTimeoutRef.current);
      previewTimeoutRef.current = null;
    }
    try {
      await deliveryChatService.markRead(orderId);
      const data = await deliveryChatService.get(orderId);
      setSnapshot(data);
      setConversations((current) =>
        current.map((item) => (item.orderId === orderId ? { ...item, unreadCount: 0 } : item)),
      );
    } catch (err) {
      setError(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
          'Não foi possível abrir a conversa.',
      );
    } finally {
      setLoadingThread(false);
    }
  }

  useEffect(() => {
    const initial = window.setTimeout(() => void refreshInbox(), 0);
    const interval = window.setInterval(() => void refreshInbox(), 15_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, [refreshInbox]);

  useEffect(
    () => () => {
      if (previewTimeoutRef.current !== null) window.clearTimeout(previewTimeoutRef.current);
    },
    [],
  );

  useEffect(() => {
    const token = getAccessToken();
    if (!token || !courierId || !restaurantId) return;
    const { socket, release } = acquireSocket(token, `courier-chat-inbox:${courierId}`);

    const onChatMessage = (event: DeliveryChatRealtimeEvent) => {
      const orderId = Number(event?.orderId || 0);
      const targetCourierId = Number(event?.courierId || 0);
      const targetRestaurantId = Number(event?.restaurantId || 0);
      const message = event?.message;
      const messageId = String(message?.id || '').trim();
      if (
        !orderId ||
        targetCourierId !== courierId ||
        targetRestaurantId !== restaurantId ||
        !message ||
        !messageId ||
        seenMessageIdsRef.current.has(messageId)
      ) {
        return;
      }
      seenMessageIdsRef.current.add(messageId);

      const isCustomerMessage = String(message.senderRole || '').toUpperCase() === 'CUSTOMER';
      const threadIsOpen = open && activeOrderId === orderId;
      if (isCustomerMessage && threadIsOpen) {
        void deliveryChatService.markRead(orderId);
      }

      if (threadIsOpen) {
        setSnapshot((current) =>
          current ? { ...current, messages: mergeMessage(current.messages, message) } : current,
        );
      }

      setConversations((current) => {
        const existing = current.find((item) => item.orderId === orderId);
        const unreadCount = isCustomerMessage && !threadIsOpen
          ? Number(existing?.unreadCount || 0) + 1
          : Number(existing?.unreadCount || 0);
        const next: CourierChatConversation = {
          threadId: existing?.threadId || 0,
          orderId,
          status: existing?.status || 'SAIU_PARA_ENTREGA',
          customerName: String(
            event.customerName || message.senderName || existing?.customerName || 'Cliente',
          ),
          customerPhone: existing?.customerPhone || null,
          updatedAt: message.createdAt,
          lastMessage: message.message,
          lastSenderRole: message.senderRole,
          lastMessageAt: message.createdAt,
          unreadCount,
        };
        return [next, ...current.filter((item) => item.orderId !== orderId)];
      });

      if (isCustomerMessage && !threadIsOpen) {
        const customerName = String(event.customerName || message.senderName || 'Cliente');
        setMessagePreview({ orderId, customerName, message: message.message });
        if (previewTimeoutRef.current !== null) window.clearTimeout(previewTimeoutRef.current);
        previewTimeoutRef.current = window.setTimeout(() => {
          setMessagePreview(null);
          previewTimeoutRef.current = null;
        }, 6000);
        playSingleBeep();
        vibrateOnce();
      }
    };

    const onRead = (event: { orderId?: number; readerRole?: string }) => {
      const orderId = Number(event?.orderId || 0);
      if (!orderId) return;
      if (activeOrderId === orderId && String(event?.readerRole || '').toUpperCase() === 'CUSTOMER') {
        void deliveryChatService.get(orderId).then(setSnapshot).catch(() => undefined);
      }
      void refreshInbox();
    };

    socket.on('delivery:chat-message', onChatMessage);
    socket.on('delivery:chat-read', onRead);
    return () => {
      socket.off('delivery:chat-message', onChatMessage);
      socket.off('delivery:chat-read', onRead);
      release();
    };
  }, [activeOrderId, courierId, open, refreshInbox, restaurantId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [snapshot?.messages.length]);

  async function sendMessage(message: string) {
    const normalized = message.replace(/\s+/g, ' ').trim();
    if (!activeOrderId || !snapshot || snapshot.thread.readOnly || !normalized || sending) return;
    setSending(true);
    setError('');
    try {
      const result = await deliveryChatService.send(activeOrderId, normalized);
      const sent = result?.message as DeliveryChatMessage | undefined;
      if (sent) {
        setSnapshot((current) =>
          current ? { ...current, messages: mergeMessage(current.messages, sent) } : current,
        );
      }
      setDraft('');
      await refreshInbox();
    } catch (err) {
      setError(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
          'Não foi possível enviar a mensagem.',
      );
    } finally {
      setSending(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void sendMessage(draft);
  }

  return (
    <>
      {messagePreview ? (
        <MessagePreview
          type="button"
          onClick={() => {
            setOpen(true);
            void openConversation(messagePreview.orderId);
          }}
        >
          <span className="preview-icon"><MessageCircle /></span>
          <span className="preview-copy">
            <b>{messagePreview.customerName} · Pedido #{messagePreview.orderId}</b>
            <small>{messagePreview.message}</small>
          </span>
        </MessagePreview>
      ) : null}

      <LauncherShell
        ref={elementRef}
        style={style}
        $dragging={dragging}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onClickCapture={onClickCapture}
      >
        <Launcher
          type="button"
          data-floating-drag-handle="true"
          $hasUnread={totalUnread > 0}
          aria-label={
            totalUnread > 0
              ? `Abrir conversas. ${totalUnread} mensagens não lidas.`
              : 'Abrir conversas com clientes'
          }
          onClick={() => setOpen(true)}
        >
          <MessageCircle aria-hidden="true" />
          {totalUnread > 0 ? <Badge>{totalUnread > 99 ? '99+' : totalUnread}</Badge> : null}
        </Launcher>
      </LauncherShell>

      {open ? (
        <Backdrop
          role="presentation"
          onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}
        >
          <Inbox role="dialog" aria-modal="true" aria-label="Conversas das entregas">
            <InboxHeader>
              <div>
                <strong>Conversas das entregas</strong>
                <small>{totalUnread ? `${totalUnread} não lidas` : 'Tudo visualizado'}</small>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Fechar conversas">
                <X />
              </button>
            </InboxHeader>

            <InboxBody>
              <ConversationList $hiddenOnMobile={Boolean(activeOrderId)}>
                {conversations.length === 0 ? (
                  <EmptyList>
                    <MessageCircle />
                    <strong>Nenhuma conversa ainda</strong>
                    <span>Quando um cliente mandar mensagem, ela aparecerá aqui pelo número do pedido.</span>
                  </EmptyList>
                ) : (
                  conversations.map((conversation) => (
                    <ConversationButton
                      key={conversation.orderId}
                      type="button"
                      $active={activeOrderId === conversation.orderId}
                      onClick={() => void openConversation(conversation.orderId)}
                    >
                      <span className="avatar">{conversation.customerName.slice(0, 1).toUpperCase()}</span>
                      <span className="copy">
                        <b>Pedido #{conversation.orderId} · {conversation.customerName}</b>
                        <small>{conversation.lastMessage || 'Conversa iniciada'}</small>
                        <time>
                          {new Date(conversation.lastMessageAt).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </time>
                      </span>
                      {conversation.unreadCount > 0 ? <Unread>{conversation.unreadCount}</Unread> : null}
                    </ConversationButton>
                  ))
                )}
              </ConversationList>

              <Thread $visibleOnMobile={Boolean(activeOrderId)}>
                {!activeOrderId ? (
                  <ThreadPlaceholder>
                    <MessageCircle />
                    <strong>Selecione uma conversa</strong>
                    <span>Cada conversa é separada automaticamente pelo pedido.</span>
                  </ThreadPlaceholder>
                ) : loadingThread ? (
                  <ThreadPlaceholder><strong>Carregando conversa...</strong></ThreadPlaceholder>
                ) : snapshot ? (
                  <>
                    <ThreadHeader>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveOrderId(null);
                          setSnapshot(null);
                        }}
                        aria-label="Voltar para conversas"
                      >
                        <ChevronLeft />
                      </button>
                      <div>
                        <strong>Pedido #{snapshot.order.id} · {snapshot.order.customerName}</strong>
                        <small>{snapshot.thread.readOnly ? 'Conversa encerrada' : 'Em entrega'}</small>
                      </div>
                    </ThreadHeader>

                    <Messages aria-live="polite">
                      <SystemStatus $closed={snapshot.thread.readOnly}>
                        {snapshot.thread.readOnly
                          ? '✅ Entrega encerrada. A conversa permanece disponível para consulta.'
                          : '🛵 Pedido em entrega. Use este canal somente para combinar esta entrega.'}
                      </SystemStatus>
                      {snapshot.messages.length === 0 ? (
                        <ThreadPlaceholder>
                          <MessageCircle />
                          <strong>Sem mensagens ainda</strong>
                          <span>Use respostas rápidas ou escreva uma mensagem.</span>
                        </ThreadPlaceholder>
                      ) : (
                        snapshot.messages.map((message) => {
                          const mine = String(message.senderRole).toUpperCase() === 'COURIER';
                          return (
                            <Bubble key={message.id} $mine={mine}>
                              <b>{message.senderName}</b>
                              <p>{message.message}</p>
                              <span>
                                {new Date(message.createdAt).toLocaleTimeString('pt-BR', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                                {mine && message.readAt ? ' · Visualizada' : ''}
                              </span>
                            </Bubble>
                          );
                        })
                      )}
                      <div ref={messagesEndRef} />
                    </Messages>

                    {!snapshot.thread.readOnly ? (
                      <ComposerArea>
                        <QuickReplies aria-label="Respostas rápidas">
                          {QUICK_REPLIES.map((reply) => (
                            <button
                              key={reply}
                              type="button"
                              disabled={sending}
                              onClick={() => void sendMessage(reply)}
                            >
                              {reply}
                            </button>
                          ))}
                        </QuickReplies>
                        {error ? <ErrorText role="alert">{error}</ErrorText> : null}
                        <Composer onSubmit={submit}>
                          <input
                            value={draft}
                            onChange={(event) => setDraft(event.target.value.slice(0, 500))}
                            placeholder="Digite uma mensagem..."
                            aria-label="Mensagem para o cliente"
                            disabled={sending}
                          />
                          <button
                            type="submit"
                            disabled={sending || !draft.trim()}
                            aria-label="Enviar mensagem"
                          >
                            <Send />
                          </button>
                        </Composer>
                        <SafetyNote>
                          Não envie o código de 4 dígitos pelo chat. Ele deve ser informado somente no recebimento.
                        </SafetyNote>
                      </ComposerArea>
                    ) : (
                      <ClosedNote>
                        Esta entrega foi encerrada. A conversa permanece disponível somente para consulta.
                      </ClosedNote>
                    )}
                  </>
                ) : (
                  <ThreadPlaceholder>
                    <strong>{error || 'Não foi possível carregar a conversa.'}</strong>
                  </ThreadPlaceholder>
                )}
              </Thread>
            </InboxBody>
          </Inbox>
        </Backdrop>
      ) : null}
    </>
  );
}

const pulse = keyframes`
  0%, 100% { transform: scale(1); box-shadow: 0 12px 30px rgba(37, 99, 235, .28), 0 0 0 0 rgba(37, 99, 235, .32); }
  50% { transform: scale(1.06); box-shadow: 0 14px 36px rgba(37, 99, 235, .34), 0 0 0 10px rgba(37, 99, 235, 0); }
`;

const previewArrive = keyframes`
  from { opacity: 0; transform: translateY(8px) scale(.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
`;

const MessagePreview = styled.button`
  position: fixed;
  right: 18px;
  bottom: 164px;
  z-index: 1260;
  width: min(360px, calc(100vw - 28px));
  padding: 11px 12px;
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  border: 1px solid #cbdaf0;
  border-radius: 14px;
  background: rgba(255, 255, 255, .98);
  box-shadow: 0 16px 42px rgba(15, 23, 42, .18);
  text-align: left;
  cursor: pointer;
  animation: ${previewArrive} 180ms ease-out both;
  .preview-icon {
    width: 38px;
    height: 38px;
    display: grid;
    place-items: center;
    border-radius: 11px;
    background: #dbeafe;
    color: #1d4ed8;
  }
  .preview-icon svg { width: 19px; height: 19px; }
  .preview-copy { min-width: 0; display: grid; gap: 3px; }
  b, small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  b { color: #172033; font-size: 11px; }
  small { color: #64748b; font-size: 10px; }
`;

const LauncherShell = styled.div<{ $dragging: boolean }>`
  position: fixed;
  right: 18px;
  bottom: 92px;
  z-index: 1250;
  touch-action: none;
  cursor: ${({ $dragging }) => ($dragging ? 'grabbing' : 'grab')};
`;

const Launcher = styled.button<{ $hasUnread: boolean }>`
  position: relative;
  width: 58px;
  height: 58px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: #2563eb;
  color: #fff;
  cursor: inherit;
  box-shadow: 0 12px 30px rgba(37, 99, 235, .28);
  ${({ $hasUnread }) => $hasUnread && css`animation: ${pulse} 1.3s ease-in-out infinite;`}
  > svg { width: 25px; height: 25px; pointer-events: none; }
  &:focus-visible { outline: 3px solid rgba(37, 99, 235, .28); outline-offset: 3px; }
  @media (prefers-reduced-motion: reduce) { animation: none; }
`;

const Badge = styled.span`
  position: absolute;
  top: -5px;
  right: -5px;
  min-width: 23px;
  height: 23px;
  padding: 0 6px;
  display: grid;
  place-items: center;
  border: 2px solid #fff;
  border-radius: 999px;
  background: #dc2626;
  color: #fff;
  font-size: 11px;
  font-weight: 900;
  pointer-events: none;
`;

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 2500;
  display: grid;
  place-items: center;
  padding: 18px;
  background: rgba(15, 23, 42, .48);
  backdrop-filter: blur(6px);
`;

const Inbox = styled.section`
  width: min(980px, 100%);
  height: min(720px, calc(100vh - 36px));
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  overflow: hidden;
  border: 1px solid #dbe3ee;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 28px 90px rgba(15, 23, 42, .28);
`;

const InboxHeader = styled.header`
  min-height: 70px;
  padding: 15px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #e7edf5;
  div { display: grid; gap: 2px; }
  strong { font-size: 17px; color: #172033; }
  small { font-size: 12px; color: #718096; }
  button { width: 38px; height: 38px; display: grid; place-items: center; border: 1px solid #dce4ef; border-radius: 10px; background: #fff; cursor: pointer; }
  svg { width: 18px; height: 18px; }
`;

const InboxBody = styled.div`
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(280px, 340px) minmax(0, 1fr);
  @media (max-width: 720px) { grid-template-columns: 1fr; }
`;

const ConversationList = styled.div<{ $hiddenOnMobile: boolean }>`
  min-height: 0;
  overflow-y: auto;
  border-right: 1px solid #e7edf5;
  background: #f8fafc;
  @media (max-width: 720px) { display: ${({ $hiddenOnMobile }) => ($hiddenOnMobile ? 'none' : 'block')}; border-right: 0; }
`;

const ConversationButton = styled.button<{ $active: boolean }>`
  width: 100%;
  padding: 13px 14px;
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  border: 0;
  border-bottom: 1px solid #e7edf5;
  background: ${({ $active }) => ($active ? '#eef5ff' : 'transparent')};
  text-align: left;
  cursor: pointer;
  .avatar { width: 42px; height: 42px; display: grid; place-items: center; border-radius: 50%; background: #dbeafe; color: #1d4ed8; font-weight: 900; }
  .copy { min-width: 0; display: grid; gap: 2px; }
  b, small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  b { color: #172033; font-size: 12px; }
  small { color: #65748b; font-size: 11px; }
  time { color: #94a3b8; font-size: 10px; }
`;

const Unread = styled.span`
  min-width: 24px;
  height: 24px;
  padding: 0 7px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  background: #2563eb;
  color: #fff;
  font-size: 10px;
  font-weight: 900;
`;

const Thread = styled.div<{ $visibleOnMobile: boolean }>`
  min-height: 0;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  background: #fff;
  @media (max-width: 720px) { display: ${({ $visibleOnMobile }) => ($visibleOnMobile ? 'grid' : 'none')}; }
`;

const ThreadHeader = styled.header`
  min-height: 64px;
  padding: 12px 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid #e7edf5;
  button { display: none; width: 36px; height: 36px; place-items: center; border: 1px solid #dce4ef; border-radius: 9px; background: #fff; cursor: pointer; }
  div { display: grid; gap: 2px; }
  strong { color: #172033; font-size: 13px; }
  small { color: #16a34a; font-size: 11px; font-weight: 700; }
  @media (max-width: 720px) { button { display: grid; } }
`;

const Messages = styled.div`
  min-height: 0;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 9px;
  background: #f8fafc;
`;

const SystemStatus = styled.div<{ $closed: boolean }>`
  align-self: center;
  max-width: 92%;
  padding: 7px 10px;
  border: 1px solid ${({ $closed }) => ($closed ? '#d7dde6' : '#cce5d5')};
  border-radius: 999px;
  background: ${({ $closed }) => ($closed ? '#f8fafc' : '#f0fdf4')};
  color: ${({ $closed }) => ($closed ? '#64748b' : '#267044')};
  font-size: 10px;
  font-weight: 700;
  text-align: center;
`;

const Bubble = styled.div<{ $mine: boolean }>`
  align-self: ${({ $mine }) => ($mine ? 'flex-end' : 'flex-start')};
  max-width: min(78%, 480px);
  padding: 9px 11px;
  border: 1px solid ${({ $mine }) => ($mine ? '#bfdbfe' : '#e2e8f0')};
  border-radius: ${({ $mine }) => ($mine ? '14px 14px 4px 14px' : '14px 14px 14px 4px')};
  background: ${({ $mine }) => ($mine ? '#eff6ff' : '#fff')};
  b { display: block; margin-bottom: 3px; color: #334155; font-size: 10px; }
  p { margin: 0; color: #172033; font-size: 13px; line-height: 1.4; white-space: pre-wrap; }
  span { display: block; margin-top: 4px; color: #94a3b8; font-size: 9px; text-align: right; }
`;

const ComposerArea = styled.div`
  padding: 10px 12px 12px;
  border-top: 1px solid #e7edf5;
  background: #fff;
`;

const QuickReplies = styled.div`
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 8px;
  button { flex: 0 0 auto; padding: 7px 9px; border: 1px solid #cbdaf0; border-radius: 999px; background: #f7faff; color: #24528d; font-size: 10px; font-weight: 700; cursor: pointer; }
`;

const Composer = styled.form`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 42px;
  gap: 8px;
  input { min-width: 0; height: 42px; padding: 0 12px; border: 1px solid #cfd8e5; border-radius: 12px; outline: 0; }
  input:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37, 99, 235, .12); }
  button { display: grid; place-items: center; border: 0; border-radius: 12px; background: #2563eb; color: #fff; cursor: pointer; }
  button:disabled { opacity: .5; cursor: not-allowed; }
  svg { width: 18px; height: 18px; }
`;

const SafetyNote = styled.small`
  display: block;
  margin-top: 7px;
  color: #b45309;
  font-size: 9px;
`;

const ErrorText = styled.div`
  margin-bottom: 7px;
  color: #b42318;
  font-size: 11px;
`;

const ClosedNote = styled.div`
  padding: 13px;
  border-top: 1px solid #e7edf5;
  color: #64748b;
  background: #f8fafc;
  font-size: 11px;
  text-align: center;
`;

const EmptyList = styled.div`
  min-height: 220px;
  padding: 28px 20px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 6px;
  text-align: center;
  color: #64748b;
  svg { width: 28px; height: 28px; }
  strong { color: #334155; font-size: 13px; }
  span { max-width: 260px; font-size: 11px; line-height: 1.45; }
`;

const ThreadPlaceholder = styled.div`
  min-height: 220px;
  padding: 28px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 6px;
  color: #64748b;
  text-align: center;
  svg { width: 30px; height: 30px; }
  strong { color: #334155; font-size: 13px; }
  span { font-size: 11px; }
`;
