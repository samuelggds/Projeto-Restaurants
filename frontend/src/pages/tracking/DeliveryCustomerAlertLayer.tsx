import { useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/authContext';
import { useActiveOrderNotice } from '../Home/hooks/useActiveOrderNotice';
import DeliveryConfirmationCodePrompt from './DeliveryConfirmationCodePrompt';
import { TrackingOrderSupportLauncher } from './TrackingOrderSupportLauncher';

export default function DeliveryCustomerAlertLayer() {
  const { user } = useAuth();
  const location = useLocation();
  const customerId =
    String(user?.role || '').toUpperCase() === 'CLIENTE'
      ? Number((user as { id?: number }).id || 0) || null
      : null;
  const { activeOrder } = useActiveOrderNotice(customerId);
  const trackingMatch = location.pathname.match(/^\/orders\/(\d+)\/tracking$/u);

  if (trackingMatch) {
    return <TrackingOrderSupportLauncher orderId={Number(trackingMatch[1])} />;
  }
  if (
    activeOrder?.status !== 'SAIU_PARA_ENTREGA' ||
    !/^\d{4}$/.test(activeOrder.deliveryConfirmationCode || '')
  ) {
    return null;
  }

  return (
    <DeliveryConfirmationCodePrompt
      code={activeOrder.deliveryConfirmationCode as string}
      orderId={Number(activeOrder.id)}
      deliveryStartedAt={activeOrder.deliveryStartedAt}
    />
  );
}
