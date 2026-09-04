import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { exchangeAdminPortalKey } from './domain/adminPortalSession';

export default function AdminPortalEntry() {
  const navigate = useNavigate();
  const { restaurantSlug, accessKey } = useParams();
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let active = true;
    const slug = String(restaurantSlug || '').trim().toLowerCase();
    const key = String(accessKey || '').trim();

    if (!slug || !key) {
      setNotFound(true);
      return () => {
        active = false;
      };
    }

    void exchangeAdminPortalKey(slug, key)
      .then(() => {
        if (active) navigate(`/${slug}/admin`, { replace: true });
      })
      .catch(() => {
        if (active) setNotFound(true);
      });

    return () => {
      active = false;
    };
  }, [accessKey, navigate, restaurantSlug]);

  if (notFound) {
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
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <span role="status">Validando acesso administrativo…</span>
    </main>
  );
}
