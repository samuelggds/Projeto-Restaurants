import styled from 'styled-components';

export const PeopleWorkspace = styled.div`
  display: grid;
  gap: 20px;

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
`;

export const PeopleHero = styled.section`
  position: relative;
  min-height: 218px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  padding: 30px;
  color: #fff;
  background:
    radial-gradient(
      circle at 90% 12%,
      color-mix(in srgb, var(--a) 44%, transparent),
      transparent 33%
    ),
    linear-gradient(118deg, #142722 0%, #17342c 52%, #54362b 100%);
  box-shadow: 0 24px 58px rgba(27, 38, 33, 0.16);
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(250px, 0.55fr);
  gap: 32px;
  isolation: isolate;

  &::before,
  &::after {
    content: '';
    position: absolute;
    z-index: -1;
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 50%;
  }

  &::before {
    width: 270px;
    height: 270px;
    right: -78px;
    bottom: -178px;
  }

  &::after {
    width: 180px;
    height: 180px;
    right: -30px;
    bottom: -136px;
  }

  @media (max-width: 820px) {
    grid-template-columns: 1fr;
    gap: 22px;
  }

  @media (max-width: 560px) {
    min-height: 0;
    padding: 23px 20px;
  }
`;

export const HeroCopy = styled.div`
  align-self: center;

  .eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    color: #ff9a68;
    font-size: 10px;
    font-weight: 850;
    letter-spacing: 0.13em;
    text-transform: uppercase;
  }

  .eyebrow svg {
    width: 15px;
    height: 15px;
  }

  h2 {
    max-width: 690px;
    margin: 12px 0 0;
    font-size: clamp(27px, 3vw, 39px);
    line-height: 1.04;
  }

  p {
    max-width: 690px;
    margin: 12px 0 0;
    color: rgba(255, 255, 255, 0.7);
    font-size: 14px;
    line-height: 1.55;
  }

  .hero-status {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 22px;
  }

  .hero-status span {
    min-height: 31px;
    padding: 0 11px;
    border: 1px solid rgba(255, 255, 255, 0.13);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.06);
    color: rgba(255, 255, 255, 0.83);
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 10px;
    font-weight: 700;
  }

  .hero-status svg {
    width: 13px;
    height: 13px;
    color: #ff9664;
  }

  @media (max-width: 480px) {
    h2 {
      font-size: 28px;
    }

    p {
      font-size: 13px;
    }
  }
`;

export const HeroAside = styled.aside`
  min-width: 0;
  align-self: stretch;
  padding-left: 27px;
  border-left: 1px solid rgba(255, 255, 255, 0.13);
  display: flex;
  flex-direction: column;
  justify-content: center;

  > small {
    color: rgba(255, 255, 255, 0.56);
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  > strong {
    margin-top: 7px;
    color: #fff;
    font-family: 'Sora', sans-serif;
    font-size: clamp(25px, 2.4vw, 34px);
    line-height: 1.1;
  }

  > span {
    margin-top: 8px;
    color: rgba(255, 255, 255, 0.66);
    font-size: 11px;
    line-height: 1.45;
  }

  > button {
    min-height: 44px;
    margin-top: 18px;
    padding: 0 15px;
    border: 0;
    border-radius: 8px;
    color: #fff;
    background: var(--a);
    box-shadow: 0 10px 24px color-mix(in srgb, var(--a) 30%, transparent);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    font-size: 12px;
    font-weight: 800;
    transition:
      filter 160ms ease,
      transform 160ms ease;
  }

  > button:hover {
    filter: brightness(0.96);
    transform: translateY(-1px);
  }

  > button svg {
    width: 16px;
    height: 16px;
  }

  @media (max-width: 820px) {
    padding: 20px 0 0;
    border-top: 1px solid rgba(255, 255, 255, 0.13);
    border-left: 0;
  }

  @media (prefers-reduced-motion: reduce) {
    > button {
      transition: none;
    }

    > button:hover {
      transform: none;
    }
  }
`;

export const PeopleMetrics = styled.section`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 980px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 460px) {
    gap: 9px;
  }
`;

