import { z } from 'zod';

const optionalText = (max: number) => z.string().trim().max(max).nullable().optional();
const strictObject = <T extends z.ZodRawShape>(shape: T) => z.object(shape).strict();

function requirePatch<T extends z.ZodRawShape>(schema: z.ZodObject<T>, fields: readonly (keyof T)[]) {
  return schema.refine(
    (value) => fields.some((field) => value[field] !== undefined),
    { message: 'Informe ao menos um campo para alterar.' },
  );
}

export const createProductProposalSchema = strictObject({
  actionType: z.literal('CREATE_PRODUCT'),
  name: z.string().trim().min(2).max(160),
  description: optionalText(1000),
  price: z.number().positive().max(100000),
  categoryId: z.number().int().positive().optional(),
  categoryName: z.string().trim().min(1).max(120).optional(),
  active: z.boolean().optional().default(true),
});

export const updateProductProposalSchema = requirePatch(
  strictObject({
    actionType: z.literal('UPDATE_PRODUCT'),
    productId: z.number().int().positive(),
    name: z.string().trim().min(2).max(160).optional(),
    description: optionalText(1000),
    price: z.number().positive().max(100000).optional(),
    categoryId: z.number().int().positive().optional(),
    categoryName: z.string().trim().min(1).max(120).optional(),
    active: z.boolean().optional(),
  }),
  ['name', 'description', 'price', 'categoryId', 'categoryName', 'active'],
);

export const adjustPricesProposalSchema = strictObject({
  actionType: z.literal('ADJUST_PRODUCT_PRICES'),
  productIds: z.array(z.number().int().positive()).min(1).max(100).optional(),
  categoryId: z.number().int().positive().optional(),
  categoryName: z.string().trim().min(1).max(120).optional(),
  nameContains: z.string().trim().min(1).max(120).optional(),
  deltaAmount: z.number().min(-100000).max(100000).optional(),
  percent: z.number().min(-100).max(1000).optional(),
})
  .refine((value) => value.deltaAmount !== undefined || value.percent !== undefined, {
    message: 'Informe o reajuste em valor ou percentual.',
  })
  .refine(
    (value) =>
      Boolean(
        value.productIds?.length || value.categoryId || value.categoryName || value.nameContains,
      ),
    { message: 'Informe quais produtos serão reajustados.' },
  );

export const toggleProductAvailabilityProposalSchema = strictObject({
  actionType: z.literal('TOGGLE_PRODUCT_AVAILABILITY'),
  active: z.boolean(),
  productIds: z.array(z.number().int().positive()).min(1).max(100).optional(),
  categoryId: z.number().int().positive().optional(),
  categoryName: z.string().trim().min(1).max(120).optional(),
  nameContains: z.string().trim().min(1).max(120).optional(),
}).refine(
  (value) =>
    Boolean(
      value.productIds?.length || value.categoryId || value.categoryName || value.nameContains,
    ),
  { message: 'Informe quais produtos terão a disponibilidade alterada.' },
);

export const createCategoryProposalSchema = strictObject({
  actionType: z.literal('CREATE_CATEGORY'),
  name: z.string().trim().min(1).max(50),
  description: optionalText(255),
  active: z.boolean().optional().default(true),
});

export const updateOrderStatusProposalSchema = strictObject({
  actionType: z.literal('UPDATE_ORDER_STATUS'),
  orderId: z.number().int().positive(),
  status: z.enum(['PREPARANDO', 'PRONTO', 'ENTREGUE']),
});

export const updateBusinessSettingsProposalSchema = requirePatch(
  strictObject({
    actionType: z.literal('UPDATE_BUSINESS_SETTINGS'),
    restaurantName: optionalText(160),
    restaurantDescription: optionalText(1000),
    companyLegalName: optionalText(160),
    companyTradeName: optionalText(160),
    whatsapp: optionalText(30),
  }),
  ['restaurantName', 'restaurantDescription', 'companyLegalName', 'companyTradeName', 'whatsapp'],
);

export const updateAddressProposalSchema = requirePatch(
  strictObject({
    actionType: z.literal('UPDATE_ADDRESS'),
    restaurantAddress: optionalText(200),
    restaurantAddressNumber: optionalText(30),
    restaurantAddressComplement: optionalText(120),
    restaurantAddressDistrict: optionalText(120),
    restaurantCity: optionalText(120),
    restaurantState: z.string().trim().min(2).max(2).nullable().optional(),
    restaurantZipCode: optionalText(12),
  }),
  [
    'restaurantAddress',
    'restaurantAddressNumber',
    'restaurantAddressComplement',
    'restaurantAddressDistrict',
    'restaurantCity',
    'restaurantState',
    'restaurantZipCode',
  ],
);

const businessHourSchema = strictObject({
  id: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']),
  enabled: z.boolean(),
  openingTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/u),
  closingTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/u),
});

export const updateBusinessHoursProposalSchema = strictObject({
  actionType: z.literal('UPDATE_BUSINESS_HOURS'),
  businessHours: z.array(businessHourSchema).length(7),
});

