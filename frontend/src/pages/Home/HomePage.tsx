import { ChevronRight, Heart, LayoutGrid, MapPin, Plus, Tag } from "lucide-react";
import { useMemo, useState } from "react";
import { HomeHeader } from "./components/HomeHeader";
import * as S from "./Home.styles";
import type { HomePageProps } from "./types";
import {
  FacebookIcon,
  InstagramIcon,
  WhatsAppIcon,
} from "./components/SocialBrandIcons";

const brl = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function socialUrl(value: string, network: "instagram" | "facebook") {
  const normalized = value.trim();
  if (/^https?:\/\//i.test(normalized)) return normalized;
  const handle = normalized.replace(/^@/, "");
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
  const [activeCategory, setActiveCategory] = useState(
    data.categories[0]?.id ?? "",
  );
  const selectedCategory = data.categories.some(
    (category) => category.id === activeCategory,
  )
    ? activeCategory
    : (data.categories[0]?.id ?? "");

  const products = useMemo(() => {
    if (!selectedCategory || selectedCategory === "todos") {
      return data.products;
    }

    return data.products.filter(
      (product) => product.categoryId === selectedCategory,
    );
  }, [selectedCategory, data.products]);
  const activeCategoryName =
    data.categories.find((category) => category.id === selectedCategory)?.name ||
    "Produtos";
  const favoriteIds = useMemo(
    () => new Set(favoriteProductIds),
    [favoriteProductIds],
  );
  const favoriteProducts = useMemo(
    () => data.products.filter((product) => favoriteIds.has(product.id)),
    [data.products, favoriteIds],
  );
  const primary = data.brand.primaryColor ?? "#d64d08";

  const selectCategory = (id: string) => {
    setActiveCategory(id);
    onSelectCategory?.(id);
  };

  return (
    <S.HomeRoot $primary={primary} id="inicio">
      <HomeHeader
        brand={data.brand}
        cartCount={cartCount}
        userName={userName}
        userEmail={userEmail}
        userLoggedIn={userLoggedIn}
        isAdmin={isAdmin}
        onOpenMenu={onOpenMenu}
        onOpenProfile={onOpenProfile}
        onOpenAdmin={onOpenAdmin}
        onOpenCart={onOpenCart}
        onSearch={onSearch}
        onLogout={onLogout}
      />
      <S.Main>
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
            {data.banners.slice(0, 2).map((banner, index) => (
              <S.MiniBanner
                key={`${banner.title}-${index}`}
                $second={index === 1}
              >
                <img src={banner.image} alt="" />
                <div>
                  <strong>
                    {banner.title}
                    <br />
                    <em>{banner.highlight}</em>
                  </strong>
                  {banner.description && <small>{banner.description}</small>}
                </div>
              </S.MiniBanner>
            ))}
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

        {favoriteProducts.length > 0 && (
          <>
            <S.SectionTitle>Seus favoritos</S.SectionTitle>
            <S.ProductGrid key={`favorites-${favoriteProductIds.join("-")}`}>
              {favoriteProducts.map((product) => (
                <S.ProductCard key={product.id}>
                  <S.ImageWrap>
                    <img src={product.image} alt={product.name} />
                    <button className="favorite" aria-label={`Remover ${product.name} dos favoritos`} onClick={() => onToggleFavorite?.(product.id)}>
                      <Heart size={21} fill="currentColor" />
                    </button>
                  </S.ImageWrap>
                  <div>
                    <h3>{product.name}</h3>
                    <p>{product.description}</p>
                    <footer>
                      {product.rating > 0 && <span>⭐ {product.rating}</span>}
                      <strong>{brl(product.price)}</strong>
                      <button aria-label={`Adicionar ${product.name}`} onClick={() => onAddProduct?.(product.id)}><Plus /></button>
                    </footer>
                  </div>
                </S.ProductCard>
              ))}
            </S.ProductGrid>
          </>
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
                    <img src={category.image} alt={category.name} />
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
              {selectedCategory === "todos" ? "Todos os produtos" : activeCategoryName}
            </S.SectionTitle>
            <S.ProductGrid key={selectedCategory}>
              {products.map((product) => (
                <S.ProductCard key={product.id}>
                  <S.ImageWrap>
                    <img src={product.image} alt={product.name} />
                    <button
                      className={favoriteIds.has(product.id) ? "favorite" : undefined}
                      aria-label={`Favoritar ${product.name}`}
                      onClick={() => onToggleFavorite?.(product.id)}
                    >
                      <Heart
                        size={21}
                        fill={favoriteIds.has(product.id) ? "currentColor" : "none"}
                      />
                    </button>
                  </S.ImageWrap>
                  <div>
                    <h3>{product.name}</h3>
                    <p>{product.description}</p>
                    <footer>
                      {product.rating > 0 && <span>⭐ {product.rating}</span>}
                      <strong>{brl(product.price)}</strong>
                      <button
                        aria-label={`Adicionar ${product.name}`}
                        onClick={() => onAddProduct?.(product.id)}
                      >
                        <Plus />
                      </button>
                    </footer>
                  </div>
                </S.ProductCard>
              ))}
            </S.ProductGrid>
          </>
        )}

        {data.about && (
          <S.About id="sobre">
            <p>{data.about}</p>
          </S.About>
        )}
      </S.Main>

      <S.Footer>
        <S.FooterContent>
          <S.FooterBrand>
            {data.brand.logoUrl ? (
              <img src={data.brand.logoUrl} alt={data.brand.name} />
            ) : (
              <span>{data.brand.monogram || "R"}</span>
            )}
            <div>
              <strong>{data.brand.name || "Restaurante"}</strong>
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
            {data.brand.address && (
              <span><MapPin size={17} /> {data.brand.address}</span>
            )}
            {data.brand.whatsapp && (
              <a href={`https://wa.me/${data.brand.whatsapp}`} target="_blank" rel="noreferrer">
                <WhatsAppIcon size={17} /> WhatsApp
              </a>
            )}
            {data.brand.instagram && (
              <a href={socialUrl(data.brand.instagram, "instagram")} target="_blank" rel="noreferrer">
                <InstagramIcon size={17} /> Instagram
              </a>
            )}
            {data.brand.facebook && (
              <a href={socialUrl(data.brand.facebook, "facebook")} target="_blank" rel="noreferrer">
                <FacebookIcon size={17} /> Facebook
              </a>
            )}
          </S.FooterColumn>
        </S.FooterContent>
        <S.FooterBottom>
          © {new Date().getFullYear()} {data.brand.name || "Restaurante"}. Todos os direitos reservados.
        </S.FooterBottom>
      </S.Footer>

      {data.brand.whatsapp && (
        <S.Whatsapp
          href={`https://wa.me/${data.brand.whatsapp}`}
          target="_blank"
          rel="noreferrer"
          aria-label="Falar no WhatsApp"
        >
          <WhatsAppIcon size={24} />
        </S.Whatsapp>
      )}
    </S.HomeRoot>
  );
}
