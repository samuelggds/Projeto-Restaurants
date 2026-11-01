import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { RefreshCw, Trash2, Users } from 'lucide-react';
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
  .remove { color: #ac342e; border-color: #edc5c2; display: inline-flex; align-items: center; gap: 6px; }
  .remove:focus-visible { outline: 3px solid #e69e99; outline-offset: 2px; }
  .confirm { display: grid; gap: 10px; padding: 13px; border: 1px solid #efcfcb; border-radius: 12px; background: #fff8f7; }
  .confirm p { font-size: 13px; color: #7a332f; }
  .confirm-actions { display: flex; gap: 8px; flex-wrap: wrap; }
  .confirm-actions .danger { color: #fff; background: #a92e28; border-color: #a92e28; }
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
  const [pendingCustomer, setPendingCustomer] = useState<NfcCustomerRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [success, setSuccess] = useState('');
  const remove = async () => {
    if (!pendingCustomer || deleting) return;
    setDeleting(true); setError(''); setSuccess('');
    try {
      await nfcRegistrationService.removeCustomer(pendingCustomer.id);
      setPendingCustomer(null); setSuccess('Cadastro removido da lista. Histórico financeiro preservado.');
      if (customers.length === 1 && page > 1) setPage(page - 1);
      else setRevision(current => current + 1);
    } catch (cause) {
      const failure = cause as { response?: { data?: { error?: string } } };
      setError(failure.response?.data?.error || 'Não foi possível excluir o cadastro. Confira se o cartão foi liberado e todas as comandas estão quitadas.');
    } finally { setDeleting(false); }
  };

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
    {success && <p role="status">{success}</p>}
    {!loading && !error && customers.length === 0 && <p>Nenhum cliente cadastrado.</p>}
    {!loading && !error && <div className="rows">
      {customers.map(customer => {
        const active = customer.cards.some(card => card.status === 'ACTIVE');
        return <div className="customer" key={customer.id}>
          <div className="identity"><strong>{customer.name}</strong><small>CPF: {customer.cpfMasked} · Telefone: {customer.phoneMasked}</small></div>
          <span className={`status ${active ? 'active' : 'inactive'}`} aria-label={`Cliente ${active ? 'ativo' : 'inativo'}`}>
            {active ? 'Ativo · cartão vinculado' : 'Inativo · sem cartão vinculado'}
          </span>
          <button className="remove" type="button" disabled={active || deleting || loading}
            title={active ? 'Libere o cartão antes de excluir' : 'O servidor validará a quitação antes da exclusão'}
            onClick={() => { setError(''); setSuccess(''); setPendingCustomer(customer); }}>
            <Trash2 size={15} aria-hidden="true" /> Excluir
          </button>
        </div>;
      })}
    </div>}
    {pendingCustomer && <div role="dialog" aria-modal="true" aria-label="Confirmar exclusão de cliente" className="confirm">
      <strong>Excluir cadastro de {pendingCustomer.name}?</strong>
      <p>O servidor só permite excluir após a devolução e liberação do cartão, com todas as comandas quitadas e sem operações pendentes. O histórico financeiro será preservado.</p>
      <div className="confirm-actions">
        <button type="button" disabled={deleting} onClick={() => setPendingCustomer(null)}>Cancelar</button>
        <button className="danger" type="button" disabled={deleting} onClick={() => void remove()}>
          {deleting ? 'Verificando...' : 'Confirmar exclusão'}
        </button>
      </div>
    </div>}
    <div className="controls"><small>Página {page} · {total} registros</small><div>
      <button type="button" disabled={loading || page === 1} onClick={() => { setLoading(true); setPage(v => v - 1); }}>Anterior</button>
      <button type="button" disabled={loading || page * pageSize >= total} onClick={() => { setLoading(true); setPage(v => v + 1); }}>Próxima</button>
    </div></div>
    <small>Ativo indica vínculo NFC atual, não a situação financeira. Para vincular um cliente novamente, utilize o CPF completo na tela Atendimento.</small>
  </Surface>;
}
