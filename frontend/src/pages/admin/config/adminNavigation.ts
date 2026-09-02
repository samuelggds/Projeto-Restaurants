import {
  BadgePercent,
  Building2,
  Clock3,
  CreditCard,
  HandCoins,
  LayoutGrid,
  MapPin,
  MessageCircle,
  Printer,
  Bike,
  QrCode,
  ReceiptText,
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
      ['table-account', 'Conta e pagamento da mesa', ReceiptText],
      ['whatsapp', 'WhatsApp', MessageCircle],
      ['printing', 'Impressora da cozinha', Printer],
      ['employee-payments', 'Pagamento dos funcionários', HandCoins],
      ['courier-payments', 'Pagamento dos motoqueiros', Bike],
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
  'table-account': 'Conta e pagamento da mesa',
  whatsapp: 'WhatsApp',
  printing: 'Impressora da cozinha',
  'employee-payments': 'Pagamento dos funcionários',
  'courier-payments': 'Pagamento dos motoqueiros',
  payments: 'Pagamentos',
  social: 'Redes sociais',
  appearance: 'Aparência e SEO',
  security: 'Equipe e segurança',
};
