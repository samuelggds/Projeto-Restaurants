import styled from 'styled-components';
import { Brand, Hero, PrimaryButton, CategoryStrip, CategoryMedia } from './TableMenuExperience.styles.base-a';

export const DiscountBadge = styled.span`
  position: absolute;
  top: 9px;
  left: 9px;
  z-index: 2;
  max-width: calc(100% - 18px);
  padding: 6px 9px;
  border-radius: 999px;
  background: var(--primary);
  color: #fff;
  font-size: 10px;
  line-height: 1;
  font-weight: 950;
  box-shadow: 0 4px 12px rgba(0,0,0,.14);
`;

export const ProductPrice = styled.div`
  display: flex;
  align-items: baseline;
  gap: 7px;
  flex-wrap: wrap;

  del {
    color: #8d8d94;
    font-size: 11px;
    font-weight: 650;
  }

  strong {
    color: var(--text);
    font-size: 15px;
  }
`;

export const HeroArrow = styled.button<{ $side: 'left' | 'right' }>`
  position: absolute;
  z-index: 3;
  top: 50%;
  ${({ $side }) => ($side === 'left' ? 'left: 12px;' : 'right: 12px;')}
  width: 42px;
  height: 42px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.28);
  background: rgba(15,15,18,.34);
  color: #fff;
  display: grid;
  place-items: center;
  transform: translateY(-50%)
    ${({ $side }) => ($side === 'left' ? 'rotate(180deg)' : 'none')};
  backdrop-filter: blur(8px);

  @media (max-width: 700px) {
    width: 34px;
    height: 34px;
    ${({ $side }) => ($side === 'left' ? 'left: 7px;' : 'right: 7px;')}
  }
`;

export const HeroIndicators = styled.div`
  position: absolute;
  z-index: 3;
  left: 50%;
  bottom: 16px;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 6px;

  button {
    width: 34px;
    height: 3px;
    padding: 0;
    border: 0;
    border-radius: 999px;
    background: rgba(255,255,255,.45);
  }

  button[aria-current='true'] {
    background: #fff;
  }

  @media (max-width: 700px) {
    bottom: 10px;

    button {
      width: 22px;
    }
  }
`;

export const HomeHeader = styled.header`
  width: min(520px, 100%);
  margin: 0 auto;
  padding: 10px 12px 8px;
  background: #fff;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px 10px;
  align-items: center;
  border-bottom: 1px solid #ececf0;

  ${Brand} {
    gap: 8px;

    > img, > span:first-child {
      width: 36px;
      height: 36px;
      flex-basis: 36px;
      border-radius: 10px;
    }

    b {
      font-size: 14px;
    }

    small {
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: .04em;
    }
  }
`;

export const HomeHeaderActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;

  button {
    position: relative;
    width: 36px;
    height: 36px;
    padding: 0;
    border: 0;
    border-radius: 10px;
    background: #fff;
    color: #161616;
    display: grid;
    place-items: center;
  }

  i {
    position: absolute;
    top: -2px;
    right: -2px;
    min-width: 17px;
    height: 17px;
    padding: 0 4px;
    border-radius: 999px;
    background: var(--primary);
    color: #fff;
    font-style: normal;
    font-size: 9px;
    display: grid;
    place-items: center;
  }
`;

export const HomeSearch = styled.label`
  grid-column: 1 / -1;
  min-height: 42px;
  padding: 0 12px;
  border-radius: 14px;
  background: #f5f5f7;
  display: flex;
  align-items: center;
  gap: 8px;

  input {
    width: 100%;
    min-width: 0;
    border: 0;
    outline: 0;
    background: transparent;
    font-size: 13px;
  }
