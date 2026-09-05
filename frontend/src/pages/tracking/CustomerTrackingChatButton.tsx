import { useEffect, useRef, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { useAuth } from '../../contexts/authContext';
import { getAccessToken } from '../../modules/auth/session/authSession';
import { acquireSocket } from '../../Services/socketService';
import {
  clearDeliveryChatUnread,
  incrementDeliveryChatUnread,
  readDeliveryChatUnread,
  subscribeDeliveryChatUnread,
} from './deliveryChatUnread';

type DeliveryChatRealtimeEvent = {
  orderId?: number;
  customerUserId?: number | null;
  message?: {
    id?: string;
    senderRole?: string;
  };
};

const pulse = keyframes`
  0%, 100% {
    box-shadow: 0 10px 24px rgba(40, 112, 93, 0.16), 0 0 0 0 rgba(37, 99, 235, 0);
    transform: translateY(0) scale(1);
  }
  50% {
    box-shadow: 0 14px 30px rgba(37, 99, 235, 0.20), 0 0 0 5px rgba(37, 99, 235, 0.10);
    transform: translateY(-1px) scale(1.01);
  }
`;

const Button = styled.button<{ $hasUnread: boolean }>`
  width: calc(100% - 40px);
  min-height: 54px;
  margin: 16px 20px 0;
  padding: 7px 9px 7px 8px;
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  border: 1px solid ${({ $hasUnread }) => ($hasUnread ? 'rgba(37, 99, 235, 0.32)' : '#cfe0da')};
  border-radius: 12px;
  color: #173c42;
  background: ${({ $hasUnread }) => ($hasUnread ? '#f5f9ff' : '#f7fbf9')};
  cursor: pointer;
  text-align: left;
  transition: border-color 160ms ease, background 160ms ease, box-shadow 160ms ease, transform 160ms ease;
  animation: ${({ $hasUnread }) => ($hasUnread ? pulse : 'none')} 1.55s ease-in-out infinite;

  .icon {
    width: 38px;
    height: 38px;
    display: grid;
    place-items: center;
    border-radius: 10px;
    color: #fff;
    background: #28705d;
  }

  .copy {
    min-width: 0;
    display: grid;
    gap: 2px;
  }

  strong {
    color: #173c42;
    font-size: 12px;
    font-weight: 900;
  }

  small {
    color: #6a7771;
    font-size: 9px;
    font-weight: 700;
  }

  .badge {
    min-width: 29px;
    height: 29px;
    padding: 0 8px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 2px solid #fff;
    border-radius: 999px;
    color: #fff;
    background: #2563eb;
    box-shadow: 0 7px 16px rgba(37, 99, 235, 0.28);
    font-size: 10px;
    font-weight: 900;
  }

  &:hover {
    border-color: rgba(37, 99, 235, 0.34);
    background: #f5f9ff;
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 3px solid rgba(37, 99, 235, 0.22);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
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

export function CustomerTrackingChatButton({ orderId }: { orderId: number }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const customerId = Number(user?.id || 0);
  const [unreadCount, setUnreadCount] = useState(() =>
    customerId ? readDeliveryChatUnread('customer', customerId, orderId) : 0,
  );
  const seenMessageIdsRef = useRef(new Set<string>());

  useEffect(() => {
    if (!customerId || !orderId) return;
    setUnreadCount(readDeliveryChatUnread('customer', customerId, orderId));
    return subscribeDeliveryChatUnread((event) => {
      if (
        event.scope === 'customer' &&
        event.actorId === customerId &&
        event.orderId === orderId
      ) {
        setUnreadCount(event.count);
      }
    });
  }, [customerId, orderId]);

  useEffect(() => {
    const token = getAccessToken();
    if (!token || !customerId || !orderId) return;

    const { socket, release } = acquireSocket(token, `customer-chat-alert:${customerId}:${orderId}`);
    const onMessage = (event: DeliveryChatRealtimeEvent) => {
      const eventOrderId = Number(event?.orderId || 0);
      const targetCustomerId = Number(event?.customerUserId || 0);
      const senderRole = String(event?.message?.senderRole || '').toUpperCase();
      const messageId = String(event?.message?.id || '').trim();

      if (
        eventOrderId !== orderId ||
        targetCustomerId !== customerId ||
        senderRole !== 'COURIER' ||
        !messageId ||
        seenMessageIdsRef.current.has(messageId)
      ) {
        return;
      }

      seenMessageIdsRef.current.add(messageId);
      incrementDeliveryChatUnread('customer', customerId, orderId);
      playSingleBeep();
      vibrateOnce();
    };

    socket.on('delivery:chat-message', onMessage);
    return () => {
      socket.off('delivery:chat-message', onMessage);
      release();
    };
  }, [customerId, orderId]);

  if (!customerId) return null;
  const unreadLabel = unreadCount > 99 ? '99+' : String(unreadCount);

  return (
    <Button
      type="button"
      $hasUnread={unreadCount > 0}
      aria-label={
        unreadCount > 0
          ? `Falar com o motoqueiro. ${unreadCount} mensagens não lidas.`
          : 'Falar com o motoqueiro'
      }
      onClick={() => {
        clearDeliveryChatUnread('customer', customerId, orderId);
        navigate(`/orders/${orderId}/chat`);
      }}
    >
      <span className="icon">
        <MessageCircle size={18} />
      </span>
      <span className="copy">
        <strong>Falar com o motoqueiro</strong>
        <small>Chat em tempo real · Pedido #{orderId}</small>
      </span>
      {unreadCount > 0 ? (
        <span className="badge" aria-label={`${unreadCount} mensagens não lidas`}>
          {unreadLabel}
        </span>
      ) : null}
    </Button>
  );
}
