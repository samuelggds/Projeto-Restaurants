import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Login from './Login';
import { verifyAdminPortalGrant } from './domain/adminPortalSession';

export default function AdminPortalLoginGate() {
  const { restaurantSlug } = useParams();
  const slug = String(restaurantSlug || '').trim().toLowerCase();
  const [state, setState] = useState<'checking' | 'allowed' | 'denied'>('checking');

  useEffect(() => {
    let active = true;
    if (!slug) {
      setState('denied');
      return () => {
        active = false;
      };
    }

    void verifyAdminPortalGrant(slug)
      .then((result) => {
        if (active) setState(result.valid && result.slug === slug ? 'allowed' : 'denied');
      })
      .catch(() => {
        if (active) setState('denied');
      });

    return () => {
      active = false;
    };
  }, [slug]);

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
