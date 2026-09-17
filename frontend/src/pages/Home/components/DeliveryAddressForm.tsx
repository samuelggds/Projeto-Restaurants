import { CheckCircle2, ChevronRight, MapPin, X } from 'lucide-react';
import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import styled from 'styled-components';
import type { DeliveryAddress } from '../hooks/useDeliveryAddress';

type Props = {
  address: DeliveryAddress;
  setAddress: Dispatch<SetStateAction<DeliveryAddress>>;
  cepStatus: 'idle' | 'loading' | 'success' | 'error';
  cepMessage: string;
  onCepChange: (value: string) => void;
  onCepLookup: (value: string) => Promise<void>;
};

export function DeliveryAddressForm(props: Props) {
  const [editing, setEditing] = useState(false);
  const update = (field: keyof DeliveryAddress, value: string) =>
    props.setAddress((current) => ({ ...current, [field]: value }));

  const complete = useMemo(
    () =>
      props.address.zipCode.replace(/\D/g, '').length === 8 &&
      props.address.address.trim().length >= 3 &&
      props.address.number.trim().length > 0 &&
      props.address.district.trim().length >= 2 &&
      props.address.city.trim().length >= 2 &&
      props.address.state.trim().length === 2,
    [props.address],
  );

  const summary = complete
    ? `${props.address.address}, ${props.address.number} · ${props.address.district}, ${props.address.city} - ${props.address.state}`
    : 'Cadastre onde o pedido deve ser entregue';

  return (
    <Section aria-label="Endereço de entrega">
      <SummaryButton type="button" onClick={() => setEditing(true)} $complete={complete}>
        <span className="icon" aria-hidden="true">
          <MapPin size={19} />
        </span>
        <span className="copy">
          <b>Endereço de entrega</b>
          <small>{summary}</small>
        </span>
        <span className="action">
          {complete ? <CheckCircle2 size={16} /> : <span>Cadastrar</span>}
          <ChevronRight size={17} aria-hidden="true" />
        </span>
      </SummaryButton>

      {editing ? (
        <Editor>
          <div className="editor-heading">
            <div>
              <b>{complete ? 'Alterar endereço' : 'Cadastrar endereço'}</b>
              <small>Informe o endereço que será usado somente para esta entrega.</small>
            </div>
            <button type="button" className="close" onClick={() => setEditing(false)} aria-label="Fechar">
              <X size={17} />
            </button>
          </div>

          <AddressForm>
            <AddressField className="cep-field">
              <span>CEP</span>
              <input
                aria-label="CEP"
                inputMode="numeric"
                placeholder="00000-000"
                maxLength={9}
                value={props.address.zipCode}
                onBlur={(event) => {
                  if (props.cepStatus === 'idle') void props.onCepLookup(event.target.value);
                }}
                onChange={(event) => props.onCepChange(event.target.value)}
                autoFocus
              />
              {props.cepMessage && <small className={props.cepStatus}>{props.cepMessage}</small>}
            </AddressField>
            <AddressField className="street">
              <span>Rua ou avenida</span>
              <input
                required
                minLength={3}
                maxLength={160}
                aria-label="Rua"
                placeholder="Ex.: Rua das Flores"
                value={props.address.address}
                onChange={(event) => update('address', event.target.value)}
              />
            </AddressField>
            <AddressField>
              <span>Número</span>
              <input
                required
                aria-label="Número"
                inputMode="text"
                placeholder="123"
                maxLength={10}
                value={props.address.number}
                onChange={(event) =>
                  update('number', event.target.value.replace(/[^0-9A-Za-z]/g, '').slice(0, 10))
                }
              />
            </AddressField>
            <AddressField>
              <span>Bairro</span>
              <input
                required
                minLength={2}
                maxLength={100}
                aria-label="Bairro"
                placeholder="Seu bairro"
                value={props.address.district}
                onChange={(event) => update('district', event.target.value)}
              />
            </AddressField>
            <AddressField className="city">
              <span>Cidade</span>
              <input
                required
                minLength={2}
                maxLength={100}
                aria-label="Cidade"
                placeholder="Sua cidade"
                value={props.address.city}
                onChange={(event) => update('city', event.target.value)}
              />
            </AddressField>
            <AddressField className="state">
              <span>UF</span>
              <input
                aria-label="Estado"
                placeholder="CE"
                maxLength={2}
                value={props.address.state}
                onChange={(event) =>
                  update('state', event.target.value.replace(/[^A-Za-z]/g, '').toUpperCase())
                }
              />
            </AddressField>
            <AddressField className="full">
              <span>
                Complemento <i>(opcional)</i>
              </span>
              <input
                maxLength={160}
                aria-label="Complemento"
                placeholder="Apartamento, bloco ou referência"
                value={props.address.complement}
                onChange={(event) => update('complement', event.target.value)}
              />
            </AddressField>
          </AddressForm>

          <button type="button" className="save" disabled={!complete} onClick={() => setEditing(false)}>
            Usar este endereço
          </button>
        </Editor>
      ) : null}
    </Section>
  );
}

