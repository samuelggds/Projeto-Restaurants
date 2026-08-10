import * as S from "../Admin.styles";

export function BusinessSettings() {
  return (
    <S.SettingSection>
      <S.Card>
        <h2>Informações comerciais</h2>
        <p>Dados legais e de contato do estabelecimento.</p>
        <S.FormGrid>
          <S.Field>Razão social<input defaultValue="Sabor & Casa Restaurante LTDA" /></S.Field>
          <S.Field>CNPJ<input defaultValue="12.345.678/0001-90" /></S.Field>
          <S.Field>Telefone<input defaultValue="(85) 3333-4455" /></S.Field>
          <S.Field>E-mail comercial<input type="email" defaultValue="contato@saborecasa.com" /></S.Field>
        </S.FormGrid>
      </S.Card>
    </S.SettingSection>
  );
}

export function AddressSettings() {
  return (
    <S.Card>
      <h2>Endereço do estabelecimento</h2>
      <p>Origem das entregas e local de retirada.</p>
      <S.FormGrid>
        <S.Field>CEP<input defaultValue="60100-000" /></S.Field>
        <S.Field>Rua<input defaultValue="Rua das Flores" /></S.Field>
        <S.Field>Número<input defaultValue="123" /></S.Field>
        <S.Field>Complemento<input placeholder="Opcional" /></S.Field>
        <S.Field>Bairro<input defaultValue="Centro" /></S.Field>
        <S.Field>Cidade<input defaultValue="Fortaleza - CE" /></S.Field>
      </S.FormGrid>
    </S.Card>
  );
}
