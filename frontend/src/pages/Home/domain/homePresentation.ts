import type { CustomerAddress } from '../../../Services/customerAddressService';

export function formatDeliveryTime(value?: string) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const normalized = raw.replace(/^entrega\s+em\s+/i, '').trim();
  if (/\b(?:min|minuto|minutos|h|hora|horas)\b/i.test(normalized)) return normalized;
  if (/^\d+(?:\s*(?:[-–—]|a)\s*\d+)?$/i.test(normalized)) {
    return `${normalized.replace(/\s*[-–—]\s*/g, '-')} min`;
  }
  return normalized;
}

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
