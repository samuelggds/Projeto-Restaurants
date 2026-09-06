import { createGlobalStyle } from 'styled-components';

export const AttendantResponsiveScale = createGlobalStyle`
  .attendant-responsive-scope {
    min-height: 100dvh;
    background: #f5f7f8;
  }

  @media (min-width: 901px) {
    .attendant-responsive-scope > div {
      grid-template-columns: 280px minmax(0, 1fr) !important;
    }

    .attendant-responsive-scope > div > aside {
      padding: 28px 20px !important;
    }

    .attendant-responsive-scope > div > aside nav {
      gap: 8px !important;
      margin-top: 24px !important;
    }

    .attendant-responsive-scope > div > aside nav button {
      min-height: 52px !important;
      padding: 0 15px !important;
      gap: 12px !important;
      border-radius: 13px !important;
      font-size: 13.5px !important;
    }

    .attendant-responsive-scope > div > aside nav button svg {
      width: 20px !important;
      height: 20px !important;
    }

    .attendant-responsive-scope main > header {
      padding: 32px clamp(28px, 3.5vw, 56px) 24px !important;
      gap: 28px !important;
    }

    .attendant-responsive-scope main > header .eyebrow {
      font-size: 10.5px !important;
    }

    .attendant-responsive-scope main > header h1 {
      font-size: clamp(32px, 2.5vw, 40px) !important;
      line-height: 1.05 !important;
    }

    .attendant-responsive-scope main > header p {
      font-size: 13.5px !important;
      line-height: 1.5 !important;
    }

    .attendant-responsive-scope main > header .sync > span {
      font-size: 11.5px !important;
    }

    .attendant-responsive-scope main > header .sync button {
      height: 46px !important;
      padding: 0 16px !important;
      font-size: 12px !important;
    }

    .attendant-responsive-scope main h2 {
      font-size: 21px !important;
      line-height: 1.25 !important;
    }

    .attendant-responsive-scope main h3 {
      font-size: 16px !important;
      line-height: 1.3 !important;
    }

    .attendant-responsive-scope main small {
      font-size: 11px !important;
      line-height: 1.4 !important;
    }

    .attendant-responsive-scope main p {
      font-size: 12.5px !important;
      line-height: 1.55 !important;
    }

    .attendant-responsive-scope main b {
      font-size: 13px !important;
      line-height: 1.35 !important;
    }

    .attendant-responsive-scope main time,
    .attendant-responsive-scope main em {
      font-size: 11px !important;
    }

    .attendant-responsive-scope main button {
      min-height: 44px;
      font-size: 12px !important;
    }

    .attendant-responsive-scope main input {
      min-height: 46px;
      font-size: 13px !important;
    }

    .attendant-responsive-scope main textarea {
      min-height: 72px !important;
      font-size: 13px !important;
    }

    .attendant-responsive-scope main article {
      padding: 18px !important;
      border-radius: 18px !important;
    }

    .attendant-responsive-scope main section {
      padding: 18px !important;
    }

    .attendant-responsive-scope form section > div > div + div {
      margin-top: 20px !important;
    }

    .attendant-responsive-scope main button[aria-label='Fechar detalhes'] {
      width: 44px !important;
      height: 44px !important;
    }
  }

  @media (max-width: 900px) {
    .attendant-responsive-scope > div {
      grid-template-columns: 1fr !important;
      padding-bottom: 84px !important;
    }

    .attendant-responsive-scope > div > aside {
      height: 76px !important;
      padding: 8px 6px !important;
    }

    .attendant-responsive-scope > div > aside nav {
      height: 60px !important;
      gap: 4px !important;
    }

    .attendant-responsive-scope > div > aside nav button {
      min-width: 78px !important;
      min-height: 60px !important;
      padding: 4px 6px !important;
      gap: 4px !important;
      font-size: 10px !important;
    }

    .attendant-responsive-scope > div > aside nav button svg {
      width: 20px !important;
      height: 20px !important;
    }

    .attendant-responsive-scope main > header {
      padding: 22px 18px 18px !important;
      gap: 16px !important;
    }

    .attendant-responsive-scope main > header .eyebrow {
      font-size: 9.5px !important;
    }

    .attendant-responsive-scope main > header h1 {
      font-size: clamp(27px, 8vw, 32px) !important;
      line-height: 1.08 !important;
    }

    .attendant-responsive-scope main > header p {
      font-size: 12.5px !important;
      line-height: 1.5 !important;
    }

    .attendant-responsive-scope main > header .sync > span {
      font-size: 10.5px !important;
    }

    .attendant-responsive-scope main > header .sync button {
      min-height: 44px !important;
      padding: 0 14px !important;
      font-size: 11.5px !important;
    }

    .attendant-responsive-scope main h2 {
      font-size: 20px !important;
      line-height: 1.25 !important;
    }

    .attendant-responsive-scope main h3 {
      font-size: 16px !important;
    }

    .attendant-responsive-scope main small {
      font-size: 10.5px !important;
      line-height: 1.4 !important;
    }

    .attendant-responsive-scope main p {
      font-size: 12.5px !important;
      line-height: 1.55 !important;
    }

    .attendant-responsive-scope main b {
      font-size: 12.5px !important;
      line-height: 1.35 !important;
    }

    .attendant-responsive-scope main time,
    .attendant-responsive-scope main em {
      font-size: 10.5px !important;
    }

    .attendant-responsive-scope main button {
      min-height: 44px;
      font-size: 12px !important;
    }

    .attendant-responsive-scope main input {
      min-height: 46px;
      font-size: 13px !important;
    }

    .attendant-responsive-scope main textarea {
      min-height: 72px !important;
      font-size: 13px !important;
    }

    .attendant-responsive-scope main article,
    .attendant-responsive-scope main section {
      padding: 16px !important;
    }

    .attendant-responsive-scope form section > div > div + div {
      margin-top: 16px !important;
    }

    .attendant-responsive-scope main button[aria-label='Fechar detalhes'] {
      width: 44px !important;
      height: 44px !important;
    }
  }

  @media (max-width: 560px) {
    .attendant-responsive-scope > div > aside nav button {
      min-width: 74px !important;
      font-size: 9.5px !important;
    }

    .attendant-responsive-scope main > header {
      padding-inline: 16px !important;
    }

    .attendant-responsive-scope main h1 {
      font-size: 27px !important;
    }

    .attendant-responsive-scope main article,
    .attendant-responsive-scope main section {
      padding: 15px !important;
      border-radius: 15px !important;
    }

    .attendant-responsive-scope form section > div > div + div {
      margin-top: 18px !important;
    }
  }
`;