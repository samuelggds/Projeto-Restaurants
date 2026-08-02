import {
  CheckCircle2,
  ChefHat,
  ChevronLeft,
  ChevronRight,
  Clock3,
  History,
  LayoutGrid,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import {
  KitchenProvider,
  type KitchenModuleProps as BaseProps,
} from "./KitchenContext";
import { useKitchenWorkspace } from "./useKitchenWorkspace";
import {
  KitchenHistoryPage,
  KitchenOverviewPage,
  KitchenQueuePage,
  KitchenReadyPage,
} from "./pages/KitchenPages";
import * as S from "./Kitchen.styles";

export type KitchenView = "overview" | "queue" | "ready" | "history";
export interface KitchenModuleProps extends BaseProps {
  initialView?: KitchenView;
  onViewChange?: (view: KitchenView) => void;
}
export function KitchenModule({
  initialView = "overview",
  onViewChange,
  ...props
}: KitchenModuleProps) {
  return (
    <KitchenProvider {...props}>
      <KitchenShell initialView={initialView} onViewChange={onViewChange} />
    </KitchenProvider>
  );
}

function KitchenShell({
  initialView,
  onViewChange,
}: {
  initialView: KitchenView;
  onViewChange?: KitchenModuleProps["onViewChange"];
}) {
  const { employee, restaurant, onLogout } = useKitchenWorkspace();
  const [view, setView] = useState(initialView);
  const [open, setOpen] = useState(
    () => typeof window !== "undefined" && window.innerWidth > 820,
  );
  const navigate = (next: KitchenView) => {
    setView(next);
    if (window.innerWidth <= 820) setOpen(false);
    onViewChange?.(next);
  };
  const nav = [
    ["overview", "Visão geral", LayoutGrid],
    ["queue", "Fila de pedidos", ChefHat],
    ["ready", "Prontos", CheckCircle2],
    ["history", "Histórico", History],
  ] as const;
  const titles: Record<KitchenView, [string, string]> = {
    overview: ["Visão geral", "Área operacional exclusiva da cozinha"],
    queue: ["Fila da cozinha", "Prepare os pedidos na ordem correta"],
    ready: ["Pedidos prontos", "Acompanhe os pedidos que aguardam retirada"],
    history: ["Histórico", "Consulte os pedidos concluídos no turno"],
  };
  const Page = {
    overview: KitchenOverviewPage,
    queue: KitchenQueuePage,
    ready: KitchenReadyPage,
    history: KitchenHistoryPage,
  }[view];
  const [title, subtitle] = titles[view];
  return (
    <S.Root $primary={restaurant.primaryColor} $sidebarOpen={open}>
      <S.Sidebar $open={open}>
        <S.CollapseBtn onClick={() => setOpen(false)}>
          <ChevronLeft />
        </S.CollapseBtn>
        <S.Brand>
          <span>{restaurant.monogram}</span>
          <b>{restaurant.restaurantName}</b>
          <small>ÁREA DA COZINHA</small>
        </S.Brand>
        <S.CloseMenu onClick={() => setOpen(false)}>
          <X />
        </S.CloseMenu>
        <S.Nav>
          {nav.map(([id, label, Icon]) => (
            <a
              key={id}
              className={view === id ? "active" : ""}
              onClick={() => navigate(id)}
            >
              <Icon />
              {label}
            </a>
          ))}
        </S.Nav>
        <S.User>
          <span className="avatar">
            {employee.name
              .split(" ")
              .map((x) => x[0])
              .slice(0, 2)
              .join("")}
          </span>
          <span>
            <b>{employee.name}</b>
            <small>Cozinha</small>
          </span>
          <button onClick={onLogout}>
            <LogOut />
          </button>
        </S.User>
      </S.Sidebar>
      {open && <S.Overlay onClick={() => setOpen(false)} />}
      {!open && (
        <S.SidebarOpenTab onClick={() => setOpen(true)}>
          <ChevronRight />
        </S.SidebarOpenTab>
      )}
      <S.Main>
        <S.Top>
          <S.MobileMenu onClick={() => setOpen(true)}>
            <Menu />
          </S.MobileMenu>
          <div>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          <S.Live>
            <Clock3 />
            Em turno <i /> {employee.shift}
          </S.Live>
        </S.Top>
        <S.Content>
          <Page />
        </S.Content>
      </S.Main>
    </S.Root>
  );
}
