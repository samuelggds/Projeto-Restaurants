import styled, { keyframes } from 'styled-components';

const sectionEnter = keyframes`
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const cardEnter = keyframes`
  from {
    opacity: 0;
    transform: translateY(8px) scale(.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
`;

export const Section = styled.section`
  width: 100%;
  min-width: 0;
  padding: 20px;
  display: grid;
  gap: 16px;
  border: 1px solid #efece6;
  border-radius: 16px;
  background: #fff;
  animation: ${sectionEnter} 280ms ease both;

  @media (max-width: 760px) {
    width: calc(100% + 40px);
    margin-left: -20px;
    padding: 4px 20px 8px;
    gap: 12px;
    border: 0;
    border-radius: 0;
    background: transparent;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export const Header = styled.div`
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 7px;
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
      font-size: 16px;
      letter-spacing: -.15px;
    }

    span {
      font-size: 15px;
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
    margin: -2px -2px 0;
    padding: 2px 2px 4px;
    align-items: stretch;
    gap: 10px;
    overflow-x: auto;
    overflow-y: hidden;
    scroll-behavior: smooth;
    scroll-snap-type: x mandatory;
    scroll-padding-inline: 2px;
    overscroll-behavior-x: contain;
    scrollbar-width: none;

    &::-webkit-scrollbar {
      display: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    scroll-behavior: auto;
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
  transition:
    transform 180ms ease,
    box-shadow 180ms ease,
    border-color 180ms ease;
  animation: ${cardEnter} 320ms ease both;

  &:nth-child(2) {
    animation-delay: 45ms;
  }

  &:nth-child(3) {
    animation-delay: 90ms;
  }

  &:hover {
    transform: translateY(-2px);
    border-color: #e7e1d9;
    box-shadow: 0 10px 24px rgba(31, 30, 26, .07);
  }

  @media (max-width: 760px) {
    width: 168px;
    min-height: 72px;
    padding: 8px;
    flex: 0 0 168px;
    flex-direction: row;
    align-items: center;
    gap: 9px;
    border-radius: 14px;
    background: #fff;
    box-shadow: 0 4px 14px rgba(31, 30, 26, .045);
    scroll-snap-align: start;

    &:active {
      transform: scale(.985);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    transition: none;
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
    transition: transform 260ms ease;
  }

  svg {
    width: 30px;
    height: 30px;
  }

  ${Card}:hover & img {
    transform: scale(1.035);
  }

  @media (max-width: 760px) {
    width: 54px;
    height: 54px;
    flex: 0 0 54px;
    border-radius: 11px;

    svg {
      width: 22px;
      height: 22px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    img {
      transition: none;
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
    align-self: stretch;
    align-content: center;
    gap: 3px;

    b {
      font-size: 13px;
      line-height: 16px;
    }

    small {
      display: none;
    }

    strong {
      font-size: 12px;
      font-weight: 800;
      line-height: 15px;
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
  transition:
    transform 150ms ease,
    box-shadow 150ms ease,
    background 150ms ease;

  &:hover {
    background: #fbe9df;
  }

  &:active {
    transform: scale(.96);
  }

  &:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--checkout-primary) 24%, transparent);
    outline-offset: 2px;
  }

  .mobile-plus {
    display: none;
  }

  @media (max-width: 760px) {
    width: 30px;
    height: 30px;
    min-height: 30px;
    padding: 0;
    flex: 0 0 30px;
    border-radius: 9px;
    background: var(--checkout-primary);
    color: #fff;
    box-shadow: 0 5px 12px color-mix(in srgb, var(--checkout-primary) 22%, transparent);

    &:hover {
      background: var(--checkout-primary);
      transform: translateY(-1px);
    }

    .desktop-label {
      display: none;
    }

    .mobile-plus {
      width: 16px;
      height: 16px;
      display: block;
      stroke-width: 3;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export const Dots = styled.div`
  display: none;

  @media (max-width: 760px) {
    width: 100%;
    min-height: 10px;
    display: flex;
    align-items: center;
    gap: 6px;

    button {
      width: 6px;
      height: 6px;
      padding: 0;
      border: 0;
      border-radius: 999px;
      background: #e9e5df;
      cursor: pointer;
      transition:
        width 180ms ease,
        background 180ms ease,
        transform 180ms ease;
    }

    button:hover {
      transform: scale(1.15);
    }

    button.active {
      width: 24px;
      background: var(--checkout-primary);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    button {
      transition: none;
    }
  }
`;
