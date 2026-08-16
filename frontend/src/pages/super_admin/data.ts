import type { SuperAdminData } from './types';

export const superAdminMockData: SuperAdminData = {
  restaurants: [],
  plans: [],
  invoices: [],
  administrators: [],
  tickets: [],
  auditLogs: [],
  settings: {
    platformName: 'S&C Platform',
    domain: 'app.scplatform.com.br',
    supportEmail: 'suporte@scplatform.com.br',
    primaryColor: '#ff6a00',
    language: 'Portugu\u00eas (Brasil)',
    currency: 'BRL \u2014 Real (R$)',
    timezone: 'America/Fortaleza',
    dateFormat: 'DD/MM/AAAA',
    allowSignup: true,
    manualApproval: false,
    trialDays: 14,
    uploadLimitMb: 5,
    logRetentionDays: 180,
    adminSessionHours: 8,
    maintenanceMode: false,
  },
};
