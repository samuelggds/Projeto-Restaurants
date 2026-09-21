import { ChangeEvent, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Bell,
  Building2,
  Camera,
  CheckCircle2,
  KeyRound,
  LockKeyhole,
  LogOut,
  Mail,
  Save,
  ShieldCheck,
  Smartphone,
  UserRound,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../../../contexts/authContext';
import authService from '../../../Services/authService';
import { getAccessToken } from '../../../modules/auth/session/authSession';
import * as S from './AdminProfile.styles';

type Tab = 'profile' | 'security' | 'notifications';

type NotificationPreferences = {
  newOrders: boolean;
  billing: boolean;
  operationalAlerts: boolean;
};

const MAX_AVATAR_SIZE = 500 * 1024;

function notificationStorageKey(userId?: number) {
  return `gastronexa:admin-profile-notifications:${userId || 'current'}`;
}

function readNotificationPreferences(userId?: number): NotificationPreferences {
  if (typeof window === 'undefined') {
    return { newOrders: true, billing: true, operationalAlerts: true };
  }

  try {
    const raw = window.localStorage.getItem(notificationStorageKey(userId));
    if (!raw) return { newOrders: true, billing: true, operationalAlerts: true };
    const parsed = JSON.parse(raw) as Partial<NotificationPreferences>;
    return {
      newOrders: parsed.newOrders !== false,
      billing: parsed.billing !== false,
      operationalAlerts: parsed.operationalAlerts !== false,
    };
  } catch {
    return { newOrders: true, billing: true, operationalAlerts: true };
  }
}

function initials(name?: string) {
  const parts = String(name || 'Administrador')
    .trim()
    .split(/\s+/u)
    .filter(Boolean)
    .slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase()).join('') || 'AD';
}

