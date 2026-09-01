export type PaperWidth = 'MM58' | 'MM80';

export type KitchenPrintCustomizationV1 = {
  groupName: string;
  options: string[];
};

export type KitchenDeliveryAddressV1 = {
  address?: string;
  number?: string;
  complement?: string;
  district?: string;
  city?: string;
  state?: string;
  zipCode?: string;
};

export type KitchenOrderPrintPayloadV1 = {
  version: 1;
  kind: 'ORDER';
  restaurantName: string;
  order: {
    publicId: string;
    displayNumber: string;
    createdAt: string;
    type: 'DELIVERY' | 'MESA' | 'RETIRADA';
    tableNumber?: number;
    customerName?: string;
    deliveryAddress?: KitchenDeliveryAddressV1;
    paid: boolean;
    paymentMethod?: 'PIX' | 'CARTAO' | 'DINHEIRO';
    items: Array<{
      quantity: number;
      name: string;
      observation?: string;
      customizations: KitchenPrintCustomizationV1[];
    }>;
    observation?: string;
    total: number;
  };
};

export type KitchenTestPrintPayloadV1 = {
  version: 1;
  kind: 'TEST';
  restaurantName: string;
  requestedAt: string;
  message: string;
};

export type KitchenPrintPayloadV1 = KitchenOrderPrintPayloadV1 | KitchenTestPrintPayloadV1;

export type ClaimedPrintJob = {
  publicId: string;
  type: 'ORDER' | 'TEST';
  source: 'AUTOMATIC' | 'MANUAL' | 'TEST';
  payloadVersion: 1;
  payload: KitchenPrintPayloadV1;
  paperWidth: PaperWidth;
  copies: number;
  attempts: number;
  leaseExpiresAt: string;
  createdAt: string;
};

export type LocalAgentConfig = {
  apiBaseUrl: string;
  credential: string;
  printerName: string | null;
  transport: 'windows' | 'mock';
  pollIntervalMs: number;
};
