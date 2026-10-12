import styled from 'styled-components';

const Layout = styled.span<{ $tone: 'free' | 'busy' | 'reserved' | 'unknown' }>`
  --ink: ${p => p.$tone === 'busy' ? '#a96614' : p.$tone === 'reserved' ? '#5374b6' : p.$tone === 'unknown' ? '#64748b' : '#315a4c'};
  --surface: ${p => p.$tone === 'busy' ? '#fff0d9' : p.$tone === 'reserved' ? '#eef2fc' : p.$tone === 'unknown' ? '#f1f5f9' : '#e9f2ed'};
  position: relative;
  display: inline-flex;
  width: 106px;
  height: 76px;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--ink);

  .desk {
    width: 49px;
    height: 34px;
    border: 1.2px solid var(--ink);
    border-radius: 7px;
    background: var(--surface);
    font-size: 13px;
    font-weight: 700;
    display: grid;
    place-items: center;
  }
  .chair {
    position: absolute;
    background: var(--surface);
    border: 1px solid var(--ink);
    border-radius: 2px;
    transform: translate(-50%, -50%);
  }
  .chair.horizontal { width: 14px; height: 7px; }
  .chair.vertical { width: 7px; height: 14px; }
  .capacity-label {
    position: absolute;
    right: 0;
    bottom: 0;
    font-size: 10px;
    font-weight: 700;
    background: var(--surface);
    padding: 1px 3px;
    border-radius: 4px;
  }
`;

/**
 * Every configured place maps to one chair. The compact illustration displays
 * up to 12 chairs; larger capacities retain an explicit numeric indication.
 * Missing capacity is never treated as four seats.
 */
export function TableSeatDiagram({
  number,
  capacity,
  tone,
}: {
  number: number;
  capacity?: number | null;
  tone: 'free' | 'busy' | 'reserved' | 'unknown';
}) {
  const seats = Number.isInteger(capacity) && Number(capacity) > 0 ? Number(capacity) : 0;
  const visibleSeats = Math.min(seats, 12);
  const perSide = Array.from({ length: 4 }, (_, side) =>
    Math.floor(visibleSeats / 4) + (side < visibleSeats % 4 ? 1 : 0),
  );
  const chairs = perSide.flatMap((amount, side) =>
    Array.from({ length: amount }, (_, index) => {
      const portion = (index + 1) / (amount + 1);
      const x = side === 0 || side === 2 ? 23 + portion * 60 : side === 1 ? 101 : 5;
      const y = side === 1 || side === 3 ? 12 + portion * 50 : side === 0 ? 8 : 68;
      return { key: `${side}-${index}`, x, y, horizontal: side === 0 || side === 2 };
    }),
  );

  return (
    <Layout $tone={tone}
      aria-label={`Mesa ${number}, ${seats || 'capacidade não configurada'}${seats ? ' lugares' : ''}`}>
      {chairs.map(chair => (
        <i aria-hidden="true" key={chair.key}
          className={`chair ${chair.horizontal ? 'horizontal' : 'vertical'}`}
          style={{ left: `${chair.x}px`, top: `${chair.y}px` }} />
      ))}
      <span aria-hidden="true" className="desk">{String(number).padStart(2, '0')}</span>
      {seats > 12 && <span aria-hidden="true" className="capacity-label">{seats} lugares</span>}
    </Layout>
  );
}
