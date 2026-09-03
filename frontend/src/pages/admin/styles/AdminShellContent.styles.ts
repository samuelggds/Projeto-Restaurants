import styled from 'styled-components';

export const Main = styled.main`
  min-width: 0;
`;

export const Top = styled.header`
  min-height: 154px;
  padding: 27px 34px 20px;
  border-bottom: 1px solid var(--border);
  background: rgba(255, 253, 249, 0.94);
  backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  gap: 15px;
  small {
    font-size: 10px;
    color: var(--a);
    font-weight: 700;
    letter-spacing: 0.04em;
  }
  h1 {
    font-size: 30px;
    margin: 17px 0 7px;
    letter-spacing: -0.035em;
  }
  p {
    margin: 0;
    color: var(--muted);
    line-height: 1.5;
  }
  @media (max-width: 760px) {
    min-height: 112px;
    padding: 14px 12px;
    h1 {
      font-size: 22px;
      margin: 5px 0;
    }
    p {
      font-size: 12px;
    }
  }
`;

export const TopActions = styled.div`
  margin-left: auto;
  display: flex;
  gap: 10px;
  button {
    height: 54px;
    padding: 0 24px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    gap: 9px;
    white-space: nowrap;
    transition:
      transform 220ms cubic-bezier(0.22, 1, 0.36, 1),
      box-shadow 220ms ease,
      filter 160ms ease,
      border-color 180ms ease;
  }
  button:hover {
    transform: translateY(-2px);
  }
  button:active {
    transform: translateY(0) scale(0.99);
  }
  .preview {
    border: 1px solid var(--border);
    background: #fff;
    box-shadow: 0 4px 13px rgba(44, 34, 27, 0.035);
  }
  .preview:hover {
    border-color: #d2c7bd;
    box-shadow: 0 7px 18px rgba(44, 34, 27, 0.06);
  }
  .save {
    border: 0;
    background: var(--a);
    color: #fff;
    box-shadow: 0 8px 22px color-mix(in srgb, var(--a) 24%, transparent);
  }
  .save:hover {
    filter: brightness(0.96);
    box-shadow: 0 11px 26px color-mix(in srgb, var(--a) 32%, transparent);
  }
  @media (max-width: 580px) {
    button {
      width: 44px;
      height: 44px;
      padding: 0;
      justify-content: center;
      font-size: 0;
    }
    .save {
      width: 44px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    button {
      transition: none;
    }
  }
`;

export const Content = styled.div<{ $wide?: boolean }>`
  width: 100%;
  max-width: ${({ $wide }) => ($wide ? '1480px' : '1160px')};
  margin: auto;
  padding: 30px 34px 84px;
  > * {
    animation: admin-content-enter 260ms cubic-bezier(0.22, 0.8, 0.35, 1) both;
  }
  @keyframes admin-content-enter {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  @media (max-width: 820px) {
    padding: 14px 10px calc(96px + env(safe-area-inset-bottom));
  }
  @media (prefers-reduced-motion: reduce) {
    > * {
      animation: none;
    }
  }
`;

