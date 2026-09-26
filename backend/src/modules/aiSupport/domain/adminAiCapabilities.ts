export const ADMIN_AI_AREAS = [
  'overview',
  'orders',
  'catalog',
  'customers',
  'employees',
  'subscriptions',
  'settings:brand',
  'settings:business',
  'settings:address',
  'settings:hours',
  'settings:orders',
  'settings:promotions',
  'settings:delivery',
  'settings:table',
  'settings:table-account',
  'settings:whatsapp',
  'settings:printing',
  'settings:employee-payments',
  'settings:courier-payments',
  'settings:payments',
  'settings:social',
  'settings:appearance',
  'settings:security',
] as const;

export type AdminAiArea = (typeof ADMIN_AI_AREAS)[number];
export type AdminAiCapabilityRisk = 'READ' | 'WRITE' | 'SENSITIVE_WRITE';
export type AdminAiCapability = {
  id: string;
  area: AdminAiArea;
  risk: AdminAiCapabilityRisk;
  approvalRequired: boolean;
  description: string;
};

const capabilities = [
  ['READ_OVERVIEW', 'overview', 'READ', false, 'Consultar indicadores, prioridades e alertas do restaurante.'],
  ['READ_ORDERS', 'orders', 'READ', false, 'Consultar pedidos e detalhes operacionais do restaurante.'],
  ['UPDATE_ORDER_STATUS', 'orders', 'WRITE', true, 'Preparar avanço de status de um pedido pertencente ao restaurante.'],
  ['CANCEL_ORDER', 'orders', 'SENSITIVE_WRITE', true, 'Preparar cancelamento do pedido usando o mesmo fluxo administrativo de estorno quando aplicável.'],
  ['PREPARE_ORDER_SUPPORT_REPLY', 'orders', 'WRITE', true, 'Preparar resposta editável para atendimento de um pedido.'],
  ['READ_CATALOG', 'catalog', 'READ', false, 'Consultar categorias, produtos, preços e disponibilidade do restaurante.'],
  ['CREATE_PRODUCT', 'catalog', 'WRITE', true, 'Preparar cadastro de produto em categoria existente do restaurante.'],
  ['UPDATE_PRODUCT', 'catalog', 'WRITE', true, 'Preparar alteração de dados de produto do restaurante.'],
  ['DELETE_PRODUCT', 'catalog', 'SENSITIVE_WRITE', true, 'Preparar exclusão de produto do restaurante com confirmação.'],
  ['ADJUST_PRODUCT_PRICES', 'catalog', 'WRITE', true, 'Preparar reajuste de preços com prévia dos registros afetados.'],
  ['TOGGLE_PRODUCT_AVAILABILITY', 'catalog', 'WRITE', true, 'Preparar ativação ou desativação de produto.'],
  ['CREATE_CATEGORY', 'catalog', 'WRITE', true, 'Preparar cadastro de categoria do restaurante.'],
  ['IMPORT_MENU_PREVIEW', 'catalog', 'WRITE', true, 'Extrair cardápio para revisão antes de publicar.'],
  ['GENERATE_PRODUCT_IMAGES', 'catalog', 'WRITE', true, 'Preparar jobs de imagens dos produtos do restaurante.'],
  ['READ_CUSTOMERS', 'customers', 'READ', false, 'Consultar clientes e histórico permitido do restaurante.'],
  ['READ_EMPLOYEES', 'employees', 'READ', false, 'Consultar equipe vinculada ao restaurante.'],
  ['UPDATE_EMPLOYEE', 'employees', 'SENSITIVE_WRITE', true, 'Preparar alteração de dados/cargo de funcionário ou entregador do restaurante sem senha.'],
  ['SET_EMPLOYEE_ACTIVE', 'employees', 'SENSITIVE_WRITE', true, 'Preparar desativação ou reativação de funcionário/entregador do restaurante.'],
  ['READ_SUBSCRIPTION', 'subscriptions', 'READ', false, 'Consultar a assinatura do próprio restaurante.'],
  ['REQUEST_PLAN_CHANGE', 'subscriptions', 'SENSITIVE_WRITE', true, 'Preparar solicitação de troca de plano do próprio restaurante.'],
  ['READ_BUSINESS_SETTINGS', 'settings:business', 'READ', false, 'Consultar dados operacionais e públicos do negócio.'],
  ['UPDATE_BUSINESS_SETTINGS', 'settings:business', 'WRITE', true, 'Preparar alteração de dados operacionais do negócio.'],
  ['READ_ADDRESS', 'settings:address', 'READ', false, 'Consultar endereço configurado do restaurante.'],
  ['UPDATE_ADDRESS', 'settings:address', 'WRITE', true, 'Preparar alteração de endereço do restaurante.'],
  ['READ_BUSINESS_HOURS', 'settings:hours', 'READ', false, 'Consultar horários do restaurante.'],
  ['UPDATE_BUSINESS_HOURS', 'settings:hours', 'WRITE', true, 'Preparar alteração de horários do restaurante.'],
  ['READ_ORDER_SETTINGS', 'settings:orders', 'READ', false, 'Consultar preferências de pedidos.'],
  ['UPDATE_ORDER_SETTINGS', 'settings:orders', 'WRITE', true, 'Preparar alteração de preferências de pedidos.'],
  ['READ_PROMOTIONS', 'settings:promotions', 'READ', false, 'Consultar promoções e fidelidade.'],
  ['CREATE_COUPON', 'settings:promotions', 'WRITE', true, 'Preparar criação de cupom do restaurante.'],
  ['UPDATE_COUPON', 'settings:promotions', 'WRITE', true, 'Preparar alteração de cupom do restaurante.'],
  ['DELETE_COUPON', 'settings:promotions', 'SENSITIVE_WRITE', true, 'Preparar remoção de cupom quando o histórico permitir.'],
  ['UPSERT_PRODUCT_DISCOUNT', 'settings:promotions', 'WRITE', true, 'Preparar criação ou alteração de desconto de um produto do restaurante.'],
  ['READ_DELIVERY_SETTINGS', 'settings:delivery', 'READ', false, 'Consultar regras de delivery e retirada.'],
  ['UPDATE_DELIVERY_SETTINGS', 'settings:delivery', 'WRITE', true, 'Preparar alteração de delivery e retirada.'],
  ['READ_TABLE_SETTINGS', 'settings:table', 'READ', false, 'Consultar configuração do cardápio de mesa.'],
  ['UPDATE_TABLE_SETTINGS', 'settings:table', 'WRITE', true, 'Preparar alteração do cardápio de mesa.'],
  ['READ_TABLE_ACCOUNT_SETTINGS', 'settings:table-account', 'READ', false, 'Consultar configuração de conta e pagamento da mesa.'],
  ['UPDATE_TABLE_ACCOUNT_SETTINGS', 'settings:table-account', 'WRITE', true, 'Preparar alteração das preferências da conta de mesa sem credenciais de pagamento.'],
  ['READ_WHATSAPP_STATUS', 'settings:whatsapp', 'READ', false, 'Consultar apenas estado operacional e número comercial; nunca credenciais.'],
  ['UPDATE_WHATSAPP_SETTINGS', 'settings:whatsapp', 'SENSITIVE_WRITE', true, 'Preparar alteração de preferências operacionais do WhatsApp sem ler ou escrever segredos.'],
  ['READ_PRINTING_SETTINGS', 'settings:printing', 'READ', false, 'Consultar configuração operacional de impressão.'],
  ['READ_EMPLOYEE_SETTLEMENTS', 'settings:employee-payments', 'READ', false, 'Consultar acertos de funcionários do restaurante.'],
  ['READ_COURIER_SETTLEMENTS', 'settings:courier-payments', 'READ', false, 'Consultar acertos de entregadores do restaurante.'],
  ['READ_PAYMENT_STATUS', 'settings:payments', 'READ', false, 'Consultar estado operacional das integrações de pagamento sem credenciais.'],
  ['READ_SOCIAL_SETTINGS', 'settings:social', 'READ', false, 'Consultar links públicos de redes sociais.'],
  ['UPDATE_SOCIAL_SETTINGS', 'settings:social', 'WRITE', true, 'Preparar alteração de links públicos de redes sociais.'],
  ['READ_APPEARANCE_SETTINGS', 'settings:appearance', 'READ', false, 'Consultar identidade visual e SEO público.'],
  ['UPDATE_APPEARANCE_SETTINGS', 'settings:appearance', 'WRITE', true, 'Preparar alteração de identidade visual e SEO público.'],
  ['READ_TEAM_SECURITY', 'settings:security', 'READ', false, 'Consultar somente configurações de equipe disponíveis ao ADMIN; nunca controles de plataforma.'],
] as const satisfies readonly (readonly [string, AdminAiArea, AdminAiCapabilityRisk, boolean, string])[];

