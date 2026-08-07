import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import restaurantSettingsService from "../../../Services/restaurantSettingsService";
import * as S from "../styles/settings.styles";
import { AboutSettings } from "../components/AboutSettings";
import { AppearanceSettings } from "../components/AppearanceSettings";
import { BusinessSettings } from "../components/BusinessSettings";
import { ContactSettings } from "../components/ContactSettings";
import { HoursSettings } from "../components/HoursSettings";
import { OrderSettings } from "../components/OrderSettings";
import { SettingsSidebar } from "../components/SettingsSidebar";
import { WhatsappSettings } from "../components/WhatsappSettings";
import { PaymentSettings } from "../components/PaymentSettings";
import type {
  RestaurantSettings,
  SettingsSectionId,
} from "../types/settings.types";

const DEFAULT_HOURS = [
  {
    id: "monday",
    label: "Segunda-feira",
    enabled: false,
    openingTime: "11:00",
    closingTime: "23:00",
  },
  {
    id: "tuesday",
    label: "Terça-feira",
    enabled: true,
    openingTime: "11:00",
    closingTime: "23:00",
  },
  {
    id: "wednesday",
    label: "Quarta-feira",
    enabled: true,
    openingTime: "11:00",
    closingTime: "23:00",
  },
  {
    id: "thursday",
    label: "Quinta-feira",
    enabled: true,
    openingTime: "11:00",
    closingTime: "23:00",
  },
  {
    id: "friday",
    label: "Sexta-feira",
    enabled: true,
    openingTime: "11:00",
    closingTime: "00:00",
  },
  {
    id: "saturday",
    label: "Sábado",
    enabled: true,
    openingTime: "11:00",
    closingTime: "00:00",
  },
  {
    id: "sunday",
    label: "Domingo",
    enabled: true,
    openingTime: "11:00",
    closingTime: "22:00",
  },
];

function buildSettingsFromApi(
  raw: Record<string, unknown>,
): RestaurantSettings {
  const r = (raw?.restaurant as Record<string, unknown>) ?? raw;
  return {
    restaurantName: String(r?.name ?? raw?.restaurantName ?? ""),
    slogan: String(r?.slogan ?? raw?.slogan ?? ""),
    logoUrl: String(r?.logo ?? raw?.restaurantLogo ?? raw?.logoUrl ?? ""),
    primaryColor: String(raw?.primaryColor ?? "#c95d3d"),
    coverImageUrl: String(
      r?.coverImage ?? raw?.restaurantCoverImage ?? raw?.coverImageUrl ?? "",
    ),
    description: String(raw?.description ?? ""),
    phone: String(raw?.whatsapp ?? raw?.phone ?? ""),
    email: String(raw?.email ?? ""),
    address: String(raw?.address ?? ""),
    instagram: String(raw?.instagram ?? ""),
    pixProvider: String(raw?.pixProvider ?? ""),
    pixKey: String(raw?.pixKey ?? ""),
    cardGateway: String(raw?.cardGateway ?? ""),
    stripeSecretKey: "",
    stripeSecretKeyConfigured: Boolean(raw?.stripeSecretKeyConfigured),
    stripeWebhookSecret: "",
    stripeWebhookSecretConfigured: Boolean(
      raw?.stripeWebhookSecretConfigured,
    ),
    mercadoPagoAccessToken: "",
    mercadoPagoAccessTokenConfigured: Boolean(
      raw?.mercadoPagoAccessTokenConfigured,
    ),
    asaasAccessToken: "",
    asaasAccessTokenConfigured: Boolean(raw?.asaasAccessTokenConfigured),
    pagbankEmail: String(raw?.pagbankEmail ?? ""),
    pagbankToken: "",
    pagbankTokenConfigured: Boolean(raw?.pagbankTokenConfigured),
    social: {
      instagram: String(raw?.instagram ?? ""),
      facebook: String(raw?.facebook ?? ""),
      whatsapp: String(raw?.whatsapp ?? ""),
      tiktok: String(raw?.tiktok ?? ""),
      youtube: String(raw?.youtube ?? ""),
    },
    businessHours: Array.isArray(raw?.businessHours)
      ? (raw.businessHours as RestaurantSettings["businessHours"])
      : DEFAULT_HOURS,
    acceptsDelivery: Boolean(raw?.acceptsDelivery ?? true),
    acceptsPickup: Boolean(raw?.acceptsPickup ?? true),
    minimumOrder: Number(raw?.minimumOrder ?? 0),
    deliveryFee: Number(raw?.deliveryFee ?? 0),
    averageDeliveryTime: String(raw?.averageDeliveryTime ?? ""),
    acceptsPix: Boolean(raw?.acceptsPix ?? true),
    acceptsCard: Boolean(raw?.acceptsCard ?? true),
    whatsappEnabled: Boolean(raw?.whatsappEnabled ?? false),
    whatsappNumber: String(raw?.whatsappNumber ?? raw?.whatsapp ?? ""),
    whatsappDefaultMessage: String(
      raw?.whatsappDefaultMessage ?? "Olá! Gostaria de fazer um pedido.",
    ),
    receiveOrdersOnWhatsapp: Boolean(raw?.receiveOrdersOnWhatsapp ?? false),
    receiveStatusNotifications: Boolean(
      raw?.receiveStatusNotifications ?? false,
    ),
  };
}

