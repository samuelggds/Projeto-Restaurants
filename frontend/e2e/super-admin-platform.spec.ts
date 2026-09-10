import { expect, test, type Page } from '@playwright/test';
import { captureReadmeScreenshot } from './helpers/readmeScreenshot';

type DashboardState = ReturnType<typeof createDashboard>;

test('contatos comerciais têm filtros, paginação e atualização de status no painel', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockSuperAdminApi(page, createDashboard(), []);
  const lead = {
    id: '45bd27cb-9b6c-433d-a36c-fcf206f9e4d4',
    name: 'Joana Silva',
    restaurantName: 'Bistrô Teste',
    email: 'joana@example.test',
    phone: '11999998888',
    city: 'São Paulo',
    state: 'SP',
    businessType: 'Restaurante',
    channels: ['DELIVERY'],
    planInterest: 'PREMIUM',
    message: '<script>texto de teste</script>',
    consent: true,
    status: 'NEW',
    emailStatus: 'PENDING',
    emailSentAt: null,
    createdAt: '2026-09-10T12:00:00.000Z',
    updatedAt: '2026-09-10T12:00:00.000Z',
  };
  const queries: string[] = [];
  await page.route('**/super-admin/sales-leads**', async (route) => {
    const url = new URL(route.request().url());
    if (route.request().method() === 'PATCH') {
      expect(route.request().postDataJSON()).toEqual({ status: 'CONTACTED' });
      lead.status = 'CONTACTED';
      return route.fulfill({ json: lead });
    }
    queries.push(url.search);
    return route.fulfill({
      json: {
        items: [
          {
            ...lead,
            restaurantName:
              url.searchParams.get('page') === '2' ? 'Segundo Bistrô' : lead.restaurantName,
          },
        ],
        total: 21,
        page: Number(url.searchParams.get('page')),
        pageSize: 20,
        emailConfigured: false,
      },
    });
  });
  await page.goto('/super_admin/sales-leads');
  await expect(page.getByRole('heading', { name: 'Caixa de entrada comercial' })).toBeVisible();
  await expect(page.getByText('O aviso por e-mail não está configurado.')).toBeVisible();
  await captureReadmeScreenshot(page, 'super-admin-sales-leads-mobile.png', { fullPage: true });
  await page.getByRole('button', { name: 'Próxima', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Segundo Bistrô' })).toBeVisible();
  await page.getByLabel('Buscar contatos').fill('Joana');
  await page.getByLabel('Filtrar por status').selectOption('NEW');
  await page.getByRole('button', { name: 'Aplicar filtros' }).click();
  await expect(page.getByRole('heading', { name: 'Bistrô Teste' })).toBeVisible();
  expect(queries.at(-1)).toContain('page=1');
  expect(queries.at(-1)).toContain('q=Joana');
  expect(queries.at(-1)).toContain('status=NEW');
  await page.getByRole('button', { name: 'Ver contato de Bistrô Teste' }).click();
  const dialog = page.getByRole('dialog', { name: 'Contato comercial' });
  await expect(dialog).toContainText('<script>texto de teste</script>');
  await captureReadmeScreenshot(page, 'super-admin-sales-lead-dialog-mobile.png');
  await dialog.getByLabel('Status do contato').selectOption('CONTACTED');
  await dialog.getByRole('button', { name: 'Salvar status' }).click();
  await expect(dialog.getByRole('status')).toContainText('Status atualizado.');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

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
          trialEndsAt: null as string | null,
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
      platformName: 'GastroNexa Platform',
      platformDomain: 'app.gastronexa.test',
      supportEmail: 'suporte@gastronexa.test',
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
            email: 'dev@gastronexa.test',
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
      state.tickets[0].id = Number(supportMessages.at(-1)!.id);
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
        email: 'dev@gastronexa.test',
        role: 'SUPER_ADMIN',
      }),
    );
  });
}

