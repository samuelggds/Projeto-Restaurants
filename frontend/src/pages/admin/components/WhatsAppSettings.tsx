import { useMemo, useRef, useState } from 'react';
import { Bike, CheckCircle2, ImagePlus, Info, MessageCircle, PackageCheck, Trash2 } from 'lucide-react';
import styled from 'styled-components';
import { adminMockSettings } from '../data';
import * as S from '../Admin.styles';
import { getRestaurantCategoryFavicon } from '../../../config/browserBranding';

type Settings = typeof adminMockSettings;
type Props = {
  settings: Settings;
  update: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
};

const MAX_PROFILE_IMAGE_BYTES = 500_000;

const Panel = styled(S.SettingSection)`
  --wa-green: #168a45;
  --wa-soft: #eef8f1;
  --wa-text: #24211e;
  --wa-muted: #746e68;
  gap: 18px;

  .wa-header,
  .wa-title,
  .channel-state,
  .profile-actions,
  .tip {
    display: flex;
    align-items: center;
  }

  .wa-header {
    justify-content: space-between;
    gap: 18px;
  }

  .wa-title { gap: 13px; }
  .wa-title > span {
    width: 50px;
    height: 50px;
    border-radius: 15px;
    color: #fff;
    background: var(--wa-green);
    display: grid;
    place-items: center;
  }
  .wa-title h2 { margin: 0; color: var(--wa-text); font-size: clamp(24px, 2.2vw, 31px); }
  .wa-title p { margin: 5px 0 0; color: var(--wa-muted); font-size: 11px; }

  .channel-state {
    min-width: 225px;
    justify-content: space-between;
    gap: 14px;
    border: 1px solid #d7e8dc;
    border-radius: 14px;
    padding: 12px 14px;
    background: #f5fbf7;
  }
  .channel-state span { display: grid; gap: 2px; }
  .channel-state b { color: #176a3c; font-size: 11px; }
  .channel-state small { color: #707871; font-size: 9px; }

  .switch {
    appearance: none;
    width: 46px;
    height: 26px;
    border: 0;
    border-radius: 999px;
    background: #bcc1bc;
    position: relative;
    cursor: pointer;
  }
  .switch::after {
    content: '';
    position: absolute;
    width: 20px;
    height: 20px;
    top: 3px;
    left: 3px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 2px 6px rgba(0,0,0,.18);
    transition: transform 160ms ease;
  }
  .switch:checked { background: var(--wa-green); }
  .switch:checked::after { transform: translateX(20px); }
  .switch:disabled { opacity: .45; cursor: not-allowed; }

  .wa-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(360px, .9fr);
    gap: 18px;
    align-items: start;
  }
  .left-column { display: grid; gap: 14px; }

  .card,
  .preview-card {
    border: 1px solid var(--border);
    border-radius: 18px;
    padding: 20px;
    background: #fff;
    box-shadow: 0 8px 24px rgba(56,42,30,.045);
  }
  .preview-card { position: sticky; top: 18px; }

  .card-heading,
  .preview-heading {
    display: grid;
    grid-template-columns: 34px minmax(0,1fr);
    gap: 11px;
    align-items: start;
    margin-bottom: 16px;
  }
  .step,
  .preview-heading > span {
    width: 34px;
    height: 34px;
    border-radius: 10px;
    display: grid;
    place-items: center;
  }
  .step { color: #fff; background: var(--wa-green); font-size: 12px; font-weight: 900; }
  .preview-heading > span { color: var(--wa-green); background: var(--wa-soft); }
  .card-heading h3,
  .preview-heading h3 { margin: 0; color: var(--wa-text); font-size: 16px; }
  .card-heading p,
  .preview-heading p { margin: 4px 0 0; color: var(--wa-muted); font-size: 10px; line-height: 1.45; }

  .profile-layout {
    display: grid;
    grid-template-columns: 126px minmax(0,1fr);
    gap: 18px;
    align-items: center;
  }
  .profile-preview { display: grid; justify-items: center; gap: 7px; }
  .profile-image,
  .chat-avatar {
    border: 1px solid #e3ddd7;
    border-radius: 50%;
    background: #fff;
    object-fit: cover;
  }
  .profile-image { width: 92px; height: 92px; padding: 13px; }
  .profile-image.custom { padding: 0; }
  .profile-preview b { max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 10.5px; }
  .profile-actions { flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }
  .profile-action {
    min-height: 37px;
    border: 1px solid #ddd8d2;
    border-radius: 10px;
    padding: 0 10px;
    background: #fff;
    color: #3c3631;
    font: inherit;
    font-size: 10px;
    font-weight: 800;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .profile-action.danger { color: #b42318; }
  .help,
  .error { display: block; margin-top: 6px; font-size: 9px; line-height: 1.45; }
  .help { color: var(--wa-muted); }
  .error { color: #b42318; }

  .greeting textarea { min-height: 90px; }

  .automation-list {
    margin-top: 14px;
    overflow: hidden;
    border: 1px solid #e8e3de;
    border-radius: 13px;
  }
  .automation-row {
    min-height: 59px;
    padding: 10px 12px;
    display: grid;
    grid-template-columns: 33px minmax(0,1fr) auto;
    gap: 10px;
    align-items: center;
  }
  .automation-row + .automation-row { border-top: 1px solid #eeeae6; }
  .automation-row.master { background: #f7fbf8; }
  .automation-icon {
    width: 33px;
    height: 33px;
    border-radius: 10px;
    color: var(--wa-green);
    background: var(--wa-soft);
    display: grid;
    place-items: center;
  }
  .automation-copy { display: grid; gap: 2px; }
  .automation-copy b { color: #302b27; font-size: 10px; }
  .automation-copy span { color: var(--wa-muted); font-size: 8.8px; line-height: 1.4; }
  .badge { border-radius: 999px; padding: 5px 7px; color: #2e6743; background: #eaf6ee; font-size: 7.5px; font-weight: 900; }

  .preview-note,
  .tip {
    border-radius: 11px;
    padding: 10px 11px;
    color: #536c5b;
    background: #f0f8f2;
    font-size: 9px;
    line-height: 1.4;
    gap: 7px;
  }
  .preview-note { margin-bottom: 12px; display: flex; align-items: flex-start; }
  .tip { margin-top: 12px; align-items: flex-start; }

  .chat-preview {
    border: 1px solid #e7e1da;
    border-radius: 14px;
    padding: 13px;
    background: #faf7f2;
    display: grid;
    gap: 11px;
  }
  .chat-message { display: grid; grid-template-columns: 36px minmax(0,1fr); gap: 9px; align-items: start; }
  .chat-avatar { width: 36px; height: 36px; padding: 7px; }
  .chat-avatar.custom { padding: 0; }
  .message-content > b { display: block; margin: 0 0 4px 4px; color: #1b6b3c; font-size: 9.5px; }
  .bubble {
    border-radius: 4px 11px 11px 11px;
    padding: 10px 11px;
    background: #fff;
    color: #292521;
    font-size: 9.7px;
    line-height: 1.45;
    overflow-wrap: anywhere;
    box-shadow: 0 2px 6px rgba(54,41,30,.07);
  }
  .bubble a { color: #1676d2; font-weight: 700; text-decoration: underline; }

  @media (max-width: 1050px) {
    .wa-grid { grid-template-columns: 1fr; }
    .preview-card { position: static; }
  }
  @media (max-width: 700px) {
    .wa-header { align-items: stretch; flex-direction: column; }
    .channel-state { width: 100%; }
    .profile-layout { grid-template-columns: 1fr; }
    .profile-preview { justify-items: start; }
  }
  @media (max-width: 520px) {
    .card, .preview-card { padding: 15px; border-radius: 15px; }
    .wa-title h2 { font-size: 23px; }
    .automation-row { grid-template-columns: 31px minmax(0,1fr); }
    .automation-row .switch, .badge { grid-column: 2; justify-self: start; }
    .chat-preview { padding: 10px; }
  }
`;

