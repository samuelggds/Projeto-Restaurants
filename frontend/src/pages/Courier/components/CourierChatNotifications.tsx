import { useEffect, useRef, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { useAuth } from '../../../contexts/authContext';
import { getAccessToken } from '../../../modules/auth/session/authSession';
import { acquireSocket } from '../../../Services/socketService';
import {
  clearDeliveryChatUnread,
  incrementDeliveryChatUnread,
  readDeliveryChatUnread,
} from '../../tracking/deliveryChatUnread';

type DeliveryChatRealtimeEvent = {
  orderId?: number;
  restaurantId?: number;
  courierId?: number | null;
  customerName?: string;
  message?: {
    id?: string;
    senderRole?: string;
    senderName?: string;
    message?: string;
  };
};

type PendingChatAlert = {
  orderId: number;
  customerName: string;
  message: string;
  messageId: string;
  unreadCount: number;
};

const arrive = keyframes`
  from { opacity: 0; transform: translateY(10px) scale(.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
`;

const Stack = styled.aside`
  position: fixed;
  right: 18px;
  bottom: 18px;
  z-index: 2400;
  width: min(390px, calc(100vw - 28px));
  display: grid;
  gap: 10px;
  pointer-events: none;
`;

const Alert = styled.button`
  pointer-events: auto;
  position: relative;
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 14px;
  border: 1px solid rgba(37, 99, 235, 0.16);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.98);
  color: #17231d;
  box-shadow: 0 18px 46px rgba(15, 23, 42, 0.18);
  text-align: left;
  cursor: pointer;
  animation: ${arrive} 220ms ease-out both;
  backdrop-filter: blur(14px);

  &::before {
    position: absolute;
    inset: 0 auto 0 0;
    width: 4px;
    border-radius: 16px 0 0 16px;
    background: #2563eb;
    content: '';
  }

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 20px 50px rgba(15, 23, 42, 0.22);
  }

  .icon {
    width: 44px;
    height: 44px;
    display: grid;
    place-items: center;
    border-radius: 13px;
    background: #eaf2ff;
    color: #1d4ed8;
  }

  .copy {
    min-width: 0;
    display: grid;
    gap: 3px;
  }

  strong {
    color: #111827;
    font-size: 13px;
  }

  b {
    color: #1d4ed8;
    font-size: 12px;
  }

  small {
    overflow: hidden;
    color: #66736d;
    font-size: 11px;
    line-height: 1.35;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .badge {
    min-width: 28px;
    height: 28px;
    padding: 0 8px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    color: #fff;
    background: #2563eb;
    font-size: 11px;
    font-weight: 900;
    box-shadow: 0 6px 14px rgba(37, 99, 235, 0.24);
  }
`;

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
    // Alguns navegadores bloqueiam áudio sem interação prévia do usuário.
  }
}

function vibrateOnce() {
  try {
    if ('vibrate' in navigator) navigator.vibrate(180);
  } catch {
    // Vibração não é suportada em todos os aparelhos/navegadores.
  }
}

export function CourierChatNotifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<PendingChatAlert[]>([]);
  const seenMessageIdsRef = useRef(new Set<string>());
  const courierId = Number(user?.id || 0);
  const restaurantId = Number(user?.restaurantId || 0);

  useEffect(() => {
    const token = getAccessToken();
    if (!token || !courierId || !restaurantId) return;

    const { socket, release } = acquireSocket(token, `courier-chat-alerts:${courierId}`);
    const onChatMessage = (event: DeliveryChatRealtimeEvent) => {
      const orderId = Number(event?.orderId || 0);
      const targetCourierId = Number(event?.courierId || 0);
      const targetRestaurantId = Number(event?.restaurantId || 0);
      const senderRole = String(event?.message?.senderRole || '').toUpperCase();
      const messageId = String(event?.message?.id || '').trim();

      if (
        !Number.isInteger(orderId) ||
        orderId <= 0 ||
        targetCourierId !== courierId ||
        targetRestaurantId !== restaurantId ||
        senderRole !== 'CUSTOMER' ||
        !messageId ||
        seenMessageIdsRef.current.has(messageId)
      ) {
        return;
      }

      seenMessageIdsRef.current.add(messageId);
      const unreadCount = incrementDeliveryChatUnread('courier', courierId, orderId);
      const alert: PendingChatAlert = {
        orderId,
        customerName: String(event?.customerName || event?.message?.senderName || 'Cliente'),
        message: String(event?.message?.message || '').trim() || 'Nova mensagem recebida.',
        messageId,
        unreadCount,
      };

      setAlerts((current) => [alert, ...current.filter((item) => item.orderId !== orderId)]);
      playSingleBeep();
      vibrateOnce();
    };

    socket.on('delivery:chat-message', onChatMessage);
    return () => {
      socket.off('delivery:chat-message', onChatMessage);
      release();
    };
  }, [courierId, restaurantId]);

  if (!alerts.length) return null;

  return (
    <Stack aria-live="assertive">
      {alerts.map((alert) => {
        const unreadCount = Math.max(
          alert.unreadCount,
          readDeliveryChatUnread('courier', courierId, alert.orderId),
        );
        return (
          <Alert
            key={`${alert.orderId}:${alert.messageId}`}
            type="button"
            onClick={() => {
              clearDeliveryChatUnread('courier', courierId, alert.orderId);
              setAlerts((current) => current.filter((item) => item.orderId !== alert.orderId));
              navigate(`/orders/${alert.orderId}/chat`);
            }}
          >
            <span className="icon">
              <MessageCircle size={21} />
            </span>
            <span className="copy">
              <strong>Nova mensagem do cliente</strong>
              <b>Pedido #{alert.orderId}</b>
              <small>
                {alert.customerName}: {alert.message}
              </small>
            </span>
            <span className="badge" aria-label={`${unreadCount} mensagens não lidas`}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          </Alert>
        );
      })}
    </Stack>
  );
}
