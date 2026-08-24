export type AdminSection =
  | 'overview'
  | 'orders'
  | 'catalog'
  | 'customers'
  | 'subscriptions'
  | 'help'
  | 'settings'
  | 'employees';
export type SettingsSection =
  | 'brand'
  | 'business'
  | 'address'
  | 'hours'
  | 'orders'
  | 'promotions'
  | 'delivery'
  | 'table'
  | 'whatsapp'
  | 'payments'
  | 'social'
  | 'appearance'
  | 'security';
export type EmployeeRole = 'COOK' | 'WAITER' | 'ATTENDANT';
export type BusinessHour = {
  id: string;
  label: string;
  enabled: boolean;
  openingTime: string;
  closingTime: string;
};

export type AdminOrder = {
  id: string;
  numericId: number;
  userId?: string;
  customerName: string;
  customerEmail?: string;
  status: string;
  total: number;
  paid?: boolean;
  type?: string;
  paymentMethod?: string;
  payOnDelivery?: boolean;
  payOnDeliveryMethod?: string;
  createdAt?: string;
};

export type AdminProduct = {
  id: string;
  categoryId: number;
  name: string;
  category: string;
  price: number;
  image: string;
  description?: string;
  stock?: number | null;
  active?: boolean;
  saleMode?: 'COMPLETE' | 'BUILDABLE';
  ingredients?: Array<{
    id?: number;
    name: string;
    price: number;
    required?: boolean;
    active?: boolean;
  }>;
  optionGroups?: AdminProductOptionGroup[];
  discount?: AdminProductDiscount | null;
  pricing?: AdminProductPricing | null;
};

export type DiscountType = 'PERCENTAGE' | 'FIXED';

export type AdminProductDiscount = {
  type: DiscountType;
  value: number;
  badgeLabel: string;
  active: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
};

export type AdminProductPricing = {
  basePrice: number;
  finalPrice: number;
  discountAmount: number;
  discountPercentage: number;
  hasDiscount: boolean;
};

export type ProductDiscountPayload = {
  type: DiscountType;
  value: number;
  badgeLabel: string;
  active: boolean;
  startsAt?: string;
  endsAt?: string;
};

export type AdminCoupon = {
  id: string;
  code: string;
  title: string;
  description: string;
  discountType: DiscountType;
  discount: number;
  minimumSubtotal: number;
  maxDiscount?: number | null;
  loyaltyPurchasesRequired: number;
  perCustomerLimit: number;
  redemptionValidityDays: number;
  active: boolean;
  expiration?: string | null;
};

export type CouponPayload = Omit<AdminCoupon, 'id'> & {
  expiration?: string | null;
};

export type AdminCategory = { id: number; name: string; active?: boolean };

export type AdminIngredient = {
  id: number;
  name: string;
  price: number;
  category: string;
  active: boolean;
};

export type AdminProductOption = {
  id?: number;
  ingredientId: number;
  active?: boolean;
};

export type AdminProductOptionGroup = {
  id?: number;
  name: string;
  description?: string;
  required: boolean;
  selectionType: 'SINGLE' | 'MULTIPLE';
  minSelections: number;
  maxSelections: number;
  options: AdminProductOption[];
};

