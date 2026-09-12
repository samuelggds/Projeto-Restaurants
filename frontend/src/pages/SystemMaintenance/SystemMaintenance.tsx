import { LockKeyhole, RefreshCw, ShieldCheck } from 'lucide-react';
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

  if (!isPlatformMaintenance) {
    return (
      <S.TenantPage>
        <S.TenantHeader>
          <S.TenantBrand>
            <img src="/gastronexa-logo.svg" alt="" width="52" height="46" />
            <span>
              <strong>
                Gastro<em>Nexa</em>
              </strong>
              <small>Tecnologia para Restaurantes</small>
            </span>
          </S.TenantBrand>
        </S.TenantHeader>

        <S.TenantMain>
          <S.TenantCopy role="status" aria-live="polite" aria-labelledby="tenant-unavailable-title">
            <span className="eyebrow">Temporariamente indisponível</span>
            <h1 id="tenant-unavailable-title">
              Voltamos em <em>instantes</em>
            </h1>
            <p>
              Este restaurante está temporariamente indisponível. Aguarde alguns instantes e tente
              novamente para continuar de onde parou.
            </p>

            <S.TenantActions>
              <S.PrimaryButton type="button" onClick={retry}>
                <RefreshCw size={18} aria-hidden="true" /> Tentar novamente
              </S.PrimaryButton>
            </S.TenantActions>

            <S.TenantAssurances aria-label="Informações sobre a indisponibilidade">
              <span>
                <ShieldCheck aria-hidden="true" />
                <b>Seu acesso está protegido</b>
                <small>Assim que o serviço voltar, você poderá continuar normalmente.</small>
              </span>
              <span>
                <RefreshCw aria-hidden="true" />
                <b>Retorno automático</b>
                <small>Nenhuma ação adicional é necessária além de tentar novamente.</small>
              </span>
            </S.TenantAssurances>
          </S.TenantCopy>

          <S.BrandPanel aria-hidden="true">
            <div className="mark">
              <img src="/gastronexa-logo.svg" alt="" />
            </div>
            <strong>
              Gastro<em>Nexa</em>
            </strong>
            <small>Tecnologia para Restaurantes</small>
            <span>Boa experiência começa com uma operação bem cuidada.</span>
          </S.BrandPanel>
        </S.TenantMain>

        <S.TenantFooter>© GastroNexa</S.TenantFooter>
      </S.TenantPage>
    );
  }

  return (
    <S.Page>
      <S.Header>
        <S.BrandMark aria-hidden="true">
          <img src="/gastronexa-logo.svg" alt="" width="42" height="38" />
        </S.BrandMark>
        <S.BrandCopy>
          <strong>GastroNexa</strong>
          <small>Operação de restaurantes</small>
        </S.BrandCopy>
      </S.Header>

      <S.Main>
        <S.NoticeCard role="status" aria-live="polite" aria-labelledby="maintenance-title">
          <S.NoticeContent>
            <S.Eyebrow>Disponibilidade da plataforma</S.Eyebrow>
            <S.Title id="maintenance-title">Sistema em manutenção</S.Title>
            <S.Description>
              Estamos realizando uma manutenção. Tente novamente em alguns instantes.
            </S.Description>

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
        <span>© GastroNexa</span>
        <S.TechnicalLink href="/super_admin/login">
          <LockKeyhole size={14} /> Acesso técnico
        </S.TechnicalLink>
      </S.Footer>
    </S.Page>
  );
}
