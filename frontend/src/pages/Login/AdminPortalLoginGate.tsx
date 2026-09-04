import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Login from './Login';
import { verifyAdminPortalGrant } from './domain/adminPortalSession';

type GateState = {
  slug: string;
  status: 'checking' | 'allowed' | 'denied';
};

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

  return <Login />;
}