export default function AdminProfile() {
  const { user, logout, login } = useAuth();
  const navigate = useNavigate();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: String(user?.name || ''),
    email: String(user?.email || ''),
    phone: String(user?.phone || ''),
    avatar: String(user?.avatar || ''),
  });
  const [notifications, setNotifications] = useState<NotificationPreferences>(() =>
    readNotificationPreferences(user?.id),
  );

  const restaurantLabel = useMemo(() => {
    const restaurant = user?.restaurant as Record<string, unknown> | null | undefined;
    return String(
      restaurant?.name ||
        restaurant?.restaurantName ||
        user?.restaurantName ||
        `Restaurante #${user?.restaurantId || restaurant?.id || ''}`,
    ).trim();
  }, [user]);

  const handleAvatar = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Escolha uma imagem JPG, PNG ou WEBP.');
      return;
    }
    if (file.size > MAX_AVATAR_SIZE) {
      toast.error('A foto deve ter no máximo 500 KB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () =>
      setForm((current) => ({ ...current, avatar: String(reader.result || '') }));
    reader.onerror = () => toast.error('Não foi possível carregar essa imagem.');
    reader.readAsDataURL(file);
  };

  const saveProfile = async () => {
    if (!form.name.trim()) {
      toast.error('Informe seu nome.');
      return;
    }
    if (!form.email.trim()) {
      toast.error('Informe seu e-mail.');
      return;
    }

    setSaving(true);
    try {
      const updated = await authService.updateProfile({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        avatar: form.avatar,
      });
      const token = getAccessToken();
      if (token && updated) {
        login({ ...(user || {}), ...updated }, token);
      }
      setForm((current) => ({
        ...current,
        name: String(updated?.name ?? current.name),
        email: String(updated?.email ?? current.email),
        phone: String(updated?.phone ?? current.phone),
        avatar: String(updated?.avatar ?? current.avatar),
      }));
      toast.success('Perfil e foto atualizados com sucesso.');
    } catch (error: unknown) {
      const requestError = error as {
        response?: { data?: { error?: string } };
        message?: string;
      };
      toast.error(
        requestError.response?.data?.error ||
          requestError.message ||
          'Não foi possível atualizar o perfil.',
      );
    } finally {
      setSaving(false);
    }
  };

  const saveNotifications = () => {
    window.localStorage.setItem(notificationStorageKey(user?.id), JSON.stringify(notifications));
    toast.success('Preferências salvas neste dispositivo.');
  };

  return (
    <S.Page>
      <S.Topbar>
        <button type="button" className="back" onClick={() => navigate('/admin')}>
          <ArrowLeft aria-hidden="true" />
          Voltar ao painel
        </button>
        <div className="brand" aria-label="GastroNexa">
          <img src="/gastronexa-logo.svg" alt="" aria-hidden="true" />
          <span>
            Gastro<strong>Nexa</strong>
          </span>
        </div>
        <button type="button" className="logout" onClick={logout}>
          <LogOut aria-hidden="true" />
          Sair
        </button>
      </S.Topbar>

      <S.Shell>
        <S.ProfileHero>
          <div className="avatar-wrap">
            <div className="avatar" aria-label="Foto do administrador">
              {form.avatar ? (
                <img src={form.avatar} alt="Foto do administrador" />
              ) : (
                initials(form.name)
              )}
            </div>
            <button
              type="button"
              className="camera"
              aria-label="Alterar foto do perfil"
              onClick={() => avatarInputRef.current?.click()}
            >
              <Camera aria-hidden="true" />
            </button>
            <input
              ref={avatarInputRef}
              hidden
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleAvatar}
            />
          </div>
          <div className="identity">
            <span className="eyebrow">MINHA CONTA</span>
            <h1>{form.name || 'Administrador'}</h1>
            <p>{form.email || 'Conta administrativa'}</p>
            <div className="badges">
              <span>
                <ShieldCheck aria-hidden="true" /> Administrador
              </span>
              {restaurantLabel && (
                <span>
                  <Building2 aria-hidden="true" /> {restaurantLabel}
                </span>
              )}
            </div>
          </div>
          <div className="security-score">
            <CheckCircle2 aria-hidden="true" />
            <span>
              <b>Conta protegida</b>
              <small>2 etapas obrigatórias</small>
            </span>
          </div>
        </S.ProfileHero>

        <S.ContentGrid>
          <S.SideNav aria-label="Navegação do perfil administrativo">
            <button
              type="button"
              className={activeTab === 'profile' ? 'active' : ''}
              onClick={() => setActiveTab('profile')}
            >
              <UserRound aria-hidden="true" />
              <span>
                <b>Meus dados</b>
                <small>Informações pessoais</small>
              </span>
            </button>
            <button
              type="button"
              className={activeTab === 'security' ? 'active' : ''}
              onClick={() => setActiveTab('security')}
            >
              <LockKeyhole aria-hidden="true" />
              <span>
                <b>Segurança</b>
                <small>Senha e proteção</small>
              </span>
            </button>
            <button
              type="button"
              className={activeTab === 'notifications' ? 'active' : ''}
              onClick={() => setActiveTab('notifications')}
            >
              <Bell aria-hidden="true" />
              <span>
                <b>Notificações</b>
                <small>Alertas administrativos</small>
              </span>
            </button>
          </S.SideNav>

          <S.Panel>
            {activeTab === 'profile' && (
              <>
                <S.PanelHeader>
                  <div>
                    <span className="eyebrow">DADOS PESSOAIS</span>
                    <h2>Seu perfil de administrador</h2>
                    <p>Essas informações representam você, não o restaurante.</p>
                  </div>
                </S.PanelHeader>

                <S.FormGrid>
                  <label className="full">
                    <span>Nome completo</span>
                    <div className="input-wrap">
                      <UserRound />
                      <input
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                      />
                    </div>
                  </label>
                  <label>
                    <span>E-mail</span>
                    <div className="input-wrap">
                      <Mail />
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                      />
                    </div>
                    <small>Ao trocar o e-mail, use um endereço ao qual você tenha acesso.</small>
                  </label>
                  <label>
                    <span>Telefone</span>
                    <div className="input-wrap">
                      <Smartphone />
                      <input
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        placeholder="(85) 99999-9999"
                      />
                    </div>
                  </label>
                </S.FormGrid>

                <S.RelatedCard>
                  <div className="icon">
                    <Building2 />
                  </div>
                  <div>
                    <small>RESTAURANTE VINCULADO</small>
                    <b>{restaurantLabel || 'Restaurante da conta'}</b>
                    <span>Este vínculo não pode ser alterado pelo perfil.</span>
                  </div>
                  <span className="readonly">Somente leitura</span>
                </S.RelatedCard>

                <S.Actions>
                  <button type="button" className="primary" disabled={saving} onClick={saveProfile}>
                    <Save aria-hidden="true" /> {saving ? 'Salvando...' : 'Salvar alterações'}
                  </button>
                </S.Actions>
              </>
            )}

            {activeTab === 'security' && (
              <>
                <S.PanelHeader>
                  <div>
                    <span className="eyebrow">SEGURANÇA</span>
                    <h2>Proteção da sua conta</h2>
                    <p>Gerencie credenciais e camadas de segurança do acesso administrativo.</p>
                  </div>
                </S.PanelHeader>

                <S.SecurityList>
                  <S.SecurityItem>
                    <div className="icon">
                      <KeyRound />
                    </div>
                    <div>
                      <b>Senha de acesso</b>
                      <span>Altere sua senha sempre que suspeitar de um acesso indevido.</span>
                    </div>
                    <button type="button" onClick={() => navigate('/change-password')}>
                      Alterar senha
                    </button>
                  </S.SecurityItem>
                  <S.SecurityItem>
                    <div className="icon">
                      <ShieldCheck />
                    </div>
                    <div>
                      <b>Verificação em duas etapas</b>
                      <span>
                        Uma segunda confirmação é obrigatória em novos acessos administrativos.
                      </span>
                    </div>
                    <div className="mfa-control">
                      <span className="status on">Obrigatória</span>
                    </div>
                  </S.SecurityItem>
                  <S.SecurityItem>
                    <div className="icon">
                      <Smartphone />
                    </div>
                    <div>
                      <b>Sessões abertas</b>
                      <span>
                        O gerenciamento de outras sessões será exibido aqui quando o backend
                        disponibilizar esse controle.
                      </span>
                    </div>
                    <span className="status">Sessão atual</span>
                  </S.SecurityItem>
                </S.SecurityList>
              </>
            )}

            {activeTab === 'notifications' && (
              <>
                <S.PanelHeader>
                  <div>
                    <span className="eyebrow">NOTIFICAÇÕES</span>
                    <h2>O que merece sua atenção</h2>
                    <p>Escolha quais avisos administrativos deseja priorizar neste dispositivo.</p>
                  </div>
                </S.PanelHeader>

                <S.NotificationList>
                  {[
                    [
                      'newOrders',
                      'Novos pedidos',
                      'Receba destaque visual para novos pedidos e eventos importantes da operação.',
                    ],
                    [
                      'billing',
                      'Cobranças e assinatura',
                      'Avisos sobre mensalidade, vencimentos e situações que possam afetar o acesso.',
                    ],
                    [
                      'operationalAlerts',
                      'Alertas operacionais',
                      'Problemas de integração, disponibilidade e ocorrências que exigem ação do administrador.',
                    ],
                  ].map(([key, title, description]) => (
                    <label key={key}>
                      <span>
                        <b>{title}</b>
                        <small>{description}</small>
                      </span>
                      <input
                        type="checkbox"
                        checked={notifications[key as keyof NotificationPreferences]}
                        onChange={(event) =>
                          setNotifications((current) => ({
                            ...current,
                            [key]: event.target.checked,
                          }))
                        }
                      />
                    </label>
                  ))}
                </S.NotificationList>
                <S.DeviceNotice>
                  As preferências desta versão ficam salvas no navegador usado pelo administrador.
                </S.DeviceNotice>
                <S.Actions>
                  <button type="button" className="primary" onClick={saveNotifications}>
                    <Save aria-hidden="true" /> Salvar preferências
                  </button>
                </S.Actions>
              </>
            )}
          </S.Panel>
        </S.ContentGrid>
      </S.Shell>
    </S.Page>
  );
}
