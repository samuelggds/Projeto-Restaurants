import { Bell, CheckCircle2, Clock3, Info, MessageCircle, Send, Smartphone } from 'lucide-react';
import styled from 'styled-components';
import { adminMockSettings } from '../data';
import * as S from '../Admin.styles';

type Settings = typeof adminMockSettings;
type Props = {
  settings: Settings;
  update: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
};

const Panel = styled(S.SettingSection)`
  --wa-green: #168a45;
  --wa-dark: #103f2a;
  --wa-soft: #eef9f1;

  .channel-hero {
    position: relative;
    overflow: hidden;
    min-height: 178px;
    border-radius: 22px;
    padding: 28px;
    color: #fff;
    background:
      radial-gradient(circle at 88% 12%, rgba(103, 238, 153, 0.24), transparent 28%),
      linear-gradient(125deg, #102b35 0%, #124c35 58%, #1b6c42 100%);
    box-shadow: 0 20px 44px rgba(20, 75, 50, 0.17);
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 28px;
  }

  .channel-hero::after {
    content: '';
    position: absolute;
    width: 190px;
    height: 190px;
    right: -72px;
    bottom: -115px;
    border: 28px solid rgba(255, 255, 255, 0.07);
    border-radius: 50%;
    pointer-events: none;
  }

  .hero-copy {
    position: relative;
    z-index: 1;
    display: grid;
    grid-template-columns: 54px minmax(0, 1fr);
    gap: 16px;
    align-items: start;
  }

  .hero-icon {
    width: 54px;
    height: 54px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 17px;
    background: rgba(255, 255, 255, 0.12);
    display: grid;
    place-items: center;
    backdrop-filter: blur(8px);
  }

  .eyebrow {
    margin: 0 0 7px;
    color: #99e9b4;
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .channel-hero h2 {
    margin: 0;
    color: #fff;
    font-size: clamp(21px, 2.4vw, 29px);
    line-height: 1.08;
  }

  .channel-hero p:not(.eyebrow) {
    max-width: 620px;
    margin: 9px 0 0;
    color: rgba(255, 255, 255, 0.74);
    font-size: 12px;
    line-height: 1.55;
  }

  .master-control {
    position: relative;
    z-index: 2;
    min-width: 222px;
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 16px;
    padding: 14px 15px;
    background: rgba(7, 31, 24, 0.36);
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 15px;
    cursor: pointer;
    backdrop-filter: blur(10px);
  }

  .master-control > span {
    display: grid;
    gap: 3px;
  }

  .master-control b {
    color: #fff;
    font-size: 12px;
  }

  .master-control small {
    color: rgba(255, 255, 255, 0.65);
    font-size: 10px;
  }

  .master-control input,
  .notification-switch {
    appearance: none;
    width: 48px;
    height: 27px;
    flex: 0 0 48px;
    border: 0;
    border-radius: 999px;
    background: #a9afa9;
    position: relative;
    cursor: pointer;
    transition: background 180ms ease;
  }

  .master-control input::after,
  .notification-switch::after {
    content: '';
    position: absolute;
    width: 21px;
    height: 21px;
    top: 3px;
    left: 3px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.22);
    transition: transform 180ms ease;
  }

  .master-control input:checked,
  .notification-switch:checked {
    background: #25d366;
  }

  .master-control input:checked::after,
  .notification-switch:checked::after {
    transform: translateX(21px);
  }

  .master-control input:focus-visible,
  .notification-switch:focus-visible {
    outline: 3px solid rgba(82, 225, 132, 0.3);
    outline-offset: 3px;
  }

  .setup-status {
    grid-column: 2;
    width: max-content;
    margin-top: 8px;
    border-radius: 999px;
    padding: 6px 9px;
    color: #ffdccd;
    background: rgba(255, 255, 255, 0.1);
    font-size: 10px;
    font-weight: 800;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .setup-status.ready {
    color: #a9f0bf;
  }

  .settings-grid {
    min-width: 0;
    display: grid;
    grid-template-columns: minmax(0, 1.02fr) minmax(320px, 0.98fr);
    gap: 22px;
    align-items: stretch;
  }

  .step-card {
    min-width: 0;
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 24px;
    background: #fff;
    box-shadow: 0 12px 30px rgba(56, 42, 30, 0.055);
  }

  .step-heading {
    display: grid;
    grid-template-columns: 38px minmax(0, 1fr);
    align-items: start;
    gap: 12px;
    margin-bottom: 21px;
  }

  .step-number {
    width: 38px;
    height: 38px;
    border-radius: 12px;
    color: var(--a);
    background: color-mix(in srgb, var(--a) 10%, #fff);
    display: grid;
    place-items: center;
    font-size: 12px;
    font-weight: 900;
  }

  .step-heading h3 {
    margin: 0;
    color: #211d19;
    font-size: 16px;
  }

  .step-heading p {
    margin: 5px 0 0;
    color: var(--muted);
    font-size: 11px;
    line-height: 1.48;
  }

  .fields-stack {
    display: grid;
    gap: 18px;
  }

  .field-help,
  .field-error {
    font-size: 10px;
    font-weight: 500;
    line-height: 1.5;
  }

  .field-help {
    color: var(--muted);
  }

  .field-error {
    color: #b42318;
  }

  input[aria-invalid='true'] {
    border-color: #d92d20;
    box-shadow: 0 0 0 3px rgba(217, 45, 32, 0.09);
  }

  .message-card {
    background: linear-gradient(150deg, #fff 0%, #fbfffc 100%);
  }

  .message-field textarea {
    min-height: 104px;
  }

  .phone-preview {
    margin-top: 18px;
    overflow: hidden;
    border: 1px solid #dce8dc;
    border-radius: 16px;
    background: #eef5ef;
  }

  .phone-header {
    min-height: 58px;
    padding: 10px 13px;
    color: #fff;
    background: var(--wa-dark);
    display: grid;
    grid-template-columns: 35px minmax(0, 1fr) auto;
    gap: 10px;
    align-items: center;
  }

  .preview-avatar {
    width: 35px;
    height: 35px;
    border-radius: 50%;
    background: #fff;
    color: var(--wa-green);
    display: grid;
    place-items: center;
  }

  .phone-header div {
    min-width: 0;
    display: grid;
    gap: 2px;
  }

  .phone-header strong {
    overflow: hidden;
    color: #fff;
    font-size: 11px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .phone-header small {
    color: rgba(255, 255, 255, 0.66);
    font-size: 9px;
  }

  .phone-body {
    min-height: 105px;
    padding: 16px;
    background:
      linear-gradient(rgba(244, 249, 244, 0.9), rgba(244, 249, 244, 0.9)),
      radial-gradient(circle at 20% 20%, #d8e8d9 1px, transparent 1px);
    background-size:
      auto,
      12px 12px;
  }

  .message-bubble {
    max-width: 88%;
    margin-left: auto;
    border-radius: 12px 2px 12px 12px;
    padding: 11px 12px;
    background: #d9fdd3;
    color: #27342b;
    font-size: 10px;
    line-height: 1.45;
    overflow-wrap: anywhere;
    box-shadow: 0 3px 9px rgba(28, 67, 42, 0.08);
  }

  .preview-footer {
    padding: 12px 13px;
    background: #fff;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .preview-footer span {
    color: var(--muted);
    font-size: 9px;
  }

  .preview-link {
    min-height: 36px;
    border-radius: 10px;
    padding: 0 12px;
    background: var(--wa-green);
    color: #fff;
    font-size: 10px;
    font-weight: 800;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    white-space: nowrap;
  }

  .preview-link[aria-disabled='true'] {
    background: #d9ded9;
    color: #69736b;
    cursor: not-allowed;
  }

  .notification-list {
    display: grid;
    gap: 12px;
  }

  .notification-row,
  .coming-soon {
    min-height: 86px;
    border: 1px solid #e4ded8;
    border-radius: 15px;
    padding: 15px;
    display: grid;
    grid-template-columns: 38px minmax(0, 1fr) auto;
    align-items: center;
    gap: 13px;
  }

  .notification-row {
    cursor: pointer;
    transition:
      border-color 170ms ease,
      background 170ms ease;
  }

  .notification-row:hover {
    border-color: #cbdcca;
    background: #fbfefb;
  }

  .notification-icon {
    width: 38px;
    height: 38px;
    border-radius: 12px;
    color: var(--wa-green);
    background: var(--wa-soft);
    display: grid;
    place-items: center;
  }

  .notification-copy {
    min-width: 0;
    display: grid;
    gap: 4px;
  }

  .notification-copy b {
    color: #29241f;
    font-size: 12px;
  }

  .notification-copy span {
    color: var(--muted);
    font-size: 10px;
    line-height: 1.45;
  }

  .notification-switch:disabled {
    opacity: 0.52;
    cursor: not-allowed;
  }

  .coming-soon {
    border-style: dashed;
    background: #faf9f7;
    color: #827a73;
  }

  .coming-soon .notification-icon {
    color: #7f766f;
    background: #efede9;
  }

  .soon-badge {
    border-radius: 999px;
    padding: 6px 8px;
    color: #725f4d;
    background: #eee7df;
    font-size: 8px;
    font-weight: 900;
    letter-spacing: 0.07em;
    white-space: nowrap;
  }

  .info-note {
    margin-top: 14px;
    border-radius: 12px;
    padding: 11px 12px;
    color: #53665a;
    background: #f1f8f2;
    font-size: 10px;
    line-height: 1.45;
    display: flex;
    align-items: flex-start;
    gap: 8px;
  }

  @media (max-width: 900px) {
    .channel-hero,
    .settings-grid {
      grid-template-columns: 1fr;
    }

    .master-control {
      width: min(100%, 380px);
    }
  }

  @media (max-width: 580px) {
    gap: 16px;

    .channel-hero,
    .step-card {
      border-radius: 17px;
      padding: 18px;
    }

    .hero-copy {
      grid-template-columns: 44px minmax(0, 1fr);
      gap: 12px;
    }

    .hero-icon {
      width: 44px;
      height: 44px;
      border-radius: 14px;
    }

    .master-control {
      min-width: 0;
      width: 100%;
    }

    .settings-grid {
      gap: 16px;
    }

    .preview-footer {
      align-items: stretch;
      flex-direction: column;
    }

    .preview-link {
      width: 100%;
    }

    .notification-row,
    .coming-soon {
      grid-template-columns: 36px minmax(0, 1fr);
    }

    .notification-switch,
    .soon-badge {
      grid-column: 2;
      justify-self: start;
    }
  }
`;

