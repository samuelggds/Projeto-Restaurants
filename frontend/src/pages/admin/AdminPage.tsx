import { ChangeEvent, useRef, useState } from "react";
import {
  ExternalLink,
  HelpCircle,
  LayoutGrid,
  LogOut,
  Menu,
  Save,
  Search as SearchIcon,
  Settings2,
  ShoppingBag,
  Users,
} from "lucide-react";
import { adminMockEmployees, adminMockSettings } from "./data";
import { useAppDialog } from "../../components/AppDialog/context";
import { createPersistentImageDataUrl } from "../../utils/persistentImage";
import imageEnhancementService from "../../Services/imageEnhancementService";
import { createRestaurantMonogram } from "../../utils/restaurantMonogram";
import { EmployeeDrawer } from "./components/EmployeeDrawer";
import { EmployeeList } from "./components/EmployeeList";
import { ProductDrawer } from "./components/ProductDrawer";
import { BrandSettings } from "./components/BrandSettings";
import { AdminSettingsContent } from "./components/AdminSettingsContent";
import { AdminManagement } from "./components/AdminManagement";
import { sectionTitle, settingItems } from "./config/adminNavigation";
import * as S from "./Admin.styles";
import type {
  AdminPageProps,
  AdminSection,
  AdminProduct,
  Employee,
  SettingsSection,
} from "./types";

