import { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useParams } from 'react-router-dom';
import styled from 'styled-components';
import Login from './Login';
import { verifyAdminPortalGrant } from './domain/adminPortalSession';

type GateState = {
  slug: string;
  status: 'checking' | 'allowed' | 'denied';
};

const AccessWindowNotice = styled.aside`
  position: fixed;
  z-index: 60;
  top: 1.1rem;
  left: 50%;
  width: min(520px, calc(100vw - 2rem));
  transform: translateX(-50%);
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) 30px;
  align-items: start;
  gap: 0.72rem;
  padding: 0.82rem 0.86rem;
  box-sizing: border-box;
  border: 1px solid rgba(217, 119, 6, 0.28);
  border-radius: 16px;
  color: #8a4b08;
  background: #fffdf8;
  box-shadow: 0 14px 34px rgba(120, 72, 19, 0.14);
  animation: access-notice-in 180ms ease-out both;

  @keyframes access-notice-in {
    from { opacity: 0; transform: translate(-50%, -8px) scale(0.99); }
    to { opacity: 1; transform: translate(-50%, 0) scale(1); }
  }

  .notice-icon {
    width: 36px;
    height: 36px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 11px;
    color: #b45f06;
    background: #fff3dc;
  }

  .notice-icon svg { width: 19px; height: 19px; stroke-width: 2.3; }
  .notice-copy { min-width: 0; }
  strong, span { display: block; }
  strong { margin: 1px 0 0.22rem; color: #8a3905; font-size: 0.86rem; line-height: 1.25; font-weight: 850; letter-spacing: -0.01em; }
  .notice-copy > span { color: #8b5d2d; font-size: 0.75rem; line-height: 1.45; font-weight: 600; }

  .close {
    width: 30px;
    height: 30px;
    border: 0;
    border-radius: 9px;
    display: grid;
    place-items: center;
    color: #9a7452;
    background: transparent;
    cursor: pointer;
  }
  .close:hover { color: #744218; background: #fff5e7; }
  .close svg { width: 16px; height: 16px; }

  &::after {
    content: '';
    position: absolute;
    right: 12px;
    bottom: 0;
    left: 12px;
    height: 2px;
    border-radius: 999px;
    background: #d97706;
    transform-origin: left center;
    animation: access-countdown 10s linear forwards;
    opacity: 0.7;
  }
  @keyframes access-countdown { from { transform: scaleX(1); } to { transform: scaleX(0); } }

  @media (max-width: 968px) {
    top: auto;
    bottom: calc(0.9rem + env(safe-area-inset-bottom, 0px));
    width: min(500px, calc(100vw - 1.2rem));
  }
  @media (prefers-reduced-motion: reduce) { animation: none; &::after { animation: none; } }
`;

export default function AdminPortalLoginGate() {
  const { restaurantSlug } = useParams();
  const slug = String(restaurantSlug || '').trim().toLowerCase();
  const [gateState, setGateState] = useState<GateState>({ slug: '', status: 'checking' });
  const [showAccessNotice, setShowAccessNotice] = useState(true);

  useEffect(() => {
    setShowAccessNotice(true);
    const timer = window.setTimeout(() => setShowAccessNotice(false), 10_000);
    return () => window.clearTimeout(timer);
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    let active = true;
    void verifyAdminPortalGrant(slug)
      .then((result) => {
        if (!active) return;
        setGateState({ slug, status: result.valid && result.slug === slug ? 'allowed' : 'denied' });
      })
      .catch(() => {
        if (active) setGateState({ slug, status: 'denied' });
      });
    return () => { active = false; };
  }, [slug]);

  const state = !slug ? 'denied' : gateState.slug === slug ? gateState.status : 'checking';

  if (state === 'checking') {
    return <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}><span role="status">Validando acesso administrativo…</span></main>;
  }
  if (state === 'denied') {
    return <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}><section style={{ textAlign: 'center', maxWidth: 460 }}><h1>404</h1><p>Página não encontrada.</p></section></main>;
  }

  return (
    <>
      {showAccessNotice && (
        <AccessWindowNotice role="status" aria-live="polite" data-testid="admin-access-window-notice">
          <span className="notice-icon" aria-hidden="true"><AlertTriangle /></span>
          <span className="notice-copy">
            <strong>Acesso temporário liberado por 1 hora</strong>
            <span>Este link libera 1 hora de acesso administrativo. Quando expirar, abra o mesmo link novamente para renovar por mais 1 hora.</span>
          </span>
          <button className="close" type="button" aria-label="Fechar aviso" onClick={() => setShowAccessNotice(false)}><X /></button>
        </AccessWindowNotice>
      )}
      <Login />
    </>
  );
}
