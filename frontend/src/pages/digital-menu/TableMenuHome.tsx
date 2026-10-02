import { useMemo, useState } from 'react';
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  MapPin,
  Phone,
  ReceiptText,
  ShoppingBag,
  Star,
  UtensilsCrossed,
} from 'lucide-react';
import { PromotionCarousel } from '../Home/components/PromotionCarousel';
import { useHorizontalProductCarousel } from '../Home/hooks/useHorizontalProductCarousel';
import { resolveComboCategoryImage } from '../Home/domain/comboCategoryImage';
import {
  buildSocialProfileUrl,
  buildWhatsAppUrl,
  formatBusinessHoursSummary,
} from '../Home/domain/publicSettings';
import {
  FacebookIcon,
  InstagramIcon,
  TikTokIcon,
  WhatsAppIcon,
} from '../Home/components/SocialBrandIcons';
import type { HomeData, HomeProduct } from '../Home/types';
import * as H from './TableMenuHome.styles';

type Props = {
  data: HomeData;
  tableLabel: string | number;
  cartCount: number;
  orderingLocked?: boolean;
  waiterCallEnabled: boolean;
  userName?: string;
  userLoggedIn?: boolean;
  onOpenProduct: (product: HomeProduct, sourceElement?: HTMLElement | null) => void;
  onQuickAdd: (product: HomeProduct, sourceElement?: HTMLElement | null) => void;
  onOpenCart: () => void;
  onCallWaiter: () => void;
  onViewAccount: () => void;
  onTrackOrder: () => void;
};

type ProductSection = {
  id: string;
  title: string;
  label: string | ((product: HomeProduct) => string);
  products: HomeProduct[];
};

const money = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function tableNumber(label: string | number) {
  const numeric = Number(label);
  return Number.isFinite(numeric) ? String(numeric).padStart(2, '0') : String(label);
}

function productImage(product: HomeProduct) {
  return product.image ? (
    <img src={product.image} alt={product.name} loading="lazy" decoding="async" />
  ) : (
    <UtensilsCrossed aria-hidden="true" />
  );
}

function categoryImage(image: string, label: string) {
  return image ? (
    <img src={image} alt="" loading="lazy" decoding="async" />
  ) : (
    <UtensilsCrossed aria-label={label} />
  );
}

function TableProductCarousel({
  section,
  orderingLocked,
  onOpenProduct,
  onQuickAdd,
}: {
  section: ProductSection;
  orderingLocked: boolean;
  onOpenProduct: (product: HomeProduct, sourceElement?: HTMLElement | null) => void;
  onQuickAdd: (product: HomeProduct, sourceElement?: HTMLElement | null) => void;
}) {
  const {
    trackRef,
    hasOverflow,
    canPrevious,
    canNext,
    scroll,
  } = useHorizontalProductCarousel({
    itemSelector: '[data-table-product-card]',
    itemsKey: section.products.map((product) => product.id).join('|'),
  });

  return (
    <H.ProductSection id={section.id} aria-label={section.title}>
      <H.SectionHead>
        <h2>{section.title}</h2>
        {hasOverflow ? (
          <H.CarouselControls aria-label={`Navegar em ${section.title}`}>
            <button
              type="button"
              aria-label={`Ver itens anteriores de ${section.title}`}
              disabled={!canPrevious}
              onClick={() => scroll(-1)}
            >
              <ChevronLeft aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label={`Ver próximos itens de ${section.title}`}
              disabled={!canNext}
              onClick={() => scroll(1)}
            >
              <ChevronRight aria-hidden="true" />
            </button>
          </H.CarouselControls>
        ) : null}
      </H.SectionHead>

      <H.ProductRail ref={trackRef}>
        {section.products.map((product) => {
          const label =
            typeof section.label === 'function' ? section.label(product) : section.label;
          return (
            <H.ProductCard key={product.id} data-table-product-card>
              <button
                className="open"
                type="button"
                aria-label={`Ver detalhes de ${product.name}`}
                onClick={(event) =>
                  onOpenProduct(
                    product,
                    event.currentTarget.closest<HTMLElement>('[data-table-product-card]'),
                  )
                }
              />
              <div className="image">{productImage(product)}</div>
              <div className="copy">
                <div className="product-copy">
                  <span className="product-label">{label}</span>
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
                    disabled={orderingLocked}
                    onClick={(event) =>
                      onQuickAdd(
                        product,
                        event.currentTarget.closest<HTMLElement>('[data-table-product-card]'),
                      )
                    }
                  >
                    + Adicionar
                  </button>
                </div>
              </div>
            </H.ProductCard>
          );
        })}
      </H.ProductRail>
    </H.ProductSection>
  );
}

