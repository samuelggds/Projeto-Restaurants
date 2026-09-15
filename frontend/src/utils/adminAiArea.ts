const MAIN_AREA_BY_LABEL: Record<string, string> = {
  'Visão geral': 'overview',
  Pedidos: 'orders',
  Cardápio: 'catalog',
  Clientes: 'customers',
  Funcionários: 'employees',
  'Cobranças e assinaturas': 'subscriptions',
};

const SETTINGS_AREA_BY_LABEL: Record<string, string> = {
  'Marca e identidade': 'settings:brand',
  'Dados do negócio': 'settings:business',
  Endereço: 'settings:address',
  Horários: 'settings:hours',
  Pedidos: 'settings:orders',
  'Descontos e fidelidade': 'settings:promotions',
  'Delivery e retirada': 'settings:delivery',
  'Cardápio de mesa': 'settings:table',
  'Conta e pagamento da mesa': 'settings:table-account',
  WhatsApp: 'settings:whatsapp',
  'Impressora da cozinha': 'settings:printing',
  'Pagamento dos funcionários': 'settings:employee-payments',
  'Pagamento dos motoqueiros': 'settings:courier-payments',
  Pagamentos: 'settings:payments',
  'Redes sociais': 'settings:social',
  'Aparência e SEO': 'settings:appearance',
  'Equipe e segurança': 'settings:security',
};

function normalizedText(element: Element | null) {
  return String(element?.textContent || '').replace(/\s+/g, ' ').trim();
}

export function inferAdminAiArea(root: ParentNode = document) {
  const adminRoot = root.querySelector<HTMLElement>('[data-admin-root]');
  if (!adminRoot) return null;

  const currentNavigation = adminRoot.querySelector<HTMLButtonElement>(
    'nav[aria-label="Navegação principal do painel"] button[aria-current="page"]',
  );
  const mainLabel = normalizedText(currentNavigation);

  if (mainLabel === 'Configurações') {
    const activeSettingsButton = Array.from(
      adminRoot.querySelectorAll<HTMLButtonElement>('button.active'),
    ).find((button) => normalizedText(button) in SETTINGS_AREA_BY_LABEL);
    const settingsLabel = normalizedText(activeSettingsButton || null);
    return SETTINGS_AREA_BY_LABEL[settingsLabel] || 'settings:brand';
  }

  return MAIN_AREA_BY_LABEL[mainLabel] || null;
}

export const ADMIN_AI_MAIN_AREA_BY_LABEL = Object.freeze(MAIN_AREA_BY_LABEL);
export const ADMIN_AI_SETTINGS_AREA_BY_LABEL = Object.freeze(SETTINGS_AREA_BY_LABEL);
