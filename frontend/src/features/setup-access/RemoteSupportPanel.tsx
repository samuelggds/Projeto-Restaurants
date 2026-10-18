import { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2, Clock3, Laptop, LifeBuoy, Monitor, RefreshCw, ShieldCheck,
  ShieldX, Smartphone, Square, XCircle,
} from 'lucide-react';
import api from '../../Services/api';
import { getAccessToken } from '../../modules/auth/session/authSession';
import { acquireSocket } from '../../Services/socketService';
import * as S from './RemoteSupportPanel.styles';

type Device = 'WINDOWS' | 'ANDROID' | 'IOS';
type Session = {
  id: string;
  reason: string;
  device: Device;
  status: string;
  requestedAt: string;
  expiresAt: string;
};
type Props = { restaurantId: number; mode: 'admin' | 'super' };
const deviceLabels: Record<Device, string> = {
  WINDOWS: 'Computador Windows',
  ANDROID: 'Celular Android',
  IOS: 'iPhone ou iPad',
};
const deviceIcons = {
  WINDOWS: Monitor,
  ANDROID: Smartphone,
  IOS: Smartphone,
};
const statuses: Record<string, string> = {
  PENDING: 'Aguardando aprovação',
  APPROVED: 'Autorizado',
  CLOSED: 'Encerrado',
  REJECTED: 'Recusado',
  EXPIRED: 'Expirado',
};
function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Data indisponível'
    : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}
function errorMessage(error: unknown) {
  const response = error as { response?: { data?: { error?: string } } };
  return response.response?.data?.error || 'Não foi possível concluir a operação. Tente novamente.';
}

