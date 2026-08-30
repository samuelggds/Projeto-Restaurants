import {
  BadgePercent,
  LayoutGrid,
  Mail,
  MapPin,
  Phone,
  Play,
  Sparkles,
  Tag,
  Truck,
  Music2,
} from 'lucide-react';
import { getRestaurantAvailability } from '../admin/domain/businessHours';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Offers from './components/FeaturedOffers.styles';
import { HomeHeader } from './components/HomeHeader';
import { HomeProductCard } from './components/HomeProductCard';
import { ProductConfigurator } from './components/ProductConfigurator';
import { ProductSearchDialog } from './components/ProductSearchDialog';
import { TableClosingNotice } from './components/TableClosingNotice';
import { PromotionCarousel } from './components/PromotionCarousel';
import * as S from './Home.styles';
import type { HomePageProps, HomeProduct } from './types';
import { getFeaturedProducts } from './domain/featuredProducts';
import { FacebookIcon, InstagramIcon, WhatsAppIcon } from './components/SocialBrandIcons';
import { buildSocialProfileUrl, buildWhatsAppUrl } from './domain/publicSettings';

const brl = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const EMPTY_FAVORITE_PRODUCT_IDS: string[] = [];

export function HomePage({
  data,
  cartCount = 0,
  userName,
  userEmail,
  userLoggedIn = false,
  isAdmin = false,
  isTableMenu = false,
  orderingLocked = false,
  tableLabel,
  favoriteProductIds = EMPTY_FAVORITE_PRODUCT_IDS,
  savedAddresses = [],
  selectedAddressId,
  onSelectAddress,
  onManageAddresses,
  onOpenMenu,
  onOpenProfile,
  onOpenAdmin,
  onOpenCart,
  onOpenTableAccount,
  onSearch,
  onSelectCategory,
  onAddProduct,
  onToggleFavorite,
  onLogout,
}: HomePageProps) {
  const [activeCategory, setActiveCategory] = useState(data.categories[0]?.id ?? '');
  const [selectedProduct, setSelectedProduct] = useState<HomeProduct | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const toggleFavoriteRef = useRef(onToggleFavorite);

  useEffect(() => {
    toggleFavoriteRef.current = onToggleFavorite;
  }, [onToggleFavorite]);
  const selectedCategory = data.categories.some((category) => category.id === activeCategory)
    ? activeCategory
    : (data.categories[0]?.id ?? '');

  const products = useMemo(() => {
    if (!selectedCategory || selectedCategory === 'todos') {
      return data.products;
    }

    return data.products.filter((product) => product.categoryId === selectedCategory);
  }, [selectedCategory, data.products]);
  const featuredProducts = useMemo(() => getFeaturedProducts(data.products), [data.products]);
  const searchableProducts = useMemo(
    () => data.products.filter((product) => product.available),
    [data.products],
  );
  const activeCategoryName =
    data.categories.find((category) => category.id === selectedCategory)?.name || 'Produtos';
  const favoriteIds = useMemo(() => new Set(favoriteProductIds), [favoriteProductIds]);
  const primary = data.brand.primaryColor ?? '#d64d08';
  const whatsappUrl = buildWhatsAppUrl(data.brand.whatsapp, data.brand.whatsappDefaultMessage);
  const whatsappLabel =
    data.brand.whatsappDisplayName || data.brand.name || 'Atendimento do restaurante';
  const instagramUrl = buildSocialProfileUrl('instagram', data.brand.instagram);
  const facebookUrl = buildSocialProfileUrl('facebook', data.brand.facebook);
  const tiktokUrl = buildSocialProfileUrl('tiktok', data.brand.tiktok);
  const youtubeUrl = buildSocialProfileUrl('youtube', data.brand.youtube);
  const availability = useMemo(
    () => getRestaurantAvailability(data.businessHours, data.isOpenForOrders ?? data.isOpen),
    [data.businessHours, data.isOpen, data.isOpenForOrders],
  );
  const promotionBanners = useMemo(
    () =>
      data.banners.length
        ? data.banners
        : data.hero.image
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
          : [],
    [data.banners, data.hero],
  );

  const selectCategory = useCallback(
    (id: string) => {
      setActiveCategory(id);
      onSelectCategory?.(id);
    },
    [onSelectCategory],
  );

  const openProductDetails = useCallback(
    (product: HomeProduct) => {
      if (orderingLocked) {
        onOpenTableAccount?.();
        return;
      }
      setSelectedProduct(product);
    },
    [onOpenTableAccount, orderingLocked],
  );

  const handleToggleFavorite = useCallback((productId: string) => {
    toggleFavoriteRef.current?.(productId);
  }, []);
  const openSearch = useCallback(() => {
    setSearchOpen(true);
    onSearch?.();
  }, [onSearch]);

  return (
    <S.HomeRoot $primary={primary} $fontFamily={data.fontFamily} id="inicio">
      <HomeHeader
        brand={data.brand}
        cartCount={cartCount}
        userName={userName}
        userEmail={userEmail}
        userLoggedIn={userLoggedIn}
        isAdmin={isAdmin}
        isTableMenu={isTableMenu}
        tableLabel={tableLabel}
        savedAddresses={savedAddresses}
        selectedAddressId={selectedAddressId}
        onSelectAddress={onSelectAddress}
        onManageAddresses={onManageAddresses}
        onOpenProfile={onOpenProfile}
        onOpenAdmin={onOpenAdmin}
        onOpenCart={onOpenCart}
        onSearch={openSearch}
        onLogout={onLogout}
        isRestaurantOpen={availability.isOpen}
        availabilityLabel={availability.label}
        availabilityDetail={availability.detail}
      />
      <S.Main>
        {isTableMenu && orderingLocked && (
          <TableClosingNotice tableNumber={tableLabel} onOpenAccount={onOpenTableAccount} />
        )}
        {data.about && (
          <S.About id="sobre">
            <small>{data.brand.name || 'NOSSA CASA'}</small>
            <p>{data.about}</p>
          </S.About>
        )}

        <PromotionCarousel banners={promotionBanners} onOpenMenu={onOpenMenu} />

        {/* InfoBar: only shows fields that have real backend data */}
        {(data.minimumOrder > 0 || (data.acceptsDelivery && data.freeDeliveryFrom > 0)) && (
          <S.InfoBar>
            {data.minimumOrder > 0 && (
              <span>
                <Tag size={21} />
                Pedido mínimo {brl(data.minimumOrder)}
              </span>
            )}
            {data.acceptsDelivery && data.freeDeliveryFrom > 0 && (
              <span>
                <Truck size={21} />
                Frete grátis a partir de {brl(data.freeDeliveryFrom)}
              </span>
            )}
          </S.InfoBar>
        )}

        {featuredProducts.length > 0 && (
          <Offers.Section aria-labelledby="featured-offers-title">
            <Offers.Header>
              <div>
                <Offers.Eyebrow>
                  <Sparkles size={15} /> preços especiais
                </Offers.Eyebrow>
                <h2 id="featured-offers-title">Ofertas em destaque</h2>
                <p>Aproveite os produtos selecionados pelo restaurante com preços especiais.</p>
              </div>
              <Offers.Count>
                <BadgePercent size={17} />
                {featuredProducts.length}{' '}
                {featuredProducts.length === 1 ? 'oferta disponível' : 'ofertas disponíveis'}
              </Offers.Count>
            </Offers.Header>
            <Offers.Grid>
              {featuredProducts.map((product) => (
                <HomeProductCard
                  key={product.id}
                  product={product}
                  featured
                  orderingLocked={orderingLocked}
                  favorite={favoriteIds.has(product.id)}
                  onOpen={openProductDetails}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
            </Offers.Grid>
          </Offers.Section>
        )}

        {data.categories.length > 0 && (
          <>
            <S.SectionTitle>O que você deseja hoje?</S.SectionTitle>
            <S.CategoryRow id="cardapio">
              {data.categories.map((category) => (
                <S.CategoryButton
                  key={category.id}
                  $active={selectedCategory === category.id}
                  onClick={() => selectCategory(category.id)}
                >
                  {category.image && (
                    <img src={category.image} alt={category.name} loading="lazy" decoding="async" />
                  )}
                  {!category.image && (
                    <S.CategoryPlaceholder>
                      <LayoutGrid size={30} />
                    </S.CategoryPlaceholder>
                  )}
                  <b>{category.name}</b>
                </S.CategoryButton>
              ))}
            </S.CategoryRow>
          </>
        )}

        {products.length > 0 && (
          <>
            <S.SectionTitle>
              {selectedCategory === 'todos' ? 'Todos os produtos' : activeCategoryName}
            </S.SectionTitle>
            {selectedCategory === 'todos' ? (
              <>
                <S.ProductCategoryGroups>
                  {data.categories
                    .filter((category) => category.id !== 'todos')
                    .map((category) => {
                      const categoryProducts = products.filter(
                        (product) => product.categoryId === category.id,
                      );
                      if (!categoryProducts.length) return null;
                      return (
                        <S.ProductCategoryGroup key={category.id}>
                          <h3>{category.name}</h3>
                          <S.ProductGrid>
                            {categoryProducts.map((product) => (
                              <HomeProductCard
                                key={product.id}
                                product={product}
                                orderingLocked={orderingLocked}
                                favorite={favoriteIds.has(product.id)}
                                onOpen={openProductDetails}
                                onToggleFavorite={handleToggleFavorite}
                              />
                            ))}
                          </S.ProductGrid>
                        </S.ProductCategoryGroup>
                      );
                    })}
                </S.ProductCategoryGroups>
              </>
            ) : (
              <S.ProductGrid key={selectedCategory}>
                {products.map((product) => (
                  <HomeProductCard
                    key={product.id}
                    product={product}
                    orderingLocked={orderingLocked}
                    favorite={favoriteIds.has(product.id)}
                    onOpen={openProductDetails}
                    onToggleFavorite={handleToggleFavorite}
                  />
                ))}
              </S.ProductGrid>
            )}
          </>
        )}
      </S.Main>

      <S.Footer>
        <S.FooterContent>
          <S.FooterBrand>
            {data.brand.logoUrl ? (
              <img src={data.brand.logoUrl} alt={data.brand.name} loading="lazy" decoding="async" />
            ) : (
              <span>{data.brand.monogram || 'R'}</span>
            )}
            <div>
              <strong>{data.brand.name || 'Restaurante'}</strong>
              <small>Peça com facilidade, receba com carinho.</small>
            </div>
          </S.FooterBrand>
          <S.FooterColumn>
            <strong>Navegação</strong>
            <S.FooterNavigation aria-label="Navegação do rodapé">
              <a href="#inicio">Início</a>
              <a href="#cardapio">Cardápio</a>
              {data.about && <a href="#sobre">Sobre nós</a>}
            </S.FooterNavigation>
          </S.FooterColumn>
          <S.FooterColumn>
            <strong>Contato</strong>
            <S.FooterContactGrid data-testid="footer-contact-grid">
              {data.brand.legalName && (
                <S.FooterContactItem $wide>
                  <span>{data.brand.legalName}</span>
                </S.FooterContactItem>
              )}
              {data.brand.address && (
                <S.FooterContactItem $wide>
                  <span>
                    <MapPin size={17} /> {data.brand.address}
                  </span>
                </S.FooterContactItem>
              )}
              {whatsappUrl && (
                <S.FooterContactItem>
                  <a href={whatsappUrl} target="_blank" rel="noreferrer">
                    <WhatsAppIcon size={17} /> {whatsappLabel}
                  </a>
                </S.FooterContactItem>
              )}
              {data.brand.phone && (
                <S.FooterContactItem>
                  <a href={`tel:${data.brand.phone.replace(/\D/g, '')}`}>
                    <Phone size={17} /> {data.brand.phone}
                  </a>
                </S.FooterContactItem>
              )}
              {data.brand.email && (
                <S.FooterContactItem>
                  <a href={`mailto:${data.brand.email}`}>
                    <Mail size={17} /> {data.brand.email}
                  </a>
                </S.FooterContactItem>
              )}
              {instagramUrl && (
                <S.FooterContactItem>
                  <a href={instagramUrl} target="_blank" rel="noreferrer">
                    <InstagramIcon size={17} /> Instagram
                  </a>
                </S.FooterContactItem>
              )}
              {facebookUrl && (
                <S.FooterContactItem>
                  <a href={facebookUrl} target="_blank" rel="noreferrer">
                    <FacebookIcon size={17} /> Facebook
                  </a>
                </S.FooterContactItem>
              )}
              {tiktokUrl && (
                <S.FooterContactItem>
                  <a href={tiktokUrl} target="_blank" rel="noreferrer">
                    <Music2 size={17} /> TikTok
                  </a>
                </S.FooterContactItem>
              )}
              {youtubeUrl && (
                <S.FooterContactItem>
                  <a href={youtubeUrl} target="_blank" rel="noreferrer">
                    <Play size={17} /> YouTube
                  </a>
                </S.FooterContactItem>
              )}
            </S.FooterContactGrid>
          </S.FooterColumn>
        </S.FooterContent>
        <S.FooterBottom>
          <span>
            © {new Date().getFullYear()} {data.brand.name || 'Restaurante'}. Todos os direitos
            reservados.
          </span>
          <span>
            Desenvolvido por <strong>SG Websites</strong>
          </span>
        </S.FooterBottom>
      </S.Footer>

      {searchOpen && (
        <ProductSearchDialog
          open
          products={searchableProducts}
          primaryColor={primary}
          onClose={() => setSearchOpen(false)}
          onSelect={(product) => {
            setSearchOpen(false);
            openProductDetails(product);
          }}
        />
      )}

      {selectedProduct && (
        <ProductConfigurator
          product={selectedProduct}
          primaryColor={primary}
          onClose={() => setSelectedProduct(null)}
          onConfirm={(configuration) => {
            onAddProduct?.(selectedProduct.id, configuration);
            setSelectedProduct(null);
            onOpenCart?.();
          }}
        />
      )}
    </S.HomeRoot>
  );
}