function buildApiPayload(settings: RestaurantSettings) {
  return {
    restaurantName: settings.restaurantName,
    restaurantLogo: settings.logoUrl,
    restaurantCoverImage: settings.coverImageUrl,
    primaryColor: settings.primaryColor,
    description: settings.description,
    whatsapp: settings.phone || settings.social.whatsapp,
    instagram: settings.social.instagram || settings.instagram,
    facebook: settings.social.facebook,
    tiktok: settings.social.tiktok,
    youtube: settings.social.youtube,
    businessHours: settings.businessHours,
    acceptsDelivery: settings.acceptsDelivery,
    acceptsPickup: settings.acceptsPickup,
    minimumOrder: settings.minimumOrder,
    deliveryFee: settings.deliveryFee,
    averageDeliveryTime: settings.averageDeliveryTime,
    acceptsPix: settings.acceptsPix,
    acceptsCard: settings.acceptsCard,
    whatsappEnabled: settings.whatsappEnabled,
    whatsappNumber: settings.whatsappNumber,
    whatsappDefaultMessage: settings.whatsappDefaultMessage,
    receiveOrdersOnWhatsapp: settings.receiveOrdersOnWhatsapp,
    receiveStatusNotifications: settings.receiveStatusNotifications,
    slogan: settings.slogan,
    email: settings.email,
    address: settings.address,
    pixProvider: settings.pixProvider,
    pixKey: settings.pixKey,
    cardGateway: settings.cardGateway,
    pagbankEmail: settings.pagbankEmail,
    ...(settings.stripeSecretKey
      ? { stripeSecretKey: settings.stripeSecretKey }
      : {}),
    ...(settings.stripeWebhookSecret
      ? { stripeWebhookSecret: settings.stripeWebhookSecret }
      : {}),
    ...(settings.mercadoPagoAccessToken
      ? { mercadoPagoAccessToken: settings.mercadoPagoAccessToken }
      : {}),
    ...(settings.asaasAccessToken
      ? { asaasAccessToken: settings.asaasAccessToken }
      : {}),
    ...(settings.pagbankToken
      ? { pagbankToken: settings.pagbankToken }
      : {}),
  };
}

export function SettingsPage() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] =
    useState<SettingsSectionId>("business");
  const [settings, setSettings] = useState<RestaurantSettings | null>(null);
  const [settingsId, setSettingsId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const data = await restaurantSettingsService.getMySettings();
        if (!mounted) return;
        setSettingsId(Number(data?.id || 0) || null);
        setSettings(buildSettingsFromApi(data ?? {}));
      } catch (error) {
        if (!mounted) return;
        toast.error(
          error?.response?.data?.error || "Erro ao carregar configurações.",
        );
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  function updateSettings(patch: Partial<RestaurantSettings>) {
    setSaved(false);
    setSettings((current) => (current ? { ...current, ...patch } : current));
  }

  async function handleSave() {
    if (!settings || isSaving) return;
    setIsSaving(true);

    try {
      const payload = buildApiPayload(settings);
      if (settingsId) {
        await restaurantSettingsService.updateSettings(settingsId, payload);
      } else {
        const created = await restaurantSettingsService.createSettings(payload);
        setSettingsId(Number(created?.id || 0) || null);
      }
      setSaved(true);
      toast.success("Configurações salvas com sucesso!");
    } catch (error) {
      toast.error(
        error?.response?.data?.error || "Erro ao salvar configurações.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <S.Page>
        <div
          style={{
            gridColumn: "1/-1",
            display: "grid",
            placeItems: "center",
            minHeight: "100vh",
            color: "#9a9591",
          }}
        >
          Carregando configurações...
        </div>
      </S.Page>
    );
  }

  if (!settings) return null;

  const sectionProps = { settings, onChange: updateSettings };

  return (
    <S.Page>
      <SettingsSidebar
        activeSection={activeSection}
        onSelect={setActiveSection}
      />

      <S.Content>
        <S.Topbar>
          <S.TopbarInfo>
            <span>Configurações</span>
            <strong>Personalize seu restaurante</strong>
          </S.TopbarInfo>
          <S.TopbarActions>
            {saved && <S.SavedMessage>✓ Alterações salvas</S.SavedMessage>}
            <S.PreviewButton type="button" onClick={() => navigate("/")}>
              Ver Home
            </S.PreviewButton>
            <S.SaveButton
              type="button"
              disabled={isSaving}
              onClick={handleSave}
            >
              {isSaving ? "Salvando..." : "Salvar alterações"}
            </S.SaveButton>
          </S.TopbarActions>
        </S.Topbar>

        <S.ContentBody>
          {activeSection === "business" && (
            <BusinessSettings {...sectionProps} />
          )}
          {activeSection === "appearance" && (
            <AppearanceSettings {...sectionProps} />
          )}
          {activeSection === "contact" && <ContactSettings {...sectionProps} />}
          {activeSection === "whatsapp" && (
            <WhatsappSettings {...sectionProps} />
          )}
          {activeSection === "about" && <AboutSettings {...sectionProps} />}
          {activeSection === "hours" && <HoursSettings {...sectionProps} />}
          {activeSection === "orders" && <OrderSettings {...sectionProps} />}
          {activeSection === "payments" && (
            <PaymentSettings {...sectionProps} />
          )}
        </S.ContentBody>
      </S.Content>
    </S.Page>
  );
}
