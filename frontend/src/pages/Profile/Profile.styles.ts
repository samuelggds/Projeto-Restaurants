import styled, { keyframes } from 'styled-components';
export {
  PaymentMethodGrid,
  SavedCard,
  PaymentProtection,
  PaymentCardPreview,
  PaymentModalCard,
} from './Profile.payment.styles';

const progressLineReveal = keyframes`
  from { transform: scaleX(0); opacity: 0.35; }
  to { transform: scaleX(1); opacity: 1; }
`;

const contentReveal = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;

export const Root = styled.div<{ $primary: string }>`
  --p: ${({ $primary }) => $primary};
  --ink: #202521;
  --muted: #68706a;
  --border: #dedfd9;
  --surface: #ffffff;
  --surface-soft: #f2f3ef;
  --forest: #294237;
  --danger: #b33b32;
  min-height: 100vh;
  width: 100%;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.94) 0 128px, transparent 260px),
    linear-gradient(120deg, #f7f5f0 0%, #f5f7f3 56%, #f7f3ef 100%);
  color: var(--ink);
  font-family: 'DM Sans', sans-serif;
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }
  button {
    font: inherit;
    -webkit-tap-highlight-color: transparent;
  }
  h1,
  h2,
  h3 {
    font-family: 'Sora', sans-serif;
    letter-spacing: 0;
  }
  button:focus-visible,
  a:focus-visible,
  input:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--p) 24%, transparent);
    outline-offset: 2px;
  }
  button:not(:disabled),
  [role='button'] {
    cursor: pointer;
  }
  button:disabled {
    cursor: not-allowed;
  }
  img {
    display: block;
    max-width: 100%;
  }
`;
export const Page = styled.main`
  width: 100%;
  max-width: 1320px;
  margin: auto;
  padding: 28px clamp(22px, 4vw, 56px) 64px;
  @media (max-width: 700px) {
    padding: 16px 14px 44px;
  }
`;
export const ProfileIntro = styled.header`
  min-height: 86px;
  margin-bottom: 24px;
  padding: 0 0 22px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 28px;
  > div:first-child {
    min-width: 0;
  }
  > div:first-child > span {
    display: block;
    margin-bottom: 7px;
    color: var(--p);
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
  }
  h1 {
    margin: 0;
    color: #201d1a;
    font-size: 36px;
    line-height: 1.05;
  }
  h1 em {
    color: var(--p);
    font-style: normal;
  }
  @media (max-width: 700px) {
    min-height: auto;
    margin-bottom: 12px;
    padding-bottom: 13px;
    align-items: start;
    flex-direction: column;
    gap: 15px;
    h1 {
      font-size: 28px;
    }
  }
`;
export const ProfileSummary = styled.div`
  display: flex;
  align-items: stretch;
  gap: 0;
  > div {
    min-width: 112px;
    padding: 2px 18px;
    border-left: 1px solid var(--border);
    display: grid;
    gap: 3px;
  }
  strong {
    color: #201d1a;
    font-size: 18px;
    line-height: 1;
  }
  span {
    color: var(--muted);
    font-size: 11px;
    white-space: nowrap;
  }
  @media (max-width: 700px) {
    width: 100%;
    > div {
      min-width: 0;
      flex: 1;
      padding: 0 12px;
    }
    > div:first-child {
      padding-left: 0;
      border-left: 0;
    }
    span {
      white-space: normal;
    }
  }
`;
export const Layout = styled.div`
  display: grid;
  grid-template-columns: 250px minmax(0, 1fr);
  gap: clamp(26px, 3.4vw, 46px);
  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;
export const Side = styled.aside`
  position: sticky;
  top: 98px;
  align-self: start;
  max-height: calc(100vh - 116px);
  overflow-y: auto;
  padding: 2px 25px 14px 0;
  border-right: 1px solid var(--border);
  scrollbar-width: thin;
  .profile-identity {
    display: grid;
    grid-template-columns: 64px minmax(0, 1fr);
    align-items: center;
    gap: 13px;
    padding: 4px 4px 18px;
    border-bottom: 1px solid var(--border);
  }
  .profile-copy {
    min-width: 0;
  }
  .profile-copy > span,
  .nav-label {
    color: #8a7770;
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
  }
  h2 {
    overflow: hidden;
    margin: 4px 0 2px;
    font-size: 15px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  p {
    overflow: hidden;
    margin: 0;
    color: var(--muted);
    font-size: 11px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  nav {
    display: grid;
    gap: 3px;
    margin: 17px 0 14px;
    border-bottom: 1px solid var(--border);
    padding-bottom: 16px;
  }
  .nav-label {
    padding: 0 10px 8px;
  }
  nav button {
    position: relative;
    min-height: 43px;
    width: 100%;
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 0 10px;
    border: 0;
    border-radius: 7px;
    background: transparent;
    color: #3f4541;
    text-align: left;
    transition:
      background 160ms ease,
      color 160ms ease,
      transform 160ms ease;
  }
  nav button:hover {
    background: #eceee9;
    color: var(--ink);
  }
  nav button.active {
    background: color-mix(in srgb, var(--p) 9%, #fff);
    color: var(--p);
    font-weight: 700;
  }
  nav button.active::before {
    position: absolute;
    top: 9px;
    bottom: 9px;
    left: 0;
    width: 3px;
    border-radius: 3px;
    background: var(--p);
    content: '';
  }
  nav button > svg:first-child {
    width: 18px;
  }
  .nav-chevron {
    width: 14px;
    margin-left: auto;
    opacity: 0.45;
  }
  .logout {
    min-height: 40px;
    width: 100%;
    border: 0;
    border-radius: 7px;
    background: transparent;
    color: var(--danger);
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 10px;
    font-size: 13px;
  }
  .logout:hover {
    background: #fff0ee;
  }
  @media (max-width: 900px) {
    display: none;
  }
`;
export const AvatarWrap = styled.div`
  position: relative;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  overflow: hidden;
  cursor: pointer;
  border: 3px solid #fff;
  box-shadow: 0 0 0 1px var(--border);
  flex-shrink: 0;
  input {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
  }
  &:hover .ov {
    opacity: 1;
  }
`;
export const AvatarImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
`;
export const AvatarInitials = styled.div`
  width: 100%;
  height: 100%;
  background: color-mix(in srgb, var(--p) 10%, #fff);
  color: var(--p);
  display: grid;
  place-items: center;
  font-size: 20px;
  font-weight: 800;
  user-select: none;
`;
export const AvatarOverlay = styled.div.attrs({ className: 'ov' })`
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.52);
  opacity: 0;
  transition: opacity 0.2s;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #fff;
  pointer-events: none;
  gap: 2px;
  span {
    font-size: 10px;
    line-height: 1.2;
    text-align: center;
  }
`;
export const Main = styled.section`
  min-width: 0;
  padding-bottom: 16px;
`;
export const ViewTransition = styled.div`
  animation: ${contentReveal} 240ms cubic-bezier(0.22, 1, 0.36, 1);
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;
export const Active = styled.article`
  position: relative;
  min-height: 278px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(240px, 0.72fr);
  overflow: hidden;
  padding: 16px;
  box-shadow: 0 12px 30px rgba(39, 46, 41, 0.06);
  &::before {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: 4px;
    background: var(--p);
    content: '';
  }
  .active-content {
    min-width: 0;
    padding: 10px 22px 8px 18px;
  }
  @media (max-width: 850px) {
    grid-template-columns: 1fr;
    padding: 12px;
    .active-content {
      padding: 10px 8px 9px 10px;
    }
  }
`;
export const Heading = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  > div {
    min-width: 0;
  }
  small {
    display: block;
    margin-bottom: 5px;
    color: var(--muted);
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
  }
  h2 {
    margin: 0;
    font-size: 23px;
  }
  @media (max-width: 600px) {
    flex-wrap: wrap;
    gap: 8px 12px;
    h2 {
      width: 100%;
      font-size: 21px;
    }
  }
`;
export const Status = styled.b`
  flex: 0 0 auto;
  min-height: 34px;
  padding: 0 11px;
  border: 1px solid #bcd3c3;
  background: #eef6f0;
  color: #316342;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
`;
export const Tracking = styled.ol`
  padding: 0;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  align-items: start;
  margin: 30px 0 23px;
  list-style: none;
`;
export const Step = styled.li<{ $done?: boolean; $active?: boolean }>`
  position: relative;
  display: grid;
  justify-items: center;
  gap: 7px;
  color: ${({ $done, $active }) => ($done || $active ? 'var(--p)' : '#aaa')};
  text-align: center;
  &:not(:last-child)::after {
    content: '';
    position: absolute;
    top: 18px;
    left: calc(50% + 19px);
    width: calc(100% - 38px);
    height: 2px;
    background: ${({ $done }) => ($done ? 'var(--p)' : 'var(--border)')};
    transform-origin: left center;
    animation: ${({ $done }) => ($done ? progressLineReveal : 'none')} 500ms
      cubic-bezier(0.22, 1, 0.36, 1) both;
  }
  i {
    width: 38px;
    height: 38px;
    border: 2px solid ${({ $done, $active }) => ($done || $active ? 'var(--p)' : '#aaa')};
    border-radius: 50%;
    display: grid;
    place-items: center;
    font-style: normal;
    background: ${({ $done, $active }) => ($done || $active ? 'var(--p)' : '#fff')};
    color: ${({ $done, $active }) => ($done || $active ? '#fff' : '#a5a5a5')};
    transition:
      transform 180ms ease,
      background 180ms ease,
      color 180ms ease;
    svg {
      display: block;
    }
  }
  span {
    color: #515852;
    font-size: 11px;
    font-weight: 600;
    white-space: nowrap;
  }
  @media (max-width: 520px) {
    &:not(:last-child)::after {
      top: 15px;
      left: calc(50% + 15px);
      width: calc(100% - 30px);
    }
    i {
      width: 30px;
      height: 30px;
    }
    span {
      font-size: 9px;
      white-space: normal;
      line-height: 1.15;
      max-width: 58px;
    }
  }
`;
export const Eta = styled.p`
  width: fit-content;
  min-height: 35px;
  display: flex;
  align-items: center;
  gap: 9px;
  margin: 0;
  padding: 0 11px;
  border-radius: 6px;
  background: #f0f4f1;
  color: var(--muted);
  font-size: 12px;
  svg {
    width: 16px;
    color: var(--forest);
  }
`;
export const Actions = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 18px;
  button {
    min-height: 42px;
    padding: 0 16px;
    border: 1px solid var(--p);
    border-radius: 7px;
    background: transparent;
    color: var(--p);
    cursor: pointer;
    font-weight: 700;
    transition:
      transform 160ms ease,
      box-shadow 160ms ease;
  }
  button:hover {
    transform: translateY(-1px);
  }
  button:first-child {
    background: var(--p);
    color: #fff;
    display: flex;
    align-items: center;
    gap: 8px;
    box-shadow: 0 7px 18px color-mix(in srgb, var(--p) 22%, transparent);
  }
  @media (max-width: 480px) {
    display: grid;
    grid-template-columns: 1fr 1fr;
    button {
      padding: 10px 8px;
      font-size: 11px;
      justify-content: center;
    }
  }
`;
export const ActiveVisual = styled.figure`
  margin: 0;
  position: relative;
  min-height: 240px;
  border-radius: 8px;
  overflow: hidden;
  background: #283a31;
  img {
    width: 100%;
    height: 100%;
    position: absolute;
    inset: 0;
    object-fit: cover;
  }
  &::after {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, transparent 28%, rgba(24, 31, 27, 0.9) 100%);
    content: '';
  }
  div {
    position: absolute;
    z-index: 1;
    right: 0;
    bottom: 0;
    left: 0;
    display: grid;
    gap: 4px;
    padding: 22px;
    color: #fff;
  }
  span {
    color: rgba(255, 255, 255, 0.72);
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
  }
  strong {
    font-size: 17px;
  }
  b {
    color: #ffd4bf;
    font-size: 14px;
  }
  @media (max-width: 850px) {
    display: none;
  }
`;
export const Bottom = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.08fr) minmax(310px, 0.92fr);
  gap: clamp(24px, 3vw, 38px);
  margin-top: 30px;
  @media (max-width: 850px) {
    grid-template-columns: 1fr;
  }
`;
export const Card = styled.section`
  min-width: 0;
  padding: 17px 0 0;
  border-top: 2px solid var(--forest);
  h2 {
    margin: 0;
    font-size: 19px;
  }
  .section-heading {
    min-height: 49px;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
  }
  .section-heading span {
    display: block;
    margin-bottom: 4px;
    color: var(--p);
    font-size: 9px;
    font-weight: 800;
    text-transform: uppercase;
  }
  .section-empty {
    margin: 10px 0;
    color: var(--muted);
    font-size: 13px;
  }
  @media (max-width: 520px) {
    padding-top: 14px;
  }
`;
export const Order = styled.article`
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr) auto;
  gap: 12px;
  min-height: 88px;
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
  img {
    width: 64px;
    height: 64px;
    border-radius: 6px;
    object-fit: cover;
  }
  div {
    display: flex;
    flex-direction: column;
    gap: 5px;
    min-width: 0;
  }
  span,
  small {
    color: var(--muted);
    font-size: 12px;
  }
  aside {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 5px;
  }
  aside small {
    color: #43853e;
  }
  button {
    border: 1px solid var(--p);
    color: var(--p);
    background: transparent;
    border-radius: 6px;
    padding: 5px 9px;
    font-size: 11px;
    cursor: pointer;
  }
  @media (max-width: 520px) {
    grid-template-columns: 58px 1fr;
    gap: 10px;
    img {
      width: 58px;
      height: 58px;
    }
    aside {
      grid-column: 2;
      align-items: flex-start;
      flex-direction: row;
      flex-wrap: wrap;
    }
    aside button {
      width: 100%;
    }
  }
`;
export const All = styled.button`
  min-height: 39px;
  margin: 9px 0 0 auto;
  border: 0;
  background: transparent;
  color: var(--p);
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  cursor: pointer;
`;
export const Account = styled.div`
  min-height: 67px;
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 11px 0;
  border-bottom: 1px solid var(--border);
  i {
    flex: 0 0 38px;
    width: 38px;
    height: 38px;
    border-radius: 7px;
    background: #e9eeea;
    color: var(--forest);
    display: grid;
    place-items: center;
    font-style: normal;
  }
  div {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }
  span {
    color: var(--muted);
    font-size: 13px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  button {
    margin-left: auto;
    border: 0;
    min-height: 36px;
    padding: 0 8px;
    border-radius: 6px;
    background: transparent;
    color: var(--p);
    cursor: pointer;
  }
  button:hover {
    background: color-mix(in srgb, var(--p) 8%, #fff);
  }
`;
export const Support = styled.div`
  width: 100%;
  min-height: 76px;
  margin: 30px 0 0;
  border-radius: 8px;
  background: var(--forest);
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 13px 18px;
  color: #fff;
  > i {
    width: 42px;
    height: 42px;
    display: grid;
    place-items: center;
    border-radius: 7px;
    background: rgba(255, 255, 255, 0.1);
    font-style: normal;
  }
  > span {
    display: grid;
    gap: 2px;
  }
  > span small {
    color: rgba(255, 255, 255, 0.66);
  }
  button {
    margin-left: auto;
    min-height: 40px;
    border: 1px solid rgba(255, 255, 255, 0.25);
    background: #fff;
    color: var(--forest);
    padding: 0 17px;
    border-radius: 7px;
    font-weight: 800;
    cursor: pointer;
  }
  @media (max-width: 700px) {
    width: 100%;
    padding: 14px;
    display: grid;
    grid-template-columns: auto 1fr;
    button {
      grid-column: 1/-1;
      width: 100%;
      margin: 0;
    }
  }
`;
export const Empty = styled.section`
  grid-column: 1 / -1;
  min-height: 136px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.7);
  padding: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  color: var(--muted);
  > svg {
    width: 38px;
    height: 38px;
    padding: 9px;
    border-radius: 7px;
    background: #e9eeea;
    color: var(--forest);
  }
  > div {
    display: grid;
    gap: 3px;
  }
  b {
    color: var(--ink);
  }
  span {
    font-size: 12px;
  }
  button {
    min-height: 39px;
    margin-left: 12px;
    padding: 0 14px;
    border: 1px solid var(--p);
    border-radius: 7px;
    background: var(--p);
    color: #fff;
    font-weight: 700;
  }
  @media (max-width: 560px) {
    align-items: flex-start;
    flex-direction: column;
    button {
      width: 100%;
      margin: 4px 0 0;
    }
  }
`;
export const MobileTabs = styled.nav`
  display: none;
  position: relative;
  width: 100%;
  margin: 0 0 18px;
  .mobile-tabs-trigger {
    width: 100%;
    min-height: 54px;
    padding: 7px 10px;
    border: 1px solid var(--border);
    border-radius: 8px;
    display: flex;
    align-items: center;
    gap: 10px;
    background: #fff;
    color: var(--ink);
    text-align: left;
  }
  .current-icon {
    width: 36px;
    height: 36px;
    flex: 0 0 36px;
    border-radius: 7px;
    display: grid;
    place-items: center;
    background: color-mix(in srgb, var(--p) 10%, #fff);
    color: var(--p);
  }
  .current-icon svg {
    width: 17px;
  }
  .current-copy {
    min-width: 0;
    display: grid;
    gap: 1px;
  }
  .current-copy small {
    color: var(--muted);
    font-size: 9px;
    font-weight: 800;
    text-transform: uppercase;
  }
  .current-copy strong {
    overflow: hidden;
    font-size: 14px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .current-chevron {
    width: 18px;
    margin-left: auto;
    color: var(--muted);
    transition: transform 160ms ease;
  }
  .current-chevron[data-open='true'] {
    transform: rotate(180deg);
  }
  .mobile-tabs-menu {
    position: absolute;
    z-index: 30;
    top: calc(100% + 7px);
    right: 0;
    left: 0;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 4px;
    padding: 7px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: #fff;
    box-shadow: 0 18px 44px rgba(31, 42, 35, 0.18);
    animation: ${contentReveal} 180ms cubic-bezier(0.22, 1, 0.36, 1);
  }
  .mobile-tabs-menu button {
    min-width: 0;
    min-height: 44px;
    padding: 0 9px;
    border: 0;
    border-radius: 6px;
    display: flex;
    align-items: center;
    gap: 8px;
    background: transparent;
    color: #4c534e;
    text-align: left;
  }
  .mobile-tabs-menu button svg {
    width: 16px;
    flex: 0 0 16px;
  }
  .mobile-tabs-menu button span {
    min-width: 0;
    overflow: hidden;
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .mobile-tabs-menu button.active {
    background: color-mix(in srgb, var(--p) 9%, #fff);
    color: var(--p);
    font-weight: 700;
  }
  @media (max-width: 900px) {
    display: block;
  }
`;
export const ViewHeader = styled.header`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 15px;
  margin-bottom: 22px;
  h2 {
    font-size: 25px;
    margin: 0 0 5px;
  }
  p {
    margin: 0;
    color: var(--muted);
    font-size: 13px;
  }
  button {
    height: 43px;
    border: 0;
    border-radius: 7px;
    background: var(--p);
    color: #fff;
    padding: 0 16px;
    font-weight: 700;
  }
  @media (max-width: 520px) {
    align-items: stretch;
    flex-direction: column;
    h2 {
      font-size: 23px;
    }
    button {
      width: 100%;
    }
  }
`;
export const PageCard = styled.section`
  border-top: 2px solid var(--forest);
  padding-top: 4px;
`;
export const FullOrder = styled.article`
  display: grid;
  grid-template-columns: 76px minmax(0, 1fr) auto;
  align-items: center;
  gap: 15px;
  min-height: 104px;
  padding: 15px 4px;
  border-bottom: 1px solid var(--border);
  img {
    width: 76px;
    height: 70px;
    border-radius: 6px;
    object-fit: cover;
  }
  .info {
    display: grid;
    gap: 5px;
  }
  .info span {
    font-size: 12px;
    color: var(--muted);
  }
  aside {
    text-align: right;
    display: grid;
    gap: 7px;
    justify-items: end;
  }
  aside small {
    color: #43853e;
  }
  aside button {
    height: 34px;
    border: 1px solid var(--p);
    border-radius: 6px;
    background: #fff;
    color: var(--p);
    padding: 0 11px;
  }
  @media (max-width: 550px) {
    grid-template-columns: 62px 1fr;
    img {
      width: 62px;
      height: 62px;
    }
    aside {
      grid-column: 2;
      text-align: left;
      justify-items: start;
    }
  }
`;
export const OrderPage = styled.div`
  animation: ${contentReveal} 220ms cubic-bezier(0.22, 1, 0.36, 1);
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;
export const OrderPagination = styled.nav`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding-top: 18px;
  color: var(--muted);
  font-size: 13px;
  div {
    display: flex;
    gap: 8px;
  }
  button {
    min-height: 34px;
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 0 11px;
    background: #fff;
    color: var(--p);
    cursor: pointer;
    transition:
      transform 160ms ease,
      background 160ms ease,
      border-color 160ms ease,
      box-shadow 160ms ease;
  }
  button:hover:not(:disabled) {
    background: #f8e9df;
    border-color: var(--p);
    box-shadow: 0 5px 12px rgba(42, 27, 16, 0.08);
    transform: translateY(-1px);
  }
  button:active:not(:disabled) {
    box-shadow: none;
    transform: translateY(0);
  }
  button:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }
  @media (max-width: 550px) {
    align-items: stretch;
    flex-direction: column;
    div {
      display: grid;
      grid-template-columns: 1fr 1fr;
    }
    button {
      padding: 0 8px;
      font-size: 12px;
    }
  }
`;
export const AddressGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  @media (max-width: 650px) {
    grid-template-columns: 1fr;
  }
`;
export const AddressCard = styled.article`
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 18px;
  display: grid;
  grid-template-columns: 44px 1fr auto;
  gap: 13px;
  align-items: start;
  i {
    width: 44px;
    height: 44px;
    border-radius: 7px;
    background: #e9eeea;
    color: var(--forest);
    display: grid;
    place-items: center;
    font-style: normal;
  }
  div {
    display: grid;
    gap: 5px;
  }
  span {
    color: var(--muted);
    font-size: 12px;
  }
  small {
    color: #43853e;
    font-weight: 700;
  }
  button {
    min-height: 34px;
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 0 9px;
    background: #fff;
    color: var(--p);
  }
  button:disabled {
    border-color: #c4d6c8;
    background: #eef6f0;
    color: #316342;
  }
`;
export const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(21, 27, 23, 0.6);
  backdrop-filter: blur(5px);
  display: grid;
  place-items: center;
  padding: 20px;
  @media (max-width: 560px) {
    place-items: end center;
    padding: 12px 0 0;
  }
`;
export const AddressModalCard = styled.form`
  width: min(650px, 100%);
  max-height: 92vh;
  overflow-y: auto;
  background: #fff;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 24px 70px rgba(18, 28, 22, 0.26);
  color: #191816;
  header {
    display: flex;
    justify-content: space-between;
    gap: 20px;
    align-items: start;
  }
  h2 {
    margin: 0 0 5px;
    color: #191816;
    font-size: 25px;
  }
  p {
    margin: 0;
    color: #70675f;
  }
  header button {
    border: 0;
    background: #eef0ec;
    border-radius: 7px;
    width: 38px;
    height: 38px;
    display: grid;
    place-items: center;
  }
  .default {
    display: flex;
    gap: 9px;
    align-items: center;
    margin-top: 17px;
    font-weight: 700;
    color: #292521;
  }
  .default input {
    accent-color: var(--p, #d64d08);
  }
  footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 22px;
  }
  footer button {
    border: 1px solid var(--border, #ded5cc);
    border-radius: 7px;
    padding: 12px 18px;
    background: #fff;
    color: #292521;
    font-weight: 700;
  }
  footer .primary {
    border-color: var(--p, #d64d08);
    background: var(--p, #d64d08);
    color: #fff;
    box-shadow: 0 8px 18px rgba(214, 77, 8, 0.2);
  }
  footer .primary:disabled {
    opacity: 0.65;
  }
  @media (max-width: 560px) {
    width: 100%;
    max-height: calc(100dvh - 12px);
    padding: 20px 16px;
    border-radius: 8px 8px 0 0;
    footer {
      display: grid;
      grid-template-columns: 1fr 1fr;
    }
  }
`;
export const AddressFormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-top: 22px;
  label {
    display: grid;
    gap: 7px;
    font-size: 12px;
    font-weight: 700;
    color: #39342f;
  }
  input {
    width: 100%;
    height: 48px;
    border: 1px solid var(--border, #ded5cc);
    border-radius: 7px;
    padding: 0 13px;
    outline: none;
    background: #fcfbf9;
    color: #191816;
    font: inherit;
  }
  input:hover {
    border-color: #bfb4aa;
    background: #fff;
  }
  input:focus {
    border-color: var(--p, #d64d08);
    background: #fff;
    box-shadow: 0 0 0 3px rgba(214, 77, 8, 0.12);
  }
  .street,
  .full {
    grid-column: 1 / -1;
  }
  @media (max-width: 560px) {
    grid-template-columns: 1fr;
    .street,
    .full {
      grid-column: auto;
    }
  }
`;
export const AddressMessage = styled.p`
  margin-top: 12px !important;
  color: var(--p, #d64d08) !important;
  font-size: 12px;
  font-weight: 700;
`;
export const FavoriteGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
  @media (max-width: 520px) {
    width: 100%;
    gap: 12px;
  }
`;
export const FavoriteCard = styled.article`
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
  min-width: 0;
  position: relative;
  height: 132px;
  display: grid;
  grid-template-columns: 118px minmax(0, 1fr);
  background: #fff;
  transition:
    transform 180ms ease,
    box-shadow 180ms ease,
    border-color 180ms ease;
  &:hover {
    border-color: rgba(214, 77, 8, 0.42);
    box-shadow: 0 10px 22px rgba(55, 38, 26, 0.09);
    transform: translateY(-2px);
  }
  > img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .heart {
    position: absolute;
    right: 9px;
    top: 9px;
    width: 36px;
    height: 36px;
    border: 0;
    border-radius: 50%;
    background: #fff;
    color: var(--p);
    box-shadow: 0 4px 12px rgba(32, 37, 33, 0.12);
  }
  div {
    padding: 15px 50px 13px 16px;
    display: flex;
    min-height: 0;
    min-width: 0;
    flex-direction: column;
  }
  h3 {
    margin: 0;
    color: #201c18;
    font-size: 16px;
    line-height: 1.25;
  }
  p {
    margin: 5px 0 10px;
    min-height: 0;
    color: var(--muted);
    font-size: 11px;
    line-height: 1.4;
  }
  footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    position: absolute;
    right: 9px;
    bottom: 13px;
    left: 134px;
    margin: 0;
  }
  footer strong {
    color: var(--p);
    font-size: 15px;
  }
  footer .add-favorite {
    width: 36px;
    height: 36px;
    border: 0;
    border-radius: 7px;
    background: var(--p);
    color: #fff;
    display: grid;
    flex: 0 0 auto;
    place-items: center;
    box-shadow: 0 6px 14px rgba(214, 77, 8, 0.2);
  }
  footer .add-favorite svg {
    width: 18px;
  }
  @media (max-width: 520px) {
    width: 100%;
    grid-template-columns: 102px minmax(0, 1fr);
    height: 128px;
    div {
      padding: 13px 43px 12px 14px;
    }
    > img {
      min-height: 128px;
    }
    h3 {
      font-size: 14px;
    }
    p {
      margin: 4px 0 8px;
    }
    footer {
      right: 7px;
      bottom: 12px;
      left: 116px;
    }
    .heart {
      width: 31px;
      height: 31px;
      right: 7px;
      top: 7px;
    }
  }
`;
export const SettingsForm = styled.form`
  max-width: 780px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  padding-top: 20px;
  label {
    display: grid;
    gap: 7px;
    font-size: 12px;
    font-weight: 700;
  }
  input {
    width: 100%;
    height: 48px;
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 0 12px;
    outline: 0;
    background: #fff;
    color: var(--ink);
    transition:
      border-color 160ms ease,
      box-shadow 160ms ease;
  }
  input:hover:not(:disabled) {
    border-color: #aeb4ad;
  }
  input:focus:not(:disabled) {
    border-color: var(--p);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--p) 14%, transparent);
  }
  input:disabled {
    background: #eeefec;
    color: #828781;
  }
  label.full {
    grid-column: 1/-1;
  }
  .password-requirements {
    grid-column: 1/-1;
  }
  .form-message {
    grid-column: 1 / -1;
    padding: 10px 12px;
    border-radius: 7px;
    font-size: 12px;
    font-weight: 700;
  }
  .form-message.error {
    border: 1px solid #ecc5c1;
    background: #fff1ef;
    color: var(--danger);
  }
  .form-message.success {
    border: 1px solid #c5d9ca;
    background: #eff7f1;
    color: #316342;
  }
  footer {
    grid-column: 1/-1;
    display: flex;
    justify-content: flex-end;
    border-top: 1px solid var(--border);
    padding-top: 17px;
  }
  button {
    height: 43px;
    border: 0;
    border-radius: 8px;
    background: var(--p);
    color: #fff;
    padding: 0 20px;
    font-weight: 700;
  }
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
    label.full,
    .password-requirements,
    footer {
      grid-column: auto;
    }
    footer button {
      width: 100%;
    }
  }
