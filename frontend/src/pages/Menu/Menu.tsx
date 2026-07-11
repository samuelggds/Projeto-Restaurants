import { useState } from "react";
import { ThemeProvider } from "styled-components";
import * as S from "./styles";

function isProductUnavailable(product) {
  if (!product) {
    return true;
  }

  if (product.active === false) {
    return true;
  }

  const stockValue =
    product.stock === null || product.stock === undefined
      ? null
      : Number(product.stock);

  return Number.isInteger(stockValue) && stockValue <= 0;
}

// --- MOCK DATA COM IMAGENS PREMIUM ---
const MENU_DATA = [
  {
    id: "1",
    name: "Smash Burger Duplo",
    price: 34.9,
    category: "burgers",
    tag: "Mais Vendido",
    isPop: true,
    active: true,
    stock: 12,
    image:
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=60",
    description:
      "Dois blends smash crocantes de 90g, queijo cheddar duplo maçaricado, maionese artesanal da casa e pão brioche dourado.",
  },
  {
    id: "2",
    name: "Monster Cheddar Bacon",
    price: 42.0,
    category: "burgers",
    tag: "Premium",
    isPop: false,
    active: false,
    stock: 0,
    image:
      "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=500&auto=format&fit=crop&q=60",
    description:
      "Blend artesanal de 160g, uma quantidade generosa de cheddar cremoso, tiras crocantes de bacon e cebola caramelizada.",
  },
  {
    id: "3",
    name: "Batata Frita Suprema",
    price: 24.9,
    category: "acompanhamentos",
    tag: "Porção",
    isPop: false,
    active: true,
    stock: 8,
    image:
      "https://images.unsplash.com/photo-1576107232684-1279f390859f?w=500&auto=format&fit=crop&q=60",
    description:
      "Batatas fritas super sequinhas e crocantes cobertas com molho cremoso de cheddar e bastante bacon picado.",
  },
  {
    id: "4",
    name: "Anéis de Cebola Panko",
    price: 16.5,
    category: "acompanhamentos",
    tag: "Sucesso",
    isPop: true,
    active: true,
    stock: 5,
    image:
      "https://images.unsplash.com/photo-1639024471283-2bc7b3c6a267?w=500&auto=format&fit=crop&q=60",
    description:
      "Anéis de cebola gigantes empanados em farinha panko super crocante. Acompanha molho barbecue artesanal.",
  },
  {
    id: "5",
    name: "Suco Natural de Laranja",
    price: 12.0,
    category: "bebidas",
    tag: "Natural",
    isPop: false,
    active: true,
    stock: 20,
    image:
      "https://images.unsplash.com/photo-1613478223719-2ab802602423?w=500&auto=format&fit=crop&q=60",
    description:
      "Suco puro de laranjas selecionadas, espremido na hora 500ml. Sem adição de água ou conservantes.",
  },
  {
    id: "6",
    name: "Pink Lemonade",
    price: 14.9,
    category: "bebidas",
    tag: "Refrescante",
    isPop: true,
    active: true,
    stock: 10,
    image:
      "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=60",
    description:
      "Infusão exclusiva de limão siciliano espremido com xarope natural de frutas vermelhas e bastante gelo.",
  },
];

const CATEGORIES = [
  { id: "burgers", label: "🍔 Hambúrgueres" },
  { id: "acompanhamentos", label: "🍟 Acompanhamentos" },
  { id: "bebidas", label: "🥤 Bebidas" },
];

