import { MapPin, Plus, ShoppingBag, Trash2 } from "lucide-react";
import * as S from "../styles";

type Endereco = {
  id: number;
  rotulo: string;
  rua: string;
  numero: string;
  bairro: string;
  cidade: string;
  cep: string;
};

type NovoEndereco = {
  rotulo: string;
  rua: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  complemento: string;
};

type ProfileAddressesAndOrdersProps = {
  enderecos: Endereco[];
  novoEndereco: NovoEndereco;
  onNovoEnderecoChange: (value: NovoEndereco) => void;
  onAddEndereco: (event: React.FormEvent<HTMLFormElement>) => void;
  onSelectEndereco: (id: number) => void;
  onDeleteEndereco: (id: number) => void;
  onNavigateOrders: () => void;
};

export default function ProfileAddressesAndOrders({
  enderecos,
  novoEndereco,
  onNovoEnderecoChange,
  onAddEndereco,
  onSelectEndereco,
  onDeleteEndereco,
  onNavigateOrders,
}: ProfileAddressesAndOrdersProps) {
  return (
    <S.RightColumn>
      <S.OrdersCard style={{ marginBottom: "2rem" }}>
        <S.SectionTitle>
          <MapPin size={20} />
          <h3>Meus Endereços de Entrega</h3>
        </S.SectionTitle>

        <S.AddressList>
          {enderecos.length === 0 ? (
            <p className="empty-msg">Nenhum endereço cadastrado ainda.</p>
          ) : (
            enderecos.map((endereco) => (
              <S.AddressItem key={endereco.id}>
                <div
                  className="address-details"
                  onClick={() => onSelectEndereco(endereco.id)}
                >
                  <h5>{endereco.rotulo}</h5>
                  <p>
                    {endereco.rua}, Nº {endereco.numero}{" "}
                    {endereco.bairro ? `- ${endereco.bairro}` : ""}
                  </p>
                  <span>
                    {endereco.cidade}
                    {endereco.cep ? ` • CEP: ${endereco.cep}` : ""}
                  </span>
                </div>
                <S.DeleteAddressButton
                  onClick={(event) => {
                    event.stopPropagation();
                    onDeleteEndereco(endereco.id);
                  }}
                  title="Excluir endereço"
                >
                  <Trash2 size={16} />
                </S.DeleteAddressButton>
              </S.AddressItem>
            ))
          )}
        </S.AddressList>

        <hr
          style={{
            border: "0",
            borderTop: "1px solid var(--border)",
            margin: "1.5rem 0",
            opacity: 0.2,
          }}
        />

        <S.AddressForm onSubmit={onAddEndereco}>
          <h4>Adicionar Novo Endereço</h4>
          <div className="form-row text-full">
            <input
              type="text"
              placeholder="Identificação (Ex: Casa, Trabalho, Namorada)"
              value={novoEndereco.rotulo}
              onChange={(event) =>
                onNovoEnderecoChange({
                  ...novoEndereco,
                  rotulo: event.target.value,
                })
              }
              required
            />
          </div>
          <div className="form-row split-rua">
            <input
              type="text"
              placeholder="Rua / Avenida"
              value={novoEndereco.rua}
              onChange={(event) =>
                onNovoEnderecoChange({
                  ...novoEndereco,
                  rua: event.target.value,
                })
              }
              required
            />
            <input
              type="text"
              placeholder="Nº"
              value={novoEndereco.numero}
              onChange={(event) =>
                onNovoEnderecoChange({
                  ...novoEndereco,
                  numero: event.target.value,
                })
              }
              required
            />
          </div>
          <div className="form-row split-bairro">
            <input
              type="text"
              placeholder="Bairro"
              value={novoEndereco.bairro}
              onChange={(event) =>
                onNovoEnderecoChange({
                  ...novoEndereco,
                  bairro: event.target.value,
                })
              }
            />
            <input
              type="text"
              placeholder="CEP"
              value={novoEndereco.cep}
              onChange={(event) =>
                onNovoEnderecoChange({
                  ...novoEndereco,
                  cep: event.target.value,
                })
              }
            />
          </div>
          <S.AddAddressButton type="submit">
            <Plus size={16} /> Salvar Endereço
          </S.AddAddressButton>
        </S.AddressForm>
      </S.OrdersCard>

      <S.OrdersCard>
        <S.SectionTitle>
          <ShoppingBag size={20} />
          <h3>Pedidos do Perfil</h3>
        </S.SectionTitle>
        <p
          style={{
            margin: "0 0 1rem",
            opacity: 0.75,
            fontSize: "0.95rem",
          }}
        >
          Abra a tela exclusiva para visualizar todos os pedidos feitos por este
          perfil.
        </p>
        <S.ActionButton
          type="button"
          $variant="secondary"
          onClick={onNavigateOrders}
        >
          <ShoppingBag size={16} /> Ver meus pedidos
        </S.ActionButton>
      </S.OrdersCard>
    </S.RightColumn>
  );
}