for (const width of [320, 1440]) {
  test(`pendências permitem filtrar, paginar e revisar os quatro tipos em ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const state = createDashboard();
    state.restaurants[0].subscription.status = 'TESTE';
    state.restaurants[0].subscription.trialEndsAt = new Date(
      Date.now() + 4 * 86_400_000,
    ).toISOString();
    state.administrators[0].mustChangePassword = true;
    state.invoices = Array.from({ length: 7 }, (_, index) => ({
      ...state.invoices[0],
      id: 71 + index,
      code: `FAT-0000${71 + index}`,
      status: 'OVERDUE',
    }));
    const writes: Array<{ path: string; body: Record<string, unknown> }> = [];
    await mockSuperAdminApi(page, state, writes);
    await page.goto('/super_admin/overview');
    const queue = page.getByRole('region', { name: 'Precisa da sua atenção' });
    await expect(queue.getByRole('button', { name: 'Todas 10', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(queue.getByRole('status')).toHaveText('1–5 de 10 pendências');
    await captureReadmeScreenshot(page, `super-admin-attention-${width}.png`, { fullPage: true });
    await queue.getByRole('button', { name: 'Cobranças 7', exact: true }).click();
    await expect(queue.getByRole('status')).toHaveText('1–5 de 7 pendências');
    await queue.getByRole('button', { name: 'Próximas', exact: true }).click();
    await expect(queue.getByRole('status')).toHaveText('6–7 de 7 pendências');
    await queue
      .getByRole('button', { name: 'Revisar cobranças: Restaurante Aurora', exact: true })
      .first()
      .click();
    await expect(page.getByRole('dialog')).toContainText('FAT-000076');
    await page.keyboard.press('Escape');
    await queue.getByRole('button', { name: 'Períodos de teste 1', exact: true }).click();
    await expect(queue.getByRole('status')).toHaveText('1–1 de 1 pendências');
    await queue
      .getByRole('button', { name: 'Revisar períodos de teste: Restaurante Aurora', exact: true })
      .click();
    await expect(page.getByRole('dialog', { name: 'Restaurante Aurora' })).toBeVisible();
    await page.keyboard.press('Escape');
    await queue.getByRole('button', { name: 'Acessos 1', exact: true }).click();
    await queue
      .getByRole('button', { name: 'Revisar acessos: Ana Responsável', exact: true })
      .click();
    await expect(page.getByRole('dialog', { name: 'Ana Responsável' })).toContainText(
      'Troca de senha pendente',
    );
    await page.keyboard.press('Escape');
    await queue.getByRole('button', { name: 'Suporte 1', exact: true }).click();
    await queue
      .getByRole('button', { name: 'Revisar suporte: Restaurante Aurora', exact: true })
      .click();
    await expect(page.getByRole('dialog', { name: 'Suporte • Restaurante Aurora' })).toBeVisible();
    await page.keyboard.press('Escape');
    state.tickets[0].status = 'WAITING_CUSTOMER';
    await queue.getByRole('button', { name: 'Atualizar pendências', exact: true }).click();
    await expect(
      queue.getByRole('heading', { name: 'Nenhuma pendência neste recorte' }),
    ).toBeVisible();
    await expect(queue.locator('time')).toHaveAttribute('datetime', /\d{4}-\d{2}-\d{2}T/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(writes).toEqual([]);
  });
}

for (const width of [320, 1440]) {
  test(`busca rápida encontra registros e preserva foco e diálogos em ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const writes: Array<{ path: string; body: Record<string, unknown> }> = [];
    await mockSuperAdminApi(page, createDashboard(), writes);
    await page.goto('/super_admin/overview');
    const trigger = page.getByRole('button', { name: 'Buscar no painel', exact: true });
    await expect(trigger).toBeVisible();
    await page.keyboard.press('Control+k');
    const search = page.getByRole('dialog', { name: 'Busca rápida', exact: true });
    const input = search.getByLabel('Nome, e-mail ou referência');
    await expect(input).toBeFocused();
    await input.fill('não-existe-no-painel');
    await expect(search.getByRole('status')).toContainText('0 resultados');
    await input.fill('aurora');
    await expect(search.getByRole('status')).toContainText('4 resultados');
    await captureReadmeScreenshot(page, `super-admin-quick-search-${width}.png`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();

    for (const [query, resultName, dialogName] of [
      ['restaurante-aurora', /Restaurante Aurora/, 'Restaurante Aurora'],
      ['ana responsavel', /Administrador Ana Responsável/, 'Ana Responsável'],
      ['FAT-000071', /Fatura FAT-000071/, 'FAT-000071'],
      ['configuracao cardapio', /Suporte Ajuda/, 'Suporte • Restaurante Aurora'],
    ] as const) {
      await trigger.click();
      await input.fill(query);
      await search
        .getByRole('list', { name: 'Resultados da busca' })
        .getByRole('button', { name: resultName })
        .first()
        .click();
      await expect(search).toBeHidden();
      const detail = page.getByRole('dialog', { name: dialogName, exact: true });
      await expect(detail).toBeVisible();
      await page.keyboard.press('Control+k');
      await expect(search).toBeHidden();
      await expect(detail).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(trigger).toBeFocused();
    }
    expect(writes).toEqual([]);
  });
}

