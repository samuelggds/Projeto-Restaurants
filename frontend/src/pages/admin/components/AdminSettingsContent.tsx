import { lazy, Suspense } from 'react';

import { adminMockSettings } from '../data';
import type {
  AdminCoupon,
  AdminProduct,
  CouponPayload,
  Employee,
  ProductDiscountPayload,
  SettingsSection,
} from '../types';
import * as S from '../Admin.styles';
import { BusinessSettings } from './BusinessSettings';
import { AddressSettings } from './AddressSettings';
import { OpeningHoursSettings } from './OpeningHoursSettings';
import { OrderFlowSettings } from './OrderFlowSettings';
import { DeliverySettings } from './DeliverySettings';
import { TableMenuSettings } from './TableMenuSettings';
import { WhatsAppSettings } from './WhatsAppSettings';
import { PaymentSettings } from './PaymentSettings';
import { SocialMediaSettings } from './SocialMediaSettings';
import { AppearanceSettings } from './AppearanceSettings';
import { SecuritySettings } from './SecuritySettings';
import { PromotionsSettings } from './PromotionsSettings';
import { TableAccountSettings } from './TableAccountSettings';
import { KitchenPrintingSettings } from './KitchenPrintingSettings';
import { PremiumTableFeatureGate } from './PremiumTableFeatureGate';

const CourierCompensationSettings = lazy(() =>
  import('./CourierCompensationSettings').then((module) => ({
    default: module.CourierCompensationSettings,
  })),
);

const EmployeeCompensationSettings = lazy(() =>
  import('./EmployeeCompensationSettings').then((module) => ({
    default: module.EmployeeCompensationSettings,
  })),
);

type Settings = typeof adminMockSettings;
type Props = {
  section: SettingsSection;
  settings: Settings;
  update: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  openEmployees: () => void;
  employees: Employee[];
  products: AdminProduct[];
  coupons: AdminCoupon[];
  promotionsLoading?: boolean;
  promotionsError?: string;
  onApplyProductDiscount?: (
    productId: string,
    payload: ProductDiscountPayload,
  ) => void | Promise<void>;
  onDeleteProductDiscount?: (productId: string) => void | Promise<void>;
  onCreateCoupon?: (payload: CouponPayload) => void | Promise<void>;
  onUpdateCoupon?: (id: string, payload: CouponPayload) => void | Promise<void>;
  onDeleteCoupon?: (id: string) => void | Promise<void>;
  onReloadPromotions?: () => void | Promise<void>;
  onConnectMercadoPago?: () => void | Promise<void>;
  onConnectPagBank?: () => void | Promise<void>;
  onOnboardAsaas?: (payload: {
    cpf?: string;
    cnpj?: string;
    restaurantName: string;
    pixKey: string;
    incomeValue: number;
  }) => void | Promise<void>;
};

export function AdminSettingsContent(props: Props) {
  const { section, settings, update } = props;

  const content = (() => {
    if (section === 'business') return <BusinessSettings settings={settings} update={update} />;
    if (section === 'address') return <AddressSettings settings={settings} update={update} />;
    if (section === 'hours') return <OpeningHoursSettings settings={settings} update={update} />;
    if (section === 'orders') return <OrderFlowSettings settings={settings} update={update} />;
    if (section === 'promotions')
      return (
        <PromotionsSettings
          products={props.products}
          coupons={props.coupons}
          loading={props.promotionsLoading}
          error={props.promotionsError}
          onApplyProductDiscount={props.onApplyProductDiscount}
          onDeleteProductDiscount={props.onDeleteProductDiscount}
          onCreateCoupon={props.onCreateCoupon}
          onUpdateCoupon={props.onUpdateCoupon}
          onDeleteCoupon={props.onDeleteCoupon}
          onReload={props.onReloadPromotions}
        />
      );
    if (section === 'delivery') return <DeliverySettings settings={settings} update={update} />;
    if (section === 'table')
      return (
        <PremiumTableFeatureGate>
          <TableMenuSettings settings={settings} update={update} />
        </PremiumTableFeatureGate>
      );
    if (section === 'table-account')
      return (
        <PremiumTableFeatureGate>
          <TableAccountSettings settings={settings} update={update} />
        </PremiumTableFeatureGate>
      );
    if (section === 'whatsapp') return <WhatsAppSettings settings={settings} update={update} />;
    if (section === 'printing') return <KitchenPrintingSettings />;
    if (section === 'employee-payments')
      return (
        <Suspense fallback={<div role="status">Carregando pagamentos dos funcionários...</div>}>
          <EmployeeCompensationSettings
            employees={props.employees}
            onOpenEmployees={props.openEmployees}
          />
        </Suspense>
      );
    if (section === 'courier-payments')
      return (
        <Suspense fallback={<div role="status">Carregando pagamentos dos motoqueiros...</div>}>
          <CourierCompensationSettings />
        </Suspense>
      );
    if (section === 'payments')
      return (
        <PaymentSettings
          settings={settings}
          update={update}
          onConnectMercadoPago={props.onConnectMercadoPago}
          onConnectPagBank={props.onConnectPagBank}
          onOnboardAsaas={props.onOnboardAsaas}
        />
      );
    if (section === 'social') return <SocialMediaSettings settings={settings} update={update} />;
    if (section === 'appearance') return <AppearanceSettings settings={settings} update={update} />;
    return <SecuritySettings openEmployees={props.openEmployees} />;
  })();

  return (
    <S.SettingsMotionFrame key={section} data-settings-section={section}>
      {content}
    </S.SettingsMotionFrame>
  );
}