export type AdminSettings = {
  restaurantName: string;
  companyLegalName: string;
  legalDocumentType: 'CPF' | 'CNPJ';
  companyDocument: string;
  businessPhone: string;
  businessEmail: string;
  businessZipCode: string;
  businessAddress: string;
  businessAddressNumber: string;
  businessAddressComplement: string;
  businessAddressDistrict: string;
  businessCity: string;
  businessState: string;
  businessHours: BusinessHour[];
  /** True only after a complete weekly schedule has been loaded or explicitly edited. */
  businessHoursConfigured: boolean;
  isOpenForOrders: boolean;
  logoUrl?: string;
  coverImageUrl?: string;
  primaryColor: string;
  description: string;
  whatsapp: string;
  instagram: string;
  facebook: string;
  minimumOrder: number;
  deliveryTime: number;
  autoAcceptOrders: boolean;
  trackingRequiresLogin: boolean;
  soundNotifications: boolean;
  maxConcurrentOrders: number;
  tableOrderingEnabled: boolean;
  pixProvider: string;
  pixKey: string;
  cardGateway: string;
  stripeSecretKey: string;
  stripeSecretKeyConfigured: boolean;
  stripeWebhookSecret: string;
  stripeWebhookSecretConfigured: boolean;
  mercadoPagoAccessToken: string;
  mercadoPagoAccessTokenConfigured: boolean;
  asaasAccessToken: string;
  asaasAccessTokenConfigured: boolean;
  pagbankEmail: string;
  pagbankToken: string;
  pagbankTokenConfigured: boolean;
  mainBannerId?: number;
  mainBannerUrl?: string;
};

export type Employee = {
  id: string;
  name: string;
  email: string;
  role: EmployeeRole;
  active: boolean;
  permissions: {
    viewOrders: boolean;
    updateOrderStatus: boolean;
    manageQrTables: boolean;
  };
};

export type AdminPageProps = {
  initialSettings?: AdminSettings;
  initialEmployees?: Employee[];
  initialOrders?: AdminOrder[];
  initialProducts?: AdminProduct[];
  initialCategories?: AdminCategory[];
  initialIngredients?: AdminIngredient[];
  initialCoupons?: AdminCoupon[];
  promotionsLoading?: boolean;
  promotionsError?: string;
  onUpdateOrderStatus?: (id: number, status: string) => void | Promise<void>;
  onConfirmOrderPayment?: (id: number) => void | Promise<void>;
  onCancelOrder?: (id: number) => void | Promise<void>;
  onSaveProduct?: (product: AdminProduct) => void | Promise<void>;
  onDeleteProduct?: (id: string) => void | Promise<void>;
  onCreateCategory?: (name: string) => void | Promise<void>;
  onUpdateCategory?: (id: number, name: string) => void | Promise<void>;
  onDeleteCategory?: (id: number) => void | Promise<void>;
  onCreateIngredient?: (ingredient: Omit<AdminIngredient, 'id'>) => void | Promise<void>;
  onUpdateIngredient?: (ingredient: AdminIngredient) => void | Promise<void>;
  onDeleteIngredient?: (id: number) => void | Promise<void>;
  onApplyProductDiscount?: (
    productId: string,
    payload: ProductDiscountPayload,
  ) => void | Promise<void>;
  onDeleteProductDiscount?: (productId: string) => void | Promise<void>;
  onCreateCoupon?: (payload: CouponPayload) => void | Promise<void>;
  onUpdateCoupon?: (id: string, payload: CouponPayload) => void | Promise<void>;
  onDeleteCoupon?: (id: string) => void | Promise<void>;
  onReloadPromotions?: () => void | Promise<void>;
  onOpenSettings?: () => void;
  onSaveSettings?: (settings: AdminSettings) => void | Promise<void>;
  onConnectMercadoPago?: () => void | Promise<void>;
  onConnectPagBank?: () => void | Promise<void>;
  onOnboardAsaas?: (payload: {
    cpf?: string;
    cnpj?: string;
    restaurantName: string;
    pixKey: string;
  }) => void | Promise<void>;
  onCreateEmployee?: (employee: Omit<Employee, 'id'>) => Employee | Promise<Employee>;
  onUpdateEmployee?: (employee: Employee) => Employee | Promise<Employee>;
  onDeactivateEmployee?: (id: string) => void | Promise<void>;
  onReactivateEmployee?: (id: string) => void | Promise<void>;
  onViewStore?: () => void;
  onReportSupport?: (payload: { subject: string; message: string }) => Promise<void>;
  onLogout?: () => void;
};
