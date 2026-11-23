import { useLayoutEffect, useState, type Dispatch } from 'react';
import { DemoMenu } from './DemoMenu';
import { DemoCheckout, type DemoAddress, type DemoPayment } from './DemoCheckout';
import { DemoOrders } from './DemoOrders';
import { DemoAuth } from './DemoAuth';
import type { ProfileView } from '../../../Profile/types';
import { DemoProfile } from './DemoProfile';
import { demoStores, type DemoSlug } from './catalog';
import { getTotals, type DemoSession, type Fulfillment, type StoreAction } from './demoSession';

type Screen =
  'menu' | 'coupons' | 'orders' | 'tracking' | 'account' | 'bag' | 'address' | 'payment';

export function StorefrontExperience({
  slug,
  session,
  dispatch,
}: {
  slug: DemoSlug;
  session: DemoSession;
  dispatch: Dispatch<StoreAction>;
}) {
  const [screen, setScreen] = useState<Screen>('menu');
  const [addressOrigin, setAddressOrigin] = useState<'menu' | 'bag' | 'payment'>('menu');
  const [loginOrigin, setLoginOrigin] = useState<'menu' | 'address'>('menu');
  const [profileView, setProfileView] = useState<ProfileView>('overview');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const store = demoStores[slug];
  const { lines, fulfillment } = session;
  const totals = getTotals(lines, session.coupon, fulfillment);
  const count = lines.reduce((sum, item) => sum + item.quantity, 0);

  useLayoutEffect(() => {
    document.documentElement.dataset.storefrontScreen = screen;
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [screen]);

  function go(next: Screen) {
    if (next === 'account') setProfileView('overview');
    if (next === 'account') setLoginOrigin(screen === 'address' ? 'address' : 'menu');
    if (next === 'address')
      setAddressOrigin(screen === 'payment' ? 'payment' : screen === 'bag' ? 'bag' : 'menu');
    if (next === 'payment' && fulfillment === 'delivery' && !session.address) {
      setAddressOrigin('bag');
      setScreen('address');
      return;
    }
    setScreen(next);
  }
  function openProfile(view: ProfileView) {
    setProfileView(view);
    setLoginOrigin('menu');
    setScreen('account');
  }
  function openOrders() {
    if (session.loggedIn) openProfile('orders');
    else go('orders');
  }
  function selectCoupon(enabled: boolean) {
    dispatch({ slug, type: 'coupon', enabled });
  }
  function changeFulfillment(method: Fulfillment) {
    dispatch({ slug, type: 'fulfillment', method });
  }
  function saveAddress(address: DemoAddress) {
    dispatch({ slug, type: 'address', address });
    setScreen(addressOrigin === 'menu' ? 'menu' : 'payment');
  }
  function track(id: string | null) {
    setSelectedId(id);
    setScreen('tracking');
  }
  function pay(method: DemoPayment, showTracking = true) {
    if (!lines.length || (fulfillment === 'delivery' && !session.address)) return;
    dispatch({ slug, type: 'pay', method, time: Date.now() });
    setSelectedId(null);
    if (showTracking) track(null);
  }

  if (screen === 'menu' || screen === 'coupons')
    return (
      <DemoMenu
        key={screen}
        slug={slug}
        bagCount={count}
        address={session.address}
        coupon={session.coupon}
        subtotal={totals.subtotal}
        loggedIn={session.loggedIn}
        darkMode={session.darkMode}
        onDarkModeChange={(enabled) => dispatch({ slug, type: 'theme', enabled })}
        initialCouponsOpen={screen === 'coupons'}
        fulfillmentMethod={fulfillment}
        onFulfillmentMethodChange={changeFulfillment}
        onSetCoupon={selectCoupon}
        onAdd={(product, quantity, observation) =>
          dispatch({ slug, type: 'add', id: product.id, quantity, observation })
        }
        onBag={() => go('bag')}
        onAddress={() => go('address')}
        onProfileView={openProfile}
        onOrders={openOrders}
        onAccount={() => go('account')}
      />
    );
  if (screen === 'bag' || screen === 'address' || screen === 'payment')
    return (
      <DemoCheckout
        slug={slug}
        screen={screen}
        loggedIn={session.loggedIn}
        lines={lines}
        address={session.address}
        addressOrigin={addressOrigin}
        fulfillmentMethod={fulfillment}
        totals={totals}
        coupon={session.coupon}
        onCouponChange={selectCoupon}
        onFulfillmentMethodChange={changeFulfillment}
        onQuantity={(id, quantity) => dispatch({ slug, type: 'quantity', id, quantity })}
        onAddress={saveAddress}
        onNavigate={go}
        onPay={pay}
        onTrackPaid={() => track(null)}
        onLogin={() => go('account')}
      />
    );
  if (screen === 'orders' || screen === 'tracking')
    return (
      <DemoOrders
        screen={screen}
        orders={session.orders}
        selectedId={selectedId ?? session.orders[0].id}
        storeName={store.name}
        onMenu={() => go('menu')}
        onOrders={openOrders}
        onTrack={track}
        onClockChange={(id, clock) => dispatch({ slug, type: 'clock', id, clock })}
      />
    );
  if (!session.loggedIn)
    return (
      <DemoAuth
        slug={slug}
        onBack={() => go(loginOrigin)}
        onLogin={() => {
          dispatch({ slug, type: 'login', enabled: true });
          if (loginOrigin === 'address') setScreen('address');
        }}
      />
    );
  return (
    <DemoProfile
      key={profileView}
      initialView={profileView}
      slug={slug}
      session={session}
      count={count}
      onMenu={() => go('menu')}
      onDarkModeChange={(enabled) => dispatch({ slug, type: 'theme', enabled })}
      onBag={() => go('bag')}
      onSaveAddress={(address) => dispatch({ slug, type: 'address', address })}
      onTrack={track}
      onLogout={() => {
        dispatch({ slug, type: 'login', enabled: false });
        go('menu');
      }}
      onCoupon={() => {
        selectCoupon(true);
        go(count ? 'bag' : 'menu');
      }}
      onReorder={(id) => {
        const order = session.orders.find((item) => item.id === id);
        for (const line of order?.items ?? []) {
          const product = store.products.find((item) => item.name === line.name);
          if (product)
            dispatch({
              slug,
              type: 'add',
              id: product.id,
              quantity: line.quantity,
              observation: line.observation,
            });
        }
        go('bag');
      }}
    />
  );
}
