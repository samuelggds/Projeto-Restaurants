import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Clock3,
  MapPin,
  Phone,
  Home,
  List,
  Search,
  ShoppingBag,
  Star,
  UserRound,
  UtensilsCrossed,
} from 'lucide-react';
import { ComboConfigurator } from './components/ComboConfigurator';
import { FacebookIcon, InstagramIcon } from './components/SocialBrandIcons';
import { ProductConfigurator } from './components/ProductConfigurator';
import { PromotionCarousel } from './components/PromotionCarousel';
import { CustomerDesktopFooter } from './components/CustomerDesktopFooter';
import { FloatingWhatsAppPortal } from './Home.whatsapp';
import { WhatsAppIcon } from './components/SocialBrandIcons';
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


function ProductCarouselSection({
  title,
  description,
  products,
  onOpenProduct,
  className = '',
  sectionId,
  ariaLabel,
  itemLabel,
}: {
  title: string;
  description?: string;
  products: HomeProduct[];
  onOpenProduct: (product: HomeProduct) => void;
  className?: string;
  sectionId?: string;
  ariaLabel?: string;
  itemLabel?: string | ((product: HomeProduct) => string);
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [canScrollPrevious, setCanScrollPrevious] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const syncScrollState = () => {
    const track = trackRef.current;
    if (!track) return;
    const overflow = track.scrollWidth - track.clientWidth > 2;
    const maxScrollLeft = Math.max(0, track.scrollWidth - track.clientWidth);
    setHasOverflow(overflow);
    setCanScrollPrevious(overflow && track.scrollLeft > 2);
    setCanScrollNext(overflow && track.scrollLeft < maxScrollLeft - 2);
  };

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;

    syncScrollState();
    const resizeObserver = new ResizeObserver(syncScrollState);
    resizeObserver.observe(track);
    Array.from(track.children).forEach((child) => resizeObserver.observe(child));
    track.addEventListener('scroll', syncScrollState, { passive: true });

    return () => {
      resizeObserver.disconnect();
      track.removeEventListener('scroll', syncScrollState);
    };
  }, [products]);

  const scroll = (direction: -1 | 1) => {
    const track = trackRef.current;
    if (!track) return;
    const firstCard = track.querySelector<HTMLElement>('[data-product-carousel-card]');
    const gap = Number.parseFloat(window.getComputedStyle(track).columnGap || '0') || 0;
    const amount = firstCard ? firstCard.offsetWidth + gap : Math.max(track.clientWidth * 0.82, 260);
    track.scrollBy({ left: direction * amount, behavior: 'smooth' });
  };

  if (!products.length) return null;

  return (
    <S.Section
      id={sectionId}
      className={`products-section product-carousel-section mobile-separated ${className}`.trim()}
      role={ariaLabel ? 'region' : undefined}
      aria-label={ariaLabel}
    >
      <S.SectionHead>
        <div>
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
        {hasOverflow ? (
          <S.CarouselControls aria-label={`Navegar em ${title}`}>
            <button
              type="button"
              aria-label={`Ver itens anteriores de ${title}`}
              onClick={() => scroll(-1)}
              disabled={!canScrollPrevious}
            >
              <ChevronLeft aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label={`Ver próximos itens de ${title}`}
              onClick={() => scroll(1)}
              disabled={!canScrollNext}
            >
              <ChevronRight aria-hidden="true" />
            </button>
          </S.CarouselControls>
        ) : null}
      </S.SectionHead>

      <S.ProductGrid ref={trackRef}>
        {products.map((product) => {
          const label =
            typeof itemLabel === 'function'
              ? itemLabel(product)
              : itemLabel || (product.kind === 'COMBO' ? 'Combo' : '');

          return (
            <S.ProductCard key={product.id} data-product-carousel-card>
              <button
                className="open"
                type="button"
                aria-label={`Ver detalhes de ${product.name}`}
                onClick={() => onOpenProduct(product)}
              />
              <div className="image">{productImage(product)}</div>
              <div className="copy">
                <div className="product-copy">
                  {label ? <span className="product-label">{label}</span> : null}
                  <h3>{product.name}</h3>
                  <p>{product.description}</p>
                </div>
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
                    onClick={() => onOpenProduct(product)}
                  >
                    + Adicionar
                  </button>
                </div>
              </div>
            </S.ProductCard>
          );
        })}
      </S.ProductGrid>
    </S.Section>
  );
}

