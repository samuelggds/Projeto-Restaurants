import { ShieldCheck, UsersRound } from 'lucide-react';
import * as S from '../Admin.styles';

type Props = {
  openEmployees: () => void;
};

export function SecuritySettings({ openEmployees }: Props) {
  return (
    <S.SettingSection>
      <S.Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <ShieldCheck aria-hidden="true" />
          <div>
            <h2 style={{ margin: 0 }}>Proteção do acesso administrativo</h2>
            <p style={{ margin: '4px 0 0', color: '#6f645f' }}>
              Administradores confirmam o login com um código enviado ao e-mail cadastrado.
            </p>
          </div>
        </div>
        <p style={{ margin: '16px 0 0', color: '#6f645f', lineHeight: 1.5 }}>
          A verificação em duas etapas é obrigatória para administradores. Preferências pessoais,
          senha e dados de recuperação são alterados em Meu perfil.
        </p>
      </S.Card>
      <S.Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <UsersRound aria-hidden="true" />
          <div>
            <h2 style={{ margin: 0 }}>Acessos da equipe</h2>
            <p style={{ margin: '4px 0 0', color: '#6f645f' }}>
              Crie, edite, desative ou reative os acessos vinculados a este restaurante.
            </p>
          </div>
        </div>
        <button
          type="button"
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
    </S.SettingSection>
  );
}
