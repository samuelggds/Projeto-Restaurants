import * as S from '../Admin.styles';

type Props = {
  openEmployees: () => void;
};

const SECURITY_OPTIONS: [string, string, boolean][] = [
  ['Autenticação em duas etapas', 'Proteja o acesso administrativo.', true],
  ['Alertas de novo acesso', 'Receba e-mail quando houver login em outro dispositivo.', true],
];

export function SecuritySettings({ openEmployees }: Props) {
  return (
    <S.SettingSection>
      <S.Card>
        <h2>Equipe e segurança</h2>
        <S.ToggleRows>
          {SECURITY_OPTIONS.map(([title, description, checked]) => (
            <div className="toggle-row" key={title}>
              <div>
                <b>{title}</b>
                <span>{description}</span>
              </div>
              <input type="checkbox" defaultChecked={checked} />
            </div>
          ))}
        </S.ToggleRows>
        <button
          onClick={openEmployees}
          style={{
            marginTop: 16,
            height: 44,
            border: 0,
            borderRadius: 8,
            background: 'var(--a)',
            color: '#fff',
            padding: '0 16px',
          }}
        >
          Gerenciar funcionários
        </button>
      </S.Card>
      <S.Card>
        <h2>Sessões administrativas</h2>
        <S.DataList>
          <div className="data-row">
            <div>
              <b>Chrome no Windows</b>
              <span>Fortaleza, CE • sessão atual</span>
            </div>
            <button>Encerrar outras sessões</button>
          </div>
        </S.DataList>
      </S.Card>
    </S.SettingSection>
  );
}
