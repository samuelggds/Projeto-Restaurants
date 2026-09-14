import styled, { css } from 'styled-components';

export const ReadingModeControl = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 14px;

  &&[aria-pressed='true'] {
    border-color: var(--teal);
    color: #fff;
    background: var(--teal);
  }

  svg {
    width: 20px;
    height: 20px;
    flex: 0 0 auto;
  }
`;

export const kitchenLargeReadingStyles = css`
  &.large-reading {
    padding: 18px;
    gap: 16px;

    .head {
      flex-wrap: wrap;
    }

    .identity {
      min-width: 0;
    }

    .identity b,
    .item-name {
      font-size: 18px;
    }

    .identity small {
      font-size: 14px;
      overflow-wrap: anywhere;
    }

    .items {
      font-size: 16px;
      line-height: 1.5;
      overflow-wrap: anywhere;
    }

    .order-item {
      padding: 12px;
      gap: 10px;
    }

    .item-name > span {
      min-width: 34px;
      height: 32px;
      font-size: 14px;
    }

    .choice-group {
      grid-template-columns: minmax(0, 1fr);
      padding-left: 0;
    }

    .choice-group b,
    .item-observation b,
    .order-observation b {
      font-size: 13px;
    }

    .choice-group span,
    .item-observation span,
    .order-observation span {
      font-size: 16px;
      line-height: 1.5;
    }

    .item-observation,
    .order-observation {
      margin-left: 0;
      padding: 12px;
    }

    .elapsed {
      flex-wrap: wrap;
      font-size: 20px;
    }

    .waiting,
    .action-error,
    .action-success {
      font-size: 14px;
      line-height: 1.5;
    }

    .card-actions {
      grid-template-columns: minmax(0, 1fr);
    }

    .action,
    .reprint {
      min-height: 56px;
      padding: 12px;
      font-size: 16px;
      line-height: 1.4;
    }

    .action-error button {
      min-height: 48px;
      font-size: 14px;
    }
  }
`;
