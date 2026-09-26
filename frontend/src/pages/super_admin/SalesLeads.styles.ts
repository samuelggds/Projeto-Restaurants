import styled from 'styled-components';

export const Inbox = styled.div`
  display: grid;
  gap: 24px;
  min-width: 0;
`;

export const Filters = styled.form`
  display: flex;
  align-items: end;
  flex-wrap: wrap;
  gap: 16px 12px;
  min-width: 0;
  padding: 20px;
  border: 1px solid var(--border, #dfe5dd);
  border-radius: 18px;
  background: var(--surface, #fff);
  box-shadow: 0 3px 14px #233f3204;
  label {
    display: grid;
    gap: 8px;
    color: var(--ink, #1c3028);
    font-size: 12px;
    font-weight: 750;
    min-width: 0;
  }
  label:first-child {
    flex: 1 1 280px;
  }
  input,
  select {
    box-sizing: border-box;
    min-width: 0;
    width: 100%;
    min-height: 46px;
    border: 1px solid var(--border, #dfe5dd);
    border-radius: 12px;
    padding: 0 13px;
    background: #fbfcf9;
    color: var(--ink, #1c3028);
    font-family: 'Manrope', ui-sans-serif, system-ui, sans-serif;
    font-size: 13px;
    font-weight: 500;
    line-height: 1.5;
  }
  input::placeholder {
    color: #738075;
    opacity: 1;
  }
  input:focus-visible,
  select:focus-visible {
    outline: 3px solid var(--focus, #63836b);
    outline-offset: 3px;
    border-color: var(--brand, #233f32);
    background: #fff;
  }
  @media (max-width: 550px) {
    padding: 18px 16px;
    label {
      flex: 1 1 100%;
    }
    input,
    select {
      font-size: 16px;
    }
    button {
      flex: 1 1 auto;
    }
  }
`;

