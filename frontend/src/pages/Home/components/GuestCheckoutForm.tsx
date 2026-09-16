import * as S from '../../Home/Home.styles';

export type GuestCheckoutDetails = {
  name: string;
  cpf: string;
  phone?: string;
};

type Props = {
  value: GuestCheckoutDetails;
  onChange: (value: GuestCheckoutDetails) => void;
};

function formatCpf(value: string) {
  return value
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');
}

export function GuestCheckoutForm({ value, onChange }: Props) {
  return (
    <S.GuestCheckoutForm aria-label="Seus dados para o pedido">
      <div className="guest-heading">
        <b>Seus dados para o pedido</b>
        <span>Você continua como visitante. Não criaremos uma conta.</span>
      </div>
      <label className="full">
        <span>Nome completo</span>
        <input
          autoComplete="name"
          value={value.name}
          onChange={(event) => onChange({ ...value, name: event.target.value.slice(0, 80) })}
          placeholder="Como devemos chamar você?"
          minLength={2}
          required
        />
      </label>
      <label className="full">
        <span>CPF</span>
        <input
          inputMode="numeric"
          autoComplete="off"
          value={value.cpf}
          onChange={(event) => onChange({ ...value, cpf: formatCpf(event.target.value) })}
          placeholder="000.000.000-00"
          required
        />
      </label>
      <small className="full">
        O número para receber atualizações do pedido é informado separadamente na seção do WhatsApp.
      </small>
    </S.GuestCheckoutForm>
  );
}
