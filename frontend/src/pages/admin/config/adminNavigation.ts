import {
  Building2,
  Clock3,
  CreditCard,
  LayoutGrid,
  MapPin,
  MessageCircle,
  QrCode,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Store,
  Truck,
} from 'lucide-react';
import type { SettingsSection } from '../types';

export const settingItems: [SettingsSection, string, typeof Store][] = [
  ['brand', 'Marca e identidade', Store],
  ['business', 'Dados do negócio', Building2],
  ['address', 'Endereço', MapPin],
  ['hours', 'Horários', Clock3],
  ['orders', 'Pedidos', ShoppingBag],
  ['delivery', 'Delivery e retirada', Truck],
  ['table', 'Cardápio de mesa', QrCode],
  ['whatsapp', 'WhatsApp', MessageCircle],
  ['payments', 'Pagamentos', CreditCard],
  ['social', 'Redes sociais', Share2],
  ['appearance', 'Aparência e SEO', LayoutGrid],
  ['security', 'Equipe e segurança', ShieldCheck],
];

export const sectionTitle: Record<SettingsSection, string> = {
  brand: 'Marca e identidade',
  business: 'Dados do negócio',
  address: 'Endereço',
  hours: 'Horários',
  orders: 'Configurações de pedidos',
  delivery: 'Delivery e retirada',
  table: 'Cardápio de mesa',
  whatsapp: 'WhatsApp',
  payments: 'Pagamentos',
  social: 'Redes sociais',
  appearance: 'Aparência e SEO',
  security: 'Equipe e segurança',
};
