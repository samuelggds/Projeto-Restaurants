import styled from 'styled-components';
import { MiniRow } from './shared.styles';

export const PendingBreakdown = styled.section`
  margin-top: 16px;
  padding: 18px;
  border: 1px solid #e8c69a;
  border-radius: 18px;
  background: #fffaf2;
  h3 {
    margin: 0;
    font-size: 17px;
  }
  p {
    margin: 6px 0 16px;
    color: #735e41;
    font-size: 13px;
  }
  > div {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
  }
  button {
    min-width: 0;
    min-height: 80px;
    padding: 14px;
    display: flex;
    align-items: center;
    gap: 10px;
    border: 1px solid #e8d4b9;
    border-radius: 12px;
    background: #fff;
    color: #62451e;
    text-align: left;
    cursor: pointer;
  }
  button span {
    flex: 1;
    font-size: 12px;
  }
  button strong {
    display: block;
    margin-top: 4px;
    font-size: 24px;
  }
  svg {
    width: 20px;
    flex-shrink: 0;
  }
  @media (max-width: 760px) {
    > div {
      grid-template-columns: 1fr;
    }
  }
`;

export const PriorityGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  @media (max-width: 1200px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

export const PriorityCard = styled.button`
  padding: 20px;
  display: grid;
  grid-template-columns: 48px 1fr 20px;
  gap: 13px;
  align-items: start;
  border: 1px solid #dfe6e1;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(32, 55, 43, 0.05);
  text-align: left;
  cursor: pointer;
  .icon {
    width: 48px;
    height: 48px;
    display: grid;
    place-items: center;
    border-radius: 14px;
    background: #f3f8f5;
  }
  .icon svg {
    width: 22px;
  }
  small,
  strong {
    display: block;
  }
  small {
    font-size: 11px;
    font-weight: 900;
    text-transform: uppercase;
    color: #738078;
  }
  strong {
    font-size: 30px;
    margin: 2px 0;
  }
  p {
    margin: 0;
    color: #6d7972;
    font-size: 13px;
    line-height: 1.45;
  }
  > svg {
    width: 18px;
    margin-top: 13px;
    color: #9aa59f;
  }
`;

export const PriorityOrderButton = styled(MiniRow).attrs({ as: 'button', type: 'button' })`
  width: 100%;
  border: 0;
  border-top: 1px solid #edf0ee;
  background: transparent;
  text-align: left;
  color: inherit;
  font: inherit;
  cursor: pointer;
  min-height: 56px;
  &:hover {
    background: #f3f8f5;
  }
  &:focus-visible {
    outline: 3px solid #79a98b;
    outline-offset: 2px;
    border-radius: 8px;
  }
`;
