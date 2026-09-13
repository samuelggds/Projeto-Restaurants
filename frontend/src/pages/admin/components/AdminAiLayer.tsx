import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { Sparkles, X } from 'lucide-react';
import aiGuideService, {
  type AiCreditBalance,
  type AiTourGuide,
} from '../../../Services/aiGuideService';
import { useAuth } from '../../../contexts/authContext';
import { AiCreditCard } from './AiCreditCard';
import { AiGuideAssistant } from './AiGuideAssistant';
import { AiGuidedTour } from './AiGuidedTour';

const AREA_LABELS: Record<string, string> = {
  overview: 'Visão geral',
  orders: 'Pedidos',
  catalog: 'Cardápio',
  customers: 'Clientes',
  employees: 'Funcionários',
  subscriptions: 'Cobranças e assinaturas',
  help: 'Central de ajuda',
};

const SETTING_LABELS: Record<string, string> = {
  brand: 'Marca e identidade',
  business: 'Dados do negócio',
  address: 'Endereço',
  hours: 'Horários',
  orders: 'Pedidos',
  promotions: 'Descontos e fidelidade',
  delivery: 'Delivery e retirada',
  table: 'Cardápio de mesa',
  'table-account': 'Conta e pagamento da mesa',
  whatsapp: 'WhatsApp',
  printing: 'Impressora da cozinha',
  'employee-payments': 'Pagamento dos funcionários',
  'courier-payments': 'Pagamento dos motoqueiros',
  payments: 'Pagamentos',
  social: 'Redes sociais',
  appearance: 'Aparência e SEO',
  security: 'Equipe e segurança',
};

function findButtonByLabel(label: string) {
  return Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(
    (button) =>
      button.getAttribute('aria-label') === label || button.textContent?.trim().includes(label),
  );
}

function tagTourTargets() {
  const areaTargets: Record<string, string> = {
    'Visão geral': 'nav-overview',
    Pedidos: 'nav-orders',
    Cardápio: 'nav-catalog',
    Clientes: 'nav-customers',
    Funcionários: 'nav-employees',
    'Cobranças e assinaturas': 'nav-subscriptions',
    Configurações: 'nav-settings',
    'Central de ajuda': 'nav-help',
  };

  Object.entries(areaTargets).forEach(([label, target]) => {
    const button = findButtonByLabel(label);
    if (button) button.dataset.tour = target;
  });

  const preview = findButtonByLabel('Ver loja');
  if (preview) preview.dataset.tour = 'settings-store-preview';
  const importButton = findButtonByLabel('Importar cardápio');
  if (importButton) importButton.dataset.tour = 'catalog-import';
  const newProduct = findButtonByLabel('Novo produto');
  if (newProduct) newProduct.dataset.tour = 'catalog-new-product';
  const content = document.querySelector<HTMLElement>('[data-admin-root] main');
  if (content) content.dataset.tour = 'page-content';
}

