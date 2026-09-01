import styled from 'styled-components';

export const Root = styled.section`
  display: grid;
  gap: 16px;
  max-width: 1060px;
  margin: 0 auto;

  button,
  input {
    font: inherit;
  }

  .setup-intro {
    display: flex;
    align-items: flex-start;
    gap: 16px;
    padding: 4px 2px 2px;
  }

  .intro-icon {
    flex: 0 0 auto;
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border-radius: 12px;
    color: var(--a);
    background: color-mix(in srgb, var(--a) 9%, white);
  }

  .intro-icon svg {
    width: 21px;
  }

  .eyebrow {
    display: block;
    margin-bottom: 5px;
    color: var(--a);
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.11em;
    text-transform: uppercase;
  }

  .setup-intro h2 {
    margin: 0 0 6px;
    color: #28231f;
    font-size: clamp(20px, 2.5vw, 27px);
    letter-spacing: -0.025em;
  }

  .setup-intro p {
    max-width: 760px;
    margin: 0;
    color: #726a63;
    font-size: 12px;
    line-height: 1.6;
  }

  .status-summary {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    border: 1px solid #e8e1da;
    border-radius: 13px;
    padding: 10px;
    background: #fff;
  }

  .status-item {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    min-height: 29px;
    border-radius: 8px;
    padding: 0 10px;
    color: #68615b;
    background: #f5f3f0;
    font-size: 10px;
    font-weight: 700;
  }

  .status-item.success {
    color: #1d6842;
    background: #edf8f1;
  }

  .status-item.attention {
    color: #8a5b17;
    background: #fff5e4;
  }

  .status-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: currentColor;
  }

  .next-action {
    display: flex;
    align-items: center;
    gap: 12px;
    border: 1px solid #eadcc9;
    border-radius: 13px;
    padding: 13px 15px;
    color: #6e4a1d;
    background: #fffbf4;
  }

  .next-action.complete {
    border-color: #c9e5d3;
    color: #1c6740;
    background: #f2faf5;
  }

  .next-action > span {
    flex: 0 0 auto;
    display: grid;
    place-items: center;
    width: 31px;
    height: 31px;
    border-radius: 9px;
    background: rgba(255, 255, 255, 0.85);
  }

  .next-action svg {
    width: 17px;
  }

  .next-number {
    font-size: 18px;
    font-weight: 800;
  }

  .next-action div {
    display: grid;
    gap: 2px;
  }

  .next-action b {
    font-size: 11px;
  }

  .next-action p {
    margin: 0;
    color: #756b61;
    font-size: 10px;
    line-height: 1.45;
  }

  .setup-flow {
    display: grid;
    gap: 12px;
  }

  .step-card,
  .history {
    border: 1px solid #e5ded7;
    border-radius: 16px;
    background: #fff;
    box-shadow: 0 7px 22px rgba(48, 35, 24, 0.045);
  }

  .step-card {
    padding: 20px;
  }

  .step-card.locked {
    background: #fcfbfa;
    box-shadow: none;
  }

  .step-header {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 12px;
  }

  .step-number {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    border-radius: 10px;
    color: var(--a);
    background: color-mix(in srgb, var(--a) 9%, white);
    font-size: 12px;
    font-weight: 850;
  }

  .step-card.locked .step-number {
    color: #8b847e;
    background: #efedea;
  }

  .step-header h3 {
    margin: 0 0 3px;
    color: #2b2723;
    font-size: 15px;
  }

  .step-header p {
    margin: 0;
    color: #77706a;
    font-size: 10px;
    line-height: 1.45;
  }

  .activation-note {
    display: grid;
    gap: 2px;
    margin: 15px 0 0 44px;
    border-left: 3px solid #d7d2cd;
    padding: 8px 12px;
    color: #6f6862;
    background: #f7f5f3;
  }

  .activation-note.active {
    border-color: #5ab27e;
    color: #215f3e;
    background: #f1f9f4;
  }

  .activation-note b {
    font-size: 10px;
  }

  .activation-note span {
    font-size: 9px;
    line-height: 1.45;
  }

  .switch {
    flex: 0 0 auto;
    position: relative;
    width: 46px;
    height: 26px;
    cursor: pointer;
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
    background: #d5d1cd;
    transition: background-color 160ms ease;
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
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.18);
    transition: transform 160ms ease;
    will-change: transform;
  }

  .switch input:checked + span {
    background: var(--a);
  }

  .switch input:checked + span::after {
    transform: translateX(20px);
  }

  .switch input:focus-visible + span {
    outline: 3px solid color-mix(in srgb, var(--a) 24%, transparent);
    outline-offset: 2px;
  }

  .configuration,
  .agent-content {
    display: grid;
    gap: 16px;
    margin-top: 18px;
    padding-top: 18px;
    border-top: 1px solid #eee8e2;
  }

  fieldset {
    min-width: 0;
    margin: 0;
    border: 0;
    padding: 0;
  }

  .toggle-line {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    border: 1px solid #e7e0d8;
    border-radius: 12px;
    padding: 14px;
    background: #fcfbfa;
  }

  .toggle-line div {
    display: grid;
    gap: 3px;
  }

  .toggle-line b,
  .field-title,
  .device-name > span {
    display: block;
    color: #38332e;
    font-size: 11px;
    font-weight: 750;
  }

  .toggle-line small,
  .field-help,
  .copies small,
  .device-name small {
    display: block;
    color: #7b746d;
    font-size: 9px;
    line-height: 1.45;
  }

  .field-help {
    margin-top: 3px;
  }

  .choice-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    margin-top: 9px;
  }

  .choice {
    position: relative;
    display: grid;
    align-content: center;
    gap: 4px;
    min-height: 82px;
    border: 1px solid #e5ded6;
    border-radius: 12px;
    padding: 13px 13px 13px 40px;
    background: #fcfbfa;
    cursor: pointer;
    transition:
      border-color 150ms ease,
      background-color 150ms ease;
  }

  .choice:hover {
    border-color: #cfc4b9;
  }

  .choice.selected {
    border-color: color-mix(in srgb, var(--a) 52%, #fff);
    background: color-mix(in srgb, var(--a) 5%, white);
  }

  .choice input {
    position: absolute;
    top: 17px;
    left: 15px;
    accent-color: var(--a);
  }

  .choice b {
    color: #38332e;
    font-size: 10px;
  }

  .choice small {
    color: #77706a;
    font-size: 9px;
    line-height: 1.45;
  }

  .recommended {
    width: fit-content;
    border-radius: 999px;
    padding: 3px 6px;
    color: #1f6943;
    background: #eaf7ef;
    font-size: 8px;
    font-weight: 800;
    text-transform: uppercase;
  }

  .choice.compact {
    min-height: 68px;
  }

  .warning {
    display: flex;
    gap: 10px;
    border: 1px solid #efd8aa;
    border-radius: 11px;
    padding: 11px 12px;
    color: #75541c;
    background: #fffaf0;
    font-size: 9px;
    line-height: 1.5;
  }

  .warning svg {
    flex: 0 0 auto;
    width: 16px;
  }

  .print-format {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 170px;
    align-items: end;
    gap: 15px;
  }

  .copies {
    display: grid;
    gap: 4px;
  }

  .copies input,
  .credential-row input,
  .device-name input {
    width: 100%;
    height: 42px;
    border: 1px solid #dcd4cc;
    border-radius: 9px;
    padding: 0 12px;
    color: #302c28;
    background: #fff;
    outline: none;
  }

  .copies input:focus,
  .credential-row input:focus,
  .device-name input:focus {
    border-color: var(--a);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--a) 10%, transparent);
  }

  .locked-message {
    display: grid;
    gap: 3px;
    margin: 16px 0 0 44px;
    border: 1px dashed #dcd5ce;
    border-radius: 11px;
    padding: 13px;
    color: #77706a;
    background: #f8f6f4;
  }

  .locked-message b {
    font-size: 10px;
  }

  .locked-message span {
    font-size: 9px;
    line-height: 1.45;
  }

  .save-strip {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    margin: 18px 0 0 44px;
    border-radius: 11px;
    padding: 11px 13px;
    color: #306344;
    background: #f1f8f3;
  }

  .save-strip.pending {
    color: #79511d;
    background: #fff8eb;
  }

  .save-strip div {
    display: grid;
    gap: 2px;
  }

  .save-strip b {
    font-size: 10px;
  }

  .save-strip span {
    color: #756d65;
    font-size: 9px;
    line-height: 1.4;
  }

  .primary,
  .secondary,
  .danger,
  .copy,
  .icon-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    min-height: 40px;
    border-radius: 9px;
    padding: 0 14px;
    font-size: 10px;
    font-weight: 750;
    cursor: pointer;
    transition:
      transform 140ms ease,
      border-color 140ms ease,
      background-color 140ms ease;
  }

  .primary {
    border: 1px solid var(--a);
    color: #fff;
    background: var(--a);
  }

  .secondary,
  .copy,
  .icon-button {
    border: 1px solid #ded6ce;
    color: #37322e;
    background: #fff;
  }

  .danger {
    border: 1px solid #e8c5c0;
    color: #a13c30;
    background: #fff8f6;
  }

  .icon-button {
    width: 40px;
    padding: 0;
  }

  .primary:hover:not(:disabled),
  .secondary:hover:not(:disabled),
  .danger:hover:not(:disabled),
  .copy:hover:not(:disabled),
  .icon-button:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  .agent-state {
    display: flex;
    align-items: center;
    gap: 11px;
    border-radius: 12px;
    padding: 13px;
    color: #625d57;
    background: #f4f2ef;
  }

  .agent-state.online {
    color: #1a673f;
    background: #edf8f1;
  }

  .agent-icon {
    flex: 0 0 auto;
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: #fff;
  }

  .agent-icon svg {
    width: 17px;
  }

  .agent-state div {
    display: grid;
    gap: 2px;
  }

  .agent-state b {
    font-size: 10px;
  }

  .agent-state small {
    color: #756f69;
    font-size: 9px;
  }

  .pairing-guide {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .pairing-guide li {
    display: flex;
    align-items: flex-start;
    gap: 9px;
    border: 1px solid #e8e1da;
    border-radius: 11px;
    padding: 11px;
  }

  .pairing-guide li > span {
    flex: 0 0 auto;
    display: grid;
    place-items: center;
    width: 23px;
    height: 23px;
    border-radius: 7px;
    color: var(--a);
    background: color-mix(in srgb, var(--a) 8%, white);
    font-size: 9px;
    font-weight: 800;
  }

  .pairing-guide li div {
    display: grid;
    gap: 3px;
  }

  .pairing-guide b {
    font-size: 9px;
  }

  .pairing-guide small {
    color: #7a736c;
    font-size: 8px;
    line-height: 1.45;
  }

  .agent-setup {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: end;
    gap: 10px;
  }

  .device-name {
    display: grid;
    gap: 4px;
  }

  .credential {
    border: 1px solid #bfe0cb;
    border-radius: 13px;
    padding: 15px;
    background: #f2faf5;
  }

  .credential-head {
    display: flex;
    align-items: flex-start;
    gap: 10px;
  }

  .credential-head > svg {
    flex: 0 0 auto;
    width: 19px;
    color: #24784c;
  }

  .credential h4 {
    margin: 0 0 3px;
    font-size: 11px;
  }

  .credential p {
    margin: 0;
    color: #5e6d63;
    font-size: 9px;
    line-height: 1.45;
  }

  .credential-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 8px;
    margin-top: 12px;
  }

  .credential-row input {
    font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
    font-size: 9px;
  }

  .credential-note {
    display: block;
    margin-top: 9px;
    color: #4f6757;
    font-size: 8px;
    line-height: 1.45;
  }

  .agent-details {
    display: grid;
    gap: 12px;
    border-top: 1px solid #eee8e2;
    padding-top: 15px;
  }

  .facts {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
    margin: 0;
  }

  .facts div {
    min-width: 0;
    display: grid;
    gap: 4px;
    border-radius: 10px;
    padding: 10px;
    background: #f7f5f3;
  }

  .facts dt {
    color: #78716a;
    font-size: 8px;
  }

  .facts dd {
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 9px;
    font-weight: 750;
    white-space: nowrap;
  }

  .agent-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .feedback,
  .load-state {
    border-radius: 12px;
    padding: 12px 14px;
    font-size: 10px;
    line-height: 1.5;
  }

  .feedback.success {
    border: 1px solid #bae0c7;
    color: #19603b;
    background: #eff9f2;
  }

  .feedback.error,
  .load-state.error {
    border: 1px solid #edc4bf;
    color: #8e3128;
    background: #fff5f3;
  }

  .history {
    overflow: hidden;
  }

  .history summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 17px 20px;
    cursor: pointer;
    list-style: none;
  }

  .history summary::-webkit-details-marker {
    display: none;
  }

  .history summary h3 {
    margin: 0 0 3px;
    font-size: 13px;
  }

  .history summary p {
    margin: 0;
    color: #77706a;
    font-size: 9px;
  }

  .history summary > span {
    flex: 0 0 auto;
    color: #77706a;
    font-size: 9px;
    font-weight: 700;
  }

  .jobs-list,
  .jobs-empty {
    border-top: 1px solid #eee8e2;
    margin: 0 20px;
  }

  .job {
    min-height: 61px;
    display: grid;
    grid-template-columns: 90px minmax(0, 1fr) 90px auto;
    align-items: center;
    gap: 12px;
    border-bottom: 1px solid #eee8e2;
    padding: 9px 0;
  }

  .job:last-child {
    border-bottom: 0;
  }

  .job-status {
    width: fit-content;
    border-radius: 999px;
    padding: 5px 8px;
    color: #645d56;
    background: #f0eeeb;
    font-size: 8px;
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
    font-size: 10px;
  }

  .job-identity small,
  .job-attempts,
  .jobs-empty {
    color: #77716b;
    font-size: 8px;
  }

  .jobs-empty {
    padding: 20px 0;
    text-align: center;
  }

  .load-state {
    min-height: 150px;
    display: grid;
    place-items: center;
    color: #706a64;
    background: #fff;
  }

  @media (max-width: 760px) {
    .pairing-guide,
    .facts {
      grid-template-columns: 1fr;
    }

    .print-format {
      grid-template-columns: 1fr 130px;
    }

    .job {
      grid-template-columns: 82px minmax(0, 1fr) auto;
    }

    .job-attempts {
      display: none;
    }
  }

  @media (max-width: 560px) {
    gap: 12px;

    .setup-intro {
      gap: 11px;
    }

    .intro-icon {
      width: 38px;
      height: 38px;
    }

    .step-card {
      border-radius: 14px;
      padding: 15px;
    }

    .step-header {
      grid-template-columns: auto minmax(0, 1fr);
    }

    .step-header > .switch,
    .step-header > .icon-button {
      grid-column: 2;
      justify-self: start;
    }

    .activation-note,
    .locked-message,
    .save-strip {
      margin-left: 0;
    }

    .choice-grid,
    .print-format,
    .agent-setup,
    .credential-row {
      grid-template-columns: 1fr;
    }

    .save-strip,
    .history summary {
      align-items: flex-start;
      flex-direction: column;
    }

    .save-strip .primary {
      width: 100%;
    }

    .job {
      grid-template-columns: 1fr;
      gap: 6px;
    }

    .jobs-list,
    .jobs-empty {
      margin: 0 15px;
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
