import styled from 'styled-components';

export const Page = styled.main`
  --restaurant-color: #ff4b4b;
  min-height: 100vh;
  background: #fffaf8;
  color: #1f1b1a;
`;

export const Hero = styled.section<{ $image: string }>`
  position: relative;
  min-height: min(720px, 82vh);
  background:
    linear-gradient(110deg, rgba(15, 12, 11, 0.82), rgba(15, 12, 11, 0.28)),
    ${({ $image }) => ($image ? `url("${$image}") center / cover no-repeat` : '#282321')};
  color: #fff;
`;

export const HeroOverlay = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.12), rgba(0, 0, 0, 0.4));
`;

export const Header = styled.header`
  position: relative;
  z-index: 1;
  width: min(1180px, calc(100% - 40px));
  margin: 0 auto;
  padding: 28px 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
`;

export const Brand = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 800;
  font-size: 18px;

  img {
    width: 48px;
    height: 48px;
    border-radius: 14px;
    object-fit: cover;
    background: #fff;
  }
`;

export const MenuButton = styled.a`
  color: #fff;
  text-decoration: none;
  padding: 11px 18px;
  border: 1px solid rgba(255, 255, 255, 0.55);
  border-radius: 10px;
  font-weight: 700;
  backdrop-filter: blur(10px);
`;

export const HeroContent = styled.div`
  position: relative;
  z-index: 1;
  width: min(1180px, calc(100% - 40px));
  margin: 0 auto;
  padding: clamp(80px, 13vh, 150px) 0 110px;
  max-width: 1180px;

  > span {
    font-size: 14px;
    font-weight: 800;
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }

  h1 {
    max-width: 760px;
    margin: 14px 0 16px;
    font-size: clamp(42px, 8vw, 82px);
    line-height: 0.98;
  }

  p {
    max-width: 640px;
    margin: 0 0 30px;
    font-size: clamp(17px, 2.5vw, 21px);
    line-height: 1.6;
    color: rgba(255, 255, 255, 0.88);
  }
`;

export const PrimaryAction = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 9px;
  background: var(--restaurant-color);
  color: #fff;
  text-decoration: none;
  padding: 14px 22px;
  border-radius: 10px;
  font-weight: 800;
`;

export const Content = styled.section`
  width: min(1180px, calc(100% - 40px));
  margin: -54px auto 0;
  position: relative;
  z-index: 2;
  padding-bottom: 80px;
`;

export const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;

  @media (max-width: 820px) {
    grid-template-columns: 1fr;
  }
`;

export const InfoCard = styled.article`
  min-height: 150px;
  padding: 24px;
  border-radius: 18px;
  background: #fff;
  color: inherit;
  text-decoration: none;
  box-shadow: 0 16px 50px rgba(53, 33, 25, 0.11);
  display: flex;
  gap: 15px;
  align-items: flex-start;

  svg {
    color: var(--restaurant-color);
    flex: 0 0 auto;
  }

  h2 {
    margin: 0 0 8px;
    font-size: 18px;
  }

  p {
    margin: 0;
    color: #6e625d;
    line-height: 1.6;
  }
`;

export const SocialSection = styled.section`
  padding: 62px 0 0;

  h2 {
    margin: 0 0 18px;
    font-size: 28px;
  }

  div {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  a {
    color: #342b27;
    text-decoration: none;
    background: #fff;
    border: 1px solid #eadfd9;
    border-radius: 999px;
    padding: 10px 16px;
    font-weight: 700;
  }
`;

export const Footer = styled.footer`
  width: min(1180px, calc(100% - 40px));
  margin: 0 auto;
  padding: 26px 0 38px;
  border-top: 1px solid #eadfd9;
  display: flex;
  justify-content: space-between;
  gap: 18px;
  color: #6e625d;

  a {
    color: var(--restaurant-color);
    font-weight: 800;
    text-decoration: none;
  }
`;

export const Centered = styled.main`
  min-height: 100vh;
  display: grid;
  place-content: center;
  padding: 32px;
  text-align: center;
  background: #fffaf8;

  h1 {
    margin-bottom: 8px;
  }

  p {
    color: #6e625d;
  }
`;