`;
export const SecurityList = styled.div`
  display: grid;
  .security-row {
    min-height: 82px;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .security-row > i {
    width: 44px;
    height: 44px;
    border-radius: 7px;
    background: #e9eeea;
    color: var(--forest);
    display: grid;
    place-items: center;
    font-style: normal;
  }
  .security-row div {
    display: grid;
    gap: 5px;
  }
  .security-row span {
    color: var(--muted);
    font-size: 12px;
  }
  .security-row button {
    margin-left: auto;
    border: 1px solid var(--p);
    border-radius: 7px;
    background: #fff;
    color: var(--p);
    height: 38px;
    padding: 0 13px;
    cursor: pointer;
  }
  .security-row button:disabled,
  .security-confirmation button:disabled {
    cursor: not-allowed;
    opacity: 0.65;
  }
  .security-confirmation {
    display: grid;
    gap: 7px;
    margin: 10px 0 2px 58px;
    padding: 14px;
    border: 1px solid #f0c6c0;
    border-radius: 7px;
    background: #fff7f5;
  }
  .security-confirmation > span,
  .security-error {
    color: var(--muted);
    font-size: 13px;
  }
  .security-confirmation > div {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
  .security-confirmation button {
    border: 1px solid var(--p);
    border-radius: 6px;
    background: var(--p);
    color: #fff;
    height: 36px;
    padding: 0 12px;
    cursor: pointer;
  }
  .security-confirmation button.secondary {
    background: #fff;
    color: var(--p);
  }
  .security-confirmation button.danger {
    background: #c94040;
    border-color: #c94040;
  }
  .security-error {
    color: #c94040;
    margin: 10px 0;
  }
  @media (max-width: 520px) {
    .security-row {
      display: grid;
      grid-template-columns: 44px 1fr;
      padding: 14px 0;
    }
    .security-row button {
      grid-column: 1/-1;
      width: 100%;
      margin: 0;
    }
    .security-confirmation {
      margin-left: 0;
    }
  }
`;
