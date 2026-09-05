import { useEffect, useRef, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/authContext';
import deliveryChatService from '../../../Services/deliveryChatService';
import { acquireSocket } from '../../../Services/socketService';
import { getAccessToken } from '../../../modules/auth/session/authSession';
import {
  clearDeliveryChatUnread,
  incrementDeliveryChatUnread,
  readDeliveryChatUnread,
  subscribeDeliveryChatUnread,
  type DeliveryChatActorScope,
} from '../../tracking/deliveryChatUnread';
import * as S from './DeliveryMap.styles';

type DeliveryChatRealtimeEvent = {
  orderId?: number;
  customerUserId?: number | null;
  message?: {
    id?: string;
    senderRole?: string;
  };
};

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
    // Alguns navegadores bloqueiam áudio sem uma interação prévia do usuário.
  }
}

function vibrateOnce() {
  try {
    if ('vibrate' in navigator) navigator.vibrate(180);
  } catch {
    // Vibração não é suportada em todos os aparelhos/navegadores.
  }
}

function resolveOrderId(role: string) {
  if (typeof window === 'undefined') return null;

  if (role === 'CLIENTE') {
    const match = window.location.pathname.match(/^\/orders\/(\d+)\/tracking\/?$/);
    const id = Number(match?.[1] || 0);
    return Number.isInteger(id) && id > 0 ? id : null;
  }

  if (role === 'MOTOQUEIRO') {
    const selector = document.querySelector<HTMLSelectElement>(
      'select[aria-label="Escolher entrega para visualizar no mapa"]',
    );
    const selectedId = Number(selector?.value || 0);
    if (Number.isInteger(selectedId) && selectedId > 0) return selectedId;

    const shell = document.querySelector('.delivery-map-shell');
    const routeSection = shell?.closest('section');
    const match = routeSection?.textContent?.match(/Pedido\s+#(\d+)/i);
    const fallbackId = Number(match?.[1] || 0);
    return Number.isInteger(fallbackId) && fallbackId > 0 ? fallbackId : null;
  }

  return null;
}

export function DeliveryMapChatButton() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const role = String(user?.role || '').toUpperCase();
  const actorId = Number(user?.id || 0);
  const scope: DeliveryChatActorScope | null =
    role === 'MOTOQUEIRO' ? 'courier' : role === 'CLIENTE' ? 'customer' : null;
  const [orderId, setOrderId] = useState<number | null>(() => resolveOrderId(role));
  const [chatEnabled, setChatEnabled] = useState(false);
  const [unreadCount, setUnreadCount] = useState(() =>
    scope && actorId && orderId ? readDeliveryChatUnread(scope, actorId, orderId) : 0,
  );
  const seenMessageIdsRef = useRef(new Set<string>());

  useEffect(() => {
    const updateOrder = () => setOrderId(resolveOrderId(role));
    updateOrder();
    const selector = document.querySelector<HTMLSelectElement>(
      'select[aria-label="Escolher entrega para visualizar no mapa"]',
    );
    selector?.addEventListener('change', updateOrder);
    return () => selector?.removeEventListener('change', updateOrder);
  }, [role]);

  useEffect(() => {
    if (!scope || !actorId || !orderId) {
      setUnreadCount(0);
      setChatEnabled(false);
      return;
    }

    setUnreadCount(readDeliveryChatUnread(scope, actorId, orderId));
    let active = true;
    deliveryChatService
      .get(orderId)
      .then((snapshot) => {
        if (active) setChatEnabled(String(snapshot.order.status).toUpperCase() === 'SAIU_PARA_ENTREGA');
      })
      .catch(() => {
        if (active) setChatEnabled(false);
      });

    const unsubscribe = subscribeDeliveryChatUnread((event) => {
      if (event.scope === scope && event.actorId === actorId && event.orderId === orderId) {
        setUnreadCount(event.count);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [actorId, orderId, scope]);

  useEffect(() => {
    if (role !== 'CLIENTE' || !actorId || !orderId) return;
    const token = getAccessToken();
    if (!token) return;

    const { socket, release } = acquireSocket(token, `customer-chat-badge:${actorId}:${orderId}`);
    const onMessage = (event: DeliveryChatRealtimeEvent) => {
      const eventOrderId = Number(event?.orderId || 0);
      const targetCustomerId = Number(event?.customerUserId || 0);
      const senderRole = String(event?.message?.senderRole || '').toUpperCase();
      const messageId = String(event?.message?.id || '').trim();
      if (
        eventOrderId !== orderId ||
        targetCustomerId !== actorId ||
        senderRole !== 'COURIER' ||
        !messageId ||
        seenMessageIdsRef.current.has(messageId)
      ) {
        return;
      }
      seenMessageIdsRef.current.add(messageId);
      incrementDeliveryChatUnread('customer', actorId, orderId);
      playSingleBeep();
      vibrateOnce();
    };
    const onStatus = (raw: unknown) => {
      const payload = raw as { id?: number; status?: string; order?: { id?: number; status?: string } };
      const eventOrderId = Number(payload?.order?.id || payload?.id || 0);
      if (eventOrderId !== orderId) return;
      const status = String(payload?.order?.status || payload?.status || '').toUpperCase();
      setChatEnabled(status === 'SAIU_PARA_ENTREGA');
    };

    socket.on('delivery:chat-message', onMessage);
    socket.on('order:status-changed', onStatus);
    return () => {
      socket.off('delivery:chat-message', onMessage);
      socket.off('order:status-changed', onStatus);
      release();
    };
  }, [actorId, orderId, role]);

  if (!scope || !actorId || !orderId || !chatEnabled) return null;

  const isCourier = role === 'MOTOQUEIRO';
  const unreadLabel = unreadCount > 99 ? '99+' : String(unreadCount);

  return (
    <S.ChatControl
      type="button"
      $hasUnread={unreadCount > 0}
      aria-label={
        unreadCount > 0
          ? `Abrir chat do pedido ${orderId}. ${unreadCount} mensagens não lidas.`
          : `Abrir chat do pedido ${orderId}`
      }
      title={isCourier ? 'Falar com o cliente deste pedido' : 'Falar com o motoqueiro deste pedido'}
      onClick={() => {
        clearDeliveryChatUnread(scope, actorId, orderId);
        navigate(`/orders/${orderId}/chat`);
      }}
    >
      <span className="chat-icon">
        <MessageCircle size={18} />
      </span>
      <span className="chat-copy">
        <strong>{isCourier ? 'Chat do pedido' : 'Falar com o motoqueiro'}</strong>
        <small>Pedido #{orderId}</small>
      </span>
      {unreadCount > 0 ? (
        <span className="chat-badge" aria-label={`${unreadCount} mensagens não lidas`}>
          {unreadLabel}
        </span>
      ) : null}
    </S.ChatControl>
  );
}
