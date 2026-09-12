import { ArrowUpRight, Info, LockKeyhole, RefreshCw } from 'lucide-react';
import { getPlatformMaintenanceState } from '../../Services/platformMaintenance';
import { clearSystemBlockState } from '../../Services/systemBlock';
import { gastroNexaGPath, gastroNexaXPath } from '../Login/components/gastroNexaMark';
import * as S from './styles';

type MaintenanceMode = 'platform' | 'tenant';
type MaintenanceAudience = 'customer' | 'staff' | 'admin';

type SystemMaintenancePageProps = {
  mode?: MaintenanceMode;
  audience?: MaintenanceAudience;
  message?: string;
};

function BrandSymbol() {
  return (
    <svg viewBox="0 0 600 470" fill="currentColor" aria-hidden="true" focusable="false">
      <path d={gastroNexaGPath} fillRule="evenodd" />
      <path d={gastroNexaXPath} fillRule="evenodd" />
    </svg>
  );
}

const tenantCopy = {
  customer: {
    title: 'Uma pausa no acesso ao restaurante.',
    description:
      'O cardápio e os pedidos estão temporariamente indisponíveis. Você pode verificar o acesso novamente quando quiser.',
    guidanceTitle: 'Já fez um pedido?',
    guidance:
      'Para saber sobre um pedido em andamento, entre em contato diretamente com o restaurante.',
  },
  staff: {
    title: 'O painel está indisponível no momento.',
    description:
      'O acesso à operação deste restaurante está temporariamente indisponível. Verifique novamente antes de retomar suas atividades.',
    guidanceTitle: 'Combine os próximos passos',
    guidance:
      'Fale com o responsável pelo restaurante para receber orientação sobre o atendimento.',
  },
  admin: {
    title: 'O acesso ao restaurante está indisponível.',
    description:
      'Não é possível acessar o painel deste restaurante no momento. Você pode verificar a disponibilidade novamente.',
    guidanceTitle: 'Precisa de orientação?',
    guidance:
      'Entre em contato com a equipe de suporte GastroNexa para consultar a situação do acesso.',
  },
} satisfies Record<MaintenanceAudience, Record<string, string>>;

export default function SystemMaintenancePage({
  mode,
  audience = 'customer',
}: SystemMaintenancePageProps = {}) {
  const platformState = getPlatformMaintenanceState();
  const resolvedMode: MaintenanceMode = mode || (platformState ? 'platform' : 'tenant');
  const isPlatformMaintenance = resolvedMode === 'platform';
  const copy = isPlatformMaintenance
    ? {
        title: 'Sistema em manutenção',
        description:
          'A plataforma está temporariamente indisponível durante a manutenção. Você pode verificar a disponibilidade novamente.',
        guidanceTitle: audience === 'customer' ? 'Já fez um pedido?' : 'Organize o atendimento',
        guidance:
          audience === 'customer'
            ? 'Para saber sobre um pedido em andamento, use o contato direto do restaurante.'
            : 'Durante a manutenção, combine com o responsável pelo restaurante como continuar o atendimento.',
      }
    : tenantCopy[audience];

  const retry = () => {
    if (!isPlatformMaintenance) clearSystemBlockState();
    window.location.reload();
  };

  return (
    <S.Page data-testid="availability-page" data-audience={audience}>
      <S.Header>
        <S.Brand aria-label="GastroNexa — Tecnologia para Restaurantes">
          <BrandSymbol />
          <span>
            <strong>
              Gastro<em>Nexa</em>
            </strong>
            <small>Tecnologia para Restaurantes</small>
          </span>
        </S.Brand>
        <S.HeaderLabel>Disponibilidade do serviço</S.HeaderLabel>
      </S.Header>

      <S.Main>
        <S.NoticeCard aria-labelledby="availability-title">
          <S.BrandPanel aria-hidden="true">
            <span className="panel-eyebrow">TECNOLOGIA QUE MOVE SABORES</span>
            <div className="panel-brand">
              <BrandSymbol />
              <span className="panel-wordmark">
                Gastro<em>Nexa</em>
              </span>
              <span className="panel-tagline">Tecnologia para Restaurantes</span>
            </div>
            <p>
              Uma boa experiência
              <br />
              em cada <em>conexão.</em>
            </p>
            <svg className="panel-arc" viewBox="0 0 340 340" fill="none">
              <circle cx="340" cy="0" r="246" />
              <circle cx="340" cy="0" r="284" />
            </svg>
          </S.BrandPanel>

          <S.NoticeContent>
            <S.Eyebrow>
              <span aria-hidden="true" />
              {isPlatformMaintenance
                ? 'Disponibilidade da plataforma'
                : 'Temporariamente indisponível'}
            </S.Eyebrow>
            <S.Title id="availability-title">{copy.title}</S.Title>
            <S.Description>{copy.description}</S.Description>

            <S.Guidance>
              <Info size={19} aria-hidden="true" />
              <span>
                <strong>{copy.guidanceTitle}</strong>
                <p>{copy.guidance}</p>
              </span>
            </S.Guidance>

            <S.Actions>
              <S.RetryButton type="button" onClick={retry}>
                <RefreshCw size={17} aria-hidden="true" />
                Tentar novamente
                <ArrowUpRight size={17} className="action-arrow" aria-hidden="true" />
              </S.RetryButton>
              <small>A página será atualizada para verificar o acesso.</small>
            </S.Actions>
          </S.NoticeContent>
        </S.NoticeCard>
      </S.Main>

      <S.Footer>
        <span>
          © GastroNexa <span className="footer-note">· Tecnologia para Restaurantes</span>
        </span>
        {isPlatformMaintenance && (
          <S.TechnicalLink href="/super_admin/login">
            <LockKeyhole size={14} aria-hidden="true" /> Acesso técnico
          </S.TechnicalLink>
        )}
      </S.Footer>
    </S.Page>
  );
}
