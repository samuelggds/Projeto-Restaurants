import {
  BadgePercent,
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

export type SettingNavigationItem = [SettingsSection, string, typeof Store];

export const settingGroups: Array<{ id: string; label: string; items: SettingNavigationItem[] }> = [
  {
    id: 'restaurant',
    label: 'RESTAURANTE',
    items: [
      ['brand', 'Marca e identidade', Store],
      ['business', 'Dados do negócio', Building2],
      ['address', 'Endereço', MapPin],
      ['hours', 'Horários', Clock3],
    ],
  },
  {
    id: 'operation',
    label: 'OPERAÇÃO',
    items: [
      ['orders', 'Pedidos', ShoppingBag],
      ['promotions', 'Descontos e fidelidade', BadgePercent],
      ['delivery', 'Delivery e retirada', Truck],
      ['table', 'Cardápio de mesa', QrCode],
      ['whatsapp', 'WhatsApp', MessageCircle],
      ['payments', 'Pagamentos', CreditCard],
    ],
  },
  {
    id: 'digital',
    label: 'PRESENÇA DIGITAL',
    items: [
      ['social', 'Redes sociais', Share2],
      ['appearance', 'Aparência e SEO', LayoutGrid],
      ['security', 'Equipe e segurança', ShieldCheck],
    ],
  },
];

export const settingItems = settingGroups.flatMap((group) => group.items);

export const sectionTitle: Record<SettingsSection, string> = {
  brand: 'Marca e identidade',
  business: 'Dados do negócio',
  address: 'Endereço',
  hours: 'Horários',
  orders: 'Configurações de pedidos',
  promotions: 'Descontos e fidelidade',
  delivery: 'Delivery e retirada',
  table: 'Cardápio de mesa',
  whatsapp: 'WhatsApp',
  payments: 'Pagamentos',
  social: 'Redes sociais',
  appearance: 'Aparência e SEO',
  security: 'Equipe e segurança',
};
