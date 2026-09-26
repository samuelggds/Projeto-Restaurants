export interface CommercialWhatsappPeriod {
  enabled: boolean;
  start: string;
  end: string;
}

export interface CommercialWhatsappDay {
  weekday: number;
  enabled: boolean;
  periods: [CommercialWhatsappPeriod, CommercialWhatsappPeriod];
}

export interface CommercialWhatsappSettings {
  enabled: boolean;
  hours: CommercialWhatsappDay[];
  awayMessage: string;
  timezone: string;
}

export interface CommercialWhatsappConnection {
  configured: boolean;
  provider: 'EVOLUTION';
  status: string;
  phone?: string | null;
  connectedAt?: string | null;
  disconnectedAt?: string | null;
  lastWebhookAt?: string | null;
  qrCode?: string;
}

export interface CommercialWhatsappMessage {
  id: string;
  direction: 'INBOUND' | 'OUTBOUND';
  kind: string;
  body: string;
  automated: boolean;
  createdAt: string;
}

export interface CommercialWhatsappConversation {
  id: string;
  phone: string;
  automationMode: 'BOT' | 'HUMAN';
  lastInboundAt: string | null;
  lastOutboundAt: string | null;
  messages: CommercialWhatsappMessage[];
}
