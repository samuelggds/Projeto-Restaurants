import { useState, useRef, useEffect } from "react";

type UserState = {
  name?: string;
  email?: string;
  role?: string;
};

type HeaderProps = {
  name: string;
  cartCount: number;
  user?: UserState | null;
  onCart: () => void;
  onLogin: () => void;
  onLogout: () => void;
  onNavigate: (path: string) => void;
};

export function Header({
  name,
  cartCount,
  user,
  onCart,
  onLogin,
  onLogout,
  onNavigate,
}: HeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="header">
      <a className="brand" href="#inicio">
        {name}
      </a>
      <nav>
        <a className="active" href="#inicio">
          Início
        </a>
        <a href="#cardapio">Cardápio</a>
        <a href="#sobre">Sobre</a>
        <a href="#contato">Contato</a>
      </nav>
      <div className="header-actions">
        {user?.role === "ADMIN" && (
          <button
            className="admin-badge"
            type="button"
            onClick={() => onNavigate("/admin")}
          >
            Admin
          </button>
        )}
        <button
          className="cart-button"
          type="button"
          onClick={onCart}
          aria-label="Abrir carrinho"
        >
          🛒
          {cartCount > 0 && <span>{cartCount}</span>}
        </button>
        {user ? (
          <div className="user-menu" ref={dropdownRef}>
            <button
              className="user-avatar"
              type="button"
              onClick={() => setDropdownOpen((open) => !open)}
              aria-label="Menu do usuário"
            >
              👤
            </button>
            {dropdownOpen && (
              <div className="user-dropdown">
                <div className="user-dropdown-header">
                  <span className="name">{user.name || "Usuário"}</span>
                  <span className="email">{user.email || "-"}</span>
                </div>
                <button
                  className="user-dropdown-item"
                  type="button"
                  onClick={() => {
                    onNavigate("/profile");
                    setDropdownOpen(false);
                  }}
                >
                  👤 Meu Perfil
                </button>
                <button
                  className="user-dropdown-item"
                  type="button"
                  onClick={() => {
                    onNavigate("/profile/orders");
                    setDropdownOpen(false);
                  }}
                >
                  🛍️ Meus Pedidos
                </button>
                <button
                  className="user-dropdown-item danger"
                  type="button"
                  onClick={() => {
                    onLogout();
                    setDropdownOpen(false);
                  }}
                >
                  🚪 Fazer Logout
                </button>
              </div>
            )}
          </div>
        ) : (
          <button className="login-button" type="button" onClick={onLogin}>
            Entrar
          </button>
        )}
      </div>
    </header>
  );
}
