import api from './api';

export type AiCreditBalance = {
  provider: 'OPENAI';
  currency: 'USD';
  balanceUsd: number;
  remainingUsd: number;
  usedUsd: number;
  freeGrantUsd: number;
  freeGrantClaimed: boolean;
  exhausted: boolean;
};

export type AiCreditCardOption =
  | { available: false }
  | {
      available: true;
      brand: string;
      brandLabel: string;
      last4: string;
      expMonth: number;
      expYear: number;
    };

export type AiCreditTopUpQuote = {
  creditUsd: number;
  exchangeRateBrlPerUsd: number;
  exchangeRateSource: string;
  quotedAt: string;
  baseAmountBrl: number;
  markupPercent: number;
  amountBrl: number;
  card: AiCreditCardOption;
};

export type AiCreditTopUp = {
  publicId: string;
  creditUsd: number;
  exchangeRateBrlPerUsd: number;
  exchangeRateSource: string;
  exchangeRateQuotedAt: string;
  baseAmountBrl: number;
  markupPercent: number;
  amountBrl: number;
  paymentMethod: 'PIX' | 'CARD';
  status: 'PENDING' | 'PROCESSING' | 'PAID' | 'FAILED' | 'CANCELED' | 'EXPIRED';
  providerPaymentId?: string | null;
  providerOrderId?: string | null;
  pixQrCode?: string | null;
  pixQrCodeBase64?: string | null;
  pixExpiresAt?: string | null;
  paidAt?: string | null;
  failureReason?: string | null;
  createdAt: string;
};

export type AiGuideStep = {
  title: string;
  body: string;
  target: string;
  navigateTo?: string | null;
};

export type AiTourGuide = {
  mode: 'TOUR';
  title: string;
  summary: string;
  steps: AiGuideStep[];
};

export type AiSupportGuide = {
  mode: 'SUPPORT_CHAT';
  title: string;
  summary: string;
  audience: string;
  answer: string;
  instructions: string[];
};

export type AiGuide = AiTourGuide | AiSupportGuide;

export type RestaurantAssistantAction = {
  publicId: string;
  actionType: 'CREATE_PRODUCT' | 'ADJUST_PRODUCT_PRICES' | string;
  status: 'PROPOSED' | 'APPROVED' | 'EXECUTED' | 'CANCELED' | 'FAILED';
  proposal: Record<string, unknown>;
  approvalSnapshot: Record<string, unknown> | null;
  result?: unknown;
  error?: string | null;
  createdAt: string;
  approvedAt?: string | null;
  executedAt?: string | null;
  canceledAt?: string | null;
};

export type RestaurantAssistantResponse = {
  mode: 'ANSWER' | 'ACTION_PROPOSAL' | 'NEEDS_INPUT';
  title: string;
  answer: string;
  evidence: Array<{ label: string; value: string }>;
  links: Array<{ label: string; target: string }>;
  missingInformation: string[];
  action?: RestaurantAssistantAction | null;
};

export type RestaurantAssistantAskResult = {
  response: RestaurantAssistantResponse;
  context: {
    generatedAt?: string | null;
    dataUpdatedAt?: string | null;
    timeZone?: string | null;
    period?: unknown;
  };
  credits: AiCreditBalance;
};

export type RestaurantManagementPriority = {
  key: string;
  situation: string;
  evidence: string;
  reason: string;
  target: string;
  label: string;
  period?: unknown;
};

export type RestaurantManagementSummary = {
  generatedAt: string;
  dataUpdatedAt: string;
  timeZone: string;
  period: {
    label: string;
    start: string;
    end: string;
    previousStart: string;
    previousEnd: string;
  };
  sales: {
    registered: { count: number; total: number };
    confirmedPayments: { count: number; total: number };
    cancellations: { count: number; total: number };
    refunds: { count: number; total: number };
    comparison: {
      registeredSalesPercent: number | null;
      confirmedPaymentsPercent: number | null;
      previousRegistered: { count: number; total: number };
      previousConfirmedPayments: { count: number; total: number };
    };
    definitions: Record<string, string>;
  };
  topProducts: Array<{ productId: number; name: string; quantity: number; grossSales: number }>;
  attentionOrders: Array<{
    orderId: number;
    status: string;
    customerName: string;
    total: number;
    minutesInState: number;
    thresholdMinutes: number;
  }>;
  catalog: {
    totalProducts: number;
    activeProducts: number;
    missingDescription: Array<{ productId: number; name: string }>;
    missingImage: Array<{ productId: number; name: string }>;
    lowStock: Array<{ productId: number; name: string; stock: number; threshold: number }>;
  };
  settlements: { employeesPending: number; couriersPending: number };
  priorities: RestaurantManagementPriority[];
  commercial: Record<string, unknown>;
  forecast: Record<string, unknown>;
  limitations: string[];
};

