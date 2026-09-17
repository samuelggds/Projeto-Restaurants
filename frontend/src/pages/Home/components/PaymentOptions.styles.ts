import styled from 'styled-components';

export const PaymentIntro = styled.div`
  display: grid;
  gap: 3px;
  margin: 2px 0 10px;

  strong {
    color: var(--home-text);
    font-size: 15px;
    font-weight: 850;
  }

  span {
    color: #747b77;
    font-size: 11px;
    line-height: 1.45;
  }
`;

export const PaymentModes = styled.div`
  display: grid;
  gap: 10px;
`;

export const PaymentMode = styled.section<{ $active: boolean; $open: boolean }>`
  overflow: hidden;
  border: 1px solid ${({ $active }) => ($active ? 'color-mix(in srgb, var(--home-primary) 45%, #d8ded9)' : '#d9dfdb')};
  border-radius: 15px;
  background: ${({ $active }) => ($active ? 'color-mix(in srgb, var(--home-primary) 4%, #fff)' : '#fff')};
  box-shadow: ${({ $active }) => ($active ? '0 10px 26px rgba(28, 45, 37, 0.08)' : '0 2px 8px rgba(28, 45, 37, 0.03)')};
  transition:
    border-color 0.18s ease,
    background 0.18s ease,
    box-shadow 0.18s ease;
`;

export const PaymentModeButton = styled.button<{ $open: boolean }>`
  width: 100%;
  min-height: 72px;
  padding: 12px 13px;
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) auto;
  align-items: center;
  gap: 11px;
  border: 0;
  background: transparent;
  color: var(--home-text);
  text-align: left;
  cursor: pointer;

  .mode-icon {
    width: 42px;
    height: 42px;
    display: grid;
    place-items: center;
    border-radius: 12px;
    background: color-mix(in srgb, var(--home-primary) 10%, #fff);
    color: var(--home-primary);
  }

  .mode-icon svg {
    width: 20px;
    height: 20px;
  }

  .mode-copy {
    min-width: 0;
    display: grid;
    gap: 3px;
  }

  .mode-copy strong {
    font-size: 14px;
    font-weight: 900;
    line-height: 1.25;
  }

  .mode-copy small {
    color: #737b76;
    font-size: 10px;
    line-height: 1.4;
  }

  .mode-selected {
    color: var(--home-primary);
    font-size: 9px;
    font-weight: 850;
  }

  .mode-chevron {
    width: 19px;
    height: 19px;
    color: #7c847f;
    transform: rotate(${({ $open }) => ($open ? '180deg' : '0deg')});
    transition: transform 0.18s ease;
  }

  &:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--home-primary) 20%, transparent);
    outline-offset: -3px;
  }
`;

export const PaymentModePanel = styled.div<{ $open: boolean }>`
  display: ${({ $open }) => ($open ? 'grid' : 'none')};
  gap: 10px;
  padding: 0 12px 13px;
  border-top: ${({ $open }) => ($open ? '1px solid #edf0ed' : '0')};
  padding-top: ${({ $open }) => ($open ? '12px' : '0')};

  > p:first-child {
    margin-top: 0;
  }
`;

export const PaymentModeHint = styled.p`
  margin: -2px 1px 0;
  color: #7b827e;
  font-size: 10px;
  line-height: 1.45;
`;
