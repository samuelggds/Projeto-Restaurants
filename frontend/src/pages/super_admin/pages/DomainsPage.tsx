import { Globe2, RefreshCw, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import superAdminService from '../../../Services/superAdminService';
import type { RestaurantTenant, SuperAdminData } from '../types';
import { requestErrorMessage } from '../domain/superAdminDomain';
import * as S from '../SuperAdmin.styles';

type DomainMode = 'MENU_ONLY' | 'SITE_WITH_MENU_SUBDOMAIN';

type DomainRecord = {
  id: string;
  restaurantId: number;
  hostname: string;
  mode: DomainMode;
  menuHostname: string | null;
  includeWww: boolean;
  status: 'PENDING_DNS' | 'DNS_VERIFIED' | 'ACTIVE' | 'DISABLED';
  planEligible: boolean;
  publicHosts: string[];
  verification: { type: string; name: string; value: string };
  routing: {
    type: string;
    name: string | null;
    value: string | null;
    wwwCname?: string | null;
    note: string;
  };
  dnsVerifiedAt: string | null;
  activatedAt: string | null;
  lastCheckedAt: string | null;
  lastCheckError: string | null;
  restaurant?: {
    id: number;
    name: string;
    slug: string;
    active: boolean;
    planCode: string | null;
    subscriptionStatus: string | null;
  };
};

function eligibleRestaurant(restaurant?: RestaurantTenant | null) {
  if (!restaurant) return false;
  const plan = String(restaurant.subscription?.planCode || '').toUpperCase();
  const status = String(restaurant.subscription?.status || '').toUpperCase();
  return (
    restaurant.active &&
    ['PREMIUM', 'GESTAO_TOTAL'].includes(plan) &&
    ['TESTE', 'ATIVA'].includes(status)
  );
}

function statusLabel(status: DomainRecord['status']) {
  if (status === 'ACTIVE') return 'Ativo';
  if (status === 'DNS_VERIFIED') return 'DNS verificado';
  if (status === 'DISABLED') return 'Desativado';
  return 'Aguardando DNS';
}

function statusTone(status: DomainRecord['status']): 'green' | 'yellow' | 'gray' {
  if (status === 'ACTIVE') return 'green';
  if (status === 'DNS_VERIFIED') return 'yellow';
  return 'gray';
}

export function DomainsPage({ data }: { data: SuperAdminData }) {
  const eligible = useMemo(() => data.restaurants.filter(eligibleRestaurant), [data.restaurants]);
  const [domains, setDomains] = useState<DomainRecord[]>([]);
  const manageable = useMemo(() => {
    const configuredIds = new Set(domains.map((domain) => domain.restaurantId));
    return data.restaurants.filter(
      (restaurant) => eligibleRestaurant(restaurant) || configuredIds.has(restaurant.id),
    );
  }, [data.restaurants, domains]);
  const [restaurantId, setRestaurantId] = useState<number>(eligible[0]?.id || 0);
  const [hostname, setHostname] = useState('');
  const [mode, setMode] = useState<DomainMode>('SITE_WITH_MENU_SUBDOMAIN');
  const [menuSubdomain, setMenuSubdomain] = useState('cardapio');
  const [includeWww, setIncludeWww] = useState(true);
  const [selected, setSelected] = useState<DomainRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ error: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await superAdminService.listCustomDomains();
      const items = Array.isArray(response?.domains) ? response.domains : [];
      setDomains(items);
      setFeedback(null);
    } catch (error) {
      setFeedback({
        error: true,
        text: requestErrorMessage(error, 'Não foi possível carregar os domínios.'),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!restaurantId && manageable[0]?.id) setRestaurantId(manageable[0].id);
  }, [manageable, restaurantId]);

  useEffect(() => {
    const existing = domains.find((item) => item.restaurantId === restaurantId) || null;
    setSelected(existing);
    if (existing) {
      setHostname(existing.hostname);
      setMode(existing.mode);
      setIncludeWww(existing.includeWww);
      setMenuSubdomain(
        existing.menuHostname
          ? existing.menuHostname.slice(0, -(existing.hostname.length + 1))
          : 'cardapio',
      );
    } else {
      setHostname('');
      setMode('SITE_WITH_MENU_SUBDOMAIN');
      setMenuSubdomain('cardapio');
      setIncludeWww(true);
    }
  }, [domains, restaurantId]);

  const run = async (operation: () => Promise<unknown>, success: string) => {
    setLoading(true);
    setFeedback(null);
    try {
      await operation();
      await load();
      setFeedback({ error: false, text: success });
    } catch (error) {
      setFeedback({ error: true, text: requestErrorMessage(error, 'A operação não foi concluída.') });
      setLoading(false);
    }
  };

  const save = () =>
    run(
      () =>
        superAdminService.saveCustomDomain(restaurantId, {
          hostname: hostname.trim(),
          mode,
          ...(mode === 'SITE_WITH_MENU_SUBDOMAIN'
            ? { menuSubdomain: menuSubdomain.trim() || 'cardapio' }
            : {}),
          includeWww,
        }),
      'Configuração salva. Agora publique os registros DNS e faça a verificação.',
    );

  return (
    <S.PageStack>
      <S.InlineAlert $tone="info">
        Esta área é exclusiva do SUPER_ADMIN. O restaurante compra o domínio em seu próprio
        CPF/CNPJ; a GastroNexa recebe o acesso técnico ao DNS e faz a publicação. Premium e Gestão
        Total são elegíveis.
      </S.InlineAlert>

      <S.Card>
        <S.SectionHeading>
          <div>
            <h2>Configurar domínio personalizado</h2>
            <p>
              Use o domínio inteiro para o cardápio ou preserve o domínio principal para uma landing
              page e publique o GastroNexa em um subdomínio.
            </p>
          </div>
          <Globe2 aria-hidden="true" />
        </S.SectionHeading>

        {manageable.length ? (
          <S.Fields>
            <label className="wide">
              Restaurante
              <select
                value={restaurantId}
                onChange={(event) => setRestaurantId(Number(event.target.value))}
                disabled={loading}
              >
                {manageable.map((restaurant) => (
                  <option key={restaurant.id} value={restaurant.id}>
                    {restaurant.name} — {restaurant.subscription?.planCode || 'Sem plano'}
                    {eligibleRestaurant(restaurant) ? '' : ' — domínio bloqueado pelo plano'}
                  </option>
                ))}
              </select>
            </label>

            <label className="wide">
              Domínio comprado pelo cliente
              <input
                value={hostname}
                onChange={(event) => setHostname(event.target.value)}
                placeholder="northpizza.com.br"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                disabled={loading}
              />
            </label>

            <label className="wide">
              Como o domínio será usado
              <select
                value={mode}
                onChange={(event) => setMode(event.target.value as DomainMode)}
                disabled={loading}
              >
                <option value="SITE_WITH_MENU_SUBDOMAIN">
                  Site oficial no domínio + cardápio em subdomínio
                </option>
                <option value="MENU_ONLY">Domínio principal direto no cardápio GastroNexa</option>
              </select>
            </label>

            {mode === 'SITE_WITH_MENU_SUBDOMAIN' ? (
              <label className="wide">
                Subdomínio do cardápio
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    value={menuSubdomain}
                    onChange={(event) => setMenuSubdomain(event.target.value)}
                    placeholder="cardapio"
                    disabled={loading}
                  />
                  <span>.{hostname.trim() || 'dominio.com.br'}</span>
                </div>
              </label>
            ) : (
              <label className="wide">
                <span>Alias www</span>
                <span>
                  <input
                    type="checkbox"
                    checked={includeWww}
                    onChange={(event) => setIncludeWww(event.target.checked)}
                    disabled={loading}
                  />{' '}
                  Aceitar também www.{hostname.trim() || 'dominio.com.br'}
                </span>
              </label>
            )}
          </S.Fields>
        ) : (
          <S.InlineAlert $tone="warning">
            Não há restaurante ativo com assinatura Premium ou Gestão Total elegível no momento.
          </S.InlineAlert>
        )}

        {feedback ? (
          <S.InlineAlert $tone={feedback.error ? 'error' : 'success'} role="status">
            {feedback.text}
          </S.InlineAlert>
        ) : null}

        {manageable.length ? (
          <S.ActionGroup>
            <S.Button
              $variant="primary"
              disabled={loading || !hostname.trim() || (selected ? !selected.planEligible : !eligibleRestaurant(data.restaurants.find((item) => item.id === restaurantId)))}
              onClick={() => void save()}
            >
              {loading ? 'Salvando…' : selected ? 'Salvar alterações' : 'Cadastrar domínio'}
            </S.Button>
            <S.Button disabled={loading} onClick={() => void load()}>
              <RefreshCw size={15} /> Atualizar
            </S.Button>
          </S.ActionGroup>
        ) : null}
      </S.Card>

      {selected ? (
        <S.Card>
          <S.SectionHeading>
            <div>
              <h2>Publicação e DNS</h2>
              <p>
                Configure estes registros na zona DNS que você administra como contato técnico.
              </p>
            </div>
            <S.Badge $tone={statusTone(selected.status)}>{statusLabel(selected.status)}</S.Badge>
          </S.SectionHeading>

          <S.DetailGrid>
            <div>
              <dt>Domínio do cliente</dt>
              <dd>{selected.hostname}</dd>
            </div>
            <div>
              <dt>Cardápio publicado em</dt>
              <dd>{selected.publicHosts.join(', ') || 'Aguardando configuração'}</dd>
            </div>
            <div>
              <dt>Plano elegível</dt>
              <dd>{selected.planEligible ? 'Sim' : 'Não'}</dd>
            </div>
            <div>
              <dt>HTTPS</dt>
              <dd>
                {selected.status === 'ACTIVE'
                  ? 'Provisionamento automático pelo gateway'
                  : 'Será provisionado após ativação'}
              </dd>
            </div>
          </S.DetailGrid>

          <S.Fields>
            <label className="wide">
              Verificação TXT — nome
              <input readOnly value={selected.verification.name} />
            </label>
            <label className="wide">
              Verificação TXT — valor
              <input readOnly value={selected.verification.value} />
            </label>
            <label className="wide">
              Roteamento {selected.routing.type} — nome
              <input readOnly value={selected.routing.name || ''} />
            </label>
            <label className="wide">
              Roteamento {selected.routing.type} — destino
              <input
                readOnly
                value={selected.routing.value || 'Configure o destino de produção no servidor'}
              />
            </label>
            {selected.routing.wwwCname ? (
              <label className="wide">
                Alias www — CNAME
                <input readOnly value={`www.${selected.hostname} → ${selected.routing.wwwCname}`} />
              </label>
            ) : null}
          </S.Fields>

          {!selected.planEligible ? (
            <S.InlineAlert $tone="warning">
              Este restaurante não está mais elegível para domínio próprio. O hostname não é servido
              pela GastroNexa enquanto o plano/status permanecer inelegível. Você ainda pode
              desativar ou consultar a configuração.
            </S.InlineAlert>
          ) : null}
          <S.InlineAlert $tone="info">{selected.routing.note}</S.InlineAlert>
          {selected.lastCheckError ? (
            <S.InlineAlert $tone="warning">{selected.lastCheckError}</S.InlineAlert>
          ) : null}

          <S.ActionGroup>
            <S.Button
              disabled={loading || !selected.planEligible}
              onClick={() =>
                void run(
                  () => superAdminService.verifyCustomDomain(restaurantId),
                  'DNS verificado com sucesso.',
                )
              }
            >
              <ShieldCheck size={15} /> Verificar DNS
            </S.Button>
            <S.Button
              $variant="primary"
              disabled={
                loading ||
                selected.status === 'ACTIVE' ||
                !selected.planEligible ||
                (!selected.dnsVerifiedAt && selected.status !== 'DNS_VERIFIED')
              }
              onClick={() =>
                void run(
                  () => superAdminService.activateCustomDomain(restaurantId),
                  'Domínio ativado. O HTTPS será provisionado automaticamente no primeiro acesso.',
                )
              }
            >
              Ativar domínio
            </S.Button>
            {selected.status === 'ACTIVE' ? (
              <S.Button
                $variant="danger"
                disabled={loading}
                onClick={() =>
                  void run(
                    () => superAdminService.disableCustomDomain(restaurantId),
                    'Domínio desativado.',
                  )
                }
              >
                Desativar
              </S.Button>
            ) : null}
          </S.ActionGroup>
        </S.Card>
      ) : null}

      {domains.length ? (
        <S.Card>
          <S.SectionHeading>
            <div>
              <h2>Domínios cadastrados</h2>
              <p>{domains.length} configuração(ões) na plataforma.</p>
            </div>
          </S.SectionHeading>
          <S.DetailGrid>
            {domains.map((domain) => (
              <div key={domain.id}>
                <dt>{domain.restaurant?.name || `Restaurante #${domain.restaurantId}`}</dt>
                <dd>
                  {domain.mode === 'SITE_WITH_MENU_SUBDOMAIN'
                    ? domain.menuHostname
                    : domain.hostname}{' '}
                  — {statusLabel(domain.status)}
                </dd>
              </div>
            ))}
          </S.DetailGrid>
        </S.Card>
      ) : null}
    </S.PageStack>
  );
}
