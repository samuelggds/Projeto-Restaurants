import styled from 'styled-components';

export const HomeRoot = styled.div`
  --table-text: #22211f;
  --table-muted: #77746f;
  --table-line: #ebe8e2;
  --table-surface: #fff;
  --home-primary: var(--primary);
  min-height: 100vh;
  padding-bottom: 0;
  background: #fff;
  color: var(--table-text);
  font-family: 'Inter', system-ui, sans-serif;
  animation: table-home-enter 360ms cubic-bezier(.22, 1, .36, 1) both;

  @keyframes table-home-enter {
    from {
      opacity: 0;
      transform: translate3d(0, 10px, 0);
    }
    to {
      opacity: 1;
      transform: translate3d(0, 0, 0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }

  @media (max-width: 760px) {
    padding-bottom: 72px;
  }
`;

export const Header = styled.header`
  min-height: 80px;
  padding: 0 max(20px, calc((100vw - 1120px) / 2));
  border-bottom: 1px solid var(--table-line);
  background: #fff;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 28px;

  @media (max-width: 760px) {
    min-height: 64px;
    padding: 0 20px;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 12px;
  }
`;

export const Brand = styled.div`
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12px;

  > img,
  .mark {
    width: 40px;
    height: 40px;
    flex: 0 0 40px;
    border-radius: 12px;
    object-fit: cover;
  }

  .mark {
    display: grid;
    place-items: center;
    background: var(--primary);
    color: #fff;
    font-size: 17px;
    font-weight: 800;
  }

  .copy {
    min-width: 0;
    display: grid;
    gap: 3px;
  }

  b {
    overflow: hidden;
    color: var(--table-text);
    font-size: 15px;
    line-height: 19px;
    font-weight: 800;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  small {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    color: var(--table-muted);
    font-size: 11px;
    line-height: 14px;
    font-weight: 600;
  }

  small i {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: #27ae60;
  }

  @media (max-width: 760px) {
    gap: 10px;

    > img,
    .mark {
      width: 36px;
      height: 36px;
      flex-basis: 36px;
      border-radius: 10px;
    }

    b {
      font-size: 13px;
      line-height: 16px;
    }

    small {
      font-size: 9px;
      line-height: 12px;
    }
  }
`;

export const HeaderActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 18px;

  .customer {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: var(--table-text);
    font-size: 12px;
    font-weight: 650;
  }

  .avatar {
    width: 30px;
    height: 30px;
    border-radius: 999px;
    display: grid;
    place-items: center;
    background: var(--primary);
    color: #fff;
    font-size: 10px;
    font-weight: 800;
  }

  .cart {
    min-height: 38px;
    padding: 0 15px;
    border: 0;
    border-radius: 12px;
    background: var(--primary);
    color: #fff;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    font-weight: 800;
  }

  .cart svg {
    width: 17px;
    height: 17px;
  }

  .cart i {
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    border-radius: 999px;
    background: #fff;
    color: var(--primary);
    display: grid;
    place-items: center;
    font-style: normal;
    font-size: 9px;
  }

  @media (max-width: 760px) {
    display: none;
  }
