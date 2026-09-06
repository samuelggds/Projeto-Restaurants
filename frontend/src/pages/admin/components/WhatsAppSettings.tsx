import { useMemo, useRef, useState } from 'react';
import {
  Bike,
  CheckCircle2,
  Clock3,
  ImagePlus,
  Info,
  MessageCircle,
  PackageCheck,
  Save,
  Trash2,
} from 'lucide-react';
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
  --wa-green: #138a4b;
  --wa-green-soft: #edf8f1;
  --wa-ink: #211f1c;
  --wa-muted: #756f69;

  gap: 18px;

  .wa-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    padding: 2px 2px 4px;
  }

  .wa-title {
    display: flex;
    align-items: center;
    gap: 14px;
    min-width: 0;
  }

  .wa-title-icon {
    width: 52px;
    height: 52px;
    border-radius: 16px;
    color: #fff;
    background: var(--wa-green);
    display: grid;
    place-items: center;
    box-shadow: 0 10px 24px rgba(19, 138, 75, 0.18);
  }

  .wa-title h2 {
    margin: 0;
    color: var(--wa-ink);
    font-size: clamp(24px, 2.2vw, 31px);
    line-height: 1.05;
  }

  .wa-title p {
    margin: 6px 0 0;
    color: var(--wa-muted);
    font-size: 12px;
    line-height: 1.5;
  }

  .channel-state {
    min-width: 230px;
    border: 1px solid #d7e9dc;
    border-radius: 15px;
    padding: 13px 14px;
    background: #f5fbf7;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  .channel-state-copy {
    display: grid;
    gap: 3px;
  }

  .channel-state-copy b {
    color: #176a3c;
    font-size: 12px;
  }

  .channel-state-copy small {
    color: #6b756e;
    font-size: 9.5px;
  }

  .switch {
    appearance: none;
    width: 48px;
    height: 27px;
    flex: 0 0 48px;
    border: 0;
    border-radius: 999px;
    background: #b9beb9;
    position: relative;
    cursor: pointer;
    transition: background 160ms ease;
  }

  .switch::after {
    content: '';
    position: absolute;
    width: 21px;
    height: 21px;
    top: 3px;
    left: 3px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
    transition: transform 160ms ease;
  }

  .switch:checked {
    background: var(--wa-green);
  }

  .switch:checked::after {
    transform: translateX(21px);
  }

  .switch:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .switch:focus-visible {
    outline: 3px solid rgba(19, 138, 75, 0.2);
    outline-offset: 3px;
  }

  .wa-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.03fr) minmax(360px, 0.97fr);
    gap: 18px;
    align-items: start;
  }

  .left-column {
    display: grid;
    gap: 14px;
  }

  .card {
    border: 1px solid var(--border);
    border-radius: 18px;
    padding: 20px;
    background: #fff;
    box-shadow: 0 8px 26px rgba(56, 42, 30, 0.045);
  }

  .card-heading {
    display: grid;
    grid-template-columns: 34px minmax(0, 1fr);
    gap: 11px;
    align-items: start;
    margin-bottom: 17px;
  }

  .step-number {
    width: 34px;
    height: 34px;
    border-radius: 11px;
    color: #fff;
    background: var(--wa-green);
    display: grid;
    place-items: center;
    font-size: 12px;
    font-weight: 900;
  }

  .card-heading h3,
  .preview-heading h3 {
    margin: 0;
    color: var(--wa-ink);
    font-size: 16px;
    line-height: 1.2;
  }

  .card-heading p,
  .preview-heading p {
    margin: 4px 0 0;
    color: var(--wa-muted);
    font-size: 10.5px;
    line-height: 1.45;
  }

  .profile-layout {
    display: grid;
    grid-template-columns: 132px minmax(0, 1fr);
    gap: 18px;
    align-items: center;
  }

  .profile-preview {
    display: grid;
    justify-items: center;
    gap: 8px;
  }

  .profile-image {
    width: 94px;
    height: 94px;
    border: 1px solid #e7e3df;
    border-radius: 50%;
    background: #faf9f7;
    object-fit: cover;
    padding: 13px;
  }

  .profile-image.custom {
    padding: 0;
  }

  .profile-preview b {
    max-width: 125px;
    overflow: hidden;
    color: #26211d;
    font-size: 11px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .profile-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 12px;
  }

  .profile-action {
    min-height: 38px;
    border: 1px solid #ddd8d2;
    border-radius: 10px;
    padding: 0 11px;
    color: #39332e;
    background: #fff;
    font: inherit;
    font-size: 10.5px;
    font-weight: 800;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
  }

  .profile-action.danger {
    color: #b42318;
  }

  .profile-help,
  .field-help,
  .field-error {
    display: block;
    margin-top: 6px;
    font-size: 9.5px;
    line-height: 1.45;
  }

  .profile-help,
  .field-help {
    color: var(--wa-muted);
  }

  .field-error {
    color: #b42318;
  }

  input[aria-invalid='true'] {
    border-color: #d92d20;
    box-shadow: 0 0 0 3px rgba(217, 45, 32, 0.08);
  }

  .profile-fields,
  .number-fields {
    display: grid;
    gap: 13px;
  }

  .greeting-block {
    margin-bottom: 15px;
  }

  .greeting-block textarea {
    min-height: 90px;
  }

  .automation-list {
    overflow: hidden;
    border: 1px solid #e8e3de;
    border-radius: 13px;
  }

  .automation-master,
  .automation-row {
    min-height: 60px;
    padding: 11px 12px;
    display: grid;
    grid-template-columns: 34px minmax(0, 1fr) auto;
    align-items: center;
    gap: 11px;
  }

  .automation-master {
    background: #f7fbf8;
    border-bottom: 1px solid #e8e3de;
  }

  .automation-row + .automation-row {
    border-top: 1px solid #eeeae6;
  }

  .automation-icon {
    width: 34px;
    height: 34px;
    border-radius: 10px;
    color: var(--wa-green);
    background: var(--wa-green-soft);
    display: grid;
    place-items: center;
  }

  .automation-copy {
    min-width: 0;
    display: grid;
    gap: 2px;
  }

  .automation-copy b {
    color: #302b27;
    font-size: 10.5px;
  }

  .automation-copy span {
    color: var(--wa-muted);
    font-size: 9px;
    line-height: 1.38;
  }

  .automatic-badge {
    border-radius: 999px;
    padding: 5px 7px;
    color: #2d6542;
    background: #eaf6ee;
    font-size: 8px;
    font-weight: 900;
    white-space: nowrap;
  }

  .preview-card {
    position: sticky;
    top: 18px;
    border: 1px solid var(--border);
    border-radius: 18px;
    padding: 20px;
    background: #fff;
    box-shadow: 0 8px 26px rgba(56, 42, 30, 0.045);
  }

  .preview-heading {
    display: grid;
    grid-template-columns: 34px minmax(0, 1fr);
    gap: 11px;
    align-items: start;
    margin-bottom: 15px;
  }

  .preview-heading > span {
    width: 34px;
    height: 34px;
    border-radius: 10px;
    color: var(--wa-green);
    background: var(--wa-green-soft);
    display: grid;
    place-items: center;
  }

  .preview-note {
    margin-bottom: 12px;
    border-radius: 11px;
    padding: 10px 11px;
    color: #55705e;
    background: #f0f8f2;
    font-size: 9.5px;
    line-height: 1.4;
    display: flex;
    align-items: flex-start;
    gap: 7px;
  }

  .chat-preview {
    border: 1px solid #e7e1da;
    border-radius: 15px;
    padding: 14px;
    background:
      linear-gradient(rgba(249, 246, 241, 0.94), rgba(249, 246, 241, 0.94)),
      radial-gradient(circle at 20% 20%, #e1dbd2 1px, transparent 1px);
    background-size: auto, 13px 13px;
    display: grid;
    gap: 11px;
  }

  .chat-message {
    display: grid;
    grid-template-columns: 38px minmax(0, 1fr);
    gap: 9px;
    align-items: start;
  }

  .chat-avatar {
    width: 38px;
    height: 38px;
    border: 1px solid #e3ddd6;
    border-radius: 50%;
    background: #fff;
    object-fit: cover;
    padding: 7px;
  }

  .chat-avatar.custom {
    padding: 0;
  }

  .message-content {
    min-width: 0;
  }

  .message-content > b {
    display: block;
    margin: 0 0 4px 4px;
    color: #1c6b3c;
    font-size: 10px;
  }

  .message-bubble {
    border-radius: 4px 12px 12px 12px;
    padding: 10px 11px;
    color: #292521;
    background: #fff;
    font-size: 10px;
    line-height: 1.45;
    overflow-wrap: anywhere;
    box-shadow: 0 2px 7px rgba(54, 41, 30, 0.07);
  }

  .message-bubble a {
    color: #1676d2;
    font-weight: 700;
    text-decoration: underline;
  }

  .tip {
    margin-top: 12px;
    border-radius: 12px;
    padding: 11px 12px;
    color: #4f6757;
    background: #edf8f0;
    font-size: 9.5px;
    line-height: 1.45;
    display: flex;
    gap: 8px;
    align-items: flex-start;
  }

  .save-note {
    border-radius: 12px;
    padding: 11px 12px;
    color: #665f59;
    background: #faf8f5;
    font-size: 9.5px;
    line-height: 1.45;
    display: flex;
    gap: 8px;
    align-items: flex-start;
  }

  @media (max-width: 1050px) {
    .wa-grid {
      grid-template-columns: 1fr;
    }

    .preview-card {
      position: static;
    }
  }

  @media (max-width: 700px) {
    .wa-header {
      align-items: stretch;
      flex-direction: column;
    }

    .channel-state {
      width: 100%;
    }

    .profile-layout {
      grid-template-columns: 1fr;
    }

    .profile-preview {
      justify-items: start;
    }
  }

  @media (max-width: 520px) {
    gap: 14px;

    .card,
    .preview-card {
      border-radius: 15px;
      padding: 15px;
    }

    .wa-title-icon {
      width: 46px;
      height: 46px;
      border-radius: 14px;
    }

    .wa-title h2 {
      font-size: 24px;
    }

    .automation-master,
    .automation-row {
      grid-template-columns: 32px minmax(0, 1fr);
    }

    .switch,
    .automatic-badge {
      grid-column: 2;
      justify-self: start;
    }

    .chat-preview {
      padding: 10px;
    }

    .chat-message {
      grid-template-columns: 32px minmax(0, 1fr);
    }

    .chat-avatar {
      width: 32px;
      height: 32px;
    }
  }
`;

function normalizeWhatsAppNumber(value: string) {
  return String(value || '').replace(/\D/g, '');
}

function getWhatsAppNumberError(value: string, required = false) {
  const digits = normalizeWhatsAppNumber(value);
  if (!digits) return required ? 'Informe o número que será usado no WhatsApp.' : '';
  if (digits.length < 10 || digits.length > 13) {
    return 'Use DDI, DDD e número, com 10 a 13 dígitos.';
  }
  return '';
}

function getStoredRestaurantCategory() {
  if (typeof window === 'undefined') return 'RESTAURANTE';
  try {
    const user = JSON.parse(window.localStorage.getItem('user') || 'null') as
      | Record<string, unknown>
      | null;
    const restaurant =
      user?.restaurant && typeof user.restaurant === 'object'
        ? (user.restaurant as Record<string, unknown>)
        : {};
    return user?.restaurantCategory || restaurant.category || 'RESTAURANTE';
  } catch {
    return 'RESTAURANTE';
  }
}

function getPreviewBaseUrl() {
  if (typeof window === 'undefined') return 'https://seu-restaurante.com';
  return window.location.origin;
}

export function WhatsAppSettings({ settings, update }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageError, setImageError] = useState('');
  const whatsappEnabled = Boolean(settings.whatsappEnabled);
  const statusNotificationsEnabled = Boolean(settings.receiveStatusNotifications);
  const displayName = String(settings.whatsappDisplayName || settings.restaurantName || '').trim();
  const defaultMessage = String(settings.whatsappDefaultMessage || '').trim();
  const previewNumber = normalizeWhatsAppNumber(settings.whatsapp);
  const numberError = getWhatsAppNumberError(settings.whatsapp, whatsappEnabled);
  const profileImage = String(settings.logoUrl || '').trim();
  const categoryImage = useMemo(
    () => getRestaurantCategoryFavicon(getStoredRestaurantCategory()),
    [],
  );
  const visibleProfileImage = profileImage || categoryImage;
  const previewBaseUrl = getPreviewBaseUrl();
  const trackingUrl = `${previewBaseUrl}/orders/107/tracking`;
  const storeUrl = previewBaseUrl;

  const greetingPreview =
    defaultMessage ||
    `Olá! 👋 Bem-vindo(a) à ${displayName || 'nossa loja'}!\nFaça seu pedido pelo nosso site:\n${storeUrl}`;

  const handleProfileImage = (file?: File) => {
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
      const result = String(reader.result || '');
      if (result) update('logoUrl', result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <Panel>
      <header className="wa-header">
        <div className="wa-title">
          <span className="wa-title-icon" aria-hidden="true">
            <MessageCircle size={25} />
          </span>
          <div>
            <h2>Configurar WhatsApp</h2>
            <p>Configure o contato e veja, de forma simples, quais mensagens o cliente receberá.</p>
          </div>
        </div>

        <label className="channel-state">
          <span className="channel-state-copy">
            <b>{whatsappEnabled ? 'Canal ativo' : 'Canal desativado'}</b>
            <small>
              {whatsappEnabled
                ? previewNumber
                  ? `+${previewNumber}`
                  : 'Informe o número abaixo'
                : 'Ative quando estiver pronto para usar'}
            </small>
          </span>
          <input
            className="switch"
            name="whatsappEnabled"
            type="checkbox"
            role="switch"
            aria-label="Ativar WhatsApp do restaurante"
            checked={whatsappEnabled}
            onChange={(event) => update('whatsappEnabled', event.target.checked)}
          />
        </label>
      </header>

      <div className="wa-grid">
        <div className="left-column">
          <section className="card" aria-labelledby="whatsapp-profile-title">
            <header className="card-heading">
              <span className="step-number">1</span>
              <div>
                <h3 id="whatsapp-profile-title">Foto e nome do perfil</h3>
                <p>É assim que o restaurante será apresentado na prévia das mensagens.</p>
              </div>
            </header>

            <div className="profile-layout">
              <div className="profile-preview">
                <img
                  className={`profile-image ${profileImage ? 'custom' : ''}`}
                  src={visibleProfileImage}
                  alt="Prévia da foto do perfil do WhatsApp"
                />
                <b>{displayName || 'Nome do restaurante'}</b>
              </div>

              <div>
                <div className="profile-actions">
                  <button
                    className="profile-action"
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImagePlus size={15} aria-hidden="true" />
                    {profileImage ? 'Alterar foto' : 'Escolher foto'}
                  </button>
                  {profileImage ? (
                    <button
                      className="profile-action danger"
                      type="button"
                      onClick={() => update('logoUrl', '')}
                    >
                      <Trash2 size={15} aria-hidden="true" /> Remover
                    </button>
                  ) : null}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    hidden
                    onChange={(event) => handleProfileImage(event.target.files?.[0])}
                  />
                </div>
                <span className="profile-help">
                  Sem foto personalizada, usamos automaticamente a logo preto e branco da categoria,
                  sem fundo. Recomendado: imagem quadrada de até 500 KB.
                </span>
                {imageError ? <span className="field-error">{imageError}</span> : null}

                <div className="profile-fields" style={{ marginTop: 13 }}>
                  <S.Field>
                    Nome no WhatsApp
                    <input
                      name="whatsappDisplayName"
                      maxLength={80}
                      placeholder="Ex.: North Pizza"
                      value={settings.whatsappDisplayName}
                      onChange={(event) => update('whatsappDisplayName', event.target.value)}
                    />
                    <small className="field-help">
                      Se ficar vazio, o sistema usa o nome do restaurante.
                    </small>
                  </S.Field>
                </div>
              </div>
            </div>
          </section>

          <section className="card" aria-labelledby="whatsapp-number-title">
            <header className="card-heading">
              <span className="step-number">2</span>
              <div>
                <h3 id="whatsapp-number-title">Seu número do WhatsApp</h3>
                <p>Informe o número comercial que será usado para atender os clientes.</p>
              </div>
            </header>

            <div className="number-fields">
              <S.Field>
                Número comercial
                <input
                  name="whatsapp"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="Ex.: 55 11 99999-9999"
                  value={settings.whatsapp}
                  aria-invalid={Boolean(numberError)}
                  aria-describedby={numberError ? 'whatsapp-number-error' : 'whatsapp-number-help'}
                  onChange={(event) => update('whatsapp', event.target.value)}
                />
                {numberError ? (
                  <small className="field-error" id="whatsapp-number-error">
                    {numberError}
                  </small>
                ) : (
                  <small className="field-help" id="whatsapp-number-help">
                    Use DDI + DDD + número. Exemplo: 55 11 99999-9999.
                  </small>
                )}
              </S.Field>
            </div>
          </section>

          <section className="card" aria-labelledby="whatsapp-automations-title">
            <header className="card-heading">
              <span className="step-number">3</span>
              <div>
                <h3 id="whatsapp-automations-title">Mensagens automáticas</h3>
                <p>Configure a saudação e escolha se o cliente deve receber atualizações do pedido.</p>
              </div>
            </header>

            <S.Field className="greeting-block">
              Mensagem de saudação
              <textarea
                name="whatsappDefaultMessage"
                maxLength={500}
                placeholder={`Olá! 👋 Bem-vindo(a) ao restaurante!\nFaça seu pedido pelo nosso site.`}
                value={settings.whatsappDefaultMessage}
                onChange={(event) => update('whatsappDefaultMessage', event.target.value)}
              />
              <small className="field-help">
                {settings.whatsappDefaultMessage.length}/500 caracteres · usada quando o cliente iniciar o contato.
              </small>
            </S.Field>

            <div className="automation-list">
              <label className="automation-master">
                <span className="automation-icon" aria-hidden="true">
                  <Clock3 size={17} />
                </span>
                <span className="automation-copy">
                  <b>Atualizações automáticas do pedido</b>
                  <span>
                    Ative para informar mudanças do pedido quando o provedor do WhatsApp estiver configurado.
                    {!whatsappEnabled ? ' Ative o canal primeiro.' : ''}
                  </span>
                </span>
                <input
                  className="switch"
                  name="receiveStatusNotifications"
                  type="checkbox"
                  role="switch"
                  checked={statusNotificationsEnabled}
                  disabled={!whatsappEnabled}
                  onChange={(event) => update('receiveStatusNotifications', event.target.checked)}
                />
              </label>

              <div className="automation-row">
                <span className="automation-icon" aria-hidden="true">
                  <CheckCircle2 size={17} />
                </span>
                <span className="automation-copy">
                  <b>Pedido confirmado / em preparo</b>
                  <span>O cliente recebe uma mensagem curta informando a nova etapa.</span>
                </span>
                <span className="automatic-badge">AUTOMÁTICO</span>
              </div>

              <div className="automation-row">
                <span className="automation-icon" aria-hidden="true">
                  <Bike size={17} />
                </span>
                <span className="automation-copy">
                  <b>Saiu para entrega</b>
                  <span>Inclui o link do rastreamento real do pedido: /orders/:id/tracking.</span>
                </span>
                <span className="automatic-badge">AUTOMÁTICO</span>
              </div>

              <div className="automation-row">
                <span className="automation-icon" aria-hidden="true">
                  <PackageCheck size={17} />
                </span>
                <span className="automation-copy">
                  <b>Confirmação da entrega</b>
                  <span>Direciona o cliente ao acompanhamento do pedido, onde ocorre a confirmação segura.</span>
                </span>
                <span className="automatic-badge">AUTOMÁTICO</span>
              </div>
            </div>
          </section>

          <div className="save-note">
            <Save size={15} aria-hidden="true" />
            <span>
              Use o botão “Salvar configurações” já existente no fim da página. Nenhuma alteração foi feita na navegação lateral do painel.
            </span>
          </div>
        </div>

        <aside className="preview-card" aria-labelledby="whatsapp-preview-title">
          <header className="preview-heading">
            <span aria-hidden="true">
              <MessageCircle size={17} />
            </span>
            <div>
              <h3 id="whatsapp-preview-title">Exemplo de mensagens</h3>
              <p>Uma prévia simples de como o cliente enxergará cada etapa.</p>
            </div>
          </header>

          <div className="preview-note">
            <Info size={14} aria-hidden="true" />
            <span>
              Os números, horários e pedido #107 são apenas exemplos. O sistema usa os dados reais de cada pedido.
            </span>
          </div>

          <div className="chat-preview">
            <div className="chat-message">
              <img
                className={`chat-avatar ${profileImage ? 'custom' : ''}`}
                src={visibleProfileImage}
                alt=""
                aria-hidden="true"
              />
              <div className="message-content">
                <b>{displayName || 'Restaurante'}</b>
                <div className="message-bubble" style={{ whiteSpace: 'pre-line' }}>
                  {greetingPreview}
                </div>
              </div>
            </div>

            <div className="chat-message">
              <img
                className={`chat-avatar ${profileImage ? 'custom' : ''}`}
                src={visibleProfileImage}
                alt=""
                aria-hidden="true"
              />
              <div className="message-content">
                <b>{displayName || 'Restaurante'}</b>
                <div className="message-bubble">
                  ✅ Seu pedido #107 foi confirmado!<br />Em breve começaremos o preparo.
                </div>
              </div>
            </div>

            <div className="chat-message">
              <img
                className={`chat-avatar ${profileImage ? 'custom' : ''}`}
                src={visibleProfileImage}
                alt=""
                aria-hidden="true"
              />
              <div className="message-content">
                <b>{displayName || 'Restaurante'}</b>
                <div className="message-bubble">
                  🛵 Seu pedido #107 saiu para entrega!<br />
                  Acompanhe em tempo real pelo link:<br />
                  <a href={trackingUrl}>{trackingUrl}</a>
                </div>
              </div>
            </div>

            <div className="chat-message">
              <img
                className={`chat-avatar ${profileImage ? 'custom' : ''}`}
                src={visibleProfileImage}
                alt=""
                aria-hidden="true"
              />
              <div className="message-content">
                <b>{displayName || 'Restaurante'}</b>
                <div className="message-bubble">
                  📦 Confirme o recebimento do seu pedido #107.<br />
                  Abra o acompanhamento seguro:<br />
                  <a href={trackingUrl}>{trackingUrl}</a>
                </div>
              </div>
            </div>
          </div>

          <div className="tip">
            <Info size={15} aria-hidden="true" />
            <span>
              A prévia não envia mensagens. Os disparos reais continuam protegidos pela configuração do provedor e pelas regras de status do pedido.
            </span>
          </div>
        </aside>
      </div>
    </Panel>
  );
}