const Section = styled.section`
  width: 100%;
  display: grid;
  gap: 8px;
`;

const SummaryButton = styled.button<{ $complete: boolean }>`
  width: 100%;
  min-height: 58px;
  padding: 10px 11px;
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  border: 1px solid ${({ $complete }) => ($complete ? '#d9e8dc' : '#e4ddd6')};
  border-radius: 12px;
  background: ${({ $complete }) => ($complete ? '#fbfefb' : '#fff')};
  color: var(--home-text);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;

  &:hover {
    border-color: color-mix(in srgb, var(--home-primary) 45%, #e4ddd6);
    box-shadow: 0 5px 16px rgba(34, 29, 25, 0.06);
    transform: translateY(-1px);
  }

  .icon {
    width: 36px;
    height: 36px;
    display: grid;
    place-items: center;
    border-radius: 10px;
    background: color-mix(in srgb, var(--home-primary) 9%, #f5f1ed);
    color: var(--home-primary);
  }

  .copy {
    min-width: 0;
    display: grid;
    gap: 2px;
  }

  .copy b {
    color: #28231f;
    font-size: 12px;
    font-weight: 850;
  }

  .copy small {
    overflow: hidden;
    color: #7b746e;
    font-size: 10px;
    line-height: 1.35;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .action {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: ${({ $complete }) => ($complete ? '#2d8a4c' : 'var(--home-primary)')};
    font-size: 10px;
    font-weight: 850;
    white-space: nowrap;
  }
`;

const AddressForm = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 110px;
  gap: 8px;

  .cep-field,
  .full {
    grid-column: 1 / -1;
  }

  .street {
    grid-column: 1;
  }

  @media (max-width: 420px) {
    grid-template-columns: 1fr;

    .cep-field,
    .full,
    .street {
      grid-column: 1;
    }
  }
`;

const AddressField = styled.label`
  display: grid;
  gap: 5px;
  min-width: 0;

  > span {
    color: #514b44;
    font-size: 11px;
    font-weight: 750;
  }

  i {
    color: #8b837a;
    font-style: normal;
    font-weight: 500;
  }

  input,
  select {
    width: 100%;
    height: 39px;
    padding: 0 12px;
    border: 1px solid #dcd2c7;
    border-radius: 10px;
    background: #fff;
    color: #191816;
    font: inherit;
    font-size: 13px;
    outline: none;
    transition:
      border-color 0.2s,
      box-shadow 0.2s;
  }

  input:focus,
  select:focus {
    border-color: var(--primary, #d64d08);
    box-shadow: 0 0 0 3px rgba(214, 77, 8, 0.1);
  }

  small {
    font-size: 10px;
  }

  small.loading {
    color: #7c5b20;
  }

  small.success {
    color: #18773a;
  }

  small.error {
    color: #b42318;
  }
`;

const Editor = styled.div`
  display: grid;
  gap: 10px;
  padding: 12px;
  border: 1px solid #e3d9d0;
  border-radius: 12px;
  background: #fcfaf7;

  .editor-heading {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 8px;
  }

  .editor-heading > div {
    display: grid;
    gap: 2px;
  }

  .editor-heading b {
    color: #29241f;
    font-size: 12px;
  }

  .editor-heading small {
    color: #766f69;
    font-size: 9px;
    line-height: 1.4;
  }

  .close {
    width: 30px;
    height: 30px;
    display: grid;
    place-items: center;
    border: 0;
    border-radius: 8px;
    background: #f0ebe6;
    color: #615952;
    cursor: pointer;
  }

  .save {
    min-height: 40px;
    border: 0;
    border-radius: 10px;
    background: var(--home-primary);
    color: #fff;
    font: inherit;
    font-size: 11px;
    font-weight: 850;
    cursor: pointer;
  }

  .save:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`;
