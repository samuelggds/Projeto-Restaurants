import assert from 'node:assert/strict';
import test from 'node:test';

import Stripe from 'stripe';

import {
  apiRequest,
  prisma,
  resetTenantE2EDatabase,
  seedTenantE2EFixture,
  startTenantTestApplication,
} from './tenantE2EHarness.js';

function assertTenantDenied(status: number, label: string) {
  assert.notEqual(status, 500, `${label} gerou erro interno em vez de negar o acesso.`);
  assert.ok(
    [400, 401, 403, 404, 409].includes(status),
    `${label} deveria ser negado; status=${status}`,
  );
}

test('isolamento multi-tenant real por HTTP e webhooks', { timeout: 120_000 }, async (t) => {
  await resetTenantE2EDatabase();
  const fixture = await seedTenantE2EFixture();
  const runtime = await startTenantTestApplication();
  const { baseUrl } = runtime;

  try {
    await t.test(
      'autenticação real recarrega a identidade persistida e ignora tenant externo',
      async () => {
        const { response, data } = await apiRequest(
          baseUrl,
          '/profile?restaurantId=' + fixture.restaurants.b.id,
          fixture.tokens.adminA,
          { headers: { 'x-restaurant-id': String(fixture.restaurants.b.id) } },
        );

        assert.equal(response.status, 200);
        assert.equal(data.user.id, fixture.users.adminA.id);
        assert.equal(data.user.restaurantId, fixture.restaurants.a.id);
      },
    );

    await t.test('Restaurante A não lista nem consulta pedido real do Restaurante B', async () => {
      const list = await apiRequest(
        baseUrl,
        `/orders?restaurantId=${fixture.restaurants.b.id}`,
        fixture.tokens.adminA,
        { headers: { 'x-restaurant-id': String(fixture.restaurants.b.id) } },
      );
      assert.equal(list.response.status, 200);
      assert.ok(Array.isArray(list.data));
      assert.ok(list.data.some((order: any) => order.id === fixture.orders.a.id));
      assert.ok(list.data.every((order: any) => order.restaurantId === fixture.restaurants.a.id));
      assert.ok(!list.data.some((order: any) => order.id === fixture.orders.b.id));

      const denied = await apiRequest(
        baseUrl,
        `/orders/${fixture.orders.b.id}?restaurantId=${fixture.restaurants.b.id}`,
        fixture.tokens.adminA,
      );
      assertTenantDenied(denied.response.status, 'consulta de pedido estrangeiro');

      const owner = await apiRequest(
        baseUrl,
        `/orders/${fixture.orders.b.id}`,
        fixture.tokens.adminB,
      );
      assert.equal(owner.response.status, 200);
      assert.equal(owner.data.id, fixture.orders.b.id);
      assert.equal(owner.data.restaurantId, fixture.restaurants.b.id);
    });

    await t.test('status, cancelamento e estorno não alteram pedido de outro tenant', async () => {
      const statusAttempt = await apiRequest(
        baseUrl,
        `/orders/${fixture.orders.b.id}/status`,
        fixture.tokens.adminA,
        {
          method: 'PUT',
          json: { status: 'PREPARANDO', restaurantId: fixture.restaurants.b.id },
        },
      );
      assertTenantDenied(statusAttempt.response.status, 'alteração de status estrangeira');

      const cancelAttempt = await apiRequest(
        baseUrl,
        `/orders/${fixture.orders.b.id}/cancel`,
        fixture.tokens.adminA,
        { method: 'PATCH', json: { restaurantId: fixture.restaurants.b.id } },
      );
      assertTenantDenied(cancelAttempt.response.status, 'cancelamento estrangeiro');

      const refundAttempt = await apiRequest(
        baseUrl,
        `/orders/${fixture.orders.b.id}/refund`,
        fixture.tokens.adminA,
        { method: 'PATCH', json: { restaurantId: fixture.restaurants.b.id } },
      );
      assertTenantDenied(refundAttempt.response.status, 'estorno estrangeiro');

      const stored = await prisma.order.findUniqueOrThrow({ where: { id: fixture.orders.b.id } });
      assert.equal(stored.restaurantId, fixture.restaurants.b.id);
      assert.equal(stored.status, 'PENDENTE');
      assert.equal(stored.refundStatus, 'NOT_REQUESTED');
      assert.equal(stored.paid, false);
    });

    await t.test('chat de problema do pedido permanece privado ao Restaurante B', async () => {
      const readAttempt = await apiRequest(
        baseUrl,
        `/orders/${fixture.orders.b.id}/issue-thread`,
        fixture.tokens.adminA,
      );
      assertTenantDenied(readAttempt.response.status, 'leitura do chat estrangeiro');

      const replyAttempt = await apiRequest(
        baseUrl,
        `/orders/${fixture.orders.b.id}/reply-issue`,
        fixture.tokens.adminA,
        { method: 'POST', json: { message: 'Tentativa do Restaurante A' } },
      );
      assertTenantDenied(replyAttempt.response.status, 'resposta no chat estrangeiro');

      const resolveAttempt = await apiRequest(
        baseUrl,
        `/orders/${fixture.orders.b.id}/resolve-issue`,
        fixture.tokens.adminA,
        { method: 'PATCH', json: { restaurantId: fixture.restaurants.b.id } },
      );
      assertTenantDenied(resolveAttempt.response.status, 'fechamento do chat estrangeiro');

      const owner = await apiRequest(
        baseUrl,
        `/orders/${fixture.orders.b.id}/issue-thread`,
        fixture.tokens.adminB,
      );
      assert.equal(owner.response.status, 200);
      assert.equal(owner.data.orderId, fixture.orders.b.id);
      assert.match(JSON.stringify(owner.data), /Mensagem privada B/);

      const thread = await prisma.orderIssueThread.findUniqueOrThrow({
        where: { orderId: fixture.orders.b.id },
        include: { messages: true },
      });
      assert.equal(thread.isResolved, false);
      assert.equal(thread.messages.length, 1);
    });

    await t.test('CRUD e promoção de produto exigem id + restaurantId na prática', async () => {
      const updateAttempt = await apiRequest(
        baseUrl,
        `/products/${fixture.products.b.id}`,
        fixture.tokens.adminA,
        {
          method: 'PUT',
          json: {
            name: 'Produto sequestrado',
            price: 0.01,
            image: 'https://attacker.invalid/product.webp',
            restaurantId: fixture.restaurants.b.id,
          },
        },
      );
      assertTenantDenied(updateAttempt.response.status, 'alteração de produto estrangeiro');

      const createAttempt = await apiRequest(baseUrl, '/products', fixture.tokens.adminA, {
        method: 'POST',
        json: {
          name: 'Produto criado no tenant errado',
          price: 1,
          categoryId: fixture.categories.b.id,
          restaurantId: fixture.restaurants.b.id,
          optionGroups: [
            {
              name: 'Opções B',
              required: false,
              selectionType: 'SINGLE',
              minSelections: 0,
              maxSelections: 1,
              options: [{ ingredientId: fixture.ingredients.b.id }],
            },
          ],
        },
      });
      assertTenantDenied(createAttempt.response.status, 'criação com categoria de outro tenant');

      const discountAttempt = await apiRequest(
        baseUrl,
        `/products/${fixture.products.b.id}/discount`,
        fixture.tokens.adminA,
        {
          method: 'PUT',
          json: { kind: 'PERCENTAGE', value: 25, label: 'Ataque', active: true },
        },
      );
      assertTenantDenied(discountAttempt.response.status, 'promoção estrangeira');

      const deleteAttempt = await apiRequest(
        baseUrl,
        `/products/${fixture.products.b.id}`,
        fixture.tokens.adminA,
        { method: 'DELETE' },
      );
      assertTenantDenied(deleteAttempt.response.status, 'exclusão de produto estrangeiro');

      const ownerUpdate = await apiRequest(
        baseUrl,
        `/products/${fixture.products.b.id}`,
        fixture.tokens.adminB,
        { method: 'PUT', json: { name: 'Produto B confirmado' } },
      );
      assert.equal(ownerUpdate.response.status, 200);

      const ownerDiscount = await apiRequest(
        baseUrl,
        `/products/${fixture.products.b.id}/discount`,
        fixture.tokens.adminB,
        {
          method: 'PUT',
          json: { kind: 'PERCENTAGE', value: 10, label: 'Promoção B', active: true },
        },
      );
      assert.equal(ownerDiscount.response.status, 200);

      const stored = await prisma.product.findUniqueOrThrow({
        where: { id: fixture.products.b.id },
      });
      const discount = await prisma.productDiscount.findUniqueOrThrow({
        where: { productId: fixture.products.b.id },
      });
      assert.equal(stored.restaurantId, fixture.restaurants.b.id);
      assert.equal(stored.name, 'Produto B confirmado');
      assert.equal(Number(stored.price), 35);
      assert.equal(stored.image, 'https://tenant-e2e.test/produto-b-original.webp');
      assert.equal(
        await prisma.product.count({ where: { name: 'Produto criado no tenant errado' } }),
        0,
      );
      assert.equal(discount.restaurantId, fixture.restaurants.b.id);
      assert.equal(Number(discount.value), 10);
    });

    await t.test(
      'funcionários não podem ser alterados, desativados ou reativados por outro tenant',
      async () => {
        const updateAttempt = await apiRequest(
          baseUrl,
          `/employees/${fixture.users.employeeB.id}`,
          fixture.tokens.adminA,
          {
            method: 'PUT',
            json: { name: 'Funcionário sequestrado', restaurantId: fixture.restaurants.b.id },
          },
        );
        assertTenantDenied(updateAttempt.response.status, 'alteração de funcionário estrangeiro');

        const deactivateAttempt = await apiRequest(
          baseUrl,
          `/employees/${fixture.users.employeeB.id}`,
          fixture.tokens.adminA,
          { method: 'PATCH', json: { restaurantId: fixture.restaurants.b.id } },
        );
        assertTenantDenied(
          deactivateAttempt.response.status,
          'desativação de funcionário estrangeiro',
        );

        const reactivateAttempt = await apiRequest(
          baseUrl,
          `/employees/${fixture.users.employeeB.id}/reactivate`,
          fixture.tokens.adminA,
          { method: 'PATCH' },
        );
        assertTenantDenied(
          reactivateAttempt.response.status,
          'reativação de funcionário estrangeiro',
        );

        const ownerUpdate = await apiRequest(
          baseUrl,
          `/employees/${fixture.users.employeeB.id}`,
          fixture.tokens.adminB,
          { method: 'PUT', json: { name: 'Funcionário B confirmado' } },
        );
        assert.equal(ownerUpdate.response.status, 200);

        const createdWithTamperedBody = await apiRequest(
          baseUrl,
          '/employees',
          fixture.tokens.adminA,
          {
            method: 'POST',
            json: {
              name: 'Criado pelo Admin A',
              email: 'created-by-a@tenant-e2e.test',
              password: 'StrongPassword!123',
              confirmPassword: 'StrongPassword!123',
              phone: '11999998888',
              role: 'FUNCIONARIO',
              subRole: 'GARCOM',
              restaurantId: fixture.restaurants.b.id,
            },
          },
        );
        assert.equal(createdWithTamperedBody.response.status, 201);
        const created = await prisma.user.findUniqueOrThrow({
          where: { email: 'created-by-a@tenant-e2e.test' },
        });
        assert.equal(created.restaurantId, fixture.restaurants.a.id);

        const stored = await prisma.user.findUniqueOrThrow({
          where: { id: fixture.users.employeeB.id },
        });
        assert.equal(stored.restaurantId, fixture.restaurants.b.id);
        assert.equal(stored.name, 'Funcionário B confirmado');
        assert.equal(stored.active, true);
      },
    );

    await t.test('mesas, sessões e conta da mesa rejeitam IDs reais do Restaurante B', async () => {
      const tableRead = await apiRequest(
        baseUrl,
        `/tables/${fixture.tables.b.id}`,
        fixture.tokens.adminA,
      );
      assertTenantDenied(tableRead.response.status, 'leitura de mesa estrangeira');

      const tableUpdate = await apiRequest(
        baseUrl,
        `/tables/${fixture.tables.b.id}`,
        fixture.tokens.adminA,
        { method: 'PUT', json: { number: 99, restaurantId: fixture.restaurants.b.id } },
      );
      assertTenantDenied(tableUpdate.response.status, 'alteração de mesa estrangeira');

      const tableDeactivate = await apiRequest(
        baseUrl,
        `/tables/${fixture.tables.b.id}`,
        fixture.tokens.adminA,
        { method: 'PATCH', json: { restaurantId: fixture.restaurants.b.id } },
      );
      assertTenantDenied(tableDeactivate.response.status, 'desativação de mesa estrangeira');

      const closeSession = await apiRequest(
        baseUrl,
        `/table-sessions/${fixture.tableSessionB.id}/close`,
        fixture.tokens.adminA,
        { method: 'PATCH', json: { restaurantId: fixture.restaurants.b.id } },
      );
      assertTenantDenied(closeSession.response.status, 'fechamento de sessão estrangeira');

      const forceCloseSession = await apiRequest(
        baseUrl,
        `/table-sessions/${fixture.tableSessionB.id}/force-close`,
        fixture.tokens.adminA,
        { method: 'PATCH', json: { reason: 'Ataque', restaurantId: fixture.restaurants.b.id } },
      );
      assertTenantDenied(forceCloseSession.response.status, 'forçar fechamento estrangeiro');

      const accountRead = await apiRequest(
        baseUrl,
        `/table-accounts/sessions/${fixture.tableSessionB.publicId}/admin`,
        fixture.tokens.adminA,
      );
      assertTenantDenied(accountRead.response.status, 'leitura de conta estrangeira');

      const ownerTable = await apiRequest(
        baseUrl,
        `/tables/${fixture.tables.b.id}`,
        fixture.tokens.adminB,
      );
      assert.equal(ownerTable.response.status, 200);
      assert.equal(ownerTable.data.restaurantId, fixture.restaurants.b.id);

      const ownerAccount = await apiRequest(
        baseUrl,
        `/table-accounts/sessions/${fixture.tableSessionB.publicId}/admin`,
        fixture.tokens.adminB,
      );
      assert.equal(ownerAccount.response.status, 200);

      const session = await prisma.tableSession.findUniqueOrThrow({
        where: { id: fixture.tableSessionB.id },
      });
      const table = await prisma.table.findUniqueOrThrow({ where: { id: fixture.tables.b.id } });
      assert.equal(session.status, 'OPEN');
      assert.equal(table.number, 1);
      assert.equal(table.active, true);
      assert.equal(table.restaurantId, fixture.restaurants.b.id);
    });

    await t.test(
      'pagamento da mesa de B não pode ser confirmado ou estornado pelo Admin A',
      async () => {
        const confirmAttempt = await apiRequest(
          baseUrl,
          `/table-accounts/payments/${fixture.paymentIntentB.publicId}/confirm-manual`,
          fixture.tokens.adminA,
          { method: 'POST', json: { restaurantId: fixture.restaurants.b.id } },
        );
        assertTenantDenied(confirmAttempt.response.status, 'confirmação de pagamento estrangeiro');

        const refundAttempt = await apiRequest(
          baseUrl,
          `/table-accounts/payments/${fixture.paymentIntentB.publicId}/refund`,
          fixture.tokens.adminA,
          { method: 'POST', json: { reason: 'Ataque entre tenants' } },
        );
        assertTenantDenied(
          refundAttempt.response.status,
          'estorno de pagamento de mesa estrangeiro',
        );

        const payment = await prisma.tablePaymentIntent.findUniqueOrThrow({
          where: { id: fixture.paymentIntentB.id },
        });
        assert.equal(payment.restaurantId, fixture.restaurants.b.id);
        assert.equal(payment.status, 'RESERVED');
        assert.equal(payment.manualConfirmedById, null);
      },
    );

    await t.test(
      'cliente A não usa a sessão B para alterar participante ou cancelar pagamento',
      async () => {
        const attackHeaders = {
          'x-session-token': fixture.tableSessionB.sessionToken,
          'x-restaurant-id': String(fixture.restaurants.b.id),
        };
        const participantAttempt = await apiRequest(
          baseUrl,
          '/table-sessions/participant',
          fixture.tokens.customerA,
          {
            method: 'PATCH',
            headers: attackHeaders,
            json: {
              displayName: 'Participante sequestrado',
              participantId: fixture.participantB.id,
              restaurantId: fixture.restaurants.b.id,
            },
          },
        );
        assertTenantDenied(
          participantAttempt.response.status,
          'alteração de participante estrangeiro',
        );

        const cancelPaymentAttempt = await apiRequest(
          baseUrl,
          `/table-accounts/sessions/${fixture.tableSessionB.publicId}/payments/${fixture.paymentIntentB.publicId}/cancel`,
          fixture.tokens.customerA,
          {
            method: 'PATCH',
            headers: attackHeaders,
            json: { restaurantId: fixture.restaurants.b.id },
          },
        );
        assertTenantDenied(
          cancelPaymentAttempt.response.status,
          'cancelamento de pagamento estrangeiro',
        );

        const [participant, payment, billItem] = await Promise.all([
          prisma.tableParticipant.findUniqueOrThrow({ where: { id: fixture.participantB.id } }),
          prisma.tablePaymentIntent.findUniqueOrThrow({
            where: { id: fixture.paymentIntentB.id },
          }),
          prisma.tableBillItem.findUniqueOrThrow({ where: { id: fixture.tableBillItemB.id } }),
        ]);
        assert.equal(participant.displayName, fixture.users.customerB.name);
        assert.equal(payment.status, 'RESERVED');
        assert.equal(billItem.financialStatus, 'UNPAID');
        assert.equal(billItem.restaurantId, fixture.restaurants.b.id);
      },
    );

    await t.test('cupons ignoram tenant do body e bloqueiam update/delete cruzados', async () => {
      const updateAttempt = await apiRequest(
        baseUrl,
        `/coupons/${fixture.coupons.b.id}`,
        fixture.tokens.adminA,
        {
          method: 'PUT',
          json: { title: 'Cupom sequestrado', restaurantId: fixture.restaurants.b.id },
        },
      );
      assertTenantDenied(updateAttempt.response.status, 'alteração de cupom estrangeiro');

      const deleteAttempt = await apiRequest(
        baseUrl,
        `/coupons/${fixture.coupons.b.id}?restaurantId=${fixture.restaurants.b.id}`,
        fixture.tokens.adminA,
        { method: 'DELETE' },
      );
      assertTenantDenied(deleteAttempt.response.status, 'exclusão de cupom estrangeiro');

      const createAttempt = await apiRequest(baseUrl, '/coupons', fixture.tokens.adminA, {
        method: 'POST',
        json: {
          code: 'BODY_TAMPER',
          discount: 4,
          discountType: 'FIXED',
          restaurantId: fixture.restaurants.b.id,
        },
      });
      assert.equal(createAttempt.response.status, 201);
      const created = await prisma.coupon.findFirstOrThrow({ where: { code: 'BODY_TAMPER' } });
      assert.equal(created.restaurantId, fixture.restaurants.a.id);

      const ownerUpdate = await apiRequest(
        baseUrl,
        `/coupons/${fixture.coupons.b.id}`,
        fixture.tokens.adminB,
        { method: 'PUT', json: { title: 'Cupom B confirmado' } },
      );
      assert.equal(ownerUpdate.response.status, 200);
      const couponB = await prisma.coupon.findUniqueOrThrow({
        where: { id: fixture.coupons.b.id },
      });
      assert.equal(couponB.restaurantId, fixture.restaurants.b.id);
      assert.equal(couponB.title, 'Cupom B confirmado');
    });

    await t.test(
      'configurações privadas usam o tenant autenticado, nunca params/body',
      async () => {
        const updateAttempt = await apiRequest(
          baseUrl,
          `/settings/${fixture.settings.b.id}?restaurantId=${fixture.restaurants.b.id}`,
          fixture.tokens.adminA,
          {
            method: 'PUT',
            headers: { 'x-restaurant-id': String(fixture.restaurants.b.id) },
            json: { primaryColor: '#123456', restaurantId: fixture.restaurants.b.id },
          },
        );
        assert.equal(updateAttempt.response.status, 200);

        const [settingsA, settingsB] = await Promise.all([
          prisma.restaurantSettings.findUniqueOrThrow({
            where: { restaurantId: fixture.restaurants.a.id },
          }),
          prisma.restaurantSettings.findUniqueOrThrow({
            where: { restaurantId: fixture.restaurants.b.id },
          }),
        ]);
        assert.equal(settingsA.primaryColor, '#123456');
        assert.equal(settingsB.primaryColor, '#bb2200');

        const ownerRead = await apiRequest(baseUrl, '/settings', fixture.tokens.adminB);
        assert.equal(ownerRead.response.status, 200);
        assert.equal(ownerRead.data.restaurantId, fixture.restaurants.b.id);
      },
    );

    await t.test(
      'suporte interno ignora restaurantId da query e protege escrita/exclusão',
      async () => {
        const list = await apiRequest(
          baseUrl,
          `/ai-support/messages?restaurantId=${fixture.restaurants.b.id}&channel=INTERNAL`,
          fixture.tokens.adminA,
        );
        assert.equal(list.response.status, 200);
        assert.equal(list.data.restaurantId, fixture.restaurants.a.id);
        assert.ok(
          list.data.messages.some((message: any) => message.id === String(fixture.support.a.id)),
        );
        assert.ok(
          list.data.messages.every(
            (message: any) => message.restaurantId === fixture.restaurants.a.id,
          ),
        );

        const update = await apiRequest(
          baseUrl,
          `/ai-support/messages/${fixture.support.b.id}/issue`,
          fixture.tokens.adminA,
          { method: 'PATCH', json: { status: 'CLOSED', response: 'Tentativa indevida' } },
        );
        assert.equal(update.response.status, 404);

        const remove = await apiRequest(
          baseUrl,
          `/ai-support/messages/${fixture.support.closedB.id}/issue`,
          fixture.tokens.adminA,
          { method: 'DELETE' },
        );
        assert.equal(remove.response.status, 409);

        const [openB, closedB] = await Promise.all([
          prisma.supportChatMessage.findUniqueOrThrow({ where: { id: fixture.support.b.id } }),
          prisma.supportChatMessage.findUniqueOrThrow({
            where: { id: fixture.support.closedB.id },
          }),
        ]);
        assert.equal(openB.issueStatus, 'OPEN');
        assert.equal(openB.issueResponse, null);
        assert.equal(closedB.restaurantId, fixture.restaurants.b.id);
      },
    );

    await t.test('faturas privadas não aceitam restaurantId por query ou header', async () => {
      const result = await apiRequest(
        baseUrl,
        `/billing/invoices?restaurantId=${fixture.restaurants.b.id}`,
        fixture.tokens.adminA,
        { headers: { 'x-restaurant-id': String(fixture.restaurants.b.id) } },
      );
      assert.equal(result.response.status, 200);
      assert.ok(result.data.invoices.some((invoice: any) => invoice.id === fixture.invoices.a.id));
      assert.ok(
        result.data.invoices.every(
          (invoice: any) => invoice.restaurantId === fixture.restaurants.a.id,
        ),
      );
      assert.ok(!result.data.invoices.some((invoice: any) => invoice.id === fixture.invoices.b.id));
    });

    await t.test(
      'webhook Asaas com orderId B + restaurantId A é ignorado sem escrita',
      async () => {
        const result = await apiRequest(baseUrl, '/api/webhooks/asaas', undefined, {
          method: 'POST',
          headers: { 'asaas-access-token': 'tenant-e2e-asaas-webhook-token' },
          json: {
            event: 'PAYMENT_RECEIVED',
            payment: {
              id: 'asaas-cross-tenant',
              externalReference: `orderpix:${fixture.restaurants.a.id}:${fixture.orders.webhookB.id}`,
              value: Number(fixture.orders.webhookB.total),
              walletId: 'wallet-a',
            },
          },
        });
        assert.equal(result.response.status, 200);
        assert.equal(result.data.ignored, true);

        const stored = await prisma.order.findUniqueOrThrow({
          where: { id: fixture.orders.webhookB.id },
        });
        assert.equal(stored.paid, false);
        assert.equal(stored.cardCheckoutSessionId, 'checkout-original-b');
      },
    );

    await t.test(
      'webhook Stripe assinado não cruza orderId B com metadata do Restaurante A',
      async () => {
        const payload = JSON.stringify({
          id: 'evt_tenant_e2e_cross',
          object: 'event',
          type: 'checkout.session.completed',
          data: {
            object: {
              id: 'checkout-attack-a',
              object: 'checkout.session',
              payment_status: 'paid',
              metadata: {
                orderId: String(fixture.orders.webhookB.id),
                restaurantId: String(fixture.restaurants.a.id),
              },
            },
          },
        });
        const signature = Stripe.webhooks.generateTestHeaderString({
          payload,
          secret: fixture.settings.stripeSecretA,
        });
        const result = await apiRequest(baseUrl, '/orders/webhook/stripe', undefined, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'stripe-signature': signature },
          body: payload,
        });
        assert.equal(result.response.status, 200);

        const stored = await prisma.order.findUniqueOrThrow({
          where: { id: fixture.orders.webhookB.id },
        });
        assert.equal(stored.paid, false);
        assert.equal(stored.cardCheckoutSessionId, 'checkout-original-b');
      },
    );

    await t.test(
      'webhooks PagBank e Mercado Pago rejeitam ou ignoram tenant incompatível',
      async () => {
        const pagBank = await apiRequest(baseUrl, '/orders/webhook/pagbank', undefined, {
          method: 'POST',
          json: {
            id: 'pagbank-cross-tenant',
            reference_id: `orderpix:${fixture.restaurants.a.id}:${fixture.orders.webhookB.id}`,
            restaurantId: fixture.restaurants.b.id,
            charges: [{ status: 'PAID' }],
          },
        });
        assert.equal(pagBank.response.status, 400);

        const originalFetch = globalThis.fetch;
        globalThis.fetch = async (input, init) => {
          const url = String(input);
          if (url.startsWith('https://api.mercadopago.com/v1/payments/')) {
            return new Response(
              JSON.stringify({
                id: 'mp-cross-tenant',
                status: 'approved',
                external_reference: `ordercard:${fixture.orders.webhookB.id}:${fixture.restaurants.a.id}`,
                metadata: { restaurant_id: fixture.restaurants.a.id },
              }),
              { status: 200, headers: { 'content-type': 'application/json' } },
            );
          }
          return originalFetch(input, init);
        };
        try {
          const mercadoPago = await apiRequest(
            baseUrl,
            `/orders/webhook/mercadopago?restaurantId=${fixture.restaurants.a.id}`,
            undefined,
            {
              method: 'POST',
              json: { data: { id: 'mp-cross-tenant' } },
            },
          );
          assert.equal(mercadoPago.response.status, 200);
        } finally {
          globalThis.fetch = originalFetch;
        }

        const stored = await prisma.order.findUniqueOrThrow({
          where: { id: fixture.orders.webhookB.id },
        });
        assert.equal(stored.paid, false);
        assert.equal(stored.restaurantId, fixture.restaurants.b.id);
      },
    );
  } finally {
    await runtime.close();
    await resetTenantE2EDatabase();
    await prisma.$disconnect();
  }
});
