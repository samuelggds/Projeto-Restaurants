import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../../../Services/api';
import monthlyBillingService, { type Invoice } from '../../../Services/monthlyBillingService';
import { clearSystemBlockState, findBlockingInvoice } from '../../../Services/systemBlock';
import { getBillingPixExpiry } from '../components/useBillingPixExpiry';

export type BillingRecoveryPix = {
  invoiceId: number;
  qrCode: string;
  qrCodeBase64: string;
  expiresAt?: string | null;
};

export type BillingRecoveryFeedback = {
  tone: 'info' | 'success' | 'error';
  message: string;
};

type RecoveryState = {
  restaurantId: number;
  invoices: Invoice[];
  invoice: Invoice | null;
  planName: string;
  loading: boolean;
  loadError: string | null;
  pix: BillingRecoveryPix | null;
  generatingPix: boolean;
  checking: boolean;
  feedback: BillingRecoveryFeedback | null;
};

type RecoverySession = {
  restaurantId: number;
  active: boolean;
  busy: boolean;
  invoice: Invoice | null;
};

const initialState = (restaurantId: number): RecoveryState => ({
  restaurantId,
  invoices: [],
  invoice: null,
  planName: 'Plano atual',
  loading: true,
  loadError: null,
  pix: null,
  generatingPix: false,
  checking: false,
  feedback: null,
});

function invoicePix(invoice: Invoice | null): BillingRecoveryPix | null {
  if (!invoice) return null;
  const qrCode = typeof invoice.pixQrCode === 'string' ? invoice.pixQrCode.trim() : '';
  const qrCodeBase64 =
    typeof invoice.pixQrCodeBase64 === 'string' ? invoice.pixQrCodeBase64.trim() : '';
  if (!qrCode || !qrCodeBase64 || !/^[A-Za-z0-9+/]+={0,2}$/u.test(qrCodeBase64)) return null;
  if (getBillingPixExpiry(invoice.pixExpiresAt).status !== 'valid') return null;
  return {
    invoiceId: invoice.id,
    qrCode,
    qrCodeBase64,
    expiresAt: invoice.pixExpiresAt,
  };
}

