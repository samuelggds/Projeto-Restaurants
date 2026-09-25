import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { ChevronDown, LoaderCircle, Map, X } from 'lucide-react';
import aiGuideService, { type AiCreditBalance, type AiTourGuide } from '../../../Services/aiGuideService';
import restaurantSettingsService from '../../../Services/restaurantSettingsService';
import monthlyBillingService from '../../../Services/monthlyBillingService';
import { useAuth } from '../../../contexts/authContext';
import { createRestaurantMonogram } from '../../../utils/restaurantMonogram';
import { GastroNexaTourBrand } from '../../../components/GastroNexaTourBrand';
import { AiCreditCard } from './AiCreditCard';
import { AiGuideAssistant } from './AiGuideAssistant';
import { AiGuidedTour } from './AiGuidedTour';
import { AdminOverviewAiSummaryPortal } from './AdminOverviewAiSummaryPortal';

const AREA_LABELS: Record<string, string> = {
  overview: 'Visão geral', orders: 'Pedidos', catalog: 'Cardápio', customers: 'Clientes',
  employees: 'Funcionários', subscriptions: 'Cobranças e assinaturas', help: 'Central de ajuda',
};
const SETTING_LABELS: Record<string, string> = {
  brand: 'Marca e identidade', business: 'Dados do negócio', address: 'Endereço', hours: 'Horários',
  orders: 'Pedidos', promotions: 'Descontos e fidelidade', delivery: 'Delivery e retirada',
  table: 'Cardápio de mesa', 'table-account': 'Conta e pagamento da mesa', whatsapp: 'WhatsApp',
  printing: 'Impressora da cozinha', 'employee-payments': 'Pagamento dos funcionários',
  'courier-payments': 'Pagamento dos motoqueiros', payments: 'Pagamentos', social: 'Redes sociais',
  appearance: 'Aparência e SEO', security: 'Equipe e segurança',
};

const TOUR_AREAS = [
  { id: 'overview', label: 'Visão geral', description: 'Indicadores, vendas, clientes e atalhos do painel.' },
  { id: 'orders', label: 'Pedidos', description: 'Fila, detalhes, pagamentos, status, cancelamentos e estornos.' },
  { id: 'catalog', label: 'Cardápio', description: 'Produtos, categorias, estoque, opções e importação.' },
  { id: 'customers', label: 'Clientes', description: 'Busca, histórico, valores e última compra.' },
  { id: 'employees', label: 'Funcionários', description: 'Equipe, funções, criação, edição e status dos acessos.' },
  { id: 'subscriptions', label: 'Cobranças e assinaturas', description: 'Plano, mensalidade, faturas, Pix e renovação.' },
  { id: 'settings', label: 'Configurações', description: 'Marca, negócio, horários, delivery, WhatsApp, pagamentos e segurança.' },
  { id: 'help', label: 'Central de ajuda', description: 'Ajuda, orientações e suporte disponível no painel.' },
] as const;

type TourArea = (typeof TOUR_AREAS)[number];

function adminRoot() {
  return document.querySelector<HTMLElement>('[data-admin-root]') || document.body;
}

function findButtonByLabel(label: string) {
  const root = adminRoot();
  return Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find(
    (button) => button.getAttribute('aria-label') === label || button.textContent?.trim().includes(label),
  );
}

function tagTourTargets() {
  const areaTargets: Record<string, string> = {
    'Visão geral': 'nav-overview', Pedidos: 'nav-orders', Cardápio: 'nav-catalog', Clientes: 'nav-customers',
    Funcionários: 'nav-employees', 'Cobranças e assinaturas': 'nav-subscriptions', Configurações: 'nav-settings',
    'Central de ajuda': 'nav-help',
  };
  Object.entries(areaTargets).forEach(([label, target]) => {
    const button = findButtonByLabel(label);
    if (button && button.dataset.tour !== target) button.dataset.tour = target;
  });
  const preview = findButtonByLabel('Ver loja');
  if (preview) preview.dataset.tour = 'settings-store-preview';
  const importButton = findButtonByLabel('Importar cardápio');
  if (importButton) importButton.dataset.tour = 'catalog-import';
  const newProduct = findButtonByLabel('Novo produto');
  if (newProduct) newProduct.dataset.tour = 'catalog-new-product';
  const content = adminRoot().querySelector<HTMLElement>('main') || document.querySelector<HTMLElement>('main');
  if (content) content.dataset.tour = 'page-content';
}

