import styled from 'styled-components';

export const ProductFormSection = styled.section`
  min-width: 0;
  display: grid;
  gap: 17px;
  padding: 22px;
  border: 1px solid #e2dbd4;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 10px 25px rgba(44, 34, 27, 0.035);
  .section-heading {
    min-width: 0;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    gap: 11px;
  }
  .section-heading > span {
    width: 33px;
    height: 33px;
    display: grid;
    place-items: center;
    border-radius: 10px;
    color: var(--a);
    background: color-mix(in srgb, var(--a) 11%, white);
    font-size: 12px;
    font-weight: 900;
  }
  .section-heading h3 {
    margin: 0;
    font-size: 16px;
  }
  .section-heading > div > small {
    color: var(--a);
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 0.09em;
  }
  .section-heading p {
    margin: 3px 0 0;
    color: var(--muted);
    font-size: 11px;
    line-height: 1.45;
  }
  .customization-heading {
    grid-template-columns: auto minmax(0, 1fr) auto;
  }
  .add-group {
    height: 38px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border: 0;
    border-radius: 9px;
    padding: 0 12px;
    color: #fff;
    background: var(--a);
    font-size: 11px;
    font-weight: 800;
    cursor: pointer;
  }
  .add-group svg {
    width: 15px;
  }
  .add-group:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
  .group-guidance {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr) auto minmax(0, 1fr);
    align-items: center;
    gap: 10px;
    padding: 13px 14px;
    border: 1px solid #e6ded7;
    border-radius: 13px;
    background: #faf8f5;
  }
  .group-guidance > div {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 9px;
  }
  .group-guidance > div > i {
    flex: 0 0 auto;
    width: 27px;
    height: 27px;
    display: grid;
    place-items: center;
    border-radius: 8px;
    color: var(--a);
    background: color-mix(in srgb, var(--a) 10%, white);
    font-size: 11px;
    font-style: normal;
    font-weight: 900;
  }
  .group-guidance > div > span {
    min-width: 0;
    display: grid;
    gap: 2px;
  }
  .group-guidance b {
    font-size: 11px;
  }
  .group-guidance small {
    color: var(--muted);
    font-size: 11px;
    line-height: 1.35;
  }
  .group-guidance > svg {
    width: 14px;
    color: #c5bbb2;
  }
  @media (max-width: 600px) {
    padding: 15px;
    .customization-heading {
      grid-template-columns: auto 1fr;
    }
    .add-group {
      grid-column: 1 / -1;
      width: 100%;
    }
    .group-guidance {
      grid-template-columns: 1fr;
    }
    .group-guidance > svg {
      display: none;
    }
  }
`;