export const ADMIN_AI_CAPABILITIES: readonly AdminAiCapability[] = capabilities.map(
  ([id, area, risk, approvalRequired, description]) => ({ id, area, risk, approvalRequired, description }),
);

const byArea = new Map<AdminAiArea, readonly AdminAiCapability[]>(
  ADMIN_AI_AREAS.map((area) => [area, ADMIN_AI_CAPABILITIES.filter((capability) => capability.area === area)]),
);

export function normalizeAdminAiArea(value: unknown): AdminAiArea | null {
  const candidate = String(value || '').trim() as AdminAiArea;
  return (ADMIN_AI_AREAS as readonly string[]).includes(candidate) ? candidate : null;
}

export function adminAiCapabilitiesForArea(areaInput: unknown) {
  const area = normalizeAdminAiArea(areaInput);
  return area ? byArea.get(area) ?? [] : [];
}

export function adminAiCapabilitiesForAdmin() {
  return ADMIN_AI_CAPABILITIES;
}

export function assertAdminAiCapabilityAllowed(capabilityId: unknown) {
  const id = String(capabilityId || '').trim();
  const capability = ADMIN_AI_CAPABILITIES.find((item) => item.id === id);
  if (!capability) {
    throw new Error('Ação não disponível para o ADMIN.');
  }
  return capability;
}

export const ADMIN_AI_STRUCTURAL_DENYLIST = Object.freeze([
  'SUPER_ADMIN',
  'READ_SECRETS',
  'READ_ENV',
  'READ_SOURCE_CODE',
  'EXECUTE_SQL',
  'EXECUTE_SHELL',
  'SWITCH_TENANT',
  'READ_OTHER_RESTAURANT',
  'CREATE_EMPLOYEE_WITH_PASSWORD',
] as const);
