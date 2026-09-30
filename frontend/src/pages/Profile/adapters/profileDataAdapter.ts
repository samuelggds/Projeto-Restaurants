import { profileMockData } from '../data';
import type {
  ProfileAddress,
  ProfileData,
  ProfileOrder,
  ProfileOrderChannel,
  ProfileOrderStatus,
} from '../types';
import { createRestaurantMonogram } from '../../../utils/restaurantMonogram';

const ACTIVE_STATUSES = new Set(['PENDENTE', 'PREPARANDO', 'PRONTO', 'SAIU_PARA_ENTREGA']);

export function mapOrderStatus(status: unknown): ProfileOrderStatus {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'SAIU_PARA_ENTREGA') return 'onTheWay';
  if (normalized === 'ENTREGUE') return 'delivered';
  if (normalized === 'CANCELADO') return 'cancelled';
  if (normalized === 'PREPARANDO' || normalized === 'PRONTO') return 'preparing';
  return 'confirmed';
}

export function getProfileOrderChannel(order: Record<string, unknown>): ProfileOrderChannel {
  if (order.payOnDelivery === true) return 'Pagar na entrega';
  const type = String(order.type || order.orderType || '').trim().toUpperCase();
  if (type === 'DELIVERY') return 'Delivery';
  if (type === 'RETIRADA' || type === 'PICKUP') return 'Retirada';
  if (type === 'MESA' || type === 'TABLE' || type === 'TABLE_SESSION') return 'Mesa';
  return 'Pedido';
}

export function buildOrderSummary(order: Record<string, unknown>): string {
  const items = Array.isArray(order.items) ? (order.items as Record<string, unknown>[]) : [];
  if (!items.length) return 'Pedido';
  const product = items[0]?.product as Record<string, unknown> | undefined;
  const first = String(product?.name || items[0]?.name || 'Item');
  return items.length > 1
    ? `${first} + ${items.length - 1} ${items.length === 2 ? 'item' : 'itens'}`
    : first;
}

function buildOrderItemsLabel(order: Record<string, unknown>): string {
  const items = Array.isArray(order.items) ? (order.items as Record<string, unknown>[]) : [];
  if (!items.length) return 'Pedido';
  return items
    .map((item) => {
      const product = item.product as Record<string, unknown> | undefined;
      const name = String(product?.name || item.name || 'Item');
      const quantity = Math.max(1, Number(item.quantity || 1));
      return `${quantity}x ${name}`;
    })
    .join(', ');
}

function formatOrderDate(value: unknown): string {
  const date = new Date(String(value || ''));
  if (Number.isNaN(date.getTime())) return '';

  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startOrder = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const dayDiff = Math.round((startToday - startOrder) / 86400000);
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  if (dayDiff === 0) return `Hoje às ${time}`;
  if (dayDiff === 1) return `Ontem às ${time}`;
  return date.toLocaleDateString('pt-BR') + ' às ' + time;
}

type Input = {
  user: Record<string, unknown> | null;
  settings: Record<string, unknown> | null;
  orders: Record<string, unknown>[];
  addresses: Record<string, unknown>[];
  avatarUrl: string;
};

function firstProductImage(order: Record<string, unknown>): string {
  const items = Array.isArray(order.items) ? (order.items as Record<string, unknown>[]) : [];
  const product = items[0]?.product as Record<string, unknown> | undefined;
  return String(product?.image || items[0]?.image || '');
}

