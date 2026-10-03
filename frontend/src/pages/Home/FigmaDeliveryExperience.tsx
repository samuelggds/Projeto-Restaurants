import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bike,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CreditCard,
  MapPin,
  Phone,
  Home,
  List,
  Search,
  ShoppingBag,
  Star,
  Store,
  UserRound,
  UtensilsCrossed,
} from 'lucide-react';
import {
  FacebookIcon,
  InstagramIcon,
  TikTokIcon,
} from './components/SocialBrandIcons';
import { PromotionCarousel } from './components/PromotionCarousel';
import { CustomerDesktopFooter } from './components/CustomerDesktopFooter';
import { ReadyProductDetail } from './components/ReadyProductDetail';
import { FloatingWhatsAppPortal } from './Home.whatsapp';
import { WhatsAppIcon } from './components/SocialBrandIcons';
import {
  buildSocialProfileUrl,
  formatBusinessHoursSummary,
} from './domain/publicSettings';
import { resolveComboCategoryImage } from './domain/comboCategoryImage';
import { createReadyProductConfiguration, resolveProductEntryKind } from './domain/productEntryFlow';
import {
  captureCartFlyOrigin,
  scheduleProductToCartAnimation,
  type CartFlyOrigin,
} from './cartFlyAnimation';
import type { HomeExperienceProps, HomeProduct } from './types';
import { useHorizontalProductCarousel } from './hooks/useHorizontalProductCarousel';
import * as S from './FigmaDeliveryExperience.styles';

const ProductConfigurator = lazy(() =>
  import('./components/ProductConfigurator').then((module) => ({
    default: module.ProductConfigurator,
  })),
);

const ComboConfigurator = lazy(() =>
  import('./components/ComboConfigurator').then((module) => ({
    default: module.ComboConfigurator,
  })),
);

const money = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function formatDeliveryTime(value?: string) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const normalized = raw.replace(/^entrega\s+em\s+/i, '').trim();
  if (/\b(?:min|minuto|minutos|h|hora|horas)\b/i.test(normalized)) {
    return normalized;
  }

  if (/^\d+(?:\s*(?:[-–—]|a)\s*\d+)?$/i.test(normalized)) {
    return `${normalized.replace(/\s*[-–—]\s*/g, '-')} min`;
  }

  return normalized;
}

function productImage(product: HomeProduct) {
  return product.image ? <img src={product.image} alt={product.name} loading="lazy" decoding="async" /> : <UtensilsCrossed />;
}