export const PeopleMetric = styled.article`
  min-width: 0;
  min-height: 126px;
  border: 1px solid #e5dfd8;
  border-radius: 8px;
  padding: 18px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 9px 25px rgba(48, 35, 25, 0.045);
  display: flex;
  align-items: flex-start;
  gap: 13px;
  transition:
    border-color 180ms ease,
    box-shadow 180ms ease,
    transform 180ms ease;

  &:hover {
    border-color: color-mix(in srgb, var(--a) 25%, #e5dfd8);
    box-shadow: 0 13px 31px rgba(48, 35, 25, 0.075);
    transform: translateY(-2px);
  }

  .metric-icon {
    flex: 0 0 42px;
    width: 42px;
    height: 42px;
    border-radius: 8px;
    display: grid;
    place-items: center;
  }

  .metric-icon svg {
    width: 20px;
    height: 20px;
  }

  .metric-icon.primary {
    color: #c94d17;
    background: #fff0e8;
  }

  .metric-icon.success {
    color: #1d754b;
    background: #eaf7ef;
  }

  .metric-icon.info {
    color: #3d659b;
    background: #edf4ff;
  }

  .metric-icon.warning {
    color: #9b6713;
    background: #fff6df;
  }

  .metric-copy {
    min-width: 0;
    display: grid;
    gap: 5px;
  }

  .metric-copy > small {
    color: #766f69;
    font-size: 11px;
    font-weight: 700;
  }

  .metric-copy > strong {
    overflow: hidden;
    color: #211f1c;
    font-size: clamp(21px, 2vw, 27px);
    line-height: 1.05;
    letter-spacing: -0.035em;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .metric-copy > em {
    color: #8b837d;
    font-size: 10px;
    font-style: normal;
    line-height: 1.35;
  }

  @media (max-width: 560px) {
    min-height: 116px;
    padding: 14px;
    gap: 10px;

    .metric-icon {
      flex-basis: 36px;
      width: 36px;
      height: 36px;
    }

    .metric-icon svg {
      width: 18px;
      height: 18px;
    }

    .metric-copy > strong {
      font-size: 20px;
    }
  }

  @media (max-width: 370px) {
    display: grid;

    .metric-icon {
      display: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:hover {
      transform: none;
    }
  }
`;

export const DirectoryPanel = styled.section`
  min-width: 0;
  overflow: hidden;
  border: 1px solid #e5dfd8;
  border-radius: 8px;
  padding: 22px;
  background: #fff;
  box-shadow: 0 12px 34px rgba(48, 35, 25, 0.055);

  @media (max-width: 560px) {
    padding: 17px 14px;
  }
`;

export const DirectoryHeader = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;

  > div {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 11px;
  }

  .section-icon {
    flex: 0 0 42px;
    width: 42px;
    height: 42px;
    border-radius: 8px;
    color: #cc501b;
    background: #fff0e8;
    display: grid;
    place-items: center;
  }

  .section-icon svg {
    width: 20px;
    height: 20px;
  }

  small {
    color: #928981;
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  h2 {
    margin: 2px 0 0;
    color: #24211e;
    font-size: 20px;
  }

  > button {
    min-height: 42px;
    padding: 0 14px;
    border: 0;
    border-radius: 8px;
    color: #fff;
    background: var(--a);
    box-shadow: 0 8px 20px color-mix(in srgb, var(--a) 22%, transparent);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    font-size: 11px;
    font-weight: 800;
  }

  > button svg {
    width: 15px;
    height: 15px;
  }

  @media (max-width: 520px) {
    align-items: flex-start;

    > button {
      width: 42px;
      padding: 0;
      font-size: 0;
    }
  }
`;

export const DirectoryDescription = styled.p`
  margin: 12px 0 0;
  color: #7b746e;
  font-size: 12px;
  line-height: 1.5;
`;

export const DirectoryToolbar = styled.div`
  display: grid;
  grid-template-columns: minmax(260px, 1fr) repeat(2, minmax(145px, 180px)) auto;
  align-items: end;
  gap: 9px;
  margin-top: 20px;

  &.customers-toolbar {
    grid-template-columns: minmax(260px, 1fr) minmax(145px, 190px) auto;
  }

  label {
    min-width: 0;
    display: grid;
    gap: 6px;
  }

  label > span {
    color: #5e5751;
    font-size: 9px;
    font-weight: 800;
  }

  .control {
    position: relative;
  }

  .control > svg {
    position: absolute;
    left: 12px;
    top: 50%;
    width: 16px;
    height: 16px;
    color: #8a817a;
    pointer-events: none;
    transform: translateY(-50%);
  }

  input,
  select {
    width: 100%;
    height: 44px;
    border: 1px solid #e4ddd6;
    border-radius: 8px;
    outline: 0;
    color: #302c28;
    background: #faf9f7;
    font-size: 12px;
    transition:
      border-color 160ms ease,
      box-shadow 160ms ease,
      background 160ms ease;
  }

  input {
    padding: 0 12px 0 38px;
  }

  select {
    padding: 0 10px;
  }

  input:focus,
  select:focus {
    border-color: color-mix(in srgb, var(--a) 68%, #d5cdc6);
    background: #fff;
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--a) 11%, transparent);
  }

  @media (max-width: 900px) {
    grid-template-columns: minmax(0, 1fr) minmax(145px, 180px);

    &.customers-toolbar {
      grid-template-columns: minmax(0, 1fr) minmax(145px, 190px);
    }
  }

  @media (max-width: 580px) {
    grid-template-columns: 1fr;

    &.customers-toolbar {
      grid-template-columns: 1fr;
    }
  }