export const updateOrderSettingsProposalSchema = requirePatch(
  strictObject({
    actionType: z.literal('UPDATE_ORDER_SETTINGS'),
    isOpenForOrders: z.boolean().optional(),
    autoAcceptOrders: z.boolean().optional(),
    soundNotifications: z.boolean().optional(),
    maxConcurrentOrders: z.number().int().min(1).max(500).optional(),
  }),
  ['isOpenForOrders', 'autoAcceptOrders', 'soundNotifications', 'maxConcurrentOrders'],
);

export const updateDeliverySettingsProposalSchema = requirePatch(
  strictObject({
    actionType: z.literal('UPDATE_DELIVERY_SETTINGS'),
    deliveryFee: z.number().min(0).max(10000).optional(),
    minimumOrder: z.number().min(0).max(100000).optional(),
    freeShippingMinimum: z.number().min(0).max(100000).nullable().optional(),
    acceptsDelivery: z.boolean().optional(),
    acceptsPickup: z.boolean().optional(),
    averageDeliveryTime: z.union([z.string().trim().max(80), z.number().min(0).max(1440)]).nullable().optional(),
  }),
  ['deliveryFee', 'minimumOrder', 'freeShippingMinimum', 'acceptsDelivery', 'acceptsPickup', 'averageDeliveryTime'],
);

export const updateTableSettingsProposalSchema = requirePatch(
  strictObject({
    actionType: z.literal('UPDATE_TABLE_SETTINGS'),
    tableOrderingEnabled: z.boolean().optional(),
    waiterCallEnabled: z.boolean().optional(),
    billRequestEnabled: z.boolean().optional(),
  }),
  ['tableOrderingEnabled', 'waiterCallEnabled', 'billRequestEnabled'],
);

export const updateTableAccountSettingsProposalSchema = requirePatch(
  strictObject({
    actionType: z.literal('UPDATE_TABLE_ACCOUNT_SETTINGS'),
    acceptsPix: z.boolean().optional(),
    acceptsCard: z.boolean().optional(),
    trackingRequiresLogin: z.boolean().optional(),
  }),
  ['acceptsPix', 'acceptsCard', 'trackingRequiresLogin'],
);

export const updateWhatsappSettingsProposalSchema = requirePatch(
  strictObject({
    actionType: z.literal('UPDATE_WHATSAPP_SETTINGS'),
    whatsapp: optionalText(30),
    whatsappEnabled: z.boolean().optional(),
    whatsappDisplayName: optionalText(120),
    whatsappDefaultMessage: optionalText(500),
    receiveOrdersOnWhatsapp: z.boolean().optional(),
    receiveStatusNotifications: z.boolean().optional(),
  }),
  [
    'whatsapp',
    'whatsappEnabled',
    'whatsappDisplayName',
    'whatsappDefaultMessage',
    'receiveOrdersOnWhatsapp',
    'receiveStatusNotifications',
  ],
);

export const updateSocialSettingsProposalSchema = requirePatch(
  strictObject({
    actionType: z.literal('UPDATE_SOCIAL_SETTINGS'),
    instagram: optionalText(300),
    facebook: optionalText(300),
    tiktok: optionalText(300),
    youtube: optionalText(300),
  }),
  ['instagram', 'facebook', 'tiktok', 'youtube'],
);

export const updateAppearanceSettingsProposalSchema = requirePatch(
  strictObject({
    actionType: z.literal('UPDATE_APPEARANCE_SETTINGS'),
    primaryColor: optionalText(20),
    fontFamily: optionalText(80),
    seoTitle: optionalText(160),
    seoDescription: optionalText(500),
  }),
  ['primaryColor', 'fontFamily', 'seoTitle', 'seoDescription'],
);

export const adminAiActionProposalSchema = z.union([
  createProductProposalSchema,
  updateProductProposalSchema,
  adjustPricesProposalSchema,
  toggleProductAvailabilityProposalSchema,
  createCategoryProposalSchema,
  updateOrderStatusProposalSchema,
  updateBusinessSettingsProposalSchema,
  updateAddressProposalSchema,
  updateBusinessHoursProposalSchema,
  updateOrderSettingsProposalSchema,
  updateDeliverySettingsProposalSchema,
  updateTableSettingsProposalSchema,
  updateTableAccountSettingsProposalSchema,
  updateWhatsappSettingsProposalSchema,
  updateSocialSettingsProposalSchema,
  updateAppearanceSettingsProposalSchema,
]);

export type AdminAiActionProposal = z.infer<typeof adminAiActionProposalSchema>;

export const IMPLEMENTED_ADMIN_AI_ACTION_TYPES = Object.freeze([
  'CREATE_PRODUCT',
  'UPDATE_PRODUCT',
  'ADJUST_PRODUCT_PRICES',
  'TOGGLE_PRODUCT_AVAILABILITY',
  'CREATE_CATEGORY',
  'UPDATE_ORDER_STATUS',
  'UPDATE_BUSINESS_SETTINGS',
  'UPDATE_ADDRESS',
  'UPDATE_BUSINESS_HOURS',
  'UPDATE_ORDER_SETTINGS',
  'UPDATE_DELIVERY_SETTINGS',
  'UPDATE_TABLE_SETTINGS',
  'UPDATE_TABLE_ACCOUNT_SETTINGS',
  'UPDATE_WHATSAPP_SETTINGS',
  'UPDATE_SOCIAL_SETTINGS',
  'UPDATE_APPEARANCE_SETTINGS',
] as const);