export function AdminPage({
  initialSettings = adminMockSettings,
  initialEmployees = adminMockEmployees,
  initialOrders = [],
  initialProducts = [],
  initialCategories = [],
  onUpdateOrderStatus,
  onConfirmOrderPayment,
  onSaveProduct,
  onDeleteProduct,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
  onOpenSettings,
  onSaveSettings,
  onConnectMercadoPago,
  onConnectPagBank,
  onOnboardAsaas,
  onCreateEmployee,
  onUpdateEmployee,
  onDeactivateEmployee,
  onViewStore,
  onLogout,
}: AdminPageProps) {
  const { confirmDialog } = useAppDialog();
  const oauthParams = new URLSearchParams(window.location.search);
  const mercadoPagoOAuthStatus = oauthParams.get("mp_oauth");
  const pagBankOAuthStatus = oauthParams.get("pagbank_oauth");
  const paymentOAuthStatus = mercadoPagoOAuthStatus || pagBankOAuthStatus;
  const [area, setArea] = useState<AdminSection>(
    paymentOAuthStatus ? "settings" : "overview",
  );
  const [section, setSection] = useState<SettingsSection>(
    paymentOAuthStatus ? "payments" : "brand",
  );
  const [settings, setSettings] = useState(initialSettings);
  const [employees, setEmployees] = useState(initialEmployees);
  const orders = initialOrders;
  const products = initialProducts;
  const categories = initialCategories;
  const [mobile, setMobile] = useState(false);
  const [editing, setEditing] = useState<Employee | null | undefined>();
  const [editingProduct, setEditingProduct] = useState<
    AdminProduct | null | undefined
  >();
  const [saved, setSaved] = useState(paymentOAuthStatus === "success");
  const [isEnhancingCover, setIsEnhancingCover] = useState(false);
  const [feedbackError, setFeedbackError] = useState(
    paymentOAuthStatus === "error"
      ? oauthParams.get("message") ||
          "Não foi possível conectar ao Mercado Pago."
      : "",
  );
  const logoInput = useRef<HTMLInputElement>(null);
  const areaTitles: Record<Exclude<AdminSection, "settings">, string> = {
    overview: "Visão geral",
    orders: "Pedidos",
    catalog: "Cardápio",
    customers: "Clientes",
    employees: "Employees",
  };
  const title = area === "settings" ? sectionTitle[section] : areaTitles[area];
  const update = <K extends keyof typeof settings>(
    key: K,
    value: (typeof settings)[K],
  ) => setSettings((current) => ({ ...current, [key]: value }));
  const logo = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFeedbackError("");
    try {
      const persistentImage = await createPersistentImageDataUrl(file, 1600);
      update("logoUrl", persistentImage);
    } catch (error) {
      setFeedbackError(
        error instanceof Error
          ? error.message
          : "Não foi possível processar a imagem.",
      );
    } finally {
      event.target.value = "";
    }
  };
  const cover = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFeedbackError("");
    try {
      update("coverImageUrl", await createPersistentImageDataUrl(file, 1920, {
        upscale: true,
        targetWidth: 1920,
        targetHeight: 1080,
      }));
    } catch (error) {
      setFeedbackError(error instanceof Error ? error.message : "Não foi possível processar a imagem.");
    } finally {
      event.target.value = "";
    }
  };
  const enhanceCover = async () => {
    if (!settings.coverImageUrl || isEnhancingCover) return;
    setFeedbackError("");
    setIsEnhancingCover(true);
    try {
      const enhanced = await imageEnhancementService.enhanceRestaurantImage(settings.coverImageUrl);
      if (!enhanced) throw new Error("A IA não retornou uma imagem.");
      const response = await fetch(enhanced);
      const blob = await response.blob();
      const file = new File([blob], "capa-melhorada.png", { type: blob.type || "image/png" });
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
      setFeedbackError(apiError.response?.data?.error || (error instanceof Error ? error.message : "Não foi possível melhorar a imagem com IA."));
    } finally {
      setIsEnhancingCover(false);
    }
  };
  const banner = async (
    key: "mainBannerUrl" | "promotion1Url" | "promotion2Url",
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFeedbackError("");
    try {
      const isMainBanner = key === "mainBannerUrl";
      update(key, await createPersistentImageDataUrl(file, 1440, {
        upscale: true,
        targetWidth: isMainBanner ? 1440 : 600,
        targetHeight: isMainBanner ? 560 : 400,
      }));
    } catch (error) {
      setFeedbackError(
        error instanceof Error
          ? error.message
          : "Não foi possível processar a imagem.",
      );
    } finally {
      event.target.value = "";
    }
  };
  const save = async () => {
    setFeedbackError("");
    try {
      await onSaveSettings?.(settings);
      setSettings((current) => ({
        ...current,
        stripeSecretKey: "",
        stripeSecretKeyConfigured:
          current.stripeSecretKeyConfigured || Boolean(current.stripeSecretKey),
        stripeWebhookSecret: "",
        stripeWebhookSecretConfigured:
          current.stripeWebhookSecretConfigured ||
          Boolean(current.stripeWebhookSecret),
        mercadoPagoAccessToken: "",
        mercadoPagoAccessTokenConfigured:
          current.mercadoPagoAccessTokenConfigured ||
          Boolean(current.mercadoPagoAccessToken),
        asaasAccessToken: "",
        asaasAccessTokenConfigured:
          current.asaasAccessTokenConfigured ||
          Boolean(current.asaasAccessToken),
        pagbankToken: "",
        pagbankTokenConfigured:
          current.pagbankTokenConfigured || Boolean(current.pagbankToken),
      }));
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
    } catch {
      setSaved(false);
      setFeedbackError(
        "Não foi possível salvar. Confira sua conexão e tente novamente.",
      );
    }
  };
  const saveEmployee = async (employee: Omit<Employee, "id">, id?: string) => {
    setFeedbackError("");
    try {
      if (id) {
        const full = { ...employee, id };
        const savedEmployee = (await onUpdateEmployee?.(full)) ?? full;
        setEmployees((x) =>
          x.map((item) => (item.id === id ? savedEmployee : item)),
        );
      } else {
        const createdEmployee = await onCreateEmployee?.(employee);
        if (createdEmployee) {
          setEmployees((x) => [...x, createdEmployee]);
        }
      }
      setEditing(undefined);
    } catch {
      setFeedbackError(
        "Não foi possível salvar o funcionário. Tente novamente.",
      );
    }
  };
  return (
    <S.Root $primary={settings.primaryColor} $settings={area === "settings"}>
      {feedbackError && (
        <div
          role="alert"
          style={{
            position: "fixed",
            right: 24,
            top: 24,
            zIndex: 1000,
            maxWidth: 420,
            borderRadius: 10,
            background: "#991b1b",
            color: "white",
            padding: "12px 16px",
            boxShadow: "0 12px 30px rgba(0, 0, 0, 0.2)",
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
            className={area === "overview" ? "active" : ""}
            onClick={() => {
              setArea("overview");
              setMobile(false);
            }}
          >
            <LayoutGrid />
            Visão geral
          </button>
          <button
            className={area === "orders" ? "active" : ""}
            onClick={() => {
              setArea("orders");
              setMobile(false);
            }}
          >
            <ShoppingBag />
            Pedidos
          </button>
          <button
            className={area === "catalog" ? "active" : ""}
            onClick={() => {
              setArea("catalog");
              setMobile(false);
            }}
          >
            <Menu />
            Cardápio
          </button>
          <button
            className={area === "customers" ? "active" : ""}
            onClick={() => {
              setArea("customers");
              setMobile(false);
            }}
          >
            <Users />
            Clientes
          </button>
          <button
            className={area === "employees" ? "active employees" : "employees"}
            onClick={() => {
              setArea("employees");
              setMobile(false);
            }}
          >
            <Users />
            Employees
          </button>
          <button
            className={area === "settings" ? "active" : ""}
            onClick={() => {
              if (onOpenSettings) onOpenSettings();
              else setArea("settings");
              setMobile(false);
            }}
          >
            <Settings2 />
            Configurações
          </button>
        </S.MainNav>
        <S.SideFooter>
          <button>
            <HelpCircle />
            Central de ajuda
          </button>
          <button onClick={onLogout}>
            <LogOut />
            Sair
          </button>
        </S.SideFooter>
      </S.MainSidebar>
      <S.SettingsSidebar $visible={area === "settings"}>
        <S.Search>
          <SearchIcon />
          <input placeholder="Buscar configuração" />
        </S.Search>
        <S.SettingsNav>
          <small>RESTAURANTE</small>
          {settingItems.slice(0, 4).map(([id, label, Icon]) => (
            <button
              key={id}
              className={section === id ? "active" : ""}
              onClick={() => setSection(id)}
            >
              <Icon />
              {label}
            </button>
          ))}
          <small>OPERAÇÃO</small>
          {settingItems.slice(4, 9).map(([id, label, Icon]) => (
            <button
              key={id}
              className={section === id ? "active" : ""}
              onClick={() => setSection(id)}
            >
              <Icon />
              {label}
            </button>
          ))}
          <small>PRESENÇA DIGITAL</small>
          {settingItems.slice(9).map(([id, label, Icon]) => (
            <button
              key={id}
              className={section === id ? "active" : ""}
              onClick={() => setSection(id)}
            >
              <Icon />
              {label}
            </button>
          ))}
        </S.SettingsNav>
      </S.SettingsSidebar>
      <S.Main>
        <S.Top>
          <S.MobileMenu onClick={() => setMobile(true)}>
            <Menu />
          </S.MobileMenu>
          <div>
            <small>PAINEL &nbsp;/&nbsp; {area.toUpperCase()}</small>
            <h1>{title}</h1>
            <p>
              {area === "employees"
                ? "Somente o administrador cria e edita funcionários."
                : area === "settings"
                  ? "Personalize e gerencie as informações do restaurante."
                  : "Acompanhe e gerencie a operação em um só lugar."}
            </p>
          </div>
          <S.TopActions>
            {area === "settings" && (
              <>
                <button className="preview" onClick={onViewStore}>
                  <ExternalLink />
                  Ver loja
                </button>
                <button className="save" onClick={save}>
                  <Save />
                  {saved ? "Salvo" : "Salvar alterações"}
                </button>
              </>
            )}
          </S.TopActions>
        </S.Top>
        <S.Content>
          {area === "employees" ? (
            <EmployeeList
              employees={employees}
              onNew={() => setEditing(null)}
              onEdit={setEditing}
              onDeactivate={async (employee) => {
                const confirmed = await confirmDialog({
                  title: "Desativar funcionário?",
                  description: `${employee.name} perderá o acesso ao sistema até ser reativado.`,
                  confirmLabel: "Desativar",
                  tone: "danger",
                });
                if (!confirmed) return;
                await onDeactivateEmployee?.(employee.id);
                setEmployees((current) =>
                  current.map((item) =>
                    item.id === employee.id ? { ...item, active: false } : item,
                  ),
                );
              }}
            />
          ) : area === "settings" ? (
            section === "brand" ? (
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
                openEmployees={() => setArea("employees")}
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
              onUpdateOrderStatus={async (id, status) => {
                await onUpdateOrderStatus?.(id, status);
              }}
              onConfirmOrderPayment={async (id) => {
                await onConfirmOrderPayment?.(id);
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
      )}{" "}
      {editingProduct !== undefined && (
        <ProductDrawer
          product={editingProduct}
          categories={categories}
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
            position: "fixed",
            inset: 0,
            zIndex: 55,
            background: "#0005",
          }}
        />
      )}
    </S.Root>
  );
}

