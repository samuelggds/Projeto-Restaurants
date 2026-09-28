import styled from 'styled-components';
import * as A from '../../Login/components/CustomerLoginExperience.styles';

export const Layout = styled(A.CustomerAuthLayout)`
  @media (max-width: 900px) {
    min-height: 100dvh;
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
    min-height: 72px;
    padding: 12px 24px;
    display: flex;
    align-items: center;
    gap: 12px;

    button {
      width: 36px;
      height: 36px;
      flex: 0 0 36px;
      padding: 0;
      border: 1px solid var(--auth-border);
      border-radius: 18px;
      background: #fff;
      color: var(--auth-text);
      display: grid;
      place-items: center;
    }

    .copy {
      min-width: 0;
      display: grid;
      gap: 2px;
    }

    h1 {
      margin: 0;
      font-family: 'Gabarito', 'Inter', sans-serif;
      font-size: 22px;
      line-height: 28px;
      font-weight: 800;
    }

    p {
      margin: 0;
      color: var(--auth-muted);
      font-size: 14px;
      line-height: 18px;
    }
  }
`;

export const Panel = styled(A.FormPanel)`
  @media (max-width: 900px) {
    min-height: 0;
    margin-top: 0;
    padding: 8px 24px 28px;
    border-radius: 0;
  }

  @media (max-width: 359px) {
    padding-inline: 16px;
  }
`;

export const Card = styled.div`
  width: 420px;
  max-width: 100%;
  display: grid;
  gap: 22px;

  @media (max-width: 900px) {
    width: 100%;
    gap: 16px;
  }
`;

export const DesktopHeading = styled.div`
  display: grid;
  gap: 8px;

  h1 {
    margin: 0;
    font-family: 'Gabarito', 'Inter', sans-serif;
    font-size: 32px;
    line-height: 38px;
    font-weight: 800;
  }

  p {
    margin: 0;
    color: var(--auth-muted);
    font-size: 15px;
    line-height: 21px;
  }

  @media (max-width: 900px) {
    display: none;
  }
`;

export const Form = styled.form`
  display: grid;
  gap: 16px;

  @media (min-width: 901px) {
    gap: 14px;
  }
`;

export const Field = styled.label`
  display: grid;
  gap: 6px;

  > span {
    color: var(--auth-text);
    font-size: 13px;
    line-height: 17px;
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

  @media (min-width: 901px) {
    min-height: 44px;

    input {
      height: 42px;
    }
  }
`;

export const Rules = styled.div`
  padding-left: 4px;
  display: grid;
  gap: 6px;

  .rule {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--auth-muted);
    font-size: 12px;
    line-height: 15px;
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

  .check svg {
    width: 10px;
    height: 10px;
    stroke-width: 3;
  }
`;

export const Error = styled.div`
  padding: 10px 12px;
  border: 1px solid rgba(220, 38, 38, 0.22);
  border-radius: 10px;
  background: rgba(220, 38, 38, 0.06);
  color: #b42318;
  font-size: 12px;
  line-height: 17px;
`;

export const Primary = styled(A.PrimaryButton)`
  min-height: 48px;

  @media (min-width: 901px) {
    min-height: 46px;
  }
`;

export const Divider = A.Divider;
export const GoogleSlot = A.GoogleSlot;
export const GoogleVisual = A.GoogleVisual;
export const GoogleFallback = A.GoogleFallback;
export const GoogleMessage = A.GoogleMessage;

export const Footer = styled.div`
  display: grid;
  gap: 12px;
  text-align: center;

  p {
    margin: 0;
    color: var(--auth-muted);
    font-size: 14px;
  }

  a {
    color: var(--auth-primary);
    font-weight: 700;
    text-decoration: none;
  }

  small {
    color: var(--auth-muted);
    font-size: 11px;
    line-height: 1.4;
  }
`;

export const Verification = styled.div`
  padding: 20px;
  border: 1px solid color-mix(in srgb, var(--auth-primary) 28%, var(--auth-border));
  border-radius: 16px;
  background: color-mix(in srgb, var(--auth-primary) 5%, #fff);
  display: grid;
  gap: 12px;

  svg {
    color: #268c43;
  }

  h2 {
    margin: 0;
    font-family: 'Gabarito', 'Inter', sans-serif;
    font-size: 22px;
  }

  p {
    margin: 0;
    color: var(--auth-muted);
    font-size: 13px;
    line-height: 1.5;
  }

  button {
    min-height: 42px;
    border: 1px solid var(--auth-border);
    border-radius: 10px;
    background: #fff;
    color: var(--auth-text);
    font-weight: 700;
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
