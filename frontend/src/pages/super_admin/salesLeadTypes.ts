export type SalesLeadStatus = 'NEW' | 'CONTACTED' | 'ARCHIVED';
export type SalesLeadEmailStatus = 'PENDING' | 'SENT' | 'FAILED';
export type SalesLeadChannel = 'DELIVERY' | 'TABLE' | 'PICKUP';
export type SalesLeadPlan = 'BASICO' | 'PREMIUM' | 'UNDECIDED';

export interface SalesLead {
  id: string;
  name: string;
  restaurantName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  businessType: string;
  channels: SalesLeadChannel[];
  planInterest: SalesLeadPlan;
  message: string | null;
  consent: boolean;
  status: SalesLeadStatus;
  createdAt: string;
  updatedAt: string;
  emailStatus: SalesLeadEmailStatus;
  emailSentAt: string | null;
}

export interface SalesLeadsQuery {
  page: number;
  pageSize: number;
  status?: SalesLeadStatus;
  q?: string;
}

export interface SalesLeadsResult {
  items: SalesLead[];
  total: number;
  page: number;
  pageSize: number;
  emailConfigured: boolean;
}
