import styled from 'styled-components';

export const Hero = styled.section`
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 24px;
  overflow: hidden;
  margin-bottom: 18px;
  padding: 26px;
  border-radius: 8px;
  background: linear-gradient(125deg, #21382e 0%, #294237 58%, #77422f 100%);
  box-shadow: 0 18px 36px rgba(29, 37, 43, 0.15);
  color: #fff;

  .eyebrow {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 8px;
    color: #ff9a6b;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  h2 {
    margin: 0;
    font-size: clamp(24px, 3vw, 32px);
    line-height: 1.08;
  }

  p {
    max-width: 620px;
    margin: 9px 0 0;
    color: rgba(255, 255, 255, 0.72);
    font-size: 13px;
    line-height: 1.55;
  }

  aside {
    position: relative;
    z-index: 1;
    display: grid;
    grid-template-columns: repeat(2, minmax(86px, 1fr));
    gap: 10px;
    align-self: center;
  }

  aside div {
    min-width: 92px;
    padding: 13px 15px;
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 7px;
    background: rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(8px);
  }

  aside strong,
  aside span {
    display: block;
  }

  aside strong {
    font-size: 22px;
  }

  aside span {
    margin-top: 2px;
    color: rgba(255, 255, 255, 0.66);
    font-size: 10px;
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
    gap: 18px;
    padding: 22px 18px;

    aside {
      justify-self: stretch;
    }

    aside div {
      min-width: 0;
    }
  }
`;

export const ProgressSection = styled.section`
  display: grid;
  gap: 10px;
  margin-bottom: 18px;

  > header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  > header h3 {
    margin: 0;
    font-size: 16px;
  }

  > header span {
    color: var(--muted);
    font-size: 11px;
  }
`;

export const ProgressGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

export const ProgressCard = styled.article`
  padding: 15px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: #fff;

  > div:first-child {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  b {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  small {
    flex: 0 0 auto;
    color: var(--p);
    font-weight: 800;
  }

  .track {
    height: 7px;
    overflow: hidden;
    margin-top: 11px;
    border-radius: 999px;
    background: #f0e8e1;
  }

  .track span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: var(--p);
  }

  > span {
    display: block;
    margin-top: 8px;
    color: var(--muted);
    font-size: 11px;
  }
`;

export const Wallet = styled.section`
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 12px 30px rgba(51, 37, 27, 0.06);
`;

export const WalletHeader = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 22px 16px;
  border-bottom: 1px solid var(--border);

  h3,
  p {
    margin: 0;
  }

  h3 {
    font-size: 18px;
  }

  p {
    margin-top: 4px;
    color: var(--muted);
    font-size: 12px;
  }

  @media (max-width: 600px) {
    align-items: stretch;
    flex-direction: column;
    padding: 17px 14px 13px;
  }
