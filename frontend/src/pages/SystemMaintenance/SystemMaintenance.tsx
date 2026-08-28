import { Clock3, LockKeyhole, RefreshCw, ShieldCheck, Wrench } from 'lucide-react';
import { getPlatformMaintenanceState } from '../../Services/platformMaintenance';
import { clearSystemBlockState, getSystemBlockState } from '../../Services/systemBlock';
import * as S from './styles';

type MaintenanceMode = 'platform' | 'tenant';

type SystemMaintenancePageProps = {
  mode?: MaintenanceMode;
  message?: string;
};

export default function SystemMaintenancePage({ mode, message }: SystemMaintenancePageProps = {}) {
  const platformState = getPlatformMaintenanceState();
  const tenantBlock = getSystemBlockState();
  const resolvedMode: MaintenanceMode = mode || (platformState ? 'platform' : 'tenant');
  const isPlatformMaintenance = resolvedMode === 'platform';
  const resolvedMessage =
    message ||
    platformState?.message ||
    (tenantBlock?.reason === 'MANUAL'
      ? 'O acesso a este restaurante está temporariamente pausado.'
      : 'O restaurante está concluindo uma atualização administrativa.');
  const retry = () => {
    if (!isPlatformMaintenance) clearSystemBlockState();
    window.location.reload();
  };

  return (
    <S.Page>
      <S.Ambient aria-hidden="true">
        <span />
        <span />
      </S.Ambient>

      <S.Header>
        <S.BrandMark>S&C</S.BrandMark>
        <S.BrandCopy>
          <strong>Platform</strong>
          <span>Operação segura para restaurantes</span>
        </S.BrandCopy>
        <S.StatusPill>
          <i /> Atendimento temporariamente pausado
        </S.StatusPill>
      </S.Header>

      <S.Main>
        <S.MessagePanel>
          <S.Eyebrow>
            <Wrench size={16} />{' '}
            {isPlatformMaintenance ? 'Manutenção da plataforma' : 'Aviso de disponibilidade'}
          </S.Eyebrow>
          <S.Title>
            {isPlatformMaintenance
              ? 'Estamos preparando uma experiência ainda melhor.'
              : 'Este restaurante estará de volta em breve.'}
          </S.Title>
          <S.Description>{resolvedMessage}</S.Description>
          <S.Reassurance>
            <ShieldCheck size={21} />
            <div>
              <strong>Seus dados continuam protegidos</strong>
              <span>
                Nenhuma ação é necessária. O acesso será liberado assim que a atualização terminar.
              </span>
            </div>
          </S.Reassurance>

          <S.Actions>
            <S.RetryButton type="button" onClick={retry}>
              <RefreshCw size={18} /> Verificar novamente
            </S.RetryButton>
            <S.TimeHint>
              <Clock3 size={17} /> Esta página verifica a disponibilidade ao ser atualizada.
            </S.TimeHint>
          </S.Actions>
        </S.MessagePanel>

        <S.VisualPanel aria-label="Status da manutenção">
          <S.VisualOrb>
            <S.ToolRing>
              <Wrench size={42} />
            </S.ToolRing>
          </S.VisualOrb>
          <S.ProgressCard>
            <div>
              <span>STATUS</span>
              <strong>Equipe técnica trabalhando</strong>
            </div>
            <S.ProgressTrack>
              <i />
            </S.ProgressTrack>
            <small>Monitoramento e validações de segurança em andamento</small>
          </S.ProgressCard>
        </S.VisualPanel>
      </S.Main>

      <S.Footer>
        <span>© S&C Platform · Ambiente protegido</span>
        {isPlatformMaintenance ? (
          <S.TechnicalLink href="/super_admin/login">
            <LockKeyhole size={14} /> Acesso técnico
          </S.TechnicalLink>
        ) : null}
      </S.Footer>
    </S.Page>
  );
}
