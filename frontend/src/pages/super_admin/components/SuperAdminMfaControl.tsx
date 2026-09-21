import { ShieldCheck } from 'lucide-react';
import * as S from '../SuperAdmin.styles';

export function SuperAdminMfaControl() {
  return (
    <S.FormCard>
      <header>
        <div>
          <h2>Segurança da conta SUPER_ADMIN</h2>
          <p>A verificação em duas etapas é obrigatória para proteger o acesso à plataforma.</p>
        </div>
      </header>
      <div className="line">
        <span>
          <strong>Verificação em duas etapas obrigatória</strong>
          <small>Sua senha é acompanhada por uma confirmação adicional em novos acessos.</small>
        </span>
      </div>
      <S.InlineAlert $tone="success">
        <ShieldCheck size={16} /> Esta proteção não pode ser desativada nesta conta.
      </S.InlineAlert>
    </S.FormCard>
  );
}
