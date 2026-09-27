import styled from 'styled-components';
import { DiscountBadge } from './TableMenuExperience.styles.home';

export const ProductPlaceholder = styled.div`
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  background: transparent;
  color: #b8b8be;

  svg {
    width: 32px;
    height: 32px;
    stroke-width: 1.5;
  }
`;

export const CompleteProductPlaceholder = styled(ProductPlaceholder)`
  min-height: 300px;
  background: #f6f6f7;

  svg {
    width: 54px;
    height: 54px;
  }
`;

export const CompleteProductDetail = styled.section`
  width: min(520px, 100%);
  min-height: 100%;
  margin: 0 auto;
  background: #fff;
  display: grid;
  grid-template-rows: auto 1fr;

  .media {
    position: relative;
    min-height: 300px;
    background: #f3f3f4;
    overflow: hidden;
  }

  .media > img {
    width: 100%;
    height: 300px;
    object-fit: cover;
    display: block;
  }

  .back,
  .favorite {
    position: absolute;
    top: 14px;
    width: 36px;
    height: 36px;
    border-radius: 999px;
    display: grid;
    place-items: center;
    background: rgba(255,255,255,.94);
    color: #161616;
    box-shadow: 0 3px 10px rgba(0,0,0,.12);
  }

  .back {
    left: 14px;
    border: 0;
  }

  .favorite {
    right: 14px;
  }

  ${DiscountBadge} {
    top: auto;
    left: 14px;
    bottom: 14px;
  }

  .content {
    padding: 18px 16px calc(18px + env(safe-area-inset-bottom));
    display: grid;
    align-content: start;
    gap: 11px;
  }

  .title-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  h1 {
    margin: 0;
    font-size: 24px;
    line-height: 1.05;
    font-weight: 950;
  }

  .rating {
    flex: 0 0 auto;
    padding-top: 3px;
    color: #e1a300;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 10px;
    font-weight: 850;
  }

  .price strong {
    color: var(--primary);
    font-size: 20px;
  }

  .description {
    margin: 0;
    color: var(--muted);
    font-size: 11px;
    line-height: 1.5;
  }

  .observation {
    margin-top: 4px;
    display: grid;
    gap: 6px;
  }

  .observation > span {
    font-size: 11px;
    font-weight: 850;
  }

  .observation textarea {
    width: 100%;
    min-height: 74px;
    resize: vertical;
    padding: 10px 11px;
    border: 1px solid #dedee3;
    border-radius: 10px;
    outline: 0;
    font: inherit;
    font-size: 10px;
    line-height: 1.45;
  }

  .observation textarea:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 10%, transparent);
  }

  .observation small {
    justify-self: end;
    color: #99999f;
    font-size: 8px;
  }

  .bottom-action {
    position: sticky;
    bottom: 0;
    margin: 8px -16px -18px;
    padding: 10px 16px calc(10px + env(safe-area-inset-bottom));
    border-top: 1px solid #eeeeef;
    background: rgba(255,255,255,.97);
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 10px;
    align-items: center;
  }

  @media (min-width: 760px) {
    width: min(980px, calc(100% - 36px));
    min-height: 600px;
    border-radius: 18px;
    overflow: hidden;
    grid-template-columns: minmax(0, 1.05fr) minmax(340px, .95fr);
    grid-template-rows: 1fr;

    .media {
      min-height: 600px;
    }

    .media > img {
      height: 100%;
      min-height: 600px;
    }

    .content {
      padding: 34px 30px;
      align-content: center;
      gap: 16px;
    }

    h1 { font-size: 36px; }
    .description { font-size: 13px; }

    .bottom-action {
      position: static;
      margin: 14px 0 0;
      padding: 0;
      border: 0;
      background: transparent;
    }
  }
`;

export const CompleteProductQuantity = styled.div`
  display: grid;
  grid-template-columns: 34px 28px 34px;
  align-items: center;
  border: 1px solid #dedee3;
  border-radius: 10px;
  overflow: hidden;
  background: #fff;

  button {
    width: 34px;
    height: 42px;
    border: 0;
    background: #fff;
    color: var(--primary);
    display: grid;
    place-items: center;
  }

  button:disabled {
    color: #c9c9ce;
  }

  strong {
    text-align: center;
    font-size: 11px;
  }
`;

export const CompleteProductAdd = styled.button`
  min-height: 44px;
  border: 0;
  border-radius: 10px;
  padding: 0 14px;
  background: var(--primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 11px;
  font-weight: 900;

  strong {
    color: inherit;
    font-size: 11px;
  }
`;
