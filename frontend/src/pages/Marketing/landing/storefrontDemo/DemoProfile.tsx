import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { useAppDialog } from '../../../../components/AppDialog/context';
import termsHtml from '../../../../../public/termos/index.html?raw';
import privacyHtml from '../../../../../public/privacidade/index.html?raw';
import cookiesHtml from '../../../../../public/cookies/index.html?raw';
import { AddressModal } from '../../../Profile/components/AddressModal';
import type { CustomerAddressInput } from '../../../../Services/customerAddressService';
import type { DemoAddress } from './DemoCheckout';
import { FigmaAccountExperience } from '../../../Profile/FigmaAccountExperience';
import type {
  ProfileData,
  ProfileOrder,
  ProfileOrderStatus,
  ProfileView,
} from '../../../Profile/types';
import { demoPhotoPath, demoStores, type DemoSlug } from './catalog';
import { demoPromotionalCoupon } from './demoHomeData';
import { getDemoOrderStatus } from './demoOrderProgress';
import type { DemoSession } from './demoSession';

const sampleAddress: CustomerAddressInput = {
  label: 'Casa',
  address: 'Rua das Pitangueiras',
  number: '120',
  district: 'Jardim do Sol',
  city: 'Vila das Flores',
  state: 'SP',
  zipCode: '01000-000',
  complement: '',
  isDefault: true,
};

const legalDocuments = new Map([
  ['/termos/', termsHtml],
  ['/privacidade/', privacyHtml],
  ['/cookies/', cookiesHtml],
]);

type Props = {
  initialView: ProfileView;
  slug: DemoSlug;
  session: DemoSession;
  count: number;
  onDarkModeChange: (enabled: boolean) => void;
  onMenu: () => void;
  onBag: () => void;
  onSaveAddress: (address: DemoAddress) => void;
  onLogout: () => void;
  onTrack: (id: string) => void;
  onCoupon: () => void;
  onReorder: (id: string) => void;
};
const profileStatus: Record<ReturnType<typeof getDemoOrderStatus>, ProfileOrderStatus> = {
  PREPARANDO: 'preparing',
  PRONTO: 'preparing',
  SAIU_PARA_ENTREGA: 'onTheWay',
  ENTREGUE: 'delivered',
};
const dateFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

