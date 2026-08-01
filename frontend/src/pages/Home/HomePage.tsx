import {
  ChevronRight,
  Clock3,
  Heart,
  MessageCircle,
  Plus,
  Store,
  Tag,
  Truck,
} from "lucide-react";
import { useMemo, useState } from "react";
import { HomeHeader } from "./components/HomeHeader";
import { homeMockData } from "./data";
import * as S from "./Home.styles";
import type { HomePageProps } from "./types";

const brl = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function HomePage({
  data = homeMockData,
  cartCount = 2,
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

        <S.InfoBar>
          <span>
            <Store size={21} />
            <b>{data.isOpen ? "Aberto agora" : "Fechado"}</b>
          </span>
          <span>
            <Clock3 size={21} />
            {data.deliveryTime}
          </span>
          <span>
            <Tag size={21} />
            Pedido mínimo {brl(data.minimumOrder)}
          </span>
          <span>
            <Truck size={21} />
            Entrega grátis acima de {brl(data.freeDeliveryFrom)}
          </span>
        </S.InfoBar>

        <S.SectionTitle>O que você deseja hoje?</S.SectionTitle>
        <S.CategoryRow>
          {data.categories.map((category) => (
            <S.CategoryButton
              key={category.id}
              $active={activeCategory === category.id}
              onClick={() => selectCategory(category.id)}
            >
              <img src={category.image} alt={category.name} />
              <b>{category.name}</b>
            </S.CategoryButton>
          ))}
        </S.CategoryRow>

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
                  <span>⭐ {product.rating}</span>
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

        <S.About id="sobre">
          <div>
            <small>NOSSA HISTÓRIA</small>
            <h2>Comida feita para criar boas memórias.</h2>
          </div>
          <p>{data.about}</p>
        </S.About>
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