export const Summary = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px 16px;
  color: var(--muted, #637169);
  font-size: 12px;
  line-height: 1.6;
  b {
    color: var(--ink, #1c3028);
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }
`;

export const List = styled.div`
  display: grid;
  gap: 14px;
  min-width: 0;
`;

export const LeadCard = styled.article`
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(130px, 1fr) minmax(140px, 1fr) auto;
  align-items: center;
  gap: 22px;
  min-width: 0;
  border: 1px solid var(--border, #dfe5dd);
  border-radius: 18px;
  background: var(--surface, #fff);
  padding: 24px;
  box-shadow: 0 3px 14px #233f3204;
  .identity,
  .interest,
  .progress {
    display: grid;
    gap: 7px;
    min-width: 0;
    justify-items: start;
  }
  .identity {
    padding-left: 14px;
    border-left: 3px solid #b8cba7;
  }
  h3 {
    color: var(--ink, #1c3028);
    font-size: 16px;
    font-weight: 750;
    line-height: 1.4;
    letter-spacing: -0.025em;
    margin: 0;
    overflow-wrap: anywhere;
  }
  p,
  time,
  small {
    margin: 0;
    color: var(--muted, #637169);
    font-size: 12px;
    line-height: 1.6;
    overflow-wrap: anywhere;
  }
  .identity p:first-of-type {
    color: #41594a;
    font-weight: 650;
  }
  time {
    font-size: 11px;
    font-variant-numeric: tabular-nums;
  }
  .email-state {
    display: inline-flex;
    align-items: flex-start;
    gap: 6px;
    color: var(--muted, #637169);
    font-size: 11px;
    line-height: 1.55;
    overflow-wrap: anywhere;
    svg {
      flex-shrink: 0;
      margin-top: 2px;
    }
  }
  .email-state.failed {
    color: #a4382a;
  }
  &:focus-within {
    border-color: #a2b59c;
  }
  @media (max-width: 1180px) {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    button {
      justify-self: start;
    }
  }
  @media (max-width: 540px) {
    grid-template-columns: minmax(0, 1fr);
    gap: 18px;
    padding: 20px 16px;
    .interest {
      padding-top: 16px;
      border-top: 1px solid #e9ede5;
    }
    button {
      width: 100%;
    }
  }
`;

export const Pagination = styled.nav`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  min-width: 0;
  padding-top: 20px;
  color: var(--muted, #637169);
  font-size: 12px;
  line-height: 1.6;
  font-variant-numeric: tabular-nums;
  flex-wrap: wrap;
  @media (max-width: 540px) {
    justify-content: center;
    gap: 10px;
  }
`;

export const DetailGrid = styled.dl`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 22px 24px;
  margin: 26px 0;
  min-width: 0;
  font-family: 'Manrope', ui-sans-serif, system-ui, sans-serif;
  > div {
    min-width: 0;
  }
  dt {
    color: var(--muted, #637169);
    font-size: 11px;
    line-height: 1.5;
    margin-bottom: 7px;
  }
  dd {
    margin: 0;
    color: var(--ink, #1c3028);
    font-size: 13px;
    font-weight: 600;
    line-height: 1.7;
    overflow-wrap: anywhere;
  }
  .wide {
    grid-column: 1 / -1;
  }
  .message {
    background: #f5f7f0;
    border: 1px solid var(--border, #dfe5dd);
    border-radius: 14px;
    padding: 17px;
    font-weight: 500;
    white-space: pre-wrap;
  }
  @media (max-width: 500px) {
    grid-template-columns: minmax(0, 1fr);
    gap: 18px;
  }
`;

export const StatusForm = styled.form`
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: 14px;
  min-width: 0;
  padding: 24px 0;
  border-top: 1px solid var(--border, #dfe5dd);
  label {
    display: grid;
    gap: 8px;
    min-width: 0;
    color: var(--ink, #1c3028);
    font-size: 12px;
    font-weight: 750;
    line-height: 1.5;
    flex: 1 1 180px;
  }
  select {
    box-sizing: border-box;
    min-width: 0;
    width: 100%;
    min-height: 46px;
    padding: 0 13px;
    border: 1px solid var(--border, #dfe5dd);
    border-radius: 12px;
    background: #fbfcf9;
    color: var(--ink, #1c3028);
    font-family: 'Manrope', ui-sans-serif, system-ui, sans-serif;
    font-size: 13px;
    line-height: 1.5;
  }
  select:focus-visible {
    outline: 3px solid var(--focus, #63836b);
    outline-offset: 3px;
    border-color: var(--brand, #233f32);
  }
  select:disabled {
    background: #f5f6f2;
    color: var(--muted, #637169);
  }
  @media (max-width: 500px) {
    select {
      font-size: 16px;
    }
    button {
      width: 100%;
    }
  }
`;


export const WhatsappPanel = styled.section`
  display: grid;
  gap: 18px;
  min-width: 0;

  textarea {
    box-sizing: border-box;
    width: 100%;
    min-width: 0;
    resize: vertical;
    border: 1px solid var(--border, #dfe5dd);
    border-radius: 12px;
    padding: 12px 13px;
    background: #fff;
    color: var(--ink, #1c3028);
    font: inherit;
    line-height: 1.55;
  }

  textarea:focus-visible {
    outline: 3px solid var(--focus, #63836b);
    outline-offset: 3px;
    border-color: var(--brand, #233f32);
  }
`;

export const WhatsappGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
  min-width: 0;

  @media (max-width: 850px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

export const ConnectionState = styled.div<{ $connected: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid ({ $connected }) => ($connected ? '#bcd8c1' : '#dfe5dd');
  border-radius: 14px;
  padding: 14px;
  background: ({ $connected }) => ($connected ? '#f0f8f1' : '#f8faf7');

  > svg {
    width: 22px;
    height: 22px;
    color: ({ $connected }) => ($connected ? '#2f6a3f' : '#738075');
  }

  > span {
    display: grid;
    gap: 2px;
  }

  small,
  em {
    color: var(--muted, #637169);
    font-size: 11px;
    font-style: normal;
  }

  strong {
    color: var(--ink, #1c3028);
    font-size: 14px;
  }
`;

export const QrBox = styled.div`
  display: grid;
  justify-items: center;
  gap: 10px;
  border: 1px dashed #cfd8ca;
  border-radius: 14px;
  padding: 16px;
  background: #fbfcf9;
  text-align: center;

  img {
    width: min(260px, 100%);
    height: auto;
    aspect-ratio: 1;
    object-fit: contain;
    background: #fff;
    border-radius: 10px;
  }

  p {
    margin: 0;
    color: var(--muted, #637169);
    font-size: 12px;
    line-height: 1.6;
  }
`;

export const ScheduleList = styled.div`
  display: grid;
  gap: 12px;

  .schedule-day {
    display: grid;
    grid-template-columns: minmax(170px, 0.55fr) minmax(0, 1.8fr);
    gap: 18px;
    min-width: 0;
    padding: 16px;
    border: 1px solid var(--border, #dfe5dd);
    border-radius: 16px;
    background: #fbfcf9;
    transition:
      border-color 160ms ease,
      background 160ms ease,
      box-shadow 160ms ease;
  }

  .schedule-day.is-enabled {
    border-color: #cfdac9;
    background: #fff;
    box-shadow: 0 2px 10px #233f3205;
  }

  .schedule-day.is-disabled {
    background: #f7f8f5;
  }

  .day-summary {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
    min-width: 0;
    padding-right: 4px;
  }

  .day-summary > div,
  .period-toggle > span {
    display: grid;
    gap: 3px;
    min-width: 0;
  }

  .day-summary strong {
    color: var(--ink, #1c3028);
    font-size: 14px;
    line-height: 1.4;
  }

  .day-summary small,
  .period-toggle small {
    color: var(--muted, #637169);
    font-size: 10px;
    line-height: 1.45;
  }

  .day-switch {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: var(--muted, #637169);
    font-size: 10px;
    font-weight: 750;
    cursor: pointer;
    white-space: nowrap;
  }

  .day-switch input,
  .period-toggle input {
    width: 18px;
    height: 18px;
    margin: 0;
    accent-color: var(--brand, #233f32);
    cursor: pointer;
  }

  .periods {
    display: grid;
    gap: 10px;
    min-width: 0;
  }

  .period {
    display: grid;
    grid-template-columns: minmax(145px, 0.7fr) minmax(260px, 1.3fr);
    align-items: center;
    gap: 18px;
    min-width: 0;
    padding: 12px 14px;
    border: 1px solid #e8ece5;
    border-radius: 13px;
    background: #fff;
  }

  .period.is-disabled {
    background: #f8f9f6;
  }

  .period-toggle {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    color: var(--ink, #1c3028);
    cursor: pointer;
  }

  .period-toggle strong {
    font-size: 12px;
    line-height: 1.4;
  }

  .period-toggle input:disabled,
  .day-switch input:disabled {
    cursor: not-allowed;
  }

  .time-range {
    display: grid;
    grid-template-columns: minmax(105px, 1fr) auto minmax(105px, 1fr);
    align-items: end;
    gap: 10px;
    min-width: 0;
  }

  .time-range label {
    display: grid;
    gap: 5px;
    min-width: 0;
  }

  .time-range label > span {
    color: var(--muted, #637169);
    font-size: 9px;
    font-weight: 750;
    line-height: 1.3;
    text-transform: uppercase;
    letter-spacing: 0.045em;
  }

  .range-separator {
    padding-bottom: 11px;
    color: #98a39a;
    font-size: 14px;
  }

  input[type='time'] {
    box-sizing: border-box;
    min-width: 0;
    width: 100%;
    height: 42px;
    border: 1px solid var(--border, #dfe5dd);
    border-radius: 10px;
    padding: 0 10px;
    background: #fff;
    color: var(--ink, #1c3028);
    font: inherit;
    font-size: 12px;
    font-variant-numeric: tabular-nums;
  }

  input[type='time']:focus-visible {
    outline: 3px solid var(--focus, #63836b);
    outline-offset: 2px;
    border-color: var(--brand, #233f32);
  }

  input:disabled {
    opacity: 0.55;
    background: #f1f3ef;
  }

  @media (max-width: 1020px) {
    .schedule-day {
      grid-template-columns: minmax(150px, 0.5fr) minmax(0, 1.5fr);
    }

    .period {
      grid-template-columns: minmax(130px, 0.6fr) minmax(220px, 1fr);
      gap: 14px;
    }
  }

  @media (max-width: 760px) {
    .schedule-day {
      grid-template-columns: minmax(0, 1fr);
      gap: 14px;
      padding: 14px;
    }

    .day-summary {
      align-items: center;
      padding-bottom: 12px;
      border-bottom: 1px solid #edf0e9;
    }

    .period {
      grid-template-columns: minmax(0, 1fr);
      gap: 12px;
    }
  }

  @media (max-width: 460px) {
    gap: 10px;

    .schedule-day {
      padding: 12px;
      border-radius: 14px;
    }

    .day-summary {
      align-items: flex-start;
      flex-direction: column;
    }

    .day-switch {
      width: 100%;
      justify-content: space-between;
      padding-top: 3px;
    }

    .period {
      padding: 11px;
    }

    .time-range {
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      gap: 8px;
    }

    .range-separator {
      display: none;
    }

    input[type='time'] {
      font-size: 16px;
    }
  }
`;

export const ConversationLayout = styled.div`
  display: grid;
  grid-template-columns: minmax(210px, 0.7fr) minmax(0, 2fr);
  gap: 16px;
  min-width: 0;

  > nav {
    display: grid;
    align-content: start;
    gap: 8px;
    max-height: 560px;
    overflow: auto;
  }

  > nav > button {
    display: grid;
    gap: 3px;
    min-width: 0;
    border: 1px solid var(--border, #dfe5dd);
    border-radius: 12px;
    padding: 11px 12px;
    background: #fbfcf9;
    color: var(--ink, #1c3028);
    text-align: left;
    cursor: pointer;
  }

  > nav > button.active {
    border-color: #9eb499;
    background: #edf4e8;
  }

  > nav small,
  > nav time {
    color: var(--muted, #637169);
    font-size: 10px;
    line-height: 1.5;
  }

  > section {
    min-width: 0;
    border: 1px solid var(--border, #dfe5dd);
    border-radius: 14px;
    overflow: hidden;
    background: #fff;
  }

  @media (max-width: 800px) {
    grid-template-columns: minmax(0, 1fr);

    > nav {
      max-height: 220px;
    }
  }
`;

export const ConversationToolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px;
  border-bottom: 1px solid var(--border, #dfe5dd);
  background: #f8faf7;

  > span {
    display: grid;
    gap: 3px;
  }

  small {
    color: var(--muted, #637169);
    font-size: 11px;
  }

  @media (max-width: 560px) {
    align-items: stretch;
    flex-direction: column;
  }
`;

export const MessageList = styled.div`
  display: grid;
  gap: 10px;
  min-height: 180px;
  max-height: 420px;
  overflow: auto;
  padding: 16px;
  background: #f5f7f2;

  > div {
    width: fit-content;
    max-width: min(82%, 640px);
    border: 1px solid #dfe5dd;
    border-radius: 14px;
    padding: 10px 12px;
    background: #fff;
  }

  > div.outbound {
    justify-self: end;
    border-color: #bed0b7;
    background: #eaf3e5;
  }

  small {
    display: block;
    margin-bottom: 5px;
    color: var(--muted, #637169);
    font-size: 10px;
  }

  p {
    margin: 0;
    color: var(--ink, #1c3028);
    font-size: 12px;
    line-height: 1.6;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
`;

export const ReplyBox = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: 10px;
  padding: 14px;
  border-top: 1px solid var(--border, #dfe5dd);

  @media (max-width: 520px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;
