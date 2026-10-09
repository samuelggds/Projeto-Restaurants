import { useEffect, useState } from 'react';
import styled from 'styled-components';
import restaurantSettingsService from '../../../Services/restaurantSettingsService';
import * as S from '../Admin.styles';

type Status = 'NOT_REQUESTED' | 'REQUESTED' | 'IN_REVIEW' | 'ACTION_REQUIRED' | 'SUSPENDED';

type Connection = {
  provider: 'LALAMOVE';
  status: Status;
  connected: boolean;
  canDispatch: boolean;
  requestedAt: string | null;
};

const Surface = styled.div`
  display: grid;
  gap: 14px;
`;
const State = styled.p`
  margin: 0;
  font-weight: 700;
`;
const Text = styled.p`
  margin: 0;
  color: #625c58;
  font-size: 13px;
  line-height: 1.55;
`;
const Button = styled.button`
  padding: 12px 18px;
  width: fit-content;
  max-width: 100%;
  border: 0;
  border-radius: 8px;
  color: white;
  background: #e04c35;
  font-weight: 700;
  cursor: pointer;
  &:disabled { cursor: not-allowed; opacity: 0.6; }
`;
const labels: Record<Status, string> = {
  NOT_REQUESTED: 'Ainda não solicitado',
  REQUESTED: 'Solicitação recebida',
  IN_REVIEW: 'Em análise',
  ACTION_REQUIRED: 'Aguardando informações',
  SUSPENDED: 'Solicitação suspensa',
};

function readableError(error: unknown) {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { error?: unknown } } }).response;
    if (typeof response?.data?.error === 'string') return response.data.error;
  }
  return 'Não foi possível comunicar com o servidor. Tente novamente.';
}

export function LalamoveConnection() {
  const [connection, setConnection] = useState<Connection | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    restaurantSettingsService.getLalamoveConnection()
      .then((response: Connection) => {
        if (active) setConnection(response);
      })
      .catch((reason: unknown) => {
        if (active) setError(readableError(reason));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  async function requestConnection() {
    if (sending || connection?.status !== 'NOT_REQUESTED') return;
    setSending(true);
    setError('');
    try {
      const response = await restaurantSettingsService.requestLalamoveConnection();
      setConnection(response as Connection);
    } catch (reason) {
      setError(readableError(reason));
    } finally {
      setSending(false);
    }
  }

  return (
    <S.SettingSection>
      <S.Card>
        <Surface>
          <h2>Entregadores parceiros — Lalamove</h2>
          <Text>
            Use motoboys próprios ou solicite a integração assistida com a Lalamove.
            Você não precisa informar chaves de API nesta tela.
          </Text>
          <State role="status">
            Status: {loading ? 'Consultando...' : connection ? labels[connection.status] : 'Indisponível'}
          </State>
          {connection?.connected ? (
            <Text>Conexão ativa. A liberação de entregas depende da homologação.</Text>
          ) : connection?.status !== 'NOT_REQUESTED' && connection ? (
            <Text>
              Recebemos sua solicitação. Nossa equipe deverá concluir a configuração
              e confirmar os requisitos da Lalamove antes de liberar as entregas.
            </Text>
          ) : (
            <Text>
              O processo começa com uma solicitação, não com uma conexão automática.
              Nenhum frete será contratado nesta etapa.
            </Text>
          )}
          {error && <Text role="alert">{error}</Text>}
          <Button
            type="button"
            aria-label="Solicitar conexão assistida Lalamove"
            disabled={loading || sending || !connection || connection.status !== 'NOT_REQUESTED'}
            onClick={() => void requestConnection()}
          >
            {sending ? 'Enviando...' : connection?.status === 'NOT_REQUESTED'
              ? 'Solicitar conexão Lalamove'
              : 'Solicitação registrada'}
          </Button>
          <Text>
            Para pedidos de comida, o parceiro deve disponibilizar moto com bolsa térmica.
            A contratação só será liberada após essa confirmação.
          </Text>
        </Surface>
      </S.Card>
    </S.SettingSection>
  );
}
