import { expect, test, type Page } from '@playwright/test';

type DashboardState = ReturnType<typeof createDashboard>;

function createDashboard() {
  const now = '2026-08-28T10:00:00.000Z';
  return {
    restaurants: [
      {
        id: 17,
        name: 'Restaurante Aurora',
        slug: 'restaurante-aurora',
        email: 'contato@aurora.test',
        phone: '85999999999',
        active: true,
        status: 'ACTIVE',
        createdAt: '2026-07-20T10:00:00.000Z',
        lastAccessAt: now,
        nextBillingAt: '2026-09-10T10:00:00.000Z',
        monthlyFee: 249.9,
        monthlyOrderRevenue: 8320.5,
        primaryAdmin: {
          id: 33,
          name: 'Ana Responsável',
          email: 'ana@aurora.test',
          active: true,
          lastAccessAt: now,
        },
        subscription: {
          id: 41,
          planCode: 'PREMIUM',
          status: 'ATIVA',
          trialEndsAt: null,
          currentPeriodStart: '2026-08-10T10:00:00.000Z',
          currentPeriodEnd: '2026-09-10T10:00:00.000Z',
          balanceDebt: 0,
          scheduledPlan: null,
          createdAt: '2026-07-20T10:00:00.000Z',
          updatedAt: now,
        },
      },
    ],
    metrics: {
      restaurantsTotal: 1,
      restaurantsActive: 1,
      restaurantsTrial: 0,
      restaurantsOverdue: 0,
      restaurantsBlocked: 0,
      restaurantsCanceled: 0,
      totalGenerated: 249.9,
      totalReceivable: 249.9,
      pendingInvoicesCount: 1,
      pendingInvoicesTotal: 249.9,
      mrr: 249.9,
      monthlyGrowth: [
        { label: 'jul', count: 1 },
        { label: 'ago', count: 1 },
      ],
      monthlyRevenue: [
        { label: 'jul', value: 0 },
        { label: 'ago', value: 249.9 },
      ],
    },
    plans: [
      {
        code: 'PREMIUM',
        name: 'Premium',
        description: 'Operação completa para delivery e atendimento nas mesas.',
        monthlyFee: 249.9,
        trialDays: 14,
        features: ['Delivery', 'Cardápio por QR Code', 'Suporte prioritário'],
        featured: true,
        active: true,
        restaurantsCount: 1,
        version: 1,
      },
    ],
    invoices: [
      {
        id: 71,
        code: 'FAT-000071',
        restaurantId: 17,
        restaurant: 'Restaurante Aurora',
        dueDate: '2026-09-10T10:00:00.000Z',
        paidAt: null,
        value: 249.9,
        monthlyFee: 249.9,
        systemFees: 0,
        status: 'PENDING',
        paymentLink: 'https://payments.example.test/71',
      },
    ],
    administrators: [
      {
        id: 33,
        name: 'Ana Responsável',
        email: 'ana@aurora.test',
        restaurantId: 17,
        restaurant: 'Restaurante Aurora',
        status: 'ACTIVE',
        lastAccessAt: now,
        mfaEnabled: true,
        mfaRequired: true,
        effectiveMfa: true,
        mustChangePassword: false,
        createdAt: '2026-07-20T10:00:00.000Z',
      },
    ],
    tickets: [
      {
        id: 91,
        restaurantId: 17,
        restaurant: 'Restaurante Aurora',
        subject: 'Ajuda com a configuração do cardápio',
        status: 'OPEN',
        messageCount: 2,
        lastMessageAt: now,
        lastSenderRole: 'ADMIN',
      },
    ],
    auditLogs: [
      {
        id: 101,
        createdAt: now,
        user: 'Super Admin',
        role: 'SUPER_ADMIN',
        restaurant: 'Restaurante Aurora',
        action: 'UPDATE_RESTAURANT',
        resource: 'Restaurant:17',
        ip: '127.0.0.1',
        result: 'SUCCESS',
        requestId: 'e2e-request-101',
        userAgent: 'Playwright',
        metadata: { fields: ['active'] },
      },
    ],
    settings: {
      platformName: 'Peça Já Platform',
      platformDomain: 'app.pecaja.test',
      supportEmail: 'suporte@pecaja.test',
      primaryColor: '#E9530B',
      locale: 'pt-BR',
      currency: 'BRL',
      timezone: 'America/Sao_Paulo',
      dateFormat: 'dd/MM/yyyy',
      allowRestaurantSignup: false,
      requireManualApproval: true,
      defaultTrialDays: 14,
      auditRetentionDays: 180,
      maintenanceMode: false,
      maintenanceMessage: 'Plataforma temporariamente em manutenção programada.',
      version: 1,
      updatedAt: now,
    },
    systemPolicies: {
      deployment: [
        {
          key: 'environment',
          label: 'Ambiente de execução',
          value: 'test',
          description: 'Ambiente em que o backend está executando.',
          configured: true,
        },
      ],
      email: [
        {
          key: 'smtp',
          label: 'Servidor SMTP',
          value: 'Configurado',
          description: 'Canal de e-mail transacional.',
          configured: true,
        },
      ],
      integrations: [],
      security: [
        {
          key: 'singleSuperAdmin',
          label: 'SUPER_ADMIN único',
          value: true,
          description: 'Restrição aplicada pelo banco de dados.',
          configured: true,
        },
      ],
      maintenance: [],
    },
  };
}

