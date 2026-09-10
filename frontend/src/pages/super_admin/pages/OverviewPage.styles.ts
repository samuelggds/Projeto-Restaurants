import styled from 'styled-components';

export const Introduction = styled.section`
  position: relative;
  isolation: isolate;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 28px;
  min-width: 0;
  padding: 30px 34px;
  border: 1px solid #355344;
  border-radius: 22px;
  background: #233f32;
  color: #fff;

  &::before {
    content: '';
    position: absolute;
    z-index: -1;
    top: -190px;
    right: -90px;
    width: 420px;
    height: 420px;
    border: 1px solid #dfeabe16;
    border-radius: 50%;
    box-shadow:
      0 0 0 50px #dfeabe08,
      0 0 0 100px #dfeabe05;
    pointer-events: none;
  }

  .introduction-copy {
    min-width: 0;
    max-width: 560px;
  }

  .eyebrow {
    display: block;
    margin-bottom: 14px;
    color: #dce8be;
    font-size: 10px;
    font-weight: 750;
    line-height: 1.5;
    letter-spacing: 0.13em;
    text-transform: uppercase;
  }

  h2 {
    margin: 0;
    color: #fff;
    font-size: clamp(23px, 2.3vw, 32px);
    font-weight: 600;
    line-height: 1.2;
    letter-spacing: -0.05em;
    text-wrap: balance;
  }

  p {
    margin: 12px 0 0;
    color: #d2ddd5;
    font-size: 13px;
    line-height: 1.7;
  }

  .portfolio {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-shrink: 0;
    padding: 4px 0 4px 28px;
    border-left: 1px solid #d7e7da35;
  }

  .portfolio svg {
    flex-shrink: 0;
    color: #dce8be;
  }

  .portfolio div {
    display: grid;
    gap: 5px;
  }

  .portfolio strong {
    font-size: 36px;
    font-weight: 600;
    line-height: 1;
    letter-spacing: -0.05em;
    font-variant-numeric: tabular-nums;
    overflow-wrap: anywhere;
  }

  .portfolio span {
    color: #d2ddd5;
    font-size: 11px;
    line-height: 1.5;
  }

  @media (max-width: 1080px) {
    align-items: flex-start;
    flex-direction: column;
    gap: 22px;

    .portfolio {
      width: 100%;
      flex-shrink: 1;
      border-left: 0;
      border-top: 1px solid #d7e7da35;
      padding: 18px 0 0;
    }

    .portfolio div {
      display: flex;
      align-items: baseline;
      flex-wrap: wrap;
      gap: 7px 12px;
      min-width: 0;
    }

    .portfolio strong {
      font-size: 28px;
    }
  }

  @media (max-width: 520px) {
    padding: 23px 20px;
    border-radius: 18px;

    .eyebrow {
      font-size: 9px;
      letter-spacing: 0.1em;
    }
  }
`;

export const SectionLabel = styled.span`
  display: block;
  margin-bottom: 7px;
  color: var(--muted);
  font-size: 10px;
  font-weight: 750;
  letter-spacing: 0.09em;
  line-height: 1.4;
  text-transform: uppercase;
`;

export const SectionIcon = styled.span`
  display: grid;
  place-items: center;
  flex: 0 0 40px;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: #edf1e8;
  color: var(--brand);

  @media (max-width: 380px) {
    flex-basis: 32px;
    width: 32px;
    height: 32px;
    border-radius: 10px;
  }
`;

export const HealthList = styled.div`
  display: grid;
  margin-top: 20px;
`;

export const HealthItem = styled.article`
  --status-color: #79847d;
  display: grid;
  grid-template-columns: 8px minmax(0, 1fr) auto;
  align-items: center;
  gap: 13px;
  padding: 14px 0;
  border-bottom: 1px solid var(--border);

  &:last-child {
    border-bottom: 0;
    padding-bottom: 0;
  }

  &[data-tone='active'] {
    --status-color: #3a7550;
  }

  &[data-tone='trial'] {
    --status-color: #56789a;
  }

  &[data-tone='overdue'] {
    --status-color: #a3752c;
  }

  &[data-tone='blocked'] {
    --status-color: #b25b53;
  }

  .status-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--status-color);
  }

  .info {
    display: grid;
    min-width: 0;
    gap: 4px;
  }

  .info b {
    font-size: 12px;
    font-weight: 700;
    line-height: 1.4;
  }

  .info span {
    color: var(--muted);
    font-size: 11px;
    line-height: 1.45;
  }

  strong {
    min-width: 35px;
    padding: 5px 9px;
    border-radius: 8px;
    background: #f2f4ef;
    color: var(--ink);
    text-align: center;
    font-size: 14px;
    font-weight: 650;
    font-variant-numeric: tabular-nums;
  }
`;