export default function Menu() {
  const [activeCategory, setActiveCategory] = useState("burgers");
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false); // Estado para alternar o tema

  // Adicionar item à comanda
  const addToCart = (product) => {
    if (isProductUnavailable(product)) {
      return;
    }

    setCart((prev) => {
      const itemExists = prev.find((item) => item.id === product.id);
      if (itemExists) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item,
        );
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  // Alterar quantidades (+/-)
  const updateQuantity = (productId, amount) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === productId ? { ...item, qty: item.qty + amount } : item,
        )
        .filter((item) => item.qty > 0),
    );
  };

  const cartTotal = cart.reduce(
    (total, item) => total + item.price * item.qty,
    0,
  );
  const totalItems = cart.reduce((acc, item) => acc + item.qty, 0);

  return (
    <ThemeProvider theme={isDarkMode ? S.darkTheme : S.lightTheme}>
      {/* HEADER SUPERIOR FIXO */}
      <S.TopNavbar>
        <div
          style={{
            fontWeight: 800,
            fontSize: "1.2rem",
            letterSpacing: "-0.02em",
          }}
        ></div>
        <div className="nav-actions">
          {/* Botão de Alternar Tema */}
          <S.ActionButton
            $secondary
            $padding="0.6rem 1rem"
            $fontSize="0.85rem"
            $width="auto"
            onClick={() => setIsDarkMode(!isDarkMode)}
          >
            {isDarkMode ? "☀️ Modo Claro" : "🌙 Modo Escuro"}
          </S.ActionButton>

          {/* Botão para abrir a aba do Pedido */}
          <S.ActionButton
            $padding="0.6rem 1.2rem"
            $fontSize="0.85rem"
            $width="auto"
            onClick={() => setIsCartOpen(true)}
          >
            🛒 Ver Pedido ({totalItems})
          </S.ActionButton>
        </div>
      </S.TopNavbar>

      <S.Layout>
        {/* NAVEGAÇÃO LATERAL (CATEGORIAS) */}
        <S.SidebarNav>
          <S.CategoryList>
            {CATEGORIES.map((cat) => (
              <S.CategoryButton
                key={cat.id}
                $active={activeCategory === cat.id}
                onClick={() => setActiveCategory(cat.id)}
              >
                {cat.label}
              </S.CategoryButton>
            ))}
          </S.CategoryList>
        </S.SidebarNav>

        {/* VITRINE DE PRODUTOS */}
        <S.MainContent>
          <S.SectionHeader>
            <h3>
              {
                CATEGORIES.find((c) => c.id === activeCategory)?.label.split(
                  " ",
                )[1]
              }
            </h3>
            <p>Selecione os itens desejados para montar seu prato</p>
          </S.SectionHeader>

          <S.MenuGrid>
            {MENU_DATA.filter((item) => item.category === activeCategory).map(
              (product) => {
                const unavailable = isProductUnavailable(product);

                return (
                  <S.ProductCard
                    key={product.id}
                    onClick={() => addToCart(product)}
                  >
                    <div className="image-container">
                      <span
                        className={`tag-highlight ${product.isPop ? "pop" : ""}`}
                      >
                        {product.tag}
                      </span>
                      <img
                        src={product.image}
                        alt={product.name}
                        loading="lazy"
                      />
                    </div>

                    <div className="card-body">
                      <div className="card-top">
                        <h4>{product.name}</h4>
                        <span className="price">
                          R$ {product.price.toFixed(2)}
                        </span>
                      </div>
                      <p className="description">{product.description}</p>
                      {unavailable && (
                        <p
                          style={{
                            marginTop: "0.35rem",
                            color: "#b91c1c",
                            fontWeight: 700,
                            fontSize: "0.82rem",
                            opacity: 1,
                          }}
                        >
                          Produto indisponivel
                        </p>
                      )}
                      <S.ActionButton $secondary style={{ marginTop: "auto" }}>
                        {unavailable ? "Indisponivel" : "➕ Adicionar"}
                      </S.ActionButton>
                    </div>
                  </S.ProductCard>
                );
              },
            )}
          </S.MenuGrid>
        </S.MainContent>

        {/* OVERLAY ESCURO E ABA DO PEDIDO DESLIZANTE */}
        <S.Overlay $isOpen={isCartOpen} onClick={() => setIsCartOpen(false)} />

        <S.CartSidebar $isOpen={isCartOpen}>
          <div className="cart-header">
            <span>🛍️ Meu Pedido</span>
            <button className="close-btn" onClick={() => setIsCartOpen(false)}>
              ×
            </button>
          </div>

          <div className="items-container">
            {cart.length === 0 ? (
              <p
                style={{
                  textAlign: "center",
                  color: "#64748b",
                  marginTop: "4rem",
                  fontSize: "0.9rem",
                }}
              >
                Sua sacola está vazia.
                <br />
                Adicione itens do cardápio!
              </p>
            ) : (
              cart.map((item) => (
                <S.CartItemRow key={item.id}>
                  <div className="details">
                    <strong>{item.name}</strong>
                    <span>R$ {(item.price * item.qty).toFixed(2)}</span>
                  </div>
                  <div className="controls">
                    <button
                      className="qty-btn"
                      onClick={() => updateQuantity(item.id, -1)}
                    >
                      -
                    </button>
                    <span className="qty-val">{item.qty}</span>
                    <button
                      className="qty-btn"
                      onClick={() => updateQuantity(item.id, 1)}
                    >
                      +
                    </button>
                  </div>
                </S.CartItemRow>
              ))
            )}
          </div>

          <S.CartFooter>
            <div className="total-row">
              <span>Total do Pedido:</span>
              <strong>R$ {cartTotal.toFixed(2)}</strong>
            </div>
            <S.ActionButton
              disabled={cart.length === 0}
              $padding="1.1rem"
              $fontSize="1rem"
              onClick={() => {
                alert("Pedido confirmado! 🚀");
                setCart([]);
                setIsCartOpen(false);
              }}
            >
              Confirmar Pedido
            </S.ActionButton>
          </S.CartFooter>
        </S.CartSidebar>
      </S.Layout>
    </ThemeProvider>
  );
}