function normalizeWhatsAppNumber(value: string) {
  return String(value || '').replace(/\D/g, '');
}

function getWhatsAppNumberError(value: string, required = false) {
  const digits = normalizeWhatsAppNumber(value);
  if (!digits) return required ? 'Informe o número que será exibido aos clientes.' : '';
  if (digits.length < 10 || digits.length > 13) {
    return 'Use DDI, DDD e número, com 10 a 13 dígitos.';
  }
  return '';
}

export function WhatsAppSettings({ settings, update }: Props) {
  const whatsappEnabled = Boolean(settings.whatsappEnabled);
  const statusNotificationsEnabled = Boolean(settings.receiveStatusNotifications);
  const displayName = settings.whatsappDisplayName ?? '';
  const defaultMessage = settings.whatsappDefaultMessage ?? '';
  const previewNumber = normalizeWhatsAppNumber(settings.whatsapp);
  const numberError = getWhatsAppNumberError(settings.whatsapp, whatsappEnabled);
  const channelReady = whatsappEnabled && !numberError && Boolean(previewNumber);
  const canPreview = channelReady;
  const previewMessage =
    defaultMessage.trim() || 'Olá! Gostaria de falar com o atendimento do restaurante.';
  const previewUrl = canPreview
    ? `https://wa.me/${previewNumber}?text=${encodeURIComponent(defaultMessage)}`
    : undefined;

  const statusLabel = channelReady
    ? 'Canal pronto e visível na Home'
    : whatsappEnabled
      ? 'Complete o número para publicar o canal'
      : 'Canal pausado e oculto na Home';

  return (
    <Panel>
      <section className="channel-hero" aria-labelledby="whatsapp-channel-title">
        <div className="hero-copy">
          <span className="hero-icon" aria-hidden="true">
            <MessageCircle size={25} />
          </span>
          <div>
            <p className="eyebrow">1 · Ativação do canal</p>
            <h2 id="whatsapp-channel-title">WhatsApp do restaurante</h2>
            <p>
              Publique um contato oficial na loja e escolha se o sistema deve avisar o cliente sobre
              o andamento do pedido.
            </p>
            <span className={`setup-status ${channelReady ? 'ready' : ''}`}>
              {channelReady ? <CheckCircle2 size={12} /> : <Info size={12} />}
              {statusLabel}
            </span>
          </div>
        </div>

        <label className="master-control">
          <span>
            <b>{whatsappEnabled ? 'Canal ativado' : 'Ativar canal'}</b>
            <small>
              {whatsappEnabled ? 'Clientes podem ver o contato' : 'Nada será exibido ainda'}
            </small>
          </span>
          <input
            name="whatsappEnabled"
            type="checkbox"
            role="switch"
            aria-label="Exibir WhatsApp na Home"
            checked={whatsappEnabled}
            onChange={(event) => update('whatsappEnabled', event.target.checked)}
          />
        </label>
      </section>

      <div className="settings-grid">
        <section className="step-card" aria-labelledby="whatsapp-identification-title">
          <header className="step-heading">
            <span className="step-number">2</span>
            <div>
              <h3 id="whatsapp-identification-title">Identificação e número</h3>
              <p>Informe o contato que pertence a este restaurante e como ele será apresentado.</p>
            </div>
          </header>

          <div className="fields-stack">
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

            <S.Field>
              Nome do atendimento
              <input
                name="whatsappDisplayName"
                maxLength={80}
                placeholder="Ex.: Atendimento Sabor & Casa"
                value={displayName}
                onChange={(event) => update('whatsappDisplayName', event.target.value)}
              />
              <small className="field-help">
                Esse nome ajuda o cliente a reconhecer que está falando com o restaurante certo.
              </small>
            </S.Field>
          </div>
        </section>

        <section className="step-card message-card" aria-labelledby="whatsapp-message-title">
          <header className="step-heading">
            <span className="step-number">3</span>
            <div>
              <h3 id="whatsapp-message-title">Mensagem inicial e prévia</h3>
              <p>
                O texto abrirá pronto no celular do cliente, que poderá revisá-lo antes de enviar.
              </p>
            </div>
          </header>

          <S.Field className="message-field">
            Mensagem sugerida
            <textarea
              name="whatsappDefaultMessage"
              maxLength={500}
              placeholder="Ex.: Olá! Gostaria de tirar uma dúvida sobre meu pedido."
              value={defaultMessage}
              onChange={(event) => update('whatsappDefaultMessage', event.target.value)}
            />
            <small className="field-help">{defaultMessage.length}/500 caracteres</small>
          </S.Field>

          <div className="phone-preview" aria-label="Prévia ilustrativa da conversa no WhatsApp">
            <div className="phone-header">
              <span className="preview-avatar" aria-hidden="true">
                <Smartphone size={17} />
              </span>
              <div>
                <strong>{displayName.trim() || 'Atendimento do restaurante'}</strong>
                <small>{previewNumber ? `+${previewNumber}` : 'Número ainda não informado'}</small>
              </div>
              <MessageCircle size={17} aria-hidden="true" />
            </div>
            <div className="phone-body">
              <div className="message-bubble">{previewMessage}</div>
            </div>
            <div className="preview-footer">
              <span>Prévia ilustrativa · nenhuma mensagem será enviada neste teste</span>
              <a
                className="preview-link"
                href={previewUrl}
                target={previewUrl ? '_blank' : undefined}
                rel={previewUrl ? 'noreferrer' : undefined}
                aria-disabled={!canPreview}
                onClick={(event) => {
                  if (!canPreview) event.preventDefault();
                }}
              >
                <Send size={14} /> Abrir prévia
              </a>
            </div>
          </div>
        </section>
      </div>

      <section className="step-card" aria-labelledby="whatsapp-notifications-title">
        <header className="step-heading">
          <span className="step-number">4</span>
          <div>
            <h3 id="whatsapp-notifications-title">Notificações e automações</h3>
            <p>
              Ative apenas os avisos disponíveis. Recursos futuros aparecem sem controle de
              ativação.
            </p>
          </div>
        </header>

        <div className="notification-list">
          <label className="notification-row">
            <span className="notification-icon" aria-hidden="true">
              <Bell size={18} />
            </span>
            <span className="notification-copy">
              <b>Enviar atualizações de status ao cliente</b>
              <span>
                Envia confirmação de pagamento e mudanças relevantes do pedido pelo WhatsApp.
                {whatsappEnabled ? '' : ' Ative o canal acima para liberar os envios.'}
              </span>
            </span>
            <input
              className="notification-switch"
              name="receiveStatusNotifications"
              type="checkbox"
              role="switch"
              checked={statusNotificationsEnabled}
              disabled={!whatsappEnabled}
              onChange={(event) => update('receiveStatusNotifications', event.target.checked)}
            />
          </label>

          <article className="coming-soon" aria-disabled="true">
            <span className="notification-icon" aria-hidden="true">
              <Clock3 size={18} />
            </span>
            <span className="notification-copy">
              <b>Receber pedidos diretamente pelo WhatsApp</b>
              <span>
                Integração ainda não disponível. Os pedidos continuam sendo feitos pela loja
                digital, com preço e estoque validados.
              </span>
            </span>
            <span className="soon-badge">EM PREPARAÇÃO</span>
          </article>
        </div>

        <div className="info-note">
          <Info size={15} aria-hidden="true" />
          <span>
            Salve as configurações no fim da página. O sistema respeita esta preferência somente
            para pedidos deste restaurante.
          </span>
        </div>
      </section>
    </Panel>
  );
}
