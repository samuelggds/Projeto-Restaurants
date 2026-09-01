import styled from 'styled-components';

export const Root = styled.section`
  display: grid;
  gap: 20px;

  button,
  input {
    font: inherit;
  }

  .hero {
    position: relative;
    overflow: hidden;
    min-height: 176px;
    border-radius: 22px;
    padding: 28px;
    color: #fff;
    background:
      radial-gradient(circle at 90% 12%, rgba(255, 255, 255, 0.13), transparent 30%),
      linear-gradient(135deg, #172325 0%, #163f35 58%, #257a51 100%);
    box-shadow: 0 18px 44px rgba(21, 58, 48, 0.18);
  }

  .hero::after {
    content: '';
    position: absolute;
    right: -44px;
    bottom: -94px;
    width: 230px;
    height: 230px;
    border: 26px solid rgba(255, 255, 255, 0.06);
    border-radius: 50%;
  }

  .hero-copy {
    position: relative;
    z-index: 1;
    max-width: 650px;
  }

  .eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    margin-bottom: 12px;
    color: #a9efc5;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .hero h2 {
    margin: 0 0 9px;
    font-size: clamp(23px, 3vw, 31px);
  }

  .hero p {
    max-width: 620px;
    margin: 0;
    color: rgba(255, 255, 255, 0.74);
    font-size: 13px;
    line-height: 1.65;
  }

  .hero-status {
    position: relative;
    z-index: 1;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 21px;
  }

  .status-pill {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    min-height: 30px;
    border: 1px solid rgba(255, 255, 255, 0.13);
    border-radius: 999px;
    padding: 0 11px;
    color: rgba(255, 255, 255, 0.79);
    background: rgba(5, 16, 15, 0.2);
    font-size: 10px;
    font-weight: 700;
  }

  .status-pill.online {
    color: #bcf5ce;
    background: rgba(29, 117, 73, 0.3);
  }

  .status-pill .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: currentColor;
  }

  .grid {
    display: grid;
    grid-template-columns: minmax(0, 1.35fr) minmax(280px, 0.65fr);
    gap: 18px;
    align-items: start;
  }

  .card {
    border: 1px solid #e7e0d8;
    border-radius: 18px;
    padding: 24px;
    background: #fff;
    box-shadow: 0 10px 32px rgba(50, 36, 25, 0.05);
  }

  .card-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
    margin-bottom: 20px;
  }

  .card-header h3,
  .credential h3 {
    margin: 0 0 5px;
    font-size: 17px;
  }

  .card-header p,
  .credential p {
    margin: 0;
    color: #746d67;
    font-size: 11px;
    line-height: 1.5;
  }

  .switch {
    flex: 0 0 auto;
    position: relative;
    width: 46px;
    height: 26px;
  }

  .switch input {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
  }

  .switch span {
    position: absolute;
    inset: 0;
    border-radius: 999px;
    background: #d8d4cf;
    transition: background 170ms ease;
  }

  .switch span::after {
    content: '';
    position: absolute;
    top: 4px;
    left: 4px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 2px 7px rgba(0, 0, 0, 0.18);
    transition: transform 170ms ease;
  }

  .switch input:checked + span {
    background: var(--a);
  }

  .switch input:checked + span::after {
    transform: translateX(20px);
  }

  .switch input:focus-visible + span {
    outline: 3px solid color-mix(in srgb, var(--a) 25%, transparent);
    outline-offset: 2px;
  }

  .configuration {
    display: grid;
    gap: 20px;
    transition: opacity 180ms ease;
  }

  fieldset {
    min-width: 0;
    margin: 0;
    border: 0;
    padding: 0;
  }

  .configuration.disabled {
    opacity: 0.46;
  }

  .toggle-line {
    display: flex;
    justify-content: space-between;
    gap: 18px;
    padding: 15px 0;
    border-top: 1px solid #eee8e1;
    border-bottom: 1px solid #eee8e1;
  }

  .toggle-line b,
  .field-title {
    display: block;
    margin-bottom: 4px;
    font-size: 12px;
  }

  .toggle-line small,
  .field-help {
    display: block;
    color: #7b746e;
    font-size: 10px;
    line-height: 1.5;
  }

  .choice-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    margin-top: 10px;
  }

  .choice {
    position: relative;
    display: grid;
    gap: 5px;
    min-height: 82px;
    border: 1px solid #e5ddd5;
    border-radius: 13px;
    padding: 14px 14px 14px 39px;
    background: #fcfbf9;
    transition:
      border-color 160ms ease,
      background 160ms ease,
      transform 160ms ease;
  }

  .choice:hover:not(.disabled) {
    transform: translateY(-1px);
    border-color: #cfc3b8;
  }

  .choice.selected {
    border-color: color-mix(in srgb, var(--a) 54%, #fff);
    background: color-mix(in srgb, var(--a) 6%, white);
  }

  .choice input {
    position: absolute;
    top: 16px;
    left: 15px;
    accent-color: var(--a);
  }

  .choice b {
    font-size: 11px;
  }

  .choice small {
    color: #77706a;
    font-size: 9px;
    line-height: 1.45;
  }

  .compact-grid {
    display: grid;
    grid-template-columns: 1fr 150px;
    gap: 16px;
    align-items: end;
  }

  .copies input,
  .credential-row input,
  .device-name input {
    width: 100%;
    height: 43px;
    border: 1px solid #dcd3ca;
    border-radius: 9px;
    padding: 0 12px;
    color: #2b2825;
    background: #fff;
    outline: none;
  }

  .copies input:focus,
  .credential-row input:focus,
  .device-name input:focus {
    border-color: var(--a);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--a) 11%, transparent);
  }

  .warning {
    display: flex;
    gap: 10px;
    border: 1px solid #efd7a7;
    border-radius: 11px;
    padding: 12px;
    color: #71511a;
    background: #fffaf0;
    font-size: 10px;
    line-height: 1.5;
  }

  .warning svg {
    flex: 0 0 auto;
    width: 17px;
  }

  .footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 12px;
    padding-top: 4px;
  }

  .dirty {
    margin-right: auto;
    color: #97641e;
    font-size: 10px;
    font-weight: 700;
  }

  .primary,
  .secondary,
  .danger,
  .copy {
    min-height: 42px;
    border-radius: 9px;
    padding: 0 15px;
    font-weight: 750;
    font-size: 11px;
    transition:
      transform 150ms ease,
      filter 150ms ease,
      box-shadow 150ms ease;
  }

  .primary {
    border: 0;
    color: #fff;
    background: var(--a);
    box-shadow: 0 7px 18px color-mix(in srgb, var(--a) 20%, transparent);
  }

  .secondary,
  .copy {
    border: 1px solid #ddd4cb;
    color: #35302c;
    background: #fff;
  }

  .danger {
    border: 1px solid #e8c1bc;
    color: #a63b2c;
    background: #fff7f5;
  }

  .primary:hover:not(:disabled),
  .secondary:hover:not(:disabled),
  .danger:hover:not(:disabled),
  .copy:hover:not(:disabled) {
    transform: translateY(-1px);
    filter: brightness(0.98);
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  .agent-card {
    display: grid;
    gap: 16px;
  }

  .agent-state {
    display: flex;
    align-items: center;
    gap: 12px;
    border-radius: 13px;
    padding: 14px;
    background: #f5f4f1;
  }

  .agent-state.online {
    color: #17603b;
    background: #edf9f2;
  }

  .agent-icon {
    width: 38px;
    height: 38px;
    border-radius: 11px;
    display: grid;
    place-items: center;
    background: #fff;
    box-shadow: 0 5px 14px rgba(35, 32, 29, 0.06);
  }

  .agent-icon svg {
    width: 18px;
  }

  .agent-state div:last-child {
    display: grid;
    gap: 2px;
  }

  .agent-state b {
    font-size: 11px;
  }

  .agent-state small {
    color: #756f69;
    font-size: 9px;
  }

  .facts {
    display: grid;
    gap: 10px;
    margin: 0;
  }

  .facts div {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding-bottom: 9px;
    border-bottom: 1px solid #eee8e1;
  }

  .facts dt {
    color: #77716b;
    font-size: 10px;
  }

  .facts dd {
    margin: 0;
    max-width: 170px;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 10px;
    font-weight: 700;
    white-space: nowrap;
  }

  .agent-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 9px;
  }

  .agent-actions button {
    width: 100%;
  }

  .device-name {
    display: grid;
    gap: 6px;
  }

  .device-name label {
    font-size: 10px;
    font-weight: 700;
  }

  .credential {
    border: 1px solid #b9dfc7;
    border-radius: 16px;
    padding: 20px;
    background: #f2fbf5;
  }

  .credential-head {
    display: flex;
    align-items: flex-start;
    gap: 11px;
  }

  .credential-head svg {
    flex: 0 0 auto;
    color: #23794b;
  }

  .credential-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 8px;
    margin-top: 14px;
  }

  .credential-row input {
    font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
    font-size: 10px;
  }

  .credential-note {
    display: block;
    margin-top: 10px;
    color: #496653;
    font-size: 9px;
    line-height: 1.45;
  }

  .feedback,
  .load-state {
    border-radius: 12px;
    padding: 13px 15px;
    font-size: 11px;
    line-height: 1.5;
  }

  .feedback.success {
    border: 1px solid #bae1c7;
    color: #19603b;
    background: #effaf3;
  }

  .feedback.error,
  .load-state.error {
    border: 1px solid #edc1bc;
    color: #8e3128;
    background: #fff4f2;
  }

  .jobs-list {
    display: grid;
  }

  .job {
    min-height: 62px;
    display: grid;
    grid-template-columns: 90px minmax(0, 1fr) 100px auto;
    align-items: center;
    gap: 14px;
    border-top: 1px solid #eee8e1;
    padding: 10px 0;
  }

  .job-status {
    width: fit-content;
    border-radius: 999px;
    padding: 5px 8px;
    color: #645d56;
    background: #f0eeeb;
    font-size: 9px;
    font-weight: 800;
  }

  .job-status.pending,
  .job-status.processing {
    color: #875b14;
    background: #fff3db;
  }

  .job-status.printed {
    color: #1c683f;
    background: #eaf8ef;
  }

  .job-status.failed {
    color: #9d3228;
    background: #fff0ed;
  }

  .job-identity {
    min-width: 0;
    display: grid;
    gap: 3px;
  }

  .job-identity b {
    font-size: 11px;
  }

  .job-identity small,
  .job-attempts,
  .jobs-empty {
    color: #77716b;
    font-size: 9px;
  }

  .jobs-empty {
    border: 1px dashed #ddd4cb;
    border-radius: 11px;
    padding: 22px;
    text-align: center;
  }

  .load-state {
    min-height: 160px;
    display: grid;
    place-items: center;
    color: #706a64;
    background: #fff;
  }

  @media (max-width: 900px) {
    .grid {
      grid-template-columns: 1fr;
    }

    .job {
      grid-template-columns: 90px minmax(0, 1fr) auto;
    }

    .job-attempts {
      display: none;
    }
  }

  @media (max-width: 580px) {
    gap: 14px;

    .hero,
    .card,
    .credential {
      padding: 18px 15px;
      border-radius: 15px;
    }

    .choice-grid,
    .compact-grid,
    .agent-actions,
    .credential-row {
      grid-template-columns: 1fr;
    }

    .job {
      grid-template-columns: 1fr;
      gap: 7px;
    }

    .footer {
      align-items: stretch;
      flex-direction: column;
    }

    .dirty {
      margin: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      scroll-behavior: auto !important;
      transition-duration: 0.01ms !important;
    }
  }
`;
