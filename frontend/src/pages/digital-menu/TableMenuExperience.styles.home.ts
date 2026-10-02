import styled from 'styled-components';

export const DiscountBadge = styled.span`
  position: absolute;
  top: 9px;
  left: 9px;
  z-index: 2;
  max-width: calc(100% - 18px);
  padding: 6px 9px;
  border-radius: 999px;
  background: var(--primary);
  color: #fff;
  font-size: 10px;
  line-height: 1;
  font-weight: 950;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.14);
`;

export const ProductPrice = styled.div`
  display: flex;
  align-items: baseline;
  gap: 7px;
  flex-wrap: wrap;

  del {
    color: #8d8d94;
    font-size: 11px;
    font-weight: 650;
  }

  strong {
    color: var(--text);
    font-size: 15px;
  }
`;
