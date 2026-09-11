import axios from 'axios';
import { beforeEach, describe, expect, it } from 'vitest';
import { createDemoAdminApi, type DemoAdminRuntime } from './demoAdminApi';
import { createDemoAdminData, readDemoAdminData, DEMO_ADMIN_STORAGE_KEY } from './demoAdminData';
import {
  createDemoIngredients,
  demoIngredientImages,
  resolveDemoIngredientImage,
} from './demoIngredients';
import {
  addDemoCartItem,
  changeDemoCartQuantity,
  createDemoOrder,
  createInitialDemoState,
  sanitizeDemoState,
  type DemoState,
} from './demoDomain';
import {
  demoConfiguredLine,
  demoConfigurationIsCurrent,
  demoProductConfiguration,
} from './demoProductConfiguration';
import { demoOperationalOrders } from './demoEmployeeAdapter';
import { demoProducts, demoHomeData } from './demoCatalog';
import { demoCheckoutError } from './demoCheckout';
import { addDemoSupportMessage } from './demoSupport';
import { syncDemoEmployees } from './demoEmployees';
import { authenticateDemoAccount, getDemoAccountByRole } from './demoDomain';
import { createDemoTablePayment, demoTableAccount } from './demoTableAccount';

beforeEach(() => localStorage.clear());
function adapterFixture() {
  let state = createInitialDemoState();
  let runtime: DemoAdminRuntime | undefined;
  const connect = () =>
    axios.create({
      adapter: createDemoAdminApi(
        () => state,
        (next) => {
          state = next;
        },
        runtime,
        (next) => {
          runtime = structuredClone(next);
        },
      ),
    });
  return { client: connect(), reconnect: connect, getState: () => state };
}

describe('catálogo fictício completo', () => {
  it('tem fotos locais específicas, permite criar com foto e não atribui imagens ao Pexels', () => {
    const ingredients = createDemoIngredients();
    expect(ingredients).toHaveLength(6);
    expect(ingredients.find((item) => item.name === 'Queijo cheddar')?.image).toBe(
      '/demo/ingredients/cheese.webp',
    );
    expect(ingredients.find((item) => item.name === 'Bacon')?.image).toBe(
      '/demo/ingredients/bacon.webp',
    );
    const images = demoIngredientImages('Bacon');
    expect(images.provider).toBe('Demo');
    expect(images.results).toHaveLength(1);
    expect(demoIngredientImages('Queijo de demonstração').results[0]?.previewUrl).toBe(
      '/demo/ingredients/cheese.webp',
    );
    expect(demoIngredientImages('HAMBÚRGUER artesanal').results[0]?.previewUrl).toBe(
      '/demo/ingredients/patty.webp',
    );
    expect(demoIngredientImages('Camarão').results).toEqual([]);
    expect(
      resolveDemoIngredientImage({
        name: 'Bacon teste',
        imageSelectionToken: images.results[0].selectionToken,
      }),
    ).toMatchObject({ name: 'Bacon teste', image: '/demo/ingredients/bacon.webp' });
    expect(() => resolveDemoIngredientImage({ imageSelectionToken: 'invalid' })).toThrow();
  });
  it('migra o cenário antigo sem duplicar ingredientes ou apagar os dados do visitante', () => {
    const initial = createDemoAdminData();
    localStorage.setItem(
      DEMO_ADMIN_STORAGE_KEY,
      JSON.stringify({
        ...initial,
        catalogSeedVersion: undefined,
        ingredients: [{ ...initial.ingredients[0], id: 70, price: 7 }],
      }),
    );
    const migrated = readDemoAdminData();
    expect(migrated.ingredients).toHaveLength(6);
    expect(migrated.ingredients.find((item) => item.name === 'Bacon')?.price).toBe(7);
    localStorage.setItem(DEMO_ADMIN_STORAGE_KEY, JSON.stringify({ ...migrated, ingredients: [] }));
    expect(readDemoAdminData().ingredients).toEqual([]);
  });
  it('persiste modelos de produto após recriar o adaptador e permite excluir', async () => {
    const f = adapterFixture();
    const created = (
      await f.client.post('/product-configuration-templates', {
        name: 'Burger personalizado',
        configuration: { optionGroups: [], compositionItems: [] },
      })
    ).data.template;
    const fresh = f.reconnect();
    expect((await fresh.get('/product-configuration-templates')).data.templates[0].id).toBe(
      created.id,
    );
    await fresh.delete(`/product-configuration-templates/${created.id}`);
    expect((await fresh.get('/product-configuration-templates')).data.templates).toEqual([]);
  });
});

