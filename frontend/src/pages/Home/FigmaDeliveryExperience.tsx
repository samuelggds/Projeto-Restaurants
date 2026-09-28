import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  Clock3,
  MapPin,
  Phone,
  Home,
  List,
  Search,
  ShoppingBag,
  UserRound,
  UtensilsCrossed,
} from 'lucide-react';
import { ComboConfigurator } from './components/ComboConfigurator';
import { FacebookIcon, InstagramIcon } from './components/SocialBrandIcons';
import { ProductConfigurator } from './components/ProductConfigurator';
import { CustomerDesktopFooter } from './components/CustomerDesktopFooter';
import { FloatingWhatsAppPortal } from './Home.whatsapp';
import { WhatsAppIcon } from './components/SocialBrandIcons';
import { getFeaturedProducts } from './domain/featuredProducts';
import { buildSocialProfileUrl } from './domain/publicSettings';
import type { HomePageProps, HomeProduct } from './types';
import * as S from './FigmaDeliveryExperience.styles';

const money = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function productImage(product: HomeProduct) {
  return product.image ? <img src={product.image} alt={product.name} loading="lazy" decoding="async" /> : <UtensilsCrossed />;
}

function categoryImage(image: string, name: string) {
  return image ? <img src={image} alt="" loading="lazy" decoding="async" /> : <UtensilsCrossed aria-label={name} />;
}

function formatHours(data: HomePageProps['data']) {
  const enabled = (data.businessHours || []).filter((entry) => entry.enabled);
  if (!enabled.length) return '';
  if (enabled.length === 1) {
    return `${enabled[0].label}: ${enabled[0].openingTime} - ${enabled[0].closingTime}`;
  }
  return enabled
    .slice(0, 2)
    .map((entry) => `${entry.label}: ${entry.openingTime} - ${entry.closingTime}`)
    .join(' · ');
}

