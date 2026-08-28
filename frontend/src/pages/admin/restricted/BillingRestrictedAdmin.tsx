import { useState } from 'react';
import {
  BarChart3,
  CircleDollarSign,
  HelpCircle,
  LockKeyhole,
  LogOut,
  PackageOpen,
  RefreshCw,
  Settings2,
  ShieldAlert,
  ShoppingBag,
  Users,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../../../contexts/authContext';
import monthlyBillingService from '../../../Services/monthlyBillingService';
import {
  clearSystemBlockState,
  findBlockingInvoice,
  getSystemBlockState,
} from '../../../Services/systemBlock';
import { MonthlyBilling } from '../components/MonthlyBilling';
import * as S from './BillingRestrictedAdmin.styles';

const lockedSections = [
  ['Visão geral', BarChart3],
  ['Pedidos', ShoppingBag],
  ['Produtos', PackageOpen],
  ['Clientes', Users],
  ['Configurações', Settings2],
] as const;

export default function BillingRestrictedAdmin() {
  const { user, logout } = useAuth();
  const blockState = getSystemBlockState();
  const [checking, setChecking] = useState(false);

  const verifyRelease = async () => {
    setChecking(true);
    try {
      const overview = await monthlyBillingService.getOverview();
      const blockingInvoice = findBlockingInvoice(overview.invoices || []);
      if (blockingInvoice) {
        toast.info('O pagamento ainda não foi confirmado. A liberação é automática após a baixa.');
        return;
      }
      clearSystemBlockState();
      toast.success('Pagamento confirmado. Todas as áreas do restaurante foram liberadas.');
    } catch {
      toast.error('Não foi possível consultar a liberação agora. Tente novamente em instantes.');
    } finally {
      setChecking(false);
    }
  };

  const initials = String(user?.name || 'Administrador')
    .split(/\s+/u)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    <S.Root>
      <S.Sidebar>
        <S.Brand>
          <span>S&C</span>
          <div>
            <strong>Restaurante</strong>
            <small>PAINEL ADMINISTRATIVO</small>
          </div>
        </S.Brand>

        <S.RestrictionLabel>
          <LockKeyhole size={14} /> Acesso financeiro
        </S.RestrictionLabel>
        <S.Navigation aria-label="Áreas administrativas bloqueadas">
          {lockedSections.map(([label, Icon]) => (
            <button key={label} type="button" disabled title="Disponível após a regularização">
              <Icon size={19} />
              <span>{label}</span>
              <LockKeyhole className="lock" size={14} />
            </button>
          ))}
          <button type="button" className="active" aria-current="page">
            <CircleDollarSign size={20} />
            <span>Mensalidades e faturas</span>
          </button>
        </S.Navigation>

        <S.SidebarFooter>
          <div className="identity">
            <b>{initials || 'AD'}</b>
            <span>
              <strong>{user?.name || 'Administrador'}</strong>
              <small>Acesso restrito</small>
            </span>
          </div>
          <button type="button" onClick={logout}>
            <LogOut size={18} /> Sair com segurança
          </button>
        </S.SidebarFooter>
      </S.Sidebar>

      <S.Main>
        <S.Topbar>
          <div>
            <small>FINANCEIRO / REGULARIZAÇÃO</small>
            <h1>Mensalidades e faturas</h1>
            <p>Este é o único espaço disponível até a confirmação do pagamento.</p>
          </div>
          <S.VerifyButton type="button" onClick={() => void verifyRelease()} disabled={checking}>
            <RefreshCw size={17} className={checking ? 'spin' : ''} />
            {checking ? 'Consultando...' : 'Verificar liberação'}
          </S.VerifyButton>
        </S.Topbar>

        <S.Content>
          <S.Alert role="status">
            <S.AlertIcon>
              <ShieldAlert size={25} />
            </S.AlertIcon>
            <div>
              <span>OPERAÇÃO TEMPORARIAMENTE PAUSADA</span>
              <h2>Regularize a mensalidade para liberar todas as funções</h2>
              <p>
                Pedidos, produtos, equipe, configurações e integrações permanecem protegidos e
                indisponíveis. Assim que o pagamento for confirmado, o painel volta ao normal
                automaticamente.
              </p>
              {blockState?.dueDate ? (
                <small>
                  Fatura vencida em{' '}
                  {new Intl.DateTimeFormat('pt-BR').format(new Date(blockState.dueDate))}
                </small>
              ) : null}
            </div>
            <S.SupportHint>
              <HelpCircle size={17} /> Precisa de ajuda? Fale com o suporte da plataforma.
            </S.SupportHint>
          </S.Alert>

          <MonthlyBilling restricted />
        </S.Content>
      </S.Main>
    </S.Root>
  );
}