function estimateArrival(order: Record<string, unknown>, settings: Record<string, unknown> | null) {
  if (String(order.status || '').toUpperCase() === 'SAIU_PARA_ENTREGA') {
    return 'Consulte o rastreamento';
  }
  const minutes = Math.max(0, Number(settings?.averageDeliveryTime || 0));
  const createdAt = new Date(String(order.createdAt || ''));
  if (!minutes || Number.isNaN(createdAt.getTime())) return '--:--';
  createdAt.setMinutes(createdAt.getMinutes() + minutes);
  return createdAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function buildProfileData({
  user,
  settings,
  orders,
  addresses: rawAddresses,
  avatarUrl,
}: Input): ProfileData {
  const restaurant = (settings?.restaurant as Record<string, unknown>) ?? {};
  const restaurantName = String(restaurant.name || '');
  const restaurantOpen = settings?.isOpenForOrders !== false;
  const brand = {
    name: String(restaurantName || settings?.restaurantName || profileMockData.brand.name),
    monogram: createRestaurantMonogram(restaurantName || settings?.restaurantName),
    address: String(settings?.address || ''),
    primaryColor: String(settings?.primaryColor || profileMockData.brand.primaryColor),
    logoUrl: String(restaurant.logo || settings?.restaurantLogo || ''),
    phone: String(settings?.phone || ''),
    email: String(settings?.email || ''),
    whatsapp: String(settings?.whatsapp || ''),
    description: String(
      restaurant.description || settings?.restaurantDescription || settings?.description || '',
    ),
    status: restaurantOpen ? 'Aberto agora' : 'Fechado agora',
  };
  const fullName = String(user?.name || '');
  const defaultAddress = rawAddresses.find((item) => Boolean(item.isDefault)) || rawAddresses[0];
  const mainAddress = defaultAddress
    ? [
        defaultAddress.address,
        defaultAddress.number ? `nº ${defaultAddress.number}` : '',
        defaultAddress.district,
        defaultAddress.city,
        defaultAddress.state,
      ]
        .filter(Boolean)
        .join(', ')
    : [
        user?.address,
        user?.number ? `nº ${user.number}` : '',
        user?.district,
        user?.city,
        user?.state,
      ]
        .filter(Boolean)
        .join(', ') || 'Nenhum endereço cadastrado';
  const profileUser = {
    firstName: fullName.split(' ').filter(Boolean)[0] || '',
    fullName,
    email: String(user?.email || ''),
    phone: String(user?.phone || ''),
    avatarUrl,
    mainAddress,
  };
  const activeRawOrders = orders.filter((order) =>
    ACTIVE_STATUSES.has(String(order.status || '').toUpperCase()),
  );
  const mapActiveOrder = (order: Record<string, unknown>) => {
    const channel = getProfileOrderChannel(order);
    const paymentMethod = String(order.paymentMethod || '').toUpperCase();
    const paymentPending =
      String(order.status || '').toUpperCase() !== 'CANCELADO' &&
      order.paid !== true &&
      (paymentMethod === 'CARTAO' ||
        (paymentMethod === 'PIX' && Boolean(String(order.pixPaymentId || '').trim())));
    const date = formatOrderDate(order.createdAt);
    return {
      id: `#${String(order.id).padStart(4, '0')}`,
      status: mapOrderStatus(order.status),
      date,
      estimatedArrival: estimateArrival(order, settings),
      summary: buildOrderItemsLabel(order),
      image: firstProductImage(order),
      total: Number(order.total || 0),
      channel,
      publicId: String(order.publicId || ''),
      paymentPending,
    };
  };
  const activeOrders = activeRawOrders.map(mapActiveOrder);
  const activeOrder = activeOrders[0];
  const activeOrderIds = new Set(activeRawOrders.map((order) => String(order.id)));
  const recentOrders: ProfileOrder[] = orders
    .filter(
      (order) =>
        !activeOrderIds.has(String(order.id)) && Boolean(String(order.status || '')),
    )
    .map((order) => {
      const channel = getProfileOrderChannel(order);
      const date = formatOrderDate(order.createdAt);
      const paymentMethod = String(order.paymentMethod || '').toUpperCase();
      const paymentPending =
        String(order.status || '').toUpperCase() !== 'CANCELADO' &&
        order.paid !== true &&
        (paymentMethod === 'CARTAO' ||
          (paymentMethod === 'PIX' && Boolean(String(order.pixPaymentId || '').trim())));
      return {
        id: `#${String(order.id).padStart(4, '0')}`,
        summary: buildOrderItemsLabel(order),
        date,
        total: Number(order.total || 0),
        image: firstProductImage(order),
        status: mapOrderStatus(order.status),
        channel,
        publicId: String(order.publicId || ''),
        paymentPending,
        loyaltyQualified:
          String(order.status || '').toUpperCase() === 'ENTREGUE' && order.paid === true,
      };
    });
  const addresses: ProfileAddress[] = rawAddresses.map((item) => ({
    id: String(item.id),
    label: String(item.label || 'Endereço'),
    address: `${String(item.address || '')}, ${String(item.number || '')}`,
    number: String(item.number || ''),
    district: String(item.district || ''),
    city: String(item.city || ''),
    state: String(item.state || ''),
    zipCode: String(item.zipCode || ''),
    complement: String(item.complement || ''),
    isDefault: Boolean(item.isDefault),
  }));
  return {
    brand,
    user: profileUser,
    activeOrder,
    activeOrders,
    activeOrderCount: activeRawOrders.length,
    recentOrders,
    addresses,
  };
}
