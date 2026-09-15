import styled from 'styled-components';

export function GastroNexaTourBrand({ compact = false }: { compact?: boolean }) {
  return (
    <Brand $compact={compact} aria-label="GastroNexa">
      <img src="/gastronexa-logo.svg" alt="" aria-hidden="true" />
      <span>
        Gastro<strong>Nexa</strong>
      </span>
    </Brand>
  );
}

const Brand = styled.span<{ $compact: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ $compact }) => ($compact ? '7px' : '9px')};
  min-width: 0;
  color: #fff;
  font-size: ${({ $compact }) => ($compact ? '12px' : '14px')};
  font-weight: 900;
  letter-spacing: -0.02em;
  line-height: 1;

  img {
    width: ${({ $compact }) => ($compact ? '19px' : '24px')};
    height: ${({ $compact }) => ($compact ? '19px' : '24px')};
    object-fit: contain;
    filter: grayscale(1) brightness(0) invert(1);
  }

  strong {
    color: #f26a21;
    font: inherit;
  }
`;