export type RestaurantAssistantSettings = {
  restaurantId: number;
  autonomyMode: 'SUGGEST_ONLY' | 'APPROVAL_REQUIRED' | 'BOUNDED_AUTOMATION';
  automationsEnabled: boolean;
  pendingOrderMinutes: number;
  preparingOrderMinutes: number;
  readyOrderMinutes: number;
  deliveryOrderMinutes: number;
  stockAlertThreshold: number;
  minimumForecastOrders: number;
  maxAiRequestsPerHour: number;
  maxConcurrentAiJobs: number;
  version: number;
  updatedAt: string;
};

export type AiImageBatch = {
  publicId: string;
  kind: string;
  status: string;
  estimatedCreditUsd: number;
  actualCreditUsd: number;
  progress: { total: number; completed: number; failed: number; pending: number; running: number };
  items: Array<{
    publicId: string;
    productId: number;
    status: string;
    result?: unknown;
    error?: string | null;
    attempts: number;
  }>;
  createdAt: string;
  completedAt?: string | null;
};

const aiGuideService = {
  async getCredits() {
    const response = await api.get('/ai-support/credits');
    return response.data as AiCreditBalance;
  },

  async getTopUpQuote(amountUsd: number) {
    const response = await api.get('/ai-support/credits/topup/quote', { params: { amountUsd } });
    return response.data as AiCreditTopUpQuote;
  },

  async createPixTopUp(amountUsd: number) {
    const response = await api.post('/ai-support/credits/topup/pix', { amountUsd });
    return response.data as AiCreditTopUp;
  },

  async createCardTopUp(amountUsd: number) {
    const response = await api.post('/ai-support/credits/topup/card', { amountUsd });
    return response.data as AiCreditTopUp;
  },

  async listTopUps() {
    const response = await api.get('/ai-support/credits/topups');
    return response.data as AiCreditTopUp[];
  },

  async createGuide(question: string) {
    const response = await api.post('/ai-support/guide', { question });
    return response.data as { guide: AiGuide; credits: AiCreditBalance };
  },

  async getManagementSummary() {
    const response = await api.get('/ai-support/restaurant/summary');
    return response.data as RestaurantManagementSummary;
  },

  async askRestaurant(question: string) {
    const response = await api.post('/ai-support/restaurant/ask', { question });
    return response.data as RestaurantAssistantAskResult;
  },

  async listActions() {
    const response = await api.get('/ai-support/restaurant/actions');
    return response.data as RestaurantAssistantAction[];
  },

  async approveAction(publicId: string) {
    const response = await api.post(`/ai-support/restaurant/actions/${encodeURIComponent(publicId)}/approve`);
    return response.data as RestaurantAssistantAction;
  },

  async cancelAction(publicId: string) {
    const response = await api.post(`/ai-support/restaurant/actions/${encodeURIComponent(publicId)}/cancel`);
    return response.data as RestaurantAssistantAction;
  },

  async getAssistantSettings() {
    const response = await api.get('/ai-support/restaurant/settings');
    return response.data as RestaurantAssistantSettings;
  },

  async updateAssistantSettings(payload: Partial<RestaurantAssistantSettings> & { expectedVersion?: number }) {
    const response = await api.put('/ai-support/restaurant/settings', payload);
    return response.data as RestaurantAssistantSettings;
  },

  async createSupportDraft(orderId: number) {
    const response = await api.post(`/ai-support/restaurant/orders/${orderId}/support-draft`);
    return response.data as {
      orderId: number;
      summary: string;
      topic: string;
      urgency: 'LOW' | 'MEDIUM' | 'HIGH';
      reason: string;
      suggestedReply: string;
      editable: true;
      requiresApprovalBeforeSend: true;
      sent: false;
      credits: AiCreditBalance;
    };
  },

  async estimateImageBatch(productIds: number[]) {
    const response = await api.post('/ai-support/restaurant/image-batches/estimate', { productIds });
    return response.data as { productCount: number; estimatedCreditUsd: number; note: string };
  },

  async createImageBatch(productIds: number[]) {
    const response = await api.post('/ai-support/restaurant/image-batches', { productIds });
    return response.data as AiImageBatch;
  },

  async listImageBatches() {
    const response = await api.get('/ai-support/restaurant/image-batches');
    return response.data as AiImageBatch[];
  },

  async cancelImageBatchItem(jobPublicId: string, itemPublicId: string) {
    const response = await api.post(
      `/ai-support/restaurant/image-batches/${encodeURIComponent(jobPublicId)}/items/${encodeURIComponent(itemPublicId)}/cancel`,
    );
    return response.data as AiImageBatch;
  },

  async retryImageBatchFailures(jobPublicId: string) {
    const response = await api.post(
      `/ai-support/restaurant/image-batches/${encodeURIComponent(jobPublicId)}/retry-failures`,
    );
    return response.data as AiImageBatch;
  },
};

export default aiGuideService;