export const SettingsMotionFrame = styled.div`
  min-width: 0;
  animation: settings-page-enter 430ms cubic-bezier(0.22, 1, 0.36, 1) both;
  transform-origin: 50% 0;

  > * {
    min-width: 0;
  }

  @keyframes settings-page-enter {
    0% {
      opacity: 0;
      transform: translateY(12px) scale(0.996);
    }
    55% {
      opacity: 1;
    }
    100% {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export const Stack = styled.div`
  display: grid;
  gap: 20px;
  animation: settings-stack-enter 390ms cubic-bezier(0.22, 1, 0.36, 1) both;

  > * {
    animation: settings-card-enter 420ms cubic-bezier(0.22, 1, 0.36, 1) both;
  }
  > :nth-child(2) {
    animation-delay: 45ms;
  }
  > :nth-child(3) {
    animation-delay: 90ms;
  }
  > :nth-child(4) {
    animation-delay: 135ms;
  }
  > :nth-child(n + 5) {
    animation-delay: 160ms;
  }

  @keyframes settings-stack-enter {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  @keyframes settings-card-enter {
    from {
      opacity: 0;
      transform: translateY(10px) scale(0.997);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    &,
    > * {
      animation: none;
    }
  }
`;

export const Card = styled.section`
  position: relative;
  overflow: hidden;
  border: 1px solid #e8e1da;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.96);
  padding: 28px;
  box-shadow: 0 9px 28px rgba(51, 35, 22, 0.042);
  transition:
    transform 260ms cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 260ms ease,
    border-color 220ms ease,
    background 220ms ease;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 28px;
    width: 42px;
    height: 3px;
    border-radius: 0 0 999px 999px;
    background: var(--a);
    opacity: 0.38;
    transform: scaleX(0.55);
    transform-origin: left;
    transition:
      opacity 220ms ease,
      transform 300ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  &:hover,
  &:focus-within {
    border-color: #ddd2c8;
    background: #fff;
    box-shadow: 0 15px 36px rgba(51, 35, 22, 0.065);
  }

  &:hover::before,
  &:focus-within::before {
    opacity: 0.9;
    transform: scaleX(1);
  }

  h2 {
    margin: 0;
    color: #26211e;
    font-size: 18px;
    letter-spacing: -0.025em;
  }
  > h2 + p,
  > p {
    max-width: 760px;
  }
  p {
    color: var(--muted);
    line-height: 1.58;
  }
  > h2 + p {
    margin: 7px 0 0;
    font-size: 12px;
  }

  @media (max-width: 580px) {
    padding: 19px 15px;
    border-radius: 9px;
    &::before {
      left: 15px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &::before {
      transition: none;
    }
  }
`;

export const LogoCard = styled.div`
  display: grid;
  grid-template-columns: minmax(190px, 0.9fr) 168px minmax(220px, 1fr);
  align-items: center;
  gap: 32px;

  .copy {
    align-self: center;
  }
  .copy h2 {
    margin-bottom: 8px;
  }
  .copy p {
    margin: 0;
    font-size: 12px;
  }

  .logo {
    width: 168px;
    height: 168px;
    position: relative;
    border: 1px solid #ddd4cc;
    border-radius: 10px;
    background:
      linear-gradient(145deg, rgba(255, 255, 255, 0.08), transparent),
      #171b1e;
    display: grid;
    place-items: center;
    overflow: hidden;
    color: #eb641e;
    box-shadow: 0 13px 28px rgba(38, 29, 23, 0.12);
    font:
      52px Georgia,
      serif;
    transition:
      transform 300ms cubic-bezier(0.22, 1, 0.36, 1),
      box-shadow 300ms ease;
  }
  .logo:hover {
    transform: translateY(-3px) scale(1.01);
    box-shadow: 0 18px 34px rgba(38, 29, 23, 0.16);
  }
  .logo img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  .logo svg {
    width: 38px;
    height: 38px;
    color: #a99d94;
  }

  .upload {
    display: grid;
    justify-items: start;
    gap: 10px;
  }
  .upload button {
    min-height: 46px;
    padding: 0 17px;
    border: 1px solid #ddd4cc;
    border-radius: 8px;
    background: #fff;
    color: #37312d;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    font-weight: 750;
    box-shadow: 0 4px 12px rgba(48, 35, 26, 0.035);
    transition:
      color 180ms ease,
      border-color 180ms ease,
      background 180ms ease,
      transform 220ms cubic-bezier(0.22, 1, 0.36, 1),
      box-shadow 220ms ease;
  }
  .upload button:hover:not(:disabled) {
    color: var(--a);
    border-color: color-mix(in srgb, var(--a) 32%, #ddd4cc);
    background: color-mix(in srgb, var(--a) 4%, white);
    transform: translateY(-1px);
    box-shadow: 0 7px 16px color-mix(in srgb, var(--a) 8%, transparent);
  }
  .upload button:active:not(:disabled) {
    transform: translateY(0) scale(0.99);
  }
  .upload button svg {
    width: 17px;
  }
  .upload button:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
  .upload .spin {
    animation: admin-image-spin 0.9s linear infinite;
  }
  @keyframes admin-image-spin {
    to {
      transform: rotate(360deg);
    }
  }
  .upload small {
    color: var(--muted);
    font-size: 10px;
    line-height: 1.5;
  }

  @media (max-width: 760px) {
    grid-template-columns: 150px minmax(0, 1fr);
    .copy {
      grid-column: 1 / -1;
    }
    .logo {
      width: 146px;
      height: 146px;
    }
  }

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
    .logo {
      width: 132px;
      height: 132px;
    }
    .upload button {
      width: 100%;
      justify-content: center;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .logo,
    .upload button {
      transition: none;
    }
  }
`;

export const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px 18px;
  margin-top: 22px;
  @media (max-width: 660px) {
    grid-template-columns: 1fr;
  }
`;

export const Field = styled.label<{ $full?: boolean }>`
  min-width: 0;
  display: grid;
  align-content: start;
  gap: 8px;
  color: #39342f;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.01em;
  ${({ $full }) => ($full ? 'grid-column: 1 / -1;' : '')}

  input,
  textarea,
  select {
    width: 100%;
    min-width: 0;
    border: 1px solid #ded7cf;
    border-radius: 8px;
    background: #fcfbf9;
    color: #1f1c19;
    padding: 0 14px;
    outline: 0;
    font-weight: 500;
    transition:
      border-color 200ms ease,
      box-shadow 220ms ease,
      background 200ms ease,
      transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
  }
  input:hover:not(:disabled),
  textarea:hover:not(:disabled),
  select:hover:not(:disabled) {
    border-color: #c9bfb6;
    background: #fff;
  }
  input {
    height: 52px;
  }
  select {
    height: 52px;
    cursor: pointer;
  }
  textarea {
    resize: vertical;
    min-height: 116px;
    padding-top: 14px;
    line-height: 1.55;
  }
  :focus-within input,
  :focus-within textarea,
  :focus-within select {
    border-color: var(--a);
    background: #fff;
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--a) 10%, transparent);
  }
  input:disabled,
  textarea:disabled,
  select:disabled {
    color: #8d8680;
    background: #f3f1ee;
    border-color: #e8e2dc;
  }
  input[aria-invalid='true'],
  textarea[aria-invalid='true'],
  select[aria-invalid='true'] {
    border-color: #c24132;
    background: #fff8f7;
  }
  > small {
    color: var(--muted);
    font-size: 10px;
    font-weight: 500;
    line-height: 1.45;
  }
  input[aria-invalid='true'] ~ small,
  textarea[aria-invalid='true'] ~ small,
  select[aria-invalid='true'] ~ small {
    color: #a33b30;
    font-weight: 700;
  }

  @media (prefers-reduced-motion: reduce) {
    input,
    textarea,
    select {
      transition: none;
    }
  }
`;

export const IdentityNameInput = styled.input`
  && {
    height: 52px;
    width: 100%;
    border: 1px solid #ded7cf;
    border-radius: 8px;
    background: #fcfbf9;
    color: #1f1c19;
    padding: 0 14px;
    outline: 0;
    font-weight: 500;
    line-height: 1.55;
    transition:
      border-color 200ms ease,
      box-shadow 220ms ease,
      background 200ms ease;
  }
  &&:hover {
    border-color: #c9bfb6;
    background: #fff;
  }
  &&:focus {
    border-color: var(--a);
    background: #fff;
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--a) 10%, transparent);
  }
`;

export const Color = styled.div`
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr);
  gap: 8px;
  input[type='color'] {
    padding: 6px;
    width: 56px;
    border-radius: 8px 0 0 8px;
    cursor: pointer;
  }
  input[type='color'] + input {
    border-radius: 0 8px 8px 0;
  }
`;

export const Banners = styled.div`
  display: grid;
  grid-template-columns: 1.8fr 1fr 1fr;
  gap: 14px;
  margin-top: 20px;
  button {
    position: relative;
    min-height: 170px;
    border: 1px dashed #bdb4aa;
    border-radius: 10px;
    background: linear-gradient(145deg, #fff, #faf7f3);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    color: #333;
    cursor: pointer;
    overflow: hidden;
    transition:
      transform 240ms cubic-bezier(0.22, 1, 0.36, 1),
      border-color 180ms ease,
      box-shadow 240ms ease;
  }
  button:has(img)::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, transparent 35%, rgba(0, 0, 0, 0.68));
    pointer-events: none;
  }
  button:hover {
    transform: translateY(-3px) scale(1.005);
    border-color: var(--a);
    box-shadow: 0 12px 26px color-mix(in srgb, var(--a) 11%, transparent);
  }
  span {
    color: var(--muted);
    font-size: 12px;
  }
  button:has(img) b,
  button:has(img) span {
    position: relative;
    z-index: 1;
    color: #fff;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
  }
  img {
    position: absolute;
    inset: 0;
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
    object-position: center;
    border-radius: inherit;
  }
  @media (max-width: 620px) {
    display: flex;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    button {
      flex: 0 0 78vw;
      scroll-snap-align: center;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    button {
      transition: none;
    }
  }
`;

export const Generic = styled.div`
  display: grid;
  gap: 10px;
  .row {
    min-height: 68px;
    border: 1px solid #ebe4dd;
    border-radius: 8px;
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 10px 12px;
    background: #fcfbf9;
    transition:
      border-color 180ms ease,
      background 180ms ease,
      transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
  }
  .row:hover {
    border-color: #ddd3ca;
    background: #fff;
    transform: translateY(-1px);
  }
  .row div {
    display: grid;
    gap: 4px;
  }
  .row span {
    color: var(--muted);
    font-size: 12px;
  }
  .row input[type='checkbox'] {
    margin-left: auto;
    width: 20px;
    height: 20px;
    accent-color: var(--a);
  }
`;

export const EmployeeHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 18px;
  h2 {
    margin: 0;
  }
  p {
    margin: 4px 0;
    color: var(--muted);
    font-size: 12px;
  }
  button {
    height: 44px;
    border: 0;
    border-radius: 8px;
    background: var(--a);
    color: #fff;
    padding: 0 16px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
`;

export const EmployeeList = styled.div`
  display: grid;
`;

export const EmployeeRow = styled.article`
  min-height: 76px;
  border-bottom: 1px solid var(--border);
  display: grid;
  grid-template-columns: 42px minmax(130px, 1fr) 130px 110px 38px 104px;
  align-items: center;
  gap: 12px;
  .avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: #fff0e7;
    color: var(--a);
    display: grid;
    place-items: center;
    font-weight: 800;
    font-size: 11px;
  }
  .identity,
  .role {
    display: grid;
    gap: 4px;
  }
  .identity span,
  .role span {
    font-size: 10px;
    color: var(--muted);
  }
  .status {
    font-size: 10px;
    color: #43853e;
    background: #edf7ea;
    border-radius: 999px;
    padding: 6px 9px;
    text-align: center;
  }
  .edit {
    width: 34px;
    height: 34px;
    border: 0;
    background: transparent;
    border-radius: 8px;
    cursor: pointer;
    transition:
      background 160ms ease,
      color 160ms ease;
    &:hover {
      color: var(--a);
      background: #fff3ed;
    }
  }
  .deactivate,
  .reactivate {
    min-height: 36px;
    border: 1px solid #f2c7c2;
    border-radius: 8px;
    background: #fff7f5;
    color: #b53b32;
    padding: 0 12px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    font: inherit;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 3px 10px rgba(181, 59, 50, 0.06);
    transition:
      color 160ms ease,
      background 160ms ease,
      border-color 160ms ease,
      box-shadow 160ms ease,
      transform 160ms ease;
    &:hover {
      color: #fff;
      background: #c9473d;
      border-color: #c9473d;
      box-shadow: 0 7px 16px rgba(181, 59, 50, 0.2);
      transform: translateY(-1px);
    }
    &:active {
      transform: translateY(0);
    }
    &:focus-visible {
      outline: 3px solid rgba(201, 71, 61, 0.2);
      outline-offset: 2px;
    }
  }
  .reactivate {
    border-color: #b9dfbb;
    background: #f2fbf1;
    color: #31763a;
    box-shadow: 0 3px 10px rgba(49, 118, 58, 0.06);
    &:hover {
      color: #fff;
      background: #3f8f49;
      border-color: #3f8f49;
      box-shadow: 0 7px 16px rgba(49, 118, 58, 0.2);
    }
    &:focus-visible {
      outline-color: rgba(63, 143, 73, 0.22);
    }
  }
  @media (max-width: 580px) {
    grid-template-columns: 42px minmax(0, 1fr) 38px;
    .role,
    .status {
      display: none;
    }
    .deactivate,
    .reactivate {
      grid-column: 2 / -1;
      justify-self: start;
      margin: -5px 0 10px;
    }
  }
`;

export const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 90;
  background: #1118;
  display: flex;
  justify-content: flex-end;
  animation: overlay-enter 180ms ease both;
  @keyframes overlay-enter {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  &.product-editor-overlay {
    inset: 0 0 0 236px;
    justify-content: center;
    background: #f9f8f5;
  }
  @media (max-width: 1080px) {
    &.product-editor-overlay {
      left: 220px;
    }
  }
  @media (max-width: 760px) {
    &.product-editor-overlay {
      inset: 0;
    }
  }
`;

export const Drawer = styled.form`
  width: min(100%, 530px);
  height: 100dvh;
  background: #fffdf9;
  padding: 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 17px;
  animation: drawer-enter 260ms cubic-bezier(0.22, 0.8, 0.35, 1) both;
  @keyframes drawer-enter {
    from {
      opacity: 0;
      transform: translateX(22px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid var(--border);
    padding-bottom: 14px;
  }
  header h2 {
    margin: 0;
  }
  header button {
    border: 0;
    background: transparent;
  }
  .permissions {
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 13px;
    display: grid;
    gap: 12px;
  }
  .permissions label {
    display: flex;
    gap: 9px;
    font-size: 12px;
  }
  .permissions input {
    accent-color: var(--a);
  }
  footer {
    margin-top: auto;
    display: flex;
    justify-content: flex-end;
    gap: 9px;
    border-top: 1px solid var(--border);
    padding-top: 14px;
  }
  footer button {
    height: 42px;
    padding: 0 16px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: #fff;
  }
  footer .primary {
    background: var(--a);
    color: #fff;
    border: 0;
  }
`;