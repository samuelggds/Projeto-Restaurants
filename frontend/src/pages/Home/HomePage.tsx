import { ChevronRight, Heart, MessageCircle, Plus, Tag } from "lucide-react";
import { useMemo, useState } from "react";
import { HomeHeader } from "./components/HomeHeader";
import * as S from "./Home.styles";
import type { HomePageProps } from "./types";

const brl = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function HomePage({
  data,
  cartCount = 0,
  userName,
  userEmail,
  userLoggedIn = false,
  onOpenMenu,
  onOpenProfile,
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
  const products = useMemo(() => data.products.slice(0, 4), [data.products]);
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
        onOpenMenu={onOpenMenu}
        onOpenProfile={onOpenProfile}
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

        {data.categories.length > 0 && (
          <>
            <S.SectionTitle>O que você deseja hoje?</S.SectionTitle>
            <S.CategoryRow>
              {data.categories.map((category) => (
                <S.CategoryButton
                  key={category.id}
                  $active={activeCategory === category.id}
                  onClick={() => selectCategory(category.id)}
                >
                  {category.image && (
                    <img src={category.image} alt={category.name} />
                  )}
                  <b>{category.name}</b>
                </S.CategoryButton>
              ))}
            </S.CategoryRow>
          </>
        )}

        {products.length > 0 && (
          <>
            <S.SectionTitle>Mais pedidos</S.SectionTitle>
            <S.ProductGrid>
              {products.map((product) => (
                <S.ProductCard key={product.id}>
                  <S.ImageWrap>
                    <img src={product.image} alt={product.name} />
                    <button
                      aria-label={`Favoritar ${product.name}`}
                      onClick={() => onToggleFavorite?.(product.id)}
                    >
                      <Heart size={21} />
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

      {data.brand.whatsapp && (
        <S.Whatsapp
          href={`https://wa.me/${data.brand.whatsapp}`}
          target="_blank"
          rel="noreferrer"
          aria-label="Falar no WhatsApp"
        >
          <MessageCircle />
        </S.Whatsapp>
      )}
    </S.HomeRoot>
  );
}