test('resolver suporte pela fila mantém conversa aberta e restaura foco após remover a pendência', async ({
  page,
}) => {
  const writes: Array<{ path: string; body: Record<string, unknown> }> = [];
  await mockSuperAdminApi(page, createDashboard(), writes);
  await page.goto('/super_admin/overview');
  const queue = page.getByRole('region', { name: 'Precisa da sua atenção' });
  await queue
    .getByRole('button', { name: 'Revisar suporte: Restaurante Aurora', exact: true })
    .click();
  const dialog = page.getByRole('dialog', { name: 'Suporte • Restaurante Aurora' });
  await dialog
    .getByPlaceholder('Descreva o diagnóstico e o próximo passo com clareza')
    .fill('Dúvida esclarecida no cenário de teste.');
  await dialog.getByRole('button', { name: 'Responder e encerrar' }).click();
  await expect(dialog.getByText('Atendimento encerrado.')).toBeVisible();
  await expect(queue.getByRole('button', { name: 'Suporte 0', exact: true })).toBeAttached();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('button', { name: 'Buscar no painel', exact: true })).toBeFocused();
  expect(writes).toEqual([
    {
      path: '/super-admin/support/17/messages',
      body: { message: 'Dúvida esclarecida no cenário de teste.', closeConversation: true },
    },
  ]);
});

test('falha na atualização conserva pendências e horário da última carga válida', async ({
  page,
}) => {
  const state = createDashboard();
  await mockSuperAdminApi(page, state, []);
  await page.goto('/super_admin/overview');
  const queue = page.getByRole('region', { name: 'Precisa da sua atenção' });
  await expect(queue.locator('time')).toBeVisible();
  const previous = await queue.locator('time').getAttribute('datetime');
  await page.route('**/super-admin/dashboard', (route) =>
    route.fulfill({ status: 503, json: { message: 'Serviço indisponível no teste.' } }),
  );
  await queue.getByRole('button', { name: 'Atualizar pendências' }).click();
  await expect(page.getByRole('alert')).toContainText(
    'Os dados exibidos podem estar desatualizados.',
  );
  await expect(queue.locator('time')).toHaveAttribute('datetime', previous!);
  await expect(queue.getByRole('button', { name: 'Suporte 1', exact: true })).toBeVisible();
});

