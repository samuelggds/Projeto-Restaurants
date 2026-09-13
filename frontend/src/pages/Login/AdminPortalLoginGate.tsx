import { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
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
  top: 1.25rem;
  left: 50%;
  width: min(560px, calc(100vw - 2rem));
  transform: translateX(-50%);
  display: flex;
  align-items: flex-start;
  gap: 0.72rem;
  padding: 0.9rem 1rem;
  box-sizing: border-box;
  border: 1px solid rgba(239, 68, 68, 0.32);
  border-radius: 14px;
  color: #b42318;
  background: rgba(255, 247, 247, 0.97);
  box-shadow:
    0 14px 38px rgba(127, 29, 29, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(12px);

  .notice-icon {
    flex: 0 0 auto;
    width: 34px;
    height: 34px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    color: #b42318;
    background: rgba(239, 68, 68, 0.1);
  }

  .notice-icon svg {
    width: 19px;
    height: 19px;
    stroke-width: 2.3;
  }

  .notice-copy {
    min-width: 0;
  }

  strong,
  span {
    display: block;
  }

  strong {
    margin-bottom: 0.2rem;
    font-size: 0.88rem;
    line-height: 1.25;
    font-weight: 850;
    letter-spacing: -0.01em;
  }

  span {
    color: #912018;
    font-size: 0.78rem;
    line-height: 1.45;
    font-weight: 620;
  }

  @media (max-width: 968px) {
    top: auto;
    bottom: calc(0.9rem + env(safe-area-inset-bottom, 0px));
    width: min(520px, calc(100vw - 1.2rem));
    padding: 0.78rem 0.85rem;
    border-radius: 13px;

    .notice-icon {
      width: 31px;
      height: 31px;
      border-radius: 9px;
    }

    strong {
      font-size: 0.82rem;
    }

    span {
      font-size: 0.73rem;
      line-height: 1.4;
    }
  }
`;

export default function AdminPortalLoginGate() {
  const { restaurantSlug } = useParams();
  const slug = String(restaurantSlug || '').trim().toLowerCase();
  const [gateState, setGateState] = useState<GateState>({ slug: '', status: 'checking' });

  useEffect(() => {
    if (!slug) return;

    let active = true;
    void verifyAdminPortalGrant(slug)
      .then((result) => {
        if (!active) return;
        setGateState({
          slug,
          status: result.valid && result.slug === slug ? 'allowed' : 'denied',
        });
      })
      .catch(() => {
        if (active) setGateState({ slug, status: 'denied' });
      });

    return () => {
      active = false;
    };
  }, [slug]);

  const state = !slug ? 'denied' : gateState.slug === slug ? gateState.status : 'checking';

  if (state === 'checking') {
    return (
      <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
        <span role="status">Validando acesso administrativo…</span>
      </main>
    );
  }

  if (state === 'denied') {
    return (
      <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
        <section style={{ textAlign: 'center', maxWidth: 460 }}>
          <h1>404</h1>
          <p>Página não encontrada.</p>
        </section>
      </main>
    );
  }

  return (
    <>
      <AccessWindowNotice role="status" aria-live="polite" data-testid="admin-access-window-notice">
        <span className="notice-icon" aria-hidden="true">
          <AlertCircle />
        </span>
        <span className="notice-copy">
          <strong>Acesso temporário de 1 hora</strong>
          <span>
            Esta liberação expira em 1 hora. Quando o tempo acabar, abra este mesmo link novamente
            para liberar mais 1 hora de acesso. Não é necessário solicitar um novo link.
          </span>
        </span>
      </AccessWindowNotice>
      <Login />
    </>
  );
}
