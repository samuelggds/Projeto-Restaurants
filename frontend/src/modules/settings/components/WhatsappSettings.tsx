import type { RestaurantSettings } from '../types/settings.types';
import * as S from '../styles/settings.styles';
import { Field, FormInput, Switch } from './FormControls';

type Props = {
  settings: RestaurantSettings;
  onChange: (p: Partial<RestaurantSettings>) => void;
};

export function WhatsappSettings({ settings, onChange }: Props) {
  const previewNumber = settings.whatsappNumber.replace(/\D/g, '');
  const previewUrl = `https://wa.me/${previewNumber}?text=${encodeURIComponent(settings.whatsappDefaultMessage)}`;

  return (
    <S.Panel>
      <header>
        <span>Canal direto</span>
        <h2>Configuração do WhatsApp</h2>
        <p>Defina como o WhatsApp aparecerá para clientes e receberá pedidos.</p>
      </header>
      <S.Card $stack>
        <S.SwitchGroup>
          <Switch
            checked={settings.whatsappEnabled}
            label="Exibir WhatsApp na Home"
            description="Mostra o botão de atendimento no site do restaurante."
            onChange={(whatsappEnabled) => onChange({ whatsappEnabled })}
          />
        </S.SwitchGroup>
        <S.Grid>
          <Field
            label="Número do WhatsApp"
            hint="Informe DDI + DDD + número. Exemplo: 5585999999999."
          >
            <FormInput
              value={settings.whatsappNumber}
              placeholder="5585999999999"
              onChange={(e) => onChange({ whatsappNumber: e.target.value })}
            />
          </Field>
        </S.Grid>
        <S.FieldLabel>
          <span>Mensagem automática inicial</span>
          <S.Textarea
            style={{ minHeight: 80 }}
            maxLength={250}
            value={settings.whatsappDefaultMessage}
            onChange={(e) => onChange({ whatsappDefaultMessage: e.target.value })}
          />
          <small>Essa mensagem aparecerá preenchida quando o cliente abrir o WhatsApp.</small>
        </S.FieldLabel>
        <S.SwitchGroup>
          <Switch
            checked={settings.receiveOrdersOnWhatsapp}
            label="Receber pedidos pelo WhatsApp"
            description="Envia um resumo do pedido para o número configurado."
            onChange={(receiveOrdersOnWhatsapp) => onChange({ receiveOrdersOnWhatsapp })}
          />
          <Switch
            checked={settings.receiveStatusNotifications}
            label="Enviar atualizações ao cliente"
            description="Permite mensagens de confirmação, preparo e saída para entrega."
            onChange={(receiveStatusNotifications) => onChange({ receiveStatusNotifications })}
          />
        </S.SwitchGroup>
        <S.WhatsappPreview>
          <S.WhatsappIcon aria-hidden="true">◉</S.WhatsappIcon>
          <S.WhatsappPreviewInfo>
            <span>Prévia do botão</span>
            <strong>Fale conosco pelo WhatsApp</strong>
            <small>
              {settings.whatsappEnabled ? 'Visível para os clientes' : 'Oculto na Home'}
            </small>
          </S.WhatsappPreviewInfo>
          <S.WhatsappTestLink
            href={previewUrl}
            target="_blank"
            rel="noreferrer"
            aria-disabled={!settings.whatsappEnabled || !previewNumber || undefined}
          >
            Testar link
          </S.WhatsappTestLink>
        </S.WhatsappPreview>
      </S.Card>
    </S.Panel>
  );
}
