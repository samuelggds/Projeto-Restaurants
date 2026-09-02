import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, RefreshCw } from 'lucide-react';

import courierCompensationService, {
  type CourierSettlement,
} from '../../../Services/courierCompensationService';
import { useAppDialog } from '../../../components/AppDialog/context';
import { COURIER_LIST_BATCH_SIZE, CourierListControls } from './CourierListControls';
import * as S from './CourierSettlementsPanel.styles';

function money(value: number) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function CourierSettlementsPanel() {
  const { confirmDialog } = useAppDialog();
  const [settlements, setSettlements] = useState<CourierSettlement[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [disputing, setDisputing] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [visibleLimit, setVisibleLimit] = useState(COURIER_LIST_BATCH_SIZE);

  const load = useCallback(async () => {
    try {
      setSettlements(await courierCompensationService.listCourierSettlements());
      setError('');
    } catch {
      setError('Não foi possível carregar seus acertos agora.');
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  const actionable = settlements.filter((entry) =>
    ['AWAITING_COURIER_CONFIRMATION', 'DISPUTED'].includes(entry.status),
  );
  const visibleSettlements = actionable.slice(0, visibleLimit);

  async function confirm(entry: CourierSettlement) {
    const accepted = await confirmDialog({
      title: 'Confirmar recebimento do acerto?',
      description: `Confirme somente se os valores conferem. Saldo informado: ${money(entry.netAmount)}.`,
      confirmLabel: 'Confirmar recebimento',
    });
    if (!accepted) return;
    setBusy(entry.publicId);
    try {
      await courierCompensationService.confirmSettlement(entry.publicId);
      await load();
    } catch {
      setError('O acerto não pôde ser confirmado. Atualize e confira o status.');
    } finally {
      setBusy(null);
    }
  }

  async function dispute(entry: CourierSettlement) {
    if (reason.trim().length < 5) {
      setError('Explique a divergência com pelo menos 5 caracteres.');
      return;
    }
    setBusy(entry.publicId);
    try {
      await courierCompensationService.disputeSettlement(entry.publicId, reason.trim());
      setDisputing(null);
      setReason('');
      await load();
    } catch {
      setError('Não foi possível registrar a divergência.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <S.Panel>
      <div className="heading">
        <div>
          <h2>Acertos para conferir</h2>
          <p>O pagamento só é concluído depois da sua confirmação.</p>
        </div>
        <button
          className="dispute"
          type="button"
          onClick={() => void load()}
          aria-label="Atualizar acertos"
        >
          <RefreshCw size={15} />
        </button>
      </div>
      {error ? (
        <span className="error" role="alert">
          {error}
        </span>
      ) : null}
      <div className="list">
        {visibleSettlements.map((entry) => (
          <article className="item" key={entry.publicId}>
            <div>
              <small>{entry.items.length} entrega(s) neste acerto</small>
              <div className="amount">{money(entry.netAmount)}</div>
              <span className="status">
                {entry.status === 'DISPUTED'
                  ? 'DIVERGÊNCIA REGISTRADA'
                  : 'AGUARDANDO SUA CONFIRMAÇÃO'}
              </span>
            </div>
            {entry.status === 'AWAITING_COURIER_CONFIRMATION' ? (
              <div className="actions">
                <button
                  className="dispute"
                  type="button"
                  onClick={() => {
                    setDisputing(entry.publicId);
                    setReason('');
                  }}
                >
                  Informar divergência
                </button>
                <button
                  className="confirm"
                  type="button"
                  disabled={busy === entry.publicId}
                  onClick={() => void confirm(entry)}
                >
                  <CheckCircle2 size={15} /> Confirmar
                </button>
              </div>
            ) : null}
            {disputing === entry.publicId ? (
              <div className="dispute-box">
                <textarea
                  aria-label="Motivo da divergência"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  maxLength={500}
                  placeholder="Explique qual valor ou entrega não confere"
                />
                <div className="actions">
                  <button className="dispute" onClick={() => setDisputing(null)}>
                    Voltar
                  </button>
                  <button
                    className="confirm"
                    disabled={busy === entry.publicId}
                    onClick={() => void dispute(entry)}
                  >
                    Enviar divergência
                  </button>
                </div>
              </div>
            ) : null}
          </article>
        ))}
        {!actionable.length ? (
          <div className="empty">Nenhum acerto aguardando sua ação.</div>
        ) : null}
      </div>
      <CourierListControls
        visibleCount={visibleSettlements.length}
        totalCount={actionable.length}
        itemLabel="acertos"
        onShowMore={() =>
          setVisibleLimit((current) =>
            Math.min(current + COURIER_LIST_BATCH_SIZE, actionable.length),
          )
        }
        onReset={() => setVisibleLimit(COURIER_LIST_BATCH_SIZE)}
      />
    </S.Panel>
  );
}
