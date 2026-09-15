import styled from 'styled-components';

type SidebarPlatformBrandProps = {
  tone?: 'dark' | 'light';
};

const Root = styled.div<{ $tone: 'dark' | 'light' }>`
  width: calc(100% - 16px);
  min-height: 48px;
  margin: 0 8px 13px;
  padding-bottom: 13px;
  display: flex;
  align-items: center;
  gap: 9px;
  border-bottom: 1px solid
    ${({ $tone }) => ($tone === 'dark' ? 'rgba(255, 255, 255, 0.09)' : 'rgba(15, 23, 42, 0.1)')};

  img {
    width: 34px;
    height: 30px;
    flex: 0 0 auto;
    object-fit: contain;
  }

  .name {
    min-width: 0;
    display: flex;
    align-items: baseline;
    font-family: 'Sora', 'Plus Jakarta Sans', sans-serif;
    font-size: 18px;
    font-weight: 850;
    letter-spacing: -0.55px;
    line-height: 1;
    white-space: nowrap;
  }

  .gastro {
    color: ${({ $tone }) => ($tone === 'dark' ? '#ffffff' : '#111111')};
  }

  .nexa {
    color: #e9530b;
  }
`;

export function SidebarPlatformBrand({ tone = 'dark' }: SidebarPlatformBrandProps) {
  return (
    <Root $tone={tone} aria-label="GastroNexa">
      <img src="/gastronexa-logo.svg" alt="" aria-hidden="true" />
      <span className="name">
        <span className="gastro">Gastro</span>
        <span className="nexa">Nexa</span>
      </span>
    </Root>
  );
}
