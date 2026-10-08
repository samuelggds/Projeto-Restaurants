import styled, { keyframes } from 'styled-components';

const fadeUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(14px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const slideDown = keyframes`
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const successPop = keyframes`
  0% {
    opacity: 0;
    transform: scale(0.82) rotate(-5deg);
  }
  65% {
    opacity: 1;
    transform: scale(1.06) rotate(1deg);
  }
  100% {
    opacity: 1;
    transform: scale(1) rotate(0);
  }
`;

const successRing = keyframes`
  0% {
    box-shadow: 0 0 0 0 rgba(45, 155, 85, 0.22);
  }
  70% {
    box-shadow: 0 0 0 18px rgba(45, 155, 85, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(45, 155, 85, 0);
  }
`;

const starPop = keyframes`
  0% {
    transform: scale(0.92) rotate(-8deg);
  }
  55% {
    transform: scale(1.16) rotate(4deg);
  }
  100% {
    transform: scale(1) rotate(0);
  }
`;

const savedPulse = keyframes`
  0%, 100% {
    box-shadow: 0 8px 22px rgba(40, 35, 29, 0.04);
  }
  50% {
    box-shadow: 0 12px 30px rgba(47, 143, 82, 0.14);
  }
`;

export const Page = styled.div`
  min-height: 100vh;
  background: #fdfcf9;
  color: #24221f;
  font-family: Inter, system-ui, sans-serif;

  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      scroll-behavior: auto !important;
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
`;

export const Header = styled.header`
  height: 72px;
  padding: 0 max(24px, calc((100vw - 1120px) / 2));
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 20px;
  border-bottom: 1px solid #eeeae4;
  background: #fff;
  animation: ${slideDown} 420ms cubic-bezier(0.22, 1, 0.36, 1) both;

  > button,
  nav button {
    border: 0;
    background: transparent;
    color: #282622;
    font-weight: 650;
    transition:
      color 160ms ease,
      transform 160ms ease;
  }

  > button {
    justify-self: start;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  > button:hover,
  nav button:hover {
    color: #ef5b2a;
    transform: translateY(-1px);
  }

  > button svg {
    width: 16px;
  }

  nav {
    justify-self: end;
    display: flex;
    gap: 22px;
  }

  nav button {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
  }

  nav svg {
    width: 14px;
  }

  @media (max-width: 700px) {
    height: 58px;
    padding: 0 16px;
    grid-template-columns: auto 1fr;

    > button span,
    nav {
      display: none;
    }
  }
`;

export const Brand = styled.div`
  display: flex;
  align-items: center;
  gap: 9px;

  span {
    display: grid;
    gap: 2px;
  }

  strong {
    font-size: 13px;
  }

  small {
    color: #3f9a59;
    font-size: 10px;
  }
`;

export const BrandLogo = styled.span`
  width: 32px;
  height: 32px;
  border-radius: 9px;
  overflow: hidden;
  display: grid !important;
  place-items: center;
  background: #e85a2b;
  color: #fff;
  font-weight: 900;
  transition:
    transform 220ms cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 220ms ease;

  &:hover {
    transform: translateY(-2px) scale(1.04);
    box-shadow: 0 7px 18px rgba(232, 90, 43, 0.18);
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

export const Main = styled.main`
  width: min(1120px, calc(100% - 32px));
  margin: 38px auto 0;

  @media (max-width: 700px) {
    width: 100%;
    margin: 0;
    padding: 14px;
  }
`;

export const SuccessCard = styled.section`
  min-height: 196px;
  padding: 34px 40px;
  border: 1px solid #d8eee0;
  border-radius: 22px;
  background: #f2fbf5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 30px;
  animation: ${fadeUp} 520ms 60ms cubic-bezier(0.22, 1, 0.36, 1) both;

  h1 {
    margin: 10px 0;
    font-size: 30px;
    animation: ${fadeUp} 500ms 150ms cubic-bezier(0.22, 1, 0.36, 1) both;
  }

  p {
    max-width: 600px;
    margin: 0;
    color: #77716a;
    font-size: 13px;
    line-height: 1.55;
  }

  @media (max-width: 700px) {
    min-height: 0;
    padding: 28px 22px;
    text-align: center;
    justify-content: center;

    h1 {
      font-size: 25px;
    }
  }
`;

export const SuccessPill = styled.span`
  width: max-content;
  padding: 6px 10px;
  border-radius: 999px;
  background: #dff5e6;
  color: #268447;
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 9px;
  font-weight: 850;
  text-transform: uppercase;
  animation: ${successPop} 520ms 180ms cubic-bezier(0.22, 1, 0.36, 1) both;

  svg {
    width: 12px;
  }

  @media (max-width: 700px) {
    margin-inline: auto;
  }
`;

export const Meta = styled.div`
  margin-top: 18px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;

  span {
    padding: 6px 9px;
    border-radius: 7px;
    background: #fff;
    color: #55514d;
    font-size: 9px;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 5px;
    transition:
      transform 180ms ease,
      box-shadow 180ms ease;
  }

  span:hover {
    transform: translateY(-1px);
    box-shadow: 0 5px 13px rgba(40, 35, 29, 0.06);
  }

  svg {
    width: 11px;
  }

  @media (max-width: 700px) {
    justify-content: center;
  }
`;

export const SuccessIcon = styled.div`
  width: 118px;
  height: 118px;
  flex: 0 0 auto;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #d8f2e1;
  color: #2d9b55;
  animation:
    ${successPop} 620ms 180ms cubic-bezier(0.22, 1, 0.36, 1) both,
    ${successRing} 1.8s 900ms ease-out 1;

  svg {
    width: 62px;
    height: 62px;
  }

  @media (max-width: 700px) {
    display: none;
  }
`;

export const ContentGrid = styled.div`
  margin-top: 24px;
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(300px, 0.9fr);
  gap: 22px;
  align-items: start;

  @media (max-width: 850px) {
    grid-template-columns: 1fr;
  }
`;

export const OrderCard = styled.section`
  padding: 24px;
  border: 1px solid #ece8e2;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 8px 22px rgba(40, 35, 29, 0.04);
  animation: ${fadeUp} 520ms 180ms cubic-bezier(0.22, 1, 0.36, 1) both;
  transition:
    transform 220ms ease,
    box-shadow 220ms ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 30px rgba(40, 35, 29, 0.07);
  }
`;

export const SectionTitle = styled.header`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;

  span {
    display: grid;
    gap: 3px;
  }

  strong {
    font-size: 15px;
  }

  small {
    color: #88817a;
    font-size: 10px;
  }

  svg {
    width: 20px;
    color: #ef6a38;
  }
`;

export const ItemList = styled.ul`
  margin: 18px 0 12px;
  padding: 0;
  display: grid;
  gap: 10px;
  list-style: none;

  li {
    display: flex;
    justify-content: space-between;
    gap: 20px;
    font-size: 11px;
    color: #625d57;
  }

  strong {
    color: #292622;
  }

  .discount strong {
    color: #2e9252;
  }
`;

export const Total = styled.div`
  padding-top: 14px;
  border-top: 1px solid #efebe5;
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  font-weight: 850;
`;

export const Payment = styled.p`
  margin: 14px 0 0;
  color: #7b756f;
  font-size: 10px;
`;

export const Side = styled.aside`
  display: grid;
  gap: 14px;

  > *:first-child {
    animation: ${fadeUp} 520ms 250ms cubic-bezier(0.22, 1, 0.36, 1) both;
  }

  > *:last-child {
    animation: ${fadeUp} 520ms 320ms cubic-bezier(0.22, 1, 0.36, 1) both;
  }
`;

export const CourierCard = styled.section`
  padding: 14px 16px;
  border: 1px solid #ece8e2;
  border-radius: 15px;
  background: #fff;
  display: flex;
  align-items: center;
  gap: 10px;
  transition:
    transform 220ms ease,
    box-shadow 220ms ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 24px rgba(40, 35, 29, 0.06);
  }

  span {
    display: grid;
    gap: 2px;
  }

  strong {
    font-size: 11px;
  }

  small {
    color: #2b8d4f;
    font-size: 9px;
  }
`;

export const CourierAvatar = styled.span`
  width: 40px;
  height: 40px !important;
  flex: 0 0 auto;
  border-radius: 50%;
  overflow: hidden;
  display: grid !important;
  place-items: center !important;
  background: #273445 !important;
  color: #fff;
  font-size: 10px;
  font-weight: 900;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

export const Done = styled.em`
  margin-left: auto;
  padding: 5px 8px;
  border-radius: 999px;
  background: #edf8f0;
  color: #2b8d4f;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 8px;
  font-style: normal;
  font-weight: 800;

  svg {
    width: 10px;
  }
`;

export const RatingCard = styled.section`
  padding: 24px;
  border: 1px solid #ece8e2;
  border-radius: 16px;
  background: #fff;
  text-align: center;
  box-shadow: 0 8px 22px rgba(40, 35, 29, 0.04);
  transition:
    transform 220ms ease,
    border-color 220ms ease,
    box-shadow 220ms ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 13px 30px rgba(40, 35, 29, 0.07);
  }

  &.rating-saved {
    border-color: #cce8d5;
    animation: ${savedPulse} 900ms ease both;
  }

  h2 {
    margin: 0;
    font-size: 17px;
  }

  p {
    margin: 6px 0 15px;
    color: #89827b;
    font-size: 10px;
  }
`;

export const Stars = styled.div`
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 8px;
`;

export const StarButton = styled.button<{
  $active: boolean;
  $selected: boolean;
  $delay: number;
}>`
  width: 40px;
  height: 40px;
  border: 1px solid ${({ $active }) => ($active ? '#f1c37c' : '#f2dfce')};
  border-radius: 10px;
  background: ${({ $active }) => ($active ? '#fff4df' : '#fff9f4')};
  color: ${({ $active }) => ($active ? '#f39a18' : '#c5b49d')};
  display: grid;
  place-items: center;
  cursor: pointer;
  transform: ${({ $selected }) => ($selected ? 'translateY(-2px)' : 'translateY(0)')};
  box-shadow: ${({ $selected }) => ($selected ? '0 7px 16px rgba(243, 154, 24, 0.16)' : 'none')};
  transition:
    transform 180ms cubic-bezier(0.22, 1, 0.36, 1),
    color 160ms ease,
    background-color 160ms ease,
    border-color 160ms ease,
    box-shadow 180ms ease;

  &:hover,
  &:focus-visible {
    transform: translateY(-4px) scale(1.08);
    outline: none;
    box-shadow: 0 9px 20px rgba(243, 154, 24, 0.18);
  }

  &:active {
    transform: translateY(-1px) scale(0.94);
  }

  &[aria-pressed='true'] svg {
    animation: ${starPop} 360ms cubic-bezier(0.22, 1, 0.36, 1) both;
    animation-delay: ${({ $delay }) => $delay}ms;
  }

  &:disabled {
    cursor: wait;
    opacity: 0.65;
  }

  svg {
    width: 21px;
    transition:
      transform 180ms cubic-bezier(0.22, 1, 0.36, 1),
      fill 160ms ease;
  }
`;

export const RatingHint = styled.small`
  min-height: 16px;
  margin-bottom: 10px;
  display: block;
  color: #8b837a;
  font-size: 9px;
  font-weight: 650;
  transition: color 160ms ease;
`;

export const RatingMessage = styled.p`
  color: #2c8d50 !important;
  font-weight: 750;
  animation: ${fadeUp} 260ms ease both;
`;

export const Primary = styled.button`
  width: 100%;
  min-height: 45px;
  border: 0;
  border-radius: 10px;
  background: #ef5b2a;
  color: #fff;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition:
    transform 180ms cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 180ms ease,
    opacity 160ms ease;

  &:not(:disabled):hover {
    transform: translateY(-2px);
    box-shadow: 0 9px 20px rgba(239, 91, 42, 0.2);
  }

  &:not(:disabled):active {
    transform: translateY(0) scale(0.98);
  }

  svg {
    width: 15px;
    transition: transform 180ms ease;
  }

  &:not(:disabled):hover svg {
    transform: translateX(2px);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
`;

export const Secondary = styled.button`
  width: 100%;
  min-height: 42px;
  margin-top: 8px;
  border: 1px solid #ebe7e1;
  border-radius: 10px;
  background: #fff;
  color: #2d2a27;
  font-weight: 750;
  transition:
    transform 180ms ease,
    background-color 180ms ease;

  &:hover {
    transform: translateY(-1px);
    background: #faf8f4;
  }
`;

export const Help = styled.button`
  margin: 28px auto 20px;
  border: 0;
  background: transparent;
  color: #77716b;
  text-decoration: underline;
  font-size: 9px;
  display: flex;
  align-items: center;
  gap: 5px;
  opacity: 0;
  animation: ${fadeUp} 420ms 420ms ease forwards;
  transition:
    color 160ms ease,
    transform 160ms ease;

  &:hover {
    color: #ef5b2a;
    transform: translateY(-1px);
  }

  svg {
    width: 12px;
  }
`;

export const State = styled.main`
  min-height: 70vh;
  display: grid;
  place-items: center;
  padding: 30px;
  color: #5f5953;
  animation: ${fadeUp} 320ms ease both;
`;