export function DemoProfile({
  slug,
  session,
  count,
  initialView,
  onDarkModeChange,
  onMenu,
  onBag,
  onSaveAddress,
  onLogout,
  onTrack,
  onCoupon,
  onReorder,
}: Props) {
  const [addingAddress, setAddingAddress] = useState(false);
  const [preferences] = useState(() => {
    const values = new Map<string, string>();
    return {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
    };
  });
  const [profileView, setProfileView] = useState(initialView);
  const { confirmDialog } = useAppDialog();
  const legal = useRef<HTMLDialogElement>(null);
  const [legalText, setLegalText] = useState<string[]>([]);
  function openLegalDocument(event: MouseEvent<HTMLDivElement>) {
    const target = event.target instanceof Element ? event.target.closest('a[href]') : null;
    const html = legalDocuments.get(target?.getAttribute('href') ?? '');
    if (!html) return;
    event.preventDefault();
    const page = new DOMParser().parseFromString(html, 'text/html');
    const title = page.querySelector('h1')?.textContent || 'Informações legais';
    const paragraphs = Array.from(
      page.querySelectorAll('main h2, main h3, main p, main li'),
      (node) => node.textContent?.trim() || '',
    ).filter(Boolean);
    setLegalText([title, ...paragraphs]);
    legal.current?.showModal();
    legal.current?.scrollTo(0, 0);
  }
  const store = demoStores[slug];
  const address = session.address;
  const addressText = address
    ? [address.street, address.number, address.district, address.city].join(', ')
    : '';
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const orders: ProfileOrder[] = session.orders.map((order) => ({
    id: order.id,
    image: store.products.find((p) => p.name === order.items[0]?.name)?.image ?? store.cover,
    status: profileStatus[getDemoOrderStatus(order, now)],
    channel: order.fulfillmentMethod === 'pickup' ? 'Retirada' : 'Delivery',
    date: dateFormat.format(order.placedAt),
    total: order.total / 100,
    summary: order.items.map((line) => `${line.quantity}× ${line.name}`).join(', '),
  }));
  const data: ProfileData = {
    brand: {
      name: store.name,
      logoUrl: `${demoPhotoPath}/logo-${slug}.svg`,
      primaryColor: store.color,
      status: 'Aberto para pedidos',
      address: 'Praça do Mercado, 42 · Centro',
    },
    user: {
      firstName: 'Marina',
      fullName: 'Marina Costa',
      email: 'marina@example.test',
      avatarUrl: '',
      mainAddress: addressText,
    },
    addresses: address
      ? [
          {
            id: 'casa',
            label: 'Casa',
            address: addressText,
            isDefault: true,
            district: address.district,
            city: address.city,
          },
        ]
      : [],
    activeOrders: orders
      .filter((order) => order.status !== 'delivered')
      .map((order) => ({ ...order, estimatedArrival: 'Em breve' })),
    recentOrders: orders.filter((order) => order.status === 'delivered'),
  };
  return (
    <div onClickCapture={openLegalDocument}>
      <FigmaAccountExperience
        key={profileView}
        data={data}
        preferenceStorage={preferences}
        initialView={profileView}
        darkMode={session.darkMode}
        onDarkModeChange={onDarkModeChange}
        cartCount={count}
        onGoHome={onMenu}
        onOpenMenu={onMenu}
        onOpenCart={onBag}
        onTrackOrder={onTrack}
        onViewOrder={onTrack}
        onReorder={onReorder}
        onNewAddress={() => setAddingAddress(true)}
        onLogout={onLogout}
        onDeactivateAccount={async () => onLogout()}
        onSupportOrder={() => setProfileView('help')}
        onSupport={async () => {
          if (
            await confirmDialog({
              title: 'Atendimento de demonstração',
              description: 'Consulte os pedidos desta loja para acompanhar o preparo ou a entrega.',
              confirmLabel: 'Ver pedidos',
              cancelLabel: 'Voltar',
            })
          )
            setProfileView('orders');
        }}
        promotionalWallet={[{ ...demoPromotionalCoupon, status: 'ACTIVE', inactiveReason: null }]}
        onUsePromotionalCoupon={onCoupon}
      />
      {addingAddress && (
        <AddressModal
          initialAddress={sampleAddress}
          resolveCep={async (zipCode) => ({
            cep: zipCode,
            address: sampleAddress.address,
            district: sampleAddress.district,
            city: sampleAddress.city,
            state: sampleAddress.state,
            complement: '',
          })}
          onClose={() => setAddingAddress(false)}
          onSave={async ({ address: street, number, district, city, state, zipCode, complement }) =>
            onSaveAddress({
              street,
              number,
              district,
              city,
              state,
              zipCode,
              complement: complement ?? '',
            })
          }
        />
      )}
      <dialog
        ref={legal}
        aria-label={legalText[0] || 'Informações legais'}
        style={{
          inset: 0,
          margin: 'auto',
          width: 'min(90vw, 560px)',
          maxHeight: '84dvh',
          padding: 20,
          border: '1px solid var(--demo-line, #d6d3cf)',
          borderRadius: 16,
          color: 'var(--demo-text, #222)',
          background: 'var(--demo-panel, #fff)',
          lineHeight: 1.5,
        }}
      >
        <form method="dialog" style={{ position: 'sticky', top: 0, background: 'var(--demo-panel, #fff)' }}>
          <button type="submit" style={{ minHeight: 44, padding: '6px 12px' }}>
            Voltar às configurações
          </button>
        </form>
        <h2>{legalText[0]}</h2>
        {legalText.slice(1).map((text, i) => (
          <p key={i} style={{ marginBlock: 12 }}>
            {text}
          </p>
        ))}
      </dialog>
    </div>
  );
}