async function mockSuperAdminApi(
  page: Page,
  state: DashboardState,
  writes: Array<{ path: string; body: Record<string, unknown> }>,
) {
  const supportMessages: Array<Record<string, unknown>> = [
    {
      id: 91,
      restaurantId: 17,
      senderRole: 'ADMIN',
      senderLabel: 'Ana Responsável',
      message: 'Ajuda com a configuração do cardápio',
      issueStatus: null,
      sentAt: '2026-08-28T10:00:00.000Z',
    },
  ];
  await page.route(/^http:\/\/(127\.0\.0\.1|localhost):3000\/.*$/, async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    const method = request.method();

    if (pathname === '/auth/refresh' && method === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ accessToken: 'e2e-super-admin-token', userId: 1 }),
      });
      return;
    }
    if (pathname === '/auth/me') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 1,
            name: 'Super Admin',
            email: 'dev@pecaja.test',
            role: 'SUPER_ADMIN',
          },
        }),
      });
      return;
    }
    if (pathname === '/super-admin/dashboard' && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(state),
      });
      return;
    }
    if (pathname === '/super-admin/settings' && method === 'PUT') {
      const body = request.postDataJSON() as Record<string, unknown>;
      writes.push({ path: pathname, body });
      Object.assign(state.settings, body, {
        version: Number(state.settings.version) + 1,
        updatedAt: '2026-08-28T10:05:00.000Z',
      });
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(state.settings),
      });
      return;
    }
    if (pathname === '/super-admin/restaurants/17/access' && method === 'PATCH') {
      const body = request.postDataJSON() as Record<string, unknown>;
      writes.push({ path: pathname, body });
      state.restaurants[0].active = Boolean(body.active);
      state.restaurants[0].status = body.active ? 'ACTIVE' : 'BLOCKED';
      state.metrics.restaurantsActive = body.active ? 1 : 0;
      state.metrics.restaurantsBlocked = body.active ? 0 : 1;
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      return;
    }
    if (pathname === '/ai-support/messages' && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ messages: supportMessages }),
      });
      return;
    }
    if (pathname === '/super-admin/support/17/messages' && method === 'POST') {
      const body = request.postDataJSON() as Record<string, unknown>;
      writes.push({ path: pathname, body });
      supportMessages.push({
        id: 92,
        restaurantId: 17,
        senderRole: 'SUPER_ADMIN',
        senderLabel: 'Super Admin',
        message: String(body.message || ''),
        issueStatus: body.closeConversation === true ? 'CLOSED' : null,
        sentAt: '2026-08-28T10:10:00.000Z',
      });
      state.tickets[0].status = body.closeConversation === true ? 'CLOSED' : 'WAITING_CUSTOMER';
      state.tickets[0].messageCount = supportMessages.length;
      state.tickets[0].lastSenderRole = 'SUPER_ADMIN';
      state.tickets[0].lastMessageAt = '2026-08-28T10:10:00.000Z';
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(supportMessages.at(-1)),
      });
      return;
    }

    await route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
  });

  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem(
      'user',
      JSON.stringify({
        id: 1,
        name: 'Super Admin',
        email: 'dev@pecaja.test',
        role: 'SUPER_ADMIN',
      }),
    );
  });
}

