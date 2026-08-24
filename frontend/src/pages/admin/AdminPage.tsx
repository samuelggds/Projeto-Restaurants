import { ChangeEvent, useEffect, useRef, useState } from 'react';
import {
  ExternalLink,
  HelpCircle,
  LayoutGrid,
  LogOut,
  Menu,
  ReceiptText,
  Save,
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
import { ProductDrawer } from './components/ProductDrawer';
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
  SettingsSection,
} from './types';
import { validateBusinessSettings } from './domain/businessSettingsValidation';
import { validateEstablishmentAddress } from './domain/establishmentAddress';
import { validateBusinessHours } from './domain/businessHours';
import supportChatService from '../../Services/supportChatService';

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
  const [area, setArea] = useState<AdminSection>(paymentOAuthStatus ? 'settings' : 'overview');
  const [section, setSection] = useState<SettingsSection>(
    paymentOAuthStatus ? 'payments' : 'brand',
  );
  const [settings, setSettings] = useState(initialSettings);
  const [employees, setEmployees] = useState(initialEmployees);
  const orders = initialOrders;
  const products = initialProducts;
  const categories = initialCategories;
  const ingredients = initialIngredients;
  const coupons = initialCoupons;
  const [mobile, setMobile] = useState(false);
  const [settingsSearch, setSettingsSearch] = useState('');
  const unreadIssuesStorageKey = 'employee-issues-unread';
  const issuesLastSeenStorageKey = 'employee-issues-last-seen-id';
  const [unreadEmployeeIssues, setUnreadEmployeeIssues] = useState(() =>
    Number(sessionStorage.getItem(unreadIssuesStorageKey) || 0),
  );
  const [editing, setEditing] = useState<Employee | null | undefined>();
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null | undefined>();
  const [saved, setSaved] = useState(paymentOAuthStatus === 'success');
  const [isEnhancingCover, setIsEnhancingCover] = useState(false);
  const [feedbackError, setFeedbackError] = useState(
    paymentOAuthStatus === 'error'
      ? oauthParams.get('message') || 'Não foi possível conectar ao Mercado Pago.'
      : '',
  );
  const logoInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const markUnread = () => {
      if (area === 'help') return;
      setUnreadEmployeeIssues((current) => {
        const next = current + 1;
        sessionStorage.setItem(unreadIssuesStorageKey, String(next));
        return next;
      });
    };
    window.addEventListener('employee-issues-unread', markUnread);
    return () => window.removeEventListener('employee-issues-unread', markUnread);
  }, [area]);
  useEffect(() => {
    let active = true;
    const refreshUnreadIssues = () => {
      const lastSeenId = Number(sessionStorage.getItem(issuesLastSeenStorageKey) || 0);
      void supportChatService
        .getMessages({ limit: 100 })
        .then((result) => {
          if (!active) return;
          const pending = (result?.messages || []).filter(
            (message: { id?: string; issueStatus?: string | null }) => {
              const isActive =
                message.issueStatus === 'OPEN' || message.issueStatus === 'IN_PROGRESS';
              return isActive && Number(message.id || 0) > lastSeenId;
            },
          ).length;
          sessionStorage.setItem(unreadIssuesStorageKey, String(pending));
          setUnreadEmployeeIssues(pending);
        })
        .catch(() => {});
    };
    refreshUnreadIssues();
    const intervalId = window.setInterval(refreshUnreadIssues, 8_000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);
  const clearUnreadEmployeeIssues = () => {
    setUnreadEmployeeIssues(0);
    sessionStorage.setItem(unreadIssuesStorageKey, '0');
    void supportChatService
      .getMessages({ limit: 1 })
      .then((result) => {
        const latestId = Number(result?.messages?.[0]?.id || 0);
        sessionStorage.setItem(issuesLastSeenStorageKey, String(latestId));
      })
      .catch(() => {});
  };
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
  const update = <K extends keyof typeof settings>(key: K, value: (typeof settings)[K]) =>
    setSettings((current) => ({ ...current, [key]: value }));
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
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
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
  const banner = async (key: 'mainBannerUrl', event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFeedbackError('');
    try {
      update(
        key,
        await createPersistentImageDataUrl(file, 1440, {
          upscale: true,
          targetWidth: 1440,
          targetHeight: 560,
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
  const save = async () => {
    setFeedbackError('');
    if (section === 'business' && Object.keys(validateBusinessSettings(settings)).length > 0) {
      setArea('settings');
      setSection('business');
      setFeedbackError('Revise os dados do negócio destacados antes de salvar.');
      return;
    }
    if (section === 'address' && Object.keys(validateEstablishmentAddress(settings)).length > 0) {
      setFeedbackError('Revise os dados do endereço destacados antes de salvar.');
      return;
    }
    if (
      section === 'hours' &&
      settings.businessHoursConfigured &&
      Object.keys(validateBusinessHours(settings.businessHours)).length > 0
    ) {
      setFeedbackError('Revise os horários destacados antes de salvar.');
      return;
    }
    try {
      await onSaveSettings?.(settings);
      setSettings((current) => ({
        ...current,
        stripeSecretKey: '',
        stripeSecretKeyConfigured:
          current.stripeSecretKeyConfigured || Boolean(current.stripeSecretKey),
        stripeWebhookSecret: '',
        stripeWebhookSecretConfigured:
          current.stripeWebhookSecretConfigured || Boolean(current.stripeWebhookSecret),
        mercadoPagoAccessToken: '',
        mercadoPagoAccessTokenConfigured:
          current.mercadoPagoAccessTokenConfigured || Boolean(current.mercadoPagoAccessToken),
        asaasAccessToken: '',
        asaasAccessTokenConfigured:
          current.asaasAccessTokenConfigured || Boolean(current.asaasAccessToken),
        pagbankToken: '',
        pagbankTokenConfigured: current.pagbankTokenConfigured || Boolean(current.pagbankToken),
      }));
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
    } catch {
      setSaved(false);
      setFeedbackError('Não foi possível salvar. Confira sua conexão e tente novamente.');
    }
  };
  const saveEmployee = async (employee: Omit<Employee, 'id'>, id?: string) => {
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
    } catch {
      setFeedbackError('Não foi possível salvar o funcionário. Tente novamente.');
    }
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
            onClick={() => {
              setArea('overview');
              setMobile(false);
            }}
          >
            <LayoutGrid />
            Visão geral
          </button>
          <button
            className={area === 'orders' ? 'active' : ''}
            onClick={() => {
              setArea('orders');
              setMobile(false);
            }}
          >
            <ShoppingBag />
            Pedidos
          </button>
          <button
            className={area === 'catalog' ? 'active' : ''}
            onClick={() => {
              setArea('catalog');
              setMobile(false);
            }}
          >
            <Menu />
            Cardápio
          </button>
          <button
            className={area === 'customers' ? 'active' : ''}
            onClick={() => {
              setArea('customers');
              setMobile(false);
            }}
          >
            <Users />
            Clientes
          </button>
          <button
            className={area === 'employees' ? 'active employees' : 'employees'}
            onClick={() => {
              setArea('employees');
              setMobile(false);
            }}
          >
            <Users />
            Funcionários
          </button>
          <button
            className={area === 'subscriptions' ? 'active' : ''}
            onClick={() => {
              setArea('subscriptions');
              setMobile(false);
            }}
          >
            <ReceiptText />
            Cobranças e assinaturas
          </button>
          <button
            className={area === 'settings' ? 'active' : ''}
            onClick={() => {
              if (onOpenSettings) onOpenSettings();
              else setArea('settings');
              setMobile(false);
            }}
          >
            <Settings2 />
            Configurações
          </button>
        </S.MainNav>
        <S.SideFooter>
          <button
            className={area === 'help' ? 'active' : ''}
            onClick={() => {
              setArea('help');
              clearUnreadEmployeeIssues();
              setMobile(false);
            }}
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
                  onClick={() => setSection(id)}
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
              <>
                <button className="preview" onClick={onViewStore}>
                  <ExternalLink />
                  Ver loja
                </button>
                <button className="save" onClick={save}>
                  <Save />
                  {saved ? 'Salvo' : 'Salvar alterações'}
                </button>
              </>
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
                onClick={() => setSection(id)}
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
                onBannerChange={banner}
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
                openEmployees={() => setArea('employees')}
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
      {editing !== undefined && (
        <EmployeeDrawer
          employee={editing}
          close={() => setEditing(undefined)}
          save={saveEmployee}
        />
      )}{' '}
      {editingProduct !== undefined && (
        <ProductDrawer
          product={editingProduct}
          categories={categories}
          ingredients={ingredients}
          close={() => setEditingProduct(undefined)}
          save={async (product) => {
            await onSaveProduct?.(product);
            setEditingProduct(undefined);
          }}
        />
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
