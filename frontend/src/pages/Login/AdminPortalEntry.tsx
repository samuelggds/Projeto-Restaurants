import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { persistTenantSlug } from '../../shared/navigation/tenantRouteContext';
import { exchangeAdminPortalKey } from './domain/adminPortalSession';

type EntryStatus = 'checking' | 'denied' | 'rate-limited' | 'unavailable';
type EntryState = {
  requestKey: string;
  status: EntryStatus;
  message?: string;
};

function resolveEntryFailure(error: unknown): Pick<EntryState, 'status' | 'message'> {
  const response =
    error && typeof error === 'object' && 'response' in error
      ? (error as { response?: { status?: number; data?: { error?: unknown } } }).response
      : undefined;
  const statusCode = Number(response?.status || 0);
  const backendMessage = String(response?.data?.error || '').trim();

  if (statusCode === 429) {
    return {
      status: 'rate-limited',
      message: backendMessage || 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
    };
  }

  if (!statusCode || statusCode >= 500) {
    return {
      status: 'unavailable',
      message: 'Não foi possível validar o acesso administrativo agora. Verifique o backend e tente novamente.',
    };
  }

  return { status: 'denied', message: 'Página não encontrada.' };
}

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

    persistTenantSlug(slug);
    let active = true;
    void exchangeAdminPortalKey(slug, key)
      .then(() => {
        if (active) navigate(`/${slug}/admin`, { replace: true });
      })
      .catch((error) => {
        if (!active) return;
        const failure = resolveEntryFailure(error);
        setEntryState({ requestKey, ...failure });
      });

    return () => {
      active = false;
    };
  }, [key, navigate, requestKey, slug]);

  const status: EntryStatus =
    !slug || !key
      ? 'denied'
      : entryState.requestKey === requestKey
        ? entryState.status
        : 'checking';

  if (status !== 'checking') {
    const isDenied = status === 'denied';
    const title =
      status === 'rate-limited'
        ? 'Acesso temporariamente limitado'
        : status === 'unavailable'
          ? 'Não foi possível validar o acesso'
          : '404';
    const message =
      entryState.requestKey === requestKey && entryState.message
        ? entryState.message
        : isDenied
          ? 'Página não encontrada.'
          : 'Tente novamente em instantes.';

    return (
      <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
        <section style={{ textAlign: 'center', maxWidth: 520 }}>
          <h1>{title}</h1>
          <p>{message}</p>
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
