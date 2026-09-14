import { useEffect, useRef, useState } from 'react';
import { Monitor, Smartphone } from 'lucide-react';
import styled from 'styled-components';

const Figure = styled.figure`
  min-width: 0;
  margin: 0;
  overflow: hidden;
  border: 1px solid #dce4de;
  border-radius: 18px;
  background: #f5f8f5;
  .preview-tools {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
    padding: 16px;
    background: white;
  }
  .preview-tools strong {
    color: #213f32;
    font-size: 14px;
  }
  .preview-tools div {
    display: flex;
    gap: 6px;
  }
  .preview-tools button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: 1px solid #dce4de;
    border-radius: 10px;
    padding: 9px 12px;
    background: white;
    color: #42534b;
    cursor: pointer;
  }
  .preview-tools button[aria-pressed='true'] {
    background: #213f32;
    color: white;
  }
  .preview-tools button:focus-visible {
    outline: 3px solid #83a698;
    outline-offset: 2px;
  }
  .viewport {
    position: relative;
    overflow: hidden;
    margin: auto;
  }
  .viewport:focus-within {
    outline: 3px solid #83a698;
    outline-offset: -3px;
  }
  iframe {
    display: block;
    border: 0;
    transform-origin: top left;
  }
  figcaption {
    padding: 14px 18px;
    border-top: 1px solid #dce4de;
    color: #55665d;
    font-size: 12px;
    line-height: 1.6;
  }
`;

/** Uses the actual page components in a separate, read-only, fictitious runtime. */
export function LiveHelpPreview({ area, title }: { area: string; title: string }) {
  const container = useRef<HTMLDivElement>(null);
  const [available, setAvailable] = useState(800);
  const [mode, setMode] = useState<'desktop' | 'mobile'>(() =>
    window.innerWidth < 700 ? 'mobile' : 'desktop',
  );
  useEffect(() => {
    if (!container.current || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => setAvailable(entry.contentRect.width));
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  const width = mode === 'desktop' ? 1280 : 390;
  const height = mode === 'desktop' ? 840 : 844;
  const scale = Math.min(mode === 'mobile' ? 600 / height : 1, available / width);
  return (
    <Figure aria-label={`Prévia atual: ${title}`}>
      <div className="preview-tools">
        <strong>{title} · tela atual</strong>
        <div role="group" aria-label="Tamanho da prévia">
          <button
            type="button"
            aria-pressed={mode === 'desktop'}
            onClick={() => setMode('desktop')}
          >
            <Monitor size={16} /> Computador
          </button>
          <button type="button" aria-pressed={mode === 'mobile'} onClick={() => setMode('mobile')}>
            <Smartphone size={16} /> Celular
          </button>
        </div>
      </div>
      <div ref={container}>
        <div className="viewport" style={{ width: width * scale, height: height * scale }}>
          <iframe
            key={`${area}-${mode}`}
            src={`/help-preview.html?area=${encodeURIComponent(area)}`}
            title={`Exemplo ilustrativo de ${title}`}
            tabIndex={0}
            loading="lazy"
            sandbox="allow-scripts allow-same-origin"
            style={{ width, height, transform: `scale(${scale})` }}
          />
        </div>
      </div>
      <figcaption>
        Role dentro da prévia para consultar toda a tela. Os dados são fictícios e os controles são
        apenas ilustrativos. Para usar as ações, abra seu painel ou experimente a demonstração.
      </figcaption>
    </Figure>
  );
}
