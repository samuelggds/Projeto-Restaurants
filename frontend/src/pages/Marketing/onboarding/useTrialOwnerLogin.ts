import { useEffect, useRef, useState } from 'react';
import authService from '../../../Services/authService';
import { useAuth } from '../../../contexts/authContext';
import { persistTenantSlug } from '../../../shared/navigation/tenantRouteContext';
import {
  exchangeAdminPortalKey,
  verifyAdminPortalGrant,
} from '../../Login/domain/adminPortalSession';
import { type TrialAccess, trialRequestError } from './trialApi';

type AuthUser = NonNullable<ReturnType<typeof useAuth>['user']>;
type LoginSession = { user?: AuthUser; token?: string };
type Challenge = NonNullable<ReturnType<typeof authService.getPendingMfaChallenge>>;

export function useTrialOwnerLogin() {
  const { user, login } = useAuth();
  const [authenticatedOwner, setAuthenticatedOwner] = useState<{
    userId: number;
    restaurantId: number;
  } | null>(null);
  const [mfa, setMfa] = useState<Challenge | null>(null);
  const [attempting, setAttempting] = useState(false);
  const [issue, setIssue] = useState('');
  const pending = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  async function acceptSession(slug: string, email: string, result: LoginSession) {
    if (!result?.token || !result.user) throw new Error('Acesso não confirmado.');
    const owner = result.user;
    try {
      const grant = await verifyAdminPortalGrant(slug);
      if (
        !grant.valid ||
        grant.slug !== slug ||
        owner.role !== 'ADMIN' ||
        owner.email?.trim().toLowerCase() !== email ||
        !Number.isSafeInteger(owner.id) ||
        Number(owner.id) <= 0 ||
        owner.mustChangePassword ||
        !Number.isSafeInteger(owner.restaurantId) ||
        Number(owner.restaurantId) <= 0 ||
        owner.restaurantId !== grant.restaurantId
      ) {
        throw new Error('Acesso não confirmado.');
      }
      if (!mounted.current) return;
      persistTenantSlug(slug);
      login(owner, result.token);
      setAuthenticatedOwner({ restaurantId: grant.restaurantId, userId: Number(owner.id) });
    } catch (error) {
      await authService.logout(result.token).catch(() => undefined);
      throw error;
    }
  }

  async function signIn(access: TrialAccess, email: string, password: string) {
    if (pending.current) return;
    pending.current = true;
    setAttempting(true);
    setIssue('');
    setMfa(null);
    try {
      const slug = access.menuPath.slice(1);
      const key = access.adminPath.split('/').at(-1);
      if (!key) throw new Error('Acesso não confirmado.');
      await exchangeAdminPortalKey(slug, key);
      const response = await authService.login({ email, password, restaurantSlug: slug });
      if (!mounted.current) return;
      if (response.mfaRequired) {
        if (!response.mfaToken) throw new Error('Verificação não confirmada.');
        setMfa(response);
      } else {
        await acceptSession(slug, email, response as LoginSession);
      }
    } catch (error) {
      if (mounted.current)
        setIssue(
          trialRequestError(
            error,
            'Sua conta está ativa. Entre com a senha do proprietário para continuar aqui.',
          ),
        );
    } finally {
      pending.current = false;
      if (mounted.current) setAttempting(false);
    }
  }

  async function verifyCode(access: TrialAccess, email: string, code: string) {
    if (!mfa?.mfaToken) throw new Error('Inicie novamente o acesso do proprietário.');
    // Choosing a delivery channel or resending the code can rotate the challenge.
    const mfaToken = authService.getPendingMfaChallenge()?.mfaToken || mfa.mfaToken;
    const result = await authService.verifyLogin2fa({ mfaToken, code });
    try {
      await acceptSession(access.menuPath.slice(1), email, result);
    } catch {
      setMfa(null);
      setIssue('Sua conta está ativa. Entre novamente para abrir o editor do restaurante.');
      throw new Error('Não foi possível validar o acesso a este restaurante.');
    }
  }

  function closeMfa() {
    setMfa(null);
    authService.pendingMfaChallenge = null;
  }

  return {
    authorized: Boolean(
      authenticatedOwner &&
      user?.role === 'ADMIN' &&
      user.id === authenticatedOwner.userId &&
      user.restaurantId === authenticatedOwner.restaurantId,
    ),
    attempting,
    issue,
    mfa,
    signIn,
    verifyCode,
    closeMfa,
  };
}
