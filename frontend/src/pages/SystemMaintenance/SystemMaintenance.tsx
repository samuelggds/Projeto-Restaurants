import { LockKeyhole, RefreshCw, Wrench } from 'lucide-react';
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
  const retry = () => {
    if (!isPlatformMaintenance) clearSystemBlockState();
    window.location.reload();
  };

  return (
    <S.Page>
      <S.Background aria-hidden="true">
        <span />
        <span />
      </S.Background>

      <S.Header>
        <S.BrandMark>S&C</S.BrandMark>
        <S.BrandCopy>
          <strong>Platform</strong>
        </S.BrandCopy>
      </S.Header>

      <S.Main>
        <S.NoticeCard role="status" aria-live="polite">
          <S.IconWrap aria-hidden="true">
            <Wrench size={30} />
          </S.IconWrap>
          <S.Eyebrow>Manutenção temporária</S.Eyebrow>
          <S.Title>Sistema em manutenção</S.Title>
          <S.Description>
            Estamos realizando uma manutenção. Tente novamente em alguns instantes.
          </S.Description>
          <S.RetryButton type="button" onClick={retry}>
            <RefreshCw size={18} /> Tentar novamente
          </S.RetryButton>
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