export function FigmaDeliveryExperience({
  data,
  cartCount = 0,
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
  const featured = useMemo(
    () =>
      availableProducts.filter(
        (product) => product.kind !== 'COMBO' && product.featured === true,
      ),
    [availableProducts],
  );
  const combos = useMemo(
    () => availableProducts.filter((product) => product.kind === 'COMBO'),
    [availableProducts],
  );
  const categoryCarousels = useMemo(
    () =>
      categories
        .map((category) => ({
          category,
          products: availableProducts.filter(
            (product) => product.categoryId === category.id && product.kind !== 'COMBO',
          ),
        }))
        .filter((section) => section.products.length > 0),
    [availableProducts, categories],
  );
  const visibleCategories = useMemo(
    () => categoryCarousels.map((section) => section.category),
    [categoryCarousels],
  );
  const promotionBanners = useMemo(() => {
    const configured = data.banners
      .filter((banner) => banner.active)
      .sort((left, right) => Number(left.position || 0) - Number(right.position || 0));

    if (configured.length) return configured;

    return data.hero.image
      ? [
          {
            id: -1,
            title: data.hero.title,
            highlight: data.hero.highlight,
            description: data.hero.description,
            buttonLabel: 'Ver cardápio',
            image: data.hero.image,
            active: true,
            position: 0,
          },
        ]
      : [];
  }, [data.banners, data.hero]);
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
    setSearchQuery('');
    setSearchFocused(false);
    setMobileSearchOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToSection = (sectionId: string) => {
    const target = document.getElementById(sectionId);
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const chooseCategory = (id: string) => {
    onSelectCategory?.(id);
    const category = categories.find((item) => item.id === id);
    const isComboCategory = String(category?.name || id)
      .trim()
      .toLocaleLowerCase('pt-BR')
      .includes('combo');

    scrollToSection(
      isComboCategory ? 'home-combos' : `home-category-${encodeURIComponent(id)}`,
    );
  };

  const openFullMenu = () => {
    const firstSectionId =
      featured.length > 0
        ? 'home-featured'
        : combos.length > 0
          ? 'home-combos'
          : categoryCarousels[0]?.category.id
            ? `home-category-${encodeURIComponent(categoryCarousels[0].category.id)}`
            : 'home-categories';
    scrollToSection(firstSectionId);
  };

  return (
    <S.Page $primary={primary} className={selectedProduct ? 'product-open' : undefined}>
      <S.Header>
        <div className="header-left">
          <button className="brand" type="button" aria-label={`Voltar para a Home de ${data.brand.name}`} onClick={goHome}>
            <span className="logo">
              {data.brand.logoUrl ? <img src={data.brand.logoUrl} alt="" /> : data.brand.monogram || data.brand.name.slice(0, 1)}
            </span>
            <span className="brand-copy">
              <b>{data.brand.name}</b>
              <span
                className="status"
                role="status"
                aria-label={data.isOpen ? 'Aberto agora.' : 'Fechado agora.'}
              >
                <i className={data.isOpen ? 'open' : ''} /> {data.isOpen ? 'Aberto agora' : 'Fechado agora'}
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

      {selectedProduct ? (
        <ProductConfigurator
          product={selectedProduct}
          primaryColor={primary}
          enableProductQuantity
          embedded
          customerPageVariant
          onClose={() => setSelectedProduct(null)}
          onConfirm={(configuration, quantity) => {
            onAddProduct?.(selectedProduct.id, configuration, quantity || 1);
            setSelectedProduct(null);
          }}
        />
      ) : (
        <>
          {promotionBanners.length ? (
            <S.HeroCarousel>
              <PromotionCarousel banners={promotionBanners} onOpenMenu={openFullMenu} />
            </S.HeroCarousel>
          ) : null}

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

            {(featured.length > 0 || combos.length > 0 || visibleCategories.length > 0) ? (
              <S.CatalogCategories id="home-categories" aria-label="Categorias do cardápio">
                {featured.length > 0 ? (
                  <button type="button" className="active" onClick={() => scrollToSection('home-featured')}>
                    <span className="image featured-icon"><Star aria-hidden="true" /></span>
                    <b>Destaques</b>
                  </button>
                ) : null}
                {combos.length > 0 ? (
                  <button type="button" onClick={() => scrollToSection('home-combos')}>
                    <span className="image">
                      {combos[0]?.image ? categoryImage(combos[0].image, 'Combos') : <UtensilsCrossed aria-hidden="true" />}
                    </span>
                    <b>Combos</b>
                  </button>
                ) : null}
                {visibleCategories.map((category) => (
                  <button key={category.id} type="button" onClick={() => chooseCategory(category.id)}>
                    <span className="image">{categoryImage(category.image, category.name)}</span>
                    <b>{category.name}</b>
                  </button>
                ))}
              </S.CatalogCategories>
            ) : null}

            <ProductCarouselSection
              title="Mais Pedidos em Destaque"
              products={featured}
              onOpenProduct={openProduct}
              className="featured-carousel"
              sectionId="home-featured"
              ariaLabel="Produtos em destaque"
              itemLabel="Destaque"
            />

            <ProductCarouselSection
              title="Combos"
              products={combos}
              onOpenProduct={openProduct}
              className="combos-carousel"
              sectionId="home-combos"
              itemLabel="Combo"
            />

            {categoryCarousels.map(({ category, products }) => (
              <ProductCarouselSection
                key={category.id}
                title={category.name}
                products={products}
                onOpenProduct={openProduct}
                className="category-product-carousel"
                sectionId={`home-category-${encodeURIComponent(category.id)}`}
                itemLabel={category.name}
              />
            ))}

            {(data.brand.address || data.brand.phone || hours || data.brand.instagram || data.brand.facebook || whatsappUrl) ? (
              <S.RestaurantInfo aria-label="Informações do restaurante">
                {data.brand.address ? (
                  <div className="info-item address">
                    <span className="info-icon"><MapPin aria-hidden="true" /></span>
                    <span>{data.brand.address}</span>
                  </div>
                ) : null}

                {data.brand.phone ? (
                  <div className="info-item phone">
                    <span className="info-icon"><Phone aria-hidden="true" /></span>
                    <span>{data.brand.phone}</span>
                  </div>
                ) : null}

                {hours ? (
                  <div className="info-item hours">
                    <span className="info-icon"><Clock3 aria-hidden="true" /></span>
                    <span>{hours}</span>
                  </div>
                ) : null}

                {(data.brand.instagram || data.brand.facebook || whatsappUrl) ? (
                  <div className="social-row">
                    <span className="social-label">Redes sociais</span>
                    <div className="social">
                      {data.brand.instagram ? (
                        <a
                          href={buildSocialProfileUrl('instagram', data.brand.instagram)}
                          target="_blank"
                          rel="noreferrer"
                          aria-label="Instagram"
                        >
                          <InstagramIcon />
                        </a>
                      ) : null}
                      {data.brand.facebook ? (
                        <a
                          href={buildSocialProfileUrl('facebook', data.brand.facebook)}
                          target="_blank"
                          rel="noreferrer"
                          aria-label="Facebook"
                        >
                          <FacebookIcon />
                        </a>
                      ) : null}
                      {whatsappUrl ? (
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`WhatsApp de ${whatsappLabel || data.brand.name}`}
                        >
                          <WhatsAppIcon />
                        </a>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </S.RestaurantInfo>
            ) : null}
          </S.Main>

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
        <button className="active" type="button" onClick={goHome}>
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

      {whatsappUrl ? (
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
        onMenu={openFullMenu}
      />


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
        </>
      )}
    </S.Page>
  );
}
