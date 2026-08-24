import { AtSign, ExternalLink, Globe2, Play, Share2 } from 'lucide-react';
import styled from 'styled-components';
import { adminMockSettings } from '../data';
import * as S from '../Admin.styles';

type Settings = typeof adminMockSettings;
type SocialKey = 'instagram' | 'facebook' | 'tiktok' | 'youtube';
type Props = {
  settings: Settings;
  update: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
};

const Panel = styled(S.SettingSection)`
  .social-heading {
    display: flex;
    align-items: flex-start;
    gap: 13px;
  }

  .heading-icon {
    width: 42px;
    height: 42px;
    flex: 0 0 42px;
    border-radius: 13px;
    display: grid;
    place-items: center;
    color: var(--a);
    background: color-mix(in srgb, var(--a) 10%, #fff);
  }

  .social-heading p {
    margin: 3px 0 0;
    font-size: 12px;
  }

  .field-help,
  .field-error {
    font-size: 11px;
    font-weight: 500;
    line-height: 1.45;
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

  .network-summary {
    margin-top: 24px;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
  }

  .network-item {
    min-width: 0;
    min-height: 82px;
    border: 1px solid #e8e1d9;
    border-radius: 14px;
    padding: 13px;
    background: #fcfbf9;
    display: grid;
    align-content: space-between;
    gap: 9px;
    color: #292520;
    text-decoration: none;
  }

  .network-item[data-connected='true'] {
    border-color: color-mix(in srgb, var(--a) 28%, #e8e1d9);
    background: color-mix(in srgb, var(--a) 4%, #fff);
  }

  .network-item span {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 7px;
    font-size: 11px;
    color: var(--muted);
  }

  .network-item strong {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 12px;
  }

  @media (max-width: 760px) {
    .network-summary {
      grid-template-columns: 1fr 1fr;
    }
  }

  @media (max-width: 420px) {
    .network-summary {
      grid-template-columns: 1fr;
    }
  }
`;

const NETWORKS: Array<{
  key: SocialKey;
  label: string;
  placeholder: string;
  help: string;
  Icon: typeof Share2;
}> = [
  {
    key: 'instagram',
    label: 'Instagram',
    placeholder: '@seurestaurante ou instagram.com/seurestaurante',
    help: 'Informe o @usuário ou o endereço completo do perfil.',
    Icon: AtSign,
  },
  {
    key: 'facebook',
    label: 'Facebook',
    placeholder: 'facebook.com/seurestaurante',
    help: 'Informe o nome da página ou o endereço completo.',
    Icon: Globe2,
  },
  {
    key: 'tiktok',
    label: 'TikTok',
    placeholder: '@seurestaurante ou tiktok.com/@seurestaurante',
    help: 'Informe o @usuário ou o endereço completo do perfil.',
    Icon: Share2,
  },
  {
    key: 'youtube',
    label: 'YouTube',
    placeholder: 'youtube.com/@seurestaurante',
    help: 'Informe o identificador ou o endereço completo do canal.',
    Icon: Play,
  },
];

function getSocialProfileError(value: string) {
  const normalized = String(value || '').trim();
  if (!normalized) return '';
  if (/\s/.test(normalized)) return 'Remova os espaços do endereço ou nome de usuário.';
  if (/^https?:\/\//i.test(normalized)) {
    try {
      const url = new URL(normalized);
      return url.protocol === 'https:' || url.protocol === 'http:'
        ? ''
        : 'Use um endereço iniciado por https://.';
    } catch {
      return 'Informe um endereço completo e válido.';
    }
  }
  if (/^[A-Za-z0-9@._/-]+$/.test(normalized)) return '';
  return 'Use o @usuário ou um endereço completo do perfil.';
}

function buildSocialProfileUrl(network: SocialKey, value: string) {
  const normalized = String(value || '').trim();
  if (!normalized || getSocialProfileError(normalized)) return '';
  if (/^https?:\/\//i.test(normalized)) return normalized;
  const handle = normalized.replace(/^@/, '').replace(/^\/+/, '');
  const base = network === 'youtube' ? 'youtube.com' : `${network}.com`;
  const path = network === 'tiktok' && !handle.startsWith('@') ? `@${handle}` : handle;
  return `https://${base}/${path}`;
}

export function SocialMediaSettings({ settings, update }: Props) {
  const current = settings;
  const setField = update;

  return (
    <Panel>
      <S.Card>
        <div className="social-heading">
          <span className="heading-icon" aria-hidden="true">
            <Share2 size={21} />
          </span>
          <div>
            <h2>Redes sociais do restaurante</h2>
            <p>Conecte os perfis oficiais que poderão ser apresentados aos clientes.</p>
          </div>
        </div>

        <S.FormGrid>
          {NETWORKS.map(({ key, label, placeholder, help }) => {
            const value = current[key] ?? '';
            const error = getSocialProfileError(value);
            return (
              <S.Field key={key}>
                {label}
                <input
                  name={key}
                  autoComplete="url"
                  placeholder={placeholder}
                  value={value}
                  aria-invalid={Boolean(error)}
                  aria-describedby={`${key}-${error ? 'error' : 'help'}`}
                  onChange={(event) => setField(key, event.target.value)}
                />
                <small
                  className={error ? 'field-error' : 'field-help'}
                  id={`${key}-${error ? 'error' : 'help'}`}
                >
                  {error || help}
                </small>
              </S.Field>
            );
          })}
        </S.FormGrid>

        <div className="network-summary" aria-label="Resumo das redes conectadas">
          {NETWORKS.map(({ key, label, Icon }) => {
            const value = current[key] ?? '';
            const href = buildSocialProfileUrl(key, value);
            const connected = Boolean(href);
            return (
              <a
                className="network-item"
                data-connected={connected}
                key={key}
                href={href || undefined}
                target={href ? '_blank' : undefined}
                rel={href ? 'noreferrer' : undefined}
                aria-disabled={!connected}
                onClick={(event) => {
                  if (!connected) event.preventDefault();
                }}
              >
                <span>
                  <Icon size={17} aria-hidden="true" />
                  {connected && <ExternalLink size={13} aria-hidden="true" />}
                </span>
                <strong>{connected ? label : `${label} não conectado`}</strong>
              </a>
            );
          })}
        </div>
      </S.Card>
    </Panel>
  );
}
