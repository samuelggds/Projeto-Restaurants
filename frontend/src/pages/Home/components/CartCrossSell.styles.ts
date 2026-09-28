import styled from 'styled-components';

export const Section = styled.section`
  width: 100%;
  min-width: 0;
  padding: 20px;
  display: grid;
  gap: 16px;
  border: 1px solid #efece6;
  border-radius: 16px;
  background: #fff;

  @media (max-width: 760px) {
    width: calc(100% + 40px);
    margin-left: -20px;
    padding: 0 20px;
    gap: 8px;
    border: 0;
    border-radius: 0;
    background: transparent;
  }
`;

export const Header = styled.div`
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  color: #1f1e1a;
  line-height: normal;
  white-space: nowrap;

  strong {
    font-family: 'Gabarito', 'Inter', sans-serif;
    font-size: 18px;
    font-weight: 800;
  }

  span {
    color: var(--checkout-primary);
    font-family: 'Inter', sans-serif;
    font-size: 16px;
    font-weight: 700;
  }

  @media (max-width: 760px) {
    strong {
      font-size: 14px;
    }

    span {
      font-size: 14px;
    }
  }
`;

export const Row = styled.div`
  width: 100%;
  min-width: 0;
  display: flex;
  align-items: stretch;
  gap: 16px;

  @media (max-width: 760px) {
    align-items: flex-start;
    gap: 8px;
    overflow-x: auto;
    overflow-y: hidden;
    scroll-behavior: smooth;
    scroll-snap-type: x mandatory;
    overscroll-behavior-x: contain;
    scrollbar-width: none;

    &::-webkit-scrollbar {
      display: none;
    }
  }
`;

export const Card = styled.article`
  width: calc((100% - 32px) / 3);
  min-width: 0;
  padding: 16px;
  display: flex;
  flex: 0 0 calc((100% - 32px) / 3);
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  border: 1px solid #efece6;
  border-radius: 16px;
  background: #fafaf8;

  @media (max-width: 760px) {
    width: 140px;
    height: 52px;
    min-height: 52px;
    padding: 6px 8px;
    flex: 0 0 140px;
    flex-direction: row;
    align-items: center;
    gap: 8px;
    border-radius: 10px;
    background: #fff;
    scroll-snap-align: start;
  }
`;

export const Image = styled.div`
  width: 100%;
  height: 120px;
  flex: 0 0 120px;
  overflow: hidden;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: #f1ede7;
  color: #8d857e;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  svg {
    width: 30px;
    height: 30px;
  }

  @media (max-width: 760px) {
    width: 44px;
    height: 44px;
    flex: 0 0 44px;
    border-radius: 8px;

    svg {
      width: 20px;
      height: 20px;
    }
  }
`;

export const Copy = styled.div`
  width: 100%;
  min-width: 0;
  display: grid;
  gap: 6px;
  color: #1f1e1a;
  font-family: 'Inter', sans-serif;

  b {
    min-width: 0;
    overflow: hidden;
    font-size: 15px;
    font-weight: 700;
    line-height: normal;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  small {
    min-height: 32px;
    overflow: hidden;
    color: #72706b;
    font-size: 12px;
    font-weight: 400;
    line-height: 16px;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  strong {
    color: var(--checkout-primary);
    font-size: 16px;
    font-weight: 800;
    line-height: normal;
    white-space: nowrap;
  }

  @media (max-width: 760px) {
    flex: 1 1 auto;
    gap: 2px;

    b {
      font-size: 12px;
    }

    small {
      display: none;
    }

    strong {
      font-size: 11px;
      font-weight: 700;
    }
  }
`;

export const AddButton = styled.button`
  width: 100%;
  min-height: 32px;
  margin-top: auto;
  padding: 8px 12px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 10px;
  background: #fdf2ec;
  color: var(--checkout-primary);
  font-size: 12px;
  font-weight: 700;
  line-height: normal;
  cursor: pointer;

  .mobile-plus {
    display: none;
  }

  @media (max-width: 760px) {
    width: 22px;
    height: 22px;
    min-height: 22px;
    padding: 0;
    flex: 0 0 22px;
    border-radius: 6px;
    background: var(--checkout-primary);
    color: #fff;

    .desktop-label {
      display: none;
    }

    .mobile-plus {
      width: 14px;
      height: 14px;
      display: block;
      stroke-width: 3;
    }
  }
`;

export const Dots = styled.div`
  display: none;

  @media (max-width: 760px) {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 6px;

    button {
      width: 6px;
      height: 6px;
      padding: 0;
      border: 0;
      border-radius: 3px;
      background: #efece6;
      cursor: pointer;
      transition:
        width 160ms ease,
        background 160ms ease;
    }

    button.active {
      width: 20px;
      background: var(--checkout-primary);
    }
  }
`;
