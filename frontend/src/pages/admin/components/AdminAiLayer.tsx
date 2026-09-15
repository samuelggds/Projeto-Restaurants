import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { X } from 'lucide-react';
import aiGuideService, { type AiCreditBalance, type AiTourGuide } from '../../../Services/aiGuideService';
import restaurantSettingsService from '../../../Services/restaurantSettingsService';
import { useAuth } from '../../../contexts/authContext';
import { createRestaurantMonogram } from '../../../utils/restaurantMonogram';
import { ChatGptLogo } from '../../../components/ChatGptLogo';
import { AiCreditCard } from './AiCreditCard';
import { AiGuideAssistant } from './AiGuideAssistant';
import { AiGuidedTour } from './AiGuidedTour';

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
  const [credits, setCredits] = useState<AiCreditBalance | null>(null);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [guide, setGuide] = useState<AiTourGuide | null>(null);
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
    aiGuideService.getCredits().then((balance) => {
      if (active) setCredits(balance);
    }).catch(() => { if (active) setCredits(null); });
    return () => { active = false; };
  }, []);

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
      if (footer && !creditsPortalNode) {
        creditsPortalNode = document.createElement('div');
        creditsPortalNode.dataset.aiCreditsPortal = 'true';
        footer.insertBefore(creditsPortalNode, helpButton || footer.firstChild);
        setSidebarPortal(creditsPortalNode);
      }
      const settingsButton = findButtonByLabel('Configurações');
      const navigation = settingsButton?.parentElement;
      if (navigation && settingsButton && !launcherPortalNode) {
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
  }, [navigate, resolvedRestaurantSlug, userInitials, userName]);

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

  const launcher = (
    <AssistantLauncher type="button" data-tour="ai-assistant" aria-label="Abrir guia inteligente do GastroNexa" aria-expanded={assistantOpen} onClick={() => setAssistantOpen((current) => !current)}>
      <ChatGptLogo /><span>Guia com IA</span>
    </AssistantLauncher>
  );

  return (
    <>
      {children}
      {sidebarPortal && createPortal(<AiCreditCard balance={credits} />, sidebarPortal)}
      {assistantLauncherPortal && createPortal(launcher, assistantLauncherPortal)}
      <MobileAssistantLauncher type="button" aria-label="Abrir guia inteligente do GastroNexa" aria-expanded={assistantOpen} onClick={() => setAssistantOpen((current) => !current)}><ChatGptLogo /></MobileAssistantLauncher>
      {assistantOpen && (
        <AssistantPanel role="dialog" aria-label="Guia inteligente do GastroNexa">
          <button className="close" type="button" aria-label="Fechar guia inteligente" onClick={() => setAssistantOpen(false)}><X /></button>
          <AiGuideAssistant disabled={credits?.exhausted === true} onGuideReady={(nextGuide) => { setGuide(nextGuide); setAssistantOpen(false); }} onCreditsChanged={setCredits} />
        </AssistantPanel>
      )}
      <AiGuidedTour key={guide ? `${guide.title}:${guide.summary}` : 'no-guide'} guide={guide} onClose={() => setGuide(null)} onNavigate={navigateForTour} />
    </>
  );
}

const AssistantLauncher = styled.button`
  cursor:pointer;&[aria-expanded='true']{color:#fff;background:rgba(255,255,255,.06)}svg{width:17px;height:17px}@media(max-width:820px){display:none}
`;
const MobileAssistantLauncher = styled.button`
  display:none;@media(max-width:820px){position:fixed;left:14px;bottom:82px;z-index:9200;width:46px;height:46px;padding:0;border:0;border-radius:999px;display:flex;align-items:center;justify-content:center;color:#fff;background:#17191a;box-shadow:0 12px 26px rgba(17,24,39,.2);cursor:pointer;svg{width:19px;height:19px}}
`;
const AssistantPanel = styled.div`
  position:fixed;left:248px;bottom:22px;z-index:9300;width:min(520px,calc(100vw - 32px));max-height:min(680px,calc(100vh - 110px));overflow:auto;padding:10px;border-radius:22px;background:#f7f4f2;box-shadow:0 24px 58px rgba(24,18,14,.24);border:1px solid rgba(64,49,40,.12);.close{position:sticky;top:4px;margin-left:auto;margin-bottom:-34px;z-index:2;width:32px;height:32px;border:0;border-radius:10px;display:grid;place-items:center;background:#fff;color:#514a45;box-shadow:0 5px 14px rgba(0,0,0,.09);cursor:pointer}.close svg{width:16px}@media(max-width:820px){left:16px;bottom:136px}
`;