test('SUPER_ADMIN navega por links profundos e salva configurações versionadas', async ({
  page,
}) => {
  const state = createDashboard();
  const writes: Array<{ path: string; body: Record<string, unknown> }> = [];
  await mockSuperAdminApi(page, state, writes);

  await page.goto('/super_admin');
  await expect(page).toHaveURL(/\/super_admin\/overview$/);
  await expect(page.getByRole('heading', { name: 'Visão geral da plataforma' })).toBeVisible();
  await expect(page.getByText('Restaurante Aurora')).toBeVisible();
  await expect(page.getByText('R$ 249,90').first()).toBeVisible();

  await page.getByRole('button', { name: 'Configurações' }).click();
  await expect(page).toHaveURL(/\/super_admin\/settings$/);
  await expect(page.getByRole('heading', { name: 'Configurações da plataforma' })).toBeVisible();

  const platformName = page.getByLabel('Nome da plataforma');
  await platformName.fill('Peça Já Cloud');
  await page.getByRole('button', { name: 'Salvar alterações' }).click();

  await expect
    .poll(() => writes)
    .toContainEqual({
      path: '/super-admin/settings',
      body: expect.objectContaining({ platformName: 'Peça Já Cloud', version: 1 }),
    });
  expect(writes[0].body).not.toHaveProperty('updatedAt');
  await expect(platformName).toHaveValue('Peça Já Cloud');
  await expect(page.getByText('Configurações salvas e aplicadas pelo backend.')).toBeVisible();

  await page.getByLabel('E-mail de suporte').fill('atendimento@pecaja.test');
  await page.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect.poll(() => writes.length).toBe(2);
  expect(writes[1]).toEqual({
    path: '/super-admin/settings',
    body: expect.objectContaining({
      supportEmail: 'atendimento@pecaja.test',
      version: 2,
    }),
  });
});

test('mudança de acesso exige justificativa e atualiza o tenant', async ({ page }) => {
  const state = createDashboard();
  const writes: Array<{ path: string; body: Record<string, unknown> }> = [];
  await mockSuperAdminApi(page, state, writes);

  await page.goto('/super_admin/restaurants');
  await page.getByRole('button', { name: 'Ver detalhes' }).click();
  await expect(page.getByRole('dialog', { name: 'Restaurante Aurora' })).toBeVisible();
  await page.getByRole('button', { name: 'Bloquear acesso' }).click();
  await page.getByPlaceholder('Explique por que esta ação é necessária').fill('curto');
  await page.getByRole('button', { name: 'Bloquear acesso' }).last().click();
  await expect(page.getByRole('alert')).toContainText('pelo menos 8 caracteres');

  await page
    .getByPlaceholder('Explique por que esta ação é necessária')
    .fill('Solicitação formal do responsável.');
  await page.getByRole('button', { name: 'Bloquear acesso' }).last().click();

  await expect
    .poll(() => writes)
    .toContainEqual({
      path: '/super-admin/restaurants/17/access',
      body: {
        active: false,
        reason: 'Solicitação formal do responsável.',
      },
    });
  await expect(page.getByRole('dialog', { name: 'Restaurante Aurora' })).toContainText('Bloqueado');
});

