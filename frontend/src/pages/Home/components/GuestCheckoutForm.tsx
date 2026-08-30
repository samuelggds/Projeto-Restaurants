import * as S from '../../Home/Home.styles';

export type GuestCheckoutDetails = {
  name: string;
  cpf: string;
  phone: string;
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

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
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
      <label>
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
      <label>
        <span>Celular</span>
        <input
          inputMode="tel"
          autoComplete="tel"
          value={value.phone}
          onChange={(event) => onChange({ ...value, phone: formatPhone(event.target.value) })}
          placeholder="(85) 99999-9999"
          required
        />
      </label>
      <small className="full">Usamos esses dados somente para identificar e acompanhar este pedido.</small>
    </S.GuestCheckoutForm>
  );
}
