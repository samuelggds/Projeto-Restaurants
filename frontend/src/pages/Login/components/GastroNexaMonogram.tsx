import { useId } from 'react';
import { gastroNexaGPath, gastroNexaXPath } from './gastroNexaMark';

/** Smooth Bézier contours retain the original brand; masks only reveal the strokes. */
export function GastroNexaMonogram() {
  const id = useId();
  return (
    <svg x="105" y="20" width="470" height="365" viewBox="0 0 600 470" aria-hidden="true">
      <defs>
        <mask id={`${id}-g`} maskUnits="userSpaceOnUse" x="0" y="0" width="600" height="470">
          <path
            className="gx-draw gx-draw-g"
            d="M335 72 C267 -26 77 141 48 272 C12 421 176 389 313 279 L233 180"
            pathLength="100"
            fill="none"
            stroke="white"
            strokeWidth="180"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </mask>
        <mask id={`${id}-x`} maskUnits="userSpaceOnUse" x="0" y="0" width="600" height="470">
          <path
            className="gx-draw gx-draw-x-back"
            d="M572 24 L172 457"
            pathLength="100"
            fill="none"
            stroke="white"
            strokeWidth="120"
            strokeLinecap="round"
          />
          <path
            className="gx-draw gx-draw-x-front"
            d="M229 163 L548 447"
            pathLength="100"
            fill="none"
            stroke="white"
            strokeWidth="160"
            strokeLinecap="round"
          />
        </mask>
      </defs>
      <path d={gastroNexaGPath} fill="#111111" fillRule="evenodd" mask={`url(#${id}-g)`} />
      <path d={gastroNexaXPath} fill="#111111" fillRule="evenodd" mask={`url(#${id}-x)`} />
    </svg>
  );
}
