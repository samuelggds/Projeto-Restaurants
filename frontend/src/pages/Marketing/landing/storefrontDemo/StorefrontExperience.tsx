import { useEffect, useRef, useState, type Dispatch } from 'react';
import { Eye, EyeOff, House, ReceiptText, ShoppingBag, Ticket, UserRound } from 'lucide-react';
import { DemoMenu } from './DemoMenu';
import { DemoCheckout, type DemoAddress, type DemoPayment } from './DemoCheckout';
import { DemoOrders } from './DemoOrders';
import { demoStores, type DemoSlug } from './catalog';
import {
  couponCode,
  getBagLines,
  getTotals,
  itemCountLabel,
  type DemoSession,
  type StoreAction,
} from './demoSession';
import './StorefrontExperience.css';

const navigation = [
  { screen: 'menu', label: 'Início', icon: House },
  { screen: 'orders', label: 'Pedidos', icon: ReceiptText },
  { screen: 'coupons', label: 'Cupons', icon: Ticket },
  { screen: 'bag', label: 'Sacola', icon: ShoppingBag },
  { screen: 'account', label: 'Conta', icon: UserRound },
] as const;
type Screen = (typeof navigation)[number]['screen'] | 'address' | 'payment' | 'tracking';

export function StorefrontExperience({
  slug,
  session,
  dispatch,
}: {
  slug: DemoSlug;
  session: DemoSession;
  dispatch: Dispatch<StoreAction>;
}) {
  const store = demoStores[slug];
  const [screen, setScreen] = useState<Screen>('menu');
  const [addressOrigin, setAddressOrigin] = useState<'menu' | 'bag' | 'payment'>('menu');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const content = useRef<HTMLDivElement>(null);
  const previousScreen = useRef(screen);
  const lines = getBagLines(slug, session);
  const bagCount = lines.reduce((count, line) => count + line.quantity, 0);
  const totals = getTotals(lines, session.coupon);
  const tab =
    screen === 'tracking'
      ? 'orders'
      : screen === 'payment' || screen === 'address'
        ? 'bag'
        : screen;

  useEffect(() => {
    if (previousScreen.current === screen) return;
    previousScreen.current = screen;
    if (content.current) {
      content.current.scrollTop = 0;
      content.current.focus({ preventScroll: true });
    }
  }, [screen]);

  function go(next: Screen) {
    setNotice('');
    if (next === 'address') {
      setAddressOrigin(screen === 'menu' ? 'menu' : screen === 'payment' ? 'payment' : 'bag');
    } else if (next === 'payment' && !session.address) {
      setAddressOrigin('bag');
      setScreen('address');
      return;
    }
    if (screen === next) content.current?.scrollTo({ top: 0 });
    setScreen(next);
  }
  function saveAddress(address: DemoAddress) {
    dispatch({ slug, type: 'address', address });
    setScreen(addressOrigin === 'menu' ? 'menu' : 'payment');
    setNotice('Endereço de demonstração salvo.');
  }
  function pay(method: DemoPayment) {
    if (!lines.length || !session.address) return;
    dispatch({ slug, type: 'pay', method, time: Date.now() });
    setSelectedId(null);
    go('tracking');
    setNotice('Pedido de demonstração confirmado.');
  }

  return (
    <div className="gx-journey">
      <div
        className="gx-journey__body"
        ref={content}
        tabIndex={-1}
        aria-label="Conteúdo da vitrine"
      >
        {screen === 'menu' && (
          <DemoMenu
            slug={slug}
            bagCount={bagCount}
            addressLabel={
              session.address
                ? `${session.address.street}, ${session.address.number}`
                : 'Escolher endereço'
            }
            onAdd={(product, quantity) => {
              dispatch({ slug, type: 'add', id: product.id, quantity });
              setNotice(`${product.name} na sacola.`);
            }}
            onBag={() => go('bag')}
            onAddress={() => go('address')}
            onCoupon={() => go('coupons')}
          />
        )}
        {(screen === 'bag' || screen === 'address' || screen === 'payment') && (
          <DemoCheckout
            screen={screen}
            lines={lines}
            address={session.address}
            addressOrigin={addressOrigin}
            totals={totals}
            coupon={session.coupon}
            onQuantity={(id, quantity) => dispatch({ slug, type: 'quantity', id, quantity })}
            onAddress={saveAddress}
            onNavigate={go}
            onPay={pay}
          />
        )}
        {(screen === 'orders' || screen === 'tracking') && (
          <DemoOrders
            screen={screen}
            orders={session.orders}
            selectedId={selectedId ?? session.orders[0].id}
            storeName={store.name}
            onMenu={() => go('menu')}
            onOrders={() => go('orders')}
            onTrack={(id) => {
              setSelectedId(id);
              go('tracking');
            }}
            onClockChange={(id, clock) => dispatch({ slug, type: 'clock', id, clock })}
          />
        )}
        {screen === 'coupons' && (
          <section className="gx-demo-page">
            <h3>Meus cupons</h3>
            <p>Experimente um desconto no pedido de {store.name}.</p>
            <div className="gx-demo-coupon">
              <Ticket size={30} aria-hidden="true" />
              <strong>10% de desconto</strong>
              <p>Sobre o valor dos produtos. A taxa de entrega é calculada à parte.</p>
              <code>{couponCode}</code>
              <button
                className="gx-demo-action"
                type="button"
                onClick={() => {
                  dispatch({ slug, type: 'coupon', enabled: !session.coupon });
                  setNotice(session.coupon ? 'Cupom removido.' : 'Cupom aplicado à sacola.');
                }}
              >
                {session.coupon ? 'Remover cupom' : 'Aplicar cupom'}
              </button>
            </div>
            <button
              className="gx-demo-secondary"
              type="button"
              onClick={() => go(bagCount ? 'bag' : 'menu')}
            >
              {bagCount ? 'Ver minha sacola' : 'Escolher produtos'}
            </button>
          </section>
        )}
        {screen === 'account' && (
          <section className="gx-demo-page">
            <h3>{session.loggedIn ? 'Minha conta' : 'Entrar na minha conta'}</h3>
            {session.loggedIn ? (
              <>
                <p>Olá, Marina Costa. Você entrou com o perfil fictício desta loja.</p>
                <button className="gx-demo-action" type="button" onClick={() => go('orders')}>
                  Ver meus pedidos
                </button>
                <button
                  className="gx-demo-secondary"
                  type="button"
                  onClick={() => {
                    dispatch({ slug, type: 'login', enabled: false });
                    setShowPassword(false);
                    setNotice('Perfil desconectado.');
                  }}
                >
                  Sair da conta de exemplo
                </button>
              </>
            ) : (
              <>
                <p>Os dados fictícios de Marina já estão preenchidos para você testar o login.</p>
                <form
                  className="gx-demo-login"
                  autoComplete="off"
                  onSubmit={(event) => {
                    event.preventDefault();
                    dispatch({ slug, type: 'login', enabled: true });
                    setNotice('Login de demonstração concluído.');
                  }}
                >
                  <label>
                    E-mail de exemplo
                    <input value="marina@example.test" type="email" readOnly />
                  </label>
                  <label>
                    Senha de exemplo
                    <input type={showPassword ? 'text' : 'password'} value="VitrineDemo" readOnly />
                  </label>
                  <button
                    className="gx-demo-secret"
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    {showPassword ? 'Ocultar senha' : 'Ver senha de exemplo'}
                  </button>
                  <button className="gx-demo-action" type="submit">
                    Entrar com a conta de exemplo
                  </button>
                </form>
              </>
            )}
          </section>
        )}
      </div>
      {notice && (
        <p className="gx-journey__notice" role="status">
          {notice}
        </p>
      )}
      <nav className="gx-journey__nav" aria-label="Navegação da vitrine">
        {navigation.map(({ screen: target, label, icon: Icon }) => (
          <button
            key={target}
            type="button"
            aria-current={target === tab ? 'page' : undefined}
            aria-label={target === 'bag' ? `Sacola, ${itemCountLabel(bagCount)}` : label}
            onClick={() => go(target)}
          >
            <span>
              <Icon size={20} aria-hidden="true" />
              {target === 'bag' && bagCount > 0 && <b>{bagCount}</b>}
            </span>
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
