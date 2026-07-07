import { Edit2, Mail, Phone, Save, User } from "lucide-react";
import * as S from "../styles";

type ProfilePersonalCardProps = {
  name: string;
  email: string;
  phone: string;
  isEditing: boolean;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onEnableEditing: () => void;
};

export default function ProfilePersonalCard({
  name,
  email,
  phone,
  isEditing,
  onNameChange,
  onEmailChange,
  onPhoneChange,
  onSubmit,
  onEnableEditing,
}: ProfilePersonalCardProps) {
  return (
    <S.ProfileCard>
      <S.AvatarSection>
        <div className="avatar-circle">
          <User size={40} />
        </div>
        <h3>{name}</h3>
        <p>Cliente Associado</p>
      </S.AvatarSection>

      <S.Form onSubmit={onSubmit}>
        <S.InputGroup>
          <S.Label>
            <User size={14} /> Nome Completo
          </S.Label>
          <S.Input
            type="text"
            value={name}
            disabled={!isEditing}
            onChange={(event) => onNameChange(event.target.value)}
            required
          />
        </S.InputGroup>

        <S.InputGroup>
          <S.Label>
            <Mail size={14} /> E-mail
          </S.Label>
          <S.Input
            type="email"
            value={email}
            disabled={!isEditing}
            onChange={(event) => onEmailChange(event.target.value)}
            required
          />
        </S.InputGroup>

        <S.InputGroup>
          <S.Label>
            <Phone size={14} /> Telefone
          </S.Label>
          <S.Input
            type="text"
            value={phone}
            disabled={!isEditing}
            placeholder="(00) 00000-0000"
            onChange={(event) => onPhoneChange(event.target.value)}
          />
        </S.InputGroup>

        {isEditing ? (
          <S.ActionButton type="submit" $variant="primary">
            <Save size={16} /> Salvar Alterações
          </S.ActionButton>
        ) : (
          <S.ActionButton
            type="button"
            onClick={onEnableEditing}
            $variant="secondary"
          >
            <Edit2 size={16} /> Editar Perfil
          </S.ActionButton>
        )}
      </S.Form>
    </S.ProfileCard>
  );
}
