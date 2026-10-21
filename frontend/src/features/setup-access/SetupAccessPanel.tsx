import { useCallback, useEffect, useState } from 'react';
import { ShieldCheck, ShieldX, Clock3, RefreshCw } from 'lucide-react';
import api from '../../Services/api';
import { acquireSocket } from '../../Services/socketService';
import { getAccessToken } from '../../modules/auth/session/authSession';
import * as S from './SetupAccessPanel.styles';

type Grant = {
  id: string;
  restaurantId: number;
  status: string;
  reason: string;
  requestedAt: string;
  approvedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
};

type Props = {
  restaurantId: number;
  mode: 'admin' | 'super';
  onAuthorized?: () => void;
};

const dateTime = (value: string | null) => value
  ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
  : '—';

export function SetupAccessPanel({ restaurantId, mode, onAuthorized }: Props) {
  const [grants, setGrants] = useState<Grant[]>([]);
  const [initial, setInitial] = useState<{ authorized: boolean; expiresAt: string | null; closedAt: string | null } | null>(null);
  const [reason, setReason] = useState('Preparação e configuração operacional do restaurante para iniciar as vendas.');
  const [hours, setHours] = useState(2);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [observedAt, setObservedAt] = useState(0);

  const base = mode === 'super'
    ? '/super-admin/managed-service/restaurants/' + restaurantId + '/setup-access'
    : '/managed-service/setup-access/' + restaurantId;

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<Grant[]>(base);
      if (!Array.isArray(data)) throw new Error('Invalid response');
      setGrants(data);
      if (mode === 'super') {
        const initialResponse = await api.get<{ authorized: boolean; expiresAt: string | null; closedAt: string | null }>(
          '/super-admin/managed-service/restaurants/' + restaurantId + '/initial-setup',
        );
        setInitial(initialResponse.data);
      }
      setObservedAt(Date.now());
      setError('');
    } catch {
      setError('Não foi possível consultar os acessos. Tente novamente.');
    }
  }, [base, mode, restaurantId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    const interval = window.setInterval(() => void load(), 30_000);
    return () => window.clearInterval(interval);
  }, [load]);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    const { socket, release } = acquireSocket(token, 'restaurant-setup-access:' + mode + ':' + restaurantId);
    const refresh = (event: { restaurantId?: number }) => {
      if (Number(event?.restaurantId) === restaurantId) void load();
    };
    socket.on('setup-access:changed', refresh);
    return () => {
      socket.off('setup-access:changed', refresh);
      release();
    };
  }, [restaurantId, mode, load]);

  const active = grants.find((grant) =>
    grant.status === 'APPROVED' &&
    grant.expiresAt !== null &&
    new Date(grant.expiresAt).getTime() > observedAt,
  );
  const pending = grants.find((grant) => grant.status === 'PENDING');

  const run = async (action: () => Promise<unknown>, message: string) => {
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
      setNotice(message);
      await load();
    } catch (cause) {
      const response = cause as { response?: { data?: { error?: string } } };
      setError(response.response?.data?.error || 'A operação não foi concluída.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <S.Panel aria-label="Autorização de implantação assistida">
      <header>
        <ShieldCheck aria-hidden="true" />
        <div>
          <h3>Implantação assistida</h3>
          <p>Acesso temporário somente ao cardápio e às configurações operacionais. Nenhum acesso a pagamentos, dados bancários ou credenciais.</p>
        </div>
      </header>
      {error && <p role="alert" className="error">{error}</p>}
      {notice && <p role="status" className="notice">{notice}</p>}
      {mode === 'super' && initial?.authorized && !active ? (
        <S.Grant>
          <strong><ShieldCheck aria-hidden="true" /> Implantação inicial liberada</strong>
          <p>Acesso operacional inicial disponível até {dateTime(initial.expiresAt)}. Ao concluir a implantação, novos acessos exigirão autorização do cliente.</p>
          <button type="button" onClick={onAuthorized}>Abrir configurações do restaurante</button>
        </S.Grant>
      ) : active ? (
        <S.Grant>
          <strong>Acesso autorizado até {dateTime(active.expiresAt)}</strong>
          <p>O administrador pode revogar esta permissão a qualquer momento.</p>
          {mode === 'admin' ? (
            <button type="button" disabled={busy} onClick={() => void run(
              () => api.post(base + '/' + active.id + '/revoke'),
              'O acesso foi revogado.',
            )}><ShieldX aria-hidden="true" /> Revogar agora</button>
          ) : <button type="button" disabled={busy} onClick={onAuthorized}>Abrir configurações do restaurante</button>}
        </S.Grant>
      ) : pending ? (
        <S.Grant>
          <strong><Clock3 aria-hidden="true" /> Solicitação aguardando autorização</strong>
          <p>{pending.reason}</p>
          {mode === 'admin' ? (
            <>
              <label>
                Tempo de acesso
                <select value={hours} onChange={(event) => setHours(Number(event.target.value))}>
                  <option value={1}>1 hora</option>
                  <option value={2}>2 horas</option>
                  <option value={4}>4 horas</option>
                  <option value={8}>8 horas</option>
                  <option value={24}>24 horas</option>
                </select>
              </label>
              <S.Actions>
                <button type="button" disabled={busy} onClick={() => void run(
                  () => api.patch(base + '/' + pending.id, { approve: false }),
                  'Solicitação recusada.',
                )}>Recusar</button>
                <button type="button" disabled={busy} onClick={() => void run(
                  () => api.patch(base + '/' + pending.id, { approve: true, hours }),
                  'Acesso autorizado temporariamente.',
                )}><ShieldCheck aria-hidden="true" /> Autorizar acesso</button>
              </S.Actions>
            </>
          ) : <p>Aguarde a aprovação pelo administrador do restaurante.</p>}
        </S.Grant>
      ) : mode === 'super' ? (
        <S.Grant>
          <label>
            Motivo da solicitação
            <textarea maxLength={500} rows={3} value={reason} onChange={(event) => setReason(event.target.value)} />
          </label>
          <button type="button" disabled={busy || reason.trim().length < 10}
            onClick={() => void run(
              () => api.post(base, { reason: reason.trim() }),
              'Solicitação enviada ao administrador.',
            )}>
            Solicitar autorização
          </button>
        </S.Grant>
      ) : <p>Não há nenhuma solicitação de suporte para configuração do restaurante.</p>}
      <S.History>
        <div className="title"><strong>Histórico de solicitações</strong>
          <button type="button" onClick={() => void load()} aria-label="Atualizar autorizações"><RefreshCw aria-hidden="true" /></button>
        </div>
        {grants.slice(0, 5).map((grant) => (
          <p key={grant.id}>{dateTime(grant.requestedAt)} — {grant.status === 'PENDING' ? 'Pendente' :
            grant.status === 'APPROVED' && grant.expiresAt && new Date(grant.expiresAt).getTime() <= observedAt ? 'Expirado' :
            ({ APPROVED: 'Autorizado', REVOKED: 'Revogado', REJECTED: 'Recusado', EXPIRED: 'Expirado' } as Record<string, string>)[grant.status] || grant.status}</p>
        ))}
        {grants.length === 0 && <p>Nenhuma solicitação registrada.</p>}
      </S.History>
    </S.Panel>
  );
}
