import styled from "styled-components";

export const lightTheme = {
  background: "#f8fafc",
  surface: "#ffffff",
  surfaceHover: "#f1f5f9",
  text: "#0f172a",
  border: "#e2e8f0",
  primary: "#eab308",
  heroBg: "#1e293b",
  heroText: "#ffffff",
};

export const darkTheme = {
  background: "#0f172a",
  surface: "#1e293b",
  surfaceHover: "#334155",
  text: "#f8fafc",
  border: "#334155",
  primary: "#eab308",
  heroBg: "#0b1329",
  heroText: "#f8fafc",
};

export const HomeLayout = styled.div`
  min-height: 100vh;
  background-color: ${(props) => props.theme.background};
  color: ${(props) => props.theme.text};
  font-family: "Inter", sans-serif;
  transition: all 0.3s ease;
`;

export const Navbar = styled.nav`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background-color: ${(props) => props.theme.surface};
  border-bottom: 1px solid ${(props) => props.theme.border};
  position: sticky;
  top: 0;
  z-index: 100;
`;

export const Brand = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 800;
  font-size: 1.3rem;
  color: ${(props) => props.theme.primary};
  text-transform: uppercase;
  letter-spacing: -0.5px;
`;

export const NavRight = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

// --- NOVO: Estilo do botão do carrinho ---
export const CartButtonContainer = styled.button`
  position: relative;
  background: ${(props) => props.theme.surface};
  border: 1px solid ${(props) => props.theme.border};
  color: ${(props) => props.theme.text};
  width: 42px;
  height: 42px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${(props) => props.theme.surfaceHover};
    border-color: ${(props) => props.theme.primary};
    color: ${(props) => props.theme.primary};
  }
`;

// --- NOVO: Estilo do balão de contagem ---
export const Badge = styled.span`
  position: absolute;
  top: -3px;
  right: -3px;
  background-color: ${(props) => props.theme.primary};
  color: #000000;
  font-size: 0.72rem;
  font-weight: 800;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  animation: popScale 0.2s ease-out;

  @keyframes popScale {
    from {
      transform: scale(0);
    }
    to {
      transform: scale(1);
    }
  }
`;

export const ThemeToggleButton = styled.button`
  background: none;
  border: 1px solid ${(props) => props.theme.border};
  color: ${(props) => props.theme.text};
  width: 42px;
  height: 42px;
  border-radius: 0.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;

  &:hover {
    background: ${(props) => props.theme.surfaceHover};
  }
`;

export const UserMenuContainer = styled.div`
  position: relative;
`;

export const AvatarButton = styled.button`
  width: 42px;
  height: 42px;
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.2s;

  &:hover {
    transform: scale(1.05);
  }
`;

export const DropdownMenu = styled.div`
  position: absolute;
  right: 0;
  top: 52px;
  background-color: ${(props) => props.theme.surface};
  border: 1px solid ${(props) => props.theme.border};
  border-radius: 0.75rem;
  width: 240px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  z-index: 200;
`;

export const DropdownHeader = styled.div`
  padding: 1rem;
  background-color: ${(props) => props.theme.surfaceHover};
  display: flex;
  flex-direction: column;
  border-bottom: 1px solid ${(props) => props.theme.border};

  .name {
    font-weight: 600;
    font-size: 0.95rem;
  }
  .email {
    font-size: 0.8rem;
    opacity: 0.6;
    margin-top: 0.15rem;
  }
`;

export const DropdownItem = styled.button`
  width: 100%;
  padding: 0.75rem 1rem;
  background: none;
  border: none;
  color: ${(props) => (props.$danger ? "#ef4444" : props.theme.text)};
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.9rem;
  cursor: pointer;
  text-align: left;
  transition: background 0.2s;

  &:hover {
    background-color: ${(props) => props.theme.surfaceHover};
  }
`;

export const HeroSection = styled.header`
  background-color: ${(props) => props.theme.heroBg};
  color: ${(props) => props.theme.heroText};
  padding: 5rem 2rem;
  text-align: center;
  display: flex;
  justify-content: center;
`;

export const HeroContent = styled.div`
  max-width: 700px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;

  h1 {
    font-size: 2.75rem;
    font-weight: 800;
    line-height: 1.2;
    letter-spacing: -1px;
    margin: 0;

    span {
      color: ${(props) => props.theme.primary};
    }
  }

  p {
    font-size: 1.1rem;
    opacity: 0.8;
    line-height: 1.6;
    margin: 0;
  }
