import { useEffect, useRef, type ButtonHTMLAttributes, type MouseEventHandler } from 'react';
import { PanelBottomClose, PanelBottomOpen } from 'lucide-react';
import styled from 'styled-components';

type FloatingActionsToggleProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  onClick?: MouseEventHandler<HTMLButtonElement>;
};

const Button = styled.button`
  width: min(290px, calc(100vw - 24px));
  min-height: 48px;
  padding: 6px 7px 6px 10px;
  border: 1px solid color-mix(in srgb, var(--home-primary) 34%, #e8ddd3);
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
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
    width: min(290px, 100%);
    min-height: 48px;
    border-radius: 14px;
  }
`;

const Copy = styled.span`
  min-width: 0;
  display: grid;
  gap: 3px;

  strong {
    color: #26211d;
    font-size: 12px;
    line-height: 1.15;
    font-weight: 900;
  }

  small {
    color: #776c63;
    font-size: 9px;
    line-height: 1.25;
    font-weight: 700;
    overflow-wrap: anywhere;
  }
`;

const Action = styled.span`
  flex: 0 0 auto;
  min-height: 32px;
  padding: 5px 7px;
  border-radius: 9px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  color: color-mix(in srgb, var(--home-primary) 88%, #2b211b);
  background: color-mix(in srgb, var(--home-primary) 10%, #fff);
  font-size: 9px;
  font-weight: 900;

  svg {
    width: 14px;
    height: 14px;
  }

  @media (max-width: 350px) {
    padding-inline: 8px;

    span {
      display: none;
    }
  }
`;

export function FloatingActionsToggle({ children: _children, ...props }: FloatingActionsToggleProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const expanded = props['aria-expanded'] === true || props['aria-expanded'] === 'true';
  const shouldOpenOnMount = useRef(!expanded);

  useEffect(() => {
    if (!shouldOpenOnMount.current) return;
    shouldOpenOnMount.current = false;
    buttonRef.current?.click();
  }, []);

  return (
    <Button {...props} ref={buttonRef}>
      <Copy>
        <strong>Mesa e atendimento</strong>
        <small>Pedido • Garçom • Conta • Cupons</small>
      </Copy>
      <Action aria-hidden="true">
        {expanded ? <PanelBottomClose /> : <PanelBottomOpen />}
        <span>{expanded ? 'Minimizar' : 'Mostrar'}</span>
      </Action>
    </Button>
  );
}