`;

export const HomePage = styled.section`
  width: min(520px, 100%);
  margin: 0 auto;
  padding: 10px 10px 36px;
  background: #fff;

  ${Hero} {
    min-height: 210px;
    margin-bottom: 10px;
    border-radius: 14px;

    > div {
      width: 68%;
      padding: 22px 18px;
    }

    h1 {
      max-width: 230px;
      font-size: 28px;
      line-height: .98;
    }

    p {
      max-width: 240px;
      font-size: 10px;
      margin-bottom: 12px;
    }

    small {
      font-size: 8px;
    }

    ${PrimaryButton} {
      min-height: 38px;
      padding: 0 13px;
      border-radius: 9px;
      font-size: 11px;
    }
  }

  ${CategoryStrip} {
    display: flex;
    gap: 8px;
    margin: 8px 0 18px;
    overflow-x: auto;
    scrollbar-width: none;

    button {
      flex: 0 0 74px;
      min-width: 74px;
      min-height: 82px;
      grid-template-columns: 1fr;
      grid-template-rows: 52px auto;
      border: 0;
      border-radius: 10px;
      background: #f8f8f9;
      text-align: center;
      box-shadow: none;
    }

    button.active {
      border: 1px solid var(--primary);
      background: #fff;
      box-shadow: none;
    }

    button > span:last-child {
      justify-content: center;
      padding: 4px 3px 7px;
      font-size: 9px;
      font-weight: 850;
    }

    ${CategoryMedia} {
      min-height: 52px;
      border-radius: 10px 10px 0 0;
      background: #f4f4f5;

      img {
        object-fit: cover;
      }

      svg {
        width: 22px;
        height: 22px;
      }
    }
  }

  @media (min-width: 760px) {
    width: min(1180px, calc(100% - 32px));
    padding: 18px 0 56px;

    ${Hero} {
      min-height: 300px;

      > div {
        width: min(520px, 70%);
        padding: 44px 46px;
      }

      h1 {
        max-width: 500px;
        font-size: clamp(36px, 5vw, 64px);
      }

      p {
        max-width: 430px;
        font-size: 14px;
      }

      small {
        font-size: 11px;
      }
    }

    ${CategoryStrip} {
      gap: 10px;

      button {
        flex-basis: 96px;
        min-width: 96px;
        min-height: 98px;
        grid-template-rows: 64px auto;
      }

      ${CategoryMedia} {
        min-height: 64px;
      }
    }
  }
`;

export const HomeInfoRow = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin: 10px 0 16px;

  article {
    min-width: 0;
    padding: 8px 10px;
    border: 1px solid #eeeef1;
    border-radius: 10px;
    background: #fff;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  svg {
    flex: 0 0 auto;
    color: var(--primary);
  }

  span {
    min-width: 0;
    display: grid;
    gap: 2px;
  }

  b {
    font-size: 9px;
  }

  small {
    color: var(--muted);
    font-size: 7px;
    line-height: 1.25;
  }
`;

export const HomeSectionHeader = styled.header`
  min-height: 28px;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;

  h2 {
    margin: 0;
    font-size: 14px;
    font-weight: 950;
  }

  button {
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--primary);
    display: inline-flex;
    align-items: center;
    gap: 2px;
    font-size: 9px;
    font-weight: 850;
  }

  @media (min-width: 760px) {
    h2 { font-size: 20px; }
    button { font-size: 12px; }
  }
`;

export const HomeProductSection = styled.section`
  margin: 0 0 18px;
`;

export const HomeProductRail = styled.div`
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(112px, 1fr);
  gap: 8px;
  overflow-x: auto;
  scrollbar-width: none;

  @media (min-width: 760px) {
    grid-auto-flow: initial;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    overflow: visible;
  }
`;

export const HomeProductTile = styled.button`
  position: relative;
  min-width: 0;
  padding: 0 0 8px;
  overflow: hidden;
  border: 1px solid #ededf0;
  border-radius: 11px;
  background: #fff;
  color: var(--text);
  text-align: left;

  .image {
    position: relative;
    height: 95px;
    overflow: hidden;
    background: #f3f3f4;
  }

  .image img,
  .image > span {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  > b {
    display: block;
    padding: 7px 8px 2px;
    font-size: 10px;
    line-height: 1.2;
  }

  ${ProductPrice} {
    padding: 0 8px;

    del {
      font-size: 8px;
    }

    strong {
      font-size: 10px;
    }
  }

  .add {
    position: absolute;
    right: 6px;
    bottom: 6px;
    width: 22px;
    height: 22px;
    border-radius: 999px;
    background: var(--primary);
    color: #fff;
    display: grid;
    place-items: center;
  }

  @media (min-width: 760px) {
    .image {
      height: 150px;
    }

    > b {
      font-size: 14px;
    }

    ${ProductPrice} strong {
      font-size: 14px;
    }
  }
`;

export const HomeBottomBanner = styled.article`
  position: relative;
  min-height: 72px;
  margin-top: 18px;
  overflow: hidden;
  border-radius: 12px;
  background: #191919;
  color: #fff;

  > img {
    position: absolute;
    inset: 0 0 0 auto;
    width: 52%;
    height: 100%;
    object-fit: cover;
  }

  &::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, rgba(15,15,15,.96) 0 54%, rgba(15,15,15,.18) 100%);
  }

  > div {
    position: relative;
    z-index: 1;
    width: 58%;
    min-height: 72px;
    padding: 12px;
    display: grid;
    align-content: center;
    gap: 2px;
  }

  b {
    font-size: 11px;
    line-height: 1.15;
  }

  small {
    color: rgba(255,255,255,.76);
    font-size: 7px;
    line-height: 1.25;
  }

  @media (min-width: 760px) {
    min-height: 110px;

    > div {
      min-height: 110px;
      padding: 20px;
    }

    b {
      font-size: 18px;
    }

    small {
      font-size: 11px;
    }
  }
`;

