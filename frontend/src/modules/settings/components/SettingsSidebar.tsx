import * as S from "../styles/settings.styles";
import type { SettingsSectionId } from "../types/settings.types";

const sections: Array<{
  id: SettingsSectionId;
  icon: string;
  label: string;
  description: string;
}> = [
  {
    id: "business",
    icon: "⌂",
    label: "Restaurante",
    description: "Dados principais",
  },
  {
    id: "appearance",
    icon: "◐",
    label: "Aparência",
    description: "Marca e cores",
  },
  {
    id: "contact",
    icon: "◎",
    label: "Contato e redes",
    description: "Canais públicos",
  },
  {
    id: "whatsapp",
    icon: "◉",
    label: "WhatsApp",
    description: "Atendimento e pedidos",
  },
  {
    id: "about",
    icon: "≡",
    label: "Sobre",
    description: "Descrição institucional",
  },
  {
    id: "hours",
    icon: "◷",
    label: "Horários",
    description: "Dias e funcionamento",
  },
  {
    id: "orders",
    icon: "◇",
    label: "Pedidos e entrega",
    description: "Regras comerciais",
  },
  {
    id: "payments",
    icon: "R$",
    label: "Pagamentos",
    description: "Pix, cartão e webhooks",
  },
];

type SettingsSidebarProps = {
  activeSection: SettingsSectionId;
  onSelect: (section: SettingsSectionId) => void;
};

export function SettingsSidebar({
  activeSection,
  onSelect,
}: SettingsSidebarProps) {
  return (
    <S.Sidebar>
      <S.SidebarTitle>
        <span>Administração</span>
        <strong>Configurações</strong>
      </S.SidebarTitle>

      <S.SidebarNav>
        {sections.map((section) => (
          <S.SidebarButton
            key={section.id}
            $active={activeSection === section.id}
            type="button"
            onClick={() => onSelect(section.id)}
          >
            <S.SidebarIcon aria-hidden="true">{section.icon}</S.SidebarIcon>
            <S.SidebarButtonLabel>
              <strong>{section.label}</strong>
              <small>{section.description}</small>
            </S.SidebarButtonLabel>
          </S.SidebarButton>
        ))}
      </S.SidebarNav>

      <S.SidebarHelp>
        <span aria-hidden="true">?</span>
        <div>
          <strong>Precisa de ajuda?</strong>
          <small>Fale com o suporte</small>
        </div>
      </S.SidebarHelp>
    </S.Sidebar>
  );
}
