import { useCallback, useEffect, useState } from 'react';
import api from '../../Services/api';
import { getAccessToken } from '../../modules/auth/session/authSession';
import { acquireSocket } from '../../Services/socketService';

type Session = {
  id: string;
  reason: string;
  device: 'WINDOWS' | 'ANDROID' | 'IOS';
  status: string;
  requestedAt: string;
  expiresAt: string;
};
type Props = { restaurantId: number; mode: 'admin' | 'super' };
const deviceLabels = { WINDOWS: 'Computador Windows', ANDROID: 'Celular Android', IOS: 'iPhone / iPad' };
export function RemoteSupportPanel({ restaurantId, mode }: Props) {
  const base = mode === 'super'
    ? '/super-admin/managed-service/restaurants/' + restaurantId + '/remote-support'
    : '/managed-service/remote-support/' + restaurantId;
  const [items, setItems] = useState<Session[]>([]);
  const [reason, setReason] = useState('Configuração de impressora térmica e periféricos para o funcionamento do restaurante.');
  const [device, setDevice] = useState<Session['device']>('WINDOWS');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(0);
  const load = useCallback(async () => {
    try { const response = await api.get<Session[]>(base); setItems(response.data); setError(''); setUpdatedAt(Date.now()); }
    catch { setError('Não foi possível consultar o suporte remoto.'); }
  }, [base]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    const { socket, release } = acquireSocket(token, 'remote-support:' + mode + ':' + restaurantId);
    const listener = (payload: { restaurantId?: number }) => {
      if (payload?.restaurantId === restaurantId) void load();
    };
    socket.on('remote-support:changed', listener);
    return () => { socket.off('remote-support:changed', listener); release(); };
  }, [mode, restaurantId, load]);
  useEffect(() => {
    const interval = window.setInterval(() => {
      // Status é atualizado pela API; o horário local nunca concede permissão.
      if (Date.now() - updatedAt > 30_000) void load();
    }, 30_000);
    return () => window.clearInterval(interval);
  }, [load, updatedAt]);
  const pending = items.find(item => item.status === 'PENDING' && new Date(item.expiresAt).getTime() > Date.now());
  const approved = items.find(item => item.status === 'APPROVED' && new Date(item.expiresAt).getTime() > Date.now());
  const execute = async (operation: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    setError('');
    try { await operation(); await load(); }
    catch (cause) {
      const response = cause as { response?: { data?: { error?: string } } };
      setError(response.response?.data?.error || 'Não foi possível concluir a operação.');
    }
    finally { setBusy(false); }
  };
  const end = (id: string) => execute(() => api.post(base + '/' + id + '/close'));
  return (
    <section aria-label="Suporte remoto autorizado" style={{ display: 'grid', gap: 12, border: '1px solid #e4ded9', borderRadius: 12, padding: 16, background: '#fff' }}>
      <div><h3 style={{ margin: 0 }}>Suporte remoto com autorização</h3><p style={{ marginBottom: 0 }}>Acesso supervisionado para ajudar a configurar impressoras e dispositivos. Não permite acesso financeiro nem controle automático do aparelho.</p></div>
      {error ? <p role="alert" style={{ color: '#b42318' }}>{error}</p> : null}
      {approved ? (
        <div style={{ display: 'grid', gap: 8 }}>
          <strong>Autorizado — {deviceLabels[approved.device]}</strong>
          <p>{approved.reason}</p>
          <p>Permissão válida até {new Date(approved.expiresAt).toLocaleString('pt-BR')}. Para iniciar uma conexão Windows, ambos devem abrir a Assistência Rápida e o cliente deve aprovar o código e o controle dentro do próprio Windows.</p>
          {approved.device === 'WINDOWS' ? (
            <p>Windows: pressione <kbd>Ctrl</kbd> + <kbd>Windows</kbd> + <kbd>Q</kbd> ou procure por <strong>Assistência Rápida</strong> no menu Iniciar. Não envie códigos de sessão por mensagens públicas.</p>
          ) : (
            <p>Para celular, o compartilhamento ou controle depende de uma ferramenta compatível e de autorização adicional no aparelho. A autorização no painel, sozinha, não controla o dispositivo.</p>
          )}
          <button type="button" disabled={busy} onClick={() => void end(approved.id)}>Encerrar autorização</button>
        </div>
      ) : pending ? (
        <div style={{ display: 'grid', gap: 8 }}>
          <strong>Solicitação pendente — {deviceLabels[pending.device]}</strong>
          <p>{pending.reason}</p>
          <p>O suporte terá até 30 minutos de autorização após a aprovação, e o cliente ainda precisará consentir no aplicativo remoto.</p>
          {mode === 'admin' ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <button type="button" disabled={busy} onClick={() => void execute(() => api.patch(base + '/' + pending.id, { approve: false }))}>Recusar</button>
              <button type="button" disabled={busy} onClick={() => void execute(() => api.patch(base + '/' + pending.id, { approve: true }))}>Autorizar suporte remoto</button>
            </div>
          ) : <p>Aguardando resposta do administrador do restaurante.</p>}
          <button type="button" disabled={busy} onClick={() => void end(pending.id)}>{mode === 'admin' ? 'Cancelar solicitação' : 'Retirar solicitação'}</button>
        </div>
      ) : mode === 'super' ? (
        <div style={{ display: 'grid', gap: 8 }}>
          <label style={{ display: 'grid', gap: 5 }}>Dispositivo
            <select value={device} onChange={event => setDevice(event.target.value as Session['device'])}>
              <option value="WINDOWS">Computador Windows</option>
              <option value="ANDROID">Android</option>
              <option value="IOS">iPhone / iPad</option>
            </select>
          </label>
          <label style={{ display: 'grid', gap: 5 }}>Motivo da assistência
            <textarea rows={3} maxLength={500} value={reason} onChange={event => setReason(event.target.value)} />
          </label>
          <button type="button" disabled={busy || reason.trim().length < 10} onClick={() => void execute(() => api.post(base, { reason, device }))}>Solicitar autorização remota</button>
        </div>
      ) : <p>Não há suporte remoto pendente. Quando a plataforma solicitar ajuda, você poderá autorizar ou recusar aqui.</p>}
      {items.length ? <p style={{ fontSize: 12 }}>Última solicitação: {new Date(items[0].requestedAt).toLocaleString('pt-BR')} · {items[0].status}</p> : null}
      <button type="button" onClick={() => void load()} aria-label="Atualizar solicitações de suporte remoto">Atualizar status</button>
    </section>
  );
}
