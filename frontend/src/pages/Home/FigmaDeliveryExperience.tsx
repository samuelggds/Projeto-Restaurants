import { useMemo, useState } from 'react';
import {
  Clock3,
  MapPin,
  Phone,
  Search,
  ShoppingBag,
  UserRound,
  UtensilsCrossed,
} from 'lucide-react';
import { ComboConfigurator } from './components/ComboConfigurator';
import { FacebookIcon, InstagramIcon } from './components/SocialBrandIcons';
import { ProductConfigurator } from './components/ProductConfigurator';
import { ProductSearchDialog } from './components/ProductSearchDialog';
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
  initialSearchOpen = false,
  userName,
  userLoggedIn = false,
  onOpenProfile,
  onOpenCart,
  onAddProduct,
  onSelectCategory,
}: HomePageProps) {
  const primary = data.brand.primaryColor || '#e85a2b';
  const [view, setView] = useState<'home' | 'menu'>('home');
  const [categoryId, setCategoryId] = useState(
    data.categories.find((category) => category.id !== 'todos')?.id || 'todos',
  );
  const [selectedProduct, setSelectedProduct] = useState<HomeProduct | null>(null);
  const [selectedCombo, setSelectedCombo] = useState<HomeProduct | null>(null);
  const [searchOpen, setSearchOpen] = useState(Boolean(initialSearchOpen));

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
        ? availableProducts
        : availableProducts.filter((product) => product.categoryId === categoryId),
    [availableProducts, categoryId],
  );
  const currentCategory = data.categories.find((category) => category.id === categoryId);
  const activeBanner = data.banners.find((banner) => banner.active) || data.banners[0];
  const heroImage = activeBanner?.image || data.hero.image;
  const heroTitle = activeBanner?.title || data.hero.title;
  const heroHighlight = activeBanner?.highlight || data.hero.highlight;
  const heroDescription = activeBanner?.description || data.hero.description;
  const hours = formatHours(data);

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

  const chooseCategory = (id: string) => {
    setCategoryId(id);
    setView('menu');
    onSelectCategory?.(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <S.Page $primary={primary}>
      <S.Header>
        <div className="brand">
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
        </div>

        <button className="search" type="button" onClick={() => setSearchOpen(true)}>
          <Search aria-hidden="true" />
          <span>Buscar no cardápio de {data.brand.name}...</span>
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
              <span className="thumb"><UtensilsCrossed size={15} /></span> Todos
            </button>
            {categories.map((category) => (
              <button className={categoryId === category.id ? 'active' : ''} key={category.id} type="button" onClick={() => setCategoryId(category.id)}>
                <span className="thumb">{categoryImage(category.image, category.name)}</span>
                {category.name}
              </button>
            ))}
          </S.MenuCategories>

          <S.MenuProducts>
            <header>
              <h1>{currentCategory?.name || 'Cardápio'}</h1>
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
            <h3>Seu Pedido</h3>
            <p>{cartCount ? `${cartCount} ${cartCount === 1 ? 'item no carrinho' : 'itens no carrinho'}` : 'Seu carrinho está vazio.'}</p>
            <button type="button" disabled={!cartCount} onClick={onOpenCart}>Continuar</button>
          </S.MiniCart>
        </S.MenuLayout>
      )}

      <S.Footer>
        <div className="inner">
          <div>
            <div className="brand">{data.brand.name}</div>
            {data.about ? <p>{data.about}</p> : null}
          </div>
          <div><h3>Nossos Links</h3><p><button type="button" onClick={() => setView('menu')}>Cardápio</button></p></div>
          {data.brand.phone || data.brand.email ? (
            <div><h3>Suporte</h3><p>{data.brand.phone || data.brand.email}</p></div>
          ) : null}
          <div><h3>Sua Loja Segura</h3><p>Cada restaurante é operado diretamente por seu administrador autorizado.</p></div>
        </div>
        <div className="bottom"><span>© {new Date().getFullYear()} {data.brand.name}.</span><span>Privacidade · Cookies</span></div>
      </S.Footer>

      <S.MobileSearch type="button" aria-label="Buscar no cardápio" onClick={() => setSearchOpen(true)}>
        <Search />
      </S.MobileSearch>

      <ProductSearchDialog
        open={searchOpen}
        products={availableProducts}
        primaryColor={primary}
        onClose={() => setSearchOpen(false)}
        onSelect={(product) => {
          setSearchOpen(false);
          openProduct(product);
        }}
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