export function TableMenuHome({
  data,
  tableLabel,
  cartCount,
  orderingLocked = false,
  waiterCallEnabled,
  userName,
  userLoggedIn = false,
  onOpenProduct,
  onQuickAdd,
  onOpenCart,
  onCallWaiter,
  onViewAccount,
  onTrackOrder,
}: Props) {
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
  const comboImage = useMemo(
    () => resolveComboCategoryImage(categories, combos),
    [categories, combos],
  );
  const categorySections = useMemo(
    () =>
      categories
        .map((category) => ({
          category,
          products: availableProducts.filter(
            (product) => product.kind !== 'COMBO' && product.categoryId === category.id,
          ),
        }))
        .filter(({ products }) => products.length > 0),
    [availableProducts, categories],
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

  const productSections = useMemo<ProductSection[]>(() => {
    const sections: ProductSection[] = [];
    if (featured.length) {
      sections.push({
        id: 'table-featured',
        title: 'Mais Pedidos em Destaque',
        label: 'Destaque',
        products: featured,
      });
    }
    if (combos.length) {
      sections.push({
        id: 'table-combos',
        title: 'Combos',
        label: 'Combo',
        products: combos,
      });
    }
    categorySections.forEach(({ category, products }) => {
      sections.push({
        id: `table-category-${encodeURIComponent(category.id)}`,
        title: category.name,
        label: category.name,
        products,
      });
    });
    return sections;
  }, [categorySections, combos, featured]);

  const defaultCatalogCategory =
    featured.length > 0
      ? 'featured'
      : combos.length > 0
        ? 'combos'
        : categorySections[0]?.category.id
          ? `category:${categorySections[0].category.id}`
          : '';
  const [selectedCatalogCategory, setSelectedCatalogCategory] = useState(
    defaultCatalogCategory,
  );
  const validCatalogCategory =
    selectedCatalogCategory === 'featured'
      ? featured.length > 0
      : selectedCatalogCategory === 'combos'
        ? combos.length > 0
        : selectedCatalogCategory.startsWith('category:')
          ? categorySections.some(
              ({ category }) =>
                `category:${category.id}` === selectedCatalogCategory,
            )
          : false;
  const activeCatalogCategory = validCatalogCategory
    ? selectedCatalogCategory
    : defaultCatalogCategory;

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const selectCatalogCategory = (categoryKey: string, sectionId: string) => {
    setSelectedCatalogCategory(categoryKey);
    scrollTo(sectionId);
  };
  const firstSectionId = productSections[0]?.id;
  const firstName = String(userName || '').trim().split(/\s+/u)[0] || '';
  const rating = Number(data.brand.ratingAverage || 0);
  const ratingText = rating > 0 ? rating.toFixed(1) : 'Novo';
  const hours = formatBusinessHoursSummary(data.businessHours);
  const whatsappUrl = buildWhatsAppUrl(
    data.brand.whatsapp,
    data.brand.whatsappDefaultMessage,
  );
  const hasSocials = Boolean(
    data.brand.instagram ||
      data.brand.facebook ||
      data.brand.tiktok ||
      data.brand.youtube ||
      whatsappUrl,
  );

  return (
    <H.HomeRoot>
      <H.Header>
        <H.Brand>
          {data.brand.logoUrl ? (
            <img src={data.brand.logoUrl} alt={data.brand.name} />
          ) : (
            <span className="mark">{data.brand.monogram || data.brand.name.slice(0, 1)}</span>
          )}
          <span className="copy">
            <b>{data.brand.name}</b>
            <small><i aria-hidden="true" /> Mesa em atendimento</small>
          </span>
        </H.Brand>

        <H.HeaderActions>
          {userLoggedIn && firstName ? (
            <span className="customer">
              <span className="avatar">{firstName.slice(0, 2).toUpperCase()}</span>
              <span>Olá, {firstName}</span>
            </span>
          ) : null}
          <button
            className="cart desktop-cart"
            data-cart-fly-target
            type="button"
            onClick={onOpenCart}
          >
            <ShoppingBag aria-hidden="true" />
            <span>Meu Carrinho</span>
            {cartCount > 0 ? <i>{cartCount}</i> : null}
          </button>
        </H.HeaderActions>

        <H.TableBadge aria-label={`Mesa ${tableLabel}`}>
          <UtensilsCrossed aria-hidden="true" />
          <span>Mesa {tableNumber(tableLabel)}</span>
        </H.TableBadge>
      </H.Header>

      <H.Content>
        {promotionBanners.length ? (
          <H.HeroSlot>
            <PromotionCarousel
              banners={promotionBanners}
              onOpenMenu={() => firstSectionId && scrollTo(firstSectionId)}
            />
          </H.HeroSlot>
        ) : null}

        <H.InfoRow aria-label="Informações da mesa">
          <span className="rating"><Star aria-hidden="true" /> {ratingText}</span>
          <span><UtensilsCrossed aria-hidden="true" /> Mesa {tableNumber(tableLabel)}</span>
          <span><Clock3 aria-hidden="true" /> Pedido direto à cozinha</span>
          <span><Bell aria-hidden="true" /> {waiterCallEnabled ? 'Garçom disponível' : 'Atendimento na mesa'}</span>
        </H.InfoRow>

        <H.Divider />

        <H.Categories aria-label="Categorias do cardápio">
          {featured.length ? (
            <button
              type="button"
              className={activeCatalogCategory === 'featured' ? 'active' : undefined}
              aria-pressed={activeCatalogCategory === 'featured'}
              onClick={() => selectCatalogCategory('featured', 'table-featured')}
            >
              <span className="image special"><Star aria-hidden="true" /></span>
              <b>Destaques</b>
            </button>
          ) : null}
          {combos.length ? (
            <button
              type="button"
              className={activeCatalogCategory === 'combos' ? 'active' : undefined}
              aria-pressed={activeCatalogCategory === 'combos'}
              onClick={() => selectCatalogCategory('combos', 'table-combos')}
            >
              <span className="image">
                {categoryImage(comboImage, 'Combos')}
              </span>
              <b>Combos</b>
            </button>
          ) : null}
          {categorySections.map(({ category }) => {
            const categoryKey = `category:${category.id}`;
            const sectionId = `table-category-${encodeURIComponent(category.id)}`;
            return (
              <button
                key={category.id}
                type="button"
                className={activeCatalogCategory === categoryKey ? 'active' : undefined}
                aria-pressed={activeCatalogCategory === categoryKey}
                onClick={() => selectCatalogCategory(categoryKey, sectionId)}
              >
                <span className="image">{categoryImage(category.image, category.name)}</span>
                <b>{category.name}</b>
              </button>
            );
          })}
        </H.Categories>

        <H.Divider />

        <H.Sections>
          {productSections.map((section) => (
            <TableProductCarousel
              key={section.id}
              section={section}
              orderingLocked={orderingLocked}
              onOpenProduct={onOpenProduct}
              onQuickAdd={onQuickAdd}
            />
          ))}
        </H.Sections>

        {data.brand.address || data.brand.phone || hours || hasSocials ? (
          <H.RestaurantInfo aria-label="Informações do restaurante">
            {data.brand.address ? (
              <div className="restaurant-info-item address">
                <MapPin aria-hidden="true" />
                <span>{data.brand.address}</span>
              </div>
            ) : null}

            {data.brand.phone ? (
              <div className="restaurant-info-item phone">
                <Phone aria-hidden="true" />
                <span>{data.brand.phone}</span>
              </div>
            ) : null}

            {hours ? (
              <div className="restaurant-info-item hours">
                <Clock3 aria-hidden="true" />
                <span>{hours}</span>
              </div>
            ) : null}

            {hasSocials ? (
              <div className="restaurant-social-row">
                <span>Redes sociais</span>
                <div className="social-links">
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
                  {data.brand.youtube ? (
                    <a
                      href={buildSocialProfileUrl('youtube', data.brand.youtube)}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="YouTube"
                    >
                      <span className="youtube-mark">▶</span>
                    </a>
                  ) : null}
                  {whatsappUrl ? (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`WhatsApp de ${data.brand.whatsappDisplayName || data.brand.name}`}
                    >
                      <WhatsAppIcon />
                    </a>
                  ) : null}
                </div>
              </div>
            ) : null}
          </H.RestaurantInfo>
        ) : null}
      </H.Content>

      <H.ActionDock aria-label="Ações da mesa">
        <button type="button" data-cart-fly-target onClick={onOpenCart}>
          <span className="icon"><ShoppingBag aria-hidden="true" /></span>
          <span>Meu Pedido</span>
          {cartCount > 0 ? <i>{cartCount}</i> : null}
        </button>
        {waiterCallEnabled ? (
          <button type="button" onClick={onCallWaiter}>
            <span className="icon"><Bell aria-hidden="true" /></span>
            <span>Chamar Garçom</span>
          </button>
        ) : null}
        <button
          type="button"
          aria-label="Acompanhar em tempo real"
          onClick={onTrackOrder}
        >
          <span className="icon"><Eye aria-hidden="true" /></span>
          <span>Acompanhar em tempo real</span>
        </button>
        <button type="button" onClick={onViewAccount}>
          <span className="icon"><ReceiptText aria-hidden="true" /></span>
          <span>Ver Conta</span>
        </button>
      </H.ActionDock>
    </H.HomeRoot>
  );
}
