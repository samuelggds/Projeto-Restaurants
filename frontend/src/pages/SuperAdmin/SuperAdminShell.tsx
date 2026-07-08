import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { LogOut, Moon, ShieldCheck, Sun } from "lucide-react";
import { toast } from "react-toastify";
import { useAuth } from "../../contexts/authContext";
import * as S from "./styles";
import {
  SUPER_ADMIN_NAV_ITEMS,
  type SuperAdminNavKey,
} from "./superAdminNavConfig";

type SuperAdminShellProps = {
  title: string;
  subtitle: string;
  activeItem: SuperAdminNavKey;
  children: React.ReactNode;
};

export default function SuperAdminShell({
  title,
  subtitle,
  activeItem,
  children,
}: SuperAdminShellProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const targetNode = event.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(targetNode)) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <ThemeProvider theme={isDarkMode ? S.darkTheme : S.lightTheme}>
      <S.DashboardContainer>
        <S.Sidebar>
          <S.SidebarLogo>
            <ShieldCheck size={28} />
            <div>
              <h3>PeçaJá</h3>
              <span>MASTER CONSOLE</span>
            </div>
          </S.SidebarLogo>

          <S.SidebarNav>
            {SUPER_ADMIN_NAV_ITEMS.map((item) => {
              const Icon = item.icon;

              return (
                <S.SidebarLink
                  key={item.key}
                  $active={activeItem === item.key}
                  onClick={() => {
                    if (item.route) {
                      navigate(item.route);
                      return;
                    }

                    if (item.toastMessage) {
                      toast.info(item.toastMessage);
                    }
                  }}
                >
                  <Icon size={18} /> {item.label}
                </S.SidebarLink>
              );
            })}
          </S.SidebarNav>

          <S.SidebarFooter>
            <span className="version">v4.12.0 - Core Engine</span>
          </S.SidebarFooter>
        </S.Sidebar>

        <S.MainContent>
          <S.TopBar>
            <S.PageTitle>
              <h1>{title}</h1>
              <p>{subtitle}</p>
            </S.PageTitle>

            <S.TopBarActions>
              <S.IconButton
                onClick={() => setIsDarkMode((current) => !current)}
              >
                {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
              </S.IconButton>

              <S.UserDropdownContainer ref={dropdownRef}>
                <S.UserTrigger
                  onClick={() => setIsDropdownOpen((current) => !current)}
                >
                  <div className="avatar">M</div>
                  <div className="info">
                    <span className="name">{user?.name || "Diretor Root"}</span>
                    <span className="role">Super Admin</span>
                  </div>
                </S.UserTrigger>

                {isDropdownOpen ? (
                  <S.DropdownMenu>
                    <S.DropdownItem onClick={handleLogout}>
                      <LogOut size={16} /> Encerrar Sessão
                    </S.DropdownItem>
                  </S.DropdownMenu>
                ) : null}
              </S.UserDropdownContainer>
            </S.TopBarActions>
          </S.TopBar>

          {children}
        </S.MainContent>
      </S.DashboardContainer>
    </ThemeProvider>
  );
}
