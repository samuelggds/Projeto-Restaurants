import styled from 'styled-components';

export const PortalPage = styled.main`
  width: min(1180px, calc(100% - 48px));
  margin: 0 auto;
  padding: 64px 0 110px;
  .safe-note {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 8px;
    color: #667062;
    font-size: 12px;
    line-height: 1.7;
    margin: 25px auto 0;
  }
  .safe-note svg {
    flex-shrink: 0;
  }
  @media (max-width: 600px) {
    width: calc(100% - 32px);
    padding-top: 38px;
    .safe-note {
      align-items: flex-start;
    }
  }
`;
export const PortalHero = styled.section`
  .demo-note {
    display: block;
    margin-top: 16px;
    font-size: 11px;
    color: #667062;
  }
  max-width: 800px;
  margin: 0 auto 42px;
  text-align: center;
  .eyebrow {
    color: #657953;
    font-size: 10px;
    letter-spacing: 0.16em;
    font-weight: 800;
  }
  h1 {
    margin: 18px 0;
    color: #233f32;
    font-family: 'Manrope', sans-serif;
    font-size: clamp(34px, 4.8vw, 58px);
    font-weight: 600;
    letter-spacing: -0.05em;
    line-height: 1.15;
  }
  h1 span {
    font-family: 'DM Serif Display', Georgia, serif;
    font-weight: 400;
    font-style: italic;
    color: #627a4c;
    letter-spacing: -0.025em;
  }
  p {
    max-width: 660px;
    margin: 20px auto 0;
    color: #667062;
    font-size: 14px;
    line-height: 1.9;
  }
`;
export const PortalGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
  @media (max-width: 850px) {
    grid-template-columns: 1fr;
    max-width: 600px;
    margin: 0 auto;
  }
`;
export const PortalCard = styled.article`
  min-width: 0;
  padding: 28px;
  border: 1px solid #dce1d5;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  background: #fff;
  &[data-portal='customer'] {
    background: #edf1e5;
    border-color: #dce5ce;
  }
  &[data-portal='admin'] {
    background: #f4efe6;
    border-color: #e9e1d4;
  }
  .card-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .area-label {
    font-size: 10px;
    color: #667062;
    letter-spacing: 0.04em;
  }
  .icon {
    width: 48px;
    height: 48px;
    border-radius: 14px;
    display: grid;
    place-items: center;
    background: #fff;
    color: #4e6941;
    border: 1px solid #e0e7d8;
  }
  h2 {
    margin: 26px 0 10px;
    font:
      600 24px 'Manrope',
      sans-serif;
    letter-spacing: -0.04em;
  }
  p {
    margin: 0;
    font-size: 13px;
    color: #667062;
    line-height: 1.8;
  }
  ul {
    margin: 22px 0 30px;
    padding: 0;
    list-style: none;
    display: grid;
    gap: 11px;
    font-size: 12px;
    color: #4b5d43;
  }
  li {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  li svg {
    flex-shrink: 0;
  }
  .portal-actions {
    margin-top: auto;
    display: grid;
    gap: 10px;
  }
  button {
    min-height: 46px;
    width: 100%;
    border-radius: 10px;
    font-size: 12px;
    padding: 10px 12px;
    line-height: 1.6;
  }
  @media (max-width: 400px) {
    padding: 22px;
  }
`;
export const PortalJourney = styled.section`
  display: flex;
  align-items: center;
  gap: 28px;
  justify-content: space-between;
  padding: 26px 30px;
  margin-top: 30px;
  background: #233f32;
  color: #eef3e5;
  border-radius: 18px;
  .journey-copy {
    max-width: 360px;
  }
  b {
    font-weight: 600;
    font-size: 14px;
  }
  p {
    margin: 8px 0 0;
    color: #c1cfb5;
    font-size: 12px;
    line-height: 1.7;
  }
  ol {
    display: flex;
    gap: 24px;
    list-style: none;
    padding: 0;
    margin: 0;
  }
  li {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    color: #e1ecb5;
  }
  svg {
    flex-shrink: 0;
  }
  @media (max-width: 1000px) {
    flex-direction: column;
    align-items: flex-start;
    .journey-copy {
      max-width: none;
    }
  }
  @media (max-width: 600px) {
    padding: 25px;
    ol {
      flex-direction: column;
      gap: 18px;
    }
  }
`;