`;

export const PrimaryButton = styled.button`
  background-color: ${(props) => props.theme.primary};
  color: #000000;
  border: none;
  padding: 0.85rem 1.75rem;
  border-radius: 0.5rem;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition:
    transform 0.2s,
    opacity 0.2s;

  &:hover {
    transform: translateY(-1px);
    opacity: 0.95;
  }
`;

export const MenuSection = styled.section`
  max-width: 1200px;
  margin: 0 auto;
  padding: 4rem 2rem;

  h2 {
    font-size: 1.8rem;
    font-weight: 800;
    margin-bottom: 2rem;
    letter-spacing: -0.5px;
  }
`;

export const CategoriesContainer = styled.div`
  display: flex;
  gap: 0.75rem;
  overflow-x: auto;
  padding-bottom: 1rem;
  margin-bottom: 2rem;

  &::-webkit-scrollbar {
    height: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${(props) => props.theme.border};
    border-radius: 2px;
  }
`;

export const CategoryButton = styled.button`
  background-color: ${(props) =>
    props.$active ? props.theme.primary : props.theme.surface};
  color: ${(props) => (props.$active ? "#000000" : props.theme.text)};
  border: 1px solid
    ${(props) => (props.$active ? props.theme.primary : props.theme.border)};
  padding: 0.6rem 1.2rem;
  border-radius: 2rem;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  white-space: nowrap;
  transition: all 0.2s;

  &:hover {
    border-color: ${(props) => props.theme.primary};
  }
`;

export const ProductsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 2rem;
`;

export const ProductCard = styled.div`
  background-color: ${(props) => props.theme.surface};
  border: 1px solid ${(props) => props.theme.border};
  border-radius: 1rem;
  overflow: hidden;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
`;

export const ProductImage = styled.div`
  width: 100%;
  height: 200px;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s;
  }

  &:hover img {
    transform: scale(1.04);
  }
`;

export const ProductInfo = styled.div`
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 0.75rem;

  .title-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;

    h4 {
      margin: 0;
      font-size: 1.15rem;
      font-weight: 700;
    }
    .price {
      font-weight: 800;
      color: ${(props) => props.theme.primary};
      font-size: 1.1rem;
    }
  }

  p {
    margin: 0;
    font-size: 0.88rem;
    opacity: 0.7;
    line-height: 1.5;
    flex: 1;
  }
`;

export const AddToCartButton = styled.button`
  background-color: transparent;
  color: ${(props) => props.theme.text};
  border: 1px solid ${(props) => props.theme.border};
  padding: 0.75rem;
  border-radius: 0.5rem;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  margin-top: 0.5rem;
  transition: all 0.2s;

  &:hover {
    background-color: ${(props) => props.theme.primary};
    border-color: ${(props) => props.theme.primary};
    color: #000000;
  }
`;

export const Footer = styled.footer`
  background-color: ${(props) => props.theme.surface};
  border-top: 1px solid ${(props) => props.theme.border};
  padding: 4rem 2rem 2rem 2rem;
  margin-top: 4rem;
`;

export const FooterGrid = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 4rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 2.5rem;
  }
`;

export const FooterBrandColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;

  p {
    font-size: 0.9rem;
    opacity: 0.7;
    line-height: 1.6;
    margin: 0;
    max-width: 360px;
  }
`;

export const SocialLinks = styled.div`
  display: flex;
  gap: 1rem;

  a {
    color: ${(props) => props.theme.text};
    opacity: 0.7;
    transition: opacity 0.2s;
    &:hover {
      opacity: 1;
      color: ${(props) => props.theme.primary};
    }
  }
`;

export const FooterColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;

  h5 {
    margin: 0;
    font-size: 1rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  ul {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;

    li a,
    li span {
      font-size: 0.9rem;
      color: ${(props) => props.theme.text};
      opacity: 0.7;
      text-decoration: none;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: opacity 0.2s;
    }

    li a:hover {
      opacity: 1;
      color: ${(props) => props.theme.primary};
    }
  }
`;

export const FooterCopy = styled.div`
  max-width: 1200px;
  margin: 3rem auto 0 auto;
  padding-top: 1.5rem;
  border-top: 1px solid ${(props) => props.theme.border};
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  opacity: 0.5;

  @media (max-width: 480px) {
    flex-direction: column;
    gap: 0.5rem;
    text-align: center;
  }
`;
