import { FormEvent, useEffect, useMemo, useState } from 'react';
import { LogIn, Phone, UserRound } from 'lucide-react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import tableSessionService from '../../Services/tableSessionService';
import DigitalMenuEntryPage from './DigitalMenuEntryPage';

const Page = styled.main`
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px 16px;
  background: #fffaf5;
`;

const Card = styled.section`
  width: min(430px, 100%);
  padding: 24px;
  border: 1px solid #eadfd6;
  border-radius: 22px;
  background: #fff;
  box-shadow: 0 18px 50px rgba(54, 37, 25, 0.12);

  .eyebrow {
    color: #d64d08;
    font-size: 12px;
    font-weight: 850;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  h1 {
    margin: 8px 0 6px;
    color: #211c18;
    font-size: clamp(22px, 7vw, 28px);
  }

  p {
    margin: 0 0 18px;
    color: #756b63;
    font-size: 14px;
    line-height: 1.5;
  }

  form {
    display: grid;
    gap: 13px;
  }

  label {
    display: grid;
    gap: 6px;
    color: #3e3630;
    font-size: 12px;
    font-weight: 800;
  }

  .field {
    min-height: 48px;
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 0 13px;
    border: 1px solid #dfd5cc;
    border-radius: 12px;
    background: #fff;
  }

  .field:focus-within {
    border-color: #d64d08;
    box-shadow: 0 0 0 3px rgba(214, 77, 8, 0.12);
  }

  .field svg {
    width: 18px;
    color: #d64d08;
  }

  input {
    min-width: 0;
    flex: 1;
    border: 0;
    outline: 0;
    background: transparent;
    color: #211c18;
    font: inherit;
  }

  button {
    min-height: 48px;
    border: 0;
    border-radius: 12px;
    font: inherit;
    font-size: 14px;
    font-weight: 850;
    cursor: pointer;
  }

  .primary {
    margin-top: 4px;
    background: #d64d08;
    color: #fff;
  }

  .secondary {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border: 1px solid #e4dad1;
    background: #fff;
    color: #433b35;
  }

  button:disabled {
    cursor: wait;
    opacity: 0.65;
  }

  .error {
    margin: 0;
    padding: 10px 12px;
    border-radius: 10px;
    background: #fff2ef;
    color: #a4311e;
    font-size: 12px;
    font-weight: 700;
  }

  .privacy {
    margin: 2px 0 0;
    color: #8a8179;
    font-size: 11px;
    line-height: 1.45;
  }
`;

const Loading = styled(Page)`
  color: #756b63;
  font-size: 14px;
  font-weight: 700;
`;

function positiveInteger(value: unknown) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export default function DigitalMenuIdentityEntryPage() {
  const { tableNumber, restaurantSlug } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<'checking' | 'identity' | 'ready'>('checking');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const context = useMemo(
    () => ({
      tableNumber: positiveInteger(tableNumber),
      tableId: positiveInteger(searchParams.get('tableId') || searchParams.get('tid')),
      restaurantId: positiveInteger(
        searchParams.get('restaurantId') || searchParams.get('rid'),
      ),
      restaurantSlug: String(restaurantSlug || '').trim().toLowerCase() || null,
      tableToken: String(searchParams.get('tk') || searchParams.get('token') || '').trim(),
    }),
    [restaurantSlug, searchParams, tableNumber],
  );
  const hasJoinContext = Boolean(
    context.tableNumber &&
      (context.restaurantId || context.restaurantSlug) &&
      context.tableToken,
  );

  useEffect(() => {
    if (!hasJoinContext) return undefined;

    let active = true;
    const check = async () => {
      try {
        await tableSessionService.joinOpenSession(context);
        if (active) setMode('ready');
      } catch (requestError: unknown) {
        if (!active) return;
        const typed = requestError as {
          response?: { data?: { code?: string; error?: string } };
        };
        if (typed.response?.data?.code === 'TABLE_PARTICIPANT_IDENTITY_REQUIRED') {
          setMode('identity');
          return;
        }
        // A tela original continua responsável por mesa fechada, QR inválido,
        // assinatura e demais estados operacionais.
        setMode('ready');
      }
    };

    void check();
    return () => {
      active = false;
    };
  }, [context, hasJoinContext]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    const normalizedName = name.trim().replace(/\s+/g, ' ');
    const normalizedPhone = phone.replace(/\D/g, '');
    if (normalizedName.length < 2) {
      setError('Informe seu nome para que a equipe consiga identificar você na mesa.');
      return;
    }
    if (normalizedPhone.length < 10 || normalizedPhone.length > 15) {
      setError('Informe um telefone válido com DDD.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await tableSessionService.joinOpenSession({
        ...context,
        displayName: normalizedName,
        phone: normalizedPhone,
      });
      setMode('ready');
    } catch (requestError: unknown) {
      const typed = requestError as {
        response?: { data?: { error?: string } };
        message?: string;
      };
      setError(
        typed.response?.data?.error ||
          typed.message ||
          'Não foi possível confirmar sua identificação nesta mesa.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!hasJoinContext || mode === 'ready') return <DigitalMenuEntryPage />;
  if (mode === 'checking') return <Loading role="status">Identificando sua mesa...</Loading>;

  const tableLabel = context.tableNumber ? `Mesa ${context.tableNumber}` : 'Sua mesa';
  const nextPath = `${location.pathname}${location.search}${location.hash}`;

  return (
    <Page>
      <Card aria-labelledby="participant-identity-title">
        <span className="eyebrow">{tableLabel}</span>
        <h1 id="participant-identity-title">Como podemos identificar você?</h1>
        <p>
          Use seu nome e telefone para a equipe saber quem pediu, quem solicitou a conta e qual
          pagamento pertence a você.
        </p>

        <form onSubmit={submit}>
          <label>
            Nome
            <span className="field">
              <UserRound aria-hidden="true" />
              <input
                autoFocus
                autoComplete="name"
                maxLength={100}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ex.: Samuel Gomes"
                aria-invalid={Boolean(error && name.trim().length < 2)}
              />
            </span>
          </label>

          <label>
            Telefone
            <span className="field">
              <Phone aria-hidden="true" />
              <input
                autoComplete="tel"
                inputMode="tel"
                maxLength={20}
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="(11) 99999-9999"
              />
            </span>
          </label>

          {error && <p className="error" role="alert">{error}</p>}

          <button className="primary" type="submit" disabled={submitting}>
            {submitting ? 'Entrando na mesa...' : `Continuar na ${tableLabel}`}
          </button>
          <button
            className="secondary"
            type="button"
            disabled={submitting}
            onClick={() => navigate(`/login?next=${encodeURIComponent(nextPath)}`)}
          >
            <LogIn size={17} /> Já tenho uma conta
          </button>
          <p className="privacy">
            O telefone identifica você durante este atendimento. CPF não é exigido para entrar no
            cardápio; ele só deve ser solicitado por uma funcionalidade que realmente precise dele.
          </p>
        </form>
      </Card>
    </Page>
  );
}
