import { ChangeEvent, lazy, Suspense, useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  HelpCircle,
  LayoutGrid,
  LogOut,
  Menu,
  MoreHorizontal,
  Plus,
  ReceiptText,
  Search as SearchIcon,
  Settings2,
  ShoppingBag,
  Upload,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { adminMockEmployees, adminMockSettings } from './data';
import { useAppDialog } from '../../components/AppDialog/context';
import { createPersistentImageDataUrl } from '../../utils/persistentImage';
import imageEnhancementService from '../../Services/imageEnhancementService';
import { createRestaurantMonogram } from '../../utils/restaurantMonogram';
import { EmployeeDrawer } from './components/EmployeeDrawer';
import { BrandSettings } from './components/BrandSettings';
import { AdminSettingsContent } from './components/AdminSettingsContent';
import { AdminManagement } from './components/AdminManagement';
import { MonthlyBilling } from './components/MonthlyBilling';
import { HelpCenter } from './components/HelpCenter';
import { sectionTitle, settingGroups, settingItems } from './config/adminNavigation';
import * as S from './Admin.styles';
import type {
  AdminPageProps,
  AdminSection,
  AdminProduct,
  Employee,
  EmployeeFormPayload,
  SettingsSection,
} from './types';
import { validateBusinessSettings } from './domain/businessSettingsValidation';
import { validateEstablishmentAddress } from './domain/establishmentAddress';
import { validateBusinessHours } from './domain/businessHours';
import { validateBrandSettings } from './domain/brandSettingsValidation';
import { validateOrderFlowSettings } from './domain/orderFlowSettingsValidation';
import { validateTableAccountSettings } from './domain/tableAccountSettingsValidation';
import { useAdminUnreadIssues } from './hooks/useAdminUnreadIssues';
import {
  UnsavedSettingsDialog,
  type UnsavedSettingsDialogPhase,
} from './components/UnsavedSettingsDialog';
import type { ProductDrawerHandle } from './components/ProductDrawer';

const DECISION_PROGRESS_MS = 1200;
const RESULT_MODAL_MS = 1400;
const ProductDrawer = lazy(() =>
  import('./components/ProductDrawer').then((module) => ({ default: module.ProductDrawer })),
);
const EmployeeList = lazy(() =>
  import('./components/EmployeeList').then((module) => ({ default: module.EmployeeList })),
);

type PendingNavigation =
  { kind: 'area'; area: AdminSection } | { kind: 'section'; section: SettingsSection };
type PendingChangesSource = 'settings' | 'product';

type AdminNavigationItem = {
  area: AdminSection;
  label: string;
  mobileLabel: string;
  icon: LucideIcon;
};

const operationNavigationItems: AdminNavigationItem[] = [
  {
    area: 'overview',
    label: 'Visão geral',
    mobileLabel: 'Início',
    icon: LayoutGrid,
  },
  {
    area: 'orders',
    label: 'Pedidos',
    mobileLabel: 'Pedidos',
    icon: ShoppingBag,
  },
  {
    area: 'catalog',
    label: 'Cardápio',
    mobileLabel: 'Cardápio',
    icon: Menu,
  },
  {
    area: 'customers',
    label: 'Clientes',
    mobileLabel: 'Clientes',
    icon: Users,
  },
];

const managementNavigationItems: AdminNavigationItem[] = [
  {
    area: 'employees',
    label: 'Funcionários',
    mobileLabel: 'Equipe',
    icon: Users,
  },
  {
    area: 'subscriptions',
    label: 'Cobranças e assinaturas',
    mobileLabel: 'Cobranças',
    icon: ReceiptText,
  },
  {
    area: 'settings',
    label: 'Configurações',
    mobileLabel: 'Ajustes',
    icon: Settings2,
  },
];

const mobilePrimaryNavigationItems = operationNavigationItems.slice(0, 4);

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

function hasBusinessIdentityInput(settings: typeof adminMockSettings) {
  return [
    settings.companyLegalName,
    settings.companyDocument,
    settings.businessPhone,
    settings.businessEmail,
  ].some((value) => value.trim().length > 0);
}

function hasEstablishmentAddressInput(settings: typeof adminMockSettings) {
  return [
    settings.businessZipCode,
    settings.businessAddress,
    settings.businessAddressNumber,
    settings.businessAddressComplement,
    settings.businessAddressDistrict,
    settings.businessCity,
    settings.businessState,
  ].some((value) => value.trim().length > 0);
}

export function AdminPage({
  initialSettings = adminMockSettings,
  initialEmployees = adminMockEmployees,
  initialOrders = [],
  initialProducts = [],
  initialCategories = [],
  initialIngredients = [],
  initialCoupons = [],
  promotionsLoading = false,
  promotionsError = '',
  onUpdateOrderStatus,
  onConfirmOrderPayment,
  onCancelOrder,
  onSaveProduct,
  onDeleteProduct,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
  onCreateIngredient,
  onUpdateIngredient,
  onDeleteIngredient,
  onReloadCatalog,
  onApplyProductDiscount,
  onDeleteProductDiscount,
  onCreateCoupon,
  onUpdateCoupon,
  onDeleteCoupon,
  onReloadPromotions,
  onOpenSettings,
  onSaveSettings,
  onConnectMercadoPago,
  onConnectPagBank,
  onOnboardAsaas,
  onCreateEmployee,
  onUpdateEmployee,
  onDeactivateEmployee,
  onReactivateEmployee,
  onViewStore,
  onReportSupport,
  onLogout,
}: AdminPageProps) {
  const { confirmDialog } = useAppDialog();
  const oauthParams = new URLSearchParams(window.location.search);
  const mercadoPagoOAuthStatus = oauthParams.get('mp_oauth');
  const pagBankOAuthStatus = oauthParams.get('pagbank_oauth');
  const paymentOAuthStatus = mercadoPagoOAuthStatus || pagBankOAuthStatus;
  const requestedSettingsSection = oauthParams.get('settings');
  const initialSettingsSection = settingItems.some(([id]) => id === requestedSettingsSection)
    ? (requestedSettingsSection as SettingsSection)
    : 'brand';
  const [area, setArea] = useState<AdminSection>(
    paymentOAuthStatus || requestedSettingsSection ? 'settings' : 'overview',
  );
  const [section, setSection] = useState<SettingsSection>(
    paymentOAuthStatus ? 'payments' : initialSettingsSection,
  );
  const [settings, setSettings] = useState(initialSettings);
  const [settingsSource, setSettingsSource] = useState(initialSettings);
  const [lastSavedSettings, setLastSavedSettings] = useState(initialSettings);
  const [employees, setEmployees] = useState(initialEmployees);
  const [employeesSource, setEmployeesSource] = useState(initialEmployees);
  const orders = initialOrders;
  const products = initialProducts;
  const categories = initialCategories;
  const ingredients = initialIngredients;
  const coupons = initialCoupons;
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobile, setMobile] = useState(false);
  const [settingsSearch, setSettingsSearch] = useState('');
  const { unreadIssues: unreadEmployeeIssues, clearUnreadIssues: clearUnreadEmployeeIssues } =
    useAdminUnreadIssues(area === 'help');
  const [editing, setEditing] = useState<Employee | null | undefined>();
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null | undefined>();
  const [catalogImportOpen, setCatalogImportOpen] = useState(false);
  const [settingsDirty, setSettingsDirty] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<PendingNavigation | null>(null);
  const [pendingChangesSource, setPendingChangesSource] =
    useState<PendingChangesSource>('settings');
  const [unsavedDialogPhase, setUnsavedDialogPhase] =
    useState<UnsavedSettingsDialogPhase>('choice');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isEnhancingCover, setIsEnhancingCover] = useState(false);
  const [enhancingBannerLocalId, setEnhancingBannerLocalId] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState(
    paymentOAuthStatus === 'error'
      ? oauthParams.get('message') || 'Não foi possível conectar ao Mercado Pago.'
      : '',
  );
  const logoInput = useRef<HTMLInputElement>(null);
  const productDrawerRef = useRef<ProductDrawerHandle>(null);

  useEffect(() => {
    if (!mobile) return undefined;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobile(false);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [mobile]);

  const markSettingsChanged = () => {
    setSettingsDirty(true);
  };

  if (settingsSource !== initialSettings) {
    setSettingsSource(initialSettings);
    setSettings(initialSettings);
    setLastSavedSettings(initialSettings);
    setSettingsDirty(false);
  }
  if (employeesSource !== initialEmployees) {
    setEmployeesSource(initialEmployees);
    setEmployees(initialEmployees);
  }
  const areaTitles: Record<Exclude<AdminSection, 'settings' | 'help'>, string> = {
    overview: 'Visão geral',
    orders: 'Pedidos',
    catalog: 'Cardápio',
    customers: 'Clientes',
    subscriptions: 'Cobranças e assinaturas',
    employees: 'Funcionários',
  };
  const title =
    area === 'settings'
      ? sectionTitle[section]
      : area === 'help'
        ? 'Central de ajuda'
        : area === 'catalog' && catalogImportOpen
          ? 'Importar cardápio'
          : areaTitles[area];
  const visibleSettingGroups = settingGroups
    .map((group) => ({
      ...group,
      items: group.items.filter(([, label]) =>
        label.toLocaleLowerCase('pt-BR').includes(settingsSearch.trim().toLocaleLowerCase('pt-BR')),
      ),
    }))
    .filter((group) => group.items.length > 0);
  const update = <K extends keyof typeof settings>(key: K, value: (typeof settings)[K]) => {
    markSettingsChanged();
    setSettings((current) => ({ ...current, [key]: value }));
  };
  const logo = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFeedbackError('');
    try {
      const persistentImage = await createPersistentImageDataUrl(file, 1600);
      update('logoUrl', persistentImage);
    } catch (error) {
      setFeedbackError(
        error instanceof Error ? error.message : 'Não foi possível processar a imagem.',
      );
    } finally {
      event.target.value = '';
    }
  };
  const cover = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFeedbackError('');
    try {
      update(
        'coverImageUrl',
        await createPersistentImageDataUrl(file, 1920, {
          upscale: true,
          targetWidth: 1920,
          targetHeight: 1080,
        }),
      );
    } catch (error) {
      setFeedbackError(
        error instanceof Error ? error.message : 'Não foi possível processar a imagem.',
      );
    } finally {
      event.target.value = '';
    }
  };
  const enhanceCover = async () => {
    if (!settings.coverImageUrl || isEnhancingCover) return;
    setFeedbackError('');
    setIsEnhancingCover(true);
    try {
      const enhanced = await imageEnhancementService.enhanceRestaurantImage(settings.coverImageUrl);
      if (!enhanced) throw new Error('A IA não retornou uma imagem.');
      const response = await fetch(enhanced);
      const blob = await response.blob();
      const file = new File([blob], 'capa-melhorada.png', { type: blob.type || 'image/png' });
      const processedImage = await createPersistentImageDataUrl(file, 1440, {
        upscale: true,
        targetWidth: 1440,
        targetHeight: 1440,
      });
      const updatedSettings = { ...settings, coverImageUrl: processedImage };
      setSettings(updatedSettings);
      await onSaveSettings?.(updatedSettings);
      setLastSavedSettings(updatedSettings);
      setSettingsDirty(false);
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { error?: string } } };
      setFeedbackError(
        apiError.response?.data?.error ||
          (error instanceof Error ? error.message : 'Não foi possível melhorar a imagem com IA.'),
      );
    } finally {
      setIsEnhancingCover(false);
    }
  };
  const processBannerImage = (file: File) =>
    createPersistentImageDataUrl(file, 1440, {
      upscale: true,
      targetWidth: 1440,
      targetHeight: 560,
      maximumDataUrlLength: 420_000,
    });

  const updateBannerImage = (localId: string, image: string) => {
    markSettingsChanged();
    setSettings((current) => ({
      ...current,
      promotionalBanners: current.promotionalBanners.map((banner) =>
        banner.localId === localId ? { ...banner, image } : banner,
      ),
    }));
  };

  const banner = async (localId: string, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFeedbackError('');
    try {
      updateBannerImage(localId, await processBannerImage(file));
    } catch (error) {
      setFeedbackError(
        error instanceof Error ? error.message : 'Não foi possível processar a imagem.',
      );
    } finally {
      event.target.value = '';
    }
  };

  const enhanceBanner = async (localId: string) => {
    if (enhancingBannerLocalId) return;
    const selectedBanner = settings.promotionalBanners.find((banner) => banner.localId === localId);
    if (!selectedBanner?.image) return;

    setFeedbackError('');
    setEnhancingBannerLocalId(localId);
    try {
      const enhanced = await imageEnhancementService.enhanceBannerImage(selectedBanner.image);
      if (!enhanced) throw new Error('A IA não retornou uma imagem para o banner.');
      const response = await fetch(enhanced);
      const blob = await response.blob();
      const file = new File([blob], 'banner-melhorado.png', {
        type: blob.type || 'image/png',
      });
      updateBannerImage(localId, await processBannerImage(file));
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { error?: string } } };
      setFeedbackError(
        apiError.response?.data?.error ||
          (error instanceof Error ? error.message : 'Não foi possível melhorar o banner com IA.'),
      );
    } finally {
      setEnhancingBannerLocalId(null);
    }
  };
  const save = async (): Promise<boolean> => {
    if (isSavingSettings) return false;
    setFeedbackError('');
    if (Object.keys(validateBrandSettings(settings)).length > 0) {
      setArea('settings');
      setSection('brand');
      setFeedbackError('Revise os dados de marca e identidade destacados antes de salvar.');
      return false;
    }
    if (
      hasBusinessIdentityInput(settings) &&
      Object.keys(validateBusinessSettings(settings)).length > 0
    ) {
      setArea('settings');
      setSection('business');
      setFeedbackError('Revise os dados do negócio destacados antes de salvar.');
      return false;
    }
    if (
      hasEstablishmentAddressInput(settings) &&
      Object.keys(validateEstablishmentAddress(settings)).length > 0
    ) {
      setArea('settings');
      setSection('address');
      setFeedbackError('Revise os dados do endereço destacados antes de salvar.');
      return false;
    }
    if (
      settings.businessHoursConfigured &&
      Object.keys(validateBusinessHours(settings.businessHours)).length > 0
    ) {
      setArea('settings');
      setSection('hours');
      setFeedbackError('Revise os horários destacados antes de salvar.');
      return false;
    }
    if (Object.keys(validateOrderFlowSettings(settings)).length > 0) {
      setArea('settings');
      setSection('orders');
      setFeedbackError('Revise os prazos e limites de pedidos destacados antes de salvar.');
      return false;
    }
    if (Object.keys(validateTableAccountSettings(settings.tableAccount)).length > 0) {
      setArea('settings');
      setSection('table-account');
      setFeedbackError('Revise as regras da conta e pagamento da mesa antes de salvar.');
      return false;
    }
    setIsSavingSettings(true);
    try {
      if (!onSaveSettings) throw new Error('O salvamento das configurações não está disponível.');
      await onSaveSettings(settings);
      const persistedSettings = {
        ...settings,
        stripeSecretKey: '',
        stripeSecretKeyConfigured:
          settings.stripeSecretKeyConfigured || Boolean(settings.stripeSecretKey),
        stripeWebhookSecret: '',
        stripeWebhookSecretConfigured:
          settings.stripeWebhookSecretConfigured || Boolean(settings.stripeWebhookSecret),
        mercadoPagoAccessToken: '',
        mercadoPagoAccessTokenConfigured:
          settings.mercadoPagoAccessTokenConfigured || Boolean(settings.mercadoPagoAccessToken),
        asaasAccessToken: '',
        asaasAccessTokenConfigured:
          settings.asaasAccessTokenConfigured || Boolean(settings.asaasAccessToken),
        pagbankToken: '',
        pagbankTokenConfigured: settings.pagbankTokenConfigured || Boolean(settings.pagbankToken),
      };
      setLastSavedSettings(persistedSettings);
      setSettings(persistedSettings);
      setSettingsDirty(false);
      return true;
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { error?: string; message?: string } } };
      setFeedbackError(
        apiError.response?.data?.error ||
          apiError.response?.data?.message ||
          (error instanceof Error ? error.message : '') ||
          'Não foi possível salvar. Confira sua conexão e tente novamente.',
      );
      return false;
    } finally {
      setIsSavingSettings(false);
    }
  };
  const saveEmployee = async (employee: EmployeeFormPayload, id?: string) => {
    setFeedbackError('');
    try {
      if (id) {
        const full = { ...employee, id };
        const savedEmployee = (await onUpdateEmployee?.(full)) ?? full;
        setEmployees((x) => x.map((item) => (item.id === id ? savedEmployee : item)));
      } else {
        const createdEmployee = await onCreateEmployee?.(employee);
        if (createdEmployee) {
          setEmployees((x) => [...x, createdEmployee]);
        }
      }
      setEditing(undefined);
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { error?: string; message?: string } } };
      setFeedbackError(
        apiError.response?.data?.error ||
          apiError.response?.data?.message ||
          (error instanceof Error ? error.message : '') ||
          'Não foi possível salvar o funcionário. Tente novamente.',
      );
    }
  };

  const applyPendingNavigation = (navigation: PendingNavigation) => {
    if (navigation.kind === 'section') {
      setSection(navigation.section);
      return;
    }
    if (navigation.area === 'settings' && onOpenSettings) onOpenSettings();
    else setArea(navigation.area);
    if (navigation.area === 'help') clearUnreadEmployeeIssues();
    setMobile(false);
  };

  const changeArea = (nextArea: AdminSection) => {
    if (nextArea === area) {
      if (nextArea === 'catalog') setCatalogImportOpen(false);
      setMobile(false);
      return;
    }
    const navigation: PendingNavigation = { kind: 'area', area: nextArea };
    if (editingProduct !== undefined) {
      if (productDrawerRef.current?.hasUnsavedChanges()) {
        setPendingChangesSource('product');
        setUnsavedDialogPhase('choice');
        setPendingNavigation(navigation);
        return;
      }
      setEditingProduct(undefined);
      applyPendingNavigation(navigation);
      return;
    }
    if (!settingsDirty) {
      applyPendingNavigation(navigation);
      return;
    }
    setPendingChangesSource('settings');
    setUnsavedDialogPhase('choice');
    setPendingNavigation(navigation);
  };

  const changeSettingsSection = (nextSection: SettingsSection) => {
    if (nextSection === section) return;
    const navigation: PendingNavigation = { kind: 'section', section: nextSection };
    if (!settingsDirty) {
      applyPendingNavigation(navigation);
      return;
    }
    setPendingChangesSource('settings');
    setUnsavedDialogPhase('choice');
    setPendingNavigation(navigation);
  };

  const finishPendingNavigation = async (result: 'saved' | 'discarded') => {
    const navigation = pendingNavigation;
    if (!navigation) return;
    setUnsavedDialogPhase(result);
    await wait(RESULT_MODAL_MS);
    applyPendingNavigation(navigation);
    setPendingNavigation(null);
    setPendingChangesSource('settings');
    setUnsavedDialogPhase('choice');
  };

  const saveBeforeNavigation = async () => {
    if (!pendingNavigation || unsavedDialogPhase !== 'choice') return;
    setUnsavedDialogPhase('saving');
    if (pendingChangesSource === 'product') {
      const productDrawer = productDrawerRef.current;
      const [savedSuccessfully] = await Promise.all([
        productDrawer?.save() ?? Promise.resolve(false),
        wait(DECISION_PROGRESS_MS),
      ]);
      if (!savedSuccessfully) {
        setPendingNavigation(null);
        setPendingChangesSource('settings');
        setUnsavedDialogPhase('choice');
        return;
      }
      await finishPendingNavigation('saved');
      return;
    }
    const [savedSuccessfully] = await Promise.all([save(), wait(DECISION_PROGRESS_MS)]);
    if (!savedSuccessfully) {
      setPendingNavigation(null);
      setUnsavedDialogPhase('choice');
      return;
    }
    await finishPendingNavigation('saved');
  };

  const discardBeforeNavigation = async () => {
    if (!pendingNavigation || unsavedDialogPhase !== 'choice') return;
    setUnsavedDialogPhase('discarding');
    const productDrawer = pendingChangesSource === 'product' ? productDrawerRef.current : null;
    await wait(DECISION_PROGRESS_MS);
    if (pendingChangesSource === 'product') {
      if (productDrawer) productDrawer.discard();
      else setEditingProduct(undefined);
      await finishPendingNavigation('discarded');
      return;
    }
    setSettings(lastSavedSettings);
    setSettingsDirty(false);
    await finishPendingNavigation('discarded');
  };
  return (
    <S.Root
      data-admin-root
      $primary={settings.primaryColor}
      $settings={area === 'settings'}
      $sidebarOpen={sidebarOpen}
    >
      {feedbackError && (
        <div
          role="alert"
          style={{
            position: 'fixed',
            right: 24,
            top: 24,
            zIndex: 1000,
            maxWidth: 420,
            borderRadius: 10,
            background: '#991b1b',
            color: 'white',
            padding: '12px 16px',
            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.2)',
          }}
        >
          {feedbackError}
        </div>
      )}
      {sidebarOpen && (
        <S.MainSidebar aria-label="Menu administrativo">
          <S.CollapseButton
            type="button"
            aria-label="Recolher menu lateral"
            onClick={() => setSidebarOpen(false)}
          >
            <ChevronLeft />
          </S.CollapseButton>
          <S.Brand>
            <span>{createRestaurantMonogram(settings.restaurantName)}</span>
            <b>{settings.restaurantName}</b>
            <small>Painel administrativo</small>
          </S.Brand>
          <S.MainNav aria-label="Navegação principal do painel">
            {[...operationNavigationItems, ...managementNavigationItems].map((item) => {
              const Icon = item.icon;
              const active = area === item.area;
              return (
                <button
                  key={item.area}
                  type="button"
                  className={active ? 'active' : ''}
                  aria-label={item.label}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => void changeArea(item.area)}
                >
                  <Icon />
                  {item.label}
                </button>
              );
            })}
          </S.MainNav>
          <S.SideFooter>
            <button
              className={area === 'help' ? 'active' : ''}
              aria-label="Central de ajuda"
              aria-current={area === 'help' ? 'page' : undefined}
              onClick={() => void changeArea('help')}
            >
              <HelpCircle />
              Central de ajuda
              {unreadEmployeeIssues > 0 && (
                <span className="unread-badge">
                  {unreadEmployeeIssues > 99 ? '99+' : unreadEmployeeIssues}
                </span>
              )}
            </button>
            <S.SidebarUser>
              <span className="avatar">{createRestaurantMonogram(settings.restaurantName)}</span>
              <span>
                <b>Administrador</b>
                <small>Gestão da loja</small>
              </span>
              <button type="button" aria-label="Sair" onClick={onLogout}>
                <LogOut />
              </button>
            </S.SidebarUser>
          </S.SideFooter>
        </S.MainSidebar>
      )}
      {!sidebarOpen && (
        <S.SidebarOpenButton
          type="button"
          aria-label="Expandir menu lateral"
          onClick={() => setSidebarOpen(true)}
        >
          <ChevronRight />
        </S.SidebarOpenButton>
      )}
      <S.SettingsSidebar $visible={area === 'settings'}>
        <S.Search>
          <SearchIcon />
          <input
            aria-label="Buscar configuração"
            placeholder="Buscar configuração"
            value={settingsSearch}
            onChange={(event) => setSettingsSearch(event.target.value)}
          />
        </S.Search>
        <S.SettingsNav>
          {visibleSettingGroups.map((group) => (
            <div className="settings-group" key={group.id}>
              <small>{group.label}</small>
              {group.items.map(([id, label, Icon]) => (
                <button
                  key={id}
                  className={section === id ? 'active' : ''}
                  onClick={() => void changeSettingsSection(id)}
                >
                  <Icon />
                  {label}
                </button>
              ))}
            </div>
          ))}
          {!visibleSettingGroups.length && (
            <span className="settings-empty">Nenhuma configuração encontrada.</span>
          )}
        </S.SettingsNav>
      </S.SettingsSidebar>
      <S.Main>
        <S.Top>
          <div>
            <small>
              PAINEL &nbsp;/&nbsp;{' '}
              {area === 'customers' || area === 'employees'
                ? title.toLocaleUpperCase('pt-BR')
                : area.toUpperCase()}
            </small>
            <h1>{title}</h1>
            <p>
              {area === 'employees'
                ? 'Somente o administrador cria e edita funcionários.'
                : area === 'subscriptions'
                  ? 'Troque seu plano e acompanhe o pagamento das mensalidades.'
                  : area === 'settings'
                    ? 'Personalize e gerencie as informações do restaurante.'
                    : area === 'catalog' && catalogImportOpen
                      ? 'Use um link público do iFood ou uma foto nítida do seu cardápio.'
                      : area === 'catalog'
                        ? 'Gerencie seus produtos, ingredientes e categorias.'
                        : 'Acompanhe e gerencie a operação em um só lugar.'}
            </p>
          </div>
          <S.TopActions>
            {area === 'catalog' && !catalogImportOpen && (
              <>
                <button
                  className="preview"
                  type="button"
                  onClick={() => setCatalogImportOpen(true)}
                >
                  <Upload /> Importar cardápio
                </button>
                <button className="save" type="button" onClick={() => setEditingProduct(null)}>
                  <Plus /> Novo produto
                </button>
              </>
            )}
            {area === 'settings' && section !== 'promotions' && (
              <button className="preview" onClick={onViewStore}>
                <ExternalLink />
                Ver loja
              </button>
            )}
          </S.TopActions>
        </S.Top>
        {area === 'settings' && (
          <S.MobileSettingsNav aria-label="Seções das configurações">
            {settingItems.map(([id, label, Icon]) => (
              <button
                key={id}
                className={section === id ? 'active' : ''}
                type="button"
                aria-current={section === id ? 'page' : undefined}
                onClick={() => void changeSettingsSection(id)}
              >
                <Icon />
                {label}
              </button>
            ))}
          </S.MobileSettingsNav>
        )}
        <S.Content
          $wide={
            area === 'catalog' ||
            area === 'overview' ||
            area === 'orders' ||
            area === 'customers' ||
            area === 'employees' ||
            area === 'subscriptions'
          }
        >
          {area === 'help' ? (
            <HelpCenter
              onReport={async (payload) => {
                if (!onReportSupport) {
                  throw new Error('O canal de suporte não está disponível agora.');
                }
                await onReportSupport(payload);
              }}
            />
          ) : area === 'employees' ? (
            <Suspense
              fallback={
                <S.Card role="status">
                  <p>Carregando equipe...</p>
                </S.Card>
              }
            >
              <EmployeeList
                employees={employees}
                onNew={() => setEditing(null)}
                onEdit={setEditing}
                onDeactivate={async (employee) => {
                  const confirmed = await confirmDialog({
                    title: 'Desativar funcionário?',
                    description: `${employee.name} perderá o acesso ao sistema até ser reativado.`,
                    confirmLabel: 'Desativar',
                    tone: 'danger',
                  });
                  if (!confirmed) return;
                  await onDeactivateEmployee?.(employee.id);
                  setEmployees((current) =>
                    current.map((item) =>
                      item.id === employee.id ? { ...item, active: false } : item,
                    ),
                  );
                }}
                onReactivate={async (employee) => {
                  const confirmed = await confirmDialog({
                    title: 'Reativar funcionário?',
                    description: `${employee.name} voltará a ter acesso ao sistema.`,
                    confirmLabel: 'Reativar',
                  });
                  if (!confirmed) return;
                  await onReactivateEmployee?.(employee.id);
                  setEmployees((current) =>
                    current.map((item) =>
                      item.id === employee.id ? { ...item, active: true } : item,
                    ),
                  );
                }}
              />
            </Suspense>
          ) : area === 'subscriptions' ? (
            <MonthlyBilling />
          ) : area === 'settings' ? (
            section === 'brand' ? (
              <BrandSettings
                settings={settings}
                update={update}
                logoInput={logoInput}
                onLogoChange={logo}
                onCoverChange={cover}
                onEnhanceCover={enhanceCover}
                isEnhancingCover={isEnhancingCover}
                onBannerImageChange={banner}
                onEnhanceBanner={enhanceBanner}
                enhancingBannerLocalId={enhancingBannerLocalId}
              />
            ) : (
              <AdminSettingsContent
                section={section}
                settings={settings}
                update={update}
                employees={employees}
                products={products}
                coupons={coupons}
                promotionsLoading={promotionsLoading}
                promotionsError={promotionsError}
                onApplyProductDiscount={onApplyProductDiscount}
                onDeleteProductDiscount={onDeleteProductDiscount}
                onCreateCoupon={onCreateCoupon}
                onUpdateCoupon={onUpdateCoupon}
                onDeleteCoupon={onDeleteCoupon}
                onReloadPromotions={onReloadPromotions}
                openEmployees={() => void changeArea('employees')}
                onConnectMercadoPago={onConnectMercadoPago}
                onConnectPagBank={onConnectPagBank}
                onOnboardAsaas={onOnboardAsaas}
              />
            )
          ) : (
            <AdminManagement
              area={area}
              orders={orders}
              products={products}
              categories={categories}
              ingredients={ingredients}
              restaurantName={settings.restaurantName}
              onNavigate={(destination) => void changeArea(destination)}
              onUpdateOrderStatus={async (id, status) => {
                await onUpdateOrderStatus?.(id, status);
              }}
              onConfirmOrderPayment={async (id) => {
                await onConfirmOrderPayment?.(id);
              }}
              onCancelOrder={async (id) => {
                await onCancelOrder?.(id);
              }}
              onEditProduct={setEditingProduct}
              onDeleteProduct={async (id) => {
                await onDeleteProduct?.(id);
              }}
              onNewProduct={() => setEditingProduct(null)}
              onCreateCategory={async (name) => {
                await onCreateCategory?.(name);
              }}
              onUpdateCategory={async (id, name) => {
                await onUpdateCategory?.(id, name);
              }}
              onDeleteCategory={async (id) => {
                await onDeleteCategory?.(id);
              }}
              onCreateIngredient={async (ingredient) => {
                return onCreateIngredient?.(ingredient);
              }}
              onUpdateIngredient={async (ingredient, imageUpdate) => {
                await onUpdateIngredient?.(ingredient, imageUpdate);
              }}
              onDeleteIngredient={async (id) => {
                await onDeleteIngredient?.(id);
              }}
              catalogImportOpen={catalogImportOpen}
              onCloseCatalogImport={() => setCatalogImportOpen(false)}
              onCatalogImportComplete={async () => {
                await onReloadCatalog?.();
              }}
            />
          )}
        </S.Content>
      </S.Main>
      <S.MobileBottomNav aria-label="Navegação administrativa móvel">
        {mobilePrimaryNavigationItems.map((item) => {
          const Icon = item.icon;
          const active = area === item.area;
          return (
            <button
              key={item.area}
              type="button"
              className={active ? 'active' : ''}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
              onClick={() => void changeArea(item.area)}
            >
              <span aria-hidden="true">
                <Icon />
              </span>
              {item.mobileLabel}
            </button>
          );
        })}
        <button
          type="button"
          className={
            managementNavigationItems.some((item) => item.area === area) || area === 'help'
              ? 'active'
              : ''
          }
          aria-label="Abrir menu administrativo"
          aria-expanded={mobile}
          aria-controls="admin-mobile-menu"
          onClick={() => setMobile((current) => !current)}
        >
          <span aria-hidden="true">
            <MoreHorizontal />
            {unreadEmployeeIssues > 0 && <i />}
          </span>
          Mais
        </button>
      </S.MobileBottomNav>
      {mobile && (
        <>
          <S.MobileBackdrop
            type="button"
            aria-label="Fechar menu administrativo"
            onClick={() => setMobile(false)}
          />
          <S.MobileMoreSheet
            id="admin-mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Opções administrativas"
          >
            <header>
              <span className="avatar">{createRestaurantMonogram(settings.restaurantName)}</span>
              <span>
                <b>{settings.restaurantName}</b>
                <small>Gestão e configurações</small>
              </span>
            </header>
            {managementNavigationItems.map((item) => {
              const Icon = item.icon;
              const active = area === item.area;
              return (
                <button
                  key={item.area}
                  type="button"
                  className={active ? 'active' : ''}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => void changeArea(item.area)}
                >
                  <Icon />
                  <span>
                    <b>{item.label}</b>
                    <small>{item.mobileLabel}</small>
                  </span>
                  <ChevronRight />
                </button>
              );
            })}
            <button
              type="button"
              className={area === 'help' ? 'active' : ''}
              aria-current={area === 'help' ? 'page' : undefined}
              onClick={() => void changeArea('help')}
            >
              <HelpCircle />
              <span>
                <b>Central de ajuda</b>
                <small>Suporte e orientações</small>
              </span>
              {unreadEmployeeIssues > 0 && (
                <span className="unread-badge">
                  {unreadEmployeeIssues > 99 ? '99+' : unreadEmployeeIssues}
                </span>
              )}
            </button>
            <button type="button" className="logout" onClick={onLogout}>
              <LogOut />
              <span>
                <b>Sair da conta</b>
                <small>Encerrar sessão administrativa</small>
              </span>
            </button>
          </S.MobileMoreSheet>
        </>
      )}
      {pendingNavigation && (
        <UnsavedSettingsDialog
          phase={unsavedDialogPhase}
          subject={pendingChangesSource}
          onSave={() => void saveBeforeNavigation()}
          onDiscard={() => void discardBeforeNavigation()}
        />
      )}
      {editing !== undefined && (
        <EmployeeDrawer
          employee={editing}
          close={() => setEditing(undefined)}
          save={saveEmployee}
        />
      )}{' '}
      {editingProduct !== undefined && (
        <Suspense
          fallback={
            <S.Overlay>
              <S.Drawer as="div" role="status" aria-live="polite">
                <header>
                  <strong>Carregando editor de produto...</strong>
                </header>
              </S.Drawer>
            </S.Overlay>
          }
        >
          <ProductDrawer
            ref={productDrawerRef}
            product={editingProduct}
            categories={categories}
            ingredients={ingredients}
            createIngredient={async (ingredient) => onCreateIngredient?.(ingredient)}
            close={() => setEditingProduct(undefined)}
            save={async (product) => {
              await onSaveProduct?.(product);
              setEditingProduct(undefined);
            }}
          />
        </Suspense>
      )}
    </S.Root>
  );
}
