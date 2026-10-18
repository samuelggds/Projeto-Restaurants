import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Printer, Save, ShieldCheck } from 'lucide-react';
import superAdminService from '../../../Services/superAdminService';
import * as S from './ManagedRestaurantWorkspace.styles';

type PrinterSettings = {
  enabled: boolean;
  autoPrintEnabled: boolean;
  autoPrintTrigger: 'NEW_ORDER' | 'PAYMENT_CONFIRMED';
  paperWidth: 'MM58' | 'MM80';
  copies: number;
};
type Configuration = {
  settings: PrinterSettings;
  agent: { name: string; printerName: string | null; online: boolean; lastSeenAt: string | null } | null;
};

export function ManagedPrinterSettings({ restaurantId }: { restaurantId: number }) {
  const [configuration, setConfiguration] = useState<Configuration | null>(null);
  const [draft, setDraft] = useState<PrinterSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    try {
      const result = await superAdminService.getManagedPrinterSettings(restaurantId) as Configuration;
      setConfiguration(result);
      setDraft(result.settings);
      setError('');
    } catch {
      setError('Não foi possível carregar a configuração da impressora.');
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft || saving) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const result = await superAdminService.updateManagedPrinterSettings(restaurantId, draft) as PrinterSettings;
      setDraft(result);
      setMessage('Configurações de impressão atualizadas.');
      await load();
    } catch (cause) {
      const response = cause as { response?: { data?: { error?: string } } };
      setError(response.response?.data?.error || 'Não foi possível salvar.');
    } finally { setSaving(false); }
  };

  if (loading && !draft) return <S.Loading role="status">Carregando impressão...</S.Loading>;
  return (
    <S.Form className="settings" onSubmit={(event) => void save(event)}>
      <S.SectionTitle><div><small>COZINHA</small><h3><Printer size={17} /> Impressão de comandas</h3></div></S.SectionTitle>
      <p className="security-note"><ShieldCheck size={15} /> Somente opções operacionais. Códigos de conexão e credenciais do agente ficam exclusivamente com o administrador do restaurante.</p>
      {error && <S.Alert role="alert" $error>{error}</S.Alert>}
      {message && <S.Alert role="status">{message}</S.Alert>}
      {configuration?.agent && <p>Agente: {configuration.agent.name} — {configuration.agent.online ? 'Online' : 'Offline'}{configuration.agent.printerName ? ' · ' + configuration.agent.printerName : ''}</p>}
      {draft ? <>
        <S.Checks>
          <label><input type="checkbox" checked={draft.enabled} onChange={(event) => setDraft((s) => s ? { ...s, enabled: event.target.checked } : s)} />Ativar impressão</label>
          <label><input type="checkbox" checked={draft.autoPrintEnabled} onChange={(event) => setDraft((s) => s ? { ...s, autoPrintEnabled: event.target.checked } : s)} />Imprimir automaticamente</label>
        </S.Checks>
        <S.Two>
          <label>Disparo automático
            <select value={draft.autoPrintTrigger} onChange={(event) => setDraft((s) => s ? { ...s, autoPrintTrigger: event.target.value as PrinterSettings['autoPrintTrigger'] } : s)}>
              <option value="NEW_ORDER">Novo pedido operacional</option>
              <option value="PAYMENT_CONFIRMED">Pagamento confirmado</option>
            </select>
          </label>
          <label>Tamanho do papel
            <select value={draft.paperWidth} onChange={(event) => setDraft((s) => s ? { ...s, paperWidth: event.target.value as PrinterSettings['paperWidth'] } : s)}>
              <option value="MM58">58 mm</option>
              <option value="MM80">80 mm</option>
            </select>
          </label>
          <label>Quantidade de cópias
            <input type="number" min={1} max={5} required value={draft.copies} onChange={(event) => setDraft((s) => s ? { ...s, copies: Number(event.target.value) } : s)} />
          </label>
        </S.Two>
        <S.FormActions><button className="primary" disabled={saving || !Number.isInteger(draft.copies) || draft.copies < 1 || draft.copies > 5}><Save />{saving ? 'Salvando...' : 'Salvar impressão'}</button></S.FormActions>
      </> : null}
    </S.Form>
  );
}
