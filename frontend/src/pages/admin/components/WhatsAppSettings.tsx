import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bike,
  CheckCircle2,
  ImagePlus,
  Info,
  Link2,
  LoaderCircle,
  MessageCircle,
  PackageCheck,
  QrCode,
  RefreshCw,
  Trash2,
  Unplug,
} from 'lucide-react';
import styled from 'styled-components';
import { adminMockSettings } from '../data';
import * as S from '../Admin.styles';
import { getRestaurantCategoryFavicon } from '../../../config/browserBranding';
import restaurantSettingsService from '../../../Services/restaurantSettingsService';

type Settings = typeof adminMockSettings;
type Props = {
  settings: Settings;
  update: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
};
type Connection = {
  configured: boolean;
  provider: 'ZAPI';
  status: 'NOT_CONFIGURED' | 'PENDING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR' | string;
  phone?: string | null;
  trialExpiresAt?: string | null;
  connectedAt?: string | null;
};

const MAX_PROFILE_IMAGE_BYTES = 500_000;
const PUBLIC_STORE_ORIGIN = 'https://www.gastronexa.com.br';

function normalizeWhatsAppNumber(value: string) {
  return String(value || '').replace(/\D/g, '');
}

function normalizeSlug(value: unknown) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/gu, '');
}

function getNumberError(value: string, required: boolean) {
  const digits = normalizeWhatsAppNumber(value);
  if (!digits) return required ? 'Informe o número que será usado no WhatsApp.' : '';
  return digits.length < 10 || digits.length > 13
    ? 'Use DDI, DDD e número, com 10 a 13 dígitos.'
    : '';
}

function readRestaurantIdentity() {
  if (typeof window === 'undefined') {
    return { id: 'default', category: 'RESTAURANTE', slug: '' };
  }
  try {
    const user = JSON.parse(window.localStorage.getItem('user') || 'null') as Record<
      string,
      unknown
    > | null;
    const restaurant =
      user?.restaurant && typeof user.restaurant === 'object'
        ? (user.restaurant as Record<string, unknown>)
        : {};
    return {
      id: String(
        user?.restaurantId ||
          restaurant.id ||
          window.localStorage.getItem('menuRestaurantId') ||
          'default',
      ),
      category: user?.restaurantCategory || restaurant.category || 'RESTAURANTE',
      slug: normalizeSlug(user?.restaurantSlug || restaurant.slug),
    };
  } catch {
    return { id: 'default', category: 'RESTAURANTE', slug: '' };
  }
}

function requestErrorMessage(error: unknown, fallback: string) {
  const value = error as { response?: { data?: { error?: string } }; message?: string };
  return String(value.response?.data?.error || value.message || fallback);
}