export function FigmaDeliveryExperience({
  data,
  cartCount = 0,
  cart = [],
  cartTotal = 0,
  initialSearchOpen = false,
  userName,
  userLoggedIn = false,
  onOpenProfile,
  onOpenOrders,
  onOpenCart,
  onAddProduct,
  onSelectCategory,
  whatsappUrl,
  whatsappLabel,
}: HomePageProps) {
  const primary = data.brand.primaryColor || '#e85a2b';
  const [view, setView] = useState<'home' | 'menu'>('home');
  const [categoryId, setCategoryId] = useState(
    data.categories.find((category) => category.id !== 'todos')?.id || 'todos',
  );
  const [selectedProduct, setSelectedProduct] = useState<HomeProduct | null>(null);
  const [selectedCombo, setSelectedCombo] = useState<HomeProduct | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(Boolean(initialSearchOpen));
  const [mobileSearchOpen, setMobileSearchOpen] = useState(Boolean(initialSearchOpen));
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const mobileSearchTriggerRef = useRef<HTMLButtonElement>(null);
  const cartFabRef = useRef<HTMLButtonElement>(null);
  const cartFabDragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);
  const cartFabDidDragRef = useRef(false);
  const [cartFabPosition, setCartFabPosition] = useState<{ x: number; y: number } | null>(null);

  const availableProducts = useMemo(
    () => data.products.filter((product) => product.available),
    [data.products],
  );
  const categories = useMemo(
    () => data.categories.filter((category) => category.id !== 'todos'),
    [data.categories],
  );
  const promoted = useMemo(
    () => getFeaturedProducts(availableProducts.filter((product) => product.kind !== 'COMBO')),
    [availableProducts],
  );
  const combos = useMemo(
    () => availableProducts.filter((product) => product.kind === 'COMBO'),
    [availableProducts],
  );
  const highlightedProducts = useMemo(
    () =>
      [...promoted, ...combos]
        .filter(
          (product, index, values) =>
            values.findIndex((candidate) => candidate.id === product.id) === index,
        )
        .slice(0, 4),
    [combos, promoted],
  );
  const homePreviewProducts = highlightedProducts.length
    ? highlightedProducts
    : availableProducts.slice(0, 4);
  const homePreviewTitle = highlightedProducts.length ? 'Destaques do Cardápio' : 'Cardápio';
  const menuProducts = useMemo(
    () =>
      categoryId === 'todos'
        ? (highlightedProducts.length ? highlightedProducts : availableProducts)
        : availableProducts.filter((product) => product.categoryId === categoryId),
    [availableProducts, categoryId, highlightedProducts],
  );
  const currentCategory = data.categories.find((category) => category.id === categoryId);
  const activeBanner = data.banners.find((banner) => banner.active) || data.banners[0];
  const heroImage = activeBanner?.image || data.hero.image;
  const heroTitle = activeBanner?.title || data.hero.title;
  const heroHighlight = activeBanner?.highlight || data.hero.highlight;
  const heroDescription = activeBanner?.description || data.hero.description;
  const hours = formatHours(data);
  const normalizeSearchText = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('pt-BR')
      .trim();
  const normalizedSearch = normalizeSearchText(searchQuery);
  const searchResults = useMemo(
    () =>
      normalizedSearch
        ? availableProducts
            .filter((product) => normalizeSearchText(product.name).includes(normalizedSearch))
            .slice(0, 6)
        : [],
    [availableProducts, normalizedSearch],
  );

  useEffect(() => {
    if (!initialSearchOpen) return;
    const frame = window.requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [initialSearchOpen]);

  useEffect(() => {
    if (!mobileSearchOpen) return;

    const closeSearchOnOutsidePointer = (event: PointerEvent) => {
      if (searchContainerRef.current?.contains(event.target as Node)) return;
      setMobileSearchOpen(false);
      setSearchFocused(false);
      setSearchQuery('');
      searchInputRef.current?.blur();
    };

    document.addEventListener('pointerdown', closeSearchOnOutsidePointer);
    return () => document.removeEventListener('pointerdown', closeSearchOnOutsidePointer);
  }, [mobileSearchOpen]);

  const clampCartFabPosition = (x: number, y: number) => {
    const fab = cartFabRef.current;
    const width = fab?.offsetWidth || 56;
    const height = fab?.offsetHeight || 56;
    const margin = 8;

    return {
      x: Math.min(Math.max(x, margin), Math.max(margin, window.innerWidth - width - margin)),
      y: Math.min(Math.max(y, margin), Math.max(margin, window.innerHeight - height - margin)),
    };
  };

  const startCartFabDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    cartFabDidDragRef.current = false;
    cartFabDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: rect.left,
      originY: rect.top,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveCartFab = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = cartFabDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(deltaX, deltaY) > 4) {
      drag.moved = true;
      cartFabDidDragRef.current = true;
    }
    if (!drag.moved) return;

    setCartFabPosition(clampCartFabPosition(drag.originX + deltaX, drag.originY + deltaY));
  };

  const finishCartFabDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = cartFabDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    cartFabDragRef.current = null;
  };


  const openProduct = (product: HomeProduct) => {
    if (product.kind === 'COMBO') {
      setSelectedCombo(product);
      return;
    }
    if (product.saleMode === 'COMPLETE') {
      onAddProduct?.(product.id, {
        selectedOptions: [],
        selectedOptionIds: [],
        observation: '',
        configurationVersion: product.configurationVersion,
      }, 1);
      return;
    }
    setSelectedProduct(product);
  };

  const goHome = () => {
    setView('home');
    setCategoryId('todos');
    setSearchQuery('');
    setSearchFocused(false);
    setMobileSearchOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const chooseCategory = (id: string) => {
    setCategoryId(id);
    setView('menu');
    onSelectCategory?.(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <S.Page $primary={primary}>
      <S.Header>
        <div className="header-left">
          {view === 'menu' ? (
            <button className="mobile-back" type="button" aria-label="Voltar para a Home" onClick={goHome}>
              <ChevronLeft aria-hidden="true" />
            </button>
          ) : null}

          <button className="brand" type="button" aria-label={`Voltar para a Home de ${data.brand.name}`} onClick={goHome}>
            <span className="logo">
              {data.brand.logoUrl ? <img src={data.brand.logoUrl} alt="" /> : data.brand.monogram || data.brand.name.slice(0, 1)}
            </span>
            <span className="brand-copy">
              <b>{data.brand.name}</b>
              <span className="status">
                <i /> {data.isOpen ? 'Aberto agora' : 'Fechado agora'}
                {data.deliveryTime ? ` · ${data.deliveryTime}` : ''}
              </span>
            </span>
          </button>
        </div>

        <S.InlineSearch
          ref={searchContainerRef}
          className={mobileSearchOpen ? 'mobile-open' : ''}
          onFocus={() => setSearchFocused(true)}
          onBlur={(event) => {
            if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
            setSearchFocused(false);
          }}
        >
          <Search aria-hidden="true" />
          <input
            ref={searchInputRef}
            type="search"
            value={searchQuery}
            autoComplete="off"
            aria-label="Pesquisar produto pelo nome"
            placeholder={`Buscar no cardápio de ${data.brand.name}...`}
            onChange={(event) => setSearchQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Escape') return;
              setSearchQuery('');
              setSearchFocused(false);
              searchInputRef.current?.blur();
              if (mobileSearchOpen) {
                setMobileSearchOpen(false);
                window.requestAnimationFrame(() => mobileSearchTriggerRef.current?.focus());
              }
            }}
          />
          {searchQuery ? (
            <button
              className="clear"
              type="button"
              aria-label="Limpar busca"
              onClick={() => {
                setSearchQuery('');
                searchInputRef.current?.focus();
              }}
            >
              ×
            </button>
          ) : null}

          {searchFocused && normalizedSearch ? (
            <S.InlineSearchResults aria-label="Produtos encontrados">
              {searchResults.length ? (
                searchResults.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      setSearchQuery('');
                      setSearchFocused(false);
                      setMobileSearchOpen(false);
                      openProduct(product);
                    }}
                  >
                    <span className="thumb">{productImage(product)}</span>
                    <span className="copy">
                      <b>{product.name}</b>
                      {product.description ? <small>{product.description}</small> : null}
                      <strong>{money(product.price)}</strong>
                    </span>
                  </button>
                ))
              ) : (
                <span className="empty">Nenhum produto encontrado.</span>
              )}
            </S.InlineSearchResults>
          ) : null}
        </S.InlineSearch>

        <button
          ref={mobileSearchTriggerRef}
          className="mobile-header-search"
          type="button"
          aria-label="Buscar no cardápio"
          onClick={() => {
            setMobileSearchOpen(true);
            window.requestAnimationFrame(() => searchInputRef.current?.focus());
          }}
        >
          <Search aria-hidden="true" />
        </button>

        <div className="actions">
          <button className="account" type="button" aria-label="Minha conta" onClick={onOpenProfile}>
            <UserRound size={20} />
            <span>{userLoggedIn && userName ? `Olá, ${userName.split(' ')[0]}` : 'Olá, Entrar'}</span>
          </button>
          <button
            className="cart"
            type="button"
            aria-label={`Meu Carrinho, ${cartCount} ${cartCount === 1 ? 'item' : 'itens'}`}
            onClick={onOpenCart}
          >
            <ShoppingBag size={18} />
            <span>Meu Carrinho</span>
            {cartCount > 0 ? <i>{cartCount}</i> : null}
          </button>
        </div>
      </S.Header>

      {view === 'menu' ? (
        <S.Breadcrumb aria-label="Navegação do cardápio">
          <button type="button" onClick={goHome}>Início</button>
          <span aria-hidden="true">›</span>
          <span>Cardápio</span>
          {categoryId !== 'todos' && currentCategory?.name ? (
            <>
              <span aria-hidden="true">›</span>
              <span>{currentCategory.name}</span>
            </>
          ) : null}
        </S.Breadcrumb>
      ) : null}

      {view === 'home' ? (
        <>
          <S.Hero role="region" aria-label="Promoções do restaurante">
            {heroImage ? <img src={heroImage} alt="" /> : null}
            <div className="overlay" />
            <div className="copy">
              {heroTitle ? <small>{heroTitle}</small> : null}
              {heroHighlight ? (
                <h1>{heroHighlight}</h1>
              ) : heroTitle ? (
                <h1>{heroTitle}</h1>
              ) : null}
              {heroDescription ? <p>{heroDescription}</p> : null}
              <button type="button" onClick={() => setView('menu')}>
                {activeBanner?.buttonLabel || 'Ver cardápio'}
              </button>
            </div>
          </S.Hero>

          <S.Main>
            <S.InfoChips>
              {data.deliveryTime ? <span><Clock3 size={16} /> Entrega em <b>{data.deliveryTime}</b></span> : null}
              {Number(data.deliveryFee || 0) > 0 ? (
                <span>🛵 Taxa <b>{money(Number(data.deliveryFee))}</b></span>
              ) : data.acceptsDelivery ? (
                <span>🛵 <b>Entrega disponível</b></span>
              ) : null}
              {data.minimumOrder > 0 ? (
                <span>Pedido mínimo: <b>{money(data.minimumOrder)}</b></span>
              ) : null}
              {data.freeDeliveryFrom > 0 ? (
                <span>Frete grátis acima de <b>{money(data.freeDeliveryFrom)}</b></span>
              ) : null}
            </S.InfoChips>

            {categories.length ? (
              <S.Section>
                <S.SectionHead>
                  <div><h2>Categorias</h2><p>Escolha uma categoria para explorar o cardápio.</p></div>
                  <button type="button" onClick={() => chooseCategory('todos')}>Ver cardápio</button>
                </S.SectionHead>
                <S.Categories>
                  {categories.slice(0, 7).map((category) => (
                    <button key={category.id} type="button" onClick={() => chooseCategory(category.id)}>
                      <span className="image">{categoryImage(category.image, category.name)}</span>
                      <b>{category.name}</b>
                    </button>
                  ))}
                </S.Categories>
              </S.Section>
            ) : null}

            {homePreviewProducts.length ? (
              <S.Section
                role={promoted.length ? 'region' : undefined}
                aria-label={promoted.length ? 'Ofertas em destaque' : undefined}
              >
                <S.SectionHead>
                  <div>
                    <h2>{homePreviewTitle}</h2>
                    <p>
                      {promoted.length
                        ? `${promoted.length} ${promoted.length === 1 ? 'oferta disponível' : 'ofertas disponíveis'}`
                        : highlightedProducts.length
                          ? 'Combos disponíveis configurados pelo restaurante.'
                          : 'Uma prévia dos itens disponíveis no cardápio.'}
                    </p>
                  </div>
                  <button type="button" onClick={() => setView('menu')}>Ver todos</button>
                </S.SectionHead>
                <S.ProductGrid>
                  {homePreviewProducts.map((product) => (
                    <S.ProductCard key={product.id}>
                      {product.promotion?.active ? (
                        <span className="badge" data-offer-label="inline">
                          {product.promotion.badgeLabel}
                        </span>
                      ) : null}
                      <button
                        className="open"
                        type="button"
                        aria-label={`Ver detalhes de ${product.name}`}
                        onClick={() => openProduct(product)}
                      />
                      <div className="image">{productImage(product)}</div>
                      <div className="copy">
                        <h3>{product.name}</h3>
                        <p>{product.description}</p>
                        <div className="foot">
                          <span className="price">
                            {product.promotion?.active &&
                            Number(product.originalPrice) > Number(product.price) ? (
                              <del>{money(product.originalPrice)}</del>
                            ) : null}
                            <strong>{money(product.price)}</strong>
                          </span>
                          <button
                            className="add"
                            type="button"
                            aria-label={`Adicionar ${product.name}`}
                            onClick={() => openProduct(product)}
                          >
                            + Adicionar
                          </button>
                        </div>
                      </div>
                    </S.ProductCard>
                  ))}
                </S.ProductGrid>
              </S.Section>
            ) : null}

            {(data.brand.address || data.brand.phone || hours || data.brand.instagram || data.brand.facebook) ? (
              <S.RestaurantInfo>
                <div>
                  <h2>Informações do restaurante</h2>
                  <div className="rows">
                    {data.brand.address ? <div className="row"><MapPin size={17} /> <span>{data.brand.address}</span></div> : null}
                    {data.brand.phone ? <div className="row"><Phone size={17} /> <span>{data.brand.phone}</span></div> : null}
                    {hours ? <div className="row"><Clock3 size={17} /> <span>{hours}</span></div> : null}
                  </div>
                </div>
                <div>
                  <h2>Redes sociais</h2>
                  <div className="social">
                    {data.brand.instagram ? <a href={buildSocialProfileUrl('instagram', data.brand.instagram)} target="_blank" rel="noreferrer" aria-label="Instagram"><InstagramIcon /></a> : null}
                    {data.brand.facebook ? <a href={buildSocialProfileUrl('facebook', data.brand.facebook)} target="_blank" rel="noreferrer" aria-label="Facebook"><FacebookIcon /></a> : null}
                  </div>
                </div>
              </S.RestaurantInfo>
            ) : null}
          </S.Main>
        </>
      ) : (
        <S.MenuLayout>
          <S.MenuCategories>
            <h2>Categorias</h2>
            <button className={categoryId === 'todos' ? 'active' : ''} type="button" onClick={() => setCategoryId('todos')}>
              Destaques
            </button>
            {categories.map((category) => (
              <button className={categoryId === category.id ? 'active' : ''} key={category.id} type="button" onClick={() => setCategoryId(category.id)}>
                {category.name}
              </button>
            ))}
          </S.MenuCategories>

          <S.MenuProducts>
            <S.MenuCategoryBar aria-label="Categorias do cardápio">
              <button
                className={categoryId === 'todos' ? 'active' : ''}
                type="button"
                onClick={() => setCategoryId('todos')}
              >
                Destaques
              </button>
              {categories.slice(0, 6).map((category) => (
                <button
                  className={categoryId === category.id ? 'active' : ''}
                  key={category.id}
                  type="button"
                  onClick={() => setCategoryId(category.id)}
                >
                  {category.name}
                </button>
              ))}
            </S.MenuCategoryBar>

            <header>
              <h1>{categoryId === 'todos' ? 'Destaques' : currentCategory?.name || 'Cardápio'}</h1>
              <p>{menuProducts.length ? `${menuProducts.length} ${menuProducts.length === 1 ? 'item disponível' : 'itens disponíveis'}` : 'Nenhum item disponível nesta categoria.'}</p>
            </header>
            <div className="list">
              {menuProducts.map((product) => (
                <S.MenuProduct key={product.id}>
                  <button className="open" type="button" aria-label={`Ver detalhes de ${product.name}`} onClick={() => openProduct(product)} />
                  <div className="image">{productImage(product)}</div>
                  <div className="copy">
                    <h3>{product.name}</h3>
                    <p>{product.description}</p>
                    <div className="foot">
                      <strong>{money(product.price)}</strong>
                      <button className="add" type="button" aria-label={`Adicionar ${product.name}`} onClick={() => openProduct(product)}>+</button>
                    </div>
                  </div>
                </S.MenuProduct>
              ))}
            </div>
          </S.MenuProducts>

          <S.MiniCart>
            <h3>Seu Pedido {cartCount ? `(${cartCount} ${cartCount === 1 ? 'item' : 'itens'})` : ''}</h3>
            {cart.length ? (
              <>
                <div className="items">
                  {cart.map((item) => (
                    <div className="item" key={item.cartId || item.productId}>
                      <span>{item.quantity}x {item.name}</span>
                      <strong>{money(item.price * item.quantity)}</strong>
                    </div>
                  ))}
                </div>
                <div className="subtotal">
                  <span>Subtotal</span>
                  <strong>{money(cartTotal)}</strong>
                </div>
              </>
            ) : (
              <p>Seu carrinho está vazio.</p>
            )}
            <button type="button" disabled={!cartCount} onClick={onOpenCart}>Continuar</button>
          </S.MiniCart>
        </S.MenuLayout>
      )}

      <S.MobileCartFab
        ref={cartFabRef}
        type="button"
        aria-label={`Meu Carrinho, ${cartCount} ${cartCount === 1 ? 'item' : 'itens'}`}
        style={
          cartFabPosition
            ? { left: cartFabPosition.x, top: cartFabPosition.y, right: 'auto', bottom: 'auto' }
            : undefined
        }
        onPointerDown={startCartFabDrag}
        onPointerMove={moveCartFab}
        onPointerUp={finishCartFabDrag}
        onPointerCancel={finishCartFabDrag}
        onClick={() => {
          if (cartFabDidDragRef.current) {
            cartFabDidDragRef.current = false;
            return;
          }
          onOpenCart?.();
        }}
      >
        <ShoppingBag aria-hidden="true" />
        {cartCount > 0 ? <span>{cartCount}</span> : null}
      </S.MobileCartFab>

      <S.MobileBottomNav aria-label="Navegação principal">
        <button className="active" type="button" onClick={() => setView('home')}>
          <Home aria-hidden="true" />
          <span>Início</span>
        </button>
        <button type="button" onClick={onOpenOrders}>
          <List aria-hidden="true" />
          <span>Pedidos</span>
        </button>
        <button type="button" onClick={onOpenProfile}>
          <UserRound aria-hidden="true" />
          <span>Conta</span>
        </button>
      </S.MobileBottomNav>

      {view === 'home' && whatsappUrl ? (
        <FloatingWhatsAppPortal
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
          aria-label={`Falar com ${whatsappLabel || data.brand.name} no WhatsApp`}
          title={`Falar com ${whatsappLabel || data.brand.name} no WhatsApp`}
        >
          <WhatsAppIcon size={25} />
        </FloatingWhatsAppPortal>
      ) : null}

      <CustomerDesktopFooter
        restaurantName={data.brand.name}
        description={data.about}
        primaryColor={primary}
        phone={data.brand.phone}
        email={data.brand.email}
        onMenu={() => setView('menu')}
      />


      {selectedProduct ? (
        <ProductConfigurator
          product={selectedProduct}
          primaryColor={primary}
          enableProductQuantity
          onClose={() => setSelectedProduct(null)}
          onConfirm={(configuration, quantity) => {
            onAddProduct?.(selectedProduct.id, configuration, quantity || 1);
            setSelectedProduct(null);
          }}
        />
      ) : null}

      {selectedCombo ? (
        <ComboConfigurator
          product={selectedCombo}
          primaryColor={primary}
          onClose={() => setSelectedCombo(null)}
          onConfirm={(configuration) => {
            onAddProduct?.(selectedCombo.id, configuration, 1);
            setSelectedCombo(null);
          }}
        />
      ) : null}
    </S.Page>
  );
}
