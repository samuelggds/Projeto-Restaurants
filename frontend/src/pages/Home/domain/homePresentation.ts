import type { CustomerAddress } from '../../../Services/customerAddressService';

export { formatDeliveryTime } from '../../../utils/deliveryTime';

export function formatCustomerLocationLabel(
  method: 'delivery' | 'pickup',
  restaurantAddress: string,
  address?: CustomerAddress,
) {
  if (method === 'pickup') return restaurantAddress || 'Endereço do restaurante';
  if (!address) return 'Escolher endereço';

  const street = [address.address, address.number]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join(', ');
  return [street, address.district]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join(' - ');
}

export function getUserInitials(userLoggedIn: boolean, userName?: string) {
  if (!userLoggedIn || !userName) return '•';
  return userName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

export function normalizeSearchText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim();
}
