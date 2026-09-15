import styled from 'styled-components';
import { CartSummaryRow } from '../Home.styles';

export const DiscountRow = styled(CartSummaryRow)`
  color: #27814a;
  font-weight: 700;
`;

export const Hint = styled.p`
  margin: 7px 0 0;
  color: #80756d;
  font-size: 10px;
  line-height: 1.35;
`;

export const CheckoutIconSlot = styled.span`
  && {
    min-width: 44px;
    flex: 0 0 44px;
    display: grid;
    place-items: center;
    text-align: center;
  }

  svg {
    width: 19px;
    height: 19px;
  }
`;