`;

export const Segments = styled.nav`
  display: flex;
  gap: 5px;
  padding: 4px;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: #faf7f3;

  button {
    min-height: 36px;
    padding: 0 13px;
    border: 0;
    border-radius: 5px;
    background: transparent;
    color: var(--muted);
    font-size: 12px;
    font-weight: 700;
    white-space: nowrap;
  }

  button.active {
    background: #fff;
    box-shadow: 0 4px 12px rgba(42, 31, 22, 0.08);
    color: var(--p);
  }

  @media (max-width: 600px) {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
`;

export const CouponGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(260px, 100%), 1fr));
  align-items: start;
  gap: 12px;
  max-height: min(560px, 62vh);
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 16px 18px 18px;
  scrollbar-color: #c9bdb4 transparent;
  scrollbar-gutter: stable;
  scrollbar-width: thin;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-thumb {
    border: 2px solid transparent;
    border-radius: 999px;
    background: #c9bdb4;
    background-clip: padding-box;
  }

  @media (max-width: 520px) {
    max-height: min(500px, 60vh);
    padding: 12px;
  }
`;

export const Coupon = styled.article<{ $muted?: boolean }>`
  position: relative;
  display: grid;
  min-width: 0;
  padding: 14px;
  border: 1px solid ${({ $muted }) => ($muted ? '#e6e1dc' : '#efc9b7')};
  border-radius: 8px;
  background: ${({ $muted }) => ($muted ? '#faf9f7' : '#fffaf7')};
  opacity: ${({ $muted }) => ($muted ? 0.82 : 1)};

  &::before,
  &::after {
    position: absolute;
    top: 62%;
    width: 10px;
    height: 20px;
    border: 1px solid ${({ $muted }) => ($muted ? '#e6e1dc' : '#efc9b7')};
    background: #fff;
    content: '';
  }

  &::before {
    left: -1px;
    border-left: 0;
    border-radius: 0 999px 999px 0;
  }

  &::after {
    right: -1px;
    border-right: 0;
    border-radius: 999px 0 0 999px;
  }

  .top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  .restaurant {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    color: var(--muted);
    font-size: 11px;
    font-weight: 700;
  }

  .restaurant span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  h4 {
    margin: 11px 0 3px;
    font-size: 16px;
  }

  > p {
    min-height: 32px;
    margin: 0;
    color: var(--muted);
    font-size: 12px;
    line-height: 1.4;
  }

  .value {
    margin: 10px 0;
    color: var(--p);
    font-size: 20px;
    font-weight: 850;
  }

  .code-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding-top: 10px;
    border-top: 1px dashed #ddcabe;
  }

  .code-row code {
    overflow: hidden;
    color: #29231f;
    font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
    font-size: 12px;
    font-weight: 850;
    letter-spacing: 0.08em;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .meta {
    display: grid;
    gap: 5px;
    margin: 10px 0 0;
    padding: 0;
    list-style: none;
    color: var(--muted);
    font-size: 11px;
  }

  .meta li {
    display: flex;
    align-items: center;
    gap: 7px;
  }

  .action {
    width: 100%;
    min-height: 38px;
    margin-top: 11px;
    border: 0;
    border-radius: 7px;
    background: var(--p);
    color: #fff;
    font-size: 12px;
    font-weight: 800;
  }

  .action:disabled {
    background: #ece7e2;
    color: #766f69;
  }
`;

export const Status = styled.span<{ $tone: 'available' | 'reserved' | 'used' | 'expired' }>`
  flex: 0 0 auto;
  padding: 4px 7px;
  border-radius: 999px;
  background: ${({ $tone }) =>
    $tone === 'available'
      ? '#eaf8ee'
      : $tone === 'reserved'
        ? '#fff3d8'
        : $tone === 'used'
          ? '#edf2f8'
          : '#f4eeee'};
  color: ${({ $tone }) =>
    $tone === 'available'
      ? '#227841'
      : $tone === 'reserved'
        ? '#9a6500'
        : $tone === 'used'
          ? '#45627e'
          : '#8e5b5b'};
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
`;

export const State = styled.div`
  grid-column: 1 / -1;
  display: grid;
  justify-items: center;
  gap: 8px;
  min-height: 210px;
  padding: 38px 20px;
  text-align: center;
  color: var(--muted);

  i {
    display: grid;
    width: 52px;
    height: 52px;
    place-items: center;
    border-radius: 8px;
    background: #f8eee7;
    color: var(--p);
    font-style: normal;
  }

  b {
    color: #29231f;
    font-size: 16px;
  }

  p {
    max-width: 390px;
    margin: 0;
    font-size: 12px;
    line-height: 1.5;
  }

  button {
    min-height: 39px;
    margin-top: 4px;
    padding: 0 15px;
    border: 1px solid var(--p);
    border-radius: 7px;
    background: #fff;
    color: var(--p);
    font-weight: 750;
  }
`;

export const Skeleton = styled.div`
  height: 245px;
  border-radius: 8px;
  background: linear-gradient(100deg, #f5f1ed 20%, #fbf9f7 38%, #f5f1ed 56%);
  background-size: 300% 100%;
  animation: wallet-loading 1.3s ease infinite;

  @keyframes wallet-loading {
    from {
      background-position: 100% 0;
    }
    to {
      background-position: 0 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;
