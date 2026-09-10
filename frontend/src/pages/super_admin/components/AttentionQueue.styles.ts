import styled from 'styled-components';

export const Panel = styled.section`
  min-width: 0;
  padding: 25px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 20px;
  .queue-heading {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 20px;
  }
  .eyebrow {
    color: #687951;
    font-size: 10px;
    letter-spacing: 0.1em;
    font-weight: 700;
    text-transform: uppercase;
  }
  h2 {
    margin: 7px 0;
    font-size: 21px;
    letter-spacing: -0.04em;
  }
  .queue-heading p,
  .queue-scope {
    margin: 0;
    font-size: 12px;
    color: var(--muted);
    line-height: 1.65;
  }
  .queue-scope {
    margin: 15px 0 9px;
    font-size: 11px;
  }
  button {
    cursor: pointer;
  }
  @media (max-width: 650px) {
    padding: 18px;
    .queue-heading {
      align-items: flex-start;
      flex-direction: column;
      gap: 14px;
    }
  }
`;
export const Refresh = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-shrink: 0;
  min-height: 44px;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  color: var(--brand-ink);
  background: #f6f8f1;
  font-size: 12px;
  &:hover:not(:disabled) {
    background: #eaf0e4;
  }
`;
export const Filters = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 23px;
  button {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: 44px;
    padding: 8px 12px;
    border: 1px solid var(--border);
    border-radius: 10px;
    color: #465a4c;
    background: transparent;
    font-size: 12px;
  }
  button span {
    min-width: 20px;
    padding: 2px 5px;
    border-radius: 5px;
    background: #eaf0e4;
    text-align: center;
    font-size: 11px;
  }
  button[aria-pressed='true'] {
    color: #fff;
    background: var(--brand-ink);
    border-color: var(--brand-ink);
  }
  button[aria-pressed='true'] span {
    background: #ffffff20;
  }
  @media (max-width: 380px) {
    gap: 6px;
    button {
      font-size: 11px;
      padding: 7px 8px;
      gap: 6px;
    }
  }
`;
export const List = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
  li {
    display: grid;
    grid-template-columns: 40px minmax(0, 1fr) auto;
    align-items: center;
    gap: 15px;
    padding: 19px 0;
    border-bottom: 1px solid var(--border);
  }
  .item-icon {
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    border: 1px solid #dce7df;
    border-radius: 12px;
    color: #426553;
    background: #f1f6ef;
  }
  .item-icon[data-category='billing'] {
    color: #966430;
    background: #fcf4e9;
    border-color: #ecdfcd;
  }
  .item-icon[data-category='support'] {
    color: #4b7188;
    background: #eff5f8;
    border-color: #dce7ec;
  }
  .item-copy {
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .item-category {
    color: var(--muted);
    font-size: 10px;
    font-weight: 650;
  }
  h3 {
    margin: 3px 0 5px;
    font-size: 14px;
    font-weight: 700;
  }
  p {
    margin: 0 0 6px;
    font-size: 12px;
    line-height: 1.5;
  }
  small {
    color: var(--muted);
    font-size: 11px;
    line-height: 1.5;
  }
  button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    min-height: 44px;
    padding: 8px 11px;
    font-size: 12px;
    font-weight: 650;
    color: var(--brand-ink);
    background: #f4f6f0;
    border: 1px solid var(--border);
    border-radius: 10px;
  }
  button:hover {
    background: #e9eee2;
  }
  @media (max-width: 480px) {
    li {
      grid-template-columns: 32px minmax(0, 1fr);
      gap: 11px;
      align-items: start;
    }
    .item-icon {
      width: 32px;
      height: 32px;
      border-radius: 9px;
    }
    button {
      grid-column: 2;
      justify-self: start;
    }
  }
`;
export const Empty = styled.div`
  display: flex;
  gap: 14px;
  padding: 28px 0;
  svg {
    color: #718565;
    flex-shrink: 0;
  }
  h3 {
    font-size: 14px;
    margin: 0 0 7px;
  }
  p {
    font-size: 12px;
    line-height: 1.6;
    margin: 0;
    color: var(--muted);
  }
`;
export const Footer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 15px;
  font-size: 11px;
  color: var(--muted);
  nav {
    display: flex;
    gap: 7px;
  }
  button {
    min-height: 44px;
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 8px 11px;
    background: #fffefb;
    color: var(--ink);
    font-size: 12px;
  }
`;