function normalizeWhatsAppNumber(value: string) {
  return String(value || '').replace(/\D/g, '');
}

function getNumberError(value: string, required: boolean) {
  const digits = normalizeWhatsAppNumber(value);
  if (!digits) return required ? 'Informe o número que será usado no WhatsApp.' : '';
  if (digits.length < 10 || digits.length > 13) return 'Use DDI, DDD e número, com 10 a 13 dígitos.';
  return '';
}

function readRestaurantIdentity() {
  if (typeof window === 'undefined') return { id: 'default', category: 'RESTAURANTE' };
  try {
    const user = JSON.parse(window.localStorage.getItem('user') || 'null') as Record<string, unknown> | null;
    const restaurant = user?.restaurant && typeof user.restaurant === 'object'
      ? (user.restaurant as Record<string, unknown>)
      : {};
    return {
      id: String(user?.restaurantId || restaurant.id || window.localStorage.getItem('menuRestaurantId') || 'default'),
      category: user?.restaurantCategory || restaurant.category || 'RESTAURANTE',
    };
  } catch {
    return { id: 'default', category: 'RESTAURANTE' };
  }
}

export function WhatsAppSettings({ settings, update }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const identity = useMemo(readRestaurantIdentity, []);
  const storageKey = `pecajaf:whatsapp-profile-image:${identity.id}`;
  const [profileImage, setProfileImage] = useState(() => {
    if (typeof window === 'undefined') return '';
    return window.localStorage.getItem(storageKey) || '';
  });
  const [imageError, setImageError] = useState('');

  const enabled = Boolean(settings.whatsappEnabled);
  const statusEnabled = Boolean(settings.receiveStatusNotifications);
  const displayName = String(settings.whatsappDisplayName || settings.restaurantName || 'Restaurante').trim();
  const number = normalizeWhatsAppNumber(settings.whatsapp);
  const numberError = getNumberError(settings.whatsapp, enabled);
  const categoryImage = useMemo(() => getRestaurantCategoryFavicon(identity.category), [identity.category]);
  const avatar = profileImage || categoryImage;
  const baseUrl = typeof window === 'undefined' ? 'https://seu-restaurante.com' : window.location.origin;
  const trackingUrl = `${baseUrl}/orders/107/tracking`;
  const greeting = String(settings.whatsappDefaultMessage || '').trim() ||
    `Olá! 👋 Bem-vindo(a) à ${displayName}!\nFaça seu pedido pelo nosso site:\n${baseUrl}`;

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

  return (
    <Panel>
      <header className="wa-header">
        <div className="wa-title">
          <span aria-hidden="true"><MessageCircle size={24} /></span>
          <div>
            <h2>Configurar WhatsApp</h2>
            <p>Configure o contato e veja como o cliente receberá as mensagens.</p>
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
          <section className="card">
            <header className="card-heading">
              <span className="step">1</span>
              <div>
                <h3>Foto e nome do perfil</h3>
                <p>Escolha como o restaurante será apresentado nas mensagens.</p>
              </div>
            </header>
            <div className="profile-layout">
              <div className="profile-preview">
                <img className={`profile-image ${profileImage ? 'custom' : ''}`} src={avatar} alt="Foto do perfil do WhatsApp" />
                <b>{displayName}</b>
              </div>
              <div>
                <div className="profile-actions">
                  <button className="profile-action" type="button" onClick={() => inputRef.current?.click()}>
                    <ImagePlus size={14} /> {profileImage ? 'Alterar foto' : 'Escolher foto'}
                  </button>
                  {profileImage ? (
                    <button className="profile-action danger" type="button" onClick={removeImage}>
                      <Trash2 size={14} /> Remover
                    </button>
                  ) : null}
                  <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(event) => chooseImage(event.target.files?.[0])} />
                </div>
                <span className="help">Por padrão usamos a logo preto e branco da categoria, sem fundo. A foto escolhida fica exclusiva desta configuração de WhatsApp.</span>
                {imageError ? <span className="error">{imageError}</span> : null}
                <S.Field style={{ marginTop: 13 }}>
                  Nome no WhatsApp
                  <input
                    name="whatsappDisplayName"
                    maxLength={80}
                    placeholder="Ex.: North Pizza"
                    value={settings.whatsappDisplayName}
                    onChange={(event) => update('whatsappDisplayName', event.target.value)}
                  />
                  <small className="help">Se ficar vazio, usamos o nome do restaurante.</small>
                </S.Field>
              </div>
            </div>
          </section>

          <section className="card">
            <header className="card-heading">
              <span className="step">2</span>
              <div>
                <h3>Seu número do WhatsApp</h3>
                <p>Informe o número comercial que receberá as mensagens dos clientes.</p>
              </div>
            </header>
            <S.Field>
              Número comercial
              <input
                name="whatsapp"
                inputMode="tel"
                autoComplete="tel"
                placeholder="Ex.: 55 11 99999-9999"
                value={settings.whatsapp}
                aria-invalid={Boolean(numberError)}
                onChange={(event) => update('whatsapp', event.target.value)}
              />
              <small className={numberError ? 'error' : 'help'}>{numberError || 'Use DDI + DDD + número. Ex.: 55 11 99999-9999.'}</small>
            </S.Field>
          </section>

          <section className="card">
            <header className="card-heading">
              <span className="step">3</span>
              <div>
                <h3>Mensagens automáticas</h3>
                <p>Defina a saudação e ative as atualizações do andamento do pedido.</p>
              </div>
            </header>
            <S.Field className="greeting">
              Mensagem de saudação
              <textarea
                name="whatsappDefaultMessage"
                maxLength={500}
                placeholder="Olá! 👋 Bem-vindo(a) ao restaurante!"
                value={settings.whatsappDefaultMessage}
                onChange={(event) => update('whatsappDefaultMessage', event.target.value)}
              />
              <small className="help">{settings.whatsappDefaultMessage.length}/500 caracteres</small>
            </S.Field>

            <div className="automation-list">
              <label className="automation-row master">
                <span className="automation-icon"><MessageCircle size={16} /></span>
                <span className="automation-copy">
                  <b>Atualizações automáticas do pedido</b>
                  <span>Ative para enviar mudanças de status quando o provedor do WhatsApp estiver configurado.</span>
                </span>
                <input
                  className="switch"
                  name="receiveStatusNotifications"
                  type="checkbox"
                  role="switch"
                  checked={statusEnabled}
                  disabled={!enabled}
                  onChange={(event) => update('receiveStatusNotifications', event.target.checked)}
                />
              </label>
              <div className="automation-row">
                <span className="automation-icon"><CheckCircle2 size={16} /></span>
                <span className="automation-copy"><b>Pedido confirmado / em preparo</b><span>Informa ao cliente a nova etapa do pedido.</span></span>
                <span className="badge">AUTOMÁTICO</span>
              </div>
              <div className="automation-row">
                <span className="automation-icon"><Bike size={16} /></span>
                <span className="automation-copy"><b>Saiu para entrega</b><span>Mostra o link real de rastreamento em /orders/:id/tracking.</span></span>
                <span className="badge">AUTOMÁTICO</span>
              </div>
              <div className="automation-row">
                <span className="automation-icon"><PackageCheck size={16} /></span>
                <span className="automation-copy"><b>Confirmar entrega</b><span>Leva o cliente ao acompanhamento seguro do próprio pedido.</span></span>
                <span className="badge">AUTOMÁTICO</span>
              </div>
            </div>
          </section>
        </div>

        <aside className="preview-card">
          <header className="preview-heading">
            <span><MessageCircle size={16} /></span>
            <div><h3>Exemplo de mensagens</h3><p>Veja como o cliente receberá cada atualização.</p></div>
          </header>
          <div className="preview-note"><Info size={14} /><span>Pedido #107 e horários são exemplos. Em produção usamos os dados reais.</span></div>
          <div className="chat-preview">
            <PreviewMessage avatar={avatar} custom={Boolean(profileImage)} name={displayName}>
              <span style={{ whiteSpace: 'pre-line' }}>{greeting}</span>
            </PreviewMessage>
            <PreviewMessage avatar={avatar} custom={Boolean(profileImage)} name={displayName}>
              ✅ Seu pedido #107 foi confirmado!<br />Em breve começaremos o preparo.
            </PreviewMessage>
            <PreviewMessage avatar={avatar} custom={Boolean(profileImage)} name={displayName}>
              🛵 Seu pedido #107 saiu para entrega!<br />Acompanhe em tempo real:<br /><a href={trackingUrl}>{trackingUrl}</a>
            </PreviewMessage>
            <PreviewMessage avatar={avatar} custom={Boolean(profileImage)} name={displayName}>
              📦 Confirme o recebimento do pedido #107.<br />Abra o acompanhamento seguro:<br /><a href={trackingUrl}>{trackingUrl}</a>
            </PreviewMessage>
          </div>
          <div className="tip"><Info size={14} /><span>A prévia não envia mensagens. Os disparos reais continuam sujeitos ao provedor configurado e às regras do pedido.</span></div>
        </aside>
      </div>
    </Panel>
  );
}

function PreviewMessage({
  avatar,
  custom,
  name,
  children,
}: {
  avatar: string;
  custom: boolean;
  name: string;
  children: React.ReactNode;
}) {
  return (
    <div className="chat-message">
      <img className={`chat-avatar ${custom ? 'custom' : ''}`} src={avatar} alt="" aria-hidden="true" />
      <div className="message-content">
        <b>{name}</b>
        <div className="bubble">{children}</div>
      </div>
    </div>
  );
}
