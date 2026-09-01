type KitchenPrintingEvent =
  | 'PRINT_JOB_CREATED'
  | 'PRINT_JOB_CLAIMED'
  | 'PRINT_JOB_PRINTED'
  | 'PRINT_JOB_FAILED'
  | 'PRINT_AGENT_ONLINE'
  | 'PRINT_AGENT_AUTH_FAILED';

type SafeFields = {
  restaurantId?: number;
  devicePublicId?: string;
  jobPublicId?: string;
  orderId?: number;
  source?: string;
  attempts?: number;
  reason?: string;
};

export function logKitchenPrintingEvent(event: KitchenPrintingEvent, fields: SafeFields = {}) {
  const safeReason = fields.reason?.replace(/[\r\n\t]/gu, ' ').slice(0, 180);
  console.info('[KITCHEN_PRINTING]', {
    event,
    ...(fields.restaurantId ? { restaurantId: fields.restaurantId } : {}),
    ...(fields.devicePublicId ? { devicePublicId: fields.devicePublicId } : {}),
    ...(fields.jobPublicId ? { jobPublicId: fields.jobPublicId } : {}),
    ...(fields.orderId ? { orderId: fields.orderId } : {}),
    ...(fields.source ? { source: fields.source } : {}),
    ...(typeof fields.attempts === 'number' ? { attempts: fields.attempts } : {}),
    ...(safeReason ? { reason: safeReason } : {}),
  });
}
