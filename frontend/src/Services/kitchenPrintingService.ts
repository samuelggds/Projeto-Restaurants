import api from './api';

export type PrinterAutoPrintTrigger = 'NEW_ORDER' | 'PAYMENT_CONFIRMED';
export type PrinterPaperWidth = 'MM58' | 'MM80';

export type KitchenPrinterSettings = {
  enabled: boolean;
  autoPrintEnabled: boolean;
  autoPrintTrigger: PrinterAutoPrintTrigger;
  paperWidth: PrinterPaperWidth;
  copies: number;
};

export type PrinterAgentStatus = {
  publicId: string;
  name: string;
  printerName: string | null;
  lastSeenAt: string | null;
  appVersion: string | null;
  online: boolean;
};

export type KitchenPrintingConfiguration = {
  settings: KitchenPrinterSettings;
  agent: PrinterAgentStatus | null;
  queue: Partial<Record<'PENDING' | 'PROCESSING' | 'PRINTED' | 'FAILED' | 'CANCELLED', number>>;
  onlineWindowSeconds: number;
};

export type PrinterAgentCredential = {
  device: { publicId: string; name: string };
  credential: string;
  shownOnce: true;
};

export type KitchenPrintJobSummary = {
  publicId: string;
  orderId: number | null;
  type: 'ORDER' | 'TEST';
  source: 'AUTOMATIC' | 'MANUAL' | 'TEST';
  trigger: PrinterAutoPrintTrigger | null;
  status: 'PENDING' | 'PROCESSING' | 'PRINTED' | 'FAILED' | 'CANCELLED';
  attempts: number;
  availableAt: string;
  printedAt: string | null;
  lastError: string | null;
  createdAt: string;
};

class KitchenPrintingService {
  async getConfiguration() {
    const response = await api.get<KitchenPrintingConfiguration>('/kitchen-printing/settings');
    return response.data;
  }

  async updateSettings(settings: KitchenPrinterSettings) {
    const response = await api.patch<KitchenPrinterSettings>(
      '/kitchen-printing/settings',
      settings,
    );
    return response.data;
  }

  async issueCredential(input: { devicePublicId?: string; name?: string }) {
    const response = await api.post<PrinterAgentCredential>(
      '/kitchen-printing/devices/credential',
      input,
    );
    return response.data;
  }

  async revokeCredential(devicePublicId: string) {
    const response = await api.delete(`/kitchen-printing/devices/${devicePublicId}`);
    return response.data;
  }

  async printTest() {
    const response = await api.post<{ jobPublicId: string; status: string }>(
      '/kitchen-printing/test',
    );
    return response.data;
  }

  async listJobs(limit = 8) {
    const response = await api.get<KitchenPrintJobSummary[]>('/kitchen-printing/jobs', {
      params: { limit },
    });
    return response.data;
  }

  async retryJob(jobPublicId: string) {
    const response = await api.post(`/kitchen-printing/jobs/${jobPublicId}/retry`);
    return response.data;
  }
}

export default new KitchenPrintingService();
