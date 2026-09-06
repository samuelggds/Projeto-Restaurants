import { createGlobalStyle } from 'styled-components';

export const AttendantResponsiveScale = createGlobalStyle`
  .attendant-responsive-scope {
    min-height: 100dvh;
    width: 100%;
    background: #f5f7f8;
  }

  .attendant-responsive-scope > div,
  .attendant-responsive-scope main {
    width: 100%;
    min-width: 0;
  }

  .attendant-responsive-scope main > div:last-child {
    width: 100% !important;
    max-width: none !important;
    margin: 0 !important;
  }

  .attendant-responsive-scope main form {
    width: 100% !important;
    max-width: none !important;
  }

  @media (min-width: 1201px) {
    .attendant-responsive-scope > div {
      grid-template-columns: 300px minmax(0, 1fr) !important;
    }

    .attendant-responsive-scope > div > aside {
      padding: 30px 22px !important;
    }

    .attendant-responsive-scope > div > aside nav {
      gap: 9px !important;
      margin-top: 26px !important;
    }

    .attendant-responsive-scope > div > aside nav button {
      min-height: 56px !important;
      padding: 0 17px !important;
      gap: 13px !important;
      border-radius: 14px !important;
      font-size: 15px !important;
    }

    .attendant-responsive-scope > div > aside nav button svg {
      width: 22px !important;
      height: 22px !important;
    }

    .attendant-responsive-scope > div > aside > div:first-child strong {
      font-size: 16px !important;
    }

    .attendant-responsive-scope > div > aside > div:first-child small {
      font-size: 12px !important;
    }

    .attendant-responsive-scope main > header {
      padding: 36px clamp(34px, 3.2vw, 68px) 28px !important;
      gap: 30px !important;
    }

    .attendant-responsive-scope main > header .eyebrow {
      font-size: 12px !important;
    }

    .attendant-responsive-scope main > header h1 {
      margin: 7px 0 5px !important;
      font-size: clamp(38px, 2.7vw, 48px) !important;
      line-height: 1.05 !important;
    }

    .attendant-responsive-scope main > header p {
      font-size: 16px !important;
      line-height: 1.55 !important;
    }

    .attendant-responsive-scope main > header .sync > span {
      font-size: 13px !important;
    }

    .attendant-responsive-scope main > header .sync button {
      min-height: 50px !important;
      padding: 0 18px !important;
      font-size: 14px !important;
    }

    .attendant-responsive-scope main > div:last-child {
      padding: 32px clamp(30px, 3vw, 64px) 68px !important;
    }

    .attendant-responsive-scope main h2 {
      font-size: 26px !important;
      line-height: 1.25 !important;
    }

    .attendant-responsive-scope main h3 {
      font-size: 20px !important;
      line-height: 1.3 !important;
    }

    .attendant-responsive-scope main p {
      font-size: 15px !important;
      line-height: 1.6 !important;
    }

    .attendant-responsive-scope main small {
      font-size: 13px !important;
      line-height: 1.45 !important;
    }

    .attendant-responsive-scope main label,
    .attendant-responsive-scope main time,
    .attendant-responsive-scope main em {
      font-size: 13px !important;
    }

    .attendant-responsive-scope main b,
    .attendant-responsive-scope main section strong,
    .attendant-responsive-scope main article strong {
      font-size: 15px !important;
      line-height: 1.4 !important;
    }

    .attendant-responsive-scope main button > span > strong {
      font-size: 32px !important;
      line-height: 1.1 !important;
    }

    .attendant-responsive-scope main button {
      min-height: 48px;
      font-size: 14px !important;
    }

    .attendant-responsive-scope main input {
      min-height: 50px !important;
      padding-inline: 14px !important;
      font-size: 15px !important;
    }

    .attendant-responsive-scope main textarea {
      min-height: 86px !important;
      padding: 13px !important;
      font-size: 15px !important;
    }

    .attendant-responsive-scope main article {
      padding: 20px !important;
      border-radius: 19px !important;
    }

    .attendant-responsive-scope main section {
      padding: 22px !important;
    }

    .attendant-responsive-scope main form {
      gap: 18px !important;
    }

    .attendant-responsive-scope main form section {
      grid-template-columns: 44px minmax(0, 1fr) !important;
      gap: 18px !important;
    }

    .attendant-responsive-scope main form section > span:first-child {
      width: 40px !important;
      height: 40px !important;
      font-size: 14px !important;
      border-radius: 12px !important;
    }

    .attendant-responsive-scope main form section > div > div + div {
      margin-top: 22px !important;
    }

    .attendant-responsive-scope main button[aria-label='Fechar detalhes'] {
      width: 46px !important;
      height: 46px !important;
    }
  }

  @media (min-width: 901px) and (max-width: 1200px) {
    .attendant-responsive-scope > div {
      grid-template-columns: 270px minmax(0, 1fr) !important;
    }

    .attendant-responsive-scope > div > aside {
      padding: 26px 18px !important;
    }

    .attendant-responsive-scope > div > aside nav button {
      min-height: 52px !important;
      padding: 0 14px !important;
      gap: 11px !important;
      font-size: 14px !important;
    }

    .attendant-responsive-scope > div > aside nav button svg {
      width: 20px !important;
      height: 20px !important;
    }

    .attendant-responsive-scope main > header {
      padding: 30px 32px 24px !important;
    }

    .attendant-responsive-scope main > header h1 {
      font-size: 36px !important;
    }

    .attendant-responsive-scope main > header p {
      font-size: 14px !important;
    }

    .attendant-responsive-scope main > div:last-child {
      padding: 26px 30px 56px !important;
    }

    .attendant-responsive-scope main h2 { font-size: 23px !important; }
    .attendant-responsive-scope main h3 { font-size: 18px !important; }
    .attendant-responsive-scope main p { font-size: 14px !important; line-height: 1.55 !important; }
    .attendant-responsive-scope main small { font-size: 12px !important; line-height: 1.45 !important; }
    .attendant-responsive-scope main b,
    .attendant-responsive-scope main section strong,
    .attendant-responsive-scope main article strong { font-size: 14px !important; }
    .attendant-responsive-scope main button > span > strong { font-size: 29px !important; }
    .attendant-responsive-scope main label,
    .attendant-responsive-scope main time,
    .attendant-responsive-scope main em { font-size: 12px !important; }
    .attendant-responsive-scope main button { min-height: 46px; font-size: 13px !important; }
    .attendant-responsive-scope main input { min-height: 48px !important; font-size: 14px !important; }
    .attendant-responsive-scope main textarea { min-height: 78px !important; font-size: 14px !important; }
    .attendant-responsive-scope main article { padding: 18px !important; }
    .attendant-responsive-scope main section { padding: 20px !important; }
    .attendant-responsive-scope main form { gap: 16px !important; }
    .attendant-responsive-scope main form section > div > div + div { margin-top: 20px !important; }
  }

  @media (max-width: 900px) {
    .attendant-responsive-scope > div {
      grid-template-columns: 1fr !important;
      padding-bottom: 86px !important;
    }

    .attendant-responsive-scope > div > aside {
      height: 76px !important;
      padding: 8px 6px !important;
    }

    .attendant-responsive-scope > div > aside nav {
      height: 60px !important;
      gap: 4px !important;
      overflow-x: auto !important;
      scrollbar-width: none;
    }

    .attendant-responsive-scope > div > aside nav::-webkit-scrollbar {
      display: none;
    }

    .attendant-responsive-scope > div > aside nav button {
      min-width: 82px !important;
      min-height: 60px !important;
      padding: 5px 7px !important;
      gap: 4px !important;
      flex: 0 0 auto !important;
      font-size: 10.5px !important;
    }

    .attendant-responsive-scope > div > aside nav button svg {
      width: 21px !important;
      height: 21px !important;
    }

    .attendant-responsive-scope main > header {
      padding: 24px 18px 20px !important;
      gap: 18px !important;
    }

    .attendant-responsive-scope main > header .eyebrow {
      font-size: 10px !important;
    }

    .attendant-responsive-scope main > header h1 {
      font-size: clamp(29px, 7vw, 34px) !important;
      line-height: 1.08 !important;
    }

    .attendant-responsive-scope main > header p {
      font-size: 14px !important;
      line-height: 1.5 !important;
    }

    .attendant-responsive-scope main > header .sync > span {
      font-size: 12px !important;
    }

    .attendant-responsive-scope main > header .sync button {
      min-height: 46px !important;
      padding: 0 15px !important;
      font-size: 13px !important;
    }

    .attendant-responsive-scope main > div:last-child {
      padding: 22px 16px 40px !important;
    }

    .attendant-responsive-scope main h2 { font-size: 23px !important; }
    .attendant-responsive-scope main h3 { font-size: 18px !important; }
    .attendant-responsive-scope main p { font-size: 14px !important; line-height: 1.55 !important; }
    .attendant-responsive-scope main small { font-size: 12px !important; line-height: 1.45 !important; }
    .attendant-responsive-scope main b,
    .attendant-responsive-scope main section strong,
    .attendant-responsive-scope main article strong { font-size: 14px !important; }
    .attendant-responsive-scope main button > span > strong { font-size: 28px !important; }
    .attendant-responsive-scope main label,
    .attendant-responsive-scope main time,
    .attendant-responsive-scope main em { font-size: 12px !important; }
    .attendant-responsive-scope main button { min-height: 46px; font-size: 13px !important; }
    .attendant-responsive-scope main input,
    .attendant-responsive-scope main textarea { font-size: 16px !important; }
    .attendant-responsive-scope main input { min-height: 48px !important; }
    .attendant-responsive-scope main textarea { min-height: 82px !important; }
    .attendant-responsive-scope main article,
    .attendant-responsive-scope main section { padding: 17px !important; }
    .attendant-responsive-scope main form { gap: 16px !important; }
    .attendant-responsive-scope main form section > div > div + div { margin-top: 18px !important; }
    .attendant-responsive-scope main button[aria-label='Fechar detalhes'] { width: 46px !important; height: 46px !important; }
  }

  @media (max-width: 600px) {
    .attendant-responsive-scope main > header {
      padding: 20px 14px 18px !important;
    }

    .attendant-responsive-scope main > header h1 {
      font-size: 29px !important;
    }

    .attendant-responsive-scope main > div:last-child {
      padding: 18px 12px 32px !important;
    }

    .attendant-responsive-scope main article,
    .attendant-responsive-scope main section {
      padding: 15px !important;
      border-radius: 16px !important;
    }

    .attendant-responsive-scope main form section {
      grid-template-columns: 1fr !important;
      gap: 12px !important;
    }

    .attendant-responsive-scope main form section > span:first-child {
      width: 38px !important;
      height: 38px !important;
      font-size: 13px !important;
    }

    .attendant-responsive-scope main form section > div > div + div {
      margin-top: 18px !important;
    }

    .attendant-responsive-scope main h2 { font-size: 21px !important; }
    .attendant-responsive-scope main h3 { font-size: 17px !important; }
    .attendant-responsive-scope main p { font-size: 13.5px !important; }
    .attendant-responsive-scope main small { font-size: 11.5px !important; }
    .attendant-responsive-scope main b,
    .attendant-responsive-scope main section strong,
    .attendant-responsive-scope main article strong { font-size: 13.5px !important; }
    .attendant-responsive-scope main button { min-height: 46px; font-size: 12.5px !important; }
  }

  @media (max-width: 380px) {
    .attendant-responsive-scope > div > aside nav button {
      min-width: 74px !important;
      font-size: 9.5px !important;
    }

    .attendant-responsive-scope main > header h1 {
      font-size: 26px !important;
    }

    .attendant-responsive-scope main > div:last-child {
      padding-inline: 10px !important;
    }
  }
`;