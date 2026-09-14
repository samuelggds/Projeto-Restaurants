import styled from 'styled-components';

export const ContactLayout = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 0.83fr) minmax(0, 1.17fr);
  gap: clamp(38px, 7vw, 92px);
  align-items: start;
  .contact-copy {
    padding-top: 25px;
  }
  .contact-copy > p {
    color: var(--muted);
    max-width: 385px;
    font-size: 14px;
    line-height: 1.9;
  }
  .contact-promise {
    display: flex;
    gap: 14px;
    margin-top: 32px;
    align-items: flex-start;
  }
  .contact-promise > span {
    display: grid;
    place-items: center;
    background: #ecf0e1;
    color: #778a57;
    border-radius: 13px;
    width: 47px;
    height: 47px;
    flex-shrink: 0;
  }
  .contact-promise b {
    font-size: 13px;
    font-weight: 600;
  }
  .contact-promise p {
    margin: 6px 0 0;
    font-size: 12px;
    line-height: 1.9;
    color: #7b8471;
    max-width: 285px;
  }
  ul {
    list-style: none;
    display: grid;
    gap: 12px;
    margin: 29px 0;
    padding: 0;
  }
  li {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    font-size: 11px;
    line-height: 1.7;
    color: #78866a;
  }
  li svg {
    flex-shrink: 0;
  }
  .contact-demo {
    display: inline-flex;
    gap: 6px;
    align-items: center;
    font-size: 11px;
    line-height: 1.7;
    color: var(--ink);
    text-decoration: underline;
    text-underline-offset: 4px;
  }
  .contact-demo svg {
    flex-shrink: 0;
  }
  @media (max-width: 960px) {
    grid-template-columns: minmax(0, 1fr);
    gap: 32px;
    .contact-copy {
      padding: 0;
    }
    .contact-copy > p {
      max-width: 540px;
    }
  }
`;
export const Footer = styled.footer`
  background: #21392d;
  color: #d1dac4;
  padding-top: 47px;
  .footer-top {
    display: flex;
    gap: 30px;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 38px;
  }
  .footer-top > div > p {
    color: #a4b297;
    font-size: 11px;
    line-height: 1.9;
    margin: 18px 0 0;
  }
  .footer-links {
    display: flex;
    flex-wrap: wrap;
    gap: 26px;
    padding-top: 12px;
  }
  .footer-links a {
    color: #c9d4bb;
    font-size: 11px;
  }
  .footer-links a:hover {
    text-decoration: underline;
  }
  .back-top {
    display: grid;
    place-items: center;
    width: 38px;
    height: 38px;
    border: 1px solid #5b6d4f;
    border-radius: 50%;
    color: #d3e2b8;
    flex-shrink: 0;
    transform: rotate(180deg);
  }
  .footer-bottom {
    border-top: 1px solid #405537;
    padding: 20px 0;
    display: flex;
    gap: 20px;
    justify-content: space-between;
    color: #90a282;
    font-size: 9px;
  }
  @media (max-width: 760px) {
    .footer-top {
      flex-wrap: wrap;
    }
    .footer-links {
      order: 3;
      flex-basis: 100%;
      gap: 24px;
    }
    .footer-bottom {
      flex-direction: column;
      gap: 8px;
    }
  }
`;
