import styled from 'styled-components';
import * as A from '../Login/components/CustomerLoginExperience.styles';

export const Layout = styled(A.CustomerAuthLayout)`
  @media (max-width: 900px) {
    min-height: 100dvh;
    display: block;
  }
`;

export const Hero = styled(A.Hero)`
  @media (max-width: 900px) {
    display: none;
  }
`;
export const HeroImage = A.HeroImage;
export const HeroSkeleton = A.HeroSkeleton;
export const HeroOverlay = A.HeroOverlay;
export const HeroBranding = styled(A.HeroBranding)`
  @media (max-width: 900px) {
    display: none;
  }
`;
export const RestaurantMark = A.RestaurantMark;
export const HeroNameGroup = A.HeroNameGroup;
export const RestaurantName = A.RestaurantName;
export const AccessBadge = A.AccessBadge;
export const HeroDescription = A.HeroDescription;

export const MobileHeader = styled.header`
  display: none;

  @media (max-width: 900px) {
    height: 60px;
    padding: 12px 20px;
    border-bottom: 1px solid var(--auth-border);
    background: #fff;
    display: flex;
    align-items: center;
    gap: 16px;

    button {
      width: 36px;
      height: 36px;
      padding: 0;
      border: 0;
      border-radius: 8px;
      background: transparent;
      color: var(--auth-text);
      display: grid;
      place-items: center;
      transition: background-color 160ms ease, transform 160ms ease;
    }

    button:hover { background: #f4f1ec; }
    button:active { transform: scale(.94); }
    button:focus-visible { outline: 2px solid color-mix(in srgb, var(--auth-primary) 28%, transparent); outline-offset: 2px; }
    button svg { width: 24px; height: 24px; }

    h1 {
      margin: 0;
      font-family: 'Inter', sans-serif;
      font-size: 20px;
      line-height: 24px;
      font-weight: 700;
    }
  }
`;

export const Panel = styled(A.FormPanel)`
  @media (max-width: 900px) {
    min-height: 0;
    margin: 0;
    padding: 24px 24px 32px;
    border-radius: 0;
    align-items: flex-start;
  }
`;

export const Card = styled.div`
  width: 420px;
  max-width: 100%;
  display: grid;
  gap: 32px;
  justify-items: stretch;

  @media (max-width: 900px) {
    width: 100%;
    gap: 24px;
  }
`;

export const Illustration = styled.div`
  display: grid;
  place-items: center;

  .circle {
    width: 96px;
    height: 96px;
    border-radius: 48px;
    background: #fdf2ec;
    color: var(--auth-primary);
    display: grid;
    place-items: center;
  }

  .circle svg {
    width: 40px;
    height: 40px;
  }
`;

export const Heading = styled.div`
  display: grid;
  gap: 10px;
  text-align: center;

  h2 {
    margin: 0;
    font-family: 'Gabarito', 'Inter', sans-serif;
    font-size: 28px;
    line-height: 34px;
    font-weight: 800;
  }

  p {
    margin: 0;
    color: var(--auth-muted);
    font-size: 15px;
    line-height: 1.5;
  }

  @media (max-width: 900px) {
    gap: 8px;

    h2 {
      font-family: 'Inter', sans-serif;
      font-size: 22px;
      line-height: 28px;
    }

    p {
      font-size: 14px;
      line-height: 20px;
    }
  }
`;

export const Form = styled.form`
  display: grid;
  gap: 18px;
`;

export const Field = styled.label`
  display: grid;
  gap: 6px;

  > span {
    color: var(--auth-text);
    font-size: 13px;
    font-weight: 600;
  }
`;

export const InputBox = styled.div`
  min-height: 48px;
  padding: 0 16px;
  border: 1px solid var(--auth-border);
  border-radius: 12px;
  background: #fff;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;

  &:focus-within {
    border-color: var(--auth-primary);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--auth-primary) 10%, transparent);
  }

  input {
    width: 100%;
    min-width: 0;
    height: 46px;
    padding: 0;
    border: 0;
    outline: 0;
    background: transparent;
    color: var(--auth-text);
    font-size: 15px;
  }

  input::placeholder {
    color: var(--auth-muted);
    opacity: 1;
  }

  button {
    width: 32px;
    height: 32px;
    padding: 0;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: var(--auth-muted);
    display: grid;
    place-items: center;
  }
`;

export const Primary = styled(A.PrimaryButton)`
  min-height: 48px;
`;

export const Rules = styled.div`
  display: grid;
  gap: 6px;

  .rule {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--auth-muted);
    font-size: 12px;
  }

  .check {
    width: 16px;
    height: 16px;
    flex: 0 0 16px;
    border-radius: 8px;
    background: #d1d0cc;
    color: #fff;
    display: grid;
    place-items: center;
  }

  .rule.met .check {
    background: #268c43;
  }

  svg {
    width: 10px;
    height: 10px;
    stroke-width: 3;
  }
`;

export const Notice = styled.p`
  margin: 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: #fafaf8;
  color: var(--auth-muted);
  font-size: 12px;
  line-height: 17px;
`;

export const SecondaryRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;

  button {
    min-height: 42px;
    border: 1px solid var(--auth-border);
    border-radius: 10px;
    background: #fff;
    color: var(--auth-text);
    font-weight: 700;
  }

  @media (max-width: 420px) {
    grid-template-columns: 1fr;
  }
`;

export const Back = styled.button`
  justify-self: center;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--auth-muted);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;

  &:hover,
  &:focus-visible {
    color: var(--auth-primary);
    outline: none;
  }
`;

export const HomeIndicator = styled.div`
  display: none;

  @media (max-width: 900px) {
    display: flex;
    justify-content: center;
    padding: 12px 0;

    &::after {
      content: '';
      width: 120px;
      height: 5px;
      border-radius: 999px;
      background: #d1cece;
    }
  }
`;
