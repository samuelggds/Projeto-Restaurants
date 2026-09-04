import { useCallback, useEffect, useState } from 'react';
import { CreditCard, RefreshCw } from 'lucide-react';
import paymentTerminalService, {
  type PaymentTerminal,
  type TerminalCourier,
} from '../../../Services/paymentTerminalService';
import * as S from './PaymentTerminalSettings.styles';

type Props = {
  mercadoPagoConnected: boolean;
};

function errorMessage(error: unknown) {
  if (!error || typeof error !== 'object') return 'Não foi possível concluir esta ação.';
  const typed = error as {
    response?: { data?: { error?: unknown } };
    message?: unknown;
  };
  return String(typed.response?.data?.error || typed.message || 'Não foi possível concluir esta ação.');
}

export function PaymentTerminalSettings({ mercadoPagoConnected }: Props) {
  const [terminals, setTerminals] = useState<PaymentTerminal[]>([]);
  const [couriers, setCouriers] = useState<TerminalCourier[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingTerminalId, setSavingTerminalId] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!mercadoPagoConnected) return;
    try {
      const snapshot = await paymentTerminalService.list();
      setTerminals(snapshot.terminals || []);
      setCouriers(snapshot.couriers || []);
      setError('');
    } catch (loadError) {
      setError(errorMessage(loadError));
    }
  }, [mercadoPagoConnected]);

  useEffect(() => {
    void load();
  }, [load]);

  const sync = async () => {
    setLoading(true);
    setError('');
    try {
      const snapshot = await paymentTerminalService.syncMercadoPago();
      setTerminals(snapshot.terminals || []);
      setCouriers(snapshot.couriers || []);
    } catch (syncError) {
      setError(errorMessage(syncError));
    } finally {
      setLoading(false);
    }
  };

  const assign = async (terminal: PaymentTerminal, value: string) => {
    const courierId = value ? Number(value) : null;
    setSavingTerminalId(terminal.publicId);
    setError('');
    try {
      await paymentTerminalService.assign(terminal.publicId, courierId);
      await load();
    } catch (assignError) {
      setError(errorMessage(assignError));
    } finally {
      setSavingTerminalId('');
    }
  };

  return (
    <S.Section aria-labelledby="payment-terminals-title">
      <S.Header>
        <div>
          <span>MAQUININHAS INTEGRADAS</span>
          <h3 id="payment-terminals-title">Mercado Pago Point</h3>
          <p>
            Sincronize as maquininhas da conta Mercado Pago e atribua cada terminal a um
            motoqueiro. Pedidos com cartão na entrega serão enviados automaticamente para a Point
            vinculada ao entregador.
          </p>
        </div>
        <S.SyncButton
          type="button"
          onClick={() => void sync()}
          disabled={!mercadoPagoConnected || loading}
        >
          <RefreshCw size={17} />
          {loading ? 'Sincronizando...' : 'Sincronizar maquininhas'}
        </S.SyncButton>
      </S.Header>

      {!mercadoPagoConnected && (
        <S.Notice>
          Conecte primeiro a conta Mercado Pago do restaurante acima. Depois disso, as Point
          vinculadas a essa conta poderão ser sincronizadas aqui.
        </S.Notice>
      )}
      {error && <S.Notice $error>{error}</S.Notice>}

      {mercadoPagoConnected && terminals.length === 0 ? (
        <S.Empty>
          <CreditCard size={24} />
          <br />
          Nenhuma maquininha sincronizada. Confirme que a Point pertence à conta Mercado Pago do
          restaurante e use “Sincronizar maquininhas”.
        </S.Empty>
      ) : (
        <S.Grid>
          {terminals.map((terminal) => (
            <S.Card key={terminal.publicId} $active={terminal.active}>
              <S.CardTop>
                <div>
                  <strong>Point • {terminal.serial}</strong>
                  <small>{terminal.externalPosId || terminal.providerTerminalId}</small>
                </div>
                <S.Badge $ok={terminal.active && terminal.operatingMode === 'PDV'}>
                  {terminal.active
                    ? terminal.operatingMode === 'PDV'
                      ? 'PDV integrado'
                      : terminal.operatingMode || 'Ativa'
                    : 'Indisponível'}
                </S.Badge>
              </S.CardTop>

              <S.Meta>
                <span>
                  POS <b>{terminal.posId || '—'}</b>
                </span>
                <span>
                  Loja <b>{terminal.storeId || '—'}</b>
                </span>
                <span>
                  Motoqueiro <b>{terminal.courierName || 'Não atribuído'}</b>
                </span>
              </S.Meta>

              <S.Field>
                Atribuir maquininha
                <select
                  value={terminal.assignedCourierId ? String(terminal.assignedCourierId) : ''}
                  disabled={!terminal.active || savingTerminalId === terminal.publicId}
                  onChange={(event) => void assign(terminal, event.target.value)}
                >
                  <option value="">Sem motoqueiro</option>
                  {couriers.map((courier) => (
                    <option key={courier.id} value={courier.id}>
                      {courier.name}
                    </option>
                  ))}
                </select>
              </S.Field>
            </S.Card>
          ))}
        </S.Grid>
      )}
    </S.Section>
  );
}
