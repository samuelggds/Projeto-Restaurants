import { PanelBottomClose, PanelBottomOpen } from 'lucide-react';
import styled from 'styled-components';

type FloatingActionsControlProps = {
  mode: 'customer' | 'table';
  collapsed: boolean;
  onToggle: () => void;
};

const copy = {
  customer: {
    title: 'Cupom e status',
    description: 'Fidelidade • Pedido em andamento',
    aria: 'cupom, fidelidade e status do pedido',
  },
  table: {
    title: 'Mesa e atendimento',
    description: 'Pedido • Garçom • Conta • Cupons',
    aria: 'pedido da mesa, chamar garçom, pedir ou ver a conta e cupons',
  },
} as const;

export function FloatingActionsControl({
  mode,
  collapsed,
  onToggle,
}: FloatingActionsControlProps) {
  const content = copy[mode];
  const action = collapsed ? 'Mostrar' : 'Minimizar';

  return (
    <ControlButton
      type="button"
      data-testid={`floating-actions-control-${mode}`}
      aria-expanded={!collapsed}
      aria-label={`${action} ${content.aria}`}
      onClick={onToggle}
    >
      <Copy>
        <strong>{content.title}</strong>
        <small>{content.description}</small>
      </Copy>
      <Action aria-hidden="true">
        {collapsed ? <PanelBottomOpen /> : <PanelBottomClose />}
        <span>{action}</span>
      </Action>
    </ControlButton>
  );
}

const ControlButton = styled.button`
  width: min(360px, calc(100vw - 32px));
  min-height: 58px;
  padding: 9px 10px 9px 14px;
  border: 1px solid color-mix(in srgb, var(--home-primary) 34%, #e8ddd3);
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: #3d352f;
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--home-primary) 7%, #fff), #fff 62%),
    #fff;
  box-shadow:
    0 12px 30px rgba(55, 38, 26, 0.14),
    0 2px 7px rgba(55, 38, 26, 0.06);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    transform 160ms ease,
    box-shadow 160ms ease,
    border-color 160ms ease;

  &:hover {
    transform: translateY(-1px);
    border-color: color-mix(in srgb, var(--home-primary) 54%, #d8c7b8);
    box-shadow:
      0 15px 34px rgba(55, 38, 26, 0.17),
      0 3px 8px rgba(55, 38, 26, 0.07);
  }

  &:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--home-primary) 25%, transparent);
    outline-offset: 3px;
  }

  @media (max-width: 700px) {
    width: 100%;
    min-height: 56px;
    border-radius: 16px;
  }

  @media (max-width: 350px) {
    padding-left: 11px;
    gap: 8px;
  }
`;

const Copy = styled.span`
  min-width: 0;
  display: grid;
  gap: 3px;

  strong {
    color: #26211d;
    font-size: 13px;
    line-height: 1.15;
    font-weight: 900;
    letter-spacing: -0.01em;
  }

  small {
    color: #776c63;
    font-size: 10px;
    line-height: 1.25;
    font-weight: 700;
    overflow-wrap: anywhere;
  }

  @media (max-width: 350px) {
    strong {
      font-size: 12px;
    }

    small {
      font-size: 9px;
    }
  }
`;

const Action = styled.span`
  flex: 0 0 auto;
  min-height: 38px;
  padding: 7px 10px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  color: color-mix(in srgb, var(--home-primary) 88%, #2b211b);
  background: color-mix(in srgb, var(--home-primary) 10%, #fff);
  font-size: 10px;
  font-weight: 900;

  svg {
    width: 16px;
    height: 16px;
  }

  @media (max-width: 350px) {
    min-height: 36px;
    padding-inline: 8px;

    span {
      display: none;
    }
  }
`;
