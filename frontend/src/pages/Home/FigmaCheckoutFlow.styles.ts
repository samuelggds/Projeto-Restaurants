import styled from 'styled-components';

export const Layer = styled.div<{ $primary: string }>`
  --checkout-primary: ${({ $primary }) => $primary || '#e85a2b'};
  --checkout-bg: #fdfcf9;
  --checkout-text: #1f1e1a;
  --checkout-muted: #72706b;
  --checkout-line: #efece6;
  position: fixed;
  inset: 0;
  z-index: 500;
  overflow-y: auto;
  background: var(--checkout-bg);
  color: var(--checkout-text);
  font-family: 'Inter', system-ui, sans-serif;

  *, *::before, *::after { box-sizing: border-box; }
  button, input, textarea { font: inherit; }
`;

export const Top = styled.header`
  min-height: 80px;
  padding: 0 max(24px, calc((100vw - 1120px) / 2));
  border-bottom: 1px solid var(--checkout-line);
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;

  .brand { min-width:0; display:flex;align-items:center;gap:12px; }
  .logo { width:40px;height:40px;border-radius:12px;overflow:hidden;background:var(--checkout-primary);color:#fff;display:grid;place-items:center;font-family:'Gabarito','Inter',sans-serif;font-weight:800; }
  .logo img{width:100%;height:100%;object-fit:cover}
  .brand b{font-family:'Gabarito','Inter',sans-serif;font-size:18px}
  .back{border:0;background:#f7f5f0;width:40px;height:40px;border-radius:20px;display:grid;place-items:center;color:var(--checkout-text)}

  @media(max-width:760px){
    min-height:64px;padding:12px 20px;
    .brand b{font-size:16px}
    .logo{width:36px;height:36px}
  }
`;

export const Shell = styled.main`
  width:min(1120px,calc(100% - 48px));
  margin:0 auto;
  padding:42px 0 70px;
  display:grid;
  gap:22px;

  @media(max-width:760px){width:100%;padding:18px 20px 110px}
`;

export const Heading = styled.div`
  display:flex;align-items:center;justify-content:space-between;gap:16px;
  h1{margin:0;font-family:'Gabarito','Inter',sans-serif;font-size:30px}
  p{margin:5px 0 0;color:var(--checkout-muted);font-size:13px}
  .clear{border:0;background:transparent;color:var(--checkout-primary);font-weight:700}
  @media(max-width:760px){h1{font-size:22px}}
`;

export const Progress = styled.div`
  display:grid;grid-template-columns:repeat(3,1fr);gap:8px;
  span{height:4px;border-radius:2px;background:#e9e6df}
  span.active{background:var(--checkout-primary)}
`;

export const TwoColumns = styled.div`
  display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:34px;align-items:start;
  @media(max-width:900px){grid-template-columns:1fr}
`;

export const Panel = styled.section`
  min-width:0;
  display:grid;
  gap:18px;
`;

export const Summary = styled.aside`
  position:sticky;
  top:24px;
  padding:22px;
  border:1px solid var(--checkout-line);
  border-radius:18px;
  background:#fff;
  display:grid;
  gap:14px;

  h2{margin:0;font-family:'Gabarito','Inter',sans-serif;font-size:20px}
  .row{display:flex;align-items:center;justify-content:space-between;gap:14px;color:var(--checkout-muted);font-size:13px}
  .row strong{color:var(--checkout-text)}
  .row.discount,.row.discount strong{color:#17854a}
  .line{height:1px;background:var(--checkout-line)}
  .total{font-size:16px;font-weight:700}
  .total strong{color:var(--checkout-primary);font-size:22px}
  .coupon{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px}
  .coupon input{min-height:42px;padding:0 12px;border:1px solid var(--checkout-line);border-radius:12px;outline:0}
  .coupon button{min-width:72px;border:0;border-radius:10px;background:var(--checkout-text);color:#fff;font-size:12px;font-weight:700}

  @media(max-width:900px){position:static}
`;

export const StepCard = styled.section`
  padding:22px;
  border:1px solid var(--checkout-line);
  border-radius:18px;
  background:#fff;
  display:grid;
  gap:18px;

  > h2{margin:0;font-family:'Gabarito','Inter',sans-serif;font-size:20px}
  @media(max-width:760px){padding:0;border:0;background:transparent;border-radius:0}
`;

export const Actions = styled.div`
  display:flex;justify-content:flex-end;gap:10px;margin-top:6px;
  button{min-height:48px;padding:0 22px;border-radius:12px;font-weight:700}
  .secondary{border:1px solid var(--checkout-line);background:#fff;color:var(--checkout-text)}
  .primary{border:0;background:linear-gradient(90deg,#ff6a3d,#ff3d1f);color:#fff;box-shadow:0 10px 14px rgba(16,24,39,.14)}
  .primary:disabled{opacity:.55;cursor:not-allowed}

  @media(max-width:760px){
    position:fixed;z-index:5;left:0;right:0;bottom:0;padding:12px 20px max(20px,env(safe-area-inset-bottom));border-top:1px solid var(--checkout-line);background:#fff;
    .secondary{display:none}
    .primary{width:100%}
  }
`;

export const Empty = styled.div`
  min-height:300px;display:grid;place-items:center;text-align:center;color:var(--checkout-muted);
`;
