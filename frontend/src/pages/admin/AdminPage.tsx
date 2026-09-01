import { ChangeEvent, lazy, Suspense, useRef, useState } from 'react';
import {
  ExternalLink,
  HelpCircle,
  LayoutGrid,
  LogOut,
  Menu,
  ReceiptText,
  Search as SearchIcon,
  Settings2,
  ShoppingBag,
  Users,
} from 'lucide-react';
import { adminMockEmployees, adminMockSettings } from './data';
import { useAppDialog } from '../../components/AppDialog/context';
import { createPersistentImageDataUrl } from '../../utils/persistentImage';
import imageEnhancementService from '../../Services/imageEnhancementService';
import { createRestaurantMonogram } from '../../utils/restaurantMonogram';
import { EmployeeDrawer } from './components/EmployeeDrawer';
import { EmployeeList } from './components/EmployeeList';
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

const DECISION_PROGRESS_MS = 1200;
const RESULT_MODAL_MS = 1400;
const ProductDrawer = lazy(() =>
  import('./components/ProductDrawer').then((module) => ({ default: module.ProductDrawer })),
);

type PendingNavigation =
  { kind: 'area'; area: AdminSection } | { kind: 'section'; section: SettingsSection };

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
  const [mobile, setMobile] = useState(false);
  const [settingsSearch, setSettingsSearch] = useState('');
  const { unreadIssues: unreadEmployeeIssues, clearUnreadIssues: clearUnreadEmployeeIssues } =
    useAdminUnreadIssues(area === 'help');
  const [editing, setEditing] = useState<Employee | null | undefined>();
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null | undefined>();
  const [settingsDirty, setSettingsDirty] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<PendingNavigation | null>(null);
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
      setMobile(false);
      return;
    }
    const navigation: PendingNavigation = { kind: 'area', area: nextArea };
    if (!settingsDirty) {
      applyPendingNavigation(navigation);
      return;
    }
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
    setUnsavedDialogPhase('choice');
  };

  const saveBeforeNavigation = async () => {
    if (!pendingNavigation || unsavedDialogPhase !== 'choice') return;
    setUnsavedDialogPhase('saving');
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
    await wait(DECISION_PROGRESS_MS);
    setSettings(lastSavedSettings);
    setSettingsDirty(false);
    await finishPendingNavigation('discarded');
  };
  return (
    <S.Root $primary={settings.primaryColor} $settings={area === 'settings'}>
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
      <S.MainSidebar $open={mobile}>
        <S.Brand>
          <span>{createRestaurantMonogram(settings.restaurantName)}</span>
          <b>{settings.restaurantName}</b>
          <small>PAINEL ADMINISTRATIVO</small>
        </S.Brand>
        <S.MainNav>
          <button
            className={area === 'overview' ? 'active' : ''}
            onClick={() => void changeArea('overview')}
          >
            <LayoutGrid />
            Visão geral
          </button>
          <button
            className={area === 'orders' ? 'active' : ''}
            onClick={() => void changeArea('orders')}
          >
            <ShoppingBag />
            Pedidos
          </button>
          <button
            className={area === 'catalog' ? 'active' : ''}
            onClick={() => void changeArea('catalog')}
          >
            <Menu />
            Cardápio
          </button>
          <button
            className={area === 'customers' ? 'active' : ''}
            onClick={() => void changeArea('customers')}
          >
            <Users />
            Clientes
          </button>
          <button
            className={area === 'employees' ? 'active employees' : 'employees'}
            onClick={() => void changeArea('employees')}
          >
            <Users />
            Funcionários
          </button>
          <button
            className={area === 'subscriptions' ? 'active' : ''}
            onClick={() => void changeArea('subscriptions')}
          >
            <ReceiptText />
            Cobranças e assinaturas
          </button>
          <button
            className={area === 'settings' ? 'active' : ''}
            onClick={() => void changeArea('settings')}
          >
            <Settings2 />
            Configurações
          </button>
        </S.MainNav>
        <S.SideFooter>
          <button
            className={area === 'help' ? 'active' : ''}
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
          <button onClick={onLogout}>
            <LogOut />
            Sair
          </button>
        </S.SideFooter>
      </S.MainSidebar>
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
          <S.MobileMenu aria-label="Abrir menu administrativo" onClick={() => setMobile(true)}>
            <Menu />
          </S.MobileMenu>
          <div>
            <small>PAINEL &nbsp;/&nbsp; {area.toUpperCase()}</small>
            <h1>{title}</h1>
            <p>
              {area === 'employees'
                ? 'Somente o administrador cria e edita funcionários.'
                : area === 'subscriptions'
                  ? 'Troque seu plano e acompanhe o pagamento das mensalidades.'
                  : area === 'settings'
                    ? 'Personalize e gerencie as informações do restaurante.'
                    : 'Acompanhe e gerencie a operação em um só lugar.'}
            </p>
          </div>
          <S.TopActions>
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
        <S.Content>
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
                await onCreateIngredient?.(ingredient);
              }}
              onUpdateIngredient={async (ingredient) => {
                await onUpdateIngredient?.(ingredient);
              }}
              onDeleteIngredient={async (id) => {
                await onDeleteIngredient?.(id);
              }}
            />
          )}
        </S.Content>
      </S.Main>
      {pendingNavigation && (
        <UnsavedSettingsDialog
          phase={unsavedDialogPhase}
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
      {mobile && (
        <div
          onClick={() => setMobile(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 55,
            background: '#0005',
          }}
        />
      )}
    </S.Root>
  );
}
