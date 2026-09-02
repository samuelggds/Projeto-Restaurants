import styled from 'styled-components';

export const OrderList = styled.section`
  display: grid;
  gap: 8px;
`;

export const OrderRow = styled.article<{ $status: string }>`
  min-height: 112px;
  padding: 14px 16px;
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) minmax(150px, auto);
  align-items: center;
  gap: 14px;
  border: 1px solid var(--line);
  border-left: 4px solid
    ${(props) =>
      props.$status === 'PRONTO'
        ? '#27917f'
        : props.$status === 'PREPARANDO'
          ? '#d09332'
          : '#83908a'};
  border-radius: 7px;
  background: #fff;

  .order-icon {
    width: 44px;
    height: 44px;
    display: grid;
    place-items: center;
    border-radius: 7px;
    color: #52605a;
    background: #f0f4f2;
  }

  .order-icon svg {
    width: 20px;
  }

  .order-body {
    min-width: 0;
    display: grid;
    gap: 7px;
  }

  .order-title {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 7px;
  }

  .order-title strong {
    color: #17211e;
    font-size: 12px;
  }

  .order-title b {
    color: #607069;
    font-size: 10px;
    font-weight: 600;
  }

  .order-body p {
    margin: 0;
    overflow: hidden;
    color: #55635d;
    font-size: 9px;
    line-height: 1.45;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .order-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 11px;
    color: #7b8782;
    font-size: 8px;
  }

  .order-meta span {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .order-meta svg {
    width: 12px;
  }

  .order-time {
    min-width: 140px;
    display: grid;
    justify-items: end;
    gap: 7px;
    text-align: right;
  }

  .order-time strong {
    color: #31403a;
    font-size: 11px;
  }

  .order-time small {
    color: #82908a;
    font-size: 8px;
  }

  @media (max-width: 680px) {
    grid-template-columns: 38px minmax(0, 1fr);
    padding: 13px 12px;

    .order-icon {
      width: 38px;
      height: 38px;
    }

    .order-time {
      grid-column: 2;
      min-width: 0;
      justify-items: start;
      text-align: left;
    }
  }
`;