export function RemoteSupportPanel({ restaurantId, mode }: Props) {
  const base = mode === 'super'
    ? '/super-admin/managed-service/restaurants/' + restaurantId + '/remote-support'
    : '/managed-service/remote-support/' + restaurantId;
  const [items, setItems] = useState<Session[]>([]);
  const [reason, setReason] = useState('Configuração de impressora térmica e periféricos para o funcionamento do restaurante.');
  const [device, setDevice] = useState<Device>('WINDOWS');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [observedAt, setObservedAt] = useState(0);

  const load = useCallback(async () => {
    try {
      const response = await api.get<Session[]>(base);
      if (!Array.isArray(response.data)) throw new Error('Resposta inválida');
      setItems(response.data);
      setObservedAt(Date.now());
      setError('');
    } catch {
      setError('Não foi possível consultar as solicitações de suporte remoto.');
    } finally {
      setLoading(false);
    }
  }, [base]);

  useEffect(() => {
    const initial = window.setTimeout(() => void load(), 0);
    const interval = window.setInterval(() => void load(), 30_000);
    return () => { window.clearTimeout(initial); window.clearInterval(interval); };
  }, [load]);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    const { socket, release } = acquireSocket(token, 'remote-support:' + mode + ':' + restaurantId);
    const listener = (payload: { restaurantId?: number }) => {
      if (Number(payload?.restaurantId) === restaurantId) void load();
    };
    socket.on('remote-support:changed', listener);
    return () => { socket.off('remote-support:changed', listener); release(); };
  }, [mode, restaurantId, load]);

  const pending = items.find((item) => item.status === 'PENDING' && new Date(item.expiresAt).getTime() > observedAt);
  const approved = items.find((item) => item.status === 'APPROVED' && new Date(item.expiresAt).getTime() > observedAt);
  const current = approved || pending;
  const DeviceIcon = deviceIcons[current?.device || device];

  async function execute(operation: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    setError('');
    try { await operation(); await load(); }
    catch (cause) { setError(errorMessage(cause)); }
    finally { setBusy(false); }
  }
  const end = (id: string) => execute(() => api.post(base + '/' + id + '/close'));

  return (
    <S.Panel aria-label="Suporte remoto com autorização">
      <S.Heading>
        <S.IconBubble><LifeBuoy aria-hidden="true" /></S.IconBubble>
        <div>
          <h3>Suporte remoto</h3>
          <p>Assistência supervisionada para configurar impressoras, drivers e dispositivos do restaurante.</p>
        </div>
        <S.StatusBadge data-state={approved ? 'APPROVED' : pending ? 'PENDING' : 'IDLE'}>
          {approved ? <CheckCircle2 aria-hidden="true" /> : <ShieldCheck aria-hidden="true" />}
          {approved ? 'Autorizado' : pending ? 'Pendente' : 'Disponível'}
        </S.StatusBadge>
      </S.Heading>

      <S.Content>
        <S.SecurityNotice><ShieldCheck aria-hidden="true" />
          <p>O cliente precisa aprovar esta solicitação no GastroNexa e confirmar o compartilhamento de tela no dispositivo. Esta permissão <strong>não dá controle automático</strong> e não libera dados financeiros.</p>
        </S.SecurityNotice>
        {error ? <S.Feedback role="alert">{error}</S.Feedback> : null}
        {loading && !observedAt ? <S.Muted role="status">Carregando autorizações...</S.Muted> : null}

        {current ? (
          <S.ActiveCard>
            <S.SessionIdentity>
              <DeviceIcon aria-hidden="true" />
              <div>
                <strong>{deviceLabels[current.device]}</strong>
                <span>{current.reason}</span>
              </div>
            </S.SessionIdentity>
            {approved ? (
              <>
                <S.TimeNotice><Clock3 aria-hidden="true" />
                  Autorização válida até <strong>{formatDate(approved.expiresAt)}</strong>
                </S.TimeNotice>
                <S.Instructions>
                  <h4><Laptop aria-hidden="true" /> Como iniciar a assistência</h4>
                  {approved.device === 'WINDOWS' ? (
                    <ol>
                      <li>Nos dois computadores, abra a <strong>Assistência Rápida</strong> com <kbd>Ctrl</kbd> + <kbd>Windows</kbd> + <kbd>Q</kbd>.</li>
                      <li>O suporte escolhe <strong>Ajudar alguém</strong> e compartilha o código temporário em um canal privado.</li>
                      <li>O administrador insere o código em <strong>Obter ajuda</strong>, permite compartilhar a tela e, se desejar, autoriza o controle.</li>
                    </ol>
                  ) : (
                    <p>No celular, o compartilhamento depende de um aplicativo compatível e da autorização adicional no aparelho. O GastroNexa não assume o controle do dispositivo.</p>
                  )}
                  <p className="safety">Quando terminar, encerre a sessão também no aplicativo remoto. Revogar no GastroNexa não desconecta automaticamente a Assistência Rápida.</p>
                </S.Instructions>
              </>
            ) : (
              <S.TimeNotice><Clock3 aria-hidden="true" />
                Solicitação pendente até <strong>{formatDate(pending!.expiresAt)}</strong>
              </S.TimeNotice>
            )}
            {pending && mode === 'admin' ? (
              <S.Actions>
                <S.Button type="button" disabled={busy} onClick={() => void execute(() => api.patch(base + '/' + pending.id, { approve: false }))}>
                  <XCircle aria-hidden="true" /> Recusar
                </S.Button>
                <S.Button $primary type="button" disabled={busy} onClick={() => void execute(() => api.patch(base + '/' + pending.id, { approve: true }))}>
                  <ShieldCheck aria-hidden="true" /> Autorizar por 30 minutos
                </S.Button>
              </S.Actions>
            ) : pending ? <S.Muted>Aguardando a autorização do administrador do restaurante.</S.Muted> : null}
            <S.Actions>
              <S.Button $danger type="button" disabled={busy} onClick={() => void end(current.id)}>
                <Square aria-hidden="true" /> {approved ? 'Encerrar autorização' : 'Cancelar solicitação'}
              </S.Button>
            </S.Actions>
          </S.ActiveCard>
        ) : mode === 'super' && !loading ? (
          <S.Form onSubmit={(event) => {
            event.preventDefault();
            void execute(() => api.post(base, { reason: reason.trim(), device }));
          }}>
            <label>Dispositivo do cliente
              <select value={device} onChange={(event) => setDevice(event.target.value as Device)}>
                <option value="WINDOWS">Computador Windows</option>
                <option value="ANDROID">Celular Android</option>
                <option value="IOS">iPhone / iPad</option>
              </select>
            </label>
            <label>Motivo da assistência
              <textarea rows={3} minLength={10} maxLength={500} required value={reason} onChange={(event) => setReason(event.target.value)} />
            </label>
            <S.Actions>
              <S.Button $primary type="submit" disabled={busy || reason.trim().length < 10}>
                <ShieldCheck aria-hidden="true" /> Solicitar autorização remota
              </S.Button>
            </S.Actions>
          </S.Form>
        ) : !loading ? (
          <S.Empty><ShieldCheck aria-hidden="true" /><p>Não há solicitações pendentes. Você poderá aceitar ou recusar um novo atendimento aqui.</p></S.Empty>
        ) : null}
      </S.Content>

      <S.Footer>
        <div>
          <strong>Última solicitação</strong>
          {items[0] ? <span>{formatDate(items[0].requestedAt)} · {items[0].status === 'APPROVED' && !approved && !pending && new Date(items[0].expiresAt).getTime() <= observedAt ? 'Expirado' : statuses[items[0].status] || items[0].status}</span> : <span>Nenhuma solicitação registrada</span>}
        </div>
        <S.Refresh type="button" disabled={busy || loading} onClick={() => void load()} aria-label="Atualizar status do suporte remoto">
          <RefreshCw aria-hidden="true" /> Atualizar
        </S.Refresh>
      </S.Footer>
    </S.Panel>
  );
}