test('SUPER_ADMIN responde e encerra um chamado exclusivo do administrador', async ({ page }) => {
  const state = createDashboard();
  const writes: Array<{ path: string; body: Record<string, unknown> }> = [];
  await mockSuperAdminApi(page, state, writes);

  await page.goto('/super_admin/support');
  await page.getByRole('button', { name: 'Ver conversa' }).click();
  const dialog = page.getByRole('dialog', { name: 'Suporte • Restaurante Aurora' });
  await expect(dialog).toBeVisible();
  await dialog
    .getByPlaceholder('Descreva o diagnóstico e o próximo passo com clareza')
    .fill('Configuração revisada e funcionamento confirmado.');
  await dialog.getByRole('button', { name: 'Responder e encerrar' }).click();

  await expect
    .poll(() => writes)
    .toContainEqual({
      path: '/super-admin/support/17/messages',
      body: {
        message: 'Configuração revisada e funcionamento confirmado.',
        closeConversation: true,
      },
    });
  await expect(dialog.getByText('Atendimento encerrado.')).toBeVisible();
  await expect(page.getByText('Resposta enviada e atendimento encerrado.')).toBeVisible();
});

test('painel continua contido no celular e mantém navegação acessível', async ({ page }) => {
  const state = createDashboard();
  const writes: Array<{ path: string; body: Record<string, unknown> }> = [];
  await page.setViewportSize({ width: 320, height: 844 });
  await mockSuperAdminApi(page, state, writes);

  await page.goto('/super_admin/audit');
  await expect(page.getByRole('heading', { level: 1, name: 'Auditoria' })).toBeVisible();
  const menuButton = page.getByRole('button', { name: 'Abrir menu' });
  await menuButton.click();
  await expect(menuButton).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('button', { name: 'Fechar menu' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(menuButton).toHaveAttribute('aria-expanded', 'false');
  await expect(menuButton).toBeFocused();

  await menuButton.click();
  await page.getByTestId('super-admin-menu-overlay').click({ position: { x: 319, y: 420 } });
  await expect(menuButton).toHaveAttribute('aria-expanded', 'false');

  await menuButton.click();
  await page.getByRole('button', { name: 'Suporte' }).click();
  await expect(page).toHaveURL(/\/super_admin\/support$/);
  await expect(
    page.getByText('Este canal recebe somente mensagens dos administradores responsáveis'),
  ).toBeVisible();

  const dimensions = await page.locator('main').evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
});

test('estado vazio orienta o primeiro cadastro e dialog preserva foco no celular', async ({
  page,
}) => {
  const state = createDashboard();
  state.restaurants = [];
  state.metrics.restaurantsTotal = 0;
  state.metrics.restaurantsActive = 0;
  const writes: Array<{ path: string; body: Record<string, unknown> }> = [];
  await page.setViewportSize({ width: 320, height: 844 });
  await mockSuperAdminApi(page, state, writes);

  await page.goto('/super_admin/overview');
  await expect(
    page.getByRole('heading', { level: 3, name: 'Nenhum restaurante cadastrado' }),
  ).toBeVisible();

  const createButton = page.getByRole('button', { name: 'Novo restaurante' });
  await createButton.click();
  const dialog = page.getByRole('dialog', { name: 'Criar restaurante' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel('Nome do restaurante')).toBeFocused();

  const cancelBox = await dialog.getByRole('button', { name: 'Cancelar' }).boundingBox();
  const submitBox = await dialog.getByRole('button', { name: 'Criar restaurante' }).boundingBox();
  expect(Math.abs((cancelBox?.x || 0) - (submitBox?.x || 0))).toBeLessThan(1);
  expect(submitBox?.y || 0).toBeGreaterThan(cancelBox?.y || 0);

  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(createButton).toBeFocused();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(321);
});
