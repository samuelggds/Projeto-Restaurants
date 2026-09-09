export type Raw = Record<string, unknown>;
export type Product = {
  id: number;
  name: string;
  price: number;
  stock: number | null;
  category: string;
  image: string | null;
};
export type SupportMessage = {
  id?: string | number;
  senderType?: string;
  senderName?: string;
  message: string;
  sentAt?: string;
};
export type SupportThread = {
  orderId: number;
  customerName: string;
  orderStatus: string;
  isResolved: boolean;
  messages: SupportMessage[];
};

export const PAGE_SIZE = 10;