`;

export const TableBadge = styled.div`
  min-height: 30px;
  padding: 0 12px;
  border: 1px solid color-mix(in srgb, var(--primary) 40%, #fff);
  border-radius: 9px;
  background: color-mix(in srgb, var(--primary) 7%, #fff);
  color: var(--primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 11px;
  line-height: 14px;
  font-weight: 800;

  svg {
    width: 14px;
    height: 14px;
  }

  @media (max-width: 760px) {
    min-height: 28px;
    padding: 0 10px;
    font-size: 10px;
  }
`;

export const Content = styled.main`
  width: min(1120px, calc(100% - 40px));
  margin: 0 auto;
  padding: 40px 0 54px;

  @media (max-width: 760px) {
    width: 100%;
    padding: 18px 20px 34px;
  }
`;

export const HeroSlot = styled.div`
  width: 100%;
  --home-primary: var(--primary);

  > section {
    height: 280px;
    min-height: 280px;
    border-radius: 16px;
  }

  @media (max-width: 760px) {
    > section {
      height: 160px;
      min-height: 160px;
      border-radius: 16px;
    }

    > section h1 {
      font-size: 20px;
    }

    > section p {
      font-size: 10px;
    }

    > section button {
      min-height: 30px;
    }
  }
`;

export const InfoRow = styled.div`
  min-height: 41px;
  margin-top: 38px;
  display: flex;
  align-items: center;
  gap: 14px;
  overflow-x: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }

  > span {
    min-height: 36px;
    padding: 0 14px;
    flex: 0 0 auto;
    border: 1px solid var(--table-line);
    border-radius: 12px;
    background: #fff;
    color: #403e3a;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-weight: 700;
    white-space: nowrap;
  }

  svg {
    width: 14px;
    height: 14px;
    color: var(--primary);
  }

  .rating {
    color: var(--primary);
    background: color-mix(in srgb, var(--primary) 6%, #fff);
  }

  @media (max-width: 760px) {
    margin: 16px -20px 0;
    padding: 0 20px;
    gap: 8px;

    > span {
      min-height: 31px;
      padding: 0 11px;
      border-radius: 999px;
      font-size: 9px;
    }

    svg {
      width: 12px;
      height: 12px;
    }
  }
`;

export const Divider = styled.div`
  height: 1px;
  margin: 40px 0;
  background: var(--table-line);

  @media (max-width: 760px) {
    margin: 22px 0;
  }
`;

export const Categories = styled.nav`
  display: flex;
  align-items: flex-start;
  gap: 24px;
  overflow-x: auto;
  padding: 0 0 8px;
  scrollbar-width: none;
  scroll-behavior: smooth;

  &::-webkit-scrollbar {
    display: none;
  }

  button {
    width: 72px;
    min-width: 72px;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--table-text);
    display: grid;
    justify-items: center;
    gap: 8px;
    transition:
      transform 220ms cubic-bezier(.22, 1, .36, 1),
      color 180ms ease;
  }

  button:hover {
    transform: translateY(-3px);
  }

  button:active {
    transform: translateY(-1px) scale(.97);
  }

  .image {
    width: 80px;
    height: 80px;
    border-radius: 999px;
    overflow: hidden;
    background: #f3f1ec;
    display: grid;
    place-items: center;
    color: var(--primary);
  }

  .image.special {
    border: 2px solid var(--primary);
    background: #fff;
  }

  .image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .image svg {
    width: 24px;
    height: 24px;
  }

  b {
    width: 84px;
    min-height: 17px;
    overflow: hidden;
    color: inherit;
    font-size: 11px;
    line-height: 17px;
    font-weight: 650;
    text-align: center;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  button:hover,
  button:focus-visible {
    color: var(--primary);
  }

  @media (prefers-reduced-motion: reduce) {
    button {
      transition: none;
    }

    button:hover,
    button:active {
      transform: none;
    }
  }

  @media (max-width: 760px) {
    margin-right: -20px;
    padding-right: 20px;
    gap: 16px;

    button {
      width: 72px;
      min-width: 72px;
    }

    .image {
      width: 60px;
      height: 60px;
    }

    b {
      width: 72px;
      font-size: 10px;
      line-height: 14px;
    }
  }
`;

export const Sections = styled.div`
  display: grid;
  gap: 40px;

  @media (max-width: 760px) {
    gap: 22px;
  }
`;

export const ProductSection = styled.section`
  scroll-margin-top: 96px;
  display: grid;
  gap: 16px;

  & + & {
    padding-top: 40px;
    border-top: 1px solid var(--table-line);
  }

  @media (max-width: 760px) {
    gap: 12px;

    & + & {
      padding-top: 22px;
    }
  }
`;

export const SectionHead = styled.header`
  min-height: 36px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;

  h2 {
    margin: 0;
    color: var(--table-text);
    font-family: 'Gabarito', 'Inter', system-ui, sans-serif;
    font-size: 27px;
    line-height: 34px;
    font-weight: 800;
  }

  @media (max-width: 760px) {
    min-height: 30px;

    h2 {
      font-size: 20px;
      line-height: 24px;
    }
  }
`;

export const CarouselControls = styled.div`
  display: inline-flex;
  gap: 10px;

  button {
    width: 36px;
    height: 36px;
    padding: 0;
    border: 0;
    border-radius: 999px;
    background: #f5f5f0;
    color: var(--table-text);
    display: grid;
    place-items: center;
  }

  button:disabled {
    opacity: .35;
  }

  svg {
    width: 16px;
    height: 16px;
  }

  @media (max-width: 760px) {
    display: none;
  }
`;

export const ProductRail = styled.div`
  display: flex;
  gap: 20px;
  overflow-x: auto;
  overflow-y: hidden;
  scroll-snap-type: x proximity;
  scroll-behavior: smooth;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;

  &::-webkit-scrollbar {
    display: none;
  }

  > * {
    flex: 0 0 265px;
    scroll-snap-align: start;
  }

  @media (max-width: 760px) {
    gap: 12px;
    margin-right: -20px;
    padding-right: 20px;

    > * {
      flex-basis: 170px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    scroll-behavior: auto;
  }
`;

export const ProductCard = styled.article`
  position: relative;
  isolation: isolate;
  width: 265px;
  height: 294px;
  overflow: hidden;
  border: 1px solid var(--table-line);
  border-radius: 16px;
  background: #fff;
  display: flex;
  flex-direction: column;
  transition:
    transform 260ms cubic-bezier(.22, 1, .36, 1),
    box-shadow 260ms ease,
    border-color 220ms ease;

  &:hover {
    transform: translateY(-4px);
    border-color: color-mix(in srgb, var(--primary) 25%, var(--table-line));
    box-shadow: 0 14px 30px rgba(29, 27, 24, .09);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:hover {
      transform: none;
      box-shadow: none;
    }
  }

  .open {
    position: absolute;
    inset: 0;
    z-index: 1;
    border: 0;
    background: transparent;
  }

  .image {
    position: relative;
    height: 160px;
    flex: 0 0 160px;
    overflow: hidden;
    background: #f3f1ec;
    display: grid;
    place-items: center;
    color: #aaa49b;
  }

  .image img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .copy {
    min-height: 134px;
    padding: 16px;
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 12px;
  }

  .product-copy {
    min-width: 0;
    display: grid;
    gap: 4px;
  }

  .product-label {
    overflow: hidden;
    color: var(--primary);
    font-size: 10px;
    line-height: 13px;
    font-weight: 800;
    text-overflow: ellipsis;
    text-transform: uppercase;
    white-space: nowrap;
  }

  h3 {
    margin: 0;
    overflow: hidden;
    color: var(--table-text);
    font-size: 14px;
    line-height: 18px;
    font-weight: 800;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  p {
    margin: 0;
    overflow: hidden;
    color: var(--table-muted);
    font-size: 11px;
    line-height: 15px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .price {
    min-width: 0;
    display: flex;
    align-items: baseline;
    gap: 5px;
    flex-wrap: wrap;
  }

  .price del {
    color: var(--table-muted);
    font-size: 9px;
  }

  .price strong {
    color: var(--table-text);
    font-size: 14px;
    line-height: 18px;
    font-weight: 850;
  }

  .add {
    position: relative;
    z-index: 2;
    min-height: 28px;
    padding: 0 10px;
    border: 0;
    border-radius: 8px;
    background: color-mix(in srgb, var(--primary) 9%, #fff);
    color: var(--primary);
    font-size: 10px;
    font-weight: 800;
    white-space: nowrap;
  }

  @media (max-width: 760px) {
    width: 170px;
    height: 215px;

    .image {
      height: 110px;
      flex-basis: 110px;
    }

    .copy {
      min-height: 105px;
      padding: 12px;
      gap: 8px;
    }

    .product-copy {
      gap: 2px;
    }

    .product-label {
      font-size: 9px;
      line-height: 11px;
    }

    h3 {
      font-size: 13px;
      line-height: 16px;
    }

    p {
      font-size: 10px;
      line-height: 12px;
    }

    .price strong {
      font-size: 13px;
      line-height: 16px;
    }

    .add {
      min-height: 24px;
      padding: 0 8px;
      font-size: 9px;
    }
  }
`;

export const RestaurantInfo = styled.section`
  min-height: 76px;
  margin-top: 46px;
  padding: 20px 24px;
  border: 1px solid var(--table-line);
  border-radius: 16px;
  background: #fff;
  display: flex;
  align-items: center;
  gap: 36px;

  span {
    min-width: 0;
    display: inline-flex;
    align-items: center;
    gap: 9px;
    color: var(--table-text);
    font-size: 11px;
    line-height: 17px;
  }

  svg {
    width: 15px;
    height: 15px;
    flex: 0 0 15px;
    color: var(--primary);
  }

  @media (max-width: 760px) {
    display: none;
  }
`;

export const ActionDock = styled.nav`
  min-height: 64px;
  border-top: 1px solid var(--table-line);
  background: #fff;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 160px));
  justify-content: center;
  gap: 30px;

  button {
    position: relative;
    min-height: 64px;
    padding: 8px 12px;
    border: 0;
    background: transparent;
    color: var(--table-text);
    display: grid;
    justify-items: center;
    align-content: center;
    gap: 4px;
    font-size: 10px;
    line-height: 12px;
    font-weight: 750;
  }

  .icon {
    color: var(--primary);
    display: grid;
    place-items: center;
  }

  svg {
    width: 17px;
    height: 17px;
  }

  button i {
    position: absolute;
    top: 7px;
    left: calc(50% + 8px);
    min-width: 16px;
    height: 16px;
    padding: 0 4px;
    border-radius: 999px;
    background: var(--primary);
    color: #fff;
    display: grid;
    place-items: center;
    font-style: normal;
    font-size: 8px;
  }

  @media (max-width: 760px) {
    position: fixed;
    z-index: 35;
    left: 0;
    right: 0;
    bottom: 0;
    min-height: 64px;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0;
    box-shadow: 0 -8px 22px rgba(29, 27, 24, .06);

    button {
      min-height: 64px;
      font-size: 9px;
    }
  }
`;

