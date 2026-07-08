import {
  Activity,
  Building2,
  DollarSign,
  UserPlus,
  type LucideIcon,
} from "lucide-react";

export type SuperAdminNavKey = "dashboard" | "finance" | "infra" | "create";

export type SuperAdminNavItem = {
  key: SuperAdminNavKey;
  label: string;
  icon: LucideIcon;
  route?: string;
  toastMessage?: string;
};

export const SUPER_ADMIN_NAV_ITEMS: SuperAdminNavItem[] = [
  {
    key: "dashboard",
    label: "Empresas Parceiras",
    icon: Building2,
    route: "/super_admin",
  },
  {
    key: "finance",
    label: "Conciliação Global",
    icon: DollarSign,
    toastMessage: "Módulo financeiro em desenvolvimento.",
  },
  {
    key: "infra",
    label: "Uptime & Logs (Infra)",
    icon: Activity,
    toastMessage: "Logs de auditoria protegidos.",
  },
  {
    key: "create",
    label: "Novo Restaurante + Admin",
    icon: UserPlus,
    route: "/super_admin/cadastro",
  },
];