function categoryImage(image: string, name: string) {
  return image ? <img src={image} alt="" loading="lazy" decoding="async" /> : <UtensilsCrossed aria-label={name} />;
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
  onViewAll,
}: {
  title: string;
  description?: string;
  products: HomeProduct[];
  onOpenProduct: (product: HomeProduct, sourceElement?: HTMLElement | null) => void;
  className?: string;
  sectionId?: string;
  ariaLabel?: string;
  itemLabel?: string | ((product: HomeProduct) => string);
  onViewAll?: () => void;
}) {
  const {
    trackRef,
    hasOverflow,
    canPrevious: canScrollPrevious,
    canNext: canScrollNext,
    scroll,
  } = useHorizontalProductCarousel({
    itemSelector: '[data-product-carousel-card]',
    itemsKey: products.map((product) => product.id).join('|'),
  });

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
        <S.SectionHeadActions>
          {onViewAll ? (
            <button className="view-all" type="button" onClick={onViewAll}>
              Ver todos →
            </button>
          ) : null}
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
        </S.SectionHeadActions>
      </S.SectionHead>

      <S.ProductGrid
        ref={trackRef}
        className={className.includes('featured-carousel') ? 'featured-product-grid' : undefined}
      >
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
                onClick={(event) =>
                  onOpenProduct(
                    product,
                    event.currentTarget.closest<HTMLElement>('[data-product-carousel-card]'),
                  )
                }
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
                    onClick={(event) =>
                      onOpenProduct(
                        product,
                        event.currentTarget.closest<HTMLElement>('[data-product-carousel-card]'),
                      )
                    }
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
  savedAddresses = [],
  selectedAddressId,
  fulfillmentMethod,
  onFulfillmentMethodChange,
  onManageAddresses,
  onOpenProfile,
  onOpenOrders,
  onOpenCart,
  onAddProduct,
  onSelectCategory,
  whatsappUrl,
  whatsappLabel,
}: HomeExperienceProps) {
  const primary = '#FF4B4B';
  const deliveryTimeLabel = formatDeliveryTime(data.deliveryTime);
  const [selectedProduct, setSelectedProduct] = useState<HomeProduct | null>(null);
  const [selectedReadyProduct, setSelectedReadyProduct] = useState<HomeProduct | null>(null);
  const [selectedCombo, setSelectedCombo] = useState<HomeProduct | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(Boolean(initialSearchOpen));
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const cartFabRef = useRef<HTMLButtonElement>(null);
  const pendingCartFlyOriginRef = useRef<CartFlyOrigin | null>(null);
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
  const comboCategoryImage = useMemo(
    () => resolveComboCategoryImage(categories, combos),
    [categories, combos],
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
  const [selectedCatalogCategory, setSelectedCatalogCategory] = useState(() =>
    featured.length > 0
      ? 'featured'
      : combos.length > 0
        ? 'combos'
        : visibleCategories[0]?.id
          ? `category:${visibleCategories[0].id}`
          : '',
  );
  const defaultCatalogCategory =
    featured.length > 0
      ? 'featured'
      : combos.length > 0
        ? 'combos'
        : visibleCategories[0]?.id
          ? `category:${visibleCategories[0].id}`
          : '';
  const validCatalogCategory =
    selectedCatalogCategory === 'featured'
      ? featured.length > 0
      : selectedCatalogCategory === 'combos'
        ? combos.length > 0
        : selectedCatalogCategory.startsWith('category:')
          ? visibleCategories.some(
              (category) => `category:${category.id}` === selectedCatalogCategory,
            )
          : false;
  const activeCatalogCategory = validCatalogCategory
    ? selectedCatalogCategory
    : defaultCatalogCategory;

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
  const hours = formatBusinessHoursSummary(data.businessHours);
  const activeFulfillmentMethod =
    fulfillmentMethod || (data.acceptsDelivery ? 'delivery' : 'pickup');
  const selectedSavedAddress = useMemo(
    () =>
      savedAddresses.find(
        (address) => String(address.id) === String(selectedAddressId || ''),
      ) || savedAddresses.find((address) => address.isDefault) || savedAddresses[0],
    [savedAddresses, selectedAddressId],
  );
  const customerLocationLabel = useMemo(() => {
    if (activeFulfillmentMethod === 'pickup') {
      return data.brand.address || 'Endereço do restaurante';
    }
    if (!selectedSavedAddress) return 'Escolher endereço';

    const street = [selectedSavedAddress.address, selectedSavedAddress.number]
      .map((part) => String(part || '').trim())
      .filter(Boolean)
      .join(', ');
    return [street, selectedSavedAddress.district]
      .map((part) => String(part || '').trim())
      .filter(Boolean)
      .join(' - ');
  }, [activeFulfillmentMethod, data.brand.address, selectedSavedAddress]);
  const paymentMethodLabels = [
    data.acceptsPix ? 'PIX' : '',
    data.acceptsCard ? 'cartão' : '',
    data.acceptsDebitCard ? 'débito' : '',
  ].filter(Boolean);
  const userFirstName =
    userLoggedIn && userName ? userName.trim().split(/\s+/)[0] || 'Cliente' : 'Entrar';
  const userInitials =
    userLoggedIn && userName
      ? userName
          .trim()
          .split(/\s+/)
          .slice(0, 2)
          .map((part) => part.charAt(0).toUpperCase())
          .join('')
      : '•';
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
    if (!selectedProduct && !selectedCombo) return undefined;

    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyOverflowY = document.body.style.overflowY;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousHtmlOverflowY = document.documentElement.style.overflowY;

    document.body.style.overflow = 'visible';
    document.body.style.overflowY = 'auto';
    document.documentElement.style.overflow = 'visible';
    document.documentElement.style.overflowY = 'auto';

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.overflowY = previousBodyOverflowY;
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.documentElement.style.overflowY = previousHtmlOverflowY;
    };
  }, [selectedCombo, selectedProduct]);

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


  const flyProduct = (
    product: HomeProduct,
    origin?: CartFlyOrigin | null,
    sourceElement?: HTMLElement | null,
  ) => {
    scheduleProductToCartAnimation({
      origin,
      sourceElement,
      imageUrl: product.image,
      accentColor: primary,
    });
  };

  const openProduct = (product: HomeProduct, sourceElement?: HTMLElement | null) => {
    pendingCartFlyOriginRef.current = captureCartFlyOrigin(sourceElement);
    const entryKind = resolveProductEntryKind(product);

    if (entryKind === 'COMBO') {
      setSelectedCombo(product);
      return;
    }

    if (entryKind === 'READY') {
      setSelectedReadyProduct(product);
      return;
    }

    setSelectedProduct(product);
  };

  const goHome = () => {
    setSearchQuery('');
    setSearchFocused(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToSection = (sectionId: string) => {
    const target = document.getElementById(sectionId);
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const chooseCategory = (id: string) => {
    setSelectedCatalogCategory(`category:${id}`);
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
      <S.DesktopTopBar>
        <div>
          <span className="location">
            <MapPin aria-hidden="true" />
            {data.brand.address || 'Endereço não informado'}
          </span>
          <span className="top-meta">
            {hours ? <span>{hours}</span> : null}
            <span className="top-status">
              <i className={data.isOpen ? 'open' : ''} />
              {data.isOpen ? 'Aberto agora' : 'Fechado agora'}
            </span>
          </span>
        </div>
      </S.DesktopTopBar>

      <S.Header>
        <div className="mobile-location-row">
          <button
            type="button"
            disabled={activeFulfillmentMethod === 'pickup' || !onManageAddresses}
            onClick={activeFulfillmentMethod === 'delivery' ? onManageAddresses : undefined}
            aria-label={
              activeFulfillmentMethod === 'delivery'
                ? `Endereço de entrega: ${customerLocationLabel}`
                : `Endereço para retirada: ${customerLocationLabel}`
            }
          >
            <MapPin aria-hidden="true" />
            <span>
              <small>{activeFulfillmentMethod === 'delivery' ? 'Entregar em' : 'Retirar em'}</small>
              <strong>{customerLocationLabel}</strong>
            </span>
            {activeFulfillmentMethod === 'delivery' && onManageAddresses ? (
              <ChevronDown aria-hidden="true" />
            ) : null}
          </button>
        </div>
        <div className="header-left">
          <button className="brand" type="button" aria-label={`Voltar para a Home de ${data.brand.name}`} onClick={goHome}>
            <span className="logo">
              {data.brand.logoUrl ? <img src={data.brand.logoUrl} alt="" /> : data.brand.monogram || data.brand.name.slice(0, 1)}
            </span>
            <span className="brand-copy">
              <b>{data.brand.name}</b>
              <span className="platform-label">GastroNexa Platform</span>
              <span className="brand-meta">
                <span
                  className="status"
                  role="status"
                  aria-label={data.isOpen ? 'Aberto agora.' : 'Fechado agora.'}
                >
                  <i className={data.isOpen ? 'open' : ''} /> {data.isOpen ? 'Aberto agora' : 'Fechado agora'}
                </span>
                {Number(data.brand.ratingCount || 0) > 0 && data.brand.ratingAverage ? (
                  <span
                    className="restaurant-rating"
                    aria-label={`${data.brand.ratingAverage.toFixed(1)} de 5 em ${data.brand.ratingCount} avaliações`}
                  >
                    <Star aria-hidden="true" fill="currentColor" />
                    <b>{data.brand.ratingAverage.toFixed(1)}</b>
                    <small>({data.brand.ratingCount})</small>
                  </span>
                ) : null}
              </span>
            </span>
          </button>

          <div className="desktop-fulfillment" aria-label="Forma de recebimento">
            {data.acceptsDelivery ? (
              <button
                type="button"
                className={activeFulfillmentMethod === 'delivery' ? 'active' : undefined}
                aria-pressed={activeFulfillmentMethod === 'delivery'}
                onClick={() => onFulfillmentMethodChange?.('delivery')}
              >
                <Bike aria-hidden="true" />
                Entrega
              </button>
            ) : null}
            {data.acceptsPickup ? (
              <button
                type="button"
                className={activeFulfillmentMethod === 'pickup' ? 'active' : undefined}
                aria-pressed={activeFulfillmentMethod === 'pickup'}
                onClick={() => onFulfillmentMethodChange?.('pickup')}
              >
                <Store aria-hidden="true" />
                Retirada
              </button>
            ) : null}
          </div>
        </div>

        <div className="mobile-fulfillment" aria-label="Forma de recebimento no celular">
          {data.acceptsDelivery ? (
            <button
              type="button"
              className={activeFulfillmentMethod === 'delivery' ? 'active' : undefined}
              aria-pressed={activeFulfillmentMethod === 'delivery'}
              aria-label="Selecionar entrega"
              onClick={() => onFulfillmentMethodChange?.('delivery')}
            >
              <Bike aria-hidden="true" />
              <span>Entrega</span>
            </button>
          ) : null}
          {data.acceptsPickup ? (
            <button
              type="button"
              className={activeFulfillmentMethod === 'pickup' ? 'active' : undefined}
              aria-pressed={activeFulfillmentMethod === 'pickup'}
              aria-label="Selecionar retirada"
              onClick={() => onFulfillmentMethodChange?.('pickup')}
            >
              <Store aria-hidden="true" />
              <span>Retirada</span>
            </button>
          ) : null}
        </div>

        <div className="mobile-meta" aria-label="Informações do pedido">
          {Number(data.brand.ratingCount || 0) > 0 && data.brand.ratingAverage ? (
            <span>
              <Star aria-hidden="true" fill="currentColor" />
              {data.brand.ratingAverage.toFixed(1)}
            </span>
          ) : null}
          {activeFulfillmentMethod === 'delivery' && data.isOpen && deliveryTimeLabel ? (
            <span><Clock3 aria-hidden="true" /> {deliveryTimeLabel}</span>
          ) : null}
          {activeFulfillmentMethod === 'delivery' && Number(data.deliveryFee || 0) > 0 ? (
            <span>Taxa {money(Number(data.deliveryFee))}</span>
          ) : null}
          {data.minimumOrder > 0 ? <span>Mín. {money(data.minimumOrder)}</span> : null}
        </div>

        <S.InlineSearch
          ref={searchContainerRef}
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
                    onClick={(event) => {
                      const sourceElement = event.currentTarget;
                      setSearchQuery('');
                      setSearchFocused(false);
                      openProduct(product, sourceElement);
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

        <div className="actions">
          <button className="account" type="button" aria-label="Minha conta" onClick={onOpenProfile}>
            <span className="account-avatar" aria-hidden="true">{userInitials}</span>
            <span className="account-copy">
              <small>Olá,</small>
              <b>{userFirstName}</b>
            </span>
          </button>
          <button
            className="cart"
            data-cart-fly-target
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
        <Suspense fallback={null}>
          <ProductConfigurator
            product={selectedProduct}
            primaryColor={primary}
            enableProductQuantity
            embedded
            customerPageVariant
            onClose={() => {
              setSelectedProduct(null);
              pendingCartFlyOriginRef.current = null;
            }}
            onConfirm={(configuration, quantity) => {
              const product = selectedProduct;
              const origin =
                captureCartFlyOrigin(
                  document.querySelector<HTMLElement>('[data-cart-fly-source="dialog"]'),
                ) || pendingCartFlyOriginRef.current;
              onAddProduct?.(product.id, configuration, quantity || 1);
              setSelectedProduct(null);
              pendingCartFlyOriginRef.current = null;
              flyProduct(product, origin);
            }}
          />
        </Suspense>
      ) : (
        <>
          {promotionBanners.length ? (
            <S.HeroCarousel>
              <PromotionCarousel banners={promotionBanners} onOpenMenu={openFullMenu} />
              {(data.brand.address ||
                (Number(data.brand.ratingCount || 0) > 0 && data.brand.ratingAverage) ||
                deliveryTimeLabel ||
                Number(data.deliveryFee || 0) > 0) ? (
                <S.HeroMetrics aria-label="Resumo do restaurante">
                  <div className="metric-card">
                    {Number(data.brand.ratingCount || 0) > 0 && data.brand.ratingAverage ? (
                      <div className="rating-metric">
                        <Star aria-hidden="true" fill="currentColor" />
                        <span>
                          <b>{data.brand.ratingAverage.toFixed(1)}</b>
                          <small>Avaliação média</small>
                        </span>
                      </div>
                    ) : null}
                    {(deliveryTimeLabel || Number(data.deliveryFee || 0) > 0) ? (
                      <div className="delivery-metrics">
                        {deliveryTimeLabel ? (
                          <span>
                            <b>{deliveryTimeLabel}</b>
                            <small>Tempo de entrega</small>
                          </span>
                        ) : null}
                        {Number(data.deliveryFee || 0) > 0 ? (
                          <span>
                            <b>{money(Number(data.deliveryFee))}</b>
                            <small>Taxa de entrega</small>
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  {data.brand.address ? (
                    <div className="hero-address">
                      <MapPin aria-hidden="true" />
                      <span>{data.brand.address}</span>
                    </div>
                  ) : null}
                </S.HeroMetrics>
              ) : null}
            </S.HeroCarousel>
          ) : null}

          <S.Main
            id="cardapio"
            className={promotionBanners.length ? 'has-banner' : 'no-banner'}
          >
            <S.InfoChips className="desktop-info">
              {data.isOpen && deliveryTimeLabel ? (
                <span><Clock3 size={16} /> Entrega em <b>{deliveryTimeLabel}</b></span>
              ) : null}
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
              <>
                <S.CatalogIntro>
                  <h2>O que vai ser hoje?</h2>
                  <button type="button" onClick={openFullMenu}>Ver todos →</button>
                </S.CatalogIntro>
                <S.CatalogCategories id="home-categories" aria-label="Categorias do cardápio">
                {featured.length > 0 ? (
                  <button
                    type="button"
                    className={`featured-catalog${activeCatalogCategory === 'featured' ? ' active' : ''}`}
                    aria-pressed={activeCatalogCategory === 'featured'}
                    onClick={() => {
                      setSelectedCatalogCategory('featured');
                      scrollToSection('home-featured');
                    }}
                  >
                    <span className="image featured-icon"><Star aria-hidden="true" /></span>
                    <b>Destaques</b>
                    <small>{featured.length} {featured.length === 1 ? 'item' : 'itens'}</small>
                  </button>
                ) : null}
                {combos.length > 0 ? (
                  <button
                    type="button"
                    className={activeCatalogCategory === 'combos' ? 'active' : undefined}
                    aria-pressed={activeCatalogCategory === 'combos'}
                    onClick={() => {
                      setSelectedCatalogCategory('combos');
                      scrollToSection('home-combos');
                    }}
                  >
                    <span className="image">
                      {comboCategoryImage ? categoryImage(comboCategoryImage, 'Combos') : <UtensilsCrossed aria-hidden="true" />}
                    </span>
                    <b>Combos</b>
                    <small>{combos.length} {combos.length === 1 ? 'item' : 'itens'}</small>
                  </button>
                ) : null}
                {categoryCarousels.map(({ category, products }) => (
                  <button
                    key={category.id}
                    type="button"
                    className={
                      activeCatalogCategory === `category:${category.id}` ? 'active' : undefined
                    }
                    aria-pressed={activeCatalogCategory === `category:${category.id}`}
                    onClick={() => chooseCategory(category.id)}
                  >
                    <span className="image">{categoryImage(category.image, category.name)}</span>
                    <b>{category.name}</b>
                    <small>{products.length} {products.length === 1 ? 'item' : 'itens'}</small>
                  </button>
                ))}
                </S.CatalogCategories>
              </>
            ) : null}

            <ProductCarouselSection
              title="Destaques da casa"
              description="Os produtos que mais chamam atenção no cardápio."
              products={featured}
              onOpenProduct={openProduct}
              className="featured-carousel"
              sectionId="home-featured"
              ariaLabel="Produtos em destaque"
              itemLabel="Destaque"
              onViewAll={openFullMenu}
            />

            {data.freeDeliveryFrom > 0 ? (
              <S.MobileBenefit>
                <b>🔥 Benefício especial</b>
                <span>
                  Frete grátis em pedidos a partir de {money(data.freeDeliveryFrom)}.
                </span>
              </S.MobileBenefit>
            ) : null}

            <ProductCarouselSection
              title="Combos"
              description="Combinações completas para pedir de um jeito mais prático."
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

            {(data.acceptsDelivery && deliveryTimeLabel) ||
            (Number(data.brand.ratingCount || 0) > 0 && data.brand.ratingAverage) ||
            paymentMethodLabels.length > 0 ||
            data.freeDeliveryFrom > 0 ? (
              <S.WhyOrderHere aria-label="Vantagens de pedir neste restaurante">
                <h2>Por que pedir aqui?</h2>
                <div className="benefit-grid">
                  {data.acceptsDelivery && deliveryTimeLabel ? (
                    <article>
                      <span className="benefit-icon"><Bike aria-hidden="true" /></span>
                      <h3>Entrega rápida</h3>
                      <p>Tempo estimado de entrega: {deliveryTimeLabel}.</p>
                    </article>
                  ) : null}
                  {Number(data.brand.ratingCount || 0) > 0 && data.brand.ratingAverage ? (
                    <article>
                      <span className="benefit-icon"><Star aria-hidden="true" /></span>
                      <h3>{data.brand.ratingAverage.toFixed(1)} de avaliação</h3>
                      <p>
                        Baseado em {data.brand.ratingCount}{' '}
                        {data.brand.ratingCount === 1 ? 'avaliação' : 'avaliações'}.
                      </p>
                    </article>
                  ) : null}
                  {paymentMethodLabels.length > 0 ? (
                    <article>
                      <span className="benefit-icon"><CreditCard aria-hidden="true" /></span>
                      <h3>Pagamento fácil</h3>
                      <p>{paymentMethodLabels.join(', ')} disponíveis conforme a configuração do restaurante.</p>
                    </article>
                  ) : null}
                  {data.freeDeliveryFrom > 0 ? (
                    <article>
                      <span className="benefit-icon">🎁</span>
                      <h3>Benefício especial</h3>
                      <p>Frete grátis acima de {money(data.freeDeliveryFrom)}.</p>
                    </article>
                  ) : null}
                </div>
              </S.WhyOrderHere>
            ) : null}

            {(data.brand.address || data.brand.phone || hours || data.brand.instagram || data.brand.facebook || data.brand.tiktok || whatsappUrl) ? (
              <>
                <S.RestaurantInfoTitle>Informações do Restaurante</S.RestaurantInfoTitle>
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

                {(data.brand.instagram || data.brand.facebook || data.brand.tiktok || whatsappUrl) ? (
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
                      {data.brand.tiktok ? (
                        <a
                          href={buildSocialProfileUrl('tiktok', data.brand.tiktok)}
                          target="_blank"
                          rel="noreferrer"
                          aria-label="TikTok"
                        >
                          <TikTokIcon />
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
              </>
            ) : null}
          </S.Main>

      <S.MobileCartFab
        ref={cartFabRef}
        data-cart-fly-target
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
        restaurantLogoUrl={data.brand.logoUrl}
        description={data.about}
        primaryColor={primary}
        phone={data.brand.phone}
        email={data.brand.email}
        onMenu={openFullMenu}
      />


      {selectedReadyProduct ? (
        <ReadyProductDetail
          product={selectedReadyProduct}
          restaurantName={data.brand.name}
          restaurantCategory={data.brand.category}
          categoryName={
            categories.find((category) => category.id === selectedReadyProduct.categoryId)?.name
          }
          preparationTime={data.deliveryTime}
          cartCount={cartCount}
          onBack={() => {
            setSelectedReadyProduct(null);
            pendingCartFlyOriginRef.current = null;
          }}
          onOpenCart={
            onOpenCart
              ? () => {
                  setSelectedReadyProduct(null);
                  pendingCartFlyOriginRef.current = null;
                  onOpenCart();
                }
              : undefined
          }
          onConfirm={({ quantity, observation, sourceElement }) => {
            const product = selectedReadyProduct;
            const origin =
              captureCartFlyOrigin(sourceElement) || pendingCartFlyOriginRef.current;
            onAddProduct?.(
              product.id,
              {
                ...createReadyProductConfiguration(product.configurationVersion),
                observation,
              },
              quantity,
            );
            setSelectedReadyProduct(null);
            pendingCartFlyOriginRef.current = null;
            flyProduct(product, origin);
          }}
        />
      ) : null}

      {selectedCombo ? (
        <Suspense fallback={null}>
          <ComboConfigurator
            product={selectedCombo}
            primaryColor={primary}
            onClose={() => {
              setSelectedCombo(null);
              pendingCartFlyOriginRef.current = null;
            }}
            onConfirm={(configuration) => {
              const product = selectedCombo;
              const origin =
                captureCartFlyOrigin(
                  document.querySelector<HTMLElement>('[data-cart-fly-source="dialog"]'),
                ) || pendingCartFlyOriginRef.current;
              onAddProduct?.(product.id, configuration, 1);
              setSelectedCombo(null);
              pendingCartFlyOriginRef.current = null;
              flyProduct(product, origin);
            }}
          />
        </Suspense>
      ) : null}
        </>
      )}
    </S.Page>
  );
}