function configuredProduct() {
  const admin = createDemoAdminData();
  const product = {
    ...admin.products[0],
    configurationVersion: 1,
    optionGroups: [
      {
        id: 81,
        name: 'Adicionais',
        required: false,
        selectionType: 'MULTIPLE' as const,
        minSelections: 0,
        maxSelections: 2,
        options: [{ id: 82, ingredientId: 9101, additionalPrice: 5, active: true }],
      },
    ],
    compositionItems: [{ id: 83, ingredientId: 9103, removable: true }],
  };
  return { ...demoProducts[0], ...demoProductConfiguration(product, admin.ingredients) };
}
const configuration = {
  configurationVersion: 1,
  selectedOptions: [{ groupId: '81', optionIds: ['82'] }],
  selectedOptionIds: ['82'],
  removedCompositionItemIds: ['83'],
  observation: 'Bem passado',
};
describe('personalização da compra demonstrativa', () => {
  it('separa variantes, calcula adicionais e preserva as escolhas até a cozinha', () => {
    const product = configuredProduct();
    let state = addDemoCartItem(createInitialDemoState(), product, configuration);
    state = addDemoCartItem(state, product, {
      ...configuration,
      selectedOptionIds: [],
      selectedOptions: [],
      observation: '',
    });
    expect(state.cart).toHaveLength(2);
    expect(state.cart[0].unitPrice).toBeCloseTo(product.price + 5);
    state = changeDemoCartQuantity(state, state.cart[0].cartId!, 2);
    expect(state.cart.map((line) => line.quantity)).toEqual([2, 1]);
    expect(
      demoCheckoutError(state, { ...demoHomeData, products: [product] }, 'DELIVERY', 'PIX'),
    ).toBe('');
    const created = createDemoOrder(state, { channel: 'DELIVERY', paymentMethod: 'PIX' });
    const saved = sanitizeDemoState(JSON.parse(JSON.stringify(created.state)));
    const kitchen = demoOperationalOrders(saved).find(
      (order) => Number(order.id) === created.order.id,
    )!;
    expect(kitchen.itemDetails[0].customizations[0].options).toEqual([
      '1x Bacon',
      'Sem Alface',
      'Observação: Bem passado',
    ]);
  });
  it('rejeita configurações antigas, seleções incoerentes e soma estoque entre variantes', () => {
    const product = configuredProduct();
    expect(demoConfigurationIsCurrent({ ...product, configurationVersion: 2 }, configuration)).toBe(
      false,
    );
    expect(demoConfigurationIsCurrent(product, { ...configuration, selectedOptionIds: [] })).toBe(
      false,
    );
    let state = addDemoCartItem(createInitialDemoState(), product, configuration);
    state = addDemoCartItem(state, product, { ...configuration, observation: 'Outra variante' });
    expect(
      demoCheckoutError(
        state,
        { ...demoHomeData, products: [{ ...product, stock: 1 }] },
        'DELIVERY',
        'PIX',
      ),
    ).toContain('quantidade');
    expect(
      sanitizeDemoState({ ...state, cart: [{ ...state.cart[0], configuration: {} }] }).cart,
    ).toEqual([]);
    expect(demoConfiguredLine(product, configuration).customizations).toContain('Sem Alface');
  });
});

