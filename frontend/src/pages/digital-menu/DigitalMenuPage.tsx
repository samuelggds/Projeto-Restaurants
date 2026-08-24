import {
  BellRing,
  Clock3,
  Heart,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Star,
  UtensilsCrossed,
  WalletCards,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { digitalMenuMockData } from './data';
import * as S from './DigitalMenu.styles';
import type { CartItem, DigitalMenuProps, MenuProduct } from './types';
import { ProductConfigurator } from '../Home/components/ProductConfigurator';
import {
  normalizeProductOptionGroups,
  productConfigurationSignature,
  productConfigurationTotal,
  type ProductConfiguration,
} from '../Home/domain/productCustomization';

const brl = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const statusRank = { received: 0, preparing: 1, ready: 2 };
const actionWasConfirmed = (result: unknown) =>
  result === true ||
  (typeof result === 'object' && result !== null && (result as { ok?: unknown }).ok === true);

export function DigitalMenuPage({
  data = digitalMenuMockData,
  onCallWaiter,
  onRequestBill,
  onSubmitOrder,
}: DigitalMenuProps) {
  const [active, setActive] = useState(data.categories[0]?.id ?? '');
  const [query, setQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [drawer, setDrawer] = useState(false);
  const [notice, setNotice] = useState('');
  const [building, setBuilding] = useState<MenuProduct | null>(null);
  const [serviceLoading, setServiceLoading] = useState<'waiter' | 'bill' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const products = useMemo(
    () =>
      data.products.filter((product) => {
        const search = `${product.name} ${product.description}`
          .toLowerCase()
          .includes(query.toLowerCase());
        return search && (active === 'featured' || product.categoryId === active);
      }),
    [data.products, active, query],
  );
  const featured = products[0] ?? data.products[0];
  const recommendations = data.products.filter((x) => x.id !== featured?.id).slice(0, 3);
  const count = cart.reduce((sum, x) => sum + x.quantity, 0);
  const total = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const add = (product = featured) => {
    if (!product) return;
    setBuilding(product);
  };
  const confirmConfiguration = (product: MenuProduct, configuration: ProductConfiguration) => {
    const groups = normalizeProductOptionGroups(product);
    const selectedIds = new Set(configuration.selectedOptionIds);
    const options = groups.flatMap((group) =>
      group.options
        .filter((option) => selectedIds.has(option.id))
        .map((option) => ({
          id: option.id,
          groupName: group.name,
          name: option.name,
          price: option.price,
        })),
    );
    const cartId = `${product.id}::${productConfigurationSignature(configuration)}`;
    const unitPrice = productConfigurationTotal(
      product.price,
      groups,
      Object.fromEntries(
        configuration.selectedOptions.map((selection) => [selection.groupId, selection.optionIds]),
      ),
    );
    setCart((items) => {
      const found = items.find((item) => item.cartId === cartId);
      return found
        ? items.map((item) =>
            item.cartId === cartId ? { ...item, quantity: item.quantity + 1 } : item,
          )
        : [
            ...items,
            {
              cartId,
              product,
              quantity: 1,
              unitPrice,
              selectedOptionIds: configuration.selectedOptionIds,
              selectedOptions: configuration.selectedOptions,
              observation: configuration.observation,
              options,
            },
          ];
    });
    setBuilding(null);
    setNotice(`${product.name} adicionado`);
    window.setTimeout(() => setNotice(''), 1500);
  };
  const quantity = (cartId: string, change: number) =>
    setCart((items) =>
      items
        .map((item) =>
          item.cartId === cartId ? { ...item, quantity: item.quantity + change } : item,
        )
        .filter((x) => x.quantity > 0),
    );
  const service = async (kind: 'waiter' | 'bill') => {
    const callback = kind === 'waiter' ? onCallWaiter : onRequestBill;
    const enabled =
      kind === 'waiter' ? data.waiterCallEnabled !== false : data.billRequestEnabled !== false;

    if (!enabled || !callback) {
      setNotice(
        kind === 'waiter'
          ? 'O chamado ao garçom não está disponível neste cardápio.'
          : 'A solicitação da conta não está disponível neste cardápio.',
      );
      window.setTimeout(() => setNotice(''), 2200);
      return;
    }

    try {
      setServiceLoading(kind);
      const result = await callback();
      if (!actionWasConfirmed(result)) throw new Error('A solicitação não foi confirmada.');
      setNotice(kind === 'waiter' ? 'Garçom chamado com sucesso' : 'Conta solicitada com sucesso');
    } catch (error) {
      setNotice(
        error instanceof Error && error.message
          ? error.message
          : 'Não foi possível enviar a solicitação. Tente novamente.',
      );
    } finally {
      setServiceLoading(null);
      window.setTimeout(() => setNotice(''), 2200);
    }
  };
  return (
    <S.Root $primary={data.primaryColor ?? '#d64d08'}>
      <S.Sidebar>
        <div className="logo">{data.monogram}</div>
        <span className="brand">{data.restaurantName}</span>
        <nav>
          <button className="active">
            <UtensilsCrossed />
            Cardápio
          </button>
          <button>
            <Heart />
            Favoritos
          </button>
          <button onClick={() => setDrawer(true)}>
            <ShoppingBag />
            Pedidos
          </button>
        </nav>
      </S.Sidebar>
      <S.Content>
        <S.Top>
          <S.Table>
            <span>▦</span>
            <div>
              <b>Mesa {data.tableNumber}</b>
              <small>● Atendimento no salão</small>
            </div>
          </S.Table>
          <S.Search>
            <Search />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar pratos ou ingredientes"
            />
          </S.Search>
          <S.TopButton
            disabled={data.waiterCallEnabled === false || serviceLoading !== null}
            onClick={() => void service('waiter')}
          >
            <BellRing />
            Atendimento
          </S.TopButton>
          <S.TopButton $primary onClick={() => setDrawer(true)}>
            <ShoppingBag />
            Meu pedido <i>{count}</i>
          </S.TopButton>
        </S.Top>
        <h1>Escolha algo especial</h1>
        <S.Categories>
          {data.categories.map((category) => (
            <S.Category
              key={category.id}
              $active={active === category.id}
              onClick={() => setActive(category.id)}
            >
              <img src={category.image} alt="" />
              <b>{category.name}</b>
            </S.Category>
          ))}
        </S.Categories>
        {featured && (
          <S.MainGrid>
            <S.Featured>
              <img src={featured.image} alt={featured.name} />
              <S.FeaturedCopy>
                <button
                  className="heart"
                  onClick={() =>
                    setFavorites((x) =>
                      x.includes(featured.id)
                        ? x.filter((id) => id !== featured.id)
                        : [...x, featured.id],
                    )
                  }
                >
                  <Heart fill={favorites.includes(featured.id) ? 'currentColor' : 'none'} />
                </button>
                <h2>{featured.name}</h2>
                <S.Meta>
                  <span>
                    <Star className="star" />
                    {featured.rating}
                  </span>
                  <span>
                    <Clock3 />
                    {featured.preparationTime}
                  </span>
                </S.Meta>
                <p>{featured.description}</p>
                <S.Tag>⚙ Monte do seu jeito</S.Tag>
                <footer>
                  <strong>{brl(featured.price)}</strong>
                  <button onClick={() => add()}>
                    Adicionar <Plus />
                  </button>
                </footer>
              </S.FeaturedCopy>
            </S.Featured>
            <ServiceCard
              status={data.orderStatus}
              waiter={() => void service('waiter')}
              bill={() => void service('bill')}
              waiterEnabled={data.waiterCallEnabled !== false && Boolean(onCallWaiter)}
              billEnabled={data.billRequestEnabled !== false && Boolean(onRequestBill)}
              loading={serviceLoading}
            />
          </S.MainGrid>
        )}
        <h3>Recomendados para você</h3>
        <S.Products>
          {recommendations.map((product) => (
            <article
              key={product.id}
              role="button"
              tabIndex={0}
              onClick={() => add(product)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') add(product);
              }}
            >
              <img src={product.image} alt={product.name} />
              <b>{product.name}</b>
              <strong>{brl(product.price)}</strong>
            </article>
          ))}
        </S.Products>
      </S.Content>
      <S.OrderBar>
        <b>Pedido da Mesa {data.tableNumber}</b>
        <span>{count} itens</span>
        <strong>{brl(total)}</strong>
        <button onClick={() => setDrawer(true)}>Revisar pedido ›</button>
      </S.OrderBar>
      {drawer && (
        <CartDrawer
          cart={cart}
          total={total}
          close={() => setDrawer(false)}
          quantity={quantity}
          submitting={submitting}
          submit={async () => {
            if (data.tableOrderingEnabled === false || !onSubmitOrder) {
              setNotice('O envio de pedidos não está disponível neste cardápio.');
              window.setTimeout(() => setNotice(''), 2200);
              return;
            }

            try {
              setSubmitting(true);
              const result = await onSubmitOrder(cart);
              if (!actionWasConfirmed(result))
                throw new Error('O pedido não foi confirmado pelo restaurante.');
              setNotice('Pedido enviado para a cozinha');
              setCart([]);
              setDrawer(false);
            } catch (error) {
              setNotice(
                error instanceof Error && error.message
                  ? error.message
                  : 'Não foi possível enviar o pedido. Confira sua conexão e tente novamente.',
              );
            } finally {
              setSubmitting(false);
              window.setTimeout(() => setNotice(''), 2400);
            }
          }}
        />
      )}
      {notice && <S.Notice>{notice}</S.Notice>}
      {building && (
        <ProductConfigurator
          product={building}
          primaryColor={data.primaryColor}
          onClose={() => setBuilding(null)}
          onConfirm={(configuration) => confirmConfiguration(building, configuration)}
        />
      )}
    </S.Root>
  );
}

function ServiceCard({
  status,
  waiter,
  bill,
  waiterEnabled,
  billEnabled,
  loading,
}: {
  status: 'received' | 'preparing' | 'ready';
  waiter: () => void;
  bill: () => void;
  waiterEnabled: boolean;
  billEnabled: boolean;
  loading: 'waiter' | 'bill' | null;
}) {
  const current = statusRank[status];
  return (
    <S.Service>
      <h2>Seu atendimento</h2>
      <S.Progress>
        {['Recebido', 'Em preparo', 'Pronto para servir'].map((label, index) => (
          <span key={label} style={{ display: 'contents' }}>
            <S.Step $state={index < current ? 'done' : index === current ? 'active' : 'idle'}>
              <i>{index === 0 ? '✓' : index === 1 ? '♨' : '⌒'}</i>
              <span>{label}</span>
            </S.Step>
            {index < 2 && <S.Line $done={index < current} />}
          </span>
        ))}
      </S.Progress>
      <S.ServiceActions>
        <button disabled={!waiterEnabled || loading !== null} onClick={waiter}>
          <BellRing />
          {loading === 'waiter' ? 'Enviando...' : 'Chamar garçom'}
        </button>
        <button disabled={!billEnabled || loading !== null} onClick={bill}>
          <WalletCards />
          {loading === 'bill' ? 'Enviando...' : 'Pedir a conta'}
        </button>
      </S.ServiceActions>
    </S.Service>
  );
}

function CartDrawer({
  cart,
  total,
  close,
  quantity,
  submit,
  submitting,
}: {
  cart: CartItem[];
  total: number;
  close: () => void;
  quantity: (id: string, n: number) => void;
  submit: () => void | Promise<void>;
  submitting: boolean;
}) {
  return (
    <S.Overlay onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <S.Drawer>
        <header>
          <h2>Pedido da mesa</h2>
          <button onClick={close}>
            <X />
          </button>
        </header>
        {cart.length === 0 ? (
          <p style={{ textAlign: 'center', marginTop: 50, color: 'var(--muted)' }}>
            Seu pedido ainda está vazio.
          </p>
        ) : (
          cart.map((item) => (
            <div className="cart-item" key={item.cartId}>
              <img src={item.product.image} alt="" />
              <div>
                <b>{item.product.name}</b>
                <span>{brl(item.unitPrice)}</span>
                {item.options.length > 0 && (
                  <ul className="cart-options">
                    {item.options.map((option) => (
                      <li key={option.id}>
                        <b>{option.groupName}:</b> {option.name}
                      </li>
                    ))}
                  </ul>
                )}
                {item.observation && (
                  <small className="cart-observation">Obs.: {item.observation}</small>
                )}
              </div>
              <div className="quantity">
                <button onClick={() => quantity(item.cartId, -1)}>
                  <Minus size={14} />
                </button>
                <b>{item.quantity}</b>
                <button onClick={() => quantity(item.cartId, 1)}>
                  <Plus size={14} />
                </button>
              </div>
            </div>
          ))
        )}
        <footer>
          <div>
            <b>Total</b>
            <strong>{brl(total)}</strong>
          </div>
          <button disabled={!cart.length || submitting} onClick={() => void submit()}>
            {submitting ? 'Enviando pedido...' : 'Enviar pedido para a cozinha'}
          </button>
        </footer>
      </S.Drawer>
    </S.Overlay>
  );
}