`;

export const ResultCount = styled.span`
  min-height: 44px;
  padding: 0 13px;
  border-radius: 8px;
  color: #6b625b;
  background: #f6f3ef;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 800;
  white-space: nowrap;

  @media (max-width: 900px) {
    grid-column: 1 / -1;
    justify-self: start;
  }

  @media (max-width: 580px) {
    width: 100%;
  }
`;

export const PeopleList = styled.div`
  display: grid;
  gap: 9px;
  margin-top: 18px;
`;

export const CustomerRow = styled.article`
  min-width: 0;
  min-height: 86px;
  border: 1px solid #e8e2dc;
  border-radius: 8px;
  padding: 14px 16px;
  background: #fff;
  display: grid;
  grid-template-columns: 44px minmax(180px, 1fr) repeat(2, minmax(110px, 0.35fr));
  align-items: center;
  gap: 14px;
  transition:
    border-color 160ms ease,
    background 160ms ease,
    transform 160ms ease;

  &:hover {
    border-color: color-mix(in srgb, var(--a) 24%, #e8e2dc);
    background: #fffdfb;
    transform: translateY(-1px);
  }

  .avatar {
    width: 44px;
    height: 44px;
    border-radius: 8px;
    color: var(--a);
    background: color-mix(in srgb, var(--a) 10%, #fff);
    display: grid;
    place-items: center;
    font-size: 11px;
    font-weight: 850;
  }

  .identity,
  .customer-stat {
    min-width: 0;
    display: grid;
    gap: 4px;
  }

  .identity b {
    overflow: hidden;
    color: #292521;
    font-size: 13px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .identity span,
  .customer-stat small {
    overflow: hidden;
    color: #8a817a;
    font-size: 10px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .customer-stat strong {
    color: #312c28;
    font-size: 13px;
  }

  .customer-stat:last-child {
    text-align: right;
  }

  @media (max-width: 700px) {
    grid-template-columns: 44px minmax(0, 1fr) auto;

    .customer-stat.orders {
      display: none;
    }
  }

  @media (max-width: 440px) {
    padding: 13px 12px;
    grid-template-columns: 40px minmax(0, 1fr);
    gap: 11px;

    .avatar {
      width: 40px;
      height: 40px;
    }

    .customer-stat:last-child {
      grid-column: 2;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      text-align: left;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:hover {
      transform: none;
    }
  }
`;

export const EmployeeRow = styled.article`
  min-width: 0;
  min-height: 94px;
  border: 1px solid #e8e2dc;
  border-radius: 8px;
  padding: 14px 16px;
  background: #fff;
  display: grid;
  grid-template-columns: 44px minmax(190px, 1fr) minmax(150px, 0.55fr) auto auto;
  align-items: center;
  gap: 14px;
  transition:
    border-color 160ms ease,
    background 160ms ease,
    transform 160ms ease;

  &:hover {
    border-color: color-mix(in srgb, var(--a) 24%, #e8e2dc);
    background: #fffdfb;
    transform: translateY(-1px);
  }

  .avatar {
    width: 44px;
    height: 44px;
    border-radius: 8px;
    color: var(--a);
    background: color-mix(in srgb, var(--a) 10%, #fff);
    display: grid;
    place-items: center;
    font-size: 11px;
    font-weight: 850;
  }

  .identity,
  .role {
    min-width: 0;
    display: grid;
    gap: 4px;
  }

  .identity b,
  .role b {
    overflow: hidden;
    color: #292521;
    font-size: 13px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .identity span,
  .role span {
    overflow: hidden;
    color: #8a817a;
    font-size: 10px;
    line-height: 1.35;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .status {
    min-height: 28px;
    padding: 0 10px;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    color: #277348;
    background: #edf8f1;
    font-size: 10px;
    font-weight: 800;
    white-space: nowrap;
  }

  .status::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #3d965e;
  }

  .status.inactive {
    color: #7b746e;
    background: #f2f0ed;
  }

  .status.inactive::before {
    background: #9c948c;
  }

  .row-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 7px;
  }

  .edit,
  .toggle-access {
    min-height: 38px;
    border: 1px solid #e4ddd6;
    border-radius: 8px;
    color: #605851;
    background: #fff;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-size: 10px;
    font-weight: 800;
    transition:
      border-color 160ms ease,
      color 160ms ease,
      background 160ms ease;
  }

  .edit {
    width: 38px;
    padding: 0;
  }

  .toggle-access {
    padding: 0 11px;
  }

  .edit:hover {
    border-color: color-mix(in srgb, var(--a) 35%, #e4ddd6);
    color: var(--a);
    background: color-mix(in srgb, var(--a) 6%, #fff);
  }

  .toggle-access.deactivate {
    border-color: #f0c8c3;
    color: #aa3f36;
    background: #fff8f7;
  }

  .toggle-access.reactivate {
    border-color: #bfe0c7;
    color: #2f7548;
    background: #f4fbf6;
  }

  .edit svg,
  .toggle-access svg {
    width: 15px;
    height: 15px;
  }

  @media (max-width: 1000px) {
    grid-template-columns: 44px minmax(180px, 1fr) minmax(140px, 0.55fr) auto;

    > .status {
      grid-column: 3;
      justify-self: start;
    }

    .row-actions {
      grid-column: 4;
      grid-row: 1 / span 2;
    }
  }

  @media (max-width: 720px) {
    grid-template-columns: 44px minmax(0, 1fr) auto;
    align-items: start;

    .role {
      grid-column: 2 / -1;
    }

    > .status {
      grid-column: 2;
    }

    .row-actions {
      grid-column: 2 / -1;
      grid-row: auto;
      justify-content: flex-start;
    }
  }

  @media (max-width: 440px) {
    padding: 13px 12px;
    grid-template-columns: 40px minmax(0, 1fr);
    gap: 10px 11px;

    .avatar {
      width: 40px;
      height: 40px;
    }

    .identity,
    .role,
    > .status,
    .row-actions {
      grid-column: 2;
    }

    .row-actions {
      width: 100%;
      display: grid;
      grid-template-columns: 38px minmax(0, 1fr);
    }

    .toggle-access {
      width: 100%;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:hover {
      transform: none;
    }
  }
`;

export const EmptyState = styled.div`
  min-height: 190px;
  margin-top: 18px;
  border: 1px dashed #dcd5ce;
  border-radius: 8px;
  color: #777069;
  background: #fbfaf8;
  display: grid;
  place-items: center;
  text-align: center;

  > div {
    max-width: 360px;
    padding: 28px 20px;
    display: grid;
    justify-items: center;
    gap: 8px;
  }

  svg {
    width: 30px;
    height: 30px;
    color: color-mix(in srgb, var(--a) 75%, #777069);
  }

  strong {
    color: #342f2b;
    font-family: 'Sora', sans-serif;
    font-size: 15px;
  }

  span {
    font-size: 11px;
    line-height: 1.5;
  }
`;

export const LoadMoreButton = styled.button`
  min-height: 42px;
  margin: 14px auto 0;
  padding: 0 16px;
  border: 1px solid color-mix(in srgb, var(--a) 26%, #dfd8d1);
  border-radius: 8px;
  color: color-mix(in srgb, var(--a) 86%, #342a24);
  background: color-mix(in srgb, var(--a) 5%, #fff);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 800;
  transition:
    border-color 160ms ease,
    background 160ms ease;

  &:hover {
    border-color: color-mix(in srgb, var(--a) 45%, #dfd8d1);
    background: color-mix(in srgb, var(--a) 9%, #fff);
  }
`;
