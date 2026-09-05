import { useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/authContext';
import deliveryChatService from '../../../Services/deliveryChatService';
import {
  clearDeliveryChatUnread,
  readDeliveryChatUnread,
  subscribeDeliveryChatUnread,
} from '../../tracking/deliveryChatUnread';
import * as S from './DeliveryMap.styles';

function resolveCourierOrderId() {
  if (typeof document === 'undefined') return null;

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

export function DeliveryMapChatButton() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const role = String(user?.role || '').toUpperCase();
  const courierId = Number(user?.id || 0);
  const [orderId, setOrderId] = useState<number | null>(() => resolveCourierOrderId());
  const [chatEnabled, setChatEnabled] = useState(false);
  const [unreadCount, setUnreadCount] = useState(() =>
    courierId && orderId ? readDeliveryChatUnread('courier', courierId, orderId) : 0,
  );

  useEffect(() => {
    if (role !== 'MOTOQUEIRO') return;
    const updateOrder = () => setOrderId(resolveCourierOrderId());
    updateOrder();
    const selector = document.querySelector<HTMLSelectElement>(
      'select[aria-label="Escolher entrega para visualizar no mapa"]',
    );
    selector?.addEventListener('change', updateOrder);
    return () => selector?.removeEventListener('change', updateOrder);
  }, [role]);

  useEffect(() => {
    if (role !== 'MOTOQUEIRO' || !courierId || !orderId) {
      setUnreadCount(0);
      setChatEnabled(false);
      return;
    }

    setUnreadCount(readDeliveryChatUnread('courier', courierId, orderId));
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
      if (
        event.scope === 'courier' &&
        event.actorId === courierId &&
        event.orderId === orderId
      ) {
        setUnreadCount(event.count);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [courierId, orderId, role]);

  if (role !== 'MOTOQUEIRO' || !courierId || !orderId || !chatEnabled) return null;

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
      title="Falar com o cliente deste pedido"
      onClick={() => {
        clearDeliveryChatUnread('courier', courierId, orderId);
        navigate(`/orders/${orderId}/chat`);
      }}
    >
      <span className="chat-icon">
        <MessageCircle size={18} />
      </span>
      <span className="chat-copy">
        <strong>Chat do pedido</strong>
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
