import { useState } from 'react';
import type { PlatformPlan, RestaurantTenant, SuperAdminActions } from '../types';
import {
  formatCurrency,
  formatDate,
  requestErrorMessage,
  statusTone,
  tenantLabels,
} from '../domain/superAdminDomain';
import * as S from '../SuperAdmin.styles';
import { ConfirmAction, Empty, Modal } from './Shared';
import { SubscriptionDialog } from './ActionDialogs';

type GeneratedLink = { url: string; expiresAt: string } | null;

export function RestaurantDetailsSecure({
  restaurant,
  plans,
  actions,
  onClose,
  notify,
}: {
  restaurant: RestaurantTenant;
  plans: PlatformPlan[];
  actions: SuperAdminActions;
  onClose: () => void;
  notify: (message: string, error?: boolean) => void;
}) {
  const [confirmAccess, setConfirmAccess] = useState(false);
  const [confirmRevokePortal, setConfirmRevokePortal] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<GeneratedLink>(null);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [portalError, setPortalError] = useState('');

  const generatePortalLink = async () => {
    setGeneratingLink(true);
    setPortalError('');
    try {
      const result = await actions.rotateAdminPortalKey(restaurant.id);
      const url = `${window.location.origin}/${encodeURIComponent(result.slug)}/admin/${encodeURIComponent(result.key)}`;
      setGeneratedLink({ url, expiresAt: result.expiresAt });
      try {
        await navigator.clipboard.writeText(url);
        notify('Novo link administrativo gerado e copiado. O link anterior foi invalidado.');
      } catch {
        notify('Novo link administrativo gerado. Copie e envie por um canal seguro.');
      }
    } catch (error) {
      setPortalError(requestErrorMessage(error, 'Não foi possível gerar o link administrativo.'));
    } finally {
      setGeneratingLink(false);
    }
  };

  const copyGeneratedLink = async () => {
    if (!generatedLink) return;
    try {
      await navigator.clipboard.writeText(generatedLink.url);
      notify('Link administrativo copiado.');
    } catch {
      setPortalError('Não foi possível copiar automaticamente. Selecione o link e copie manualmente.');
    }
  };

  return (
    <>
      <Modal
        drawer
        title={restaurant.name}
        description={`Tenant #${restaurant.id} • /${restaurant.slug}`}
        onClose={onClose}
        footer={<S.Button onClick={onClose}>Fechar</S.Button>}
      >
        <S.DetailGrid>
          <div>
            <dt>Status operacional</dt>
            <dd>
              <S.Badge $tone={statusTone(restaurant.status)}>
                {tenantLabels[restaurant.status]}
              </S.Badge>
            </dd>
          </div>
          <div>
            <dt>Acesso</dt>
            <dd>{restaurant.active ? 'Liberado' : 'Bloqueado'}</dd>
          </div>
          {!restaurant.active ? (
            <div>
              <dt>Origem do bloqueio</dt>
              <dd>
                {restaurant.accessBlockReason === 'BILLING'
                  ? 'Inadimplência detectada automaticamente'
                  : 'Suspensão manual da plataforma'}
              </dd>
            </div>
          ) : null}
          <div>
            <dt>E-mail</dt>
            <dd>{restaurant.email || 'Não informado'}</dd>
          </div>
          <div>
            <dt>Telefone</dt>
            <dd>{restaurant.phone || 'Não informado'}</dd>
          </div>
          <div>
            <dt>Cadastrado em</dt>
            <dd>{formatDate(restaurant.createdAt, true)}</dd>
          </div>
          <div>
            <dt>Último acesso</dt>
            <dd>{formatDate(restaurant.lastAccessAt, true)}</dd>
          </div>
          <div>
            <dt>Plano atual</dt>
            <dd>{restaurant.subscription?.planCode || 'Sem assinatura'}</dd>
          </div>
          <div>
            <dt>Mensalidade</dt>
            <dd>{formatCurrency(restaurant.monthlyFee)}</dd>
          </div>
          <div>
            <dt>Próxima cobrança</dt>
            <dd>{formatDate(restaurant.nextBillingAt)}</dd>
          </div>
          <div>
            <dt>Volume de pedidos no mês</dt>
            <dd>{formatCurrency(restaurant.monthlyOrderRevenue)}</dd>
          </div>
        </S.DetailGrid>

        <S.Card>
          <S.SectionHeading>
            <div>
              <h2>Administrador principal</h2>
              <p>Responsável com acesso administrativo ao restaurante.</p>
            </div>
          </S.SectionHeading>
          {restaurant.primaryAdmin ? (
            <S.DetailGrid>
              <div>
                <dt>Nome</dt>
                <dd>{restaurant.primaryAdmin.name}</dd>
              </div>
              <div>
                <dt>E-mail</dt>
                <dd>{restaurant.primaryAdmin.email}</dd>
              </div>
            </S.DetailGrid>
          ) : (
            <Empty
              title="Sem administrador"
              description="Crie um administrador na aba Administradores."
            />
          )}
        </S.Card>

        <S.Card>
          <S.SectionHeading>
            <div>
              <h2>Link administrativo privado</h2>
              <p>
                Gere um link secreto para abrir a tela ADMIN deste restaurante. Gerar um novo link
                invalida imediatamente o anterior.
              </p>
            </div>
          </S.SectionHeading>

          {generatedLink ? (
            <S.Fields>
              <label className="wide">
                Link gerado — disponível somente agora
                <input value={generatedLink.url} readOnly autoComplete="off" />
              </label>
              <div className="wide">
                <small>Expira em {formatDate(generatedLink.expiresAt, true)}.</small>
              </div>
            </S.Fields>
          ) : (
            <S.InlineAlert $tone="info">
              Por segurança, a chave não pode ser recuperada depois. Gere um novo link quando
              precisar enviá-lo novamente ao administrador.
            </S.InlineAlert>
          )}

          {portalError ? (
            <S.InlineAlert $tone="error" role="alert">
              {portalError}
            </S.InlineAlert>
          ) : null}

          <S.ActionGroup>
            <S.Button $variant="primary" disabled={generatingLink} onClick={() => void generatePortalLink()}>
              {generatingLink ? 'Gerando…' : generatedLink ? 'Gerar novo link' : 'Gerar link'}
            </S.Button>
            {generatedLink ? <S.Button onClick={() => void copyGeneratedLink()}>Copiar link</S.Button> : null}
            <S.Button $variant="danger" onClick={() => setConfirmRevokePortal(true)}>
              Revogar link
            </S.Button>
          </S.ActionGroup>
        </S.Card>

        <S.ActionGroup>
          <S.Button $variant="primary" onClick={() => setEditingSubscription(true)}>
            Editar assinatura
          </S.Button>
          <S.Button
            $variant={restaurant.active ? 'danger' : 'quiet'}
            onClick={() => setConfirmAccess(true)}
          >
            {restaurant.active ? 'Bloquear acesso' : 'Liberar acesso'}
          </S.Button>
        </S.ActionGroup>
      </Modal>

      {confirmAccess ? (
        <ConfirmAction
          title={restaurant.active ? 'Bloquear restaurante' : 'Liberar restaurante'}
          description={
            restaurant.active
              ? 'O restaurante e seus usuários perderão o acesso operacional. A ação será auditada.'
              : 'O acesso operacional será restabelecido imediatamente.'
          }
          confirmLabel={restaurant.active ? 'Bloquear acesso' : 'Liberar acesso'}
          danger={restaurant.active}
          onClose={() => setConfirmAccess(false)}
          onConfirm={async (reason) => {
            await actions.updateRestaurantAccess(restaurant.id, {
              active: !restaurant.active,
              reason,
            });
            notify('Acesso do restaurante atualizado.');
          }}
        />
      ) : null}

      {confirmRevokePortal ? (
        <ConfirmAction
          title="Revogar link administrativo"
          description="O link privado atual e qualquer autorização temporária aberta por ele deixarão de funcionar imediatamente."
          confirmLabel="Revogar link"
          danger
          onClose={() => setConfirmRevokePortal(false)}
          onConfirm={async () => {
            await actions.revokeAdminPortalKey(restaurant.id);
            setGeneratedLink(null);
            setConfirmRevokePortal(false);
            notify('Link administrativo revogado.');
          }}
        />
      ) : null}

      {editingSubscription ? (
        <SubscriptionDialog
          restaurant={restaurant}
          plans={plans}
          actions={actions}
          onClose={() => setEditingSubscription(false)}
          notify={notify}
        />
      ) : null}
    </>
  );
}