export function useBillingRecovery(restaurantId: number) {
  const [state, setState] = useState(() => initialState(restaurantId));
  const sessionRef = useRef<RecoverySession | null>(null);

  const isCurrent = useCallback(
    (session: RecoverySession) => session.active && sessionRef.current === session,
    [],
  );

  const update = useCallback(
    (session: RecoverySession, patch: Partial<RecoveryState>) => {
      if (!isCurrent(session)) return;
      setState((current) => ({
        ...(current.restaurantId === session.restaurantId
          ? current
          : initialState(session.restaurantId)),
        ...patch,
      }));
    },
    [isCurrent],
  );

  const applyInvoices = useCallback(
    (session: RecoverySession, invoices: Invoice[]) => {
      const invoice = findBlockingInvoice(invoices) as Invoice | null;
      if (isCurrent(session)) session.invoice = invoice;
      update(session, { invoices, invoice, pix: invoicePix(invoice) });
      return invoice;
    },
    [isCurrent, update],
  );

  const confirmAvailability = useCallback(
    async (session: RecoverySession, invoice: Invoice | null) => {
      const response = await api.get<{ available?: boolean }>(
        `/restaurants/${session.restaurantId}/availability`,
        { headers: { 'Cache-Control': 'no-cache' } },
      );
      if (!isCurrent(session)) return;
      if (response.data?.available === true) {
        update(session, {
          feedback: { tone: 'success', message: 'Acesso liberado. Você já pode voltar ao painel.' },
        });
        clearSystemBlockState();
      } else {
        update(session, {
          feedback: {
            tone: 'info',
            message: invoice
              ? 'O pagamento ainda não foi confirmado. A liberação acontece após a confirmação.'
              : 'A cobrança foi atualizada. Estamos aguardando a liberação do restaurante.',
          },
        });
      }
    },
    [isCurrent, update],
  );

  const load = useCallback(async () => {
    const session = sessionRef.current;
    if (!session?.active || session.restaurantId !== restaurantId || session.busy) return;
    session.busy = true;
    update(session, { loading: true, loadError: null, feedback: null });
    try {
      if (!Number.isInteger(restaurantId) || restaurantId <= 0) throw new Error('restaurant');
      const details = Promise.allSettled([
        monthlyBillingService.getSubscription(),
        monthlyBillingService.getPlans(),
      ]);
      const overview = await monthlyBillingService.getOverview();
      if (!isCurrent(session)) return;
      const invoice = applyInvoices(session, overview.invoices || []);
      // A cobrança fica disponível mesmo se os detalhes complementares falharem.
      update(session, { loading: false });
      void details.then(([subscriptionResult, plansResult]) => {
        const subscription =
          subscriptionResult.status === 'fulfilled' ? subscriptionResult.value : null;
        const plans = plansResult.status === 'fulfilled' ? plansResult.value : [];
        const planCode = subscription?.plan || overview.billing?.plan;
        update(session, {
          planName: plans.find((plan) => plan.plan === planCode)?.name || planCode || 'Plano atual',
        });
      });
      if (!invoice && isCurrent(session)) await confirmAvailability(session, null);
    } catch {
      update(session, {
        loadError: 'Não foi possível carregar a cobrança agora. Tente novamente em instantes.',
      });
    } finally {
      session.busy = false;
      update(session, { loading: false });
    }
  }, [applyInvoices, confirmAvailability, isCurrent, restaurantId, update]);

  const verifyRelease = useCallback(async () => {
    const session = sessionRef.current;
    if (!session?.active || session.restaurantId !== restaurantId || session.busy) return;
    session.busy = true;
    update(session, { checking: true, feedback: null });
    try {
      if (!Number.isInteger(restaurantId) || restaurantId <= 0) throw new Error('restaurant');
      const overview = await monthlyBillingService.getOverview();
      if (!isCurrent(session)) return;
      const invoice = applyInvoices(session, overview.invoices || []);
      update(session, { loadError: null });
      await confirmAvailability(session, invoice);
    } catch {
      update(session, {
        feedback: {
          tone: 'error',
          message: 'Não foi possível confirmar a liberação agora. Tente novamente em instantes.',
        },
      });
    } finally {
      session.busy = false;
      update(session, { checking: false });
    }
  }, [applyInvoices, confirmAvailability, isCurrent, restaurantId, update]);

  const generatePix = useCallback(async () => {
    const session = sessionRef.current;
    if (!session?.active || session.restaurantId !== restaurantId || session.busy) return;
    const invoice = session.invoice;
    if (!invoice) return;
    session.busy = true;
    update(session, { generatingPix: true, feedback: null });
    try {
      const result = await monthlyBillingService.generatePix(invoice.id);
      if (!isCurrent(session)) return;
      const refreshedInvoice = {
        ...invoice,
        pixQrCode: result?.pixQrCode,
        pixQrCodeBase64: result?.pixQrCodeBase64,
        pixExpiresAt: result?.pixExpiresAt,
      };
      const pix = invoicePix(refreshedInvoice);
      if (!pix) throw new Error('pix');
      session.invoice = refreshedInvoice;
      setState((current) => ({
        ...current,
        invoice: refreshedInvoice,
        invoices: current.invoices.map((item) =>
          item.id === invoice.id ? refreshedInvoice : item,
        ),
        pix,
      }));
    } catch {
      update(session, {
        pix: null,
        feedback: {
          tone: 'error',
          message: 'Não foi possível preparar um Pix válido. Tente gerar o código novamente.',
        },
      });
    } finally {
      session.busy = false;
      update(session, { generatingPix: false });
    }
  }, [isCurrent, restaurantId, update]);

  useEffect(() => {
    const session: RecoverySession = {
      restaurantId,
      active: true,
      busy: false,
      invoice: null,
    };
    sessionRef.current = session;
    const timer = window.setTimeout(() => void load(), 0);
    return () => {
      session.active = false;
      window.clearTimeout(timer);
    };
  }, [load, restaurantId]);

  useEffect(() => {
    if (!state.pix || state.restaurantId !== restaurantId) return undefined;
    const timer = window.setInterval(() => void verifyRelease(), 12_000);
    return () => window.clearInterval(timer);
  }, [restaurantId, state.pix, state.restaurantId, verifyRelease]);

  const visibleState = state.restaurantId === restaurantId ? state : initialState(restaurantId);
  return {
    invoices: visibleState.invoices,
    invoice: visibleState.invoice,
    planName: visibleState.planName,
    loading: visibleState.loading,
    loadError: visibleState.loadError,
    pix: visibleState.pix,
    generatingPix: visibleState.generatingPix,
    checking: visibleState.checking,
    feedback: visibleState.feedback,
    load,
    generatePix,
    verifyRelease,
  };
}