describe('operações fictícias persistidas', () => {
  it('importa exemplos editáveis sem duplicar e sem consultar o endereço informado', async () => {
    let data = createDemoAdminData();
    const client = axios.create({
      adapter: createDemoAdminApi(
        createInitialDemoState,
        () => undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        {
          get: () => data,
          save: (patch) => {
            data = { ...data, ...patch };
          },
        },
      ),
    });
    const summary = (
      await client.post('/menu-import/ifood', { url: 'https://www.ifood.com.br/delivery/exemplo' })
    ).data;
    expect(summary.productsCreated).toBe(2);
    expect(summary.demoNotice).toContain('simulada');
    expect(data.products.at(-1)?.name).toContain('importado');
    expect(data.products.at(-1)?.image).toContain('/demo/burger-hero.webp');
    expect(
      (await client.post('/menu-import/image', { imageUrl: 'data:image/png;base64,fake' })).data
        .productsCreated,
    ).toBe(0);
  });
  it('mantém a conta fictícia criada, a senha editada e a desativação após recarregar', () => {
    const data = createDemoAdminData();
    const added = {
      ...data.employees[0],
      id: '120',
      name: 'Cozinheira Teste',
      email: 'cozinheira@example.test',
      role: 'COOK' as const,
    };
    const employees = [...data.employees, added];
    const state = sanitizeDemoState(
      syncDemoEmployees(createInitialDemoState(), employees, data.employees, {
        '120': 'senha-ficticia',
      }),
    );
    const logged = authenticateDemoAccount(state, added.email, 'senha-ficticia');
    expect(getDemoAccountByRole(logged.state, 'COZINHA')?.name).toBe(added.name);
    const disabled = sanitizeDemoState(
      syncDemoEmployees(
        logged.state,
        employees.map((item) => (item.id === '120' ? { ...item, active: false } : item)),
        employees,
      ),
    );
    expect(disabled.sessionAccountId).toBeNull();
    expect(() => authenticateDemoAccount(disabled, added.email, 'senha-ficticia')).toThrow();
  });
  it('descarta relatos corrompidos sem quebrar os demais dados do cenário', () => {
    const state = sanitizeDemoState({
      ...createInitialDemoState(),
      attendant: { details: [null, [1, {}]], threads: [null, [1, { messages: null }]] },
    });
    expect(state.attendant).toEqual({ details: [[1, {}]], threads: [] });
    expect(state.orders.length).toBeGreaterThan(0);
  });
  it('respeita permissões da conta e a taxa de serviço na simulação', () => {
    const settings = createDemoAdminData().settings.tableAccount;
    const state = createInitialDemoState();
    expect(() =>
      createDemoTablePayment(
        state,
        { selectionMode: 'FULL_ACCOUNT', method: 'PIX' },
        Date.now(),
        8,
        { ...settings, enabled: false },
      ),
    ).toThrow(/desativada/);
    expect(() =>
      createDemoTablePayment(
        state,
        { selectionMode: 'FULL_ACCOUNT', method: 'CASH' },
        Date.now(),
        8,
        { ...settings, allowCash: false },
      ),
    ).toThrow(/desativada/);
    expect(() =>
      createDemoTablePayment(
        state,
        { selectionMode: 'EQUAL_SPLIT', splitCount: 2, method: 'PIX' },
        Date.now(),
        8,
        { ...settings, allowSplit: false },
      ),
    ).toThrow(/desativada/);
    const withFee = {
      ...settings,
      serviceFeeMode: 'MANDATORY' as const,
      serviceFeeBasisPoints: 1000,
    };
    const result = createDemoTablePayment(
      state,
      { selectionMode: 'FULL_ACCOUNT', method: 'PIX' },
      Date.now(),
      8,
      withFee,
    );
    expect(result.payment).toMatchObject({
      subtotalCents: 5990,
      serviceFeeCents: 599,
      totalCents: 6589,
    });
    expect(demoTableAccount(result.state, 8, withFee).summary.remainingCents).toBe(0);
  });
  it('uma repetição de ajuste com a mesma chave não duplica o lançamento fictício', async () => {
    const f = adapterFixture();
    const payload = {
      employeeId: 3,
      amountCents: 1000,
      reason: 'Bônus demonstrativo',
      type: 'BONUS',
    };
    const options = { headers: { 'Idempotency-Key': 'demo-adjustment-1' } };
    const first = await f.client.post(
      '/employee-compensation/admin/earnings/adjustments',
      payload,
      options,
    );
    const reopened = f.reconnect();
    const repeated = await reopened.post(
      '/employee-compensation/admin/earnings/adjustments',
      payload,
      options,
    );
    expect(repeated.data.publicId).toBe(first.data.publicId);
    expect((await reopened.get('/employee-compensation/admin/earnings')).data).toHaveLength(1);
    await expect(
      reopened.post(
        '/employee-compensation/admin/earnings/adjustments',
        { ...payload, amountCents: 2000 },
        options,
      ),
    ).rejects.toMatchObject({ code: 'DEMO_VALIDATION' });
  });
  it('mantém plano e atribuição de maquininha depois de recarregar', async () => {
    const f = adapterFixture();
    await f.client.post('/subscription/change-plan', { plan: 'BASICO' });
    await f.client.patch('/payment-terminals/demo-terminal/assignment', { courierId: 6 });
    const client = f.reconnect();
    expect((await client.get('/subscription')).data.plan).toBe('BASICO');
    expect((await client.get('/payment-terminals')).data.terminals[0].assignedCourierId).toBe(6);
  });
  it('lista contas do salão e detalhes no contrato do administrador', async () => {
    const { client } = adapterFixture();
    const sessions = (await client.get('/table-accounts/admin/sessions')).data.sessions;
    expect(sessions.length).toBeGreaterThan(0);
    const detail = (
      await client.get(`/table-accounts/sessions/${sessions[0].sessionPublicId}/admin`)
    ).data;
    expect(Array.isArray(detail.items)).toBe(true);
    expect(Array.isArray(detail.paymentIntents)).toBe(true);
  });
  it('leva um relato da equipe para o administrador e guarda sua resposta', async () => {
    let state: DemoState = addDemoSupportMessage(createInitialDemoState(), {
      subject: 'Teste',
      message: 'Pedido de exemplo',
      reporterName: 'Cozinheiro Demo',
      reporterRole: 'kitchen',
    });
    const client = axios.create({
      adapter: createDemoAdminApi(
        () => state,
        (next) => {
          state = next;
        },
      ),
    });
    const messages = (await client.get('/ai-support/messages', { params: { channel: 'internal' } }))
      .data.messages;
    expect(messages).toHaveLength(1);
    await client.patch(`/ai-support/messages/${messages[0].id}/issue`, {
      status: 'CLOSED',
      response: 'Resolvido na demonstração',
    });
    expect(sanitizeDemoState(state).supportMessages?.[0]).toMatchObject({
      issueStatus: 'CLOSED',
      issueResponse: 'Resolvido na demonstração',
    });
  });
  it('registra turno, aprova remuneração, gera acerto e permite registrar e estornar pagamento', async () => {
    const f = adapterFixture();
    const client = f.client;
    await client.post('/employee-compensation/admin/employees/3/policies', {
      baseModel: 'HOURLY',
      hourlyRateCents: 2000,
      variableModel: 'NONE',
      prorationMode: 'NONE',
      effectiveFrom: '2026-09-01T00:00:00.000Z',
    });
    const work = (
      await client.post('/employee-compensation/admin/work-entries', {
        employeeId: 3,
        workDate: '2026-09-02',
        minutesWorked: 60,
      })
    ).data;
    expect(work.employee.name).toBeTruthy();
    await client.post(`/employee-compensation/admin/work-entries/${work.publicId}/approve`);
    const earnings = (await f.reconnect().get('/employee-compensation/admin/earnings')).data;
    expect(earnings[0].amountCents).toBe(2000);
    const settlement = (
      await client.post('/employee-compensation/admin/settlements', {
        employeeId: 3,
        referenceMonth: '2026-09',
      })
    ).data;
    expect(settlement.totalDueCents).toBe(2000);
    await client.post(`/employee-compensation/admin/settlements/${settlement.publicId}/confirm`);
    const paid = (
      await client.post(
        `/employee-compensation/admin/settlements/${settlement.publicId}/payments`,
        { amountCents: 2000, method: 'PIX' },
      )
    ).data;
    expect(paid.settlement.status).toBe('PAID');
    const reversed = (
      await client.post(`/employee-compensation/admin/payments/${paid.payment.publicId}/reverse`, {
        reason: 'Exemplo de estorno',
      })
    ).data;
    expect(reversed.settlement.status).toBe('CONFIRMED');
  });
});
