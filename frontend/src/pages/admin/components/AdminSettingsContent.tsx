import { adminMockSettings } from "../data";
import type { SettingsSection } from "../types";
import { BusinessSettings } from "./BusinessSettings";
import { AddressSettings } from "./AddressSettings";
import { OpeningHoursSettings } from "./OpeningHoursSettings";
import { OrderFlowSettings } from "./OrderFlowSettings";
import { DeliverySettings } from "./DeliverySettings";
import { TableMenuSettings } from "./TableMenuSettings";
import { WhatsAppSettings } from "./WhatsAppSettings";
import { PaymentSettings } from "./PaymentSettings";
import { SocialMediaSettings } from "./SocialMediaSettings";
import { AppearanceSettings } from "./AppearanceSettings";
import { SecuritySettings } from "./SecuritySettings";

type Settings = typeof adminMockSettings;
type Props = {
  section: SettingsSection;
  settings: Settings;
  update: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  openEmployees: () => void;
  onConnectMercadoPago?: () => void | Promise<void>;
  onConnectPagBank?: () => void | Promise<void>;
  onOnboardAsaas?: (payload: { cpf?: string; cnpj?: string; restaurantName: string; pixKey: string }) => void | Promise<void>;
};

export function AdminSettingsContent(props: Props) {
  const { section, settings, update } = props;
  if (section === "business") return <BusinessSettings settings={settings} update={update} />;
  if (section === "address") return <AddressSettings settings={settings} update={update} />;
  if (section === "hours") return <OpeningHoursSettings settings={settings} update={update} />;
  if (section === "orders") return <OrderFlowSettings settings={settings} update={update} />;
  if (section === "delivery") return <DeliverySettings settings={settings} update={update} />;
  if (section === "table") return <TableMenuSettings settings={settings} />;
  if (section === "whatsapp") return <WhatsAppSettings settings={settings} update={update} />;
  if (section === "payments") return <PaymentSettings settings={settings} update={update} onConnectMercadoPago={props.onConnectMercadoPago} onConnectPagBank={props.onConnectPagBank} onOnboardAsaas={props.onOnboardAsaas} />;
  if (section === "social") return <SocialMediaSettings settings={settings} update={update} />;
  if (section === "appearance") return <AppearanceSettings settings={settings} update={update} />;
  return <SecuritySettings openEmployees={props.openEmployees} />;
}
