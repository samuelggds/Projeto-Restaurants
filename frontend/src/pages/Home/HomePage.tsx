import {
  BadgePercent,
  ChevronRight,
  LayoutGrid,
  Mail,
  MapPin,
  Phone,
  Sparkles,
  Tag,
} from 'lucide-react';
import { getRestaurantAvailability } from '../admin/domain/businessHours';
import { useMemo, useState } from 'react';
import * as Offers from './components/FeaturedOffers.styles';
import { HomeHeader } from './components/HomeHeader';
import { HomeProductCard } from './components/HomeProductCard';
import { ProductConfigurator } from './components/ProductConfigurator';
import * as S from './Home.styles';
import type { HomePageProps, HomeProduct } from './types';
import { getFeaturedProducts } from './domain/featuredProducts';
import { FacebookIcon, InstagramIcon, WhatsAppIcon } from './components/SocialBrandIcons';

const brl = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function socialUrl(value: string, network: 'instagram' | 'facebook') {
  const normalized = value.trim();
  if (/^https?:\/\//i.test(normalized)) return normalized;
  const handle = normalized.replace(/^@/, '');
  return `https://${network}.com/${handle}`;
}

export function HomePage({
  data,
  cartCount = 0,
  userName,
  userEmail,
  userLoggedIn = false,
  isAdmin = false,
  favoriteProductIds = [],
  savedAddresses = [],
  selectedAddressId,
  onSelectAddress,
  onOpenMenu,
  onOpenProfile,
  onOpenAdmin,
  onOpenCart,
  onSearch,
  onSelectCategory,
  onAddProduct,
  onToggleFavorite,
  onLogout,
}: HomePageProps) {
  const [activeCategory, setActiveCategory] = useState(data.categories[0]?.id ?? '');
  const [selectedProduct, setSelectedProduct] = useState<HomeProduct | null>(null);
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
  const activeCategoryName =
    data.categories.find((category) => category.id === selectedCategory)?.name || 'Produtos';
  const favoriteIds = useMemo(() => new Set(favoriteProductIds), [favoriteProductIds]);
  const primary = data.brand.primaryColor ?? '#d64d08';
  const availability = getRestaurantAvailability(
    data.businessHours,
    data.isOpenForOrders ?? data.isOpen,
  );

  const selectCategory = (id: string) => {
    setActiveCategory(id);
    onSelectCategory?.(id);
  };

  const openProductDetails = (product: HomeProduct) => {
    setSelectedProduct(product);
  };

  const renderProduct = (product: HomeProduct, featured = false) => (
    <HomeProductCard
      key={product.id}
      product={product}
      featured={featured}
      favorite={favoriteIds.has(product.id)}
      onOpen={() => openProductDetails(product)}
      onToggleFavorite={() => onToggleFavorite?.(product.id)}
    />
  );

  return (
    <S.HomeRoot $primary={primary} id="inicio">
      <HomeHeader
        brand={data.brand}
        cartCount={cartCount}
        userName={userName}
        userEmail={userEmail}
        userLoggedIn={userLoggedIn}
        isAdmin={isAdmin}
        savedAddresses={savedAddresses}
        selectedAddressId={selectedAddressId}
        onSelectAddress={onSelectAddress}
        onOpenMenu={onOpenMenu}
        onOpenProfile={onOpenProfile}
        onOpenAdmin={onOpenAdmin}
        onOpenCart={onOpenCart}
        onSearch={onSearch}
        onLogout={onLogout}
        isRestaurantOpen={availability.isOpen}
        availabilityLabel={availability.label}
        availabilityDetail={availability.detail}
      />
      <S.Main>
        {data.about && (
          <S.About id="sobre">
            <small>{data.brand.name || 'NOSSA CASA'}</small>
            <p>{data.about}</p>
          </S.About>
        )}

        {data.hero.image && (
          <S.HeroGrid>
            <S.MainBanner>
              <img src={data.hero.image} alt={data.hero.highlight} />
              <S.BannerCopy>
                <h1>
                  {data.hero.title}
                  <br />
                  <em>{data.hero.highlight}</em>
                </h1>
                <p>{data.hero.description}</p>
                <button onClick={onOpenMenu}>
                  Ver cardápio <ChevronRight size={18} />
                </button>
              </S.BannerCopy>
            </S.MainBanner>
          </S.HeroGrid>
        )}

        {/* InfoBar: only shows fields that have real backend data */}
        {data.minimumOrder > 0 && (
          <S.InfoBar>
            <span>
              <Tag size={21} />
              Pedido mínimo {brl(data.minimumOrder)}
            </span>
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
              {featuredProducts.map((product) => renderProduct(product, true))}
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
                  {category.image && <img src={category.image} alt={category.name} />}
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
                            {categoryProducts.map((product) => renderProduct(product))}
                          </S.ProductGrid>
                        </S.ProductCategoryGroup>
                      );
                    })}
                </S.ProductCategoryGroups>
              </>
            ) : (
              <S.ProductGrid key={selectedCategory}>
                {products.map((product) => renderProduct(product))}
              </S.ProductGrid>
            )}
          </>
        )}
      </S.Main>

      <S.Footer>
        <S.FooterContent>
          <S.FooterBrand>
            {data.brand.logoUrl ? (
              <img src={data.brand.logoUrl} alt={data.brand.name} />
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
            <a href="#inicio">Início</a>
            <a href="#cardapio">Cardápio</a>
            {data.about && <a href="#sobre">Sobre nós</a>}
          </S.FooterColumn>
          <S.FooterColumn>
            <strong>Contato</strong>
            {data.brand.legalName && <span>{data.brand.legalName}</span>}
            {data.brand.address && (
              <span>
                <MapPin size={17} /> {data.brand.address}
              </span>
            )}
            {data.brand.whatsapp && (
              <a href={`https://wa.me/${data.brand.whatsapp}`} target="_blank" rel="noreferrer">
                <WhatsAppIcon size={17} /> WhatsApp
              </a>
            )}
            {data.brand.phone && (
              <a href={`tel:${data.brand.phone.replace(/\D/g, '')}`}>
                <Phone size={17} /> {data.brand.phone}
              </a>
            )}
            {data.brand.email && (
              <a href={`mailto:${data.brand.email}`}>
                <Mail size={17} /> {data.brand.email}
              </a>
            )}
            {data.brand.instagram && (
              <a
                href={socialUrl(data.brand.instagram, 'instagram')}
                target="_blank"
                rel="noreferrer"
              >
                <InstagramIcon size={17} /> Instagram
              </a>
            )}
            {data.brand.facebook && (
              <a href={socialUrl(data.brand.facebook, 'facebook')} target="_blank" rel="noreferrer">
                <FacebookIcon size={17} /> Facebook
              </a>
            )}
          </S.FooterColumn>
        </S.FooterContent>
        <S.FooterBottom>
          © {new Date().getFullYear()} {data.brand.name || 'Restaurante'}. Todos os direitos
          reservados.
        </S.FooterBottom>
      </S.Footer>

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