export const CategoryListing = styled.section`
  width: min(520px, 100%);
  margin: 0 auto;
  padding: 4px 0 24px;

  @media (min-width: 760px) {
    width: min(760px, 100%);
  }
`;

export const CategoryListingHeader = styled.header`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;

  > button {
    width: 34px;
    height: 34px;
    padding: 0;
    border: 0;
    border-radius: 999px;
    background: #fff;
    color: #171717;
    display: grid;
    place-items: center;
  }
`;

export const CategoryListingTitle = styled.div`
  min-width: 0;
  display: grid;
  grid-template-columns: 54px minmax(0, 1fr);
  gap: 10px;
  align-items: center;

  h1 {
    margin: 0;
    font-size: 18px;
    line-height: 1.05;
    font-weight: 950;
  }

  p {
    margin: 3px 0 0;
    color: var(--muted);
    font-size: 9px;
  }

  @media (min-width: 760px) {
    grid-template-columns: 64px minmax(0, 1fr);

    h1 { font-size: 22px; }
    p { font-size: 11px; }
  }
`;

export const CategoryListingMedia = styled.div`
  width: 54px;
  height: 54px;
  overflow: hidden;
  border-radius: 999px;
  background: #f4f4f5;
  display: grid;
  place-items: center;
  color: var(--primary);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  svg {
    width: 22px;
    height: 22px;
  }

  @media (min-width: 760px) {
    width: 64px;
    height: 64px;
  }
`;

export const CategoryTabs = styled.div`
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding: 2px 0 10px;
  margin-bottom: 4px;
  scrollbar-width: none;

  button {
    flex: 0 0 auto;
    min-height: 30px;
    padding: 0 11px;
    border: 0;
    border-radius: 8px;
    background: #f4f4f5;
    color: #4d4d53;
    font-size: 9px;
    font-weight: 800;
  }

  button.active {
    background: var(--primary);
    color: #fff;
  }

  @media (min-width: 760px) {
    button {
      min-height: 34px;
      padding: 0 14px;
      font-size: 11px;
    }
  }
`;

export const CategoryProductList = styled.div`
  display: grid;
  gap: 8px;
`;

export const CategoryProductRow = styled.article`
  position: relative;
  min-height: 92px;
  padding: 0;
  border: 1px solid #ececf0;
  border-radius: 11px;
  background: #fff;
  overflow: hidden;

  .main {
    width: 100%;
    min-height: 92px;
    padding: 7px 44px 7px 7px;
    border: 0;
    background: transparent;
    color: var(--text);
    text-align: left;
    display: grid;
    grid-template-columns: 76px minmax(0, 1fr);
    gap: 10px;
    align-items: center;
  }

  .image {
    position: relative;
    width: 76px;
    height: 76px;
    overflow: hidden;
    border-radius: 9px;
    background: #f3f3f4;
  }

  .image img,
  .image > span {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .content {
    min-width: 0;
    display: grid;
    gap: 3px;
  }

  .content > b {
    font-size: 11px;
    line-height: 1.15;
  }

  .content > p {
    margin: 0;
    color: var(--muted);
    font-size: 8px;
    line-height: 1.3;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .add {
    position: absolute;
    right: 8px;
    bottom: 10px;
    width: 26px;
    height: 26px;
    padding: 0;
    border: 0;
    border-radius: 8px;
    background: var(--primary);
    color: #fff;
    display: grid;
    place-items: center;
  }

  ${ProductPrice} {
    gap: 5px;

    del { font-size: 8px; }
    strong { font-size: 10px; }
  }

  @media (min-width: 760px) {
    min-height: 112px;

    .main {
      min-height: 112px;
      grid-template-columns: 96px minmax(0, 1fr);
      padding: 8px 52px 8px 8px;
    }

    .image {
      width: 96px;
      height: 96px;
    }

    .content > b { font-size: 14px; }
    .content > p { font-size: 11px; }
    ${ProductPrice} strong { font-size: 13px; }

    .add {
      width: 30px;
      height: 30px;
      right: 10px;
      bottom: 12px;
    }
  }
`;

export const HomeTableBadge = styled.span`
  min-height: 30px;
  padding: 0 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--primary) 8%, #fff);
  color: var(--primary);
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 9px;
  font-weight: 900;

  svg {
    width: 14px;
    height: 14px;
  }

  @media (min-width: 760px) {
    min-height: 34px;
    padding-inline: 10px;
    font-size: 11px;
  }
`;
