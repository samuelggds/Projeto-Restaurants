import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { exchangeAdminPortalKey } from './domain/adminPortalSession';

type EntryState = {
  requestKey: string;
  status: 'checking' | 'denied';
};

export default function AdminPortalEntry() {
  const navigate = useNavigate();
  const { restaurantSlug, accessKey } = useParams();
  const slug = String(restaurantSlug || '').trim().toLowerCase();
  const key = String(accessKey || '').trim();
  const requestKey = `${slug}:${key}`;
  const [entryState, setEntryState] = useState<EntryState>({
    requestKey: '',
    status: 'checking',
  });

  useEffect(() => {
    if (!slug || !key) return;

    let active = true;
    void exchangeAdminPortalKey(slug, key)
      .then(() => {
        if (active) navigate(`/${slug}/admin`, { replace: true });
      })
      .catch(() => {
        if (active) setEntryState({ requestKey, status: 'denied' });
      });

    return () => {
      active = false;
    };
  }, [key, navigate, requestKey, slug]);

  const status =
    !slug || !key
      ? 'denied'
      : entryState.requestKey === requestKey
        ? entryState.status
        : 'checking';

  if (status === 'denied') {
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
