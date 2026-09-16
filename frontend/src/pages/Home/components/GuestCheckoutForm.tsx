import * as S from '../../Home/Home.styles';

export type GuestCheckoutDetails = {
  name: string;
  cpf?: string;
  phone?: string;
};

type Props = {
  value: GuestCheckoutDetails;
  onChange: (value: GuestCheckoutDetails) => void;
};

export function GuestCheckoutForm({ value, onChange }: Props) {
  return (
    <S.GuestCheckoutForm aria-label="Seus dados para o pedido">
      <div className="guest-heading">
        <b>Como podemos chamar você?</b>
        <span>Você continua como visitante. Não precisa criar conta nem informar CPF.</span>
      </div>
      <label className="full">
        <span>Nome</span>
        <input
          autoComplete="name"
          value={value.name}
          onChange={(event) => onChange({ ...value, name: event.target.value.slice(0, 80) })}
          placeholder="Digite seu nome"
          minLength={2}
          required
        />
      </label>
      <small className="full">
        O WhatsApp para receber as atualizações deste pedido é informado logo abaixo.
      </small>
    </S.GuestCheckoutForm>
  );
}
