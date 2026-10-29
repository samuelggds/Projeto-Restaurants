import { useCallback, useEffect, useState, type FormEvent } from 'react';
import styled from 'styled-components';
import { ArrowRight, ContactRound, CreditCard, RefreshCw, Search, ShieldAlert, ShieldCheck, Smartphone, UserPlus } from 'lucide-react';
import nfcRegistrationService, { type NfcCustomerRecord } from '../../Services/nfcRegistrationService';
import { NfcCustomerComandas } from './NfcCustomerComandas';
import { extractNfcToken, scanNfcCard, writeNfcCard } from './nfcWebReader';

const Wrap = styled.section`

  --nfc-ink: #20272b;
  --nfc-muted: #68727b;
  --nfc-border: #e4e9ed;
  --nfc-orange: #e7631b;
  color: var(--nfc-ink);
  display: grid;
  gap: 20px;
  width: 100%;
  max-width: 1320px;
  min-width: 0;
  margin: 0 auto;
  box-sizing: border-box;
  & *, & *::before, & *::after { box-sizing: border-box; }
  h2, h3, p { margin: 0; }
  p, small { line-height: 1.5; color: var(--nfc-muted); }
  .nfc-hero {
    padding: clamp(22px, 3.2vw, 34px);
    border-radius: 22px;
    color: #fff;
    background: linear-gradient(115deg, #202b31 0%, #303a3f 70%, #3b342d 100%);
    box-shadow: 0 12px 34px #18212712;
  }
  .nfc-hero p { color: #d7dfe1; max-width: 660px; }
  .nfc-hero-top, .nfc-hero-content { display: flex; justify-content: space-between; align-items: center; gap: 18px; }
  .nfc-hero-content { align-items: flex-end; margin-top: 24px; }
  .nfc-eyebrow { text-transform: uppercase; letter-spacing: .14em; font-size: 11px; font-weight: 850; color: #ffaf7b; }
  .nfc-trust { display: inline-flex; align-items: center; gap: 7px; padding: 7px 10px; border: 1px solid #ffffff2c; border-radius: 100px; font-size: 11px; color: #f2f7f7; }
  .nfc-trust svg { width: 15px; height: 15px; color: #96e2bc; }
  .nfc-hero h2 { font-size: clamp(24px, 3.3vw, 33px); letter-spacing: -.04em; margin-bottom: 9px; color: #fff; }
  .nfc-hero-icon { width: 68px; height: 68px; display: grid; place-items: center; border-radius: 19px; flex-shrink: 0; background: #ffffff16; border: 1px solid #ffffff20; }
  .nfc-hero-icon svg { width: 34px; height: 34px; color: #ffae70; }
  .nfc-layout { display: grid; grid-template-columns: minmax(0, 1.8fr) minmax(270px, 1fr); align-items: start; gap: 18px; min-width: 0; }
  .nfc-main, .nfc-aside { display: grid; gap: 18px; min-width: 0; }
  .surface { border: 1px solid var(--nfc-border); padding: clamp(18px, 2.2vw, 25px); border-radius: 19px; background: #fff; display: grid; gap: 16px; min-width: 0; box-shadow: 0 5px 22px #18212708; }
  .nfc-section-heading { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
  .nfc-section-heading h3 { font-size: 18px; font-weight: 800; letter-spacing: -.025em; color: var(--nfc-ink); }
  .nfc-section-heading p { margin-top: 5px; font-size: 13px; }
  .nfc-section-icon { border-radius: 13px; background: #fff0e5; padding: 11px; display: inline-grid; place-items: center; flex-shrink: 0; }
  .nfc-section-icon svg { width: 24px; height: 24px; color: var(--nfc-orange); }
  .nfc-section-title { display: flex; gap: 13px; align-items: center; }
  .nfc-actions, .nfc-reader-actions, .nfc-lookup, .nfc-pagination, .nfc-financial-heading { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; }
  .nfc-actions button, .nfc-reader-actions button, .nfc-form button, .nfc-lookup button,
  .nfc-pagination button, .nfc-section-heading > button, .nfc-person-actions button, .nfc-financial-heading > button, .nfc-payment-note button {
    min-height: 44px; padding: 10px 15px; display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    border: 1px solid var(--nfc-orange); border-radius: 11px; color: #fff; background: var(--nfc-orange);
    font: inherit; font-size: 13px; font-weight: 760; line-height: 1.2; cursor: pointer; text-decoration: none;
  }
  .nfc-actions button:focus-visible, .nfc-reader-actions button:focus-visible, .nfc-tabs button:focus-visible,
  .nfc-form button:focus-visible, .nfc-lookup button:focus-visible, .nfc-pagination button:focus-visible,
  .nfc-section-heading > button:focus-visible, .nfc-person-actions button:focus-visible,
  .nfc-financial-heading > button:focus-visible, .nfc-payment-note button:focus-visible, input:focus-visible {
    outline: 3px solid #f6ad79; outline-offset: 2px;
  }
  button:disabled { opacity: .58; cursor: not-allowed; }
  .nfc-actions .secondary, .nfc-reader-actions .secondary, .nfc-person-actions .secondary,
  .nfc-person-actions .danger, .nfc-pagination .secondary, .nfc-section-heading > .secondary, .nfc-financial-heading > .secondary {
    color: #36434d; background: #fff; border-color: #ccd5dc;
  }
  .nfc-person-actions .danger { color: #ae332f; border-color: #f0d1ce; }
  .nfc-actions button svg, .nfc-reader-actions button svg, .nfc-section-heading button svg,
  .nfc-payment-note button svg { width: 17px; height: 17px; }
  .nfc-tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; background: #f3f5f6; border-radius: 13px; padding: 5px; }
  .nfc-tabs button { border: 0; border-radius: 9px; background: transparent; min-height: 47px; display: inline-flex; gap: 8px; align-items: center; justify-content: center; padding: 9px; color: #6a7277; font: inherit; font-weight: 750; font-size: 13px; cursor: pointer; }
  .nfc-tabs button[aria-selected="true"] { background: #fff; color: #c34f12; box-shadow: 0 2px 9px #20272b12; }
  .nfc-tabs button svg { width: 17px; height: 17px; }
  .nfc-form { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 14px; align-items: end; }
  .nfc-form .nfc-wide { grid-column: 1 / -1; }
  label { display: grid; gap: 7px; font-size: 12px; font-weight: 800; color: #344049; }
  input:not([type="checkbox"]) { width: 100%; min-width: 0; min-height: 46px; padding: 11px 12px; border: 1px solid #cdd6dc; border-radius: 10px; color: #202a30; background: #fff; font: inherit; font-size: 14px; }
  input::placeholder { color: #97a0a7; }
  .nfc-form button { justify-self: start; }
  .nfc-hint { font-size: 12px; }
  .nfc-lookup input { flex: 1 1 210px; }
  .nfc-found { display: flex; gap: 12px; align-items: center; justify-content: space-between; flex-wrap: wrap; border-radius: 12px; padding: 14px; background: #f6faf7; border: 1px solid #cde6d5; }
  .nfc-found strong { display: block; font-size: 14px; color: #284d36; }
  .nfc-found small { display: block; font-size: 12px; margin-top: 4px; }
  .nfc-aside .nfc-guide { gap: 18px; }
  .nfc-guide-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 17px; }
  .nfc-guide-list li { display: flex; gap: 12px; align-items: flex-start; }
  .nfc-step { display: grid; place-items: center; width: 30px; height: 30px; flex-shrink: 0; border-radius: 10px; color: #bb4d17; background: #fff0e5; font-size: 11px; font-weight: 850; }
  .nfc-guide-list strong { display: block; font-size: 13px; color: #26323a; }
  .nfc-guide-list p { font-size: 12px; margin-top: 3px; }
  .nfc-payment-note { border-radius: 19px; background: #ecf7f0; border: 1px solid #cce9d6; padding: 21px; display: grid; gap: 11px; }
  .nfc-payment-note > svg { width: 28px; height: 28px; color: #188454; }
  .nfc-payment-note h3 { font-size: 17px; color: #1b5939; }
  .nfc-payment-note p { font-size: 12px; color: #466f58; }
  .nfc-payment-note button { background: #fff; color: #176c45; border-color: #bbdfc9; justify-self: start; }
  .nfc-message { border: 1px solid #f4d3bb; border-radius: 13px; padding: 13px 15px; background: #fff7f0; font-size: 13px; color: #81421d; }
  .nfc-message p { font-size: 12px; margin-top: 7px; }
  .nfc-message code { display: block; overflow-wrap: anywhere; padding: 10px; border-radius: 8px; background: #fff; margin: 12px 0; }
  .nfc-message svg { vertical-align: middle; width: 16px; height: 16px; }
  .nfc-message[role="alert"] { border-color: #edc6c2; background: #fff2f2; color: #9f2c2c; }
  .nfc-customers { gap: 11px; }
  .nfc-customer-list { display: grid; }
  .nfc-person { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; padding: 17px 0; border-bottom: 1px solid #ebeff2; }
  .nfc-person:last-child { border-bottom: 0; }
  .nfc-person-info { display: grid; gap: 6px; min-width: 0; }
  .nfc-person-info strong, .nfc-person-info small { overflow-wrap: anywhere; }
  .nfc-person-info strong { font-size: 14px; }
  .nfc-person-info small { font-size: 12px; }
  .nfc-cards { display: flex; gap: 6px; flex-wrap: wrap; }
  .nfc-cards span { border-radius: 7px; padding: 6px 8px; background: #f0f3f5; color: #49555e; font-size: 11px; font-weight: 700; }
  .nfc-person-actions { display: flex; flex-wrap: wrap; gap: 7px; align-items: center; }
  .nfc-person-actions button { min-height: 38px; padding: 8px 11px; font-size: 12px; }
  .nfc-financial { border: 1px solid #cfdfd5; background: #f8fcf9; border-radius: 14px; padding: 17px; margin-top: 11px; display: grid; gap: 15px; min-width: 0; }
  .nfc-financial-heading { justify-content: space-between; }
  .nfc-financial-heading h3 { color: #21593b; }
  .nfc-pagination { justify-content: flex-end; padding-top: 6px; }
  .nfc-pagination small { font-size: 12px; margin: 0 3px; }
  @media (max-width: 1120px) { .nfc-layout { grid-template-columns: minmax(0,1fr) 290px; } }
  @media (max-width: 900px) { .nfc-layout { grid-template-columns: minmax(0,1fr); } .nfc-aside { grid-template-columns: repeat(2,minmax(0,1fr)); align-items: stretch; } }
  @media (max-width: 650px) {
    gap: 13px;
    .nfc-hero { padding: 21px; border-radius: 17px; }
    .nfc-hero-icon { width: 44px; height: 44px; border-radius: 12px; }
    .nfc-hero-icon svg { width: 25px; height: 25px; }
    .nfc-hero h2 { font-size: 24px; }
    .nfc-hero-content { align-items: flex-start; margin-top: 19px; }
    .nfc-trust { font-size: 10px; padding: 6px 8px; }
    .nfc-aside { grid-template-columns: minmax(0,1fr); }
    .surface { padding: 16px; border-radius: 15px; }
    .nfc-section-heading { align-items: flex-start; }
    .nfc-section-heading h3 { font-size: 16px; }
    .nfc-form { grid-template-columns: 1fr; gap: 12px; }
    .nfc-form .nfc-wide { grid-column: auto; }
    .nfc-actions, .nfc-reader-actions, .nfc-lookup, .nfc-person-actions, .nfc-pagination { display: grid; grid-template-columns: minmax(0,1fr); width: 100%; }
    .nfc-actions button, .nfc-reader-actions button, .nfc-form button,
    .nfc-lookup button, .nfc-person-actions button, .nfc-pagination button { width: 100%; justify-self: stretch; }
    .nfc-person { display: grid; gap: 13px; }
    .nfc-financial-heading { align-items: flex-start; }
    .nfc-financial-heading button { flex-shrink: 0; }
    .nfc-tabs button { font-size: 12px; }
    .nfc-pagination { justify-items: stretch; }
    .nfc-payment-note button { width: 100%; }
  }

`;
type Props = { roleLabel?: string };
export function NfcRegistrationPanel({ roleLabel = 'equipe' }: Props) {
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
  const [activeTab, setActiveTab] = useState<'new' | 'existing'>('new');
  const [lookupCustomer, setLookupCustomer] = useState<NfcCustomerRecord | null>(null);
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
      const created = await nfcRegistrationService.create({ name, cpf, phone });
      setName(''); setCpf(''); setPhone(''); setInfo('Cliente cadastrado. Vincule um cartão para continuar.');
      setLookupCustomer(created); setSelectedCustomerId(created.id); setActiveTab('existing');
      await load(1);
    } catch { setError('Não foi possível cadastrar o cliente. Verifique o CPF, telefone ou um cadastro existente.'); }
    finally { setPending(false); }
  };
  const lookup = async () => {
    setPending(true); setError(''); setInfo('');
    try {
      const customer = await nfcRegistrationService.lookup(lookupCpf);
      setLookupCustomer(customer);
      setSelectedCustomerId(customer?.id ?? null);
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
      setActiveTab('existing');
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

  return (
    <Wrap aria-label="Cadastro de clientes e cartões NFC" data-nfc-ui="unified">
      <header className="nfc-hero">
        <div className="nfc-hero-top">
          <span className="nfc-eyebrow">GastroNexa · Cashless NFC</span>
          <span className="nfc-trust"><ShieldCheck aria-hidden="true" /> Dados protegidos</span>
        </div>
        <div className="nfc-hero-content">
          <div>
            <h2>Clientes e cartões NFC</h2>
            <p>Cadastre clientes, vincule cartões e acompanhe comandas. Área de {roleLabel} com acesso restrito ao restaurante autenticado.</p>
          </div>
          <span className="nfc-hero-icon"><ContactRound aria-hidden="true" /></span>
        </div>
      </header>

      <div className="nfc-layout">
        <div className="nfc-main">
          <section className="surface" aria-labelledby="nfc-reader-title">
            <div className="nfc-section-heading">
              <div className="nfc-section-title">
                <span className="nfc-section-icon"><Smartphone aria-hidden="true" /></span>
                <div>
                  <h3 id="nfc-reader-title">Leitura e vínculo de cartões</h3>
                  <p>Prepare o chip uma vez e identifique o cliente com uma aproximação.</p>
                </div>
              </div>
            </div>
            <div className="nfc-actions">
              <button type="button" disabled={pending} onClick={() => void provision()}>Preparar cartão virgem</button>
              <button type="button" className="secondary" disabled={pending} onClick={() => void scanExisting()}>Ler cartão cadastrado</button>
            </div>
            <p className="nfc-hint">A gravação NFC exige Android e navegador compatível. Cartões já programados podem ser identificados por dispositivos compatíveis com a leitura do link.</p>
          </section>

          <section className="surface" aria-labelledby="nfc-registration-title">
            <div className="nfc-section-heading">
              <div>
                <h3 id="nfc-registration-title">Cadastro de clientes</h3>
                <p>Escolha entre cadastrar uma pessoa ou localizar um cadastro existente.</p>
              </div>
            </div>
            <div className="nfc-tabs" role="tablist" aria-label="Tipo de cadastro NFC">
              <button
                type="button" role="tab" id="nfc-tab-new" aria-controls="nfc-pane-new"
                aria-selected={activeTab === 'new'} onClick={() => setActiveTab('new')}
              ><UserPlus aria-hidden="true" /> Novo cliente</button>
              <button
                type="button" role="tab" id="nfc-tab-existing" aria-controls="nfc-pane-existing"
                aria-selected={activeTab === 'existing'} onClick={() => setActiveTab('existing')}
              ><Search aria-hidden="true" /> Cliente cadastrado</button>
            </div>
            {activeTab === 'new' ? (
              <div role="tabpanel" id="nfc-pane-new" aria-labelledby="nfc-tab-new">
                <form className="nfc-form" onSubmit={(event) => void create(event)}>
                  <label className="nfc-wide">Nome completo
                    <input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required minLength={2} maxLength={120} placeholder="Nome e sobrenome" />
                  </label>
                  <label>CPF completo
                    <input autoComplete="off" inputMode="numeric" value={cpf} onChange={(event) => setCpf(event.target.value)} placeholder="000.000.000-00" required />
                  </label>
                  <label>Telefone com DDD
                    <input autoComplete="tel" inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="(85) 99999-9999" required />
                  </label>
                  <button className="nfc-wide" disabled={pending} type="submit"><UserPlus size={17} aria-hidden="true" /> Cadastrar cliente</button>
                </form>
              </div>
            ) : (
              <div role="tabpanel" id="nfc-pane-existing" aria-labelledby="nfc-tab-existing">
                <div className="nfc-lookup">
                  <input aria-label="CPF para consulta" autoComplete="off" inputMode="numeric" placeholder="Informe o CPF completo" value={lookupCpf} onChange={(event) => setLookupCpf(event.target.value)} />
                  <button type="button" disabled={pending || !lookupCpf.trim()} onClick={() => void lookup()}><Search size={17} aria-hidden="true" /> Consultar CPF</button>
                </div>
                {lookupCustomer && (
                  <div className="nfc-found">
                    <div><strong>{lookupCustomer.name}</strong><small>CPF: {lookupCustomer.cpfMasked} · Telefone: {lookupCustomer.phoneMasked}</small></div>
                    <div className="nfc-person-actions">
                      <button type="button" className="secondary" onClick={() => setSelectedCustomerId(lookupCustomer.id)}>Ver comandas</button>
                      {!lookupCustomer.cards.some(card => card.status !== 'REVOKED') && <button type="button" disabled={pending} onClick={() => void issue(lookupCustomer)}>Emitir cartão</button>}
                    </div>
                  </div>
                )}
              </div>
            )}
            <p className="nfc-hint">CPF e telefone são protegidos no servidor e aparecem mascarados nas consultas. Nenhum dado pessoal é gravado no chip.</p>
          </section>
          {error && <div role="alert" className="nfc-message"><ShieldAlert aria-hidden="true" /> {error}</div>}
          {info && <div role="status" className="nfc-message">{info}</div>}
          {newCardUrl && (
            <section className="nfc-message" aria-label="Programação do cartão NFC">
              <strong>{isUnassignedProvision ? 'Preparar cartão sem cliente' : 'Cartão aguardando programação e confirmação'}</strong>
              <p>No Android com Chrome e NFC, grave o identificador e aproxime o mesmo cartão para confirmar a leitura.</p>
              <code>{newCardUrl}</code>
              <div className="nfc-reader-actions">
                <button type="button" disabled={pending} onClick={() => void writeAndActivate()}>{isUnassignedProvision ? 'Gravar e deixar disponível' : 'Gravar e ativar por NFC'}</button>
                <button type="button" className="secondary" onClick={() => { void navigator.clipboard?.writeText(newCardUrl); }}>Copiar identificador</button>
              </div>
            </section>
          )}
        </div>

        <aside className="nfc-aside" aria-label="Orientações do NFC">
          <section className="surface nfc-guide">
            <div className="nfc-section-heading"><div><h3>Como funciona</h3><p>Uma jornada simples para a equipe.</p></div></div>
            <ol className="nfc-guide-list">
              <li><span className="nfc-step">01</span><div><strong>Cadastre o cliente</strong><p>Use nome, CPF e telefone, ou encontre o cadastro existente.</p></div></li>
              <li><span className="nfc-step">02</span><div><strong>Vincule o cartão</strong><p>Aproxime o chip para identificar o vínculo e abrir a comanda.</p></div></li>
              <li><span className="nfc-step">03</span><div><strong>Registre os pedidos</strong><p>O cliente confirma com os 3 primeiros dígitos do CPF.</p></div></li>
              <li><span className="nfc-step">04</span><div><strong>Confira a quitação</strong><p>Na devolução, aproxime o cartão, solicite o CPF completo e confira o pagamento no servidor.</p></div></li>
            </ol>
          </section>
          <section className="nfc-payment-note">
            <ShieldCheck aria-hidden="true" />
            <h3>Quitação e liberação do cartão</h3>
            <p>Consulte as comandas e os pagamentos confirmados. O cartão só poderá ser liberado após a verificação segura de quitação e CPF completo.</p>
            <button type="button" onClick={() => setActiveTab('existing')}>Localizar cliente <ArrowRight aria-hidden="true" /></button>
          </section>
        </aside>
      </div>

      <section className="surface nfc-customers" id="nfc-customer-list" aria-label="Clientes cadastrados">
        <div className="nfc-section-heading">
          <div className="nfc-section-title">
            <span className="nfc-section-icon"><CreditCard aria-hidden="true" /></span>
            <div><h3>Clientes cadastrados ({total})</h3><p>Somente os registros do restaurante autenticado.</p></div>
          </div>
          <button className="secondary" type="button" onClick={() => void load(page)} disabled={pending}><RefreshCw aria-hidden="true" /> Atualizar</button>
        </div>
        <div className="nfc-customer-list">
          {items.map((customer) => (
            <div className="nfc-person" key={customer.id}>
              <div className="nfc-person-info">
                <strong>{customer.name}</strong>
                <small>CPF: {customer.cpfMasked} · Telefone: {customer.phoneMasked}</small>
                <div className="nfc-cards">{customer.cards.map((card) => (
                  <span key={card.id}>{card.displayCode}: {card.status === 'ACTIVE' ? 'Ativo' : card.status === 'READY' ? 'Disponível' : card.status === 'REVOKED' ? 'Revogado' : 'Aguardando gravação'}</span>
                ))}</div>
              </div>
              <div className="nfc-person-actions">
                <button type="button" className="secondary" onClick={() => setSelectedCustomerId(customer.id)}>Ver comandas</button>
                {!customer.cards.some(card => card.status !== 'REVOKED') && <button type="button" disabled={pending} onClick={() => void issue(customer)}>Emitir cartão</button>}
                {customer.cards.filter(card => card.status !== 'REVOKED' && card.status !== 'READY').map(card => (
                  <button type="button" key={card.id} className="danger" disabled={pending} onClick={() => void revoke(card.id)}>Revogar {card.displayCode}</button>
                ))}
              </div>
            </div>
          ))}
          {items.length === 0 && <p>{pending ? 'Carregando clientes...' : 'Nenhum cliente nesta página.'}</p>}
        </div>
        {selectedCustomerId && (
          <div className="nfc-financial">
            <div className="nfc-financial-heading">
              <div><h3>Quitação, histórico e comandas</h3><p>Os valores e pagamentos são verificados pelo servidor.</p></div>
              <button type="button" className="secondary" onClick={() => setSelectedCustomerId(null)}>Fechar consulta</button>
            </div>
            <NfcCustomerComandas
              customerId={selectedCustomerId}
              cardId={
                items.find(customer => customer.id === selectedCustomerId)?.cards.find(card => card.status === 'ACTIVE')?.id
                ?? (lookupCustomer?.id === selectedCustomerId ? lookupCustomer.cards.find(card => card.status === 'ACTIVE')?.id : undefined)
              }
            />
          </div>
        )}
        <div className="nfc-pagination">
          <button type="button" className="secondary" disabled={pending || page <= 1} onClick={() => void load(page - 1)}>Anterior</button>
          <small>Página {page}</small>
          <button type="button" className="secondary" disabled={pending || page * 20 >= total} onClick={() => void load(page + 1)}>Próxima</button>
        </div>
      </section>
    </Wrap>
  );

}