function readSlug(value: unknown) {
  if (!value || typeof value !== 'object') return '';
  const record = value as Record<string, unknown>;
  const restaurant = record.restaurant && typeof record.restaurant === 'object' ? record.restaurant as Record<string, unknown> : null;
  return String(record.restaurantSlug || restaurant?.slug || record.slug || '').trim();
}

export default function AdminAiLayer({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userSlug = useMemo(() => readSlug(user), [user]);
  const userName = useMemo(() => String(user?.name || '').trim() || 'Administrador', [user]);
  const userInitials = useMemo(() => createRestaurantMonogram(userName), [userName]);
  const [fallbackRestaurantSlug, setFallbackRestaurantSlug] = useState('');
  const resolvedRestaurantSlug = userSlug || fallbackRestaurantSlug;
  const [aiEnabled, setAiEnabled] = useState(false);
  const [credits, setCredits] = useState<AiCreditBalance | null>(null);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [guide, setGuide] = useState<AiTourGuide | null>(null);
  const [tourMenuOpen, setTourMenuOpen] = useState(false);
  const [tourLoadingArea, setTourLoadingArea] = useState<string | null>(null);
  const [tourError, setTourError] = useState('');
  const [sidebarPortal, setSidebarPortal] = useState<HTMLElement | null>(null);
  const [assistantLauncherPortal, setAssistantLauncherPortal] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (userSlug) return undefined;
    let active = true;
    restaurantSettingsService.getMySettings().then((settings) => {
      if (active) setFallbackRestaurantSlug(readSlug(settings));
    }).catch(() => undefined);
    return () => { active = false; };
  }, [userSlug]);

  useEffect(() => {
    let active = true;
    monthlyBillingService
      .getSubscription()
      .then((subscription) => {
        if (!active) return;
        const enabled =
          subscription.plan === 'PREMIUM' &&
          (subscription.status === 'ATIVA' || subscription.status === 'TESTE');
        setAiEnabled(enabled);
      })
      .catch(() => {
        if (active) setAiEnabled(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!aiEnabled) {
      setCredits(null);
      return undefined;
    }
    let active = true;
    aiGuideService.getCredits().then((balance) => {
      if (active) setCredits(balance);
    }).catch(() => { if (active) setCredits(null); });
    return () => { active = false; };
  }, [aiEnabled]);

  const closeAssistant = useCallback(() => {
    setAssistantOpen(false);
    setTourMenuOpen(false);
    setTourError('');
  }, []);

  const toggleAssistant = useCallback(() => {
    if (assistantOpen) {
      closeAssistant();
      return;
    }
    setAssistantOpen(true);
  }, [assistantOpen, closeAssistant]);

  useEffect(() => {
    let disposed = false;
    let creditsPortalNode: HTMLDivElement | null = null;
    let launcherPortalNode: HTMLDivElement | null = null;
    let previewButton: HTMLButtonElement | null = null;
    let frame = 0;

    const openStore = (event: Event) => {
      if (!resolvedRestaurantSlug) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      navigate(`/${encodeURIComponent(resolvedRestaurantSlug)}`);
    };

    const sync = () => {
      if (disposed || document.hidden) return;
      tagTourTargets();
      const logoutButton = adminRoot().querySelector<HTMLButtonElement>('aside button[aria-label="Sair"]');
      const userBlock = logoutButton?.parentElement;
      const avatar = userBlock?.querySelector<HTMLElement>('.avatar');
      const name = userBlock?.querySelector<HTMLElement>('b');
      const role = userBlock?.querySelector<HTMLElement>('small');
      if (avatar && avatar.textContent !== userInitials) avatar.textContent = userInitials;
      if (name && name.textContent !== userName) name.textContent = userName;
      if (role && role.textContent !== 'Administrador') role.textContent = 'Administrador';

      const helpButton = findButtonByLabel('Central de ajuda');
      const footer = helpButton?.parentElement;
      if (aiEnabled && footer && !creditsPortalNode) {
        creditsPortalNode = document.createElement('div');
        creditsPortalNode.dataset.aiCreditsPortal = 'true';
        footer.insertBefore(creditsPortalNode, helpButton || footer.firstChild);
        setSidebarPortal(creditsPortalNode);
      }
      const settingsButton = findButtonByLabel('Configurações');
      const navigation = settingsButton?.parentElement;
      if (aiEnabled && navigation && settingsButton && !launcherPortalNode) {
        launcherPortalNode = document.createElement('div');
        launcherPortalNode.dataset.aiGuideLauncherPortal = 'true';
        launcherPortalNode.style.display = 'contents';
        settingsButton.insertAdjacentElement('afterend', launcherPortalNode);
        setAssistantLauncherPortal(launcherPortalNode);
      }
      const nextPreview = findButtonByLabel('Ver loja');
      if (nextPreview !== previewButton) {
        previewButton?.removeEventListener('click', openStore, true);
        previewButton = nextPreview || null;
        previewButton?.addEventListener('click', openStore, true);
      }
    };

    const scheduleSync = () => {
      if (disposed || frame) return;
      frame = requestAnimationFrame(() => { frame = 0; sync(); });
    };

    scheduleSync();
    const root = adminRoot();
    const observer = new MutationObserver(scheduleSync);
    observer.observe(root, { childList: true, subtree: true });
    const onVisibility = () => { if (!document.hidden) scheduleSync(); };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      previewButton?.removeEventListener('click', openStore, true);
      creditsPortalNode?.remove();
      launcherPortalNode?.remove();
    };
  }, [aiEnabled, navigate, resolvedRestaurantSlug, userInitials, userName]);

  const navigateForTour = useCallback((destination?: string | null) => {
    if (!destination) { tagTourTargets(); return; }
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

  const startAreaTour = async (area: TourArea) => {
    if (tourLoadingArea || credits?.exhausted) return;
    setTourLoadingArea(area.id);
    setTourError('');
    try {
      const result = await aiGuideService.createGuide(
        `Faça um tour guiado completo da aba "${area.label}" do painel ADMIN. ` +
        'Use o modo TOUR e crie um passo a passo visual com balões de Próximo e Voltar. ' +
        'Comece mostrando o item de navegação da área e depois apresente as principais funções reais dessa aba, usando somente targets válidos do sistema.',
      );
      setCredits(result.credits);
      if (result.guide.mode !== 'TOUR') {
        setTourError('Não consegui montar o tour visual desta área agora. Tente novamente.');
        return;
      }
      tagTourTargets();
      setTourMenuOpen(false);
      setGuide(result.guide);
      closeAssistant();
    } catch {
      setTourError('Não foi possível preparar o tour agora. Tente novamente em instantes.');
    } finally {
      setTourLoadingArea(null);
    }
  };

  const launcher = (
    <AssistantLauncher type="button" data-tour="ai-assistant" aria-label="Abrir GastroNexa IA" aria-expanded={assistantOpen} onClick={toggleAssistant}>
      <AssistantBrand>
        <GastroNexaTourBrand compact />
        <span className="ai-suffix">IA</span>
      </AssistantBrand>
    </AssistantLauncher>
  );

  return (
    <>
      {children}
      {aiEnabled ? <AdminOverviewAiSummaryPortal onNavigate={(target) => navigateForTour(target)} /> : null}
      {aiEnabled && sidebarPortal ? createPortal(<AiCreditCard balance={credits} />, sidebarPortal) : null}
      {aiEnabled && assistantLauncherPortal ? createPortal(launcher, assistantLauncherPortal) : null}
      {aiEnabled ? <MobileAssistantLauncher type="button" aria-label="Abrir GastroNexa IA" aria-expanded={assistantOpen} onClick={toggleAssistant}>
        <img src="/gastronexa-logo.svg" alt="" aria-hidden="true" />
      </MobileAssistantLauncher> : null}
      {aiEnabled && assistantOpen && (
        <AssistantPanel role="dialog" aria-label="GastroNexa IA">
          <PanelToolbar>
            <TourPicker>
              <TourTrigger
                type="button"
                aria-haspopup="menu"
                aria-expanded={tourMenuOpen}
                disabled={credits?.exhausted === true || Boolean(tourLoadingArea)}
                onClick={() => {
                  setTourError('');
                  setTourMenuOpen((current) => !current);
                }}
              >
                <Map />
                <span>Tour guiado</span>
                <ChevronDown className={tourMenuOpen ? 'open' : ''} />
              </TourTrigger>
              {tourMenuOpen && (
                <TourMenu role="menu" aria-label="Escolha uma área para o tour">
                  <div className="tour-menu-title">
                    <b>Qual aba você quer conhecer?</b>
                    <span>O sistema vai abrir a área e mostrar os passos com balões de Próximo e Voltar.</span>
                  </div>
                  <div className="tour-options">
                    {TOUR_AREAS.map((area) => (
                      <TourOption
                        key={area.id}
                        type="button"
                        role="menuitem"
                        disabled={Boolean(tourLoadingArea)}
                        onClick={() => void startAreaTour(area)}
                      >
                        <span className="option-copy">
                          <b>{area.label}</b>
                          <small>{area.description}</small>
                        </span>
                        {tourLoadingArea === area.id ? <LoaderCircle className="spin" /> : <span className="arrow">›</span>}
                      </TourOption>
                    ))}
                  </div>
                  {tourError && <div className="tour-error">{tourError}</div>}
                </TourMenu>
              )}
            </TourPicker>
            <button className="close" type="button" aria-label="Fechar GastroNexa IA" onClick={closeAssistant}><X /></button>
          </PanelToolbar>
          <AiGuideAssistant
            disabled={credits?.exhausted === true}
            onGuideReady={(nextGuide) => { setGuide(nextGuide); closeAssistant(); }}
            onCreditsChanged={setCredits}
            onNavigate={(target) => { navigateForTour(target); closeAssistant(); }}
          />
        </AssistantPanel>
      )}
      <AiGuidedTour key={guide ? `${guide.title}:${guide.summary}` : 'no-guide'} guide={guide} onClose={() => setGuide(null)} onNavigate={navigateForTour} />
    </>
  );
}

const AssistantBrand = styled.span`
  display:inline-flex;
  align-items:center;
  gap:5px;
  min-width:0;
  line-height:1;
  .ai-suffix{color:#fff;font-size:12px;font-weight:900;letter-spacing:-.02em}
`;
const AssistantLauncher = styled.button`
  cursor:pointer;
  &[aria-expanded='true']{color:#fff;background:rgba(255,255,255,.06)}
  @media(max-width:820px){display:none}
`;
const MobileAssistantLauncher = styled.button`
  display:none;
  @media(max-width:820px){
    position:fixed;left:14px;bottom:82px;z-index:9200;width:46px;height:46px;padding:0;border:0;border-radius:999px;display:flex;align-items:center;justify-content:center;color:#fff;background:#17191a;box-shadow:0 12px 26px rgba(17,24,39,.2);cursor:pointer;
    img{width:24px;height:24px;object-fit:contain;filter:grayscale(1) brightness(0) invert(1)}
  }
`;
const AssistantPanel = styled.div`
  position:fixed;left:248px;bottom:22px;z-index:9300;width:min(620px,calc(100vw - 32px));max-height:min(760px,calc(100vh - 90px));overflow:visible;padding:10px;border-radius:22px;background:#f7f4f2;box-shadow:0 24px 58px rgba(24,18,14,.24);border:1px solid rgba(64,49,40,.12);
  @media(max-width:820px){left:10px;right:10px;bottom:74px;width:auto;max-height:calc(100vh - 100px);border-radius:20px}
`;
const PanelToolbar = styled.div`
  height:42px;margin-bottom:6px;padding:0 2px;display:flex;align-items:center;justify-content:flex-end;gap:8px;position:relative;z-index:30;
  .close{width:34px;height:34px;border:0;border-radius:10px;display:grid;place-items:center;background:#fff;color:#514a45;box-shadow:0 5px 14px rgba(0,0,0,.09);cursor:pointer}
  .close:hover{background:#f4f0ed;color:#27211d}
  .close svg{width:16px;height:16px}
`;
const TourPicker = styled.div`
  position:relative;
`;
const TourTrigger = styled.button`
  min-height:34px;padding:0 10px;border:1px solid #e1d9d3;border-radius:10px;display:inline-flex;align-items:center;gap:7px;background:#fff;color:#423b36;font-size:10px;font-weight:850;box-shadow:0 4px 12px rgba(41,34,30,.06);cursor:pointer;
  svg{width:14px;height:14px}.open{transform:rotate(180deg)}
  svg:last-child{transition:transform 180ms ease}
  &:hover{border-color:#cfc3bb;background:#fbf9f8}
  &:disabled{opacity:.48;cursor:not-allowed}
`;
const TourMenu = styled.div`
  position:absolute;top:calc(100% + 8px);right:0;z-index:50;width:min(360px,calc(100vw - 48px));max-height:min(520px,calc(100vh - 150px));overflow:auto;padding:10px;border:1px solid #e4ddd8;border-radius:16px;background:rgba(255,255,255,.98);box-shadow:0 22px 55px rgba(35,28,24,.2);backdrop-filter:blur(16px);animation:tour-menu-in 180ms cubic-bezier(.22,1,.36,1);
  @keyframes tour-menu-in{from{opacity:0;transform:translateY(-6px) scale(.985)}to{opacity:1;transform:none}}
  .tour-menu-title{display:grid;gap:3px;padding:4px 5px 9px}.tour-menu-title b{color:#302925;font-size:12px}.tour-menu-title span{color:#81766f;font-size:9px;line-height:1.45}
  .tour-options{display:grid;gap:5px}.tour-error{margin-top:8px;padding:8px 9px;border-radius:9px;background:#fff1f2;color:#9f1239;font-size:9px;line-height:1.4}
  @media(max-width:640px){position:fixed;left:18px;right:18px;top:78px;width:auto;max-height:calc(100vh - 175px)}
`;
const TourOption = styled.button`
  width:100%;min-height:52px;padding:9px 10px;border:1px solid transparent;border-radius:11px;display:flex;align-items:center;justify-content:space-between;gap:10px;text-align:left;background:#f8f6f4;color:#39312c;cursor:pointer;
  .option-copy{display:grid;gap:2px;min-width:0}.option-copy b{font-size:10.5px}.option-copy small{color:#867a72;font-size:8.5px;line-height:1.35}.arrow{flex:0 0 auto;color:#9b8e85;font-size:20px;line-height:1}.spin{width:15px;height:15px;animation:tour-spin .8s linear infinite}
  &:hover{border-color:#ded4cd;background:#fff}.tour-options &:focus-visible{outline:2px solid #27211d;outline-offset:2px}&:disabled{opacity:.58;cursor:wait}
  @keyframes tour-spin{to{transform:rotate(360deg)}}
`;