export function WhatsAppSettings({ settings, update }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const identity = useMemo(() => readRestaurantIdentity(), []);
  const storageKey = `gastronexa:whatsapp-profile-image:${identity.id}`;
  const [profileImage, setProfileImage] = useState(() =>
    typeof window === 'undefined' ? '' : window.localStorage.getItem(storageKey) || '',
  );
  const [imageError, setImageError] = useState('');
  const [restaurantSlug, setRestaurantSlug] = useState(identity.slug);
  const [connection, setConnection] = useState<Connection>({
    configured: false,
    provider: 'ZAPI',
    status: 'NOT_CONFIGURED',
  });
  const [qrCode, setQrCode] = useState('');
  const [connectionLoading, setConnectionLoading] = useState(false);
  const [connectionError, setConnectionError] = useState('');

  useEffect(() => {
    let active = true;
    void Promise.allSettled([
      restaurantSettingsService.getMySettings(),
      restaurantSettingsService.getWhatsappConnection(),
    ]).then(([settingsResult, connectionResult]) => {
      if (!active) return;
      if (settingsResult.status === 'fulfilled') {
        const loaded = settingsResult.value;
        const restaurant =
          loaded?.restaurant && typeof loaded.restaurant === 'object' ? loaded.restaurant : {};
        const slug = normalizeSlug(restaurant?.slug);
        if (slug) setRestaurantSlug(slug);
      }
      if (connectionResult.status === 'fulfilled') {
        setConnection(connectionResult.value as Connection);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const enabled = Boolean(settings.whatsappEnabled);
  const statusEnabled = Boolean(settings.receiveStatusNotifications);
  const displayName = String(
    settings.whatsappDisplayName || settings.restaurantName || 'Restaurante',
  ).trim();
  const number = normalizeWhatsAppNumber(settings.whatsapp);
  const numberError = getNumberError(settings.whatsapp, enabled);
  const categoryImage = useMemo(
    () => getRestaurantCategoryFavicon(identity.category),
    [identity.category],
  );
  const avatar = profileImage || categoryImage;
  const exampleCustomerName = 'Cliente';
  const exampleOrderId = 107;
  const exampleTotal = 'R$ 89,90';
  const trackingUrl = `https://gastronexa.com.br/orders/${exampleOrderId}/tracking#guestToken=token-seguro-exemplo`;
  const confirmationUrl = `https://gastronexa.com.br/orders/${exampleOrderId}/tracking?confirm=1#guestToken=token-seguro-exemplo`;
  const storeUrl = restaurantSlug
    ? `${PUBLIC_STORE_ORIGIN}/${restaurantSlug}`
    : PUBLIC_STORE_ORIGIN;
  const greetingText =
    String(settings.whatsappDefaultMessage || '').trim() ||
    `Olá! 👋 Bem-vindo ao ${displayName}. Como podemos ajudar?`;
  const connected = connection.status === 'CONNECTED';

  const chooseImage = (file?: File) => {
    if (!file) return;
    setImageError('');
    if (!/^image\/(png|jpeg|webp)$/u.test(file.type)) {
      setImageError('Escolha uma imagem PNG, JPG ou WEBP.');
      return;
    }
    if (file.size > MAX_PROFILE_IMAGE_BYTES) {
      setImageError('A imagem deve ter no máximo 500 KB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const data = String(reader.result || '');
      if (!data) return;
      window.localStorage.setItem(storageKey, data);
      setProfileImage(data);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    window.localStorage.removeItem(storageKey);
    setProfileImage('');
    setImageError('');
  };

  const connectWhatsapp = async () => {
    setConnectionLoading(true);
    setConnectionError('');
    try {
      const current = connection.configured
        ? connection
        : ((await restaurantSettingsService.createWhatsappConnection()) as Connection);
      setConnection(current);
      const qr = await restaurantSettingsService.getWhatsappQrCode();
      setQrCode(String(qr?.qrCode || ''));
    } catch (error) {
      setConnectionError(
        requestErrorMessage(error, 'Não foi possível iniciar a conexão do WhatsApp.'),
      );
    } finally {
      setConnectionLoading(false);
    }
  };

  const refreshConnection = async () => {
    setConnectionLoading(true);
    setConnectionError('');
    try {
      const current = (await restaurantSettingsService.refreshWhatsappConnection()) as Connection;
      setConnection(current);
      if (current.status === 'CONNECTED') setQrCode('');
    } catch (error) {
      setConnectionError(
        requestErrorMessage(error, 'Não foi possível atualizar o status do WhatsApp.'),
      );
    } finally {
      setConnectionLoading(false);
    }
  };

  const disconnectWhatsapp = async () => {
    setConnectionLoading(true);
    setConnectionError('');
    try {
      setConnection(
        (await restaurantSettingsService.disconnectWhatsappConnection()) as Connection,
      );
      setQrCode('');
    } catch (error) {
      setConnectionError(
        requestErrorMessage(error, 'Não foi possível desconectar o WhatsApp.'),
      );
    } finally {
      setConnectionLoading(false);
    }
  };

  return (
    <Panel>
      <header className="wa-header">
        <div className="wa-title">
          <span aria-hidden="true"><MessageCircle size={24} /></span>
          <div>
            <h2>Configurar WhatsApp</h2>
            <p>Conecte o número do restaurante e automatize o atendimento e os avisos do pedido.</p>
          </div>
        </div>
        <label className="channel-state">
          <span>
            <b>{enabled ? 'Canal ativo' : 'Canal desativado'}</b>
            <small>{enabled && number ? `+${number}` : 'Ative quando estiver pronto'}</small>
          </span>
          <input
            className="switch"
            name="whatsappEnabled"
            type="checkbox"
            role="switch"
            aria-label="Ativar WhatsApp do restaurante"
            checked={enabled}
            onChange={(event) => update('whatsappEnabled', event.target.checked)}
          />
        </label>
      </header>

      <div className="wa-grid">
        <div className="left-column">
          <section className="card connection-card">
            <header className="card-heading">
              <span className="step"><Link2 size={15} /></span>
              <div>
                <h3>Conectar o WhatsApp do restaurante</h3>
                <p>Cada restaurante conecta o próprio número. A conexão fica isolada nesta conta.</p>
              </div>
            </header>

            <div className={`connection-status ${connected ? 'connected' : ''}`}>
              <span className="status-dot" />
              <div>
                <b>{connected ? 'WhatsApp conectado' : connection.configured ? 'Aguardando conexão' : 'Ainda não conectado'}</b>
                <small>
                  {connected
                    ? `Mensagens automáticas sairão pelo número ${connection.phone ? `+${connection.phone}` : 'conectado'}.`
                    : 'Clique em Conectar WhatsApp e leia o QR Code com o aparelho do restaurante.'}
                </small>
              </div>
            </div>

            {connectionError ? <div className="connection-error">{connectionError}</div> : null}

            {qrCode && !connected ? (
              <div className="qr-area">
                <img src={qrCode} alt="QR Code para conectar o WhatsApp do restaurante" />
                <div>
                  <b>Leia este QR Code no WhatsApp</b>
                  <span>WhatsApp → Dispositivos conectados → Conectar um dispositivo.</span>
                  <button type="button" onClick={() => void refreshConnection()} disabled={connectionLoading}>
                    <RefreshCw size={14} /> Já escaneei, verificar conexão
                  </button>
                </div>
              </div>
            ) : null}

            <div className="connection-actions">
              {!connected ? (
                <button
                  className="connect-button"
                  type="button"
                  onClick={() => void connectWhatsapp()}
                  disabled={connectionLoading || Boolean(numberError) || !number}
                >
                  {connectionLoading ? <LoaderCircle className="spin" size={15} /> : <QrCode size={15} />}
                  {connection.configured ? 'Mostrar QR Code' : 'Conectar WhatsApp'}
                </button>
              ) : (
                <>
                  <button type="button" onClick={() => void refreshConnection()} disabled={connectionLoading}>
                    <RefreshCw size={14} /> Verificar conexão
                  </button>
                  <button className="disconnect-button" type="button" onClick={() => void disconnectWhatsapp()} disabled={connectionLoading}>
                    <Unplug size={14} /> Desconectar
                  </button>
                </>
              )}
            </div>
            <small className="help">O GastroNexa não mostra tokens ou credenciais do provedor ao ADMIN. A conexão fica vinculada somente ao restaurante autenticado.</small>
          </section>

          <section className="card">
            <header className="card-heading">
              <span className="step">1</span>
              <div><h3>Foto e nome do perfil</h3><p>Escolha como o restaurante será apresentado nas mensagens.</p></div>
            </header>
            <div className="profile-layout">
              <div className="profile-preview">
                <img className={`profile-image ${profileImage ? 'custom' : ''}`} src={avatar} alt="Foto do perfil do WhatsApp" />
                <b>{displayName}</b>
              </div>
              <div>
                <div className="profile-actions">
                  <button className="profile-action" type="button" onClick={() => inputRef.current?.click()}><ImagePlus size={14} /> {profileImage ? 'Alterar foto' : 'Escolher foto'}</button>
                  {profileImage ? <button className="profile-action danger" type="button" onClick={removeImage}><Trash2 size={14} /> Remover</button> : null}
                  <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(event) => chooseImage(event.target.files?.[0])} />
                </div>
                <span className="help">Por padrão usamos a logo preto e branco da categoria, sem fundo. A foto escolhida fica exclusiva desta configuração de WhatsApp.</span>
                {imageError ? <span className="error">{imageError}</span> : null}
                <S.Field style={{ marginTop: 13 }}>
                  Nome no WhatsApp
                  <input name="whatsappDisplayName" maxLength={80} placeholder="Ex.: North Pizza" value={settings.whatsappDisplayName} onChange={(event) => update('whatsappDisplayName', event.target.value)} />
                  <small className="help">Se ficar vazio, usamos o nome do restaurante.</small>
                </S.Field>
              </div>
            </div>
          </section>

          <section className="card">
            <header className="card-heading"><span className="step">2</span><div><h3>Seu número do WhatsApp</h3><p>Informe o mesmo número comercial que será conectado pelo QR Code.</p></div></header>
            <S.Field>
              Número comercial
              <input name="whatsapp" inputMode="tel" autoComplete="tel" placeholder="Ex.: 55 11 99999-9999" value={settings.whatsapp} aria-invalid={Boolean(numberError)} onChange={(event) => update('whatsapp', event.target.value)} />
              <small className={numberError ? 'error' : 'help'}>{numberError || 'Use DDI + DDD + número. Ex.: 55 11 99999-9999.'}</small>
            </S.Field>
          </section>

          <section className="card">
            <header className="card-heading"><span className="step">3</span><div><h3>Mensagens automáticas</h3><p>Defina a mensagem inicial do restaurante e os principais avisos do pedido.</p></div></header>
            <S.Field className="greeting">
              Mensagem inicial do restaurante
              <textarea name="whatsappDefaultMessage" maxLength={500} placeholder="Olá! 👋 Bem-vindo ao nosso atendimento. Como podemos ajudar?" value={settings.whatsappDefaultMessage} onChange={(event) => update('whatsappDefaultMessage', event.target.value)} />
              <small className="help">Digite apenas a mensagem do restaurante. O GastroNexa acrescenta automaticamente o link fixo <b>{storeUrl}</b> ao final. {settings.whatsappDefaultMessage.length}/500 caracteres.</small>
            </S.Field>
            <div className="automation-list">
              <label className="automation-row master">
                <span className="automation-icon"><MessageCircle size={16} /></span>
                <span className="automation-copy"><b>Atualizações automáticas do pedido</b><span>Na produção, um pedido recebe no máximo 5 avisos automáticos: pagamento, preparo, pronto, entrega e conclusão/cancelamento.</span></span>
                <input className="switch" name="receiveStatusNotifications" type="checkbox" role="switch" checked={statusEnabled} disabled={!enabled} onChange={(event) => update('receiveStatusNotifications', event.target.checked)} />
              </label>
              <Automation icon={<CheckCircle2 size={16} />} title="Pagamento confirmado" text="Confirma o pagamento quando houver confirmação eletrônica." />
              <Automation icon={<CheckCircle2 size={16} />} title="Em preparo / pronto" text="Informa os dois avanços importantes da cozinha." />
              <Automation icon={<Bike size={16} />} title="Saiu para entrega" text="Envia o link seguro e real de rastreamento do próprio pedido." />
              <Automation icon={<PackageCheck size={16} />} title="Entregue / cancelado" text="Fecha o fluxo com confirmação de entrega ou aviso de cancelamento." />
            </div>
          </section>
        </div>

        <aside className="preview-card">
          <header className="preview-heading"><span><MessageCircle size={16} /></span><div><h3>Prévia do fluxo enxuto</h3><p>O cliente inicia o contato; a primeira resposta exibida abaixo é a mensagem configurada pelo restaurante mais o link fixo da loja.</p></div></header>
          <div className="preview-note"><Info size={14} /><span>Pedido #{exampleOrderId}, {exampleTotal} e os links de pedido são fictícios. O link da loja usa o slug real deste restaurante.</span></div>
          <div className="chat-preview">
            <div className="chat-message customer"><div className="message-content"><b>{exampleCustomerName}</b><div className="bubble">Olá! Gostaria de falar com o restaurante.</div></div></div>
            <PreviewMessage avatar={avatar} custom={Boolean(profileImage)} name={displayName}>{greetingText}<br /><br /><a href={storeUrl}>{storeUrl}</a></PreviewMessage>
            <PreviewMessage avatar={avatar} custom={Boolean(profileImage)} name={displayName}>Oi, {exampleCustomerName}! ✅ Seu pagamento via PIX foi confirmado.<br />Pedido #{exampleOrderId} no {displayName}.<br />Total: {exampleTotal}.<br />Agora é só aguardar o preparo.</PreviewMessage>
            <PreviewMessage avatar={avatar} custom={Boolean(profileImage)} name={displayName}>Oi, {exampleCustomerName}! 👨‍🍳 Seu pedido #{exampleOrderId} no {displayName} já está em preparo. Quando ficar pronto, você recebe o próximo aviso.</PreviewMessage>
            <PreviewMessage avatar={avatar} custom={Boolean(profileImage)} name={displayName}>Oi, {exampleCustomerName}! 🛵 Seu pedido #{exampleOrderId} saiu para entrega.<br />Acompanhe em tempo real: <a href={trackingUrl}>{trackingUrl}</a></PreviewMessage>
            <PreviewMessage avatar={avatar} custom={Boolean(profileImage)} name={displayName}>Oi, {exampleCustomerName}! 📦 O pedido #{exampleOrderId} foi marcado como entregue.<br />Confirme o recebimento com segurança: <a href={confirmationUrl}>{confirmationUrl}</a><br />Obrigado por pedir no {displayName}!</PreviewMessage>
          </div>
          <div className="tip"><Info size={14} /><span>A mensagem inicial sempre inclui o endereço oficial {storeUrl}. O ADMIN edita somente o texto anterior ao link.</span></div>
        </aside>
      </div>
    </Panel>
  );
}

function Automation({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <div className="automation-row"><span className="automation-icon">{icon}</span><span className="automation-copy"><b>{title}</b><span>{text}</span></span><span className="badge">AUTOMÁTICO</span></div>;
}

function PreviewMessage({ avatar, custom, name, children }: { avatar: string; custom: boolean; name: string; children: React.ReactNode }) {
  return <div className="chat-message"><img className={`chat-avatar ${custom ? 'custom' : ''}`} src={avatar} alt="" aria-hidden="true" /><div className="message-content"><b>{name}</b><div className="bubble">{children}</div></div></div>;
}

const Panel = styled(S.SettingSection)`
  --wa-green:#168a45;--wa-soft:#eef8f1;--wa-text:#24211e;--wa-muted:#746e68;gap:18px;
  .wa-header,.wa-title,.channel-state,.profile-actions,.tip,.connection-actions{display:flex;align-items:center}.wa-header{justify-content:space-between;gap:18px}.wa-title{gap:13px}.wa-title>span{width:50px;height:50px;border-radius:15px;color:#fff;background:var(--wa-green);display:grid;place-items:center}.wa-title h2{margin:0;color:var(--wa-text);font-size:clamp(24px,2.2vw,31px)}.wa-title p{margin:5px 0 0;color:var(--wa-muted);font-size:11px}.channel-state{min-width:225px;justify-content:space-between;gap:14px;border:1px solid #d7e8dc;border-radius:14px;padding:12px 14px;background:#f5fbf7}.channel-state span{display:grid;gap:2px}.channel-state b{color:#176a3c;font-size:11px}.channel-state small{color:#707871;font-size:9px}.switch{appearance:none;width:46px;height:26px;border:0;border-radius:999px;background:#bcc1bc;position:relative;cursor:pointer}.switch::after{content:'';position:absolute;width:20px;height:20px;top:3px;left:3px;border-radius:50%;background:#fff;box-shadow:0 2px 6px rgba(0,0,0,.18);transition:transform 160ms ease}.switch:checked{background:var(--wa-green)}.switch:checked::after{transform:translateX(20px)}.switch:disabled{opacity:.45;cursor:not-allowed}
  .wa-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(360px,.9fr);gap:18px;align-items:start}.left-column{display:grid;gap:14px}.card,.preview-card{border:1px solid var(--border);border-radius:18px;padding:20px;background:#fff;box-shadow:0 8px 20px rgba(56,42,30,.04)}.preview-card{position:sticky;top:18px}.card-heading,.preview-heading{display:grid;grid-template-columns:34px minmax(0,1fr);gap:11px;align-items:start;margin-bottom:16px}.step,.preview-heading>span{width:34px;height:34px;border-radius:10px;display:grid;place-items:center}.step{color:#fff;background:var(--wa-green);font-size:12px;font-weight:900}.preview-heading>span{color:var(--wa-green);background:var(--wa-soft)}.card-heading h3,.preview-heading h3{margin:0;color:var(--wa-text);font-size:16px}.card-heading p,.preview-heading p{margin:4px 0 0;color:var(--wa-muted);font-size:10px;line-height:1.45}
  .connection-card{border-color:#cfe3d5;background:linear-gradient(180deg,#fbfefc,#fff)}.connection-status{display:grid;grid-template-columns:10px minmax(0,1fr);gap:10px;align-items:start;padding:12px;border-radius:12px;background:#f6f6f5}.connection-status.connected{background:#eef9f1}.status-dot{width:10px;height:10px;margin-top:3px;border-radius:50%;background:#9ca3af}.connection-status.connected .status-dot{background:#16a34a;box-shadow:0 0 0 4px rgba(22,163,74,.12)}.connection-status div{display:grid;gap:3px}.connection-status b{font-size:11px}.connection-status small{color:var(--wa-muted);font-size:9px;line-height:1.45}.connection-actions{gap:8px;flex-wrap:wrap;margin-top:12px}.connection-actions button,.qr-area button{min-height:38px;padding:0 12px;border:1px solid #d7ded9;border-radius:10px;background:#fff;color:#36513f;font:inherit;font-size:9px;font-weight:850;display:flex;align-items:center;gap:6px;cursor:pointer}.connection-actions .connect-button{border-color:#168a45;background:#168a45;color:#fff}.connection-actions .disconnect-button{color:#b42318}.connection-actions button:disabled{opacity:.5;cursor:not-allowed}.connection-error{margin-top:10px;padding:9px 10px;border:1px solid #fecaca;border-radius:10px;background:#fff7f7;color:#991b1b;font-size:9px}.qr-area{display:grid;grid-template-columns:150px minmax(0,1fr);gap:16px;align-items:center;margin-top:12px;padding:14px;border:1px solid #dcebe1;border-radius:14px;background:#f8fcf9}.qr-area img{width:150px;height:150px;border-radius:10px;background:#fff}.qr-area div{display:grid;gap:7px}.qr-area b{font-size:11px}.qr-area span{color:var(--wa-muted);font-size:9px;line-height:1.45}.qr-area button{width:max-content;margin-top:3px}.spin{animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
  .profile-layout{display:grid;grid-template-columns:126px minmax(0,1fr);gap:18px;align-items:center}.profile-preview{display:grid;justify-items:center;gap:7px}.profile-image,.chat-avatar{border:1px solid #e3ddd7;border-radius:50%;background:#fff;object-fit:cover}.profile-image{width:92px;height:92px;padding:13px}.profile-image.custom{padding:0}.profile-preview b{max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10.5px}.profile-actions{flex-wrap:wrap;gap:8px;margin-bottom:10px}.profile-action{min-height:37px;border:1px solid #ddd8d2;border-radius:10px;padding:0 10px;background:#fff;color:#3c3631;font:inherit;font-size:10px;font-weight:800;cursor:pointer;display:inline-flex;align-items:center;gap:6px}.profile-action.danger{color:#b42318}.help,.error{display:block;margin-top:6px;font-size:9px;line-height:1.45}.help{color:var(--wa-muted)}.error{color:#b42318}.greeting textarea{min-height:90px}
  .automation-list{margin-top:14px;overflow:hidden;border:1px solid #e8e3de;border-radius:13px}.automation-row{min-height:59px;padding:10px 12px;display:grid;grid-template-columns:33px minmax(0,1fr) auto;gap:10px;align-items:center}.automation-row+.automation-row{border-top:1px solid #eeeae6}.automation-row.master{background:#f7fbf8}.automation-icon{width:33px;height:33px;border-radius:10px;color:var(--wa-green);background:var(--wa-soft);display:grid;place-items:center}.automation-copy{display:grid;gap:2px}.automation-copy b{color:#302b27;font-size:10px}.automation-copy span{color:var(--wa-muted);font-size:8.8px;line-height:1.4}.badge{border-radius:999px;padding:5px 7px;color:#2e6743;background:#eaf6ee;font-size:7.5px;font-weight:900}
  .preview-note,.tip{border-radius:11px;padding:10px 11px;color:#536c5b;background:#f0f8f2;font-size:9px;line-height:1.4;gap:7px}.preview-note{margin-bottom:12px;display:flex;align-items:flex-start}.tip{margin-top:12px;align-items:flex-start}.chat-preview{border:1px solid #e7e1da;border-radius:14px;padding:13px;background:#faf7f2;display:grid;gap:11px;max-height:620px;overflow-y:auto}.chat-message{display:grid;grid-template-columns:36px minmax(0,1fr);gap:9px;align-items:start}.chat-message.customer{grid-template-columns:minmax(0,1fr);padding-left:44px}.chat-message.customer .message-content{justify-self:end;max-width:92%}.chat-message.customer .message-content>b{color:#706a65;text-align:right}.chat-message.customer .bubble{background:#dcf8c6;border-radius:11px 4px 11px 11px}.chat-avatar{width:36px;height:36px;padding:7px}.chat-avatar.custom{padding:0}.message-content>b{display:block;margin:0 0 4px 4px;color:#1b6b3c;font-size:9.5px}.bubble{border-radius:4px 11px 11px 11px;padding:10px 11px;background:#fff;color:#292521;font-size:9.7px;line-height:1.45;overflow-wrap:anywhere;box-shadow:0 2px 6px rgba(54,41,30,.07)}.bubble a{color:#1676d2;font-weight:700;text-decoration:underline}
  @media(max-width:1050px){.wa-grid{grid-template-columns:1fr}.preview-card{position:static}}@media(max-width:700px){.wa-header{align-items:stretch;flex-direction:column}.channel-state{width:100%}.profile-layout,.qr-area{grid-template-columns:1fr}.profile-preview{justify-items:start}}@media(max-width:520px){.card,.preview-card{padding:15px;border-radius:15px}.wa-title h2{font-size:23px}.automation-row{grid-template-columns:31px minmax(0,1fr)}.automation-row .switch,.badge{grid-column:2;justify-self:start}.chat-preview{padding:10px;max-height:none}}
`;
