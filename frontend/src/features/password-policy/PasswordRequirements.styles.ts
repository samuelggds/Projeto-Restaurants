import styled from 'styled-components';

export const Panel = styled.section`
  width: 100%;
  box-sizing: border-box;
  border: 1px solid ${({ theme }) => theme.border || 'rgba(148, 163, 184, 0.35)'};
  border-left: 3px solid ${({ theme }) => theme.primary || '#e9530b'};
  border-radius: 10px;
  padding: 12px 14px 13px;
  background: ${({ theme }) => theme.surface || '#fffaf6'};
  color: ${({ theme }) => theme.text || '#27313a'};
  box-shadow: 0 7px 22px rgba(31, 41, 55, 0.05);
`;

export const Title = styled.div`
  margin: 0 0 9px;
  color: inherit;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.01em;
  line-height: 1.35;
`;

export const List = styled.ul`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 8px 16px;
  margin: 0;
  padding: 0;
  list-style: none;

  @media (min-width: 540px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

export const Item = styled.li<{ $met: boolean }>`
  min-width: 0;
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  color: ${({ $met, theme }) => ($met ? theme.success || '#16825d' : theme.textMuted || '#64748b')};
  font-size: 0.76rem;
  font-weight: ${({ $met }) => ($met ? 650 : 500)};
  line-height: 1.35;
  transition: color 160ms ease;
`;

export const Icon = styled.span<{ $met: boolean }>`
  width: 16px;
  height: 16px;
  display: inline-grid;
  place-items: center;
  box-sizing: border-box;
  border: 1.5px solid currentColor;
  border-radius: 50%;
  background: ${({ $met, theme }) => ($met ? theme.success || '#16825d' : 'transparent')};
  color: ${({ $met }) => ($met ? '#fff' : 'currentColor')};
  transition:
    color 160ms ease,
    background 160ms ease,
    border-color 160ms ease;
`;

export const Label = styled.span`
  min-width: 0;
`;
