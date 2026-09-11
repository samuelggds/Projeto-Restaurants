import { GastroNexaMonogram } from './GastroNexaMonogram';
import { useEffect, useState } from 'react';
import { BrandTypewriter } from './BrandTypewriter';
import * as S from '../styles';

// This module lives for the current document, so SPA navigation does not replay the intro.
let introHasPlayed = false;

/** Responsive vector composition; the lettering and mark never depend on raster resolution. */
export function GastroNexaArtwork() {
  const [animate] = useState(() => !introHasPlayed);
  useEffect(() => {
    introHasPlayed = true;
  }, []);
  return (
    <S.PlatformBrandArtwork data-testid="gastronexa-access-artwork" data-animate={animate}>
      <svg className="brand-corner corner-top" viewBox="0 0 300 300" aria-hidden="true">
        <circle className="brand-stroke" cx="20" cy="20" r="268" pathLength="100" />
      </svg>
      <svg
        className="brand-composition"
        viewBox="0 0 680 650"
        role="img"
        aria-label="GastroNexa — Tecnologia para Restaurantes"
      >
        <GastroNexaMonogram />
        <text
          className="word-gastro"
          x="370"
          y="477"
          textAnchor="end"
          fontFamily="Arial, Helvetica, sans-serif"
          fontSize="88"
          fontWeight="700"
          letterSpacing="-5"
          fill="#111111"
        >
          <BrandTypewriter text="Gastro" start={0.45} interval={0.12} animate={animate} />
        </text>
        <text
          className="word-nexa"
          x="370"
          y="477"
          fontFamily="Arial, Helvetica, sans-serif"
          fontSize="88"
          fontWeight="700"
          letterSpacing="-5"
          fill="#d66416"
        >
          <BrandTypewriter text="Nexa" start={0.45} interval={0.12} reverse animate={animate} />
        </text>
        <text
          x="340"
          y="532"
          textAnchor="middle"
          fontFamily="Arial, Helvetica, sans-serif"
          fontSize="32"
          fill="#343638"
          xmlSpace="preserve"
        >
          <BrandTypewriter
            text="Tecnologia para Restaurantes"
            start={1.15}
            interval={0.045}
            animate={animate}
          />
        </text>
        <path
          className="brand-stroke"
          d="M250 578 H430"
          stroke="#d66416"
          strokeWidth="2"
          pathLength="100"
        />
      </svg>
      <svg className="brand-motto" viewBox="0 0 210 100" aria-hidden="true">
        <text
          x="0"
          y="22"
          fontFamily="Arial, Helvetica, sans-serif"
          fontSize="14"
          letterSpacing="3"
          fill="#b7510c"
          xmlSpace="preserve"
        >
          <tspan x="0">
            <BrandTypewriter text="TECNOLOGIA" start={1.4} animate={animate} />
          </tspan>
          <tspan x="0" dy="27">
            <BrandTypewriter text="QUE MOVE" start={2.1} animate={animate} />
          </tspan>
          <tspan x="0" dy="27">
            <BrandTypewriter text="SABORES" start={2.66} animate={animate} />
          </tspan>
        </text>
      </svg>
      <svg className="brand-corner corner-bottom" viewBox="0 0 300 300" aria-hidden="true">
        <circle className="brand-stroke" cx="280" cy="280" r="268" pathLength="100" />
      </svg>
    </S.PlatformBrandArtwork>
  );
}
