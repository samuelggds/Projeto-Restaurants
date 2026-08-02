import {
  BarChart3,
  Building2,
  CreditCard,
  FileSearch,
  Headphones,
  Layers3,
  LockKeyhole,
  LogOut,
  Menu,
  Settings,
  ShieldAlert,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { useState } from "react";
import { superAdminMockData } from "./data";
import {
  AdministratorsPage,
  AuditPage,
  BillingPage,
  OverviewPage,
  PlansPage,
  RestaurantsPage,
  SettingsPage,
  SubscriptionsPage,
  SupportPage,
} from "./pages";
import type { SuperAdminModuleProps, SuperAdminView } from "./types";
import * as S from "./SuperAdmin.styles";

const nav = [
  ["overview", "Visão geral", BarChart3],
  ["restaurants", "Restaurantes", Building2],
  ["subscriptions", "Assinaturas", CreditCard],
  ["plans", "Planos", Layers3],
  ["billing", "Faturamento", WalletCards],
  ["administrators", "Administradores", Users],
  ["support", "Suporte", Headphones],
  ["audit", "Auditoria", FileSearch],
  ["settings", "Configurações", Settings],
] as const;
const titles: Record<SuperAdminView, [string, string, string]> = {
  overview: [
    "Visão geral da plataforma",
    "Acompanhe os restaurantes, assinaturas e a saúde do seu SaaS.",
    "+ Novo restaurante",
  ],
  restaurants: [
    "Restaurantes",
    "Gerencie todos os tenants cadastrados na plataforma.",
    "+ Novo restaurante",
  ],
  subscriptions: [
    "Assinaturas",
    "Acompanhe ciclos, trials, renovações e bloqueios.",
    "+ Nova assinatura",
  ],
  plans: [
    "Planos",
    "Configure preços, limites e recursos disponíveis.",
    "+ Criar plano",
  ],
  billing: [
    "Faturamento",
    "Acompanhe receitas, cobranças e inadimplência da plataforma.",
    "Exportar relatório",
  ],
  administrators: [
    "Administradores",
    "Gerencie os responsáveis administrativos de cada restaurante.",
    "+ Convidar administrador",
  ],
  support: [
    "Suporte",
    "Acompanhe chamados enviados pelos administradores dos restaurantes.",
    "+ Abrir chamado",
  ],
  audit: [
    "Auditoria",
    "Consulte ações sensíveis realizadas em toda a plataforma.",
    "Exportar logs",
  ],
  settings: [
    "Configurações da plataforma",
    "Defina regras globais, segurança e integrações do SaaS.",
    "Salvar alterações",
  ],
};

export function SuperAdminModule({
  currentUser,
  data = superAdminMockData,
  initialView = "overview",
  onViewChange,
  onCreateRestaurant,
  onSelectRestaurant,
  onSaveSettings,
  onLogout,
}: SuperAdminModuleProps) {
  const [view, setView] = useState<SuperAdminView>(initialView);
  const [open, setOpen] = useState(false);
  if (currentUser.role !== "SUPER_ADMIN")
    return (
      <S.AccessDenied>
        <ShieldAlert />
        <h1>Acesso negado</h1>
        <p>
          Esta área é exclusiva para usuários com a função SUPER_ADMIN. Entre
          com uma conta autorizada.
        </p>
      </S.AccessDenied>
    );
  const navigate = (next: SuperAdminView) => {
    setView(next);
    setOpen(false);
    onViewChange?.(next);
  };
  const [title, subtitle, action] = titles[view];
  const render = () => {
    switch (view) {
      case "overview":
        return <OverviewPage data={data} onSelect={onSelectRestaurant} />;
      case "restaurants":
        return <RestaurantsPage data={data} onSelect={onSelectRestaurant} />;
      case "subscriptions":
        return <SubscriptionsPage data={data} />;
      case "plans":
        return <PlansPage data={data} />;
      case "billing":
        return <BillingPage data={data} />;
      case "administrators":
        return <AdministratorsPage data={data} />;
      case "support":
        return <SupportPage data={data} />;
      case "audit":
        return <AuditPage data={data} />;
      case "settings":
        return <SettingsPage initial={data.settings} onSave={onSaveSettings} />;
    }
  };
  const primary = () => {
    if (view === "restaurants" || view === "overview") onCreateRestaurant?.();
  };
  return (
    <S.Root>
      <S.Sidebar $open={open}>
        <S.Brand>
          <span>
            <b>S&C</b> Platform
          </span>
          <small>PAINEL SUPER ADMIN</small>
        </S.Brand>
        <S.Close onClick={() => setOpen(false)}>
          <X />
        </S.Close>
        <S.Nav>
          {nav.map(([id, label, Icon]) => (
            <button
              key={id}
              className={view === id ? "active" : ""}
              onClick={() => navigate(id)}
            >
              <Icon />
              {label}
            </button>
          ))}
        </S.Nav>
        <S.User>
          <span className="avatar">
            {currentUser.name
              .split(" ")
              .map((x) => x[0])
              .slice(0, 2)
              .join("")}
          </span>
          <span className="info">
            <b>{currentUser.name}</b>
            <small>SUPER_ADMIN</small>
          </span>
          <button className="logout" onClick={onLogout}>
            <LogOut />
          </button>
        </S.User>
      </S.Sidebar>
      {open && <S.Overlay onClick={() => setOpen(false)} />}
      <S.Main>
        <S.Header>
          <S.MobileMenu onClick={() => setOpen(true)}>
            <Menu />
          </S.MobileMenu>
          <div className="title">
            <span className="crumb">PLATAFORMA / {view.toUpperCase()}</span>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          <span className="access">
            <LockKeyhole size={15} />
            Acesso exclusivo SUPER_ADMIN
          </span>
          <button className="primary" onClick={primary}>
            {action}
          </button>
        </S.Header>
        <S.Content>{render()}</S.Content>
      </S.Main>
    </S.Root>
  );
}
