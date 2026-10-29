import { useCallback, useEffect, useState, type FormEvent } from 'react';
import styled from 'styled-components';
import { ContactRound, CreditCard, RefreshCw, ShieldAlert } from 'lucide-react';
import nfcRegistrationService, { type NfcCustomerRecord } from '../../Services/nfcRegistrationService';
import { NfcCustomerComandas } from './NfcCustomerComandas';
import { extractNfcToken, scanNfcCard, writeNfcCard } from './nfcWebReader';

const Wrap = styled.section`
  color: #182127; display: grid; gap: 16px; max-width: 1000px; margin: 0 auto;
  h2, h3, p { margin: 0; }
  .intro { display: flex; gap: 12px; align-items: flex-start; }
  .intro svg { width: 26px; color: #e7631b; }
  p, small { color: #68717a; }
  .surface { border: 1px solid #e4e8ee; padding: 19px; border-radius: 16px; background: #fff; display: grid; gap: 13px; }
  .form { display: grid; grid-template-columns: 1.4fr 1fr 1fr auto; gap: 10px; align-items: end; }
  label { display: grid; gap: 5px; font-size: 12px; font-weight: 750; }
  input { width: 100%; padding: 11px; border: 1px solid #cad3dc; border-radius: 10px; color: #182127; background: #fff; font: inherit; min-width: 0; }
  button { padding: 11px 14px; min-height: 42px; border: 1px solid #e7631b; color: #fff; background: #e7631b; border-radius: 10px; font: inherit; cursor: pointer; font-weight: 700; }
  button:disabled { opacity: .5; cursor: not-allowed; }
  .secondary { color: #2d3840; background: #fff; border-color: #cad3dc; }
  .danger { color: #a1342c; background: #fff; border-color: #e7c7c3; }
  .message { border-radius: 10px; padding: 12px; background: #fff4eb; color: #8c4016; }
  .person { display: flex; justify-content: space-between; gap: 10px; align-items: center; border-bottom: 1px solid #ebeff3; padding: 12px 0; }
  .person:last-child { border-bottom: 0; }
  .person-info { min-width: 0; display: grid; gap: 4px; }
  .person-info strong { overflow-wrap: anywhere; }
  .person-info small { overflow-wrap: anywhere; }
  .cards { display: flex; flex-wrap: wrap; gap: 5px; }
  .cards span { border-radius: 6px; padding: 4px 7px; color: #4a5158; background: #edf1f4; font-size: 11px; }
  .actions { display: flex; gap: 8px; flex-wrap: wrap; }
  @media(max-width:800px) { .form { grid-template-columns: 1fr; } .person { align-items: start; flex-direction: column; } }
`;
type Props = { roleLabel?: string; canConfirmCash?: boolean };
export function NfcRegistrationPanel({ roleLabel = 'equipe', canConfirmCash = false }: Props) {
  const [items, setItems] = useState<NfcCustomerRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [lookupCpf, setLookupCpf] = useState('');
  const [pending, setPending] = useState(true);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [newCardUrl, setNewCardUrl] = useState('');
  const [pendingCardId, setPendingCardId] = useState<string | null>(null);
  const [isUnassignedProvision, setIsUnassignedProvision] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const load = useCallback(async (nextPage: number) => {
    setPending(true); setError('');
    try { const result = await nfcRegistrationService.list(nextPage); setItems(result.customers); setTotal(result.total); setPage(nextPage); }
    catch { setError('Não foi possível carregar os cadastros NFC.'); }
    finally { setPending(false); }
  }, []);
  useEffect(() => {
    let mounted = true;
    void nfcRegistrationService.list(1).then((result) => {
      if (!mounted) return;
      setItems(result.customers);
      setTotal(result.total);
      setPage(1);
    }).catch(() => {
      if (mounted) setError('Não foi possível carregar os cadastros NFC.');
    }).finally(() => {
      if (mounted) setPending(false);
    });
    return () => { mounted = false; };
  }, []);
  const create = async (event: FormEvent) => {
    event.preventDefault(); setPending(true); setError(''); setInfo('');
    try {
      await nfcRegistrationService.create({ name, cpf, phone });
      setName(''); setCpf(''); setPhone(''); setInfo('Cliente cadastrado. Vincule um cartão para continuar.');
      await load(1);
    } catch { setError('Não foi possível cadastrar o cliente. Verifique o CPF, telefone ou um cadastro existente.'); }
    finally { setPending(false); }
  };
  const lookup = async () => {
    setPending(true); setError(''); setInfo('');
    try {
      const customer = await nfcRegistrationService.lookup(lookupCpf);
      setInfo(customer ? `Cadastro encontrado: ${customer.name} (${customer.cpfMasked}).` : 'Nenhum cliente encontrado para o CPF informado.');
    } catch { setError('Não foi possível consultar este CPF.'); }
    finally { setPending(false); }
  };
  const issue = async (customer: NfcCustomerRecord) => {
    setPending(true); setError(''); setInfo(''); setNewCardUrl('');
    try {
      const result = await nfcRegistrationService.issue(customer.id);
      setNewCardUrl(result.ndefUrl);
      setPendingCardId(result.card.id);
      setIsUnassignedProvision(false);
      setInfo(`Cartão ${result.card.displayCode} emitido para ${customer.name}. Ainda precisa ser programado e ativado.`);
      await load(page);
    } catch { setError('Não foi possível emitir cartão. Pode existir outro cartão ativo ou pendente.'); }
    finally { setPending(false); }
  };
  const provision = async () => {
    setPending(true); setError(''); setInfo('');
    try {
      const result = await nfcRegistrationService.provision();
      setPendingCardId(result.card.id);
      setNewCardUrl(result.ndefUrl);
      setIsUnassignedProvision(true);
      setInfo('Cartão emitido sem cliente. Grave a URL no chip e confirme a leitura; depois ele estará disponível para a recepção.');
    } catch { setError('Não foi possível preparar um novo cartão NFC.'); }
    finally { setPending(false); }
  };
  const writeAndActivate = async () => {
    if (!pendingCardId || !newCardUrl) return;
    setPending(true); setError('');
    try {
      await writeNfcCard(newCardUrl);
      setInfo('Gravação concluída. Aproxime o mesmo cartão novamente para confirmar a leitura.');
      const readToken = await scanNfcCard();
      if (readToken !== extractNfcToken(newCardUrl)) {
        throw new Error('A leitura não corresponde ao cartão emitido. Ele permanece pendente.');
      }
      if (isUnassignedProvision) {
        await nfcRegistrationService.prepare(pendingCardId, readToken);
        setInfo('Cartão preparado e disponível. No Android ou iPhone, aproxime o cartão para abrir o cadastro de recepção.');
      } else {
        await nfcRegistrationService.activate(pendingCardId, readToken);
        setInfo('Cartão NFC gravado, conferido e ativado para o cliente.');
      }
      setNewCardUrl(''); setPendingCardId(null);
      await load(page);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha no vínculo NFC. O cartão não foi ativado.');
    } finally { setPending(false); }
  };
  const scanExisting = async () => {
    setPending(true); setError('');
    try {
      const token = await scanNfcCard();
      const card = await nfcRegistrationService.resolve(token);
      setSelectedCustomerId(card.customerId);
      setInfo(`Cartão ${card.displayCode} identificado neste restaurante.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Cartão NFC não identificado.');
    } finally { setPending(false); }
  };
  const revoke = async (cardId: string) => {
    const reason = window.prompt('Informe o motivo da revogação (mínimo 5 caracteres):');
    if (!reason) return;
    setPending(true); setError(''); setInfo(''); setNewCardUrl('');
    try { await nfcRegistrationService.revoke(cardId, reason); setInfo('Cartão revogado. O cliente poderá receber outro cartão.'); await load(page); }
    catch { setError('Não foi possível revogar esse cartão.'); }
    finally { setPending(false); }
  };
  return <Wrap aria-label="Cadastro de clientes e cartões NFC">
    <div className="intro"><ContactRound aria-hidden="true" /><div><h2>Clientes e cartões NFC</h2><p>Cadastros individuais para {roleLabel}. A identificação da mesa será opcional na abertura da futura comanda.</p></div></div>
    <div className="surface">
      <h3>Vincular cliente ao cartão NFC</h3>
      <p>Prepare cartões no Android uma única vez; depois, aproxime cada cartão no Android ou iPhone para abrir o cadastro de recepção. O cadastro manual continua disponível.</p>
      <div className="actions"><button type="button" disabled={pending} onClick={() => void provision()}>Preparar cartão virgem</button><button type="button" className="secondary" disabled={pending} onClick={() => void scanExisting()}>Ler cartão já cadastrado</button></div>
      <h3>Novo cliente</h3>
      <form className="form" onSubmit={(event) => void create(event)}>
        <label>Nome completo<input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required minLength={2} maxLength={120} /></label>
        <label>CPF<input autoComplete="off" inputMode="numeric" value={cpf} onChange={(event) => setCpf(event.target.value)} placeholder="000.000.000-00" required /></label>
        <label>Telefone com DDD<input autoComplete="tel" inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="(85) 99999-9999" required /></label>
        <button disabled={pending} type="submit">Cadastrar cliente</button>
      </form>
      <small>Os dados pessoais ficam protegidos no servidor, nunca gravados no cartão. O CPF será mascarado na listagem.</small>
    </div>
    <div className="surface">
      <h3>Localizar cliente existente</h3>
      <div className="actions">
        <input aria-label="CPF para consulta" placeholder="Informe o CPF completo" value={lookupCpf} onChange={(event) => setLookupCpf(event.target.value)} />
        <button type="button" disabled={pending || !lookupCpf.trim()} onClick={() => void lookup()}>Consultar CPF</button>
      </div>
    </div>
    {error && <div role="alert" className="message"><ShieldAlert aria-hidden="true" /> {error}</div>}
    {info && <div role="status" className="message">{info}</div>}
    {newCardUrl && <div className="message"><strong>{isUnassignedProvision ? 'Preparar cartão sem cliente' : 'Cartão aguardando programação e confirmação'}:</strong><p>No Android com Chrome e NFC, grave o identificador e aproxime o mesmo cartão novamente para confirmar. O chip não armazena nome, CPF ou telefone.</p><code>{newCardUrl}</code><div className="actions"><button type="button" disabled={pending} onClick={() => void writeAndActivate()}>{isUnassignedProvision ? 'Gravar e deixar disponível' : 'Gravar e ativar por NFC'}</button><button className="secondary" type="button" onClick={() => { void navigator.clipboard?.writeText(newCardUrl); }}>Copiar identificador</button></div></div>}
    <div className="surface">
      <div className="intro"><CreditCard aria-hidden="true" /><div><h3>Clientes cadastrados ({total})</h3><p>Somente registros do restaurante autenticado.</p></div><button className="secondary" type="button" onClick={() => void load(page)} disabled={pending}><RefreshCw aria-hidden="true" /> Atualizar</button></div>
      {items.map((customer) => <div className="person" key={customer.id}>
        <div className="person-info"><strong>{customer.name}</strong><small>CPF: {customer.cpfMasked} • Telefone: {customer.phoneMasked}</small><div className="cards">{customer.cards.map((card) => <span key={card.id}>{card.displayCode}: {card.status === 'ACTIVE' ? 'Ativo' : card.status === 'REVOKED' ? 'Revogado' : 'Aguardando gravação'}</span>)}</div></div>
        <div className="actions">
          <button type="button" className="secondary" onClick={() => setSelectedCustomerId(customer.id)}>Ver comandas</button>
          {!customer.cards.some((card) => card.status !== 'REVOKED') && <button type="button" disabled={pending} onClick={() => void issue(customer)}>Emitir cartão</button>}
          {customer.cards.filter((card) => card.status !== 'REVOKED').map((card) => <button type="button" key={card.id} className="danger" disabled={pending} onClick={() => void revoke(card.id)}>Revogar {card.displayCode}</button>)}
        </div>
      </div>)}
      {items.length === 0 && <p>Nenhum cliente nesta página.</p>}
      {selectedCustomerId && <div className="surface" style={{ gridColumn: '1 / -1' }}><div className="actions"><h3>Situação financeira e comandas</h3><button type="button" className="secondary" onClick={() => setSelectedCustomerId(null)}>Fechar consulta</button></div><NfcCustomerComandas customerId={selectedCustomerId} cardId={items.find(customer => customer.id === selectedCustomerId)?.cards.find(card => card.status === 'ACTIVE')?.id} canConfirmCash={canConfirmCash} /></div>}
      <div className="actions"><button className="secondary" type="button" disabled={pending || page <= 1} onClick={() => void load(page - 1)}>Anterior</button><small>Página {page}</small><button className="secondary" type="button" disabled={pending || page * 20 >= total} onClick={() => void load(page + 1)}>Próxima</button></div>
    </div>
  </Wrap>;
}
