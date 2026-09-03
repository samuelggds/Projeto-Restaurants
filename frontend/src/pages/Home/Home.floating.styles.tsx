import type { ButtonHTMLAttributes, MouseEventHandler } from 'react';
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
    linear-gradient(135deg, color-mix(in srgb, var(--home-primary) 7%, #fff), #fff 62%), #fff;
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

export function FloatingActionsToggle({ children, ...props }: FloatingActionsToggleProps) {
  return <Button {...props}>{children}</Button>;
}
