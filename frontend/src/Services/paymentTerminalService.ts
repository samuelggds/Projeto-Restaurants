import api from './api';

export type PaymentTerminal = {
  publicId: string;
  provider: string;
  providerTerminalId: string;
  serial: string;
  posId?: string | null;
  storeId?: string | null;
  externalPosId?: string | null;
  operatingMode?: string | null;
  active: boolean;
  assignedCourierId?: number | null;
  courierName?: string | null;
  lastSyncedAt?: string;
};

export type TerminalCourier = {
  id: number;
  name: string;
  email: string;
};

export type PaymentTerminalSnapshot = {
  terminals: PaymentTerminal[];
  couriers: TerminalCourier[];
};

class PaymentTerminalService {
  async list(): Promise<PaymentTerminalSnapshot> {
    const response = await api.get('/payment-terminals');
    return response.data;
  }

  async syncMercadoPago(): Promise<PaymentTerminalSnapshot> {
    const response = await api.post('/payment-terminals/mercado-pago/sync');
    return response.data;
  }

  async assign(publicId: string, courierId: number | null): Promise<PaymentTerminal> {
    const response = await api.patch(
      `/payment-terminals/${encodeURIComponent(publicId)}/assignment`,
      { courierId },
    );
    return response.data;
  }
}

export default new PaymentTerminalService();