test('SUPER_ADMIN navega por links profundos e salva configurações versionadas', async ({
  page,
}) => {
  const state = createDashboard();
  const writes: Array<{ path: string; body: Record<string, unknown> }> = [];
  await mockSuperAdminApi(page, state, writes);

  await page.goto('/super_admin');
  await expect(page).toHaveURL(/\/super_admin\/overview$/);
  await expect(page.getByRole('heading', { name: 'Visão geral da plataforma' })).toBeVisible();
  await expect(page.getByText('Restaurante Aurora', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('R$ 249,90').first()).toBeVisible();

  await page.getByRole('button', { name: 'Configurações' }).click();
  await expect(page).toHaveURL(/\/super_admin\/settings$/);
  await expect(page.getByRole('heading', { name: 'Configurações da plataforma' })).toBeVisible();

  const platformName = page.getByLabel('Nome da plataforma');
  await platformName.fill('GastroNexa Cloud');
  await page.getByRole('button', { name: 'Salvar alterações' }).click();

  await expect
    .poll(() => writes)
    .toContainEqual({
      path: '/super-admin/settings',
      body: expect.objectContaining({ platformName: 'GastroNexa Cloud', version: 1 }),
    });
  expect(writes[0].body).not.toHaveProperty('updatedAt');
  await expect(platformName).toHaveValue('GastroNexa Cloud');
  await expect(page.getByText('Configurações salvas e aplicadas pelo backend.')).toBeVisible();

  await page.getByLabel('E-mail de suporte').fill('atendimento@gastronexa.test');
  await page.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect.poll(() => writes.length).toBe(2);
  expect(writes[1]).toEqual({
    path: '/super-admin/settings',
    body: expect.objectContaining({
      supportEmail: 'atendimento@gastronexa.test',
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
  await captureReadmeScreenshot(page, 'super-admin-restaurant-dialog.png');
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
  await captureReadmeScreenshot(page, 'super-admin-support-dialog.png');
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

test('configurações cabem ao lado dos menus em uma janela de 900px', async ({ page }) => {
  const state = createDashboard();
  const writes: Array<{ path: string; body: Record<string, unknown> }> = [];
  await page.setViewportSize({ width: 900, height: 900 });
  await mockSuperAdminApi(page, state, writes);

  await page.goto('/super_admin/settings');
  const identity = page.getByRole('heading', { name: 'Identidade da plataforma' });
  const regional = page.getByRole('heading', { name: 'Configurações regionais' });
  await expect(identity).toBeVisible();
  await expect(regional).toBeVisible();

  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(901);
  const identityBox = await identity.boundingBox();
  const regionalBox = await regional.boundingBox();
  expect(identityBox).not.toBeNull();
  expect(regionalBox).not.toBeNull();
  expect(Math.abs(regionalBox!.x - identityBox!.x)).toBeLessThan(1);
  expect(regionalBox!.y).toBeGreaterThan(identityBox!.y + identityBox!.height);
  await expect(page.getByLabel('Nome da plataforma')).toHaveValue(state.settings.platformName);
  await expect(page.getByLabel('Fuso horário (IANA)')).toHaveValue(state.settings.timezone);
  expect(writes).toEqual([]);
});

for (const width of [390, 1024]) {
  test(`menu mantém as últimas opções acessíveis em viewport baixo de ${width}px`, async ({
    page,
  }) => {
    const state = createDashboard();
    const writes: Array<{ path: string; body: Record<string, unknown> }> = [];
    await page.setViewportSize({ width, height: 480 });
    await mockSuperAdminApi(page, state, writes);

    await page.goto('/super_admin/audit');
    await expect(page.getByRole('heading', { level: 1, name: 'Auditoria' })).toBeVisible();
    if (width <= 860) {
      await page.getByRole('button', { name: 'Abrir menu' }).click();
      await expect(page.getByRole('button', { name: 'Fechar menu' })).toBeFocused();
    }

    const sidebar = page.getByRole('complementary', {
      name: 'Navegação do painel SUPER_ADMIN',
    });
    await sidebar.hover();
    await page.mouse.wheel(0, 1000);
    await expect.poll(() => sidebar.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
    await expect(sidebar.getByRole('button', { name: 'Sair', exact: true })).toBeInViewport();
    await sidebar.getByRole('button', { name: 'Configurações', exact: true }).click();
    await expect(page).toHaveURL(/\/super_admin\/settings$/);
    expect(writes).toEqual([]);
  });
}

test('estado vazio orienta o primeiro cadastro e dialog preserva foco no celular', async ({
  page,
}) => {
  const state = createDashboard();
  state.restaurants = [];
  state.metrics.restaurantsTotal = 0;
  state.metrics.restaurantsActive = 0;
  state.settings.primaryColor = '#526378';
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
  const configuredButtonColor = await createButton.evaluate(
    (button) => getComputedStyle(button).backgroundColor,
  );
  await expect(dialog.getByRole('button', { name: 'Criar restaurante', exact: true })).toHaveCSS(
    'background-color',
    configuredButtonColor,
  );
  await captureReadmeScreenshot(page, 'super-admin-create-restaurant-mobile.png');

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

for (const width of [320, 900, 1440]) {
  test(`todas as áreas do SUPER_ADMIN mantêm conteúdo e ações contidos em ${width}px`, async ({
    page,
  }) => {
    test.setTimeout(60_000);
    const state = createDashboard();
    const writes: Array<{ path: string; body: Record<string, unknown> }> = [];
    await page.setViewportSize({ width, height: 1000 });
    await mockSuperAdminApi(page, state, writes);
    await page.route('**/super-admin/sales-leads**', (route) =>
      route.fulfill({
        json: { items: [], total: 0, page: 1, pageSize: 20, emailConfigured: true },
      }),
    );
    await page.goto('/super_admin/overview');
    const views = [
      ['overview', 'Visão geral', 'Visão geral da plataforma'],
      ['sales-leads', 'Contatos comerciais', 'Contatos comerciais'],
      ['restaurants', 'Restaurantes', 'Restaurantes'],
      ['subscriptions', 'Assinaturas', 'Assinaturas'],
      ['plans', 'Planos', 'Planos'],
      ['billing', 'Faturamento', 'Faturamento'],
      ['administrators', 'Administradores', 'Administradores'],
      ['support', 'Suporte', 'Suporte'],
      ['audit', 'Auditoria', 'Auditoria'],
      ['settings', 'Configurações', 'Configurações da plataforma'],
    ] as const;

    for (const [view, label, title] of views) {
      await test.step(label, async () => {
        if (width <= 860) await page.getByRole('button', { name: 'Abrir menu' }).click();
        const navigation = page.getByRole('complementary', {
          name: 'Navegação do painel SUPER_ADMIN',
          includeHidden: true,
        });
        const item = navigation.getByRole('button', {
          name: label,
          exact: true,
          includeHidden: true,
        });
        await item.click();
        await expect(page).toHaveURL(new RegExp(`/super_admin/${view}$`));
        await expect(
          page.getByRole('heading', { level: 1, name: title, exact: true }),
        ).toBeVisible();
        await expect(item).toHaveAttribute('aria-current', 'page');
        await expect
          .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
          .toBeLessThanOrEqual(width + 1);
        const main = await page.locator('main').boundingBox();
        expect(main!.width).toBeGreaterThanOrEqual(width <= 860 ? width - 1 : width - 300);
        await captureReadmeScreenshot(page, `super-admin-${view}-${width}.png`, { fullPage: true });
      });
    }
    expect(writes).toEqual([]);
  });
}
