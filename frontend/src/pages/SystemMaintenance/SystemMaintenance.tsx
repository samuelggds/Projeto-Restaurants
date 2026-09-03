import { Activity, LockKeyhole, RefreshCw, ShieldCheck, Wrench } from 'lucide-react';
import { getPlatformMaintenanceState } from '../../Services/platformMaintenance';
import { clearSystemBlockState } from '../../Services/systemBlock';
import * as S from './styles';

type MaintenanceMode = 'platform' | 'tenant';

type SystemMaintenancePageProps = {
  mode?: MaintenanceMode;
  message?: string;
};

export default function SystemMaintenancePage({ mode }: SystemMaintenancePageProps = {}) {
  const platformState = getPlatformMaintenanceState();
  const resolvedMode: MaintenanceMode = mode || (platformState ? 'platform' : 'tenant');
  const isPlatformMaintenance = resolvedMode === 'platform';
  const eyebrow = isPlatformMaintenance
    ? 'Disponibilidade da plataforma'
    : 'Disponibilidade do restaurante';
  const description = isPlatformMaintenance
    ? 'Estamos realizando uma manutenção. Tente novamente em alguns instantes.'
    : 'Este restaurante está temporariamente indisponível. Tente novamente em alguns instantes.';
  const retry = () => {
    if (!isPlatformMaintenance) clearSystemBlockState();
    window.location.reload();
  };

  return (
    <S.Page>
      <S.Header>
        <S.BrandMark aria-hidden="true">S&C</S.BrandMark>
        <S.BrandCopy>
          <strong>S&C Platform</strong>
          <small>Operação de restaurantes</small>
        </S.BrandCopy>
      </S.Header>

      <S.Main>
        <S.NoticeCard role="status" aria-live="polite" aria-labelledby="maintenance-title">
          <S.StatusPanel aria-hidden="true">
            <S.IconWrap>
              <Wrench size={34} />
            </S.IconWrap>
            <span>
              <Activity size={16} /> Intervenção em andamento
            </span>
          </S.StatusPanel>

          <S.NoticeContent>
            <S.Eyebrow>{eyebrow}</S.Eyebrow>
            <S.Title id="maintenance-title">Sistema em manutenção</S.Title>
            <S.Description>{description}</S.Description>

            <S.Assurance>
              <ShieldCheck aria-hidden="true" />
              <span>
                <strong>Sessão preservada</strong>
                <small>Você poderá continuar assim que o serviço estiver disponível.</small>
              </span>
            </S.Assurance>

            <S.RetryButton type="button" onClick={retry}>
              <RefreshCw size={18} aria-hidden="true" /> Tentar novamente
            </S.RetryButton>
          </S.NoticeContent>
        </S.NoticeCard>
      </S.Main>

      <S.Footer>
        <span>© S&C Platform</span>
        {isPlatformMaintenance ? (
          <S.TechnicalLink href="/super_admin/login">
            <LockKeyhole size={14} /> Acesso técnico
          </S.TechnicalLink>
        ) : null}
      </S.Footer>
    </S.Page>
  );
}