export default function AdminAiLayer({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [credits, setCredits] = useState<AiCreditBalance | null>(null);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [guide, setGuide] = useState<AiTourGuide | null>(null);
  const [sidebarPortal, setSidebarPortal] = useState<HTMLElement | null>(null);
  const restaurantRecord =
    user?.restaurant && typeof user.restaurant === 'object'
      ? (user.restaurant as Record<string, unknown>)
      : null;
  const restaurantSlug = String(user?.restaurantSlug || restaurantRecord?.slug || '').trim();

  useEffect(() => {
    let active = true;
    aiGuideService
      .getCredits()
      .then((balance) => {
        if (active) setCredits(balance);
      })
      .catch(() => {
        if (active) setCredits(null);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let disposed = false;
    let portalNode: HTMLDivElement | null = null;
    let previewButton: HTMLButtonElement | null = null;

    const openStore = (event: Event) => {
      if (!restaurantSlug) return;
      event.preventDefault();
      event.stopPropagation();
      if ('stopImmediatePropagation' in event) event.stopImmediatePropagation();
      navigate(`/${encodeURIComponent(restaurantSlug)}`);
    };

    const sync = () => {
      if (disposed) return;
      tagTourTargets();
      const helpButton = findButtonByLabel('Central de ajuda');
      const footer = helpButton?.parentElement;
      if (footer && !portalNode) {
        portalNode = document.createElement('div');
        portalNode.dataset.aiCreditsPortal = 'true';
        footer.insertBefore(portalNode, helpButton || footer.firstChild);
        setSidebarPortal(portalNode);
      }

      const nextPreview = findButtonByLabel('Ver loja');
      if (nextPreview !== previewButton) {
        previewButton?.removeEventListener('click', openStore, true);
        previewButton = nextPreview || null;
        previewButton?.addEventListener('click', openStore, true);
      }
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    const interval = window.setInterval(sync, 800);
    return () => {
      disposed = true;
      observer.disconnect();
      window.clearInterval(interval);
      previewButton?.removeEventListener('click', openStore, true);
      setSidebarPortal(null);
      portalNode?.remove();
    };
  }, [navigate, restaurantSlug]);

  const navigateForTour = useCallback((destination?: string | null) => {
    if (!destination) {
      tagTourTargets();
      return;
    }

    if (destination.startsWith('settings:')) {
      findButtonByLabel('Configurações')?.click();
      const section = destination.slice('settings:'.length);
      window.setTimeout(() => {
        const label = SETTING_LABELS[section];
        if (label) findButtonByLabel(label)?.click();
        window.setTimeout(tagTourTargets, 80);
      }, 120);
      return;
    }

    const label = AREA_LABELS[destination];
    if (label) findButtonByLabel(label)?.click();
    window.setTimeout(tagTourTargets, 120);
  }, []);

  return (
    <>
      {children}
      {sidebarPortal && createPortal(<AiCreditCard balance={credits} />, sidebarPortal)}

      <AssistantLauncher
        type="button"
        data-tour="ai-assistant"
        aria-label="Abrir guia inteligente do GastroNexa"
        onClick={() => setAssistantOpen((current) => !current)}
      >
        <Sparkles />
        <span>Guia com IA</span>
      </AssistantLauncher>

      {assistantOpen && (
        <AssistantPanel role="dialog" aria-label="Guia inteligente do GastroNexa">
          <button
            className="close"
            type="button"
            aria-label="Fechar guia inteligente"
            onClick={() => setAssistantOpen(false)}
          >
            <X />
          </button>
          <AiGuideAssistant
            disabled={credits?.exhausted === true}
            onGuideReady={(nextGuide) => {
              setGuide(nextGuide);
              setAssistantOpen(false);
            }}
            onCreditsChanged={setCredits}
          />
        </AssistantPanel>
      )}

      <AiGuidedTour guide={guide} onClose={() => setGuide(null)} onNavigate={navigateForTour} />
    </>
  );
}

const AssistantLauncher = styled.button`
  position: fixed;
  left: 22px;
  bottom: 22px;
  z-index: 9200;
  min-height: 44px;
  padding: 0 14px;
  border: 0;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #fff;
  background: #17191a;
  box-shadow: 0 14px 32px rgba(17, 24, 39, 0.24);
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;

  svg { width: 17px; }

  @media (max-width: 760px) {
    left: 14px;
    bottom: 82px;
    span { display: none; }
    width: 46px;
    padding: 0;
    justify-content: center;
  }
`;

const AssistantPanel = styled.div`
  position: fixed;
  left: 22px;
  bottom: 76px;
  z-index: 9300;
  width: min(520px, calc(100vw - 32px));
  max-height: min(680px, calc(100vh - 110px));
  overflow: auto;
  padding: 10px;
  border-radius: 22px;
  background: #f7f4f2;
  box-shadow: 0 28px 80px rgba(24, 18, 14, 0.28);
  border: 1px solid rgba(64, 49, 40, 0.12);

  .close {
    position: sticky;
    top: 4px;
    margin-left: auto;
    margin-bottom: -34px;
    z-index: 2;
    width: 32px;
    height: 32px;
    border: 0;
    border-radius: 10px;
    display: grid;
    place-items: center;
    background: #fff;
    color: #514a45;
    box-shadow: 0 5px 14px rgba(0, 0, 0, 0.09);
    cursor: pointer;
  }

  .close svg { width: 16px; }

  @media (max-width: 760px) {
    left: 16px;
    bottom: 136px;
  }
`;
