import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { RefreshCw, Users } from 'lucide-react';
import nfcRegistrationService, { type NfcCustomerRecord } from '../../Services/nfcRegistrationService';

const Surface = styled.section`
  background: #fff; border: 1px solid #e4e9ed; border-radius: 18px; padding: clamp(16px, 3vw, 26px);
  display: grid; gap: 16px; color: #24313a; min-width: 0;
  header { display: flex; gap: 12px; justify-content: space-between; align-items: center; flex-wrap: wrap; }
  h3, p { margin: 0; } h3 { font-size: 20px; }
  p, small { color: #697782; }
  button { min-height: 42px; padding: 9px 14px; border-radius: 10px; border: 1px solid #ccd5dc; background: white; font: inherit; font-weight: 700; cursor: pointer; }
  button:disabled { opacity: .55; cursor: not-allowed; }
  .rows { display: grid; gap: 10px; }
  .customer { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; padding: 15px; border-radius: 12px; border: 1px solid #e4e9ed; }
  .identity { display: grid; gap: 5px; min-width: 0; overflow-wrap: anywhere; }
  .status { display: inline-flex; gap: 7px; align-items: center; border-radius: 99px; font-size: 12px; font-weight: 800; padding: 7px 12px; }
  .status::before { content: ''; width: 8px; height: 8px; border-radius: 50%; background: currentColor; }
  .active { color: #147d4e; background: #e9f8ef; }
  .inactive { color: #666f7a; background: #f0f2f4; }
  .controls { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; }
  .controls div { display: flex; gap: 8px; }
`;

export function NfcCustomerRegistry() {
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [customers, setCustomers] = useState<NfcCustomerRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    nfcRegistrationService.list(page).then(result => {
      if (!live) return;
      setCustomers(result.customers);
      setTotal(result.total);
      setPageSize(result.pageSize);
      setError('');
    }).catch(() => {
      if (!live) return;
      setError('Não foi possível carregar o cadastro de clientes NFC.');
      setCustomers([]);
    }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [page, revision]);

  return <Surface aria-label="Cadastro de clientes NFC">
    <header>
      <div><h3>Cadastro de clientes</h3><p>Registros preservados mesmo após a devolução do cartão NFC.</p></div>
      <button type="button" onClick={() => { setLoading(true); setRevision(v => v + 1); }}><RefreshCw size={15} aria-hidden="true" /> Atualizar</button>
    </header>
    <p><Users size={15} aria-hidden="true" /> {total} clientes cadastrados neste restaurante</p>
    {loading && <p role="status">Consultando cadastro...</p>}
    {error && <p role="alert">{error}</p>}
    {!loading && !error && customers.length === 0 && <p>Nenhum cliente cadastrado.</p>}
    {!loading && !error && <div className="rows">
      {customers.map(customer => {
        const active = customer.cards.some(card => card.status === 'ACTIVE');
        return <div className="customer" key={customer.id}>
          <div className="identity"><strong>{customer.name}</strong><small>CPF: {customer.cpfMasked} · Telefone: {customer.phoneMasked}</small></div>
          <span className={`status ${active ? 'active' : 'inactive'}`} aria-label={`Cliente ${active ? 'ativo' : 'inativo'}`}>
            {active ? 'Ativo · cartão vinculado' : 'Inativo · sem cartão vinculado'}
          </span>
        </div>;
      })}
    </div>}
    <div className="controls"><small>Página {page} · {total} registros</small><div>
      <button type="button" disabled={loading || page === 1} onClick={() => { setLoading(true); setPage(v => v - 1); }}>Anterior</button>
      <button type="button" disabled={loading || page * pageSize >= total} onClick={() => { setLoading(true); setPage(v => v + 1); }}>Próxima</button>
    </div></div>
    <small>Ativo indica vínculo NFC atual, não a situação financeira. Para vincular um cliente novamente, utilize o CPF completo na tela Atendimento.</small>
  </Surface>;
}
